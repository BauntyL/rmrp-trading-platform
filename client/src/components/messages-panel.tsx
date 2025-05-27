import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft } from 'lucide-react';

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  carId?: number | null;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderName?: string;
  receiverName?: string;
  carName?: string | null;
}

interface Chat {
  id: string;
  otherUserId: number;
  otherUserName: string;
  carName: string;
  lastMessage?: Message;
  unreadCount: number;
}

interface User {
  id: number;
  username: string;
  role: string;
}

const MessagesPanel: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Загрузка пользователя
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          console.log('👤 User loaded:', data.user);
        } else {
          console.error('❌ Failed to load user');
        }
      } catch (error) {
        console.error('❌ Error loading user:', error);
      }
    };

    fetchUser();
  }, []);

  // Загрузка чатов
  useEffect(() => {
    const fetchChats = async () => {
      if (!user) return;
      
      try {
        console.log('📨 Loading chats...');
        const response = await fetch('/api/messages/chats', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const chatsData = await response.json();
          console.log('💬 Chats loaded:', chatsData);
          setChats(chatsData);
          
          // Автоматически выбираем первый чат
          if (chatsData.length > 0 && !selectedChat) {
            setSelectedChat(chatsData[0]);
          }
        } else {
          console.error('❌ Failed to load chats');
        }
      } catch (error) {
        console.error('❌ Error loading chats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [user]);

  // Загрузка сообщений для выбранного чата
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChat || !user) return;
      
      try {
        console.log('📩 Loading messages for chat:', selectedChat.id);
        const response = await fetch(`/api/messages?chatId=${selectedChat.id}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const messagesData = await response.json();
          console.log('💬 Messages loaded:', messagesData);
          setMessages(messagesData);
          
          // Отмечаем сообщения как прочитанные
          const unreadMessages = messagesData.filter((msg: Message) => 
            !msg.isRead && msg.receiverId === user.id
          );
          
          for (const msg of unreadMessages) {
            try {
              await fetch(`/api/messages/${msg.id}/read`, {
                method: 'PATCH',
                credentials: 'include'
              });
            } catch (error) {
              console.error('❌ Error marking message as read:', error);
            }
          }
        } else {
          console.error('❌ Failed to load messages');
        }
      } catch (error) {
        console.error('❌ Error loading messages:', error);
      }
    };

    fetchMessages();
  }, [selectedChat, user]);

  // Прокрутка вниз при новых сообщениях
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Отправка сообщения
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedChat || !user || sending) {
      return;
    }

    setSending(true);
    
    try {
      console.log('📤 Sending message:', {
        content: newMessage,
        chatId: selectedChat.id,
        receiverId: selectedChat.otherUserId
      });
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: newMessage,
          chatId: selectedChat.id,
          receiverId: selectedChat.otherUserId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Message sent:', result);
        setNewMessage('');
        
        // Перезагружаем сообщения
        const messagesResponse = await fetch(`/api/messages?chatId=${selectedChat.id}`, {
          credentials: 'include'
        });
        
        if (messagesResponse.ok) {
          const updatedMessages = await messagesResponse.json();
          setMessages(updatedMessages);
        }
        
        // Перезагружаем чаты
        const chatsResponse = await fetch('/api/messages/chats', {
          credentials: 'include'
        });
        
        if (chatsResponse.ok) {
          const updatedChats = await chatsResponse.json();
          setChats(updatedChats);
        }
      } else {
        const error = await response.json();
        console.error('❌ Failed to send message:', error);
        alert(error.error || 'Ошибка отправки сообщения');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      alert('Ошибка отправки сообщения');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-800">
        <div className="text-emerald-400">Загрузка сообщений...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-800">
      {/* Список чатов */}
      <div className="w-1/3 border-r border-slate-600 bg-slate-900">
        <div className="p-4 border-b border-slate-600">
          <h2 className="text-lg font-semibold text-emerald-400">Чаты</h2>
        </div>
        
        <div className="overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-4 text-center text-slate-400">
              Нет активных чатов
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`p-4 border-b border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors ${
                  selectedChat?.id === chat.id ? 'bg-slate-800' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                      {chat.otherUserName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        {chat.otherUserName}
                      </div>
                      <div className="text-sm text-slate-400 truncate">
                        {chat.carName}
                      </div>
                    </div>
                  </div>
                  {chat.unreadCount > 0 && (
                    <div className="bg-emerald-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
                {chat.lastMessage && (
                  <div className="text-sm text-slate-400 mt-1 truncate">
                    {chat.lastMessage.content}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Область сообщений */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Заголовок чата */}
            <div className="p-4 border-b border-slate-600 bg-slate-900">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                  {selectedChat.otherUserName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-white">
                    {selectedChat.otherUserName}
                  </div>
                  <div className="text-sm text-slate-400">
                    {selectedChat.carName}
                  </div>
                </div>
              </div>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-slate-400">
                  Нет сообщений в этом чате
                  <br />
                  <span className="text-sm">Начните переписку!</span>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderId === user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === user?.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      <div className="break-words">{message.content}</div>
                      <div
                        className={`text-xs mt-1 ${
                          message.senderId === user?.id
                            ? 'text-emerald-100'
                            : 'text-slate-400'
                        }`}
                      >
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Форма отправки */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-600 bg-slate-900">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Введите сообщение..."
                  className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <div className="text-2xl mb-2">💬</div>
              <div>Выберите чат для начала общения</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPanel;
