import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Send, 
  User, 
  Car, 
  Clock,
  Search
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function MessagesPanel() {
  const { user } = useAuth();
  const [selectedDialog, setSelectedDialog] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: dialogs = [], isLoading: dialogsLoading } = useQuery({
    queryKey: ["/api/messages"],
    refetchInterval: 2000,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/messages/dialog", selectedDialog?.id],
    queryFn: async () => {
      if (!selectedDialog?.id) return [];
      
      const response = await fetch(`/api/messages/dialog/${selectedDialog.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      return response.json();
    },
    enabled: !!selectedDialog?.id,
    refetchInterval: 1000,
  });

  const filteredDialogs = dialogs.filter((dialog: any) => {
    if (!searchTerm) return true;
    
    return dialog.carName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           dialog.otherUserName?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedDialog) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          carId: selectedDialog.carId,
          sellerId: selectedDialog.sellerId,
          message: newMessage.trim(),
        }),
      });

      if (response.ok) {
        setNewMessage("");
        // Обновление произойдет автоматически через refetchInterval
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} мин назад`;
    } else if (diffHours < 24) {
      return `${diffHours} ч назад`;
    } else {
      return date.toLocaleDateString('ru-RU');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Сообщения</h1>
        <p className="text-slate-400">Ваши диалоги с продавцами и покупателями</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Список диалогов */}
        <Card className="bg-slate-800 border-slate-700 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-white text-sm">
              <MessageSquare className="h-4 w-4" />
              <span>Диалоги ({filteredDialogs.length})</span>
            </CardTitle>
            
            {/* Поиск */}
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3 w-3 text-slate-400" />
              <Input
                placeholder="Поиск..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-8 bg-slate-700 border-slate-600 text-white text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[480px]">
              {dialogsLoading ? (
                <div className="p-3 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-12 bg-slate-700 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : filteredDialogs.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Нет диалогов</p>
                </div>
              ) : (
                <div>
                  {filteredDialogs.map((dialog: any) => (
                    <button
                      key={dialog.id}
                      onClick={() => setSelectedDialog(dialog)}
                      className={`w-full p-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 ${
                        selectedDialog?.id === dialog.id ? 'bg-slate-700' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2 min-w-0">
                          <Car className="h-3 w-3 text-blue-400 flex-shrink-0" />
                          <span className="text-white font-medium text-xs truncate">
                            {dialog.carName || 'Неизвестный автомобиль'}
                          </span>
                        </div>
                        {dialog.unreadCount > 0 && (
                          <Badge className="bg-red-500 text-xs px-1 py-0 text-[10px] min-w-[16px] h-4">
                            {dialog.unreadCount}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1 mb-1">
                        <User className="h-2 w-2 text-slate-400" />
                        <span className="text-slate-400 text-xs truncate">
                          {dialog.otherUserName}
                        </span>
                      </div>
                      
                      {dialog.lastMessage && (
                        <p className="text-slate-500 text-xs truncate mb-1">
                          {dialog.lastMessage}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-1">
                        <Clock className="h-2 w-2 text-slate-500" />
                        <span className="text-slate-500 text-[10px]">
                          {formatDate(dialog.lastMessageTime)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Чат */}
        <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm">
              {selectedDialog ? (
                <div className="flex items-center space-x-2">
                  <Car className="h-4 w-4 text-blue-400" />
                  <span>{selectedDialog.carName}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-400">{selectedDialog.otherUserName}</span>
                </div>
              ) : (
                'Выберите диалог'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col h-[500px]">
            {!selectedDialog ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Выберите диалог для просмотра сообщений</p>
                </div>
              </div>
            ) : (
              <>
                {/* Сообщения */}
                <ScrollArea className="flex-1 p-3">
                  {messagesLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-12 bg-slate-700 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                      <p className="text-sm">Нет сообщений</p>
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
                            className={`max-w-[70%] p-2 rounded-lg text-sm ${
                              message.senderId === user?.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            <p>{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.senderId === user?.id
                                ? 'text-blue-200'
                                : 'text-slate-500'
                            }`}>
                              {formatDate(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Отправка сообщения */}
                <div className="p-3 border-t border-slate-700">
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <Input
                      placeholder="Введите сообщение..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 bg-slate-700 border-slate-600 text-white text-sm"
                      maxLength={500}
                    />
                    <Button
                      type="submit"
                      disabled={!newMessage.trim()}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                  <p className="text-xs text-slate-500 mt-1">
                    {newMessage.length}/500 символов
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
