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
    onSuccess: () => {
      // Обновляем все связанные кеши
      queryClient.invalidateQueries({ queryKey: ["/api/messages/chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка отправки",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
