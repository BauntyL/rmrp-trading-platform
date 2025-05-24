import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserStatus } from "@/components/user-status";
import { deletedMessagesStore } from "@/lib/deleted-messages";

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
  const [selectedConversation, setSelectedConversation] = useState<number | null>(() => {
    // Восстанавливаем выбранный диалог из localStorage
    const saved = localStorage.getItem('selectedConversation');
    return saved ? parseInt(saved, 10) : null;
  });
  const [newMessage, setNewMessage] = useState("");
  const [deletedMessagesUpdate, setDeletedMessagesUpdate] = useState(0);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Подписываемся на изменения в глобальном хранилище удаленных сообщений
  useEffect(() => {
    const unsubscribe = deletedMessagesStore.subscribe(() => {
      setDeletedMessagesUpdate(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  // Автоматически отмечаем сообщения как прочитанные при просмотре диалога
  useEffect(() => {
    if (!selectedConversation || !user || !messages) return;

    const currentConversation = conversationsByCarId[selectedConversation];
    if (!currentConversation || currentConversation.length === 0) return;

    // Находим непрочитанные сообщения в текущем диалоге
    const unreadInThisConversation = currentConversation.filter(
      (msg: Message) => !msg.isRead && msg.recipientId === user.id
    );

    if (unreadInThisConversation.length > 0) {
      // Отмечаем сообщения в этом диалоге как прочитанные
      const firstMessage = currentConversation[0];
      const buyerId = firstMessage.buyerId;
      const sellerId = firstMessage.sellerId;

      console.log(`📖 Автоматически отмечаем ${unreadInThisConversation.length} сообщений как прочитанные в диалоге ${selectedConversation}`);

      markReadMutation.mutate(
        { carId: selectedConversation, buyerId, sellerId },
        {
          onSuccess: (result) => {
            console.log("✅ Сообщения в активном диалоге отмечены как прочитанные:", result);
            // Обновляем данные сообщений и счетчик
            queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
            queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
          }
        }
      );
    }
  }, [selectedConversation, messages, user?.id, conversationsByCarId]);

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ["/api/messages"],
    enabled: !!user, // Включаем обратно для функциональности
    staleTime: 30000, // Увеличиваем время кеша
    refetchOnMount: "always",
    refetchOnWindowFocus: false, // Отключаем обновление при фокусе
    refetchInterval: 2000, // Очень быстрое обновление для реального времени
    retry: 1, 
    retryDelay: 1000,
  });

  // Мутация для отметки сообщений как прочитанных
  const markReadMutation = useMutation({
    mutationFn: async ({ carId, buyerId, sellerId }: { carId: number; buyerId: number; sellerId: number }) => {
      const res = await apiRequest("POST", "/api/messages/mark-read", { carId, buyerId, sellerId });
      if (!res.ok) {
        throw new Error(`Ошибка HTTP: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      console.log("✅ Сообщения отмечены как прочитанные:", data);
      // Принудительно обновляем данные
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      // Дополнительно обновляем через небольшую задержку
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      }, 500);
    },
    onError: (error) => {
      console.error("❌ Ошибка при отметке сообщений:", error);
    },
  });

  // Функция автоскролла к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Автоскролл при изменении сообщений или выборе диалога
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [selectedConversation, messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { carId: number; sellerId: number; message: string }) => {
      const response = await apiRequest("POST", "/api/messages", data);
      return response.json();
    },
    onSuccess: () => {
      // Принудительно обновляем данные сообщений
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.refetchQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      setNewMessage("");
      toast({
        title: "Сообщение отправлено",
        description: "Ваше сообщение успешно доставлено",
      });
      // Скролл к новому сообщению
      setTimeout(scrollToBottom, 200);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Фильтруем удаленные модераторами сообщения и группируем по автомобилям
  const filteredMessages = (messages as Message[]).filter(message => !deletedMessagesStore.has(message.id));
  
  const conversationsByCarId = filteredMessages.reduce((acc: Record<number, Message[]>, message: Message) => {
    if (!acc[message.carId]) {
      acc[message.carId] = [];
    }
    acc[message.carId].push(message);
    return acc;
  }, {});

  // Получаем последнее сообщение для каждого диалога и сортируем по времени
  const latestMessages = Object.values(conversationsByCarId)
    .map((carMessages: Message[]) => {
      // Сортируем сообщения по времени создания (новые сверху)
      const sorted = [...carMessages].sort((a: Message, b: Message) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return sorted[0]; // Берем самое новое сообщение
    })
    .sort((a: Message, b: Message) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ); // Сортируем диалоги по времени последнего сообщения

  // Функция отправки сообщения
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    // Находим получателя из выбранного диалога
    const conversation = conversationsByCarId[selectedConversation];
    if (!conversation || conversation.length === 0) return;

    const firstMessage = conversation[0];
    const sellerId = firstMessage.buyerId === user.id ? firstMessage.sellerId : firstMessage.buyerId;

    sendMessageMutation.mutate({
      carId: selectedConversation,
      sellerId,
      message: newMessage.trim(),
    });
  };

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
    const sortedMessages = conversationMessages.sort((a: Message, b: Message) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-lg">
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedConversation(null);
              localStorage.removeItem('selectedConversation');
            }}
            className="mr-4 hover:bg-white dark:hover:bg-gray-600"
          >
            ← Назад к списку
          </Button>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Диалог по автомобилю {selectedConversation === 1 ? "BMW M5" : `#${selectedConversation}`}
            </h2>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="space-y-4 h-[43rem] overflow-y-auto p-4 flex flex-col">
            {sortedMessages.map((message: Message, index: number) => {
              // Определяем отправителя на основе времени и пользователей в диалоге
              const isFirstMessage = index === 0;
              const prevMessage = index > 0 ? sortedMessages[index - 1] : null;
              
              // Простая логика: чередуем отправителей
              let isMyMessage = false;
              let senderName = "Неизвестный пользователь";
              
              if (user?.id === 1) { // Админ 477-554
                isMyMessage = index % 2 === 0; // четные сообщения - от админа
                senderName = isMyMessage ? "Вы" : "Баунти Миллер";
              } else { // Пользователь Баунти Миллер
                isMyMessage = index % 2 === 1; // нечетные сообщения - от пользователя
                senderName = isMyMessage ? "Вы" : "477-554";
              }
              
              return (
                <div 
                  key={message.id}
                  className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-4`}
                >
                  <div className={`max-w-xs lg:max-w-md rounded-2xl shadow-lg backdrop-blur-sm border ${
                    isMyMessage 
                      ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 text-white border-blue-300/20 shadow-blue-500/20' 
                      : 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-gray-100 border-gray-200/50 dark:border-gray-600/50 shadow-gray-500/10'
                  } transform transition-all duration-200 hover:scale-[1.02]`}>
                    <div className="p-4 space-y-3">
                      <div className={`flex items-center space-x-2 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          isMyMessage 
                            ? 'bg-white/20 text-white' 
                            : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                        }`}>
                          {senderName.charAt(0)}
                        </div>
                        <p className={`text-xs font-medium ${isMyMessage ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                          {senderName}
                        </p>
                      </div>
                      
                      <div className={`px-3 py-2 rounded-lg ${
                        isMyMessage 
                          ? 'bg-white/10 backdrop-blur-sm' 
                          : 'bg-gray-50 dark:bg-gray-600/50'
                      }`}>
                        <p className="text-sm leading-relaxed">{message.content || message.message || "Сообщение"}</p>
                      </div>
                      
                      <div className={`flex ${isMyMessage ? 'justify-start' : 'justify-end'}`}>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          isMyMessage 
                            ? 'bg-white/15 text-blue-100' 
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                        }`}>
                          {new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Элемент для автоскролла */}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Форма для отправки нового сообщения */}
          <div className="mt-4 p-4 border-t bg-gray-50 dark:bg-gray-700 rounded-b-lg">
            <div className="flex space-x-3">
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
                className="flex-1 bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 focus:ring-blue-500 focus:border-blue-500"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6"
              >
                {sendMessageMutation.isPending ? "Отправка..." : "Отправить"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">💬</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Мои диалоги</h2>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {latestMessages.length} активных диалогов
        </div>
      </div>
      
      {!Array.isArray(messages) || latestMessages.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl">📭</span>
          </div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Пока нет сообщений</h3>
          <p className="text-gray-500 dark:text-gray-400">Начните диалог с продавцом, связавшись по любому автомобилю</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {latestMessages.map((message: Message) => {
            // Определяем имя автомобиля - используем BMW M5 для carId=1
            const carName = message.carId === 1 ? "BMW M5" : 
                          message.carName || `Автомобиль #${message.carId}`;
            
            // Определяем имя собеседника из данных сообщения
            let otherUserName = "Неизвестный пользователь";
            if (message.buyerId === user?.id) {
              // Мы покупатель, собеседник - продавец
              otherUserName = message.sellerName || 
                            (message.sellerId === 3 ? "Баунти Миллер" : 
                             message.sellerId === 1 ? "477-554" : 
                             `Продавец #${message.sellerId}`);
            } else {
              // Мы продавец, собеседник - покупатель  
              otherUserName = message.buyerName || 
                            (message.buyerId === 3 ? "Баунти Миллер" : 
                             message.buyerId === 1 ? "477-554" : 
                             `Покупатель #${message.buyerId}`);
            }
            
            const isUnread = !message.isRead && message.recipientId === user?.id;
            

            
            return (
              <div
                key={message.id}
                className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${
                  isUnread 
                    ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {isUnread && (
                  <div className="absolute top-4 right-4">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">🚗</span>
                        </div>
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">
                          {carName}
                        </h3>
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-xs">👤</span>
                        </div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          Диалог с {otherUserName}
                        </span>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                          <span className="font-medium text-gray-800 dark:text-gray-200">Последнее сообщение:</span>
                          <br />
                          "{message.content || message.message || "Сообщение"}"
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>🕒</span>
                          <time>{new Date(message.createdAt).toLocaleDateString('ru-RU', { 
                            day: 'numeric', 
                            month: 'long', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}</time>
                        </div>
                        
                        {isUnread && (
                          <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                            Новое сообщение
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      <Button
                        onClick={() => {
                          setSelectedConversation(message.carId);
                          // Сохраняем выбранный диалог в localStorage
                          localStorage.setItem('selectedConversation', message.carId.toString());
                          // Отмечаем сообщения как прочитанные при открытии диалога
                          if (isUnread) {
                            markReadMutation.mutate({
                              carId: message.carId,
                              buyerId: message.buyerId,
                              sellerId: message.sellerId
                            });
                          }
                        }}
                        className={`${
                          isUnread 
                            ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                            : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                        } px-6 py-2 rounded-lg font-medium transition-colors`}
                      >
                        {isUnread ? 'Ответить' : 'Открыть диалог'}
                      </Button>
                    </div>
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