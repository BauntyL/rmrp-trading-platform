import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Send, 
  User, 
  Car, 
  Clock
} from "lucide-react";

export function MessagesPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messageText, setMessageText] = useState("");

  const { data: chats = [], isLoading: chatsLoading } = useQuery({
    queryKey: ["/api/messages/chats"],
    queryFn: async () => {
      const response = await fetch('/api/messages/chats', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      
      return response.json();
    },
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/messages", selectedChat?.id],
    queryFn: async () => {
      if (!selectedChat?.id) return [];
      
      const response = await fetch(`/api/messages/${selectedChat.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      return response.json();
    },
    enabled: !!selectedChat?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, content }: { chatId: number; content: string }) => {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ chatId, content }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка отправки сообщения');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedChat?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/chats"] });
      setMessageText("");
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка отправки",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !selectedChat) {
      return;
    }
    
    sendMessageMutation.mutate({
      chatId: selectedChat.id,
      content: messageText.trim(),
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
  };

  const getOtherUserName = (chat: any) => {
    if (chat.buyerId === user?.id) {
      return chat.sellerName || 'Продавец';
    }
    return chat.buyerName || 'Покупатель';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Сообщения</h1>
        <p className="text-slate-400">Ваши диалоги с покупателями и продавцами</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
        {/* Список чатов */}
        <Card className="bg-slate-800 border-slate-700 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <MessageSquare className="h-5 w-5" />
              <span>Диалоги</span>
              {chats.length > 0 && (
                <Badge variant="outline">{chats.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[580px]">
              {chatsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-slate-700 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : chats.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Нет диалогов</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Диалоги появятся после общения с другими пользователями
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {chats.map((chat: any) => (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={`w-full p-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 ${
                        selectedChat?.id === chat.id ? 'bg-slate-700' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <Car className="h-4 w-4 text-blue-400 flex-shrink-0" />
                          <span className="text-white font-medium text-sm truncate">
                            {chat.carName || 'Автомобиль'}
                          </span>
                        </div>
                        {chat.unreadCount > 0 && (
                          <Badge className="bg-red-500 text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                            {chat.unreadCount}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="h-3 w-3 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-300 text-xs truncate">
                          {getOtherUserName(chat)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-xs truncate flex-1">
                          {chat.lastMessage || 'Нет сообщений'}
                        </span>
                        <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                          <Clock className="h-3 w-3 text-slate-500" />
                          <span className="text-slate-500 text-xs">
                            {formatDate(chat.lastMessageTime)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Область сообщений */}
        <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <MessageSquare className="h-5 w-5" />
              <span>
                {selectedChat ? getOtherUserName(selectedChat) : 'Выберите диалог'}
              </span>
            </CardTitle>
            {selectedChat && (
              <p className="text-sm text-slate-400">
                {selectedChat.carName}
              </p>
            )}
          </CardHeader>
          
          <CardContent className="p-0 flex flex-col h-[580px]">
            {!selectedChat ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Выберите диалог</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Выберите диалог из списка слева для просмотра сообщений
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Сообщения */}
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-12 bg-slate-700 rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <p>Начните разговор!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message: any) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.senderId === user?.id ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              message.senderId === user?.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-100'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {formatDate(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Форма отправки */}
                <div className="border-t border-slate-700 p-4">
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Введите сообщение..."
                      className="flex-1 bg-slate-700 border-slate-600 text-white"
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button
                      type="submit"
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
