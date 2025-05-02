// Reusable ShimmerBar component
const ShimmerBar = ({ className }: { className?: string }) => (
  <div className={`bg-muted animate-pulse rounded ${className}`} />
);

function SpendingSummaryItemSkeleton() {
  return (
    <div className="flex bg-card p-4 rounded-xl overflow-hidden shadow-sm relative bg-input border border-input"> {/* Approx height */}
      {/* Background Bar Placeholder */}
      {/* <div
        className="absolute inset-y-0 left-0 bg-secondary rounded-r-xl border-input w-1/3 animate-pulse"
        style={{ zIndex: 1 }}
        aria-hidden="true"
      ></div> */}
      {/* Content Placeholders */}
      <div className="flex w-full justify-between items-end space-x-4" style={{ zIndex: 2 }}>
        <div className="flex-1 min-w-0 space-y-1.5">
          <ShimmerBar className="w-3/4 h-4" /> {/* Name */}
          <ShimmerBar className="w-1/2 h-6" /> {/* Amount */}
        </div>
        <ShimmerBar className="w-10 h-4" /> {/* Percentage */}
      </div>
    </div>
  );
}

export default SpendingSummaryItemSkeleton; 