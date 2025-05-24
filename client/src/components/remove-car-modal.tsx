import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Car } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface RemoveCarModalProps {
  car: Car | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RemoveCarModal({ car, open, onOpenChange }: RemoveCarModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const removeCarMutation = useMutation({
    mutationFn: async (carId: number) => {
      console.log("🚀 Используем WebSocket для удаления автомобиля ID:", carId);
      
      return new Promise((resolve, reject) => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
          console.log("🔌 WebSocket соединение для удаления установлено");
          
          // Сначала аутентифицируемся
          socket.send(JSON.stringify({
            type: "authenticate",
            userId: user?.id
          }));
          
          // Затем отправляем команду удаления через небольшую задержку
          setTimeout(() => {
            console.log("📤 Отправляем команду DELETE_CAR");
            socket.send(JSON.stringify({
              type: "DELETE_CAR",
              carId: carId
            }));
          }, 100);
        };
        
        socket.onmessage = (event) => {
          try {
            const response = JSON.parse(event.data);
            console.log("📨 Получен ответ через WebSocket:", response);
            
            if (response.type === "DELETE_CAR_SUCCESS") {
              console.log("✅ Автомобиль успешно удален через WebSocket");
              socket.close();
              resolve(response);
            } else if (response.type === "DELETE_CAR_ERROR") {
              console.log("❌ Ошибка удаления через WebSocket:", response.message);
              socket.close();
              reject(new Error(response.message));
            }
          } catch (error) {
            console.log("❌ Ошибка парсинга WebSocket ответа:", error);
            socket.close();
            reject(error);
          }
        };
        
        socket.onerror = (error) => {
          console.log("❌ Ошибка WebSocket соединения:", error);
          socket.close();
          reject(new Error("Ошибка WebSocket соединения"));
        };
        
        // Таймаут для предотвращения зависания
        setTimeout(() => {
          if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
            socket.close();
            reject(new Error("Таймаут операции удаления"));
          }
        }, 10000);
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Успешно",
        description: data.message || "Автомобиль снят с продажи",
      });
      
      // Обновляем все связанные кеши
      queryClient.invalidateQueries({ queryKey: ["/api/my-cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      
      // Закрываем модал и сбрасываем состояние
      onOpenChange(false);
      setConfirmText("");
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось снять автомобиль с продажи",
        variant: "destructive",
      });
    },
  });

  const handleRemove = () => {
    console.log("🔴 handleRemove вызвана");
    console.log("🔴 car:", car);
    console.log("🔴 confirmText:", confirmText);
    
    if (!car || confirmText.toLowerCase() !== "удалить") {
      console.log("🔴 Условие не выполнено, выходим");
      return;
    }
    
    console.log("🔴 Запускаем мутацию для автомобиля ID:", car.id);
    removeCarMutation.mutate(car.id);
  };

  const handleClose = () => {
    if (!removeCarMutation.isPending) {
      onOpenChange(false);
      setConfirmText("");
    }
  };

  if (!car) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Снять с продажи
          </DialogTitle>
          <DialogDescription className="text-left space-y-3">
            <div>
              Вы действительно хотите снять автомобиль <strong>"{car.name}"</strong> с продажи?
            </div>
            
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="text-red-800 dark:text-red-200 text-sm font-medium mb-2">
                ⚠️ Это действие необратимо и приведет к:
              </div>
              <ul className="text-red-700 dark:text-red-300 text-sm space-y-1 list-disc list-inside">
                <li>Полному удалению объявления</li>
                <li>Удалению всех диалогов с покупателями</li>
                <li>Удалению из избранного всех пользователей</li>
                <li>Потере всей истории общения</li>
              </ul>
            </div>
            
            <div>
              Для подтверждения введите слово <strong>"удалить"</strong> в поле ниже:
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirm">Подтверждение</Label>
          <Input
            id="confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Введите 'удалить'"
            disabled={removeCarMutation.isPending}
            className="text-center"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={removeCarMutation.isPending}
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={
              removeCarMutation.isPending || 
              confirmText.toLowerCase() !== "удалить"
            }
          >
            {removeCarMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Удаление...
              </>
            ) : (
              "Снять с продажи"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}