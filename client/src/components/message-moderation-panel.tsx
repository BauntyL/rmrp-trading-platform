import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Search, Trash2, Eye } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface MessageModerationData {
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
  recipientName?: string;
}

export function MessageModerationPanel() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<MessageModerationData | null>(null);

  const { data: debugData, isLoading } = useQuery({
    queryKey: ["/api/debug/messages"],
    refetchInterval: 10000, // Автообновление каждые 10 секунд
    refetchOnWindowFocus: true,
  });

  const allMessages = debugData?.messages || [];

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest("DELETE", `/api/messages/${messageId}`, {});
      if (!response.ok) {
        throw new Error("Ошибка при удалении сообщения");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Успешно",
        description: "Сообщение удалено",
      });
      setSelectedMessage(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredMessages = allMessages.filter(message =>
    message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.carName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.senderName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.recipientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Группировка сообщений по диалогам
  const dialogues = filteredMessages.reduce((acc: Record<string, MessageModerationData[]>, message) => {
    const dialogueKey = `${message.carId}-${Math.min(message.buyerId, message.sellerId)}-${Math.max(message.buyerId, message.sellerId)}`;
    if (!acc[dialogueKey]) {
      acc[dialogueKey] = [];
    }
    acc[dialogueKey].push(message);
    return acc;
  }, {});

  // Сортировка диалогов по последнему сообщению
  const sortedDialogues = Object.entries(dialogues)
    .map(([key, messages]) => ({
      key,
      messages: messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      lastMessage: messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    }))
    .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());

  const handleDeleteMessage = (messageId: number) => {
    deleteMessageMutation.mutate(messageId);
  };

  console.log("📊 Данные модерации:", { 
    debugData,
    allMessages, 
    allMessagesLength: allMessages?.length,
    filteredMessages, 
    sortedDialogues,
    isLoading 
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Загрузка сообщений...</div>
      </div>
    );
  }

  if (!allMessages || allMessages.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Модерация сообщений</h2>
          <p className="text-slate-400">Контроль всех диалогов пользователей</p>
        </div>
        
        <div className="text-center py-12">
          <div className="text-slate-400 text-lg mb-2">Сообщений не найдено</div>
          <p className="text-slate-500">Пока что пользователи не отправляли сообщений</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Модерация сообщений</h2>
          <p className="text-slate-400">Просмотр и модерация диалогов пользователей</p>
        </div>
        <Badge variant="secondary" className="bg-slate-700 text-slate-200">
          Всего диалогов: {sortedDialogues.length}
        </Badge>
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
        <Input
          placeholder="Поиск по содержимому, автомобилю или пользователям..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {sortedDialogues.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400">
              {searchTerm ? "Сообщения не найдены" : "Пока нет сообщений для модерации"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedDialogues.map(({ key, messages, lastMessage }) => (
            <Card key={key} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-white">
                      {lastMessage.carName || "Неизвестный автомобиль"}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span>{lastMessage.buyerName || "Покупатель"}</span>
                      <span>↔</span>
                      <span>{lastMessage.sellerName || "Продавец"}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="bg-slate-700 text-slate-200">
                      {messages.length} сообщений
                    </Badge>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(lastMessage.createdAt), "dd MMM yyyy HH:mm", { locale: ru })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Показываем последние 3 сообщения */}
                  {messages.slice(0, 3).map((message) => (
                    <div
                      key={message.id}
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">
                            {message.senderName || "Пользователь"}
                          </span>
                          <span className="text-xs text-slate-400">
                            {format(new Date(message.createdAt), "dd MMM HH:mm", { locale: ru })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 truncate">
                          {message.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMessage(message)}
                          className="text-slate-400 hover:text-white"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMessage(message.id)}
                          disabled={deleteMessageMutation.isPending}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {messages.length > 3 && (
                    <p className="text-center text-sm text-slate-400">
                      ... и еще {messages.length - 3} сообщений
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Модальное окно для просмотра сообщения */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-800 border-slate-700 max-w-lg w-full">
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">Детали сообщения</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400">Отправитель:</label>
                <p className="text-white">{selectedMessage.senderName || "Неизвестный"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Получатель:</label>
                <p className="text-white">{selectedMessage.recipientName || "Неизвестный"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Автомобиль:</label>
                <p className="text-white">{selectedMessage.carName || "Неизвестный"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Время отправки:</label>
                <p className="text-white">
                  {format(new Date(selectedMessage.createdAt), "dd MMMM yyyy, HH:mm", { locale: ru })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Содержимое:</label>
                <div className="p-3 bg-slate-700 rounded-lg">
                  <p className="text-white whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteMessage(selectedMessage.id)}
                  disabled={deleteMessageMutation.isPending}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить сообщение
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedMessage(null)}
                  className="flex-1"
                >
                  Закрыть
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}