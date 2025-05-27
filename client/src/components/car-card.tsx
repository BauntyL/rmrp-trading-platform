import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { 
  Eye, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Copy, 
  MessageCircle, 
  Heart 
} from "lucide-react";
import { CarDetailsModal } from "@/components/car-details-modal";
import { ContactSellerModal } from "@/components/contact-seller-modal";

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

interface CarCardProps {
  car: any;
  showEditButton?: boolean;
  showModerationActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onModerate?: (action: 'approve' | 'reject') => void;
}

export default function CarCard({ 
  car, 
  showEditButton = false, 
  showModerationActions = false,
  onEdit, 
  onDelete, 
  onModerate 
}: CarCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Получаем избранное пользователя
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  // Проверяем, находится ли автомобиль в избранном
  const isFavorite = Array.isArray(favorites) && favorites.some((fav: any) => fav.id === car.id);
  const isOwner = user?.id === car.userId;

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

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем открытие модала деталей
    
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

  const copyPhoneNumber = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Извлекаем номер телефона из contactInfo
    const phoneMatch = car.contactInfo?.match(/📞\s*([^|]*)/);
    const phone = phoneMatch ? phoneMatch[1].trim() : car.contactInfo;
    
    if (phone) {
      navigator.clipboard.writeText(phone).then(() => {
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
    }
  };

  const handleContactClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContactModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      const confirmed = window.confirm('Вы уверены, что хотите удалить это объявление?');
      if (confirmed) {
        onDelete();
      }
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit();
  };

  const handleModerateClick = (e: React.MouseEvent, action: 'approve' | 'reject') => {
    e.stopPropagation();
    if (onModerate) onModerate(action);
  };

  return (
    <>
      <Card 
        className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-all duration-200 cursor-pointer group overflow-hidden"
        onClick={() => setDetailsOpen(true)}
      >
        <CardContent className="p-0">
          {/* Изображение с кнопкой избранного */}
          <div className="relative">
            <div className="aspect-video bg-slate-700 overflow-hidden">
              <img
                src={car.imageUrl || 'https://via.placeholder.com/400x225?text=Нет+фото'}
                alt={car.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/400x225?text=Нет+фото';
                }}
              />
            </div>
            
            {/* Кнопка избранного в правом верхнем углу */}
            {!isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavoriteClick}
                disabled={toggleFavoriteMutation.isPending}
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 border-0 backdrop-blur-sm"
              >
                <Heart 
                  className={`h-4 w-4 ${
                    isFavorite ? 'fill-red-500 text-red-500' : 'text-white'
                  }`} 
                />
              </Button>
            )}
            
            {/* Статус */}
            {car.status === 'pending' && (
              <Badge className="absolute top-3 left-3 bg-yellow-500 text-black">
                На модерации
              </Badge>
            )}
            
            {car.status === 'rejected' && (
              <Badge className="absolute top-3 left-3 bg-red-500 text-white">
                Отклонено
              </Badge>
            )}
          </div>
          
          {/* Информация об автомобиле */}
          <div className="p-6 space-y-4">
            {/* Заголовок и цена */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                {car.name}
              </h3>
              <p className="text-2xl font-bold text-emerald-400">
                {car.price ? `${car.price.toLocaleString('ru-RU')} ₽` : 'Цена не указана'}
              </p>
            </div>
            
            {/* Характеристики */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-400">Сервер:</span>
                <p className="text-white font-medium">
                  {SERVER_NAMES[car.server] || car.server || 'Не указано'}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Категория:</span>
                <p className="text-white font-medium">
                  {CATEGORY_NAMES[car.category] || car.category || 'Не указано'}
                </p>
              </div>
            </div>
            
            {/* Описание */}
            {car.description && (
              <p className="text-slate-300 text-sm line-clamp-2">
                {car.description}
              </p>
            )}
            
            {/* Кнопки действий */}
            <div className="flex flex-wrap gap-2 pt-2">
              {/* Кнопка детали */}
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                <Eye className="h-4 w-4 mr-2" />
                Детали
              </Button>
              
              {/* Кнопки для не владельца */}
              {!isOwner && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={copyPhoneNumber}
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleContactClick}
                    className="bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              {/* Кнопки для владельца */}
              {showEditButton && isOwner && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleEditClick}
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleDeleteClick}
                    className="bg-red-600 border-red-500 text-white hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              {/* Кнопки модерации */}
              {showModerationActions && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => handleModerateClick(e, 'approve')}
                    className="bg-green-600 border-green-500 text-white hover:bg-green-700"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => handleModerateClick(e, 'reject')}
                    className="bg-red-600 border-red-500 text-white hover:bg-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Модалы */}
      <CarDetailsModal
        car={car}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <ContactSellerModal
        car={car}
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
      />
    </>
  );
}
