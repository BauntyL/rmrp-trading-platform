import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Search, 
  Edit, 
  Ban,
  UserCheck,
  Crown,
  User,
  Shield
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function UserManagementPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Мок данные для примера
  const mockUsers = [
    {
      id: 1,
      username: "admin",
      email: "admin@avtokatalog.ru",
      role: "admin",
      isBanned: false,
      isOnline: true,
      createdAt: "2024-01-01T00:00:00Z",
      lastLogin: "2024-01-15T14:30:00Z"
    },
    {
      id: 2,
      username: "moderator1",
      email: "mod@avtokatalog.ru",
      role: "moderator",
      isBanned: false,
      isOnline: false,
      createdAt: "2024-01-02T00:00:00Z",
      lastLogin: "2024-01-14T16:45:00Z"
    },
    {
      id: 3,
      username: "user123",
      email: "user@example.com",
      role: "user",
      isBanned: false,
      isOnline: true,
      createdAt: "2024-01-03T00:00:00Z",
      lastLogin: "2024-01-15T12:20:00Z"
    }
  ];

  const { data: users = mockUsers, isLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      return mockUsers;
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async ({ userId, duration }: { userId: number; duration: string }) => {
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Пользователь заблокирован",
        description: "Пользователь успешно заблокирован",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка блокировки",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Роль изменена",
        description: "Роль пользователя успешно изменена",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка изменения роли",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter((user: any) => {
    const matchesSearch = searchTerm === "" || 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === "all" || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-orange-500"><Crown className="h-3 w-3 mr-1" />Администратор</Badge>;
      case 'moderator':
        return <Badge className="bg-green-500"><Shield className="h-3 w-3 mr-1" />Модератор</Badge>;
      case 'user':
        return <Badge variant="outline"><User className="h-3 w-3 mr-1" />Пользователь</Badge>;
      default:
        return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  const getStatusBadge = (user: any) => {
    if (user.isBanned) {
      return <Badge className="bg-red-500">Заблокирован</Badge>;
    }
    if (user.isOnline) {
      return <Badge className="bg-green-500">Онлайн</Badge>;
    }
    return <Badge variant="outline">Офлайн</Badge>;
  };

  const handleBanUser = (user: any, duration: string) => {
    const durationText = duration === 'permanent' ? 'навсегда' : `на ${duration}`;
    
    if (window.confirm(`Заблокировать пользователя ${user.username} ${durationText}?`)) {
      banUserMutation.mutate({ userId: user.id, duration });
    }
  };

  const handleRoleChange = (user: any, newRole: string) => {
    if (window.confirm(`Изменить роль пользователя ${user.username} на ${newRole}?`)) {
      changeRoleMutation.mutate({ userId: user.id, role: newRole });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Управление пользователями</h1>
        <p className="text-slate-400">Управление ролями и статусами пользователей</p>
      </div>

      {/* Фильтры */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Поиск пользователей..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-700 border-slate-600 text-white"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
            <SelectValue placeholder="Роль" />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600">
            <SelectItem value="all">Все роли</SelectItem>
            <SelectItem value="admin">Администраторы</SelectItem>
            <SelectItem value="moderator">Модераторы</SelectItem>
            <SelectItem value="user">Пользователи</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{users.length}</p>
                <p className="text-sm text-slate-400">Всего пользователей</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {users.filter((u: any) => u.isOnline).length}
                </p>
                <p className="text-sm text-slate-400">Онлайн</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Ban className="h-8 w-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {users.filter((u: any) => u.isBanned).length}
                </p>
                <p className="text-sm text-slate-400">Заблокированы</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Crown className="h-8 w-8 text-orange-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {users.filter((u: any) => u.role === 'admin' || u.role === 'moderator').length}
                </p>
                <p className="text-sm text-slate-400">Модераторы+</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список пользователей */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Users className="h-5 w-5" />
            <span>Пользователи ({filteredUsers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-slate-700 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-slate-400">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Пользователи не найдены</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user: any) => (
                  <div
                    key={user.id}
                    className="p-4 border-b border-slate-700 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {user.username?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{user.username}</span>
                            {getRoleBadge(user.role)}
                            {getStatusBadge(user)}
                          </div>
                          <p className="text-sm text-slate-400">{user.email}</p>
                          <p className="text-xs text-slate-500">
                            Регистрация: {formatDate(user.createdAt)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => handleRoleChange(user, newRole)}
                        >
                          <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="user">Пользователь</SelectItem>
                            <SelectItem value="moderator">Модератор</SelectItem>
                            <SelectItem value="admin">Администратор</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Select
                          onValueChange={(duration) => handleBanUser(user, duration)}
                        >
                          <SelectTrigger className="w-24 bg-red-600 border-red-600 text-white hover:bg-red-700">
                            <Ban className="h-4 w-4" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="1h">1 час</SelectItem>
                            <SelectItem value="1d">1 день</SelectItem>
                            <SelectItem value="7d">7 дней</SelectItem>
                            <SelectItem value="30d">30 дней</SelectItem>
                            <SelectItem value="permanent">Навсегда</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
