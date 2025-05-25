import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

interface UserStatus {
  isOnline: boolean;
  lastSeen: Date;
}

interface UserStatusProps {
  userId: number;
  showText?: boolean;
  className?: string;
}

export function UserStatus({ userId, showText = false, className = "" }: UserStatusProps) {
  const { user } = useAuth();
  const [userStatuses, setUserStatuses] = useState<{ [key: number]: UserStatus }>({});

  // Получаем начальные статусы пользователей
  const { data: statusData } = useQuery<{ [key: number]: UserStatus }>({
    queryKey: ["/api/users/status"],
    enabled: !!user,
    refetchInterval: 30000, // обновляем каждые 30 секунд
  });

  // Подключаемся к WebSocket для real-time обновлений статуса
  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      // Аутентифицируемся
      socket.send(JSON.stringify({
        type: 'authenticate',
        userId: user.id
      }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'user_status_update') {
          const { userId: updatedUserId, isOnline, lastSeen } = message.data;
          setUserStatuses(prev => ({
            ...prev,
            [updatedUserId]: {
              isOnline,
              lastSeen: new Date(lastSeen)
            }
          }));
        }
      } catch (error) {
        console.error('Ошибка обработки WebSocket сообщения:', error);
      }
    };

    socket.onclose = () => {
      console.log('📡 WebSocket соединение закрыто');
    };

    socket.onerror = (error) => {
      console.error('📡 WebSocket ошибка:', error);
    };

    return () => {
      socket.close();
    };
  }, [user]);

  // Обновляем состояние при получении данных с сервера
  useEffect(() => {
    if (statusData) {
      setUserStatuses(prev => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(statusData).map(([id, status]) => [
            parseInt(id),
            {
              ...status,
              lastSeen: new Date(status.lastSeen)
            }
          ])
        )
      }));
    }
  }, [statusData]);

  const status = userStatuses[userId];
  const isOnline = status?.isOnline || false;

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "только что";
    if (diffMinutes < 60) return `${diffMinutes} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return lastSeen.toLocaleDateString('ru-RU');
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${
        isOnline 
          ? "bg-green-500 animate-pulse" 
          : "bg-gray-400 dark:bg-gray-600"
      }`} />
      
      {showText && (
        <span className={`text-xs ${
          isOnline 
            ? "text-green-600 dark:text-green-400" 
            : "text-gray-500 dark:text-gray-400"
        }`}>
          {isOnline 
            ? "онлайн" 
            : status?.lastSeen 
              ? `был(а) ${formatLastSeen(status.lastSeen)}`
              : "оффлайн"
          }
        </span>
      )}
    </div>
  );
}