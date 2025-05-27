import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Phone, MessageCircle, Copy } from "lucide-react";

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

  if (!car) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">{car.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Изображение */}
          <div className="relative">
            <div className="aspect-video bg-slate-700 rounded-lg overflow-hidden">
              <img
                src={car.imageUrl || 'https://via.placeholder.com/600x400?text=Нет+фото'}
                alt={car.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/600x400?text=Нет+фото';
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-emerald-400">Основные характеристики</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Цена:</span>
                  <span className="text-emerald-400 font-semibold text-lg">
                    {car.price ? `${car.price.toLocaleString('ru-RU')} ₽` : 'Цена не указана'}
                  </span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Сервер:</span>
                  <span className="text-white font-medium">
                    {SERVER_NAMES[car.server] || car.server || 'Не указано'}
                  </span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Категория:</span>
                  <span className="text-white font-medium">
                    {CATEGORY_NAMES[car.category] || car.category || 'Не указано'}
                  </span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Привод:</span>
                  <span className="text-white font-medium">
                    {DRIVE_TYPE_NAMES[car.driveType] || car.driveType || 'Не указано'}
                  </span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">ID сервера:</span>
                  <span className="text-white font-medium">{car.serverId || 'Не указано'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-blue-400">Контактная информация</h3>
              
              <div className="space-y-3">
                {car.contactInfo && (
                  <div className="space-y-2">
                    <span className="text-slate-400 text-sm">Контакты:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white bg-slate-700 px-3 py-2 rounded flex-1">
                        {car.contactInfo}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(car.contactInfo, "Контакт")}
                        className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Написать сообщение
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Описание */}
          {car.description && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-300">Описание</h3>
              <div className="bg-slate-700 p-4 rounded-lg">
                <p className="text-slate-300 whitespace-pre-wrap">{car.description}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
