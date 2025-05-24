import { useState } from "react";
import { Car } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Heart, Phone, MessageCircle, Crown } from "lucide-react";
import { SiTelegram, SiDiscord } from "react-icons/si";
import { ContactSellerModal } from "./contact-seller-modal";

interface CarDetailsModalProps {
  car: Car;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryNames = {
  standard: "Стандарт",
  sport: "Спорт", 
  coupe: "Купе",
  suv: "Внедорожник",
  motorcycle: "Мотоцикл",
};

const serverNames = {
  arbat: "Арбат",
  patriki: "Патрики",
  rublevka: "Рублёвка",
  tverskoy: "Тверской",
};

const categoryColors = {
  standard: "bg-gray-500 text-gray-100",
  sport: "bg-red-500 text-red-100",
  coupe: "bg-purple-500 text-purple-100",
  suv: "bg-green-500 text-green-100",
  motorcycle: "bg-orange-500 text-orange-100",
};

const serverColors = {
  arbat: "bg-blue-500 text-blue-100",
  patriki: "bg-green-500 text-green-100",
  rublevka: "bg-purple-500 text-purple-100",
  tverskoy: "bg-yellow-500 text-yellow-900",
};

export function CarDetailsModal({ car, open, onOpenChange }: CarDetailsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: favoriteCheck } = useQuery({
    queryKey: ["/api/favorites/check", car.id],
    enabled: open,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/favorites/toggle/${car.id}`, {});
      return await response.json();
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["/api/favorites/check", car.id], { isFavorite: result.isFavorite });
      queryClient.removeQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/check"] });
      
      toast({
        title: result.action === "added" ? "Добавлено в избранное" : "Удалено из избранного",
        description: result.action === "added" 
          ? `${car.name} добавлен в избранное`
          : `${car.name} удален из избранного`,
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить избранное",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getImageUrl = (imageUrl?: string | null) => {
    if (imageUrl) return imageUrl;
    
    const defaultImages = {
      standard: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=600&h=400&fit=crop",
      sport: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=400&fit=crop",
      coupe: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&h=400&fit=crop",
      suv: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&h=400&fit=crop",
      motorcycle: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop",
    };
    
    return defaultImages[car.category];
  };

  const handleContactClick = (type: "phone" | "telegram" | "discord", value: string) => {
    switch (type) {
      case "phone":
        navigator.clipboard.writeText(value);
        toast({
          title: "Телефон скопирован",
          description: `${value} скопирован в буфер обмена`,
        });
        break;
      case "telegram":
        window.open(`https://t.me/${value.replace('@', '')}`, '_blank');
        break;
      case "discord":
        navigator.clipboard.writeText(value);
        toast({
          title: "Discord скопирован",
          description: `${value} скопирован в буфер обмена`,
        });
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
        <DialogHeader>
          <div className="flex items-center space-x-4">
            <DialogTitle className="text-2xl font-bold text-white">{car.name}</DialogTitle>
            {car.isPremium && (
              <Badge className="bg-amber-500 text-amber-900 hover:bg-amber-500">
                <Crown className="h-3 w-3 mr-1" />
                Премиум
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Car Image */}
          <div>
            <img 
              src={getImageUrl(car.imageUrl)} 
              alt={car.name}
              className="w-full h-80 object-cover rounded-xl shadow-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=400&fit=crop";
              }}
            />
            
            {/* Contact Information */}
            <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
              <h4 className="font-semibold text-white mb-3">Контактная информация</h4>
              <div className="space-y-3">
                {car.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-green-400" />
                    <button 
                      onClick={() => handleContactClick("phone", car.phone!)}
                      className="text-slate-300 hover:text-white transition-colors"
                    >
                      {car.phone}
                    </button>
                  </div>
                )}
                {car.telegram && (
                  <div className="flex items-center space-x-3">
                    <SiTelegram className="h-5 w-5 text-blue-400" />
                    <button 
                      onClick={() => handleContactClick("telegram", car.telegram!)}
                      className="text-slate-300 hover:text-white transition-colors"
                    >
                      {car.telegram}
                    </button>
                  </div>
                )}
                {car.discord && (
                  <div className="flex items-center space-x-3">
                    <SiDiscord className="h-5 w-5 text-purple-400" />
                    <button 
                      onClick={() => handleContactClick("discord", car.discord!)}
                      className="text-slate-300 hover:text-white transition-colors"
                    >
                      {car.discord}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Car Details */}
          <div>
            {/* Car Title and Badges */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className={`${categoryColors[car.category]}`}>
                  {categoryNames[car.category]}
                </Badge>
                <Badge className={`${serverColors[car.server]}`}>
                  {serverNames[car.server]}
                </Badge>
              </div>
              <div className="text-3xl font-bold text-emerald-400 mb-4">
                {formatPrice(car.price)}
              </div>
            </div>

            {/* Specifications */}
            <div className="space-y-4 mb-6">
              <h4 className="font-semibold text-white">Характеристики</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700 p-3 rounded-lg">
                  <p className="text-slate-400 text-sm">Максимальная скорость</p>
                  <p className="text-white font-semibold">{car.maxSpeed} км/ч</p>
                </div>
                <div className="bg-slate-700 p-3 rounded-lg">
                  <p className="text-slate-400 text-sm">Разгон до 100 км/ч</p>
                  <p className="text-white font-semibold">{car.acceleration}</p>
                </div>
                <div className="bg-slate-700 p-3 rounded-lg">
                  <p className="text-slate-400 text-sm">Тип привода</p>
                  <p className="text-white font-semibold">{car.drive}</p>
                </div>
                <div className="bg-slate-700 p-3 rounded-lg">
                  <p className="text-slate-400 text-sm">Сервер</p>
                  <p className="text-white font-semibold">{serverNames[car.server]}</p>
                </div>
                {car.serverId && (
                  <div className="bg-slate-700 p-3 rounded-lg col-span-2">
                    <p className="text-slate-400 text-sm">ID на сервере</p>
                    <p className="text-white font-semibold">{car.serverId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {car.description && (
              <div className="mb-6">
                <h4 className="font-medium text-white mb-2">Описание</h4>
                <p className="text-slate-300 leading-relaxed">{car.description}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {car.phone && (
                <Button 
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={() => handleContactClick("phone", car.phone!)}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Скопировать телефон
                </Button>
              )}
              <Button 
                variant="secondary"
                className="bg-slate-700 hover:bg-slate-600"
                onClick={() => toggleFavoriteMutation.mutate()}
                disabled={toggleFavoriteMutation.isPending}
              >
                <Heart 
                  className={`h-4 w-4 mr-2 ${
                    favoriteCheck?.isFavorite ? "fill-current text-red-500" : ""
                  }`} 
                />
                {favoriteCheck?.isFavorite ? "Удалить из избранного" : "В избранное"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
