// Reusable ShimmerBar component
const ShimmerBar = ({ className }: { className?: string }) => (
  <div className={`bg-muted animate-pulse rounded ${className}`} />
);

const CashFlowRowSkeleton = () => (
  <div className="items-start"> {/* Match approximate height */}
    <ShimmerBar className="w-20 h-[78px]" />
  </div>
);

function MonthlyCashFlowSkeleton() {
  return (
    <>
        {/* Mimic the content area padding and spacing */}
        <div className="overflow-y-auto bg-secondary font-medium">
            {/* Cash Flow Rows Skeleton */}
            <div className="flex flex-row justify-between"> {/* Match spacing from original */}
                <CashFlowRowSkeleton />
                <CashFlowRowSkeleton />
                <CashFlowRowSkeleton />
            </div>
        </div>
    </>
  );
}

export default MonthlyCashFlowSkeleton; 