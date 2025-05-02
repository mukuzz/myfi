// Reusable ShimmerBar component
const ShimmerBar = ({ className }: { className?: string }) => (
  <div className={`bg-muted animate-pulse rounded ${className}`} />
);

const CashFlowRowSkeleton = () => (
  <div className="flex justify-between items-center h-[24px]"> {/* Match approximate height */}
    <ShimmerBar className="w-20 h-5" /> {/* Label */}
    <ShimmerBar className="w-16 h-5" /> {/* Amount */}
  </div>
);

function MonthlyCashFlowSkeleton() {
  return (
    <>
        {/* Mimic the content area padding and spacing */}
        <div className="space-y-4 flex-grow overflow-y-auto bg-secondary">

            {/* Cash Flow Rows Skeleton */}
            <div className="space-y-3 font-medium"> {/* Match spacing from original */}
                <CashFlowRowSkeleton />
                <CashFlowRowSkeleton />
                <CashFlowRowSkeleton />
            </div>
        </div>
    </>
  );
}

export default MonthlyCashFlowSkeleton; 