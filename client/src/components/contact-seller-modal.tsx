import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
      const res = await apiRequest("POST", "/api/messages", data);
      return await res.json();
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
    onError: (error: Error) => {
      toast({
        title: "Ошибка отправки",
        description: error.message,
        variant: "destructive",
      });
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
            <p className="text-sm text-muted-foreground">
              Будьте вежливы и конкретны в своем сообщении
            </p>
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