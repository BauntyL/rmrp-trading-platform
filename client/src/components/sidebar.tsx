import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { CarApplication } from "@shared/schema";
import {
  Car,
  Heart,
  Plus,
  ClipboardList,
  Shield,
  Users,
  Moon,
  Sun,
  MessageCircle,
  LogOut,
  Crown,
  Lock,
  MessageCircle,
} from "lucide-react";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: any) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const { data: myApplications = [] } = useQuery<CarApplication[]>({
    queryKey: ["/api/my-applications"],
  });

  const { data: pendingApplications = [] } = useQuery<CarApplication[]>({
    queryKey: ["/api/applications/pending"],
    enabled: user?.role === "moderator" || user?.role === "admin",
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const pendingCount = myApplications.filter(app => app.status === "pending").length;
  const pendingModerationCount = pendingApplications.length;

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
            <h1 className="text-xl font-bold text-white">АвтоКаталог</h1>
            <p className="text-slate-400 text-sm">v2.0</p>
          </div>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/40 to-primary rounded-full flex items-center justify-center">
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
        <Button
          variant={activeSection === "catalog" ? "default" : "ghost"}
          className={`w-full justify-start ${
            activeSection === "catalog" 
              ? "bg-primary text-white" 
              : "text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
          onClick={() => onSectionChange("catalog")}
        >
          <Car className="h-5 w-5 mr-3" />
          Каталог автомобилей
        </Button>

        <Button
          variant={activeSection === "favorites" ? "default" : "ghost"}
          className={`w-full justify-start ${
            activeSection === "favorites" 
              ? "bg-primary text-white" 
              : "text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
          onClick={() => onSectionChange("favorites")}
        >
          <Heart className="h-5 w-5 mr-3" />
          Избранное
          {favorites.length > 0 && (
            <Badge className="ml-auto bg-slate-600 text-slate-200">
              {favorites.length}
            </Badge>
          )}
        </Button>

        <Button
          variant={activeSection === "messages" ? "default" : "ghost"}
          className={`w-full justify-start ${
            activeSection === "messages" 
              ? "bg-primary text-white" 
              : "text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
          onClick={() => onSectionChange("messages")}
        >
          <MessageCircle className="h-5 w-5 mr-3" />
          Сообщения
        </Button>

        <Button
          variant={activeSection === "security" ? "default" : "ghost"}
          className={`w-full justify-start ${
            activeSection === "security" 
              ? "bg-primary text-white" 
              : "text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
          onClick={() => onSectionChange("security")}
        >
          <Lock className="h-5 w-5 mr-3" />
          Безопасность
        </Button>

        <Button
          variant={activeSection === "my-cars" ? "default" : "ghost"}
          className={`w-full justify-start ${
            activeSection === "my-cars" 
              ? "bg-primary text-white" 
              : "text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
          onClick={() => onSectionChange("my-cars")}
        >
          <Plus className="h-5 w-5 mr-3" />
          Мои автомобили
        </Button>

        <Button
          variant={activeSection === "applications" ? "default" : "ghost"}
          className={`w-full justify-start ${
            activeSection === "applications" 
              ? "bg-primary text-white" 
              : "text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
          onClick={() => onSectionChange("applications")}
        >
          <ClipboardList className="h-5 w-5 mr-3" />
          Мои заявки
          {pendingCount > 0 && (
            <Badge className="ml-auto bg-amber-500 text-amber-900">
              {pendingCount}
            </Badge>
          )}
        </Button>

        {(user?.role === "moderator" || user?.role === "admin") && (
          <div className="pt-4 border-t border-slate-700 space-y-2">
            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Модерация
            </p>
            
            <Button
              variant={activeSection === "moderation" ? "default" : "ghost"}
              className={`w-full justify-start ${
                activeSection === "moderation" 
                  ? "bg-primary text-white" 
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
              onClick={() => onSectionChange("moderation")}
            >
              <Shield className="h-5 w-5 mr-3" />
              Заявки на модерацию
              {pendingModerationCount > 0 && (
                <Badge className="ml-auto bg-red-500 text-red-100">
                  {pendingModerationCount}
                </Badge>
              )}
            </Button>

            {user?.role === "admin" && (
              <Button
                variant={activeSection === "users" ? "default" : "ghost"}
                className={`w-full justify-start ${
                  activeSection === "users" 
                    ? "bg-primary text-white" 
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
                onClick={() => onSectionChange("users")}
              >
                <Users className="h-5 w-5 mr-3" />
                Управление пользователями
              </Button>
            )}
          </div>
        )}
      </nav>

      {/* Theme Toggle & Logout */}
      <div className="p-4 border-t border-slate-700 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:bg-slate-700 hover:text-white"
          onClick={toggleTheme}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 mr-3" />
          ) : (
            <Moon className="h-5 w-5 mr-3" />
          )}
          {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
        </Button>
        
        <Button
          variant="ghost"
          className="w-full justify-start text-red-400 hover:bg-red-900/20 hover:text-red-300"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Выйти
        </Button>
      </div>
    </aside>
  );
}
