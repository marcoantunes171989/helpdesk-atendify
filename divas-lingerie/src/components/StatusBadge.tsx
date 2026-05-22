import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StatusPosse, StatusRetirada } from "@/lib/types";

const map: Record<StatusPosse | StatusRetirada, { label: string; className: string }> = {
  em_posse: { label: "Em posse", className: "bg-warning/25 text-warning-foreground border-warning/40" },
  vendido: { label: "Vendido", className: "bg-success/20 text-success border-success/30" },
  devolvido: { label: "Devolvido", className: "bg-muted text-muted-foreground border-border" },
  comprado: { label: "Comprado", className: "bg-blue-50 text-blue-600 border-blue-200" },
};

export function StatusBadge({ status }: { status: StatusPosse | StatusRetirada }) {
  const it = map[status];
  return (
    <Badge variant="outline" className={cn("font-medium", it.className)}>
      {it.label}
    </Badge>
  );
}
