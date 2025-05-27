import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Phone, MessageCircle, Copy, Heart } from "lucide-react";
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

const DRIVE_TYPE_NAMES = {
  front: 'Передний',
  rear: 'Задний',
  all: 'Полный'
};

interface CarDetailsModalProps {
  car: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CarDetailsModal({ car, open, onOpenChange }: CarDetailsModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Проверяем, находится ли автомобиль в избранном
  const { data: favorites = [] } = queryClient.getQueryData(["/api/favorites"]) || [];
  const isFavorite = Array.isArray(favorites) && favorites.some((fav: any) => fav.id === car?.id);
  const isOwner = user?.id === car?.userId;

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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Скопировано!",
        description: `${label} скопирован в буфер обмена`,
      });
    }).catch(() => {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать в буфер обмена",
        variant: "destructive",
      });
    });
  };

  // Парсим контактную информацию
  const parseContactInfo = (contactInfo: string) => {
    if (!contactInfo) return {};
    
    const contacts: any = {};
    
    // Пытаемся найти телефон
    const phoneMatch = contactInfo.match(/📞\s*([^|]*)/);
    if (phoneMatch) contacts.phone = phoneMatch[1].trim();
    
    // Пытаемся найти Telegram
    const telegramMatch = contactInfo.match(/📱\s*Telegram:\s*([^|]*)/);
    if (telegramMatch) contacts.telegram = telegramMatch[1].trim();
    
    // Пытаемся найти Discord
    const discordMatch = contactInfo.match(/🎮\s*Discord:\s*([^|]*)/);
    if (discordMatch) contacts.discord = discordMatch[1].trim();
    
    // Пытаемся найти VK
    const vkMatch = contactInfo.match(/👥\s*VK:\s*([^|]*)/);
    if (vkMatch) contacts.vk = vkMatch[1].trim();
    
    // Если ничего не найдено, считаем что это просто телефон
    if (Object.keys(contacts).length === 0) {
      contacts.phone = contactInfo;
    }
    
    return contacts;
  };

  const contacts = parseContactInfo(car?.contactInfo || '');

  if (!car) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl bg-slate-800 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <DialogTitle className="text-2xl text-white pr-12">{car.name}</DialogTitle>
              
              {/* Кнопка избранного в заголовке */}
              {!isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFavoriteClick}
                  disabled={toggleFavoriteMutation.isPending}
                  className="h-10 w-10 rounded-full bg-slate-700/50 hover:bg-slate-600 border-0 flex-shrink-0"
                >
                  <Heart 
                    className={`h-5 w-5 ${
                      isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-300'
                    }`} 
                  />
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Изображение */}
            <div className="relative">
              <div className="aspect-video bg-slate-700 rounded-lg overflow-hidden">
                <img
                  src={car.imageUrl || 'https://via.placeholder.com/800x450?text=Нет+фото'}
                  alt={car.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/800x450?text=Нет+фото';
                  }}
                />
              </div>
              
              {/* Статус */}
              {car.status === 'pending' && (
                <Badge className="absolute top-3 left-3 bg-yellow-500 text-black">
                  На модерации
                </Badge>
              )}
            </div>

            {/* Основная информация */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Левая колонка - характеристики */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-emerald-400">Основные характеристики</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Цена:</span>
                    <span className="text-emerald-400 font-bold text-xl">
                      {car.price ? `${car.price.toLocaleString('ru-RU')} ₽` : 'Цена не указана'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Сервер:</span>
                    <span className="text-white font-medium">
                      {SERVER_NAMES[car.server] || car.server || 'Не указано'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Категория:</span>
                    <span className="text-white font-medium">
                      {CATEGORY_NAMES[car.category] || car.category || 'Не указано'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Привод:</span>
                    <span className="text-white font-medium">
                      {DRIVE_TYPE_NAMES[car.driveType] || car.driveType || 'Не указано'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">ID на сервере:</span>
                    <span className="text-white font-medium font-mono">
                      {car.serverId || 'Не указано'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Правая колонка - контакты */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-blue-400">Контактная информация</h3>
                
                <div className="space-y-4">
                  {/* Телефон */}
                  {contacts.phone && (
                    <div className="space-y-2">
                      <span className="text-slate-400 text-sm">📞 Телефон:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-white bg-slate-700 px-4 py-2 rounded-lg flex-1 font-mono">
                          {contacts.phone}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(contacts.phone, "Номер телефона")}
                          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Telegram */}
                  {contacts.telegram && (
                    <div className="space-y-2">
                      <span className="text-slate-400 text-sm">📱 Telegram:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-white bg-slate-700 px-4 py-2 rounded-lg flex-1">
                          {contacts.telegram}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(contacts.telegram, "Telegram")}
                          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Discord */}
                  {contacts.discord && (
                    <div className="space-y-2">
                      <span className="text-slate-400 text-sm">🎮 Discord:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-white bg-slate-700 px-4 py-2 rounded-lg flex-1">
                          {contacts.discord}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(contacts.discord, "Discord")}
                          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* VK */}
                  {contacts.vk && (
                    <div className="space-y-2">
                      <span className="text-slate-400 text-sm">👥 VKontakte:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-white bg-slate-700 px-4 py-2 rounded-lg flex-1">
                          {contacts.vk}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(contacts.vk, "VK")}
                          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Кнопки действий */}
                  <div className="pt-4 space-y-3">
                    {/* Кнопка сообщения */}
                    {!isOwner && (
                      <Button 
                        onClick={() => setContactModalOpen(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Написать сообщение
                      </Button>
                    )}
                    
                    {/* Кнопка избранного (дополнительная) */}
                    {!isOwner && (
                      <Button 
                        onClick={handleFavoriteClick}
                        disabled={toggleFavoriteMutation.isPending}
                        variant="outline"
                        className={`w-full border-slate-600 hover:bg-slate-600 ${
                          isFavorite 
                            ? 'bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30' 
                            : 'bg-slate-700 text-white'
                        }`}
                      >
                        <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                        {isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Описание */}
            {car.description && (
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-slate-300">Описание</h3>
                <div className="bg-slate-700 p-6 rounded-lg">
                  <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {car.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Модал сообщений */}
      <ContactSellerModal
        car={car}
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
      />
    </>
  );
}
