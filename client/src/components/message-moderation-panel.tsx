import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Trash2, 
  User, 
  Car, 
  Calendar,
  AlertTriangle,
  Shield
} from "lucide-react";

export function MessageModerationPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/admin/messages"],
    refetchInterval: 10000, // Обновляем каждые 10 секунд
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await fetch(`/api/admin/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка удаления сообщения');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      toast({
        title: "Сообщение удалено",
        description: "Сообщение успешно удалено модератором",
      });
      setSelectedMessage(null);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteMessage = (message: any) => {
    if (window.confirm(`Удалить сообщение от ${message.sender_name}?\n\n"${message.content}"`)) {
      deleteMessageMutation.mutate(message.id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const checkSuspiciousContent = (content: string) => {
    const suspiciousPatterns = [
      /http[s]?:\/\//i,
      /www\./i,
      /\.com|\.ru|\.org/i,
      /@\w+/i,
      /telegram|discord|whatsapp|viber/i,
      /\+7\d{10}|\d{3}-\d{3}-\d{4}/,
      /продам|куплю|обмен/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(content));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Модерация сообщений</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-800 rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-slate-700 rounded mb-2 w-1/4"></div>
              <div className="h-4 bg-slate-700 rounded mb-2 w-3/4"></div>
              <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const suspiciousMessages = messages.filter((msg: any) => checkSuspiciousContent(msg.content));
  const recentMessages = messages.slice(0, 50); // Показываем последние 50 сообщений

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Модерация сообщений</h1>
        <div className="flex items-center gap-3">
          <Badge className="bg-amber-500 text-amber-900">
            {suspiciousMessages.length} подозрительных
          </Badge>
          <Badge variant="outline" className="border-slate-600 text-slate-400">
            {messages.length} всего
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Подозрительные сообщения */}
        <Card className="bg-slate-800 border-slate-700 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>Подозрительные сообщения</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {suspiciousMessages.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Подозрительных сообщений нет</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {suspiciousMessages.map((message: any) => (
                    <button
                      key={message.id}
                      onClick={() => setSelectedMessage(message)}
                      className={`w-full p-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 ${
                        selectedMessage?.id === message.id ? 'bg-slate-700' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="h-4 w-4 text-blue-400" />
                        <span className="text-white font-medium text-sm">
                          {message.sender_name}
                        </span>
                      </div>
                      
                      <p className="text-slate-400 text-xs truncate mb-1">
                        {message.content}
                      </p>
                      
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-slate-500" />
                        <span className="text-slate-500 text-xs">
                          {formatDate(message.createdAt)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Все сообщения */}
        <Card className="bg-slate-800 border-slate-700 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <MessageSquare className="h-5 w-5" />
              <span>Последние сообщения</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1">
                {recentMessages.map((message: any) => (
                  <button
                    key={message.id}
                    onClick={() => setSelectedMessage(message)}
                    className={`w-full p-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 ${
                      selectedMessage?.id === message.id ? 'bg-slate-700' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <User className="h-4 w-4 text-blue-400" />
                      <span className="text-white font-medium text-sm">
                        {message.sender_name}
                      </span>
                      {checkSuspiciousContent(message.content) && (
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                    
                    <p className="text-slate-400 text-xs truncate mb-1">
                      {message.content}
                    </p>
                    
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      <span className="text-slate-500 text-xs">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Детали сообщения */}
        <Card className="bg-slate-800 border-slate-700 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <MessageSquare className="h-5 w-5" />
              <span>Детали сообщения</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedMessage ? (
              <div className="text-center py-8 text-slate-400">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Выберите сообщение для просмотра деталей</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Информация о сообщении */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-400">Отправитель</label>
                    <p className="text-white">{selectedMessage.sender_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-400">Получатель</label>
                    <p className="text-white">{selectedMessage.receiver_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-400">Автомобиль</label>
                    <p className="text-white">{selectedMessage.car_name || 'Не указан'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-400">Дата отправки</label>
                    <p className="text-white">{formatDate(selectedMessage.createdAt)}</p>
                  </div>
                </div>

                {/* Содержимое сообщения */}
                <div>
                  <label className="text-sm font-medium text-slate-400">Сообщение</label>
                  <div className={`mt-1 p-3 rounded-lg border ${
                    checkSuspiciousContent(selectedMessage.content)
                      ? 'bg-amber-900/20 border-amber-600'
                      : 'bg-slate-700 border-slate-600'
                  }`}>
                    <p className="text-white whitespace-pre-wrap">
                      {selectedMessage.content}
                    </p>
                  </div>
                  
                  {checkSuspiciousContent(selectedMessage.content) && (
                    <div className="mt-2 flex items-center space-x-2 text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">Подозрительное содержимое</span>
                    </div>
                  )}
                </div>

                {/* Действия */}
                <div className="pt-4 border-t border-slate-700">
                  <Button
                    onClick={() => handleDeleteMessage(selectedMessage)}
                    disabled={deleteMessageMutation.isPending}
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleteMessageMutation.isPending ? 'Удаление...' : 'Удалить сообщение'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
