import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { UnreadMessagesCounter } from "@/components/unread-messages-counter";
import { CarApplication } from "@shared/schema";
import {
  Car,
  Heart,
  Plus,
  ClipboardList,
  Shield,
  Users,
  MessageCircle,
  LogOut,
  Crown,
  Lock,
  Send,
  BarChart3,
} from "lucide-react";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: any) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const { user, logoutMutation } = useAuth();

  const { data: myApplications = [] } = useQuery<CarApplication[]>({
    queryKey: ["/api/my-applications"],
    refetchInterval: 5000, // Автообновление каждые 5 секунд
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const { data: pendingApplications = [] } = useQuery<CarApplication[]>({
    queryKey: ["/api/applications/pending"],
    enabled: user?.role === "moderator" || user?.role === "admin",
    refetchInterval: 5000, // Автообновление заявок для модераторов каждые 5 секунд
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    refetchInterval: 10000, // Автообновление избранного каждые 10 секунд
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  // Статистика для админов/модераторов
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: user?.role === "moderator" || user?.role === "admin",
    refetchInterval: 10000, // Автообновление статистики каждые 10 секунд
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const pendingCount = myApplications.filter(app => app.status === "pending").length;
  const pendingModerationCount = pendingApplications.length;
  const unmoderatedMessagesCount = stats?.unmoderatedMessages || 0;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-amber-500 text-amber-900 hover:bg-amber-500">
            <Crown className="h-3 w-3 mr-1" />
            Администратор
          </Badge>
        );
      case "moderator":
        return (
          <Badge className="bg-blue-500 text-blue-100 hover:bg-blue-500">
            <Shield className="h-3 w-3 mr-1" />
            Модератор
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            Пользователь
          </Badge>
        );
    }
  };

  return (
    <aside className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col">
      {/* Logo and Brand */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Car className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">RMRP</h1>
            <p className="text-slate-400 text-sm">Russian Motor Racing Platform</p>
          </div>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/40 to-emerald-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-lg">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{user?.username}</p>
            <div className="mt-1">
              {getRoleBadge(user?.role || "user")}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* Основные разделы */}
        <div className="space-y-1">
          <Button
            variant={activeSection === "catalog" ? "default" : "ghost"}
            className={`w-full justify-start h-auto py-3 ${
              activeSection === "catalog" 
                ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
            onClick={() => onSectionChange("catalog")}
          >
            <Car className="h-5 w-5 mr-3 flex-shrink-0" />
            <div className="flex-1 text-left">
              <div className="font-medium">Каталог автомобилей</div>
              <div className="text-xs opacity-75">Все автомобили</div>
            </div>
          </Button>

          <Button
            variant={activeSection === "favorites" ? "default" : "ghost"}
            className={`w-full justify-start h-auto py-3 ${
              activeSection === "favorites" 
                ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
            onClick={() => onSectionChange("favorites")}
          >
            <Heart className="h-5 w-5 mr-3 flex-shrink-0" />
            <div className="flex-1 text-left">
              <div className="font-medium">Избранное</div>
              <div className="text-xs opacity-75">Любимые авто</div>
            </div>
            {favorites.length > 0 && (
              <Badge className="bg-slate-600 text-slate-200 text-xs">
                {favorites.length}
              </Badge>
            )}
          </Button>

          <Button
            variant={activeSection === "messages" ? "default" : "ghost"}
            className={`w-full justify-start h-auto py-3 ${
              activeSection === "messages" 
                ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
            onClick={() => onSectionChange("messages")}
          >
            <MessageCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            <div className="flex-1 text-left">
              <div className="font-medium">Сообщения</div>
              <div className="text-xs opacity-75">Переписка</div>
            </div>
            {/* Используем улучшенный счетчик */}
            <UnreadMessagesCounter />
          </Button>

          <Button
            variant={activeSection === "my-cars" ? "default" : "ghost"}
            className={`w-full justify-start h-auto py-3 ${
              activeSection === "my-cars" 
                ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
            onClick={() => onSectionChange("my-cars")}
          >
            <Plus className="h-5 w-5 mr-3 flex-shrink-0" />
            <div className="flex-1 text-left">
              <div className="font-medium">Мои автомобили</div>
              <div className="text-xs opacity-75">Управление авто</div>
            </div>
          </Button>

          <Button
            variant={activeSection === "applications" ? "default" : "ghost"}
            className={`w-full justify-start h-auto py-3 ${
              activeSection === "applications" 
                ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
            onClick={() => onSectionChange("applications")}
          >
            <ClipboardList className="h-5 w-5 mr-3 flex-shrink-0" />
            <div className="flex-1 text-left">
              <div className="font-medium">Мои заявки</div>
              <div className="text-xs opacity-75">Статус заявок</div>
            </div>
            {pendingCount > 0 && (
              <Badge className="bg-amber-500 text-amber-900 text-xs">
                {pendingCount}
              </Badge>
            )}
          </Button>

          <Button
            variant={activeSection === "security" ? "default" : "ghost"}
            className={`w-full justify-start h-auto py-3 ${
              activeSection === "security" 
                ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
            onClick={() => onSectionChange("security")}
          >
            <Lock className="h-5 w-5 mr-3 flex-shrink-0" />
            <div className="flex-1 text-left">
              <div className="font-medium">Безопасность</div>
              <div className="text-xs opacity-75">Настройки безопасности</div>
            </div>
          </Button>
        </div>

        {/* Админ разделы */}
        {(user?.role === "moderator" || user?.role === "admin") && (
          <div className="pt-6 border-t border-slate-700 space-y-1">
            <div className="px-3 mb-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Администрирование
              </h3>
            </div>
            
            <Button
              variant={activeSection === "moderation" ? "default" : "ghost"}
              className={`w-full justify-start h-auto py-3 ${
                activeSection === "moderation" 
                  ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
              onClick={() => onSectionChange("moderation")}
            >
              <Shield className="h-5 w-5 mr-3 flex-shrink-0" />
              <div className="flex-1 text-left">
                <div className="font-medium">Заявки на модерацию</div>
                <div className="text-xs opacity-75">Модерация заявок</div>
              </div>
              {pendingModerationCount > 0 && (
                <Badge className="bg-red-500 text-red-100 text-xs">
                  {pendingModerationCount}
                </Badge>
              )}
            </Button>

            <Button
              variant={activeSection === "message-moderation" ? "default" : "ghost"}
              className={`w-full justify-start h-auto py-3 ${
                activeSection === "message-moderation" 
                  ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
              onClick={() => onSectionChange("message-moderation")}
            >
              <BarChart3 className="h-5 w-5 mr-3 flex-shrink-0" />
              <div className="flex-1 text-left">
                <div className="font-medium">Модерация сообщений</div>
                <div className="text-xs opacity-75">Проверка сообщений</div>
              </div>
              {unmoderatedMessagesCount > 0 && (
                <Badge className="bg-amber-500 text-amber-900 text-xs">
                  {unmoderatedMessagesCount > 99 ? '99+' : unmoderatedMessagesCount}
                </Badge>
              )}
            </Button>

            {user?.role === "admin" && (
              <Button
                variant={activeSection === "users" ? "default" : "ghost"}
                className={`w-full justify-start h-auto py-3 ${
                  activeSection === "users" 
                    ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
                onClick={() => onSectionChange("users")}
              >
                <Users className="h-5 w-5 mr-3 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Управление пользователями</div>
                  <div className="text-xs opacity-75">Администрирование</div>
                </div>
              </Button>
            )}
          </div>
        )}
      </nav>

      {/* Footer: Telegram & Logout */}
      <div className="p-4 border-t border-slate-700 space-y-2">
        {/* Кнопка Telegram */}
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          onClick={() => window.open('https://t.me/bauntyprog', '_blank')}
        >
          <Send className="h-5 w-5 mr-3 text-blue-400" />
          <div className="flex-1 text-left">
            <div className="font-medium">Мы в Telegram</div>
            <div className="text-xs opacity-75">Техподдержка</div>
          </div>
        </Button>
        
        <Button
          variant="ghost"
          className="w-full justify-start text-red-400 hover:bg-red-900/20 hover:text-red-300"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-5 w-5 mr-3" />
          <div className="flex-1 text-left">
            <div className="font-medium">Выйти</div>
            <div className="text-xs opacity-75">Завершить сессию</div>
          </div>
        </Button>
      </div>
    </aside>
  );
}
