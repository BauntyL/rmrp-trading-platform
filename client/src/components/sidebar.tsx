import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Car,
  Heart,
  MessageSquare,
  FileText,
  Shield,
  Users,
  Lock,
  LogOut,
  User,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUnreadMessageCount } from "@/hooks/use-messages";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Используем оптимизированный хук для счетчика
  const { data: unreadData, isLoading: isUnreadLoading } = useUnreadMessageCount();
  const unreadCount = unreadData?.count || 0;

  // Статистика для админов/модераторов
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: user?.role === 'admin' || user?.role === 'moderator',
    refetchInterval: 30000,
  });

  const menuItems = [
    {
      id: "catalog",
      label: "Каталог",
      icon: Car,
      description: "Все автомобили"
    },
    {
      id: "favorites", 
      label: "Избранное",
      icon: Heart,
      description: "Любимые авто"
    },
    {
      id: "my-cars",
      label: "Мои авто",
      icon: Car,
      description: "Управление автомобилями"
    },
    {
      id: "applications",
      label: "Мои заявки", 
      icon: FileText,
      description: "Статус заявок"
    },
    {
      id: "messages",
      label: "Сообщения",
      icon: MessageSquare,
      description: "Переписка",
      badge: unreadCount,
      isLoading: isUnreadLoading
    },
    {
      id: "security",
      label: "Безопасность",
      icon: Lock,
      description: "Настройки безопасности"
    }
  ];

  const adminMenuItems = [
    {
      id: "moderation",
      label: "Заявки",
      icon: Shield,
      description: "Модерация заявок",
      badge: stats?.pendingApplications,
      roles: ['admin', 'moderator']
    },
    {
      id: "message-moderation", 
      label: "Модерация",
      icon: BarChart3,
      description: "Модерация сообщений",
      badge: stats?.unmoderatedMessages,
      roles: ['admin', 'moderator']
    },
    {
      id: "users",
      label: "Пользователи",
      icon: Users, 
      description: "Управление пользователями",
      roles: ['admin']
    }
  ];

  const canShowAdminItem = (item: any) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  };

  const renderMenuItem = (item: any) => (
    <Button
      key={item.id}
      variant={activeSection === item.id ? "secondary" : "ghost"}
      className={`w-full justify-start h-auto p-3 mb-2 ${
        activeSection === item.id 
          ? "bg-emerald-600 text-white hover:bg-emerald-700" 
          : "text-slate-300 hover:text-white hover:bg-slate-800"
      }`}
      onClick={() => onSectionChange(item.id)}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-3">
          <item.icon className="h-5 w-5 flex-shrink-0" />
          <div className="text-left min-w-0">
            <div className="font-medium">{item.label}</div>
            {!isCollapsed && item.description && (
              <div className="text-xs opacity-75 truncate">
                {item.description}
              </div>
            )}
          </div>
        </div>
        
        {/* Счетчик */}
        <div className="flex items-center space-x-2">
          {item.isLoading && (
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          )}
          
          {item.badge && !item.isLoading && item.badge > 0 && (
            <Badge 
              className={`text-xs min-w-[20px] h-5 flex items-center justify-center p-0 ${
                item.id === 'messages' 
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-amber-500 text-amber-900 hover:bg-amber-600'
              }`}
            >
              {item.badge > 99 ? '99+' : item.badge}
            </Badge>
          )}
        </div>
      </div>
    </Button>
  );

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-80'} bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-300`}>
      {/* Заголовок */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-white">RMRP</h1>
                <p className="text-xs text-slate-400">Russian Motor Racing</p>
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-white"
          >
            <Car className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Навигация */}
      <ScrollArea className="flex-1 px-3 py-6">
        <div className="space-y-2">
          {/* Основные разделы */}
          <div className="mb-6">
            {!isCollapsed && (
              <h3 className="px-3 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Основное
              </h3>
            )}
            {menuItems.map(renderMenuItem)}
          </div>

          {/* Админ разделы */}
          {(user?.role === 'admin' || user?.role === 'moderator') && (
            <div className="mb-6">
              {!isCollapsed && (
                <h3 className="px-3 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Администрирование
                </h3>
              )}
              {adminMenuItems
                .filter(canShowAdminItem)
                .map(renderMenuItem)}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Профиль пользователя */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
            <User className="h-5 w-5 text-slate-400" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.username}
              </p>
              <p className="text-xs text-slate-400 capitalize">
                {user?.role === 'admin' ? 'Администратор' : 
                 user?.role === 'moderator' ? 'Модератор' : 'Пользователь'}
              </p>
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-700"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-3" />
          {!isCollapsed && "Выйти"}
        </Button>
      </div>
    </div>
  );
}
