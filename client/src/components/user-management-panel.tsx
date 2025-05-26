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
  Clock,
  Shield,
  Crown,
  User
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EditUserModal } from "@/components/edit-user-modal";

export function UserManagementPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch('/api/users', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      return response.json();
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async ({ userId, duration }: { userId: number; duration: string }) => {
      const response = await fetch(`/api/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ duration }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка бана пользователя');
      }
      
      return response.json();
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
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка изменения роли');
      }
      
      return response.json();
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

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditUserModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  return (
    <>
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
                <div className="p-8 text-center text-slate-400">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
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
                            <div className="flex items-center space-x-4 text-sm text-slate-400 mt-1">
                              <span>ID: {user.id}</span>
                              {user.email && <span>Email: {user.email}</span>}
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>Регистрация: {formatDate(user.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Изменение роли */}
                          <Select
                            value={user.role}
                            onValueChange={(newRole) => handleRoleChange(user, newRole)}
                          >
                            <SelectTrigger className="w-32 h-8 bg-slate-700 border-slate-600 text-white text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="user">Пользователь</SelectItem>
                              <SelectItem value="moderator">Модератор</SelectItem>
                              <SelectItem value="admin">Администратор</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Кнопки действий */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          {!user.isBanned ? (
                            <Select onValueChange={(duration) => handleBanUser(user, duration)}>
                              <SelectTrigger className="w-24 h-8 bg-red-600 border-red-600 text-white text-xs hover:bg-red-700">
                                <Ban className="h-3 w-3" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-700 border-slate-600">
                                <SelectItem value="1h">1 час</SelectItem>
                                <SelectItem value="24h">24 часа</SelectItem>
                                <SelectItem value="7d">7 дней</SelectItem>
                                <SelectItem value="30d">30 дней</SelectItem>
                                <SelectItem value="permanent">Навсегда</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRoleChange(user, user.role)}
                              className="bg-green-600 border-green-600 text-white hover:bg-green-700"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
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

      {/* Модал редактирования пользователя */}
      <EditUserModal
        user={selectedUser}
        open={editUserModalOpen}
        onOpenChange={setEditUserModalOpen}
      />
    </>
  );
}
