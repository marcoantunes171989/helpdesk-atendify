import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type Props = {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "muted";
  trend?: "up" | "down";
};

const accentMap = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  muted: "bg-muted text-muted-foreground",
} as const;

export function StatCard({ title, value, hint, icon: Icon, accent = "primary", trend }: Props) {
  return (
    <Card className="relative overflow-hidden border-border/60 shadow-[var(--shadow-soft)] transition-all hover:shadow-[var(--shadow-elegant)] hover:-translate-y-0.5">
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium truncate">{title}</p>
            <p className="mt-1 sm:mt-2 text-base sm:text-2xl font-bold tracking-tight truncate">{value}</p>
            {hint && (
              <div className="mt-1 flex items-center gap-1 min-w-0">
                {trend && (
                  <div className={cn(
                    "flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full shrink-0",
                    trend === "up" ? "bg-success/20 text-success" : "bg-destructive/10 text-destructive"
                  )}>
                    {trend === "up" ? <ArrowUpRight className="h-2 w-2 sm:h-2.5 sm:w-2.5" /> : <ArrowDownRight className="h-2 w-2 sm:h-2.5 sm:w-2.5" />}
                  </div>
                )}
                <span className={cn(
                  "text-[9px] sm:text-xs truncate font-medium",
                  trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
                )}>
                  {hint}
                </span>
              </div>
            )}
          </div>
          <div className={cn("flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl shrink-0", accentMap[accent])}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
