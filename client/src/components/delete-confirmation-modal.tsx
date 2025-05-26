import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  car: any;
}

export function DeleteConfirmationModal({ open, onOpenChange, car }: DeleteConfirmationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState("");

  const deleteCarMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/cars/${car.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка удаления');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars/my"] });
      
      toast({
        title: "Автомобиль удален",
        description: "Объявление и все связанные данные удалены",
      });
      
      setConfirmText("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (confirmText.toLowerCase() !== 'удалить') {
      toast({
        title: "Неверное подтверждение",
        description: "Введите слово 'удалить' для подтверждения",
        variant: "destructive",
      });
      return;
    }

    deleteCarMutation.mutate();
  };

  const handleClose = () => {
    setConfirmText("");
    onOpenChange(false);
  };

  if (!car) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span>Подтверждение удаления</span>
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Это действие нельзя отменить. Будут удалены:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Информация об удалении */}
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2">Будет удалено:</h3>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>• Объявление: {car.name}</li>
              <li>• Все фотографии автомобиля</li>
              <li>• Все диалоги и сообщения</li>
              <li>• История просмотров</li>
              <li>• Данные из избранного у других пользователей</li>
            </ul>
          </div>

          {/* Форма подтверждения */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">
                Для подтверждения введите слово: <span className="text-red-400 font-semibold">удалить</span>
              </Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="удалить"
                className="bg-slate-700 border-slate-600 text-white"
                autoComplete="off"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="flex-1 bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={confirmText.toLowerCase() !== 'удалить' || deleteCarMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {deleteCarMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Удаление...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить навсегда
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
