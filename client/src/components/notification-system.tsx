import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle } from "lucide-react";

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
              const audio = new Audio('data:audio/wav;base64,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');
              audio.volume = 0.4;
              audio.play().catch(() => {
                // Игнорируем ошибки воспроизведения
              });
            } catch (error) {
              // Игнорируем ошибки создания аудио
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