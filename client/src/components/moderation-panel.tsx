import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { 
  Check, 
  X, 
  Shield, 
  Calendar,
  User,
  Phone,
  MessageCircle
} from "lucide-react";

export function ModerationPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingApplications = [], isLoading } = useQuery({
    queryKey: ["/api/applications/pending"],
    refetchInterval: 5000,
  });

  const moderateApplicationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'approved' | 'rejected' }) => {
      const response = await fetch(`/api/applications/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка модерации');
      }

      return response.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      toast({
        title: status === 'approved' ? "Заявка одобрена" : "Заявка отклонена",
        description: status === 'approved' 
          ? "Автомобиль добавлен в каталог" 
          : "Заявка отклонена",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка модерации",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleModeration = (application: any, status: 'approved' | 'rejected') => {
    const confirmMessage = status === 'approved' 
      ? `Одобрить заявку на "${application.name}"?` 
      : `Отклонить заявку на "${application.name}"?`;
    
    if (window.confirm(confirmMessage)) {
      moderateApplicationMutation.mutate({ id: application.id, status });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Дата не указана';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Модерация заявок</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-800 rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-slate-700 rounded mb-2 w-1/3"></div>
              <div className="h-4 bg-slate-700 rounded mb-4 w-2/3"></div>
              <div className="h-8 bg-slate-700 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Модерация заявок</h1>
        <Badge className="bg-red-500 text-red-100">
          {pendingApplications.length} на рассмотрении
        </Badge>
      </div>

      {pendingApplications.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-400 mb-2">
            Нет заявок на модерацию
          </h3>
          <p className="text-slate-500">
            Все заявки рассмотрены
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingApplications.map((application: any) => (
            <Card key={application.id} className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex gap-6">
                  {/* Изображение */}
                  <div className="w-48 h-32 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={application.imageUrl || 'https://via.placeholder.com/200x150/1e293b/64748b?text=Нет+фото'}
                      alt={application.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/200x150/1e293b/64748b?text=Нет+фото';
                      }}
                    />
                  </div>

                  {/* Информация */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                          {application.name}
                        </h3>
                        <div className="flex items-center gap-3 text-sm">
                          <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                            {application.category}
                          </Badge>
                          <Badge variant="outline" className="border-slate-600 text-slate-400">
                            {application.server}
                          </Badge>
                          {application.isPremium && (
                            <Badge className="bg-amber-500 text-amber-900">
                              Premium
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-400 mb-1">
                          {application.price ? `${application.price.toLocaleString()} ₽` : 'Цена не указана'}
                        </div>
                      </div>
                    </div>

                    {/* Описание */}
                    {application.description && (
                      <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                        {application.description}
                      </p>
                    )}

                    {/* Характеристики */}
                    <div className="flex items-center gap-6 text-sm text-slate-400 mb-4">
                      {application.maxSpeed && (
                        <span>Макс. скорость: {application.maxSpeed} км/ч</span>
                      )}
                      {application.drive && (
                        <span>Привод: {application.drive}</span>
                      )}
                    </div>

                    {/* Контактная информация */}
                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{application.createdByUsername || 'Пользователь'}</span>
                      </div>
                      {application.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          <span>{application.phone}</span>
                        </div>
                      )}
                      {application.telegram && (
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          <span>{application.telegram}</span>
                        </div>
                      )}
                    </div>

                    {/* Дата подачи */}
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      <span>Подано: {formatDate(application.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0">
                <div className="flex gap-3 w-full">
                  <Button
                    onClick={() => handleModeration(application, 'approved')}
                    disabled={moderateApplicationMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Одобрить
                  </Button>
                  
                  <Button
                    onClick={() => handleModeration(application, 'rejected')}
                    disabled={moderateApplicationMutation.isPending}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Отклонить
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
