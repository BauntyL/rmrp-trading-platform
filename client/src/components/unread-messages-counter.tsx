import { Badge } from "@/components/ui/badge";
import { useUnreadMessageCount } from "@/hooks/use-messages";
import { Loader2 } from "lucide-react";

export function UnreadMessagesCounter() {
  const { data: unreadData, isLoading, isError } = useUnreadMessageCount();
  
  const unreadCount = unreadData?.count || 0;

  // Показываем индикатор загрузки
  if (isLoading) {
    return (
      <div className="ml-auto">
        <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
      </div>
    );
  }

  // Не показываем ничего при ошибке или если нет непрочитанных
  if (isError || unreadCount === 0) {
    return null;
  }

  return (
    <Badge className="ml-auto bg-red-500 text-white hover:bg-red-600 text-xs min-w-[20px] h-5 flex items-center justify-center p-0">
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  );
}
