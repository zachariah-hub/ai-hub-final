
import React from 'react';

const AgentIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 8V4H8" />
    <rect x="4" y="12" width="16" height="8" rx="2" />
    <path d="M2 12h20" />
    <path d="M17.5 12V8A5.5 5.5 0 0 0 12 2.5h0A5.5 5.5 0 0 0 6.5 8V12" />
  </svg>
);

export default AgentIcon;
