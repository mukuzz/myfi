// Reusable ShimmerBar component
const ShimmerBar = ({ className }: { className?: string }) => (
  <div className={`bg-muted animate-pulse rounded ${className}`} />
);

function AccountCardSkeleton() {
  return (
    <div className="inline-block align-top mr-4 min-w-[280px]">
      <div className="bg-secondary rounded-2xl overflow-hidden border border-border p-4 space-y-3">
        {/* Header: Logo + Name */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-muted animate-pulse"></div> {/* Logo Placeholder */}
          <ShimmerBar className="w-3/4 h-5" /> {/* Name Placeholder */}
        </div>
        {/* Balance */}
        <ShimmerBar className="w-1/2 h-6" />
        {/* Account Number */}
        <ShimmerBar className="w-2/3 h-8" />
        {/* Optional Button Placeholder (like expand/collapse) */}
        {/* <ShimmerBar className="absolute bottom-2 right-2 w-6 h-6 rounded-full" /> */}
      </div>
    </div>
  );
}

export default AccountCardSkeleton; 