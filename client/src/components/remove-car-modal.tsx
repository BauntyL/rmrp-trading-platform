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
import { queryClient, apiRequest } from "@/lib/queryClient";
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
      console.log("🚀 Удаляем автомобиль ID:", carId);
      await apiRequest("DELETE", `/api/my-cars/${carId}`);
    },
    onSuccess: (data) => {
      console.log("✅ Мутация успешна, обновляем кеши");
      
      toast({
        title: "Успешно",
        description: "Автомобиль успешно снят с продажи",
      });
      
      // Принудительно обновляем все кеши
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      
      // Принудительно рефетчим данные
      queryClient.refetchQueries({ queryKey: ["/api/cars"] });
      queryClient.refetchQueries({ queryKey: ["/api/my-cars"] });
      
      console.log("🔄 Кеши обновлены, закрываем модал");
      
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