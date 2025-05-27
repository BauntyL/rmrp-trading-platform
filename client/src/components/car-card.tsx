import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
  Zap,
  Gauge,
  Settings,
  Crown,
  Calendar,
  Shield
} from "lucide-react";
import { ContactSellerModal } from "@/components/contact-seller-modal";
import { CarDetailsModal } from "@/components/car-details-modal";
import { EditCarModal } from "@/components/edit-car-modal";
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal";

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Получаем данные избранного
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    refetchInterval: 30000,
  });
  
  const isFavorite = Array.isArray(favorites) && favorites.some((fav: any) => fav.id === car.id);

  // Мутация для добавления/удаления из избранного
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      const method = isFavorite ? 'DELETE' : 'POST';
      const response = await fetch(`/api/favorites/${car.id}`, {
        method,
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
      setDeleteModalOpen(false);
      toast({
        title: "Автомобиль удален",
        description: "Объявление успешно удалено",
      });
    },
    onError: (error: any) => {
      setDeleteModalOpen(false);
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Мутация для модерации заявок
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

  const handleModeration = (status: 'approved' | 'rejected') => {
    moderateApplicationMutation.mutate(status);
  };

  const handleDeleteConfirm = () => {
    deleteCarMutation.mutate();
  };

  // Проверки прав доступа
  const isOwner = user && (user.id === car.createdBy || user.id === car.owner_id);
  const canEdit = user && (isOwner || user.role === 'admin');
  const canDelete = user && (isOwner || user.role === 'admin' || user.role === 'moderator');

  // ✅ УЛУЧШЕННОЕ ФОРМАТИРОВАНИЕ ДАТЫ
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Дата не указана';
    
    try {
      const date = new Date(dateString);
      
      // Проверка на валидность даты
      if (isNaN(date.getTime())) {
        return 'Некорректная дата';
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      // Только что (менее 1 минуты)
      if (diffMinutes < 1) {
        return 'Только что';
      }
      
      // Минуты назад (1-59 минут)
      if (diffMinutes < 60) {
        return `${diffMinutes} мин. назад`;
      }
      
      // Часы назад (1-23 часа)
      if (diffHours < 24) {
        return `${diffHours} ч. назад`;
      }
      
      // Дни назад (1-6 дней)
      if (diffDays < 7) {
        return `${diffDays} дн. назад`;
      }
      
      // Если дата сегодня - показываем время
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      
      if (isToday) {
        return `Сегодня в ${date.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      }
      
      // Если дата вчера
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();
      
      if (isYesterday) {
        return `Вчера в ${date.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      }
      
      // Для остальных дат - полный формат
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Ошибка форматирования даты:', error);
      return 'Дата не указана';
    }
  };

  // ✅ ФУНКЦИЯ ДЛЯ ПОЛНОЙ ДАТЫ В TOOLTIP
  const getFullDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Дата не указана';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Некорректная дата';
      
      return date.toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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
          {/* Заголовок и цена */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                {car.name}
              </h3>
              <p className="text-2xl font-bold text-emerald-400">
                {car.price ? `${car.price.toLocaleString()} ₽` : 'Цена не указана'}
              </p>
            </div>
          </div>

          {/* Категория и сервер */}
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="bg-slate-700 text-slate-300 border-0">
              {car.category}
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-400">
              {car.server}
            </Badge>
          </div>

          {/* Характеристики */}
          <div className="grid grid-cols-2 gap-2 text-sm text-slate-400 mb-4">
            {car.maxSpeed && (
              <div className="flex items-center">
                <Zap className="h-4 w-4 mr-1 text-emerald-400" />
                <span>{car.maxSpeed} км/ч</span>
              </div>
            )}
            {car.drive && (
              <div className="flex items-center">
                <Settings className="h-4 w-4 mr-1 text-emerald-400" />
                <span>{car.drive}</span>
              </div>
            )}
          </div>

          {/* Описание */}
          {car.description && (
            <p className="text-slate-400 text-sm mb-4 line-clamp-2">
              {car.description}
            </p>
          )}

          {/* ✅ УЛУЧШЕННАЯ ДАТА СОЗДАНИЯ С TOOLTIP */}
          <div className="flex items-center text-xs text-slate-500 mb-4">
            <Calendar className="h-3 w-3 mr-1" />
            <span 
              title={getFullDate(car.createdAt || car.created_at)}
              className="cursor-help"
            >
              Добавлено: {formatDate(car.createdAt || car.created_at)}
            </span>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 space-y-3">
          {/* Кнопки модерации (для заявок) */}
          {showModerationButtons && (
            <div className="flex space-x-2 w-full">
              <Button
                onClick={() => handleModeration('approved')}
                disabled={moderateApplicationMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Check className="h-4 w-4 mr-1" />
                Одобрить
              </Button>
              <Button
                onClick={() => handleModeration('rejected')}
                disabled={moderateApplicationMutation.isPending}
                variant="destructive"
                className="flex-1"
                size="sm"
              >
                <X className="h-4 w-4 mr-1" />
                Отклонить
              </Button>
            </div>
          )}

          {/* Основные кнопки действий */}
          <div className="flex space-x-2 w-full">
            {/* Кнопка "Подробнее" */}
            <Button
              onClick={() => setDetailsModalOpen(true)}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-1" />
              Подробнее
            </Button>

            {/* Кнопка "Связаться" */}
            <Button
              onClick={() => setContactModalOpen(true)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Связаться
            </Button>

            {/* Кнопка телефона */}
            {car.phone && (
              <Button
                onClick={handleCopyPhone}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <Phone className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Кнопки редактирования/удаления */}
          {(showEditButton || canEdit || canDelete) && (
            <div className="flex space-x-2 w-full">
              {canEdit && (
                <Button
                  onClick={() => setEditModalOpen(true)}
                  variant="outline"
                  className="flex-1 border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                  size="sm"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Редактировать
                </Button>
              )}
              
              {canDelete && (
                <Button
                  onClick={() => setDeleteModalOpen(true)}
                  variant="destructive"
                  className="flex-1"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Удалить
                </Button>
              )}
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Модальные окна */}
      <ContactSellerModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        car={car}
      />

      <CarDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        car={car}
      />

      {editModalOpen && (
        <EditCarModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          car={car}
        />
      )}

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Удалить автомобиль"
        message="Вы уверены, что хотите удалить это объявление? Это действие нельзя будет отменить."
        isLoading={deleteCarMutation.isPending}
      />
    </>
  );
}
