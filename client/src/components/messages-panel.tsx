import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

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

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/messages"],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
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

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">Сообщения</h2>
      
      {!Array.isArray(messages) || messages.length === 0 ? (
        <p className="text-gray-500">У вас пока нет сообщений</p>
      ) : (
        <div className="space-y-4">
          {messages.map((message: Message) => {
            // Определяем имя автомобиля
            const carName = message.carName || `Автомобиль #${message.carId}`;
            
            // Определяем имя собеседника
            const otherUserName = message.buyerId === user?.id ? 
              (message.sellerName || `Пользователь #${message.sellerId}`) :
              (message.buyerName || `Пользователь #${message.buyerId}`);
            
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
                      {message.content}
                    </p>
                  </div>
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}