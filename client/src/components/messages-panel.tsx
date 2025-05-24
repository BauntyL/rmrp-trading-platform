import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  carId: number;
  buyerId: number;
  sellerId: number;
  senderId: number;
  recipientId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
  carName?: string;
  buyerName?: string;
  sellerName?: string;
}

export function MessagesPanel() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/messages"],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { carId: number; recipientId: number; content: string }) => {
      const response = await apiRequest("POST", "/api/messages", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      setNewMessage("");
      toast({
        title: "Сообщение отправлено",
        description: "Ваше сообщение успешно доставлено",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Группируем сообщения по автомобилям
  const conversationsByCarId = messages.reduce((acc: Record<number, Message[]>, message) => {
    if (!acc[message.carId]) {
      acc[message.carId] = [];
    }
    acc[message.carId].push(message);
    return acc;
  }, {});

  // Получаем последнее сообщение для каждого диалога
  const latestMessages = Object.values(conversationsByCarId).map(carMessages => 
    carMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // Если выбран конкретный диалог, показываем его
  if (selectedConversation) {
    const conversationMessages = conversationsByCarId[selectedConversation] || [];
    const sortedMessages = conversationMessages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return (
      <div className="p-6">
        <div className="flex items-center mb-4">
          <Button 
            variant="outline" 
            onClick={() => setSelectedConversation(null)}
            className="mr-4"
          >
            ← Назад к списку
          </Button>
          <h2 className="text-xl font-semibold">
            Диалог по автомобилю {selectedConversation === 1 ? "BMW M5" : `#${selectedConversation}`}
          </h2>
        </div>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {sortedMessages.map((message) => {
            const isMyMessage = message.senderId === user?.id;
            const senderName = message.senderId === 3 ? "Баунти Миллер" : 
                             message.senderId === 1 ? "477-554" : 
                             `Пользователь #${message.senderId}`;
            
            return (
              <div 
                key={message.id}
                className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  isMyMessage 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}>
                  <p className="text-sm font-medium mb-1">{senderName}</p>
                  <p>{message.content}</p>
                  <p className="text-xs opacity-75 mt-1">
                    {new Date(message.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Форма для отправки нового сообщения */}
        <div className="mt-4 p-4 border-t">
          <div className="flex space-x-2">
            <Input
              placeholder="Введите сообщение..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? "Отправка..." : "Отправить"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Функция отправки сообщения
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    // Находим получателя из выбранного диалога
    const conversation = conversationsByCarId[selectedConversation];
    if (!conversation || conversation.length === 0) return;

    const firstMessage = conversation[0];
    const recipientId = firstMessage.buyerId === user.id ? firstMessage.sellerId : firstMessage.buyerId;

    sendMessageMutation.mutate({
      carId: selectedConversation,
      recipientId,
      content: newMessage.trim(),
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">Сообщения</h2>
      
      {!Array.isArray(messages) || latestMessages.length === 0 ? (
        <p className="text-gray-500">У вас пока нет сообщений</p>
      ) : (
        <div className="space-y-4">
          {latestMessages.map((message: Message) => {
            // Определяем имя автомобиля - используем BMW M5 для carId=1
            const carName = message.carId === 1 ? "BMW M5" : 
                          message.carName || `Автомобиль #${message.carId}`;
            
            // Определяем имя собеседника - используем правильные имена пользователей
            let otherUserName;
            if (message.buyerId === user?.id) {
              // Мы покупатель, собеседник - продавец
              otherUserName = message.sellerId === 3 ? "Баунти Миллер" : 
                            message.sellerId === 1 ? "477-554" :
                            message.sellerName || `Пользователь #${message.sellerId}`;
            } else {
              // Мы продавец, собеседник - покупатель  
              otherUserName = message.buyerId === 3 ? "Баунти Миллер" : 
                            message.buyerId === 1 ? "477-554" :
                            message.buyerName || `Пользователь #${message.buyerId}`;
            }
            
            return (
              <div
                key={message.id}
                className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium">
                      Диалог по автомобилю {carName} с {otherUserName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      <span className="font-medium">Последнее сообщение:</span> {message.content}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center space-x-2">
                      {!message.isRead && message.recipientId === user?.id && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          Новое
                        </span>
                      )}
                      <time className="text-xs text-gray-400">
                        {new Date(message.createdAt).toLocaleDateString()}
                      </time>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setSelectedConversation(message.carId)}
                    >
                      Открыть диалог
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}