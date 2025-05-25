import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle } from "lucide-react";
import { playNotificationSound } from "./notification-sound";

interface NotificationMessage {
  type: "new_message";
  data: {
    carId: number;
    carName: string;
    senderName: string;
    message: string;
  };
}

export function NotificationSystem() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;

    // Устанавливаем WebSocket соединение
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("📡 WebSocket соединение установлено");
        ws.send(JSON.stringify({ type: "authenticate", userId: user.id }));
        
        // Сохраняем WebSocket глобально для использования в других компонентах
        (window as any).globalWebSocket = ws;
      };

      ws.onmessage = (event) => {
        try {
          const notification: NotificationMessage = JSON.parse(event.data);
          
          if (notification.type === "new_message") {
            const { carName, senderName, message } = notification.data;
            
            // Показываем push-уведомление
            toast({
              title: `💬 Новое сообщение от ${senderName}`,
              description: `По автомобилю "${carName}": ${message.substring(0, 50)}${message.length > 50 ? "..." : ""}`,
              duration: 8000,
              action: (
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-4 w-4 text-blue-400" />
                  <span className="text-sm">Перейти к сообщениям</span>
                </div>
              ),
            });

            // Воспроизводим звук уведомления
            try {
              playNotificationSound();
            } catch (error) {
              // Игнорируем ошибки воспроизведения звука
            }

            // Показываем браузерное уведомление (если разрешено)
            if (Notification.permission === "granted") {
              new Notification(`Новое сообщение от ${senderName}`, {
                body: `По автомобилю "${carName}": ${message.substring(0, 100)}`,
                icon: "/favicon.ico",
                tag: "new-message",
              });
            }
          }
        } catch (error) {
          console.error("Ошибка обработки WebSocket сообщения:", error);
        }
      };

      ws.onclose = () => {
        console.log("📡 WebSocket соединение закрыто");
      };

      ws.onerror = (error) => {
        console.error("Ошибка WebSocket:", error);
      };

      setSocket(ws);

      return () => {
        ws.close();
      };
    } catch (error) {
      console.error("Не удалось установить WebSocket соединение:", error);
    }
  }, [user, toast]);

  // Запрашиваем разрешение на показ уведомлений
  useEffect(() => {
    if (user && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("✅ Разрешение на уведомления получено");
        }
      });
    }
  }, [user]);

  return null; // Компонент не рендерит UI
}