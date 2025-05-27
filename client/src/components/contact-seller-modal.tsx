import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, Send } from "lucide-react";

interface ContactSellerModalProps {
  car: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactSellerModal({ car, open, onOpenChange }: ContactSellerModalProps) {
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { carId: number; sellerId: number; message: string }) => {
      console.log('📤 Отправка сообщения через contact modal:', data);
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          carId: data.carId,
          sellerId: data.sellerId,
          message: data.message
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка отправки сообщения');
      }

      return response.json();
    },
    onSuccess: () => {
      // Обновляем все связанные кеши
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      
      toast({
        title: "Сообщение отправлено",
        description: "Ваше сообщение успешно отправлено продавцу",
      });
      setMessage("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Не удалось отправить сообщение";
      
      if (errorMessage.includes("prohibited") || errorMessage.includes("запрещенные")) {
        toast({
          title: "🚫 Сообщение заблокировано",
          description: "Сообщение содержит запрещенные слова или ссылки",
          variant: "destructive",
        });
      } else if (errorMessage.includes("Authentication") || errorMessage.includes("авторизац")) {
        toast({
          title: "Ошибка авторизации",
          description: "Необходимо войти в систему для отправки сообщений",
          variant: "destructive",
        });
      } else if (errorMessage.includes("too long")) {
        toast({
          title: "Сообщение слишком длинное",
          description: "Максимальная длина сообщения 500 символов",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Ошибка отправки",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!car || !message.trim()) return;
    
    if (message.length > 500) {
      toast({
        title: "Сообщение слишком длинное",
        description: "Максимальная длина сообщения 500 символов",
        variant: "destructive",
      });
      return;
    }
    
    sendMessageMutation.mutate({
      carId: car.id,
      sellerId: car.owner_id || car.createdBy,
      message: message.trim(),
    });
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 500) {
      setMessage(value);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setMessage("");
    }
    onOpenChange(open);
  };

  if (!car) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <MessageCircle className="h-5 w-5" />
            Написать продавцу
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Отправьте сообщение по поводу автомобиля "{car.name}"
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message" className="text-slate-300">Ваше сообщение</Label>
            <Textarea
              id="message"
              placeholder="Здравствуйте! Меня интересует ваш автомобиль..."
              value={message}
              onChange={handleMessageChange}
              rows={5}
              required
              className="resize-none bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-500">
                {message.length}/500 символов
              </p>
              {message.length > 450 && (
                <p className="text-xs text-amber-400">
                  Осталось {500 - message.length} символов
                </p>
              )}
            </div>
            
            <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-3 mt-2">
              <p className="text-sm text-amber-200">
                ⚠️ <strong>Правила общения:</strong> Запрещены ссылки, контакты, мат и оскорбления. Максимум 500 символов.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={!message.trim() || sendMessageMutation.isPending || message.length > 500}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {sendMessageMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Отправить
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
