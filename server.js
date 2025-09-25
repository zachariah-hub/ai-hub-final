import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import twilio from 'twilio';
import { GoogleGenAI } from "@google/genai";

// --- Boilerplate for __dirname in ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- App Initialization ---
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- In-Memory Storage (for demonstration purposes) ---
let twilioConfig = {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_PHONE_NUMBER || '',
};
let jobs = {}; // Store call job states

// --- Gemini AI Initialization (for Phase 4) ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Twilio Client Helper ---
const getTwilioClient = () => {
    if (twilioConfig.accountSid && twilioConfig.authToken) {
        return { 
            client: twilio(twilioConfig.accountSid, twilioConfig.authToken), 
            fromNumber: twilioConfig.fromNumber 
        };
    }
    return { client: null, fromNumber: null };
};

// --- Twilio Validation Helper ---
const validateTwilioCredentials = async (sid, token) => {
  try {
    const client = twilio(sid, token);
    await client.api.v2010.accounts(sid).fetch();
    return { isValid: true };
  } catch (error) {
    console.error("Twilio Validation Error:", error);
    return { isValid: false, error: error.message };
  }
};

// --- Twilio Outbound Call Function (Phase 3) ---
const makeOutboundCall = async (supplier, jobId, req) => {
    const { client, fromNumber } = getTwilioClient();
    if (!client || !fromNumber) {
        console.error("Twilio Client not configured. Cannot make call.");
        if (jobs[jobId]) jobs[jobId].status = 'error'; // Update status to 'Failed: Config Error'
        return;
    }

    const backendBaseUrl = process.env.PUBLIC_BACKEND_BASE_URL || `https://${req.get('host')}`;
    const conferenceName = `RequisitionJob_${jobId}`;
    const mainWebhookUrl = `${backendBaseUrl}/twilio-webhook-handler/${jobId}`;
    const statusWebhookUrl = `${backendBaseUrl}/twilio-webhook-handler/status/${jobId}`;

    try {
        console.log(`*** DIALING LIVE NUMBER: ${supplier.PhoneNumber} from ${fromNumber} ***`); // Explicit log for verification

        const call = await client.calls.create({
            to: supplier.PhoneNumber,
            from: fromNumber,
            // TwiML to dial the supplier into a Conference immediately.
            twiml: `<Response><Dial><Conference startConferenceOnEnter="true" endConferenceOnExit="true" statusCallback="${mainWebhookUrl}" statusCallbackEvent="join">${conferenceName}</Conference></Dial></Response>`,
            // Status callback for call progress events (ringing, answered, etc.)
            statusCallback: statusWebhookUrl,
            statusCallbackMethod: 'POST',
            statusCallbackEvent: ['ringing', 'answered', 'completed'],
        });
        
        if (jobs[jobId]) {
            jobs[jobId].callSid = call.sid;
            jobs[jobId].status = 'connecting';
        }
        console.log(`Call Initiated. SID: ${call.sid}`);

    } catch (error) {
        console.error("Twilio API Call Failed:", error);
        if (jobs[jobId]) jobs[jobId].status = 'error'; // Update status to 'Failed: API Error'
    }
};


// --- API Endpoints ---

// Fetch the current Twilio configuration
app.get('/api/get-config', (req, res) => {
    res.json(twilioConfig);
});

// Save and validate Twilio configuration from the frontend
app.post('/api/save-config', async (req, res) => {
    const { accountSid, authToken, fromNumber } = req.body;

    const validationResult = await validateTwilioCredentials(accountSid, authToken);

    if (!validationResult.isValid) {
        return res.status(400).json({ success: false, error: validationResult.error });
    }
    
    twilioConfig = { accountSid, authToken, fromNumber };
    console.log("Saved Twilio Config:", { ...twilioConfig, authToken: '...hidden' });
    res.json({ success: true, message: 'Configuration saved and validated.' });
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

// Start a new call job based on a requisition
app.post('/api/initiate-job', async (req, res) => {
    const { items, specialty, suppliers } = req.body;
    if (!items || items.length === 0 || !specialty || !suppliers) {
        return res.status(400).json({ error: 'Requisition items, specialty, and supplier list are required.' });
    }
    
    // A. Intelligent Supplier Matching
    const matchingSuppliers = suppliers.filter(s => s.Specialty === specialty);
    if (matchingSuppliers.length === 0) {
        return res.status(400).json({ error: `No suppliers found with the specialty: "${specialty}"` });
    }

    // For this version, we'll just call the first supplier in the matched list.
    const supplierToCall = matchingSuppliers[0];
    const jobId = `job_${Date.now()}`;
    
    // B. Create the job state in-memory
    jobs[jobId] = {
        status: 'connecting',
        transcript: [],
        extractedData: null,
        supplier: supplierToCall,
        items,
        conversationHistory: [],
        callSid: null,
        hasAgentJoined: false,
    };

    // C. Execution Trigger
    makeOutboundCall(supplierToCall, jobId, req);

    res.json({ jobId });
});

// Main conversation webhook STUB (Phase 3)
app.post('/twilio-webhook-handler/:jobId', async (req, res) => {
    const jobId = req.params.jobId;
    const job = jobs[jobId];
    if (!job) return res.sendStatus(404);

    const twiml = new twilio.twiml.VoiceResponse();
    const status = req.body.StatusCallbackEvent;
    
    if (status === 'participant-join' && !job.hasAgentJoined) {
        console.log(`Participant joined conference for job ${jobId}. AI will take over in Phase 4.`);
        job.hasAgentJoined = true;
        // In Phase 4, AI logic with <Gather> will be added here.
    }
    
    // Return empty TwiML to keep the call active.
    res.type('text/xml');
    res.send(twiml.toString());
});

// Call status webhook handler (Phase 3)
app.post('/twilio-webhook-handler/status/:jobId', (req, res) => {
    const jobId = req.params.jobId;
    const job = jobs[jobId];
    if (!job) return res.sendStatus(404);

    const { CallStatus } = req.body;
    console.log(`Status update for job ${jobId}: ${CallStatus}`);

    switch (CallStatus) {
        case 'ringing':
            job.status = 'connecting'; // Frontend uses 'connecting' for the ringing state
            break;
        case 'in-progress':
            job.status = 'agentSpeaking'; // Call is answered, assume agent is about to speak
            break;
        case 'completed':
        case 'canceled':
        case 'failed':
        case 'no-answer':
            job.status = 'callEnded';
            break;
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
    const { client } = getTwilioClient();
    if (job && job.callSid && client) {
        try {
            await client.calls(job.callSid).update({ status: 'completed' });
            job.status = 'callEnded';
            return res.json({ success: true });
        } catch (error) {
            // It might fail if the call is already over, which is fine.
            job.status = 'callEnded';
            return res.json({ success: true, message: "Call likely already completed."});
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