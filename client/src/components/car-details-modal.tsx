import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Heart, 
  Phone, 
  MessageCircle, 
  Crown, 
  Zap, 
  Gauge, 
  Settings, 
  Server, 
  Copy,
  Calendar,
  User,
  MapPin
} from "lucide-react";
import { SiTelegram, SiDiscord } from "react-icons/si";
import { ContactSellerModal } from "./contact-seller-modal";

interface CarDetailsModalProps {
  car: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryNames = {
  sedan: "Седан",
  suv: "Внедорожник", 
  hatchback: "Хэтчбек",
  coupe: "Купе",
  wagon: "Универсал",
  convertible: "Кабриолет",
  pickup: "Пикап",
  minivan: "Минивэн",
  sport: "Спорт",
  luxury: "Люкс",
  electric: "Электрокар",
};

const driveTypes = {
  fwd: "Передний привод",
  rwd: "Задний привод", 
  awd: "Полный привод",
  "4wd": "Полный привод 4WD",
};

export function CarDetailsModal({ car, open, onOpenChange }: CarDetailsModalProps) {
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Получаем данные избранного
  const favorites = queryClient.getQueryData(["/api/favorites"]) || [];
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
          ? `${car.name} удален из избранного`
          : `${car.name} добавлен в избранное`,
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

  const formatPrice = (price: number) => {
    if (!price) return "Цена не указана";
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Дата не указана';
    }
  };

  const getImageUrl = (imageUrl?: string | null) => {
    if (imageUrl) return imageUrl;
    return 'https://via.placeholder.com/600x400/1e293b/64748b?text=Нет+фото';
  };

  const handleContactClick = async (type: "phone" | "telegram" | "discord", value: string) => {
    switch (type) {
      case "phone":
        try {
          await navigator.clipboard.writeText(value);
          toast({
            title: "Телефон скопирован",
            description: `${value} скопирован в буфер обмена`,
          });
        } catch {
          toast({
            title: "Ошибка копирования",
            description: "Не удалось скопировать номер телефона",
            variant: "destructive",
          });
        }
        break;
      case "telegram":
        const telegramHandle = value.replace('@', '');
        window.open(`https://t.me/${telegramHandle}`, '_blank');
        break;
      case "discord":
        try {
          await navigator.clipboard.writeText(value);
          toast({
            title: "Discord скопирован",
            description: `${value} скопирован в буфер обмена`,
          });
        } catch {
          toast({
            title: "Ошибка копирования",
            description: "Не удалось скопировать Discord",
            variant: "destructive",
          });
        }
        break;
    }
  };

  const isOwner = user && (user.id === car.createdBy || user.id === car.owner_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <DialogTitle className="text-2xl font-bold text-white">{car.name}</DialogTitle>
              {car.isPremium && (
                <Badge className="bg-amber-500 text-amber-900 hover:bg-amber-500">
                  <Crown className="h-3 w-3 mr-1" />
                  Премиум
                </Badge>
              )}
              {car.status && car.status !== 'approved' && (
                <Badge className={`${
                  car.status === 'pending' ? 'bg-yellow-500 text-yellow-900' :
                  car.status === 'rejected' ? 'bg-red-500 text-red-100' : ''
                }`}>
                  {car.status === 'pending' && 'На модерации'}
                  {car.status === 'rejected' && 'Отклонено'}
                </Badge>
              )}
            </div>
            
            {/* Кнопка "В избранное" */}
            {!isOwner && (
              <Button 
                variant="secondary"
                className="bg-slate-700 hover:bg-slate-600"
                onClick={() => toggleFavoriteMutation.mutate()}
                disabled={toggleFavoriteMutation.isPending}
              >
                <Heart 
                  className={`h-4 w-4 mr-2 ${
                    isFavorite ? "fill-current text-red-500" : ""
                  }`} 
                />
                {isFavorite ? "Убрать из избранного" : "В избранное"}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Изображение автомобиля */}
          <div>
            <img 
              src={getImageUrl(car.imageUrl)} 
              alt={car.name}
              className="w-full h-80 object-cover rounded-xl shadow-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://via.placeholder.com/600x400/1e293b/64748b?text=Нет+фото';
              }}
            />
            
            {/* Контактная информация */}
            {!isOwner && (car.phone || car.telegram || car.discord) && (
              <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
                <h4 className="font-semibold text-white mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Контактная информация
                </h4>
                <div className="space-y-3">
                  {car.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <button 
                        onClick={() => handleContactClick("phone", car.phone)}
                        className="text-slate-300 hover:text-white transition-colors flex items-center"
                      >
                        <span>{car.phone}</span>
                        <Copy className="h-3 w-3 ml-2" />
                      </button>
                    </div>
                  )}
                  {car.telegram && (
                    <div className="flex items-center space-x-3">
                      <SiTelegram className="h-5 w-5 text-blue-400 flex-shrink-0" />
                      <button 
                        onClick={() => handleContactClick("telegram", car.telegram)}
                        className="text-slate-300 hover:text-white transition-colors"
                      >
                        {car.telegram}
                      </button>
                    </div>
                  )}
                  {car.discord && (
                    <div className="flex items-center space-x-3">
                      <SiDiscord className="h-5 w-5 text-purple-400 flex-shrink-0" />
                      <button 
                        onClick={() => handleContactClick("discord", car.discord)}
                        className="text-slate-300 hover:text-white transition-colors flex items-center"
                      >
                        <span>{car.discord}</span>
                        <Copy className="h-3 w-3 ml-2" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Детали автомобиля */}
          <div>
            {/* Цена и категории */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-slate-700 text-slate-300">
                  {categoryNames[car.category] || car.category || 'Не указано'}
                </Badge>
                {car.server && (
                  <Badge variant="outline" className="border-emerald-600 text-emerald-400">
                    <Server className="h-3 w-3 mr-1" />
                    {car.server}
                  </Badge>
                )}
              </div>
              <div className="text-3xl font-bold text-emerald-400 mb-2">
                {formatPrice(car.price)}
              </div>
            </div>

            {/* Характеристики */}
            <div className="space-y-4 mb-6">
              <h4 className="font-semibold text-white flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Характеристики
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {car.maxSpeed && (
                  <div className="bg-slate-700 p-3 rounded-lg">
                    <div className="flex items-center text-slate-400 text-sm mb-1">
                      <Zap className="h-3 w-3 mr-1" />
                      Макс. скорость
                    </div>
                    <p className="text-white font-semibold">{car.maxSpeed} км/ч</p>
                  </div>
                )}
                {car.acceleration && (
                  <div className="bg-slate-700 p-3 rounded-lg">
                    <div className="flex items-center text-slate-400 text-sm mb-1">
                      <Gauge className="h-3 w-3 mr-1" />
                      Разгон 0-100
                    </div>
                    <p className="text-white font-semibold">{car.acceleration} сек</p>
                  </div>
                )}
                {car.drive && (
                  <div className="bg-slate-700 p-3 rounded-lg">
                    <div className="flex items-center text-slate-400 text-sm mb-1">
                      <Settings className="h-3 w-3 mr-1" />
                      Привод
                    </div>
                    <p className="text-white font-semibold">
                      {driveTypes[car.drive] || car.drive}
                    </p>
                  </div>
                )}
                {car.server && (
                  <div className="bg-slate-700 p-3 rounded-lg">
                    <div className="flex items-center text-slate-400 text-sm mb-1">
                      <Server className="h-3 w-3 mr-1" />
                      Сервер
                    </div>
                    <p className="text-white font-semibold">{car.server}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Описание */}
            {car.description && (
              <div className="mb-6">
                <h4 className="font-semibold text-white mb-2">Описание</h4>
                <p className="text-slate-300 leading-relaxed">{car.description}</p>
              </div>
            )}

            {/* Дополнительная информация */}
            <div className="mb-6 space-y-2 text-sm text-slate-400">
              {car.createdAt && (
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-2" />
                  <span>Добавлено: {formatDate(car.createdAt)}</span>
                </div>
              )}
              {car.location && (
                <div className="flex items-center">
                  <MapPin className="h-3 w-3 mr-2" />
                  <span>Местоположение: {car.location}</span>
                </div>
              )}
            </div>

            {/* Кнопки действий */}
            {!isOwner && (
              <div className="flex space-x-3">
                {car.phone && (
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleContactClick("phone", car.phone)}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Скопировать телефон
                  </Button>
                )}
                
                <Button 
                  variant="outline"
                  className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                  onClick={() => setContactModalOpen(true)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Написать продавцу
                </Button>
              </div>
            )}

            {/* Информация для владельца */}
            {isOwner && (
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Это ваше объявление</h4>
                <p className="text-slate-400 text-sm">
                  Вы не можете связаться с самим собой. Используйте кнопки редактирования в каталоге для управления объявлением.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      
      {/* Модальное окно контакта с продавцом */}
      <ContactSellerModal 
        car={car}
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
      />
    </Dialog>
  );
}
