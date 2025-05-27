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
  Eye
} from "lucide-react";
import { ContactSellerModal } from "@/components/contact-seller-modal";
import { EditCarModal } from "@/components/edit-car-modal";
import { CarDetailsModal } from "@/components/car-details-modal";

// Константы для отображения
const SERVER_NAMES = {
  arbat: 'Арбат',
  patriki: 'Патрики', 
  rublevka: 'Рублёвка',
  tverskoy: 'Тверской'
};

const CATEGORY_NAMES = {
  standard: 'Стандарт',
  sport: 'Спорт',
  coupe: 'Купе',
  suv: 'Внедорожник',
  service: 'Служебная',
  motorcycle: 'Мотоцикл'
};

const DRIVE_TYPE_NAMES = {
  front: 'Передний',
  rear: 'Задний',
  all: 'Полный'
};

interface CarCardProps {
  car: any;
  showEditButton?: boolean;
  showModerationActions?: boolean;
}

export function CarCard({ car, showEditButton = false, showModerationActions = false }: CarCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Проверка, является ли автомобиль избранным
  const { data: favorites = [] } = useQueryClient().getQueryData(["/api/favorites"]) || { data: [] };
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
      queryClient.invalidateQueries({ queryKey: ["/api/cars/my"] });
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
  const moderateCarMutation = useMutation({
    mutationFn: async (action: 'approve' | 'reject') => {
      const response = await fetch(`/api/cars/${car.id}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка модерации');
      }

      return response.json();
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/pending"] });
      toast({
        title: action === 'approve' ? "Объявление одобрено" : "Объявление отклонено",
        description: action === 'approve' 
          ? "Объявление опубликовано в каталоге" 
          : "Объявление отклонено и удалено",
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

  // Функции-обработчики
  const handleFavoriteClick = () => {
    if (!user) {
      toast({
        title: "Требуется авторизация",
        description: "Войдите в систему для добавления в избранное",
        variant: "destructive",
      });
      return;
    }
    toggleFavoriteMutation.mutate();
  };

  const handleDeleteClick = () => {
    if (window.confirm('Вы уверены, что хотите удалить это объявление?')) {
      deleteCarMutation.mutate();
    }
  };

  const handleModeration = (action: 'approve' | 'reject') => {
    const confirmMessage = action === 'approve' 
      ? 'Одобрить это объявление?' 
      : 'Отклонить это объявление?';
    
    if (window.confirm(confirmMessage)) {
      moderateCarMutation.mutate(action);
    }
  };

  // Функция для копирования номера телефона
  const copyPhoneNumber = () => {
    if (car.contactInfo) {
      // Пытаемся извлечь номер телефона из контактной информации
      let phoneNumber = car.contactInfo;
      
      // Если это форматированная строка, извлекаем телефон
      const phoneMatch = car.contactInfo.match(/📞\s*([^|]*)/);
      if (phoneMatch) {
        phoneNumber = phoneMatch[1].trim();
      }
      
      navigator.clipboard.writeText(phoneNumber).then(() => {
        toast({
          title: "Номер скопирован!",
          description: "Номер телефона скопирован в буфер обмена",
        });
      }).catch(() => {
        toast({
          title: "Ошибка",
          description: "Не удалось скопировать номер",
          variant: "destructive",
        });
      });
    } else {
      toast({
        title: "Номер не указан",
        description: "У этого объявления нет номера телефона",
        variant: "destructive",
      });
    }
  };

  const canEdit = user && (user.id === car.userId || user.role === 'admin');
  const canDelete = user && (user.id === car.userId || user.role === 'admin');
  const isOwner = user?.id === car.userId;

  return (
    <>
      <Card className="bg-slate-800 border-slate-700 overflow-hidden group hover:shadow-xl transition-all duration-300">
        <div className="relative">
          {/* Изображение */}
          <div className="aspect-video bg-slate-700 overflow-hidden">
            <img
              src={car.imageUrl || 'https://via.placeholder.com/400x300?text=Нет+фото'}
              alt={car.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://via.placeholder.com/400x300?text=Нет+фото';
              }}
            />
          </div>

          {/* Статус */}
          {car.status === 'pending' && (
            <Badge className="absolute top-3 left-3 bg-yellow-500 text-black">
              На модерации
            </Badge>
          )}

          {/* Кнопка избранного */}
          {!isOwner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFavoriteClick}
              disabled={toggleFavoriteMutation.isPending}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 border-0"
            >
              <Heart 
                className={`h-4 w-4 ${
                  isFavorite ? 'fill-red-500 text-red-500' : 'text-white'
                }`} 
              />
            </Button>
          )}
        </div>

        <CardContent className="p-4">
          {/* Название */}
          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
            {car.name}
          </h3>

          {/* Основная информация */}
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex justify-between">
              <span>Цена:</span>
              <span className="text-green-400 font-semibold">
                {car.price ? `${car.price.toLocaleString('ru-RU')} ₽` : 'Цена не указана'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Сервер:</span>
              <span className="text-white">{SERVER_NAMES[car.server] || car.server || 'Не указано'}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Категория:</span>
              <span className="text-white">{CATEGORY_NAMES[car.category] || car.category || 'Не указано'}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Привод:</span>
              <span className="text-white">{DRIVE_TYPE_NAMES[car.driveType] || car.driveType || 'Не указано'}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 space-y-3">
          {/* Основные кнопки - показываем только если НЕТ кнопок модерации */}
          {!showModerationActions && (
            <div className="flex space-x-2 w-full">
              <Button 
                onClick={() => setDetailsModalOpen(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                Подробнее
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={copyPhoneNumber}
                disabled={!car.contactInfo}
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                title="Скопировать номер телефона"
              >
                <Phone className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setContactModalOpen(true)}
                disabled={isOwner}
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                title="Написать сообщение"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Кнопки модерации - показываем ВМЕСТО основных кнопок */}
          {showModerationActions && (user?.role === 'moderator' || user?.role === 'admin') && (
            <div className="space-y-2 w-full">
              {/* Кнопка "Подробнее" для модераторов */}
              <div className="flex space-x-2 w-full">
                <Button 
                  onClick={() => setDetailsModalOpen(true)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Подробнее
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPhoneNumber}
                  disabled={!car.contactInfo}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  title="Скопировать номер"
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
              
              {/* Кнопки модерации на отдельной строке */}
              <div className="flex space-x-2 w-full">
                <Button
                  onClick={() => handleModeration('approve')}
                  disabled={moderateCarMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Одобрить
                </Button>
                
                <Button
                  onClick={() => handleModeration('reject')}
                  disabled={moderateCarMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Отклонить
                </Button>
              </div>
            </div>
          )}

          {/* Кнопки для владельца - показываем только в режиме редактирования */}
          {showEditButton && canEdit && !showModerationActions && (
            <div className="flex space-x-2 w-full">
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
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Модалы */}
      <CarDetailsModal
        car={car}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />
      
      <ContactSellerModal
        car={car}
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
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

// Добавляем экспорт по умолчанию
export default CarCard;
