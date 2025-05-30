import React from 'react';
import { Transaction, TagMap } from '../types';
import TransactionCard from './TransactionCard';
import CurrencyDisplay from './AmountDisplay';

interface SplitTransactionCardProps {
  transaction: Transaction;
  tagMap: TagMap;
  openDetailView?: (tx: Transaction) => void;
  openTagSelector?: (tx: Transaction, event: React.MouseEvent) => void;
  openSplitView?: (tx: Transaction) => void;
  className?: string;
}

const SplitTransactionCard: React.FC<SplitTransactionCardProps> = ({
  transaction: tx,
  tagMap,
  openDetailView,
  openTagSelector,
  openSplitView,
  className = "",
}) => {
  const hasChildTransactions = tx.subTransactions != null && tx.subTransactions.length > 0;

  return (
    <div className={`flex flex-col border-[0.7px] border-border rounded-xl overflow-hidden ${className}`}>
      {hasChildTransactions && (
        <button className="flex justify-between items-center bg-muted" onClick={() => openSplitView?.(tx)}>
          <div className="flex flex-row items-center p-3 text-muted-foreground">
            <CurrencyDisplay
              amount={Math.abs([tx, ...(tx.subTransactions || [])].reduce((sum, t) =>
                sum + (t.type === 'DEBIT' ? -t.amount : t.amount), 0
              ))}
              className='text-xl font-bold text-foreground'
              smallRupeeSymbol={true}
              type={tx.type}
            />
          </div>
          <div className='flex flex-row items-center font-bold text-muted-foreground/50 px-3'>
            <div className="text-sm font-medium text-secondary-foreground pr-2">
              {tx.subTransactions?.length} split{tx.subTransactions?.length === 1 ? "" : "s"}
            </div>
            {" > "}
          </div>
        </button>
      )}
      <TransactionCard
        transaction={tx}
        tagMap={tagMap}
        onCardClick={openDetailView}
        onTagClick={openTagSelector}
        className={hasChildTransactions ? "border-t-2 border-dashed border-border" : ""}
      />
      {tx.subTransactions && tx.subTransactions.length > 0 && (
        <>
          {tx.subTransactions.map(childTx => (
            <React.Fragment key={childTx.id}>
              <TransactionCard
                transaction={childTx}
                tagMap={tagMap}
                onCardClick={openDetailView}
                onTagClick={openTagSelector}
                className="border-t-2 border-dashed border-border"
              />
            </React.Fragment>
          ))}
        </>
      )}
    </div>
  );
};

export default SplitTransactionCard;