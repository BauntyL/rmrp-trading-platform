import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Car } from "@shared/schema";
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
  car: Car | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactSellerModal({ car, open, onOpenChange }: ContactSellerModalProps) {
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { carId: number; sellerId: number; message: string }) => {
      try {
        console.log('📤 Sending message:', data);
        
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
        
        console.log('📨 Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Ошибка отправки сообщения');
        }

        const result = await response.json();
        console.log('✅ Message sent successfully:', result);
        return result;
      } catch (error) {
        console.error("❌ Error sending message:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Сообщение отправлено",
        description: "Ваше сообщение успешно отправлено продавцу",
      });
      setMessage("");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Не удалось отправить сообщение";
      
      if (errorMessage.includes("заблокировано")) {
        toast({
          title: "🚫 Сообщение заблокировано",
          description: errorMessage,
          variant: "destructive",
        });
      } else if (errorMessage.includes("Authentication required")) {
        toast({
          title: "Ошибка авторизации",
          description: "Необходимо войти в систему для отправки сообщений",
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
    
    sendMessageMutation.mutate({
      carId: car.id,
      sellerId: car.createdBy,
      message: message.trim(),
    });
  };

  if (!car) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Написать продавцу
          </DialogTitle>
          <DialogDescription>
            Отправьте сообщение по поводу автомобиля "{car.name}"
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Ваше сообщение</Label>
            <Textarea
              id="message"
              placeholder="Здравствуйте! Меня интересует ваш автомобиль..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
              className="resize-none"
            />
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-2">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ <strong>Правила общения:</strong> Запрещены мат, политика, межнациональная рознь, ссылки и контакты. Максимум 500 символов.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="gap-2"
            >
              {sendMessageMutation.isPending ? (
                "Отправка..."
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
