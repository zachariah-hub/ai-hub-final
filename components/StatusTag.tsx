import React from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { BotStatus } from '../types';

interface StatusTagProps {
  status: BotStatus;
}

const StatusTag: React.FC<StatusTagProps> = ({ status }) => {
  const { t } = useLocalization();

  const getStatusStyle = () => {
    switch (status) {
      case BotStatus.IDLE:
        return { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-400' };
      case BotStatus.CONNECTING:
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' };
      case BotStatus.AGENT_SPEAKING:
        return { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' };
      case BotStatus.LISTENING_FOR_RESPONSE:
        return { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' };
      case BotStatus.PROCESSING_RESPONSE:
        return { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' };
      case BotStatus.AWAITING_MANUAL_CALL:
        return { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' };
      case BotStatus.CALL_ENDED:
        return { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-400' };
      case BotStatus.ERROR:
        return { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-400' };
    }
  };

  const { bg, text, dot } = getStatusStyle();

  const isPulsing = [
    BotStatus.CONNECTING, 
    BotStatus.LISTENING_FOR_RESPONSE, 
    BotStatus.PROCESSING_RESPONSE,
    BotStatus.AGENT_SPEAKING,
    BotStatus.AWAITING_MANUAL_CALL
].includes(status);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      <span className={`w-2 h-2 mr-1.5 rounded-full ${dot} ${isPulsing ? 'animate-pulse' : ''}`}></span>
      {t(`bot.status.${status}`)}
    </span>
  );
};

export default StatusTag;
