import SpendingSummaryItemSkeleton from './SpendingSummaryItemSkeleton';

// Reusable ShimmerBar component
const ShimmerBar = ({ className }: { className?: string }) => (
  <div className={`bg-muted animate-pulse rounded ${className}`} />
);

function SpendingSummaryScreenSkeleton() {
  return (
    <>
      {/* Filters Placeholder */}
      <div className="flex items-center justify-center p-4 space-x-2 flex-shrink-0">
        <div className="flex space-x-2">
          <ShimmerBar className="w-20 h-8 rounded-lg" /> {/* Year Button */}
          <ShimmerBar className="w-28 h-8 rounded-lg" /> {/* Month Button */}
        </div>
        <ShimmerBar className="w-10 h-8 rounded-lg" /> {/* Sliders Button */}
      </div>

      {/* Spending List Placeholder */}
      <div className="flex-grow p-4 space-y-3 overflow-y-auto">
        <SpendingSummaryItemSkeleton />
        <SpendingSummaryItemSkeleton />
        <SpendingSummaryItemSkeleton />
        <SpendingSummaryItemSkeleton />
        <SpendingSummaryItemSkeleton />
        <SpendingSummaryItemSkeleton />
        <SpendingSummaryItemSkeleton />
      </div>
    </>
  );
}

export default SpendingSummaryScreenSkeleton; 