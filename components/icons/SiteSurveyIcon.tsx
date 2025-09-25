
import React from 'react';

const SiteSurveyIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
    <path d="M12 2L12 3"></path>
    <path d="M22 10L21 10"></path>
    <path d="M12 18L12 19"></path>
    <path d="M2 10L3 10"></path>
  </svg>
);

export default SiteSurveyIcon;
