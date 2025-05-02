// Reusable ShimmerBar component
const ShimmerBar = ({ className }: { className?: string }) => (
  <div className={`bg-muted animate-pulse rounded ${className}`} />
);

// Skeleton for the totals boxes
const TotalBoxSkeleton = () => (
  <div className="flex flex-col items-center rounded-lg w-[80px]">
    <ShimmerBar className="w-full h-5 mb-1 rounded-t-md" /> {/* Title */}
    <ShimmerBar className="w-full h-6 rounded-md" /> {/* Amount */}
  </div>
);

// Skeleton for the footer buttons
const FooterButtonSkeleton = () => (
  <div className="flex justify-between items-center max-w-md w-full p-3 bg-card rounded-lg border border-border">
    <div className="space-y-1.5">
      <ShimmerBar className="w-36 h-5" /> {/* Title */}
      <ShimmerBar className="w-24 h-4" /> {/* Subtitle */}
    </div>
    <ShimmerBar className="w-5 h-5 rounded" /> {/* Icon */}
  </div>
);

function CashFlowDetailsSkeleton() {
  return (
    <>
      {/* Mimic Top Section (Month, Percentages, Totals) */}
      <div className="bg-card mb-4">
        <div className="p-8 pb-0 space-y-2">
          <ShimmerBar className="w-1/2 h-6" /> {/* Title */}
          <div className="flex space-x-4">
            <ShimmerBar className="w-1/5 h-3" /> {/* Percentage 1 */}
            <ShimmerBar className="w-1/5 h-3" /> {/* Percentage 2 */}
            <ShimmerBar className="w-1/5 h-3" /> {/* Percentage 3 */}
          </div>
          <ShimmerBar className="w-2/3 h-3" /> {/* Comparison Text */}
        </div>

        <div className='flex h-[400px] flex-col justify-start items-center pt-4 space-y-4'>
           {/* Totals Skeleton */}
           <div className="flex justify-center space-x-2 items-center text-center bg-muted/50 rounded-2xl p-2">
             <TotalBoxSkeleton />
             <TotalBoxSkeleton />
             <TotalBoxSkeleton />
           </div>

           {/* Chart Placeholder */}
           <div className="w-full h-64 px-4"> {/* Approx height of chart area */}
             <ShimmerBar className="w-full h-full" />
           </div>
        </div>
      </div>

      {/* Footer Section Skeleton */}
      <div className="bg-background p-4 pt-0 space-y-3 flex flex-col items-center">
        <FooterButtonSkeleton />
        <FooterButtonSkeleton />
        <FooterButtonSkeleton />
      </div>
    </>
  );
}

export default CashFlowDetailsSkeleton; 