import React from 'react';
import { LuIndianRupee } from 'react-icons/lu';

interface CurrencyDisplayProps {
  amount: number | undefined | null;
  className?: string;
  currency?: string;
  compact?: boolean;
  showType?: boolean;
  showFraction?: boolean;
  smallRupeeSymbol?: boolean;
  type?: 'CREDIT' | 'DEBIT';
  showOnlyNegative?: boolean;
}

const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ 
  amount,
  className = '',
  currency = 'INR',
  showType = true,
  type,
  showFraction = true,
  smallRupeeSymbol = false,
  showOnlyNegative = false,
}) => {

  if (amount === undefined || amount === null) {
    return <span className={className}>--.--</span>;
  }

  if (!type) {
    type = amount < 0 ? 'DEBIT' : 'CREDIT';
  }

  let formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: showFraction ? 2 : 0,
  }).format(Math.abs(amount)).replace(/₹/, '').trim();

  return (
    <div className={`flex flex-row items-center text-muted-foreground ${className}`}>
        {showType && (showOnlyNegative ? type === 'DEBIT' : true) && <span className={`text-sm font-mono`}>{type === 'DEBIT' ? '-' : '+'}</span>}
        <div className={`flex flex-row ${smallRupeeSymbol ? 'items-start' : 'items-center'}`}>
            <LuIndianRupee className={`${smallRupeeSymbol ? 'text-xs mt-0.5' : 'p-0.5 -mx-0.5'} font-base`}/>
            <span className='text-foreground'>{formattedAmount}</span>
        </div>
    </div>
  );
};

export default CurrencyDisplay; 