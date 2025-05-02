// Reusable ShimmerBar component
const ShimmerBar = ({ className }: { className?: string }) => (
  <div className={`bg-muted animate-pulse rounded ${className}`} />
);

function TransactionRowSkeleton() {
  return (
    <div className="bg-secondary p-3 border rounded-xl border-border"> {/* Adjusted height based on TransactionCard */}
      {/* Top Row: Name and Date */}
      <div className="flex justify-between items-center mb-2">
        <ShimmerBar className="w-3/5 h-5" /> {/* Counterparty/Description */}
        <ShimmerBar className="w-1/5 h-3" /> {/* Date */}
      </div>

      {/* Separator */}
      <hr className="border-t border-muted my-2" /> {/* Use muted color for shimmer */}

      {/* Bottom Row: Amount and Icons/Tag */}
      <div className="flex justify-between items-center mt-1">
        <ShimmerBar className="w-1/4 h-6" /> {/* Amount */}
        <div className="flex items-center space-x-2">
          <ShimmerBar className="w-20 h-8 rounded-lg" /> {/* Tag Button Placeholder */}
          <ShimmerBar className="w-6 h-6 rounded" /> {/* Exclude Icon Placeholder */}
          <ShimmerBar className="w-6 h-6 rounded" /> {/* Account Icon Placeholder */}
        </div>
      </div>
    </div>
  );
}

export default TransactionRowSkeleton; 