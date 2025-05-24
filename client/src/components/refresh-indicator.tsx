import { useIsFetching } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function RefreshIndicator() {
  const isFetching = useIsFetching();
  
  if (!isFetching) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-background/80 backdrop-blur-sm border rounded-lg px-3 py-2 text-sm text-muted-foreground shadow-lg">
      <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
      <span>Обновление данных...</span>
    </div>
  );
}