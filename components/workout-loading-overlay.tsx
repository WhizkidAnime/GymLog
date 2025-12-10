import React from 'react';

type WorkoutLoadingOverlayProps = {
  message: string;
};

export const WorkoutLoadingOverlay: React.FC<WorkoutLoadingOverlayProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'transparent' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-white text-center">{message}</p>
      </div>
    </div>
  );
};
