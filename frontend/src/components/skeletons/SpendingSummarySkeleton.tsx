// Reusable ShimmerBar component (can be moved to a shared location later)
const ShimmerBar = ({ className }: { className?: string }) => (
  <div className={`bg-muted animate-pulse rounded ${className}`} />
);

const SpendingRowSkeleton = () => (
  <div className="flex justify-between items-center space-x-2 h-[36px]"> {/* Match height */} 
    <div className="relative flex-1 min-w-0">
      <ShimmerBar className="relative w-2/3 h-8" />
    </div>
    <ShimmerBar className="w-12 h-8" /> 
  </div>
);

function SpendingSummarySkeleton() {
  return (
    <>
        {/* Removed header */}

        <div className="space-y-4 flex-grow overflow-y-auto bg-secondary">
            {/* Spending Rows Skeleton */}
            <div className="space-y-3">
                <SpendingRowSkeleton />
                <SpendingRowSkeleton />
                <SpendingRowSkeleton />
                <SpendingRowSkeleton />
                <SpendingRowSkeleton />
            </div>
        </div>
    </>
  );
}

export default SpendingSummarySkeleton; 