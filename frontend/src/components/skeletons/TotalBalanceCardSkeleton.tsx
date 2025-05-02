import Card from '../Card';

const ShimmerBar = ({ className }: { className?: string }) => (
  <div className={`bg-muted animate-pulse rounded ${className}`} />
);

const ShimmerPill = () => (
    <div className="flex items-center bg-muted/80 rounded-full p-1 pr-3 h-[28px]">
        <div className="w-5 h-5 rounded-full bg-muted animate-pulse mr-2"></div>
        <ShimmerBar className="w-8 h-3" />
    </div>
);


function TotalBalanceCardSkeleton() {
  return (
    <Card>
      <div className="p-4 bg-secondary">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className="w-5 h-5 rounded-full bg-muted animate-pulse mr-2"></div>
            <ShimmerBar className="w-24 h-5" />
          </div>
          <div className="w-5 h-5 rounded-full bg-muted animate-pulse"></div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <ShimmerBar className="w-1/2 h-10" />
          <ShimmerBar className="w-16 h-6" />
        </div>

        <div className="flex flex-wrap flex-row gap-4">
           <ShimmerPill />
           <ShimmerPill />
           <ShimmerPill />
           <ShimmerPill />
           <ShimmerPill />
           <ShimmerPill />
        </div>
      </div>
    </Card>
  );
}

export default TotalBalanceCardSkeleton; 