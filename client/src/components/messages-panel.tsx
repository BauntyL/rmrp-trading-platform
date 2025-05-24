import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Message } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

// Расширенный тип сообщения с дополнительной информацией
interface EnrichedMessage extends Message {
  carName: string;
  buyerName: string;
  sellerName: string;
}

export function MessagesPanel() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const { user } = useAuth();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/messages"],
    enabled: !!user,
    staleTime: 60000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

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

  // Простая проверка типа данных
  if (!Array.isArray(messages)) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Сообщения</h2>
        <p className="text-gray-500">Нет сообщений для отображения</p>
      </div>
    );
  }

  // Группируем сообщения по автомобилям и собеседникам
  const groupedMessages = messages.reduce((groups: Record<string, any>, message: any) => {
    // Создаем уникальный ключ для каждого диалога: carId + участники
    const conversationKey = `${message.carId}_${Math.min(message.buyerId, message.sellerId)}_${Math.max(message.buyerId, message.sellerId)}`;
    if (!groups[conversationKey]) {
      groups[conversationKey] = [];
    }
    groups[conversationKey].push(message);
    return groups;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Загрузка сообщений...</div>
      </div>
    );
  }

  if (Object.keys(groupedMessages).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <MessageCircle className="h-16 w-16 text-slate-400 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Нет сообщений</h3>
        <p className="text-slate-400">
          Здесь будут отображаться ваши диалоги с покупателями и продавцами
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Сообщения</h2>
        <Badge variant="secondary" className="bg-slate-700 text-slate-300">
          {Object.keys(groupedMessages).length} диалогов
        </Badge>
      </div>

      <div className="grid gap-4">
        {Object.entries(groupedMessages).map(([conversationKey, conversationMessages]) => {
          const latestMessage = conversationMessages[conversationMessages.length - 1];
          
          // Определяем собеседника (не текущий пользователь)
          const otherUser = latestMessage.buyerId === user?.id 
            ? latestMessage.sellerName 
            : latestMessage.buyerName;
          
          return (
            <Card key={conversationKey} className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-white flex items-center">
                    <MessageCircle className="h-5 w-5 mr-2 text-blue-400" />
                    Диалог по автомобилю {latestMessage.carName} с {otherUser}
                  </CardTitle>
                  <div className="flex items-center text-sm text-slate-400">
                    <Clock className="h-4 w-4 mr-1" />
                    {format(new Date(latestMessage.createdAt), "dd MMM, HH:mm", { locale: ru })}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500/40 to-blue-600 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-300">
                        {latestMessage.buyerId === user?.id 
                          ? "Вы" 
                          : latestMessage.buyerId === latestMessage.sellerId 
                            ? "Вы" 
                            : (latestMessage.buyerId === user?.id ? latestMessage.buyerName : latestMessage.sellerName)
                        }
                      </p>
                      <p className="text-slate-400 text-sm line-clamp-2">
                        {latestMessage.message}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {conversationMessages.length} сообщений
                      </Badge>
                      {!latestMessage.isRead && (
                        <Badge className="bg-blue-600 text-white text-xs">
                          Новое
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/20"
                      onClick={() => setSelectedConversation(latestMessage.carId)}
                    >
                      Открыть диалог
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}