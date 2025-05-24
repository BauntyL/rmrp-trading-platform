import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

export function UnreadMessagesCounter() {
  const [lastCount, setLastCount] = useState(0);
  const [showAnimation, setShowAnimation] = useState(false);

  const { data: unreadData } = useQuery({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 10000, // Обновляем каждые 10 секунд
    refetchOnWindowFocus: true,
  });

  const unreadCount = unreadData?.count || 0;

  // Анимация и звуковое уведомление при новых сообщениях
  useEffect(() => {
    if (unreadCount > lastCount && lastCount > 0) {
      // Показываем анимацию
      setShowAnimation(true);
      setTimeout(() => setShowAnimation(false), 2000);

      // Воспроизводим звук уведомления
      try {
        const audio = new Audio('data:audio/wav;base64,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');
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Игнорируем ошибки воспроизведения (например, если браузер требует взаимодействия пользователя)
        });
      } catch (error) {
        // Игнорируем ошибки создания аудио
      }
    }
    setLastCount(unreadCount);
  }, [unreadCount, lastCount]);

  if (unreadCount === 0) {
    return null;
  }

  return (
    <Badge 
      className={`ml-auto bg-red-500 text-white text-xs px-2 py-1 transition-all duration-500 ${
        showAnimation ? "animate-pulse scale-110" : ""
      }`}
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </Badge>
  );
}