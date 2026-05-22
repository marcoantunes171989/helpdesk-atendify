import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ElementType;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ 
  title = "Nenhum registro encontrado", 
  description = "Não encontramos dados para exibir aqui no momento.", 
  icon: Icon = Inbox,
  action
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-muted/5 rounded-3xl border border-dashed border-border/60 animate-in fade-in duration-500">
      <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h3 className="text-lg font-bold tracking-tight mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} variant="outline" className="rounded-xl px-6">
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = "Ops! Algo deu errado", 
  description = "Houve um erro ao carregar os dados do servidor. Por favor, tente novamente.", 
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-destructive/5 rounded-3xl border border-dashed border-destructive/20 animate-in fade-in duration-500">
      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-bold tracking-tight text-destructive mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
        {description}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="destructive" className="rounded-xl px-6 shadow-lg shadow-destructive/20">
          Tentar Novamente
        </Button>
      )}
    </div>
  );
}
