import React, { useState } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { BotStatus, Supplier } from '../types';

interface VirtualPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: BotStatus;
  supplier: Supplier | null;
  curlCommand: string;
}

const VirtualPhoneModal: React.FC<VirtualPhoneModalProps> = ({ isOpen, onClose, status, supplier, curlCommand }) => {
  const { t } = useLocalization();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(curlCommand).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-8 transform transition-all">
        <h2 className="text-2xl font-bold text-gray-800 text-center">{t('modal.phone.title')}</h2>
        
        <p className="text-center text-gray-600 mt-2">{t('modal.phone.instruction')}</p>

        <div className="mt-6">
            <pre className="bg-gray-900 text-white p-4 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                <code>
                    {curlCommand}
                </code>
            </pre>
            <button
                onClick={handleCopy}
                className="mt-4 w-full bg-red-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-300"
            >
                {copied ? t('modal.phone.copied') : t('modal.phone.copy')}
            </button>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400">
            <p className="text-sm text-yellow-800">{t('modal.phone.warning')}</p>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={onClose}
            className="px-8 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            {t('modal.phone.hangUp')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VirtualPhoneModal;