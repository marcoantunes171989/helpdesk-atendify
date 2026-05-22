import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartSkeletonProps {
  height?: number | string;
  className?: string;
  showLegend?: boolean;
}

export function ChartSkeleton({ 
  height = 350, 
  className,
  showLegend = true 
}: ChartSkeletonProps) {
  return (
    <div 
      className={cn("w-full flex flex-col space-y-4 animate-in fade-in duration-500", className)} 
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* Legend Area */}
      {showLegend && (
        <div className="flex justify-end gap-4 px-4 h-4 mb-2">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      )}

      {/* Main Chart Area */}
      <div className="flex-1 flex items-end gap-2 px-2 relative">
        {/* Y-Axis Lines Placeholder */}
        <div className="absolute inset-0 flex flex-col justify-between py-2 pr-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-full border-t border-muted/20 border-dashed" />
          ))}
        </div>

        {/* Vertical Bars/Points Placeholder */}
        <div className="flex-1 h-full flex items-end justify-around pb-6 relative z-10">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 w-full max-w-[40px]">
              <Skeleton 
                className={cn(
                  "w-full rounded-t-lg bg-primary/10",
                  i % 2 === 0 ? "h-[60%]" : i % 3 === 0 ? "h-[40%]" : "h-[80%]"
                )} 
              />
              <Skeleton className="h-2 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
