import React from 'react';

interface CustomToastProps {
  message: string | null;
  isVisible: boolean;
}

const CustomToast: React.FC<CustomToastProps> = ({ message, isVisible }) => {
  if (!isVisible || !message) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-foreground text-background px-4 py-2 rounded-full shadow-xl text-sm z-50 animate-fade-in-out text-center whitespace-nowrap"
      // Add animation styles if needed, e.g., using keyframes and Tailwind config
    >
      {message}
    </div>
  );
};

export default CustomToast; 