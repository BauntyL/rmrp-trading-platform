import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, 
  User, 
  Car, 
  Clock, 
  Search, 
  AlertTriangle,
  XCircle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function MessageModerationPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedDialog, setSelectedDialog] = useState<any>(null);

  const mockDialogs = [
    {
      id: 1,
      carName: "BMW X5 2020",
      buyerName: "Иван Петров",
      sellerName: "Михаил Сидоров",
      status: "active",
      lastMessage: "2024-01-15T14:30:00Z",
      messageCount: 12,
      buyerId: 1,
      sellerId: 2
    },
    {
      id: 2,
      carName: "Audi A6 2019",
      buyerName: "Анна Козлова",
      sellerName: "Дмитрий Волков",
      status: "flagged",
      lastMessage: "2024-01-14T16:45:00Z",
      messageCount: 8,
      buyerId: 3,
      sellerId: 4
    },
    {
      id: 3,
      carName: "Mercedes-Benz C-Class 2021",
      buyerName: "Елена Смирнова",
      sellerName: "Алексей Иванов",
      status: "active",
      lastMessage: "2024-01-13T10:20:00Z",
      messageCount: 5,
      buyerId: 5,
      sellerId: 6
    }
  ];

  const mockMessages = [
    {
      id: 1,
      content: "Добрый день! Интересует ваш автомобиль. Можно договориться о встрече?",
      senderId: 1,
      senderName: "Иван Петров",
      createdAt: "2024-01-15T14:30:00Z",
      isBlocked: false,
      isFlagged: false
    },
    {
      id: 2,
      content: "Здравствуйте! Конечно, давайте встретимся завтра в 15:00.",
      senderId: 2,
      senderName: "Михаил Сидоров",
      createdAt: "2024-01-15T14:35:00Z",
      isBlocked: false,
      isFlagged: false
    },
    {
      id: 3,
      content: "Отлично! Где встретимся? Можете прислать адрес?",
      senderId: 1,
      senderName: "Иван Петров",
      createdAt: "2024-01-15T14:40:00Z",
      isBlocked: false,
      isFlagged: false
    }
  ];

  const { data: dialogs = mockDialogs } = useQuery({
    queryKey: ["/api/messages/moderation"],
    queryFn: async () => mockDialogs,
  });

  const { data: messages = mockMessages } = useQuery({
    queryKey: ["/api/messages/dialog", selectedDialog?.id],
    queryFn: async () => selectedDialog ? mockMessages : [],
    enabled: !!selectedDialog?.id,
  });

  const filteredDialogs = dialogs.filter((dialog: any) => {
    const matchesSearch = searchTerm === "" || 
      dialog.carName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dialog.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dialog.sellerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === "all" || dialog.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Активен</Badge>;
      case 'flagged':
        return <Badge className="bg-yellow-500">Отмечен</Badge>;
      case 'blocked':
        return <Badge className="bg-red-500">Заблокирован</Badge>;
      default:
        return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Модерация сообщений</h1>
        <p className="text-slate-400">Просмотр и управление диалогами пользователей</p>
      </div>

      <div className="flex space-x-4">
        <div className="flex space-x-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Поиск по автомобилю или пользователю..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="active">Активные</SelectItem>
              <SelectItem value="flagged">Отмеченные</SelectItem>
              <SelectItem value="blocked">Заблокированные</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <MessageSquare className="h-5 w-5" />
              <span>Диалоги ({filteredDialogs.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-1">
                {filteredDialogs.map((dialog: any) => (
                  <button
                    key={dialog.id}
                    onClick={() => setSelectedDialog(dialog)}
                    className={`w-full p-4 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 ${
                      selectedDialog?.id === dialog.id ? 'bg-slate-700' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <Car className="h-4 w-4 text-blue-400" />
                        <span className="text-white font-medium text-sm">
                          {dialog.carName || 'Неизвестный автомобиль'}
                        </span>
                      </div>
                      {getStatusBadge(dialog.status)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <User className="h-3 w-3" />
                        <span>Покупатель: {dialog.buyerName}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <User className="h-3 w-3" />
                        <span>Продавец: {dialog.sellerName}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(dialog.lastMessage)}</span>
                      </div>
                    </div>
                    
                    {dialog.messageCount && (
                      <div className="mt-2 text-xs text-slate-500">
                        Сообщений: {dialog.messageCount}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Сообщения</span>
              </div>
              {selectedDialog && (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-yellow-600 border-yellow-600 text-white hover:bg-yellow-700"
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Отметить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-red-600 border-red-600 text-white hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Заблокировать
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedDialog ? (
              <div className="p-8 text-center text-slate-400">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Выберите диалог для просмотра сообщений</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="p-4 space-y-4">
                  {messages.map((message: any) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${
                        message.senderId === selectedDialog.buyerId
                          ? 'bg-blue-600/20 ml-4'
                          : 'bg-slate-700 mr-4'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium text-white">
                            {message.senderName}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {formatDate(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm">{message.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
