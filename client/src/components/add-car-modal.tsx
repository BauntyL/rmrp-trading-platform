import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

interface AddCarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCarModal({ open, onOpenChange }: AddCarModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    server: "",
    price: "",
    maxSpeed: "",
    acceleration: "",
    drive: "",
    phone: "",
    telegram: "",
    discord: "",
    imageUrl: "",
    description: "",
    isPremium: false,
  });

  const addCarMutation = useMutation({
    mutationFn: async (applicationData: any) => {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(applicationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка создания заявки');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-applications"] });
      
      toast({
        title: "Заявка отправлена",
        description: "Ваша заявка отправлена на модерацию",
      });
      
      // Сброс формы
      setFormData({
        name: "",
        category: "",
        server: "",
        price: "",
        maxSpeed: "",
        acceleration: "",
        drive: "",
        phone: "",
        telegram: "",
        discord: "",
        imageUrl: "",
        description: "",
        isPremium: false,
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка отправки заявки",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация обязательных полей
    if (!formData.name.trim()) {
      toast({
        title: "Заполните обязательные поля",
        description: "Название автомобиля обязательно",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Заполните обязательные поля",
        description: "Категория обязательна",
        variant: "destructive",
      });
      return;
    }

    if (!formData.server) {
      toast({
        title: "Заполните обязательные поля",
        description: "Сервер обязателен",
        variant: "destructive",
      });
      return;
    }

    if (!formData.price || parseInt(formData.price) <= 0) {
      toast({
        title: "Заполните обязательные поля",
        description: "Укажите корректную цену",
        variant: "destructive",
      });
      return;
    }

    // Подготовка данных для API
    const applicationData = {
      name: formData.name.trim(),
      category: formData.category,
      server: formData.server,
      price: parseInt(formData.price),
      maxSpeed: formData.maxSpeed ? parseInt(formData.maxSpeed) : 0,
      acceleration: formData.acceleration || "Не указано",
      drive: formData.drive || "Не указано",
      description: formData.description.trim() || "Без описания",
      imageUrl: formData.imageUrl.trim() || 'https://via.placeholder.com/400x300?text=Нет+фото',
      phone: formData.phone.trim(),
      telegram: formData.telegram.trim(),
      discord: formData.discord.trim(),
      isPremium: formData.isPremium,
    };

    addCarMutation.mutate(applicationData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-white">
            <span>Подать заявку на автомобиль</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Название автомобиля */}
          <div className="space-y-2">
            <Label className="text-slate-300">Название автомобиля *</Label>
            <Input
              placeholder="Например: BMW M5 Competition"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {/* Категория и Сервер */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Категория *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="Стандарт">Стандарт</SelectItem>
                  <SelectItem value="Купе">Купе</SelectItem>
                  <SelectItem value="Внедорожники">Внедорожники</SelectItem>
                  <SelectItem value="Спорт">Спорт</SelectItem>
                  <SelectItem value="Мотоциклы">Мотоциклы</SelectItem>
                  <SelectItem value="Специальные">Специальные</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Сервер *</Label>
              <Select value={formData.server} onValueChange={(value) => handleInputChange('server', value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Выберите сервер" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="Арбат">Арбат</SelectItem>
                  <SelectItem value="Патрики">Патрики</SelectItem>
                  <SelectItem value="Рублевка">Рублевка</SelectItem>
                  <SelectItem value="Тверской">Тверской</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Цена */}
          <div className="space-y-2">
            <Label className="text-slate-300">Цена (₽) *</Label>
            <Input
              type="number"
              placeholder="1000000"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              min="1"
              required
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {/* Макс. скорость и Разгон */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Макс. скорость (км/ч)</Label>
              <Input
                type="number"
                placeholder="250"
                value={formData.maxSpeed}
                onChange={(e) => handleInputChange('maxSpeed', e.target.value)}
                min="0"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Разгон 0-100 км/ч (сек)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="5.2"
                value={formData.acceleration}
                onChange={(e) => handleInputChange('acceleration', e.target.value)}
                min="0"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Тип привода */}
          <div className="space-y-2">
            <Label className="text-slate-300">Тип привода</Label>
            <Select value={formData.drive} onValueChange={(value) => handleInputChange('drive', value)}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Выберите привод" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="AWD">AWD (Полный)</SelectItem>
                <SelectItem value="RWD">RWD (Задний)</SelectItem>
                <SelectItem value="FWD">FWD (Передний)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Контактная информация */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Контактная информация</h3>
            
            <div className="space-y-2">
              <Label className="text-slate-300">Телефон</Label>
              <Input
                placeholder="+7 (999) 123-45-67"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Telegram</Label>
                <Input
                  placeholder="@username"
                  value={formData.telegram}
                  onChange={(e) => handleInputChange('telegram', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Discord</Label>
                <Input
                  placeholder="username#1234"
                  value={formData.discord}
                  onChange={(e) => handleInputChange('discord', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Ссылка на изображение</Label>
              <Input
                type="url"
                placeholder="https://example.com/car.jpg"
                value={formData.imageUrl}
                onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Дополнительное описание */}
          <div className="space-y-2">
            <Label className="text-slate-300">Дополнительное описание</Label>
            <Textarea
              placeholder="Дополнительная информация об автомобиле..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="bg-slate-700 border-slate-600 text-white resize-none"
            />
          </div>

          {/* Премиум автомобиль */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="premium"
              checked={formData.isPremium}
              onCheckedChange={(checked) => handleInputChange('isPremium', !!checked)}
              className="border-slate-600"
            />
            <Label htmlFor="premium" className="text-slate-300 text-sm">
              Премиум автомобиль
            </Label>
          </div>
          <p className="text-xs text-slate-500">
            Отметьте, если это редкий или эксклюзивный автомобиль
          </p>

          {/* Кнопки */}
          <div className="flex space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={addCarMutation.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {addCarMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Отправляем заявку...
                </>
              ) : (
                'Отправить заявку'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
