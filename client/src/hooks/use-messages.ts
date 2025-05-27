import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useUnreadMessageCount() {
  return useQuery({
    queryKey: ["/api/messages/unread-count"],
    queryFn: async () => {
      const response = await fetch('/api/messages/unread-count', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          return { count: 0 };
        }
        throw new Error('Failed to fetch unread count');
      }
      
      return response.json();
    },
    refetchInterval: 3000, // Обновляем каждые 3 секунды
    refetchIntervalInBackground: true,
    staleTime: 2000,
    retry: 1,
  });
}

export function useChats() {
  return useQuery({
    queryKey: ["/api/messages/chats"],
    queryFn: async () => {
      const response = await fetch('/api/messages/chats', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          return [];
        }
        throw new Error('Failed to fetch chats');
      }
      
      return response.json();
    },
    refetchInterval: 5000, // Обновляем каждые 5 секунд
    refetchIntervalInBackground: true,
    staleTime: 3000,
    retry: 1,
  });
}

export function useChatMessages(chatId: string | null) {
  return useQuery({
    queryKey: ["/api/messages", chatId],
    queryFn: async () => {
      if (!chatId) return [];
      
      const response = await fetch(`/api/messages/${chatId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      return response.json();
    },
    enabled: !!chatId,
    refetchInterval: 2000, // Быстрое обновление сообщений
    refetchIntervalInBackground: true,
    staleTime: 1000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { chatId: string; content: string }) => {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка отправки сообщения');
      }

      return response.json();
    },
    onMutate: async (newMessage) => {
      // Оптимистичное обновление
      await queryClient.cancelQueries({ queryKey: ["/api/messages", newMessage.chatId] });
      
      const previousMessages = queryClient.getQueryData(["/api/messages", newMessage.chatId]);
      
      // Добавляем временное сообщение
      const tempMessage = {
        id: `temp-${Date.now()}`,
        content: newMessage.content,
        senderId: 'current-user', // Заменится на реальный ID
        createdAt: new Date().toISOString(),
        isTemporary: true
      };
      
      queryClient.setQueryData(
        ["/api/messages", newMessage.chatId],
        (old: any) => [...(old || []), tempMessage]
      );
      
      return { previousMessages };
    },
    onSuccess: () => {
      // Обновляем все связанные кеши
      queryClient.invalidateQueries({ queryKey: ["/api/messages/chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
    onError: (error, newMessage, context) => {
      // Откатываем оптимистичное обновление
      if (context?.previousMessages) {
        queryClient.setQueryData(["/api/messages", newMessage.chatId], context.previousMessages);
      }
      
      toast({
        title: "Ошибка отправки",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: (data, error, variables) => {
      // Всегда обновляем данные
      queryClient.invalidateQueries({ queryKey: ["/api/messages", variables.chatId] });
    },
  });
}
