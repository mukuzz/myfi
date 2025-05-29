// Reusable ShimmerBar component
const ShimmerBar = ({ className }: { className?: string }) => (
  <div className={`bg-muted animate-pulse rounded ${className}`} />
);

const MonthRowSkeleton = ({ showDivider }: { showDivider: boolean }) => (
  <div className="space-y-2">
    <div className="grid grid-cols-3 items-center font-medium">
      {/* Incoming column */}
      <div className="flex flex-grow flex-col justify-between items-start">
        <ShimmerBar className="w-12 h-3 mb-1" /> {/* "Incoming" label */}
        <ShimmerBar className="w-16 h-6" /> {/* Amount */}
      </div>
      
      {/* Month column */}
      <div className="text-center">
        <ShimmerBar className="w-8 h-3 mx-auto" /> {/* Month name */}
      </div>
      
      {/* Outgoing column */}
      <div className="flex flex-grow flex-col justify-between items-end">
        <ShimmerBar className="w-12 h-3 mb-1" /> {/* "Outgoing" label */}
        <ShimmerBar className="w-16 h-7" /> {/* Amount */}
      </div>
    </div>
    {showDivider && (
      <hr className="border-muted-foreground/20" />
    )}
  </div>
);

function MonthlyCashFlowSkeleton() {
  return (
    <div className="space-y-4">
      {/* Generate 3 month rows to match the actual data */}
      {[0, 1, 2].map((index) => (
        <MonthRowSkeleton 
          key={index} 
          showDivider={index < 2} // Show divider for first 2 rows only
        />
      ))}
    </div>
  );
}

export default MonthlyCashFlowSkeleton; 