import { useState } from "react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Send, 
  User, 
  Car, 
  Clock,
  Search
  Clock
} from "lucide-react";

export function MessagesPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDialog, setSelectedDialog] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Мок данные для примера
  const mockDialogs = [
    {
      id: 1,
      carName: "BMW X5 2020",
      otherUserName: "Михаил Сидоров",
      lastMessage: "Договорились на завтра в 15:00",
      lastMessageTime: "2024-01-15T14:30:00Z",
      unreadCount: 2,
      carId: 1,
      otherUserId: 2
    },
    {
      id: 2,
      carName: "Audi A6 2019",
      otherUserName: "Анна Козлова",
      lastMessage: "Спасибо за информацию!",
      lastMessageTime: "2024-01-14T16:45:00Z",
      unreadCount: 0,
      carId: 2,
      otherUserId: 3
    }
  ];
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messageText, setMessageText] = useState("");

  const mockMessages = [
    {
      id: 1,
      content: "Добрый день! Интересует ваш автомобиль.",
      senderId: 2,
      senderName: "Михаил Сидоров",
      createdAt: "2024-01-15T14:30:00Z",
      isRead: true
    },
    {
      id: 2,
      content: "Здравствуйте! Конечно, расскажу подробнее.",
      senderId: 1,
      senderName: "Вы",
      createdAt: "2024-01-15T14:35:00Z",
      isRead: true
    }
  ];

  const { data: dialogs = mockDialogs, isLoading: dialogsLoading } = useQuery({
    queryKey: ["/api/messages/dialogs"],
  const { data: chats = [], isLoading: chatsLoading } = useQuery({
    queryKey: ["/api/messages/chats"],
    queryFn: async () => {
      // В реальном проекте здесь будет запрос к API
      return mockDialogs;
      const response = await fetch('/api/messages/chats', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      
      return response.json();
    },
  });

  const { data: messages = mockMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/messages", selectedDialog?.id],
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/messages", selectedChat?.id],
    queryFn: async () => {
      // В реальном проекте здесь будет запрос к API
      return selectedDialog ? mockMessages : [];
      if (!selectedChat?.id) return [];
      
      const response = await fetch(`/api/messages/${selectedChat.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      return response.json();
    },
    enabled: !!selectedDialog?.id,
    enabled: !!selectedChat?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { dialogId: number; content: string }) => {
      // В реальном проекте здесь будет запрос к API
      return { success: true };
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
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/dialogs"] });
      setNewMessage("");
      toast({
        title: "Сообщение отправлено",
        description: "Ваше сообщение успешно отправлено",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedChat?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/chats"] });
      setMessageText("");
    },
    onError: (error: any) => {
      toast({
@@ -107,23 +85,20 @@ export function MessagesPanel() {
    },
  });

  const filteredDialogs = dialogs.filter((dialog: any) =>
    searchTerm === "" || 
    dialog.carName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dialog.otherUserName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedDialog) return;
    
    if (!messageText.trim() || !selectedChat) {
      return;
    }

    sendMessageMutation.mutate({
      dialogId: selectedDialog.id,
      content: newMessage.trim()
      chatId: selectedChat.id,
      content: messageText.trim(),
    });
  };

  const formatTime = (dateString: string) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
@@ -135,93 +110,92 @@ export function MessagesPanel() {
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
        <p className="text-slate-400">Ваша переписка с продавцами и покупателями</p>
        <p className="text-slate-400">Ваши диалоги с покупателями и продавцами</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Список диалогов */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
        {/* Список чатов */}
        <Card className="bg-slate-800 border-slate-700 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-white text-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <MessageSquare className="h-5 w-5" />
              <span>Диалоги</span>
              {dialogs.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {dialogs.length}
                </Badge>
              {chats.length > 0 && (
                <Badge variant="outline">{chats.length}</Badge>
              )}
            </CardTitle>
            
            {/* Поиск */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Поиск диалогов..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white text-sm"
              />
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-[460px]">
              {dialogsLoading ? (
                <div className="p-3 space-y-3">
            <ScrollArea className="h-[580px]">
              {chatsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-slate-700 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : filteredDialogs.length === 0 ? (
              ) : chats.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Нет диалогов</p>
                  <p className="font-medium">Нет диалогов</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Диалоги появятся после общения с другими пользователями
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredDialogs.map((dialog: any) => (
                  {chats.map((chat: any) => (
                    <button
                      key={dialog.id}
                      onClick={() => setSelectedDialog(dialog)}
                      className={`w-full p-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700/50 ${
                        selectedDialog?.id === dialog.id ? 'bg-slate-700' : ''
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={`w-full p-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 ${
                        selectedChat?.id === chat.id ? 'bg-slate-700' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <Car className="h-4 w-4 text-blue-400 flex-shrink-0" />
                          <span className="text-white font-medium text-sm truncate">
                            {dialog.carName}
                            {chat.carName || 'Автомобиль'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <span className="text-xs text-slate-400">
                            {formatTime(dialog.lastMessageTime)}
                          </span>
                          {dialog.unreadCount > 0 && (
                            <Badge className="bg-blue-500 text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                              {dialog.unreadCount}
                            </Badge>
                          )}
                        </div>
                        {chat.unreadCount > 0 && (
                          <Badge className="bg-red-500 text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                            {chat.unreadCount}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 mb-1">
                        <User className="h-3 w-3 text-slate-400 flex-shrink-0" />
                        <span className="text-xs text-slate-400 truncate">
                          {dialog.otherUserName}
                        <span className="text-slate-300 text-xs truncate">
                          {getOtherUserName(chat)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 truncate">
                        {dialog.lastMessage}
                      </p>
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
@@ -230,46 +204,51 @@ export function MessagesPanel() {
          </CardContent>
        </Card>

        {/* Окно сообщений */}
        {/* Область сообщений */}
        <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
          <CardHeader className="pb-3">
            {selectedDialog ? (
              <CardTitle className="flex items-center space-x-2 text-white text-lg">
                <Car className="h-5 w-5 text-blue-400" />
                <div>
                  <span>{selectedDialog.carName}</span>
                  <p className="text-sm text-slate-400 font-normal">
                    с {selectedDialog.otherUserName}
                  </p>
                </div>
              </CardTitle>
            ) : (
              <CardTitle className="text-white text-lg">Выберите диалог</CardTitle>
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

          <CardContent className="p-0 flex flex-col h-[500px]">
            {!selectedDialog ? (
          <CardContent className="p-0 flex flex-col h-[580px]">
            {!selectedChat ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Выберите диалог для просмотра сообщений</p>
                  <p className="font-medium">Выберите диалог</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Выберите диалог из списка слева для просмотра сообщений
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Сообщения */}
                <ScrollArea className="flex-1 px-4">
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="space-y-4 py-4">
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className={`h-12 bg-slate-700 rounded-lg ${i % 2 === 0 ? 'ml-8' : 'mr-8'}`}></div>
                          <div className="h-12 bg-slate-700 rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <p>Начните разговор!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 py-4">
                    <div className="space-y-3">
                      {messages.map((message: any) => (
                        <div
                          key={message.id}
@@ -278,18 +257,16 @@ export function MessagesPanel() {
                          }`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                            className={`max-w-[70%] p-3 rounded-lg ${
                              message.senderId === user?.id
                                ? 'bg-blue-600 text-white ml-4'
                                : 'bg-slate-700 text-slate-300 mr-4'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-100'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs opacity-70">
                                {formatTime(message.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs opacity-70 mt-1">
                              {formatDate(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
@@ -298,18 +275,18 @@ export function MessagesPanel() {
                </ScrollArea>

                {/* Форма отправки */}
                <div className="p-4 border-t border-slate-700">
                <div className="border-t border-slate-700 p-4">
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Введите сообщение..."
                      className="flex-1 bg-slate-700 border-slate-600 text-white"
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button
                      type="submit"
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="h-4 w-4" />
