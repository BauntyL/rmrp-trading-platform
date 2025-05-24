import { Car } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Heart, Phone, Crown, Edit, Trash2 } from "lucide-react";

interface CarCardProps {
  car: Car;
  onViewDetails: (car: Car) => void;
  onEdit?: (car: Car) => void;
  onDelete?: (car: Car) => void;
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

export function CarCard({ car, onViewDetails, onEdit, onDelete }: CarCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: favoriteCheck } = useQuery({
    queryKey: ["/api/favorites/check", car.id],
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (favoriteCheck?.isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${car.id}`);
      } else {
        await apiRequest("POST", "/api/favorites", { carId: car.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/check", car.id] });
      toast({
        title: favoriteCheck?.isFavorite ? "Удалено из избранного" : "Добавлено в избранное",
        description: favoriteCheck?.isFavorite 
          ? `${car.name} удален из избранного` 
          : `${car.name} добавлен в избранное`,
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
    
    // Default images based on category
    const defaultImages = {
      standard: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400&h=250&fit=crop",
      sport: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=250&fit=crop",
      coupe: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&h=250&fit=crop",
      suv: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&h=250&fit=crop",
      motorcycle: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=250&fit=crop",
    };
    
    return defaultImages[car.category];
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors">
      <div className="relative">
        <img 
          src={getImageUrl(car.imageUrl)} 
          alt={car.name}
          className="w-full h-48 object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=250&fit=crop";
          }}
        />
        
        {car.isPremium && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-amber-500 text-amber-900 hover:bg-amber-500">
              <Crown className="h-3 w-3 mr-1" />
              Премиум
            </Badge>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white dark:hover:bg-slate-800"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavoriteMutation.mutate();
          }}
          disabled={toggleFavoriteMutation.isPending}
        >
          <Heart 
            className={`h-4 w-4 transition-colors ${
              favoriteCheck?.isFavorite 
                ? "text-red-500 fill-current" 
                : "text-slate-400 hover:text-red-500"
            }`} 
          />
        </Button>
      </div>
      
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white mb-1 truncate">{car.name}</h3>
            <div className="flex items-center space-x-2 mb-2 flex-wrap gap-1">
              <Badge className={`text-xs ${categoryColors[car.category]}`}>
                {categoryNames[car.category]}
              </Badge>
              <Badge className={`text-xs ${serverColors[car.server]}`}>
                {serverNames[car.server]}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Цена:</span>
            <span className="text-emerald-400 font-semibold">{formatPrice(car.price)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Макс. скорость:</span>
            <span className="text-white">{car.maxSpeed} км/ч</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Разгон:</span>
            <span className="text-white">{car.acceleration}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Привод:</span>
            <span className="text-white">{car.drive}</span>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button 
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={() => onViewDetails(car)}
          >
            Подробнее
          </Button>
          <Button 
            variant="secondary"
            size="sm"
            className="bg-slate-700 hover:bg-slate-600"
            onClick={(e) => {
              e.stopPropagation();
              if (car.phone) {
                navigator.clipboard.writeText(car.phone);
                toast({
                  title: "Телефон скопирован",
                  description: `${car.phone} скопирован в буфер обмена`,
                });
              } else {
                toast({
                  title: "Контакт недоступен",
                  description: "Номер телефона не указан",
                  variant: "destructive",
                });
              }
            }}
          >
            <Phone className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
