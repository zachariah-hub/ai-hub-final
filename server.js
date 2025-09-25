import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import twilio from 'twilio';
import { GoogleGenAI } from "@google/genai";

// --- Boilerplate for __dirname in ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- App Initialization ---
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- In-Memory Storage (for demonstration purposes) ---
let twilioConfig = {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_PHONE_NUMBER,
};
let jobs = {}; // Store call job states

// --- Gemini AI Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Twilio Client Helper ---
const getTwilioClient = () => {
    if (twilioConfig.accountSid && twilioConfig.authToken) {
        return twilio(twilioConfig.accountSid, twilioConfig.authToken);
    }
    return null;
};

// --- API Endpoints ---

// Save Twilio configuration from the frontend
app.post('/api/save-config', (req, res) => {
    twilioConfig = { ...twilioConfig, ...req.body };
    res.json({ success: true, message: 'Configuration saved.' });
});

// Get a Twilio Voice token for the frontend client to monitor calls
app.get('/api/get-audio-token', (req, res) => {
    if (!twilioConfig.accountSid || !twilioConfig.authToken || !process.env.TWILIO_APP_SID) {
        return res.status(500).json({ error: 'Twilio not fully configured on the backend (AccountSid, AuthToken, AppSid).' });
    }
    const capability = new twilio.jwt.ClientCapability({
        accountSid: twilioConfig.accountSid,
        authToken: twilioConfig.authToken,
    });
    capability.addScope(new twilio.jwt.ClientCapability.OutgoingScope({
        applicationSid: process.env.TWILIO_APP_SID,
    }));
    const token = capability.toJwt();
    res.json({ token });
});

// Endpoint for Twilio Voice JS SDK to connect as a monitor
app.post('/twilio-voice-app', (req, res) => {
    const { conferenceName } = req.body;
    const twiml = new twilio.twiml.VoiceResponse();
    const dial = twiml.dial();
    dial.conference({
        muted: true,
        startConferenceOnEnter: true,
        endConferenceOnExit: false,
    }, conferenceName);
    res.type('text/xml');
    res.send(twiml.toString());
});

// Start a new call job
app.post('/api/start-call', async (req, res) => {
    const { supplier, items } = req.body;
    if (!supplier || !items || items.length === 0) {
        return res.status(400).json({ error: 'Supplier and order items are required.' });
    }
    const client = getTwilioClient();
    if (!client || !twilioConfig.fromNumber) {
        return res.status(500).json({ error: 'Twilio client not initialized. Check configuration.' });
    }

    const jobId = `job_${Date.now()}`;
    const conferenceName = `ProcurementJob_${jobId}`;
    
    jobs[jobId] = {
        status: 'connecting',
        transcript: [],
        extractedData: null,
        supplier,
        items,
        conversationHistory: [],
        callSid: null,
        hasAgentJoined: false,
    };

    const backendBaseUrl = process.env.PUBLIC_BACKEND_BASE_URL || `https://${req.get('host')}`;
    const webhookUrl = `${backendBaseUrl}/twilio-webhook/${jobId}`;

    try {
        const call = await client.calls.create({
            to: supplier.PhoneNumber,
            from: twilioConfig.fromNumber,
            twiml: `<Response><Dial><Conference startConferenceOnEnter="true" endConferenceOnExit="true" statusCallback="${webhookUrl}" statusCallbackEvent="join leave end">${conferenceName}</Conference></Dial></Response>`,
            statusCallback: `${backendBaseUrl}/twilio-status-callback/${jobId}`,
            statusCallbackMethod: 'POST',
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        });
        jobs[jobId].callSid = call.sid;
        res.json({ jobId });
    } catch (error) {
        console.error('Twilio call failed:', error);
        jobs[jobId].status = 'error';
        res.status(500).json({ error: 'Failed to initiate call.' });
    }
});

// Main conversation webhook for Twilio
app.post('/twilio-webhook/:jobId', async (req, res) => {
    const jobId = req.params.jobId;
    const job = jobs[jobId];
    if (!job) return res.sendStatus(404);

    const twiml = new twilio.twiml.VoiceResponse();
    const speechResult = req.body.SpeechResult;
    const status = req.body.StatusCallbackEvent;

    if (status === 'participant-join' && !job.hasAgentJoined) {
        job.hasAgentJoined = true;
        job.status = 'agentSpeaking';
        const orderItemsText = job.items.map(item => item.product.ProductName).join(', ');
        const initialPrompt = `Hola, soy un asistente de IA llamando para hacer un pedido de los siguientes productos: ${orderItemsText}. Por favor confirme si puede procesar este pedido.`;
        job.transcript.push({ speaker: 'agent', text: initialPrompt, timestamp: new Date() });
        job.conversationHistory.push({ role: 'model', parts: [{ text: initialPrompt }] });
        const gather = twiml.gather({ input: 'speech', action: `/twilio-webhook/${jobId}`, language: 'es-CO', speechTimeout: 'auto' });
        gather.say({ language: 'es-MX' }, initialPrompt);
    } else if (speechResult) {
        job.status = 'processingResponse';
        job.transcript.push({ speaker: 'supplier', text: speechResult, timestamp: new Date() });
        job.conversationHistory.push({ role: 'user', parts: [{ text: speechResult }] });

        try {
            const systemInstruction = `You are a purchasing agent AI on a live call. Your goal is to place an order, get a confirmation number, and a delivery estimate. Be concise. The order is for: ${job.items.map(i => i.product.ProductName).join(', ')}. Generate the next thing to say in Spanish. If you have all the information (confirmation number AND delivery estimate), you MUST start your response with the keyword "CONFIRMATION_COMPLETE" followed by a valid JSON object with 'confirmationId' and 'deliveryEstimate' keys, and then your final closing statement. Example: CONFIRMATION_COMPLETE {"confirmationId": "ABC-123", "deliveryEstimate": "2 days"} Perfect, thank you for your help. Goodbye.`;
            const chat = ai.chats.create({ model: 'gemini-2.5-flash', history: job.conversationHistory, config: { systemInstruction } });
            const result = await chat.sendMessage({ message: speechResult });
            const agentResponseText = result.text;

            if (agentResponseText.startsWith('CONFIRMATION_COMPLETE')) {
                job.status = 'callEnded';
                const parts = agentResponseText.split('}');
                const jsonDataString = parts[0] + '}';
                const finalWords = parts.slice(1).join('}').trim();

                try {
                    const extractedJson = JSON.parse(jsonDataString.replace('CONFIRMATION_COMPLETE', '').trim());
                    job.extractedData = extractedJson;
                } catch (e) { console.error("Error parsing extracted JSON", e); }
                
                twiml.say({ language: 'es-MX' }, finalWords || "Gracias, adiós.");
                twiml.hangup();
            } else {
                job.status = 'agentSpeaking';
                job.transcript.push({ speaker: 'agent', text: agentResponseText, timestamp: new Date() });
                job.conversationHistory.push({ role: 'model', parts: [{ text: agentResponseText }] });
                const gather = twiml.gather({ input: 'speech', action: `/twilio-webhook/${jobId}`, language: 'es-CO' });
                gather.say({ language: 'es-MX' }, agentResponseText);
            }
        } catch (error) {
            console.error("Gemini API error:", error);
            twiml.say({ language: 'es-MX' }, 'Lo siento, he encontrado un error. Adiós.');
            twiml.hangup();
            job.status = 'error';
        }
    } else {
        twiml.hangup();
    }
    res.type('text/xml');
    res.send(twiml.toString());
});

// Receive call status updates from Twilio
app.post('/twilio-status-callback/:jobId', (req, res) => {
    const jobId = req.params.jobId;
    const job = jobs[jobId];
    if (!job) return res.sendStatus(404);
    const { CallStatus } = req.body;
    switch (CallStatus) {
        case 'ringing': job.status = 'connecting'; break;
        case 'in-progress': job.status = 'agentSpeaking'; break;
        case 'completed': case 'canceled': case 'failed': case 'no-answer': job.status = 'callEnded'; break;
    }
    res.sendStatus(200);
});

// Endpoint for frontend to poll for job status
app.get('/api/call-status/:jobId', (req, res) => {
    const job = jobs[req.params.jobId];
    if (job) res.json(job);
    else res.status(404).json({ error: 'Job not found' });
});

// Endpoint to manually end a call
app.post('/api/end-call/:jobId', async (req, res) => {
    const job = jobs[req.params.jobId];
    const client = getTwilioClient();
    if (job && job.callSid && client) {
        try {
            await client.calls(job.callSid).update({ status: 'completed' });
            job.status = 'callEnded';
            return res.json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: "Could not end call." });
        }
    }
    res.status(404).json({ error: 'Job not found or call not active.' });
});

// --- Serve Static Frontend ---
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Server Start ---
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
    console.log(`Production server (ESM with API) listening on port ${port}`);
});