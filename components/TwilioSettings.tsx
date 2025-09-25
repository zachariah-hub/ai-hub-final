import React, { useState } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { TwilioConfig } from '../types';

interface TwilioSettingsProps {
    config: TwilioConfig;
    setConfig: (config: TwilioConfig) => void;
}

const TwilioSettings: React.FC<TwilioSettingsProps> = ({ config, setConfig }) => {
    const { t } = useLocalization();
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setConfig({ ...config, [name]: value });
    };

    const handleSave = () => {
        // In a real application, this would make a secure API call to a backend endpoint.
        // For this frontend demonstration, we'll just simulate the save action.
        console.log("Saving Twilio configuration to backend:", config);
        setSaveStatus('saved');
        setTimeout(() => {
            setSaveStatus('idle');
        }, 3000);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">{t('twilio.title')}</h2>
            <p className="text-gray-500 text-sm mt-1 mb-6">{t('twilio.description')}</p>
            
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="accountSid" className="block text-sm font-medium text-gray-700">{t('twilio.accountSid')}</label>
                        <input
                            type="text"
                            name="accountSid"
                            id="accountSid"
                            value={config.accountSid}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        />
                    </div>
                     <div>
                        <label htmlFor="authToken" className="block text-sm font-medium text-gray-700">{t('twilio.authToken')}</label>
                        <input
                            type="password"
                            name="authToken"
                            id="authToken"
                            value={config.authToken}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                            placeholder="••••••••••••••••••••••••••••••"
                        />
                    </div>
                </div>
                 <div>
                    <label htmlFor="fromNumber" className="block text-sm font-medium text-gray-700">{t('twilio.fromNumber')}</label>
                    <input
                        type="text"
                        name="fromNumber"
                        id="fromNumber"
                        value={config.fromNumber}
                        onChange={handleChange}
                        className="mt-1 block w-full md:max-w-xs px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                        placeholder="+15551234567"
                    />
                </div>
                 <div className="flex items-center space-x-4">
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-300 disabled:bg-gray-400"
                        disabled={!config.accountSid || !config.authToken || !config.fromNumber}
                    >
                        {t('twilio.save')}
                    </button>
                    {saveStatus === 'saved' && (
                        <span className="text-sm font-medium text-green-600 transition-opacity duration-300">
                            {t('twilio.save.success')}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TwilioSettings;