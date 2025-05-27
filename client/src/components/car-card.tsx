import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { 
  Heart, 
  MessageCircle, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Phone,
  Eye,
  Copy,
  Zap,
  Gauge,
  Settings,
  Crown,
  Calendar
} from "lucide-react";
import { ContactSellerModal } from "@/components/contact-seller-modal";
import { CarDetailsModal } from "@/components/car-details-modal";
import { EditCarModal } from "@/components/edit-car-modal";

interface CarCardProps {
  car: any;
  showEditButton?: boolean;
  showModerationButtons?: boolean;
}

export function CarCard({ car, showEditButton = false, showModerationButtons = false }: CarCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Получаем данные избранного
  const { data: favorites = [] } = queryClient.getQueryData(["/api/favorites"]) || [];
  const isFavorite = Array.isArray(favorites) && favorites.some((fav: any) => fav.id === car.id);

  // Мутация для добавления/удаления из избранного
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/favorites/${car.id}`, {
        method: isFavorite ? 'DELETE' : 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при работе с избранным');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      toast({
        title: isFavorite ? "Удалено из избранного" : "Добавлено в избранное",
        description: isFavorite 
          ? "Автомобиль удален из избранного" 
          : "Автомобиль добавлен в избранное",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Мутация для удаления автомобиля
  const deleteCarMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/cars/${car.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка удаления');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-cars"] });
      toast({
        title: "Автомобиль удален",
        description: "Объявление успешно удалено",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Мутация для модерации
  const moderateApplicationMutation = useMutation({
    mutationFn: async (status: 'approved' | 'rejected') => {
      const response = await fetch(`/api/applications/${car.id}/status`, {
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
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/pending"] });
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

  // Функции обработчиков
  const handleFavoriteClick = () => {
    if (!user) {
      toast({
        title: "Требуется авторизация",
        description: "Войдите в систему, чтобы добавлять в избранное",
        variant: "destructive",
      });
      return;
    }
    toggleFavoriteMutation.mutate();
  };

  const handleCopyPhone = async () => {
    if (!car.phone) {
      toast({
        title: "Телефон не указан",
        description: "У этого объявления нет номера телефона",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(car.phone);
      toast({
        title: "Телефон скопирован",
        description: `Номер ${car.phone} скопирован в буфер обмена`,
      });
    } catch (error) {
      toast({
        title: "Ошибка копирования",
        description: "Не удалось скопировать номер телефона",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = () => {
    if (window.confirm('Вы уверены, что хотите удалить это объявление?')) {
      deleteCarMutation.mutate();
    }
  };

  const handleModeration = (status: 'approved' | 'rejected') => {
    const confirmMessage = status === 'approved' 
      ? 'Одобрить эту заявку?' 
      : 'Отклонить эту заявку?';
    
    if (window.confirm(confirmMessage)) {
      moderateApplicationMutation.mutate(status);
    }
  };

  // Проверки прав доступа
  const canEdit = user && (user.id === car.createdBy || user.id === car.owner_id || user.role === 'admin');
  const canDelete = user && (user.id === car.createdBy || user.id === car.owner_id || user.role === 'admin');
  const isOwner = user && (user.id === car.createdBy || user.id === car.owner_id);

  // Форматирование даты
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Дата не указана';
    }
  };

  return (
    <>
      <Card className="bg-slate-800 border-slate-700 overflow-hidden group hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1">
        <div className="relative">
          {/* Изображение */}
          <div className="aspect-video bg-slate-700 overflow-hidden">
            <img
              src={car.imageUrl || 'https://via.placeholder.com/400x300/1e293b/64748b?text=Нет+фото'}
              alt={car.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://via.placeholder.com/400x300/1e293b/64748b?text=Нет+фото';
              }}
            />
          </div>

          {/* Premium значок */}
          {car.isPremium && (
            <Badge className="absolute top-3 left-3 bg-amber-500 text-amber-900 border-0">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          )}

          {/* Статус модерации */}
          {car.status && car.status !== 'approved' && (
            <Badge className={`absolute top-3 ${car.isPremium ? 'left-20' : 'left-3'} border-0 ${
              car.status === 'pending' ? 'bg-yellow-500 text-yellow-900' :
              car.status === 'rejected' ? 'bg-red-500 text-red-100' : ''
            }`}>
              {car.status === 'pending' && 'На модерации'}
              {car.status === 'rejected' && 'Отклонено'}
            </Badge>
          )}

          {/* Кнопка избранного */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFavoriteClick}
            disabled={toggleFavoriteMutation.isPending}
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/50 hover:bg-black/70 border-0 backdrop-blur-sm"
          >
            <Heart 
              className={`h-4 w-4 transition-colors ${
                isFavorite ? 'fill-red-500 text-red-500' : 'text-white hover:text-red-400'
              }`} 
            />
          </Button>
        </div>

        <CardContent className="p-4">
          {/* Название и цена */}
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">
              {car.name}
            </h3>
            <div className="text-2xl font-bold text-emerald-400">
              {car.price ? `$${car.price.toLocaleString()}` : 'Цена не указана'}
            </div>
          </div>

          {/* Категория и сервер */}
          <div className="flex items-center gap-2 mb-3 text-sm">
            <Badge variant="secondary" className="bg-slate-700 text-slate-300">
              {car.category || 'Не указано'}
            </Badge>
            {car.server && (
              <Badge variant="outline" className="border-slate-600 text-slate-400">
                {car.server}
              </Badge>
            )}
          </div>

          {/* Описание */}
          {car.description && (
            <p className="text-slate-400 text-sm mb-3 line-clamp-2">
              {car.description}
            </p>
          )}

          {/* Характеристики */}
          <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
            {car.maxSpeed && (
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span>{car.maxSpeed} км/ч</span>
              </div>
            )}
            {car.acceleration && (
              <div className="flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                <span>{car.acceleration}с</span>
              </div>
            )}
            {car.drive && (
              <div className="flex items-center gap-1">
                <Settings className="h-3 w-3" />
                <span>{car.drive}</span>
              </div>
            )}
          </div>

          {/* Дата добавления */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="h-3 w-3" />
            <span>Добавлено: {formatDate(car.createdAt)}</span>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 space-y-3">
          {/* Основные кнопки действий */}
          {!isOwner && (
            <div className="flex gap-2 w-full">
              <Button 
                onClick={() => setDetailsModalOpen(true)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                Детали
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPhone}
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                title="Копировать телефон"
              >
                <Phone className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setContactModalOpen(true)}
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                title="Написать сообщение"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Кнопки для владельца */}
          {showEditButton && canEdit && (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(true)}
                className="flex-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600 text-sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Редактировать
              </Button>
              
              {canDelete && (
                <Button
                  variant="outline"
                  onClick={handleDeleteClick}
                  disabled={deleteCarMutation.isPending}
                  className="bg-red-600 border-red-600 text-white hover:bg-red-700"
                  title="Удалить"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Кнопки модерации */}
          {showModerationButtons && (user?.role === 'moderator' || user?.role === 'admin') && (
            <div className="flex gap-2 w-full">
              <Button
                onClick={() => handleModeration('approved')}
                disabled={moderateApplicationMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
              >
                <Check className="h-4 w-4 mr-2" />
                Одобрить
              </Button>
              
              <Button
                onClick={() => handleModeration('rejected')}
                disabled={moderateApplicationMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-sm"
              >
                <X className="h-4 w-4 mr-2" />
                Отклонить
              </Button>
            </div>
          )}

          {/* Статус для владельца */}
          {isOwner && car.status && (
            <div className="w-full text-center text-sm">
              <Badge className={`${
                car.status === 'pending' ? 'bg-yellow-500 text-yellow-900' :
                car.status === 'approved' ? 'bg-green-500 text-green-900' :
                car.status === 'rejected' ? 'bg-red-500 text-red-100' : ''
              }`}>
                {car.status === 'pending' && 'Ожидает модерации'}
                {car.status === 'approved' && 'Опубликовано'}
                {car.status === 'rejected' && 'Отклонено модератором'}
              </Badge>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Модальные окна */}
      <ContactSellerModal
        car={car}
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
      />
      
      <CarDetailsModal
        car={car}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />
      
      {editModalOpen && (
        <EditCarModal
          car={car}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
        />
      )}
    </>
  );
}
