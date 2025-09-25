import React, { useState, useRef, useEffect } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { Supplier, Product, Order, OrderItem, BotStatus, TwilioConfig, TranscriptEntry, ExtractedData } from '../types';
import StatusTag from './StatusTag';
import ReviewConfirmModal from './ReviewConfirmModal';
import AudioVisualizer from './AudioVisualizer';
import AgentIcon from './icons/AgentIcon';
import SupplierIcon from './icons/SupplierIcon';

// Inform TypeScript about the global Twilio object from the script tag in index.html
declare const Twilio: any;

interface BotRunnerProps {
  suppliers: Supplier[];
  products: Product[];
  twilioConfig: TwilioConfig;
}

const BotRunner: React.FC<BotRunnerProps> = ({ suppliers, products, twilioConfig }) => {
    const { t } = useLocalization();
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [currentProduct, setCurrentProduct] = useState<string>('');
    const [status, setStatus] = useState<BotStatus>(BotStatus.IDLE);
    const [isReviewModalOpen, setReviewModalOpen] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [viewMode, setViewMode] = useState<'setup' | 'console'>('setup');
    const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    
    const fullOrder = useRef<Order | null>(null);
    const twilioDevice = useRef<any>(null);
    const canStart = suppliers.length > 0 && products.length > 0;

    const isCallActive = status !== BotStatus.IDLE && status !== BotStatus.CALL_ENDED && status !== BotStatus.ERROR;

    useEffect(() => {
        // Cleanup on component unmount
        return () => {
            if (twilioDevice.current) {
                twilioDevice.current.disconnectAll();
                twilioDevice.current = null;
            }
        };
    }, []);

    const handleAddItem = () => {
        if (!currentProduct) return;
        const product = products.find(p => p.ProductID === currentProduct);
        if (product && !orderItems.some(item => item.product.ProductID === currentProduct)) {
            setOrderItems([...orderItems, { product, quantity: null, notes: null }]);
            setCurrentProduct('');
        }
    };

    const handleRemoveItem = (productId: string) => {
        setOrderItems(orderItems.filter(item => item.product.ProductID !== productId));
    };

    const handleStartCall = () => {
        const supplier = suppliers.find(s => s.SupplierID === selectedSupplierId);
        if (!supplier || orderItems.length === 0) return;
        if (!twilioConfig.fromNumber || !twilioConfig.accountSid || !twilioConfig.authToken) {
            alert(t('bot.runner.configWarning'));
            return;
        }
        fullOrder.current = { supplier, items: orderItems };
        setReviewModalOpen(true);
    };

    const handleConfirmCall = async () => {
        if (!fullOrder.current) return;
        
        setReviewModalOpen(false);
        setStatus(BotStatus.CONNECTING);
        setTranscript([]);
        setExtractedData(null);
        setViewMode('console');
        
        try {
            const response = await fetch('/api/start-call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullOrder.current),
            });
            if (response.ok) {
                const { jobId: newJobId } = await response.json();
                setJobId(newJobId);
            } else {
                console.error('Failed to start call');
                setStatus(BotStatus.ERROR);
            }
        } catch (error) {
            console.error('Error starting call:', error);
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
        if (isCallActive && jobId && !twilioDevice.current) {
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
    }, [isCallActive, jobId]);
    
    if (!canStart) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8 bg-white rounded-lg shadow-md border">
                    <h2 className="text-xl font-semibold text-gray-700">{t('bot.runner.noDataWarning')}</h2>
                </div>
            </div>
        );
    }
    
    if (viewMode === 'console' && fullOrder.current) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
                {/* Left Panel: Call Sequence */}
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('bot.console.sequenceTitle')}</h2>
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg border">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-gray-900">{fullOrder.current.supplier.SupplierName}</h3>
                                <StatusTag status={status} />
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{t('bot.console.calling')} {fullOrder.current.supplier.PhoneNumber}</p>
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
                        <AudioVisualizer isActive={isCallActive} />
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
                    onConfirm={handleConfirmCall}
                    order={fullOrder.current}
                />
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                <h2 className="text-xl font-semibold text-gray-800">{t('bot.runner.orderSummary')}</h2>
                <p className="text-sm text-gray-500 mt-1 mb-6">{t('bot.runner.description')}</p>

                <div className="space-y-6 flex-1">
                    <div>
                        <label htmlFor="supplier-select" className="block text-sm font-medium text-gray-700">{t('bot.runner.selectSupplier')}</label>
                        <select
                            id="supplier-select"
                            value={selectedSupplierId}
                            onChange={(e) => setSelectedSupplierId(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
                            disabled={isCallActive}
                        >
                            <option value="" disabled>-- Select --</option>
                            {suppliers.map(s => <option key={s.SupplierID} value={s.SupplierID}>{s.SupplierName}</option>)}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="product-select" className="block text-sm font-medium text-gray-700">{t('bot.runner.selectProduct')}</label>
                        <div className="flex items-center space-x-2 mt-1">
                            <select
                                id="product-select"
                                value={currentProduct}
                                onChange={(e) => setCurrentProduct(e.target.value)}
                                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
                                disabled={isCallActive}
                            >
                                <option value="" disabled>-- Select --</option>
                                {products.map(p => <option key={p.ProductID} value={p.ProductID}>{p.ProductName}</option>)}
                            </select>
                            <button onClick={handleAddItem} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400" disabled={!currentProduct || isCallActive}>
                                {t('bot.runner.addOrderItem')}
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 flex-1">
                        <h3 className="text-md font-medium text-gray-800">Order Items</h3>
                        {orderItems.length === 0 ? (
                            <p className="text-sm text-gray-400 mt-2">No items added yet.</p>
                        ) : (
                            <ul className="mt-2 space-y-2">
                                {orderItems.map(item => (
                                    <li key={item.product.ProductID} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                        <span>{item.product.ProductName}</span>
                                        <button onClick={() => handleRemoveItem(item.product.ProductID)} className="text-red-500 hover:text-red-700" disabled={isCallActive}>
                                            &times;
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="mt-auto pt-6 border-t border-gray-200">
                    <button 
                        onClick={handleStartCall}
                        disabled={!selectedSupplierId || orderItems.length === 0 || isCallActive}
                        className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isCallActive ? t('bot.runner.callInProgress') : t('bot.runner.startCall')}
                    </button>
                </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">{t('bot.runner.callInProgress')}</h2>
                    <StatusTag status={status} />
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                     <div className="text-center text-gray-500">
                        <div>
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">Awaiting Call</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Configure an order to start a call.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <ReviewConfirmModal 
                isOpen={isReviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                onConfirm={handleConfirmCall}
                order={fullOrder.current}
            />
        </div>
    );
};

export default BotRunner;