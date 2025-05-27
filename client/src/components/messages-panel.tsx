import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  Send, 
  ArrowLeft, 
  Car,
  Clock,
  Loader2
} from "lucide-react";
import { useChats, useChatMessages, useSendMessage } from "@/hooks/use-messages";

export function MessagesPanel() {
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Используем оптимизированные хуки
  const { data: chats = [], isLoading: isChatsLoading, isError: isChatsError } = useChats();
  const { data: messages = [], isLoading: isMessagesLoading } = useChatMessages(selectedChat?.id);
  const sendMessageMutation = useSendMessage();

  // Автоскролл к последнему сообщению
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChat) return;

    const messageData = {
      chatId: selectedChat.id,
      content: messageInput.trim(),
    };

    try {
      await sendMessageMutation.mutateAsync(messageData);
      setMessageInput("");
    } catch (error) {
      // Ошибка обрабатывается в хуке
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return "Только что";
      if (diffInMinutes < 60) return `${diffInMinutes} мин назад`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ч назад`;
      
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return "Недавно";
    }
  };

  if (isChatsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Сообщения</h1>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isChatsError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Сообщения</h1>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="text-center text-slate-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Ошибка загрузки сообщений</p>
              <p className="text-sm mt-1">Проверьте подключение к интернету</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Сообщения</h1>
        {selectedChat && (
          <Button
            variant="outline"
            onClick={() => setSelectedChat(null)}
            className="md:hidden bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Список чатов */}
        <Card className={`bg-slate-800 border-slate-700 ${selectedChat ? 'hidden lg:block' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <MessageSquare className="h-5 w-5" />
              <span>Чаты</span>
              {chats.length > 0 && (
                <Badge variant="outline" className="border-slate-600 text-slate-400">
                  {chats.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {chats.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Нет активных чатов</p>
                  <p className="text-sm mt-1">Начните переписку, написав продавцу</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {chats.map((chat: any) => {
                    // ✅ БЕЗОПАСНАЯ ПРОВЕРКА ЧАТА
                    if (!chat || typeof chat !== 'object') {
                      console.warn('Invalid chat object:', chat);
                      return null;
                    }

                    const chatId = chat.id || Math.random();
                    const sellerName = chat.sellerName || chat.otherUserName || 'Неизвестный пользователь';
                    const carName = chat.carName || 'Автомобиль';
                    const lastMessage = chat.lastMessage || 'Нет сообщений';
                    const unreadCount = chat.unreadCount || 0;
                    const lastMessageTime = chat.lastMessageTime || chat.lastMessage?.createdAt;

                    return (
                      <button
                        key={chatId}
                        onClick={() => setSelectedChat(chat)}
                        className={`w-full p-4 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 ${
                          selectedChat?.id === chat.id ? 'bg-slate-700' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-10 w-10 bg-emerald-600">
                            <AvatarFallback className="bg-emerald-600 text-white">
                              {sellerName[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-white font-medium text-sm truncate">
                                {sellerName}
                              </h3>
                              {unreadCount > 0 && (
                                <Badge className="bg-red-500 text-white text-xs ml-2">
                                  {unreadCount > 99 ? '99+' : unreadCount}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-1 mb-1">
                              <Car className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400 text-xs truncate">
                                {carName}
                              </span>
                            </div>
                            
                            <p className="text-slate-400 text-xs truncate">
                              {typeof lastMessage === 'string' ? lastMessage : lastMessage?.content || 'Нет сообщений'}
                            </p>
                            
                            {lastMessageTime && (
                              <div className="flex items-center space-x-1 mt-1">
                                <Clock className="h-3 w-3 text-slate-500" />
                                <span className="text-slate-500 text-xs">
                                  {formatTime(lastMessageTime)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Область сообщений */}
        <Card className={`bg-slate-800 border-slate-700 lg:col-span-2 ${!selectedChat ? 'hidden lg:block' : ''}`}>
          {!selectedChat ? (
            <CardContent className="p-6 h-full flex items-center justify-center">
              <div className="text-center text-slate-400">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-white mb-2">Выберите чат</h3>
                <p>Выберите диалог из списка слева для просмотра сообщений</p>
              </div>
            </CardContent>
          ) : (
            <>
              {/* Заголовок чата */}
              <CardHeader className="border-b border-slate-700">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10 bg-emerald-600">
                    <AvatarFallback className="bg-emerald-600 text-white">
                      {(selectedChat.sellerName || selectedChat.otherUserName || '?')[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-white font-medium">
                      {selectedChat.sellerName || selectedChat.otherUserName || 'Неизвестный пользователь'}
                    </h3>
                    <div className="flex items-center space-x-1">
                      <Car className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400 text-sm">
                        {selectedChat.carName || 'Автомобиль'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Сообщения */}
              <CardContent className="p-0 flex flex-col h-[450px]">
                <ScrollArea className="flex-1 p-4">
                  {isMessagesLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Нет сообщений в этом чате</p>
                      <p className="text-sm mt-1">Начните переписку!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message: any) => {
                        // ✅ БЕЗОПАСНАЯ ПРОВЕРКА СООБЩЕНИЯ
                        if (!message || typeof message !== 'object') {
                          console.warn('Invalid message object:', message);
                          return null;
                        }

                        const messageContent = typeof message === 'string' ? message : (message.content || '');
                        const messageId = message.id || Math.random();
                        const senderId = message.senderId;
                        const createdAt = message.createdAt || new Date().toISOString();

                        return (
                          <div
                            key={messageId}
                            className={`flex ${
                              senderId === selectedChat.buyerId ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg px-3 py-2 ${
                                senderId === selectedChat.buyerId
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-700 text-white'
                              }`}
                            >
                              <p className="text-sm break-words">
                                {messageContent || 'Сообщение недоступно'}
                              </p>
                              <p className={`text-xs mt-1 ${
                                senderId === selectedChat.buyerId 
                                  ? 'text-emerald-100' 
                                  : 'text-slate-400'
                              }`}>
                                {formatTime(createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Форма отправки */}
                <div className="p-4 border-t border-slate-700">
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Введите сообщение..."
                      maxLength={500}
                      className="flex-1 bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-emerald-500"
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button
                      type="submit"
                      disabled={!messageInput.trim() || sendMessageMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                  
                  <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                    <span>{messageInput.length}/500</span>
                    {sendMessageMutation.isError && (
                      <span className="text-red-400">
                        Ошибка отправки сообщения
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
