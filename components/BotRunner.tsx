import React, { useState, useRef, useEffect } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { Supplier, Product, OrderItem, BotStatus, TwilioConfig, TranscriptEntry, ExtractedData } from '../types';
import StatusTag from './StatusTag';
import ReviewConfirmModal from './ReviewConfirmModal';
import AudioVisualizer from './AudioVisualizer';
import AgentIcon from './icons/AgentIcon';
import SupplierIcon from './icons/SupplierIcon';
import FileUpload from './FileUpload';

// Inform TypeScript about the global Twilio object from the script tag in index.html
declare const Twilio: any;

interface BotRunnerProps {
  suppliers: Supplier[];
  products: Product[];
  twilioConfig: TwilioConfig;
}

interface JobDetails {
    items: OrderItem[];
    specialty: string;
    suppliers: Supplier[];
    products: Product[];
}

const BotRunner: React.FC<BotRunnerProps> = ({ suppliers, products, twilioConfig }) => {
    const { t } = useLocalization();
    const [requisitionItems, setRequisitionItems] = useState<OrderItem[]>([]);
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
    const [status, setStatus] = useState<BotStatus>(BotStatus.IDLE);
    const [isReviewModalOpen, setReviewModalOpen] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [viewMode, setViewMode] = useState<'setup' | 'console'>('setup');
    const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
    
    const fullJobDetails = useRef<JobDetails | null>(null);
    const twilioDevice = useRef<any>(null);
    const canStart = suppliers.length > 0 && products.length > 0;

    const isJobActive = status !== BotStatus.IDLE && status !== BotStatus.CALL_ENDED && status !== BotStatus.ERROR;
    const uniqueSpecialties = [...new Set(suppliers.map(s => s.Specialty))];

    useEffect(() => {
        // Cleanup on component unmount
        return () => {
            if (twilioDevice.current) {
                twilioDevice.current.disconnectAll();
                twilioDevice.current = null;
            }
        };
    }, []);

    const handleRequisitionUpload = (csvText: string) => {
        try {
            const lines = csvText.trim().split(/\r?\n/).slice(1);
            if(lines.length === 0) {
                 setRequisitionItems([]);
                 return;
            }
            const items: OrderItem[] = lines.map(line => {
                const [productId, quantityStr] = line.split(',');
                const product = products.find(p => p.ProductID.trim() === productId.trim());
                if (!product) {
                    throw new Error(`Product with ID "${productId}" not found in master product list.`);
                }
                const quantity = parseInt(quantityStr.trim(), 10);
                if (isNaN(quantity)) {
                    throw new Error(`Invalid quantity for Product ID "${productId}".`);
                }
                return { product, quantity, notes: null };
            });
            setRequisitionItems(items);
            setSelectedSpecialty('');
        } catch (error: any) {
            alert(`Error parsing requisition file: ${error.message}`);
            setRequisitionItems([]);
        }
    };


    const handleInitiateJob = () => {
        if (requisitionItems.length === 0 || !selectedSpecialty) return;
        if (!twilioConfig.fromNumber || !twilioConfig.accountSid || !twilioConfig.authToken) {
            alert(t('bot.runner.configWarning'));
            return;
        }
        fullJobDetails.current = { 
            items: requisitionItems, 
            specialty: selectedSpecialty,
            suppliers,
            products
        };
        setReviewModalOpen(true);
    };

    const handleConfirmJob = async () => {
        if (!fullJobDetails.current) return;
        
        setReviewModalOpen(false);
        setStatus(BotStatus.CONNECTING);
        setTranscript([]);
        setExtractedData(null);
        setViewMode('console');
        
        try {
            const response = await fetch('/api/initiate-job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullJobDetails.current),
            });
            if (response.ok) {
                const { jobId: newJobId } = await response.json();
                setJobId(newJobId);
            } else {
                const errorData = await response.json();
                console.error('Failed to start job:', errorData.error);
                alert(`Failed to start job: ${errorData.error}`);
                setStatus(BotStatus.ERROR);
            }
        } catch (error) {
            console.error('Error starting job:', error);
            setStatus(BotStatus.ERROR);
        }
    };

    const handleEndCall = async () => {
        if (twilioDevice.current) {
            twilioDevice.current.disconnectAll();
            twilioDevice.current = null;
        }
        if(jobId) {
            await fetch(`/api/end-call/${jobId}`, { method: 'POST' });
        }
        setJobId(null);
        setStatus(BotStatus.CALL_ENDED);
        setTimeout(() => {
            setStatus(BotStatus.IDLE);
            setViewMode('setup');
            setTranscript([]);
            setCurrentSupplier(null);
        }, 3000);
    };

    // Effect for polling call status from the backend
    useEffect(() => {
        if (!jobId || status === BotStatus.CALL_ENDED || status === BotStatus.ERROR) {
            return;
        }

        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/api/call-status/${jobId}`);
                if(response.ok) {
                    const data = await response.json();
                    if (data) {
                        setStatus(data.status);
                        setCurrentSupplier(data.supplier);
                        if (JSON.stringify(data.transcript) !== JSON.stringify(transcript)) {
                            setTranscript(data.transcript);
                        }
                        if (data.extractedData) {
                            setExtractedData(data.extractedData);
                        }
                        if (data.status === 'callEnded' || data.status === 'error') {
                            if(twilioDevice.current) {
                                twilioDevice.current.disconnectAll();
                                twilioDevice.current = null;
                            }
                        }
                    }
                } else {
                     setStatus(BotStatus.ERROR);
                }
            } catch (error) {
                console.error("Failed to fetch call status", error);
                setStatus(BotStatus.ERROR);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [jobId, status, transcript]);

    // Effect for connecting to live audio via Twilio Voice SDK
    useEffect(() => {
        if (isJobActive && jobId && !twilioDevice.current) {
            const setupTwilioDevice = async () => {
                try {
                    const response = await fetch('/api/get-audio-token');
                    const { token } = await response.json();
                    
                    const device = new Twilio.Device(token, {
                        codecPreferences: ['opus', 'pcmu'],
                    });
                    
                    device.on('error', (error: any) => console.error('Twilio Device Error:', error.message));
                    
                    const params = { conferenceName: `ProcurementJob_${jobId}` };
                    await device.connect({ params });
                    twilioDevice.current = device;

                } catch (error) {
                    console.error("Could not setup Twilio Device for monitoring:", error);
                }
            };
            setupTwilioDevice();
        }
    }, [isJobActive, jobId]);
    
    if (!canStart) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8 bg-white rounded-lg shadow-md border">
                    <h2 className="text-xl font-semibold text-gray-700">{t('bot.runner.noDataWarning')}</h2>
                </div>
            </div>
        );
    }
    
    if (viewMode === 'console' && currentSupplier) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
                {/* Left Panel: Call Sequence */}
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('bot.console.sequenceTitle')}</h2>
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg border">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-gray-900">{currentSupplier.SupplierName}</h3>
                                <StatusTag status={status} />
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{t('bot.console.calling')} {currentSupplier.PhoneNumber}</p>
                        </div>
                    </div>
                    <div className="mt-auto pt-6 border-t border-gray-200">
                        <button 
                            onClick={handleEndCall}
                            className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-800 transition duration-300 flex items-center justify-center"
                        >
                            {t('bot.runner.endCall')}
                        </button>
                    </div>
                </div>

                {/* Center Panel: Transcript */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('bot.runner.transcript')}</h2>
                    <div className="flex-1 bg-gray-50 rounded-lg p-4 flex flex-col-reverse space-y-4 space-y-reverse overflow-y-auto">
                        {[...transcript].reverse().map((entry, index) => (
                            <div key={index} className={`flex items-start gap-3 w-full ${entry.speaker === 'supplier' ? 'justify-end' : 'justify-start'}`}>
                                {entry.speaker === 'agent' && (
                                    <div className="flex-shrink-0 rounded-full p-2 bg-red-100 text-red-600">
                                       <AgentIcon className="w-5 h-5" />
                                    </div>
                                )}
                                <div className={`p-3 rounded-lg max-w-md ${entry.speaker === 'agent' ? 'bg-red-50 text-gray-800' : 'bg-white text-gray-800 border'}`}>
                                    <p className="text-sm">{entry.text}</p>
                                </div>
                                {entry.speaker === 'supplier' && (
                                     <div className="flex-shrink-0 rounded-full p-2 bg-gray-200 text-gray-700">
                                       <SupplierIcon className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                     <div className="pt-4 mt-4 border-t border-gray-200 h-[91px] flex items-center justify-center">
                        <AudioVisualizer isActive={isJobActive} />
                    </div>
                </div>
                
                {/* Right Panel: Extracted Data */}
                 <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('bot.console.extractionTitle')}</h2>
                    <div className="flex-1 bg-gray-900 text-white rounded-lg p-4 text-xs font-mono overflow-x-auto">
                        <pre><code>{JSON.stringify(extractedData, null, 2) || '...'}</code></pre>
                    </div>
                </div>
                
                <ReviewConfirmModal 
                    isOpen={isReviewModalOpen}
                    onClose={() => setReviewModalOpen(false)}
                    onConfirm={handleConfirmJob}
                    jobDetails={fullJobDetails.current}
                />
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                <h2 className="text-xl font-semibold text-gray-800">{t('bot.runner.uploadRequisition')}</h2>
                <p className="text-sm text-gray-500 mt-1 mb-6">{t('bot.runner.description')}</p>
                <p className="text-xs text-gray-400 mt-1 mb-6">{t('bot.runner.requisitionFileFormat')}</p>
                
                <div className="space-y-6 flex-1">
                    <FileUpload onFileUpload={handleRequisitionUpload} />

                    {requisitionItems.length > 0 && (
                        <div className="border-t border-gray-200 pt-4">
                            <h3 className="text-md font-medium text-gray-800">{t('bot.runner.requisitionSummary')}</h3>
                            <ul className="mt-2 space-y-1 text-sm text-gray-700 max-h-60 overflow-y-auto">
                                {requisitionItems.map(item => (
                                    <li key={item.product.ProductID} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                        <span>{item.product.ProductName}</span>
                                        <span className="font-semibold">{item.quantity}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                 <div className="flex-1">
                     <h2 className="text-xl font-semibold text-gray-800">{t('bot.runner.initiateJob')}</h2>
                     <div className="mt-6">
                        <label htmlFor="specialty-select" className="block text-sm font-medium text-gray-700">{t('bot.runner.selectSpecialty')}</label>
                        <select
                            id="specialty-select"
                            value={selectedSpecialty}
                            onChange={(e) => setSelectedSpecialty(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
                            disabled={isJobActive || requisitionItems.length === 0}
                        >
                            <option value="" disabled>-- Select --</option>
                            {uniqueSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="mt-auto pt-6 border-t border-gray-200">
                    <button 
                        onClick={handleInitiateJob}
                        disabled={requisitionItems.length === 0 || !selectedSpecialty || isJobActive}
                        className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isJobActive ? t('bot.runner.callInProgress') : t('bot.runner.initiateJob')}
                    </button>
                </div>
                 <ReviewConfirmModal 
                    isOpen={isReviewModalOpen}
                    onClose={() => setReviewModalOpen(false)}
                    onConfirm={handleConfirmJob}
                    jobDetails={fullJobDetails.current}
                />
            </div>
        </div>
    );
};

export default BotRunner;
