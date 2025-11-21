import React from 'react';
import { useNavigate } from 'react-router-dom';

type BackButtonProps = {
  normalizedDate: string | null;
  className?: string;
};

export const BackButton: React.FC<BackButtonProps> = ({ normalizedDate, className = '' }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/calendar', { state: { refreshDate: normalizedDate } })}
      className={`inline-flex items-center justify-center p-2 rounded-full border border-transparent text-white transition-colors z-10 bg-transparent hover:border-white active:border-white focus:outline-none back-button-plain ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
};
