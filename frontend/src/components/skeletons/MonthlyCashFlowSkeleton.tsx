// Reusable ShimmerBar component
const ShimmerBar = ({ className }: { className?: string }) => (
  <div className={`bg-muted animate-pulse rounded ${className}`} />
);

const CashFlowRowSkeleton = () => (
  <div className="flex justify-between items-center h-[24px]"> {/* Match approximate height */}
    <ShimmerBar className="w-20 h-6" /> {/* Label */}
    <ShimmerBar className="w-16 h-6" /> {/* Amount */}
  </div>
);

function MonthlyCashFlowSkeleton() {
  return (
    <>
        {/* Mimic the content area padding and spacing */}
        <div className="overflow-y-auto bg-secondary font-medium">

            {/* Cash Flow Rows Skeleton */}
            <div className="space-y-2"> {/* Match spacing from original */}
                <CashFlowRowSkeleton />
                <hr />
                <CashFlowRowSkeleton />
                <hr />
                <CashFlowRowSkeleton />
            </div>
        </div>
    </>
  );
}

export default MonthlyCashFlowSkeleton; 