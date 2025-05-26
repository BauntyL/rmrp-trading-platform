import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, X } from "lucide-react";

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
    series: "",
    year: "",
    price: "",
    mileage: "",
    gearboxType: "",
    region: "",
    phone: "",
    telegram: "",
    discord: "",
    imageUrl: "",
    description: "",
    isPremium: false,
  });

  const addCarMutation = useMutation({
    mutationFn: async (carData: any) => {
      const response = await fetch('/api/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(carData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка добавления автомобиля');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars/my"] });
      
      toast({
        title: "Автомобиль добавлен",
        description: "Ваш автомобиль отправлен на модерацию",
      });
      
      // Сброс формы
      setFormData({
        name: "",
        category: "",
        series: "",
        year: "",
        price: "",
        mileage: "",
        gearboxType: "",
        region: "",
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
        title: "Ошибка добавления",
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
    
    // Валидация
    if (!formData.name.trim() || !formData.category || !formData.series) {
      toast({
        title: "Заполните обязательные поля",
        description: "Название, категория и серия обязательны",
        variant: "destructive",
      });
      return;
    }

    if (!formData.year || !formData.price) {
      toast({
        title: "Заполните обязательные поля",
        description: "Год и цена обязательны",
        variant: "destructive",
      });
      return;
    }

    const carData = {
      name: formData.name.trim(),
      brand: formData.category,
      model: formData.series,
      year: parseInt(formData.year),
      price: parseInt(formData.price),
      mileage: formData.mileage ? parseInt(formData.mileage) : 0,
      transmission: formData.gearboxType || 'Не указано',
      fuelType: 'Не указано',
      description: formData.description.trim(),
      imageUrl: formData.imageUrl.trim() || 'https://via.placeholder.com/400x300?text=Нет+фото',
      // Дополнительные поля для контактов
      contactPhone: formData.phone.trim(),
      contactTelegram: formData.telegram.trim(),
      contactDiscord: formData.discord.trim(),
      region: formData.region.trim(),
      isPremium: formData.isPremium,
    };

    addCarMutation.mutate(carData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-white">
            <span>Добавить автомобиль</span>
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

          {/* Категория и Серия */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Категория *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="BMW">BMW</SelectItem>
                  <SelectItem value="Mercedes">Mercedes</SelectItem>
                  <SelectItem value="Audi">Audi</SelectItem>
                  <SelectItem value="Toyota">Toyota</SelectItem>
                  <SelectItem value="Lada">Lada</SelectItem>
                  <SelectItem value="Другое">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Серия *</Label>
              <Select value={formData.series} onValueChange={(value) => handleInputChange('series', value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Выберите серию" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="M5">M5</SelectItem>
                  <SelectItem value="X5">X5</SelectItem>
                  <SelectItem value="E-класс">E-класс</SelectItem>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="Camry">Camry</SelectItem>
                  <SelectItem value="Другое">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Год и Цена */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Год (г) *</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.year}
                onChange={(e) => handleInputChange('year', e.target.value)}
                min="1900"
                max={new Date().getFullYear() + 1}
                required
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Макс. скорость (км/ч) *</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                min="1"
                required
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Пробег и Тип привода */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Разгон до 100 км/ч *</Label>
              <Input
                placeholder="5.2 сек"
                value={formData.mileage}
                onChange={(e) => handleInputChange('mileage', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Тип привода *</Label>
              <Select value={formData.gearboxType} onValueChange={(value) => handleInputChange('gearboxType', value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Выберите привод" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="AWD">AWD</SelectItem>
                  <SelectItem value="RWD">RWD</SelectItem>
                  <SelectItem value="FWD">FWD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ID на сервере */}
          <div className="space-y-2">
            <Label className="text-slate-300">ID на сервере</Label>
            <Input
              placeholder="Например: BMWC-123"
              value={formData.region}
              onChange={(e) => handleInputChange('region', e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
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
            Отметьте, если хотите для релиза или эксклюзивный автомобиль
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
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {addCarMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Отправить заявку
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
