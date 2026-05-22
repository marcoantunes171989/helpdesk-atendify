import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CancelationNoticeProps {
  status: string;
  reason?: string;
  className?: string;
  isPrint?: boolean;
}

export const CancelationNotice = ({ status, reason, className, isPrint = false }: CancelationNoticeProps) => {
  if (status !== 'cancelada') return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-center">
        <Badge 
          variant="destructive" 
          className={cn(
            "uppercase font-black px-6 py-2 text-sm bg-red-600 text-white border-2 border-red-800",
            !isPrint && "animate-pulse"
          )}
        >
          VISITA CANCELADA
        </Badge>
      </div>
      
      {reason && (
        <div className={cn(
          "bg-red-50 border-2 border-red-200 p-3 rounded-lg",
          !isPrint && "no-print"
        )}>
          <p className="text-[10px] font-black text-red-700 uppercase mb-1">Motivo do Cancelamento:</p>
          <p className="text-[11px] font-bold text-red-900 italic line-clamp-3">"{reason}"</p>
        </div>
      )}
    </div>
  );
};
