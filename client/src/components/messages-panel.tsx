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
  senderName?: string;
  receiverName?: string;
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

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ["/api/messages"],
    enabled: !!user,
    staleTime: 5000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchInterval: 2000, // Быстрое обновление для реального времени
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
      console.log('📤 Отправка сообщения:', data);
      
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
      
      console.log('📨 Статус ответа:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка отправки сообщения');
      }

      const result = await response.json();
      console.log('✅ Сообщение отправлено:', result);
      return result;
    },
    onSuccess: () => {
      // Принудительно обновляем данные сообщений
      queryClient.removeQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
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
      console.error('❌ Ошибка отправки сообщения:', error);
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

  // Автоматически отмечаем ВСЕ сообщения как прочитанные при открытии раздела "Сообщения"
  useEffect(() => {
    if (!user || !messages || markReadMutation.isPending) return;

    // Находим все непрочитанные сообщения для текущего пользователя
    const allUnreadMessages = (messages as Message[]).filter(
      (msg: Message) => !msg.isRead && msg.recipientId === user.id
    );

    if (allUnreadMessages.length > 0) {
      console.log(`📖 Автоматически отмечаем ${allUnreadMessages.length} сообщений как прочитанные при открытии раздела "Сообщения"`);

      // Группируем сообщения по диалогам и отмечаем каждый диалог
      const conversationsToMarkRead = new Map<number, { buyerId: number; sellerId: number }>();
      
      allUnreadMessages.forEach((msg: Message) => {
        if (!conversationsToMarkRead.has(msg.carId)) {
          conversationsToMarkRead.set(msg.carId, {
            buyerId: msg.buyerId,
            sellerId: msg.sellerId
          });
        }
      });

      // Отмечаем каждый диалог как прочитанный
      conversationsToMarkRead.forEach(({ buyerId, sellerId }, carId) => {
        markReadMutation.mutate(
          { carId, buyerId, sellerId },
          {
            onSuccess: (result) => {
              console.log(`✅ Диалог ${carId} отмечен как прочитанный:`, result);
              queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
            }
          }
        );
      });
    }
  }, [user?.id, messages?.length]); // Триггер при загрузке сообщений

  // Функция отправки сообщения
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    // Находим получателя из выбранного диалога
    const conversationMessages = conversationsByCarId[selectedConversation];
    if (!conversationMessages || conversationMessages.length === 0) return;

    const firstMessage = conversationMessages[0];
    
    // Определяем получателя (если текущий пользователь продавец, то получатель - покупатель, и наоборот)
    let sellerId: number;
    if (firstMessage.sellerId === user.id) {
      // Текущий пользователь - продавец, отправляем покупателю
      sellerId = firstMessage.buyerId;
    } else {
      // Текущий пользователь - покупатель, отправляем продавцу
      sellerId = firstMessage.sellerId;
    }

    sendMessageMutation.mutate({
      carId: selectedConversation,
      sellerId: sellerId,
      message: newMessage.trim(),
    });
  };

  // Обработка Enter для отправки сообщения
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Сохраняем выбранный диалог в localStorage
  useEffect(() => {
    if (selectedConversation) {
      localStorage.setItem('selectedConversation', selectedConversation.toString());
    }
  }, [selectedConversation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-400">Загрузка сообщений...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-lg">Ошибка загрузки сообщений</p>
        <p className="text-slate-500 text-sm mt-2">Попробуйте перезагрузить страницу</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Сообщения</h2>
        <UserStatus />
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 h-[600px] flex overflow-hidden">
        {/* Список диалогов */}
        <div className="w-1/3 border-r border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-semibold text-white">Диалоги</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {latestMessages.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-slate-400">Нет сообщений</p>
              </div>
            ) : (
              latestMessages.map((message: Message) => {
                // Определяем название диалога и имя собеседника
                const isFromCurrentUser = message.senderId === user?.id;
                const otherUserName = isFromCurrentUser ? message.receiverName : message.senderName;
                const carName = message.carName || `Автомобиль #${message.carId}`;
                
                // Проверяем есть ли непрочитанные сообщения в этом диалоге
                const conversationMessages = conversationsByCarId[message.carId];
                const hasUnreadMessages = conversationMessages?.some(
                  msg => !msg.isRead && msg.recipientId === user?.id
                );

                return (
                  <div
                    key={message.carId}
                    className={`p-4 border-b border-slate-700 cursor-pointer hover:bg-slate-700 transition-colors ${
                      selectedConversation === message.carId ? 'bg-slate-700' : ''
                    }`}
                    onClick={() => setSelectedConversation(message.carId)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate">{carName}</h4>
                        <p className="text-sm text-slate-400 truncate">
                          {otherUserName || 'Пользователь'}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-1">
                          {isFromCurrentUser ? 'Вы: ' : ''}{message.content}
                        </p>
                      </div>
                      <div className="flex flex-col items-end ml-2">
                        <span className="text-xs text-slate-500">
                          {new Date(message.createdAt).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </span>
                        {hasUnreadMessages && (
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-1"></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Область сообщений */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Заголовок диалога */}
              <div className="p-4 border-b border-slate-700">
                {(() => {
                  const conversationMessages = conversationsByCarId[selectedConversation];
                  if (!conversationMessages || conversationMessages.length === 0) {
                    return <h4 className="font-semibold text-white">Диалог</h4>;
                  }
                  
                  const firstMessage = conversationMessages[0];
                  const carName = firstMessage.carName || `Автомобиль #${selectedConversation}`;
                  const otherUserName = firstMessage.senderId === user?.id 
                    ? firstMessage.receiverName 
                    : firstMessage.senderName;
                  
                  return (
                    <div>
                      <h4 className="font-semibold text-white">{carName}</h4>
                      <p className="text-sm text-slate-400">
                        Диалог с {otherUserName || 'пользователем'}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Сообщения */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversationsByCarId[selectedConversation]?.
                  sort((a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map((message: Message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderId === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-slate-700 text-white'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                }
                <div ref={messagesEndRef} />
              </div>

              {/* Поле ввода */}
              <div className="p-4 border-t border-slate-700">
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Введите сообщение..."
                    className="flex-1 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    maxLength={500}
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {sendMessageMutation.isPending ? "..." : "Отправить"}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {newMessage.length}/500 символов
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-400">Выберите диалог для просмотра сообщений</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
