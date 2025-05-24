import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface SecurityEvent {
  type: "login_success" | "login_failed" | "ip_blocked" | "password_changed";
  timestamp: string;
  ip?: string;
  details?: string;
}

export function SecurityAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<SecurityEvent[]>([]);

  // Симуляция последних событий безопасности (в реальном проекте - с сервера)
  useEffect(() => {
    if (user) {
      const mockEvents: SecurityEvent[] = [
        {
          type: "login_success",
          timestamp: new Date().toISOString(),
          ip: "192.168.1.100",
          details: "Успешный вход в систему"
        }
      ];
      setAlerts(mockEvents);
    }
  }, [user]);

  const getEventIcon = (type: SecurityEvent["type"]) => {
    switch (type) {
      case "login_success":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "login_failed":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "ip_blocked":
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case "password_changed":
        return <Shield className="h-4 w-4 text-blue-400" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getEventBadge = (type: SecurityEvent["type"]) => {
    switch (type) {
      case "login_success":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Успешно</Badge>;
      case "login_failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Ошибка</Badge>;
      case "ip_blocked":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Блокировка</Badge>;
      case "password_changed":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Изменение</Badge>;
      default:
        return <Badge variant="secondary">Неизвестно</Badge>;
    }
  };

  if (!user) return null;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Shield className="h-5 w-5 text-primary" />
          <span>Безопасность аккаунта</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Общая информация о безопасности */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-300">Статус аккаунта</span>
            </div>
            <p className="text-lg font-semibold text-green-400 mt-1">Защищен</p>
          </div>
          
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-slate-300">Сила пароля</span>
            </div>
            <p className="text-lg font-semibold text-blue-400 mt-1">Сильный</p>
          </div>
          
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-slate-300">Сессия</span>
            </div>
            <p className="text-lg font-semibold text-purple-400 mt-1">Активна</p>
          </div>
        </div>

        {/* Рекомендации по безопасности */}
        <Alert className="bg-blue-500/10 border-blue-500/30">
          <Shield className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-300">
            <strong>Ваш аккаунт защищен:</strong> Активирована защита от брутфорс атак, 
            установлены сильные требования к паролю, ограничено время сессии до 2 часов.
          </AlertDescription>
        </Alert>

        {/* Последние события безопасности */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">Последние события</h4>
          {alerts.length > 0 ? (
            alerts.map((event, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getEventIcon(event.type)}
                  <div>
                    <p className="text-sm text-white">{event.details}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(event.timestamp).toLocaleString('ru-RU')}
                    </p>
                  </div>
                </div>
                {getEventBadge(event.type)}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">
              События безопасности не найдены
            </p>
          )}
        </div>

        {/* Советы по безопасности */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">Советы по безопасности</h4>
          <div className="grid grid-cols-1 gap-2 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span>Используйте уникальный пароль для каждого сайта</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span>Регулярно обновляйте пароль</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span>Не используйте общественные Wi-Fi для входа</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span>Выходите из системы после использования</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}