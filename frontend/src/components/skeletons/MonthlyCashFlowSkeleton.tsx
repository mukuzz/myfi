// Reusable ShimmerBar component
const ShimmerBar = ({ className }: { className?: string }) => (
  <div className={`bg-muted animate-pulse rounded ${className}`} />
);

const MonthRowSkeleton = () => (
  <div className="grid grid-cols-3 items-center font-medium">
    {/* Incoming amount */}
    <div className="flex flex-grow flex-col justify-between items-start">
      <ShimmerBar className="w-16 h-6" />
    </div>
    
    {/* Month name */}
    <div className="text-center">
      <ShimmerBar className="w-8 h-3 mx-auto" />
    </div>
    
    {/* Outgoing amount */}
    <div className="flex flex-grow flex-col justify-between items-end">
      <ShimmerBar className="w-16 h-6" />
    </div>
  </div>
);

function MonthlyCashFlowSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header row matching the loaded UI */}
      <div className="flex flex-row justify-between text-xs font-semibold text-muted-foreground">
        <ShimmerBar className="w-16 h-4" />
        <ShimmerBar className="w-16 h-4" />
      </div>
      
      {/* Month rows */}
      <div className="space-y-4">
        {[0, 1, 2].map((index) => (
          <MonthRowSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

export default MonthlyCashFlowSkeleton; 