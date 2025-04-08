import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
};

export default Card;
