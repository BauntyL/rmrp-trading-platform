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
import { PlusCircle, Upload, X } from "lucide-react";

interface AddCarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCarModal({ open, onOpenChange }: AddCarModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    model: "",
    year: "",
    price: "",
    mileage: "",
    fuelType: "",
    transmission: "",
    description: "",
    imageUrl: "",
  });

  const addCarMutation = useMutation({
    mutationFn: async (carData: any) => {
      try {
        console.log('🚗 Добавление автомобиля:', carData);
        
        const response = await fetch('/api/cars', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(carData),
        });

        console.log('📡 Статус ответа:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Ошибка добавления автомобиля');
        }

        const result = await response.json();
        console.log('✅ Автомобиль добавлен:', result);
        return result;
      } catch (error) {
        console.error('❌ Ошибка добавления автомобиля:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Обновляем все связанные кеши
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars/my"] });
      
      toast({
        title: "Автомобиль добавлен",
        description: "Ваш автомобиль отправлен на модерацию",
      });
      
      // Сбрасываем форму и закрываем модал
      setFormData({
        name: "",
        brand: "",
        model: "",
        year: "",
        price: "",
        mileage: "",
        fuelType: "",
        transmission: "",
        description: "",
        imageUrl: "",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Не удалось добавить автомобиль";
      
      if (errorMessage.includes("Authentication required") || errorMessage.includes("авторизац")) {
        toast({
          title: "Ошибка авторизации",
          description: "Необходимо войти в систему для добавления автомобилей",
          variant: "destructive",
        });
      } else if (errorMessage.includes("валидац") || errorMessage.includes("обязательн")) {
        toast({
          title: "Ошибка валидации",
          description: "Проверьте правильность заполнения всех полей",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Ошибка добавления",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Простая валидация
    if (!formData.name.trim() || !formData.brand.trim() || !formData.model.trim()) {
      toast({
        title: "Заполните обязательные поля",
        description: "Название, марка и модель обязательны для заполнения",
        variant: "destructive",
      });
      return;
    }

    if (!formData.year || !formData.price) {
      toast({
        title: "Заполните обязательные поля",
        description: "Год выпуска и цена обязательны для заполнения",
        variant: "destructive",
      });
      return;
    }

    const year = parseInt(formData.year);
    const price = parseInt(formData.price);
    const mileage = formData.mileage ? parseInt(formData.mileage) : 0;

    if (year < 1900 || year > new Date().getFullYear() + 1) {
      toast({
        title: "Неверный год выпуска",
        description: "Укажите корректный год выпуска автомобиля",
        variant: "destructive",
      });
      return;
    }

    if (price <= 0) {
      toast({
        title: "Неверная цена",
        description: "Цена должна быть больше 0",
        variant: "destructive",
      });
      return;
    }

    // Подготавливаем данные для отправки
    const carData = {
      name: formData.name.trim(),
      brand: formData.brand.trim(),
      model: formData.model.trim(),
      year: year,
      price: price,
      mileage: mileage,
      fuelType: formData.fuelType || 'Бензин',
      transmission: formData.transmission || 'Механическая',
      description: formData.description.trim() || '',
      imageUrl: formData.imageUrl.trim() || 'https://via.placeholder.com/400x300?text=Нет+фото',
    };

    console.log('📝 Отправляем данные автомобиля:', carData);
    addCarMutation.mutate(carData);
  };

  // Сброс формы при закрытии
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({
        name: "",
        brand: "",
        model: "",
        year: "",
        price: "",
        mileage: "",
        fuelType: "",
        transmission: "",
        description: "",
        imageUrl: "",
      });
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <PlusCircle className="h-5 w-5" />
            Добавить автомобиль
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Заполните информацию о вашем автомобиле. Объявление будет отправлено на модерацию.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Основная информация */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">
                Название объявления *
              </Label>
              <Input
                id="name"
                placeholder="Например: BMW X5 в отличном состоянии"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="text-slate-300">
                Ссылка на фото
              </Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={formData.imageUrl}
                onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>
          </div>

          {/* Марка и модель */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand" className="text-slate-300">
                Марка *
              </Label>
              <Input
                id="brand"
                placeholder="BMW, Mercedes, Toyota..."
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model" className="text-slate-300">
                Модель *
              </Label>
              <Input
                id="model"
                placeholder="X5, E-класс, Camry..."
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>
          </div>

          {/* Год и цена */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year" className="text-slate-300">
                Год выпуска *
              </Label>
              <Input
                id="year"
                type="number"
                placeholder="2020"
                min="1900"
                max={new Date().getFullYear() + 1}
                value={formData.year}
                onChange={(e) => handleInputChange('year', e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-slate-300">
                Цена (₽) *
              </Label>
              <Input
                id="price"
                type="number"
                placeholder="1500000"
                min="1"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mileage" className="text-slate-300">
                Пробег (км)
              </Label>
              <Input
                id="mileage"
                type="number"
                placeholder="50000"
                min="0"
                value={formData.mileage}
                onChange={(e) => handleInputChange('mileage', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>
          </div>

          {/* Тип топлива и коробка */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Тип топлива</Label>
              <Select value={formData.fuelType} onValueChange={(value) => handleInputChange('fuelType', value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Выберите тип топлива" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="Бензин">Бензин</SelectItem>
                  <SelectItem value="Дизель">Дизель</SelectItem>
                  <SelectItem value="Гибрид">Гибрид</SelectItem>
                  <SelectItem value="Электро">Электро</SelectItem>
                  <SelectItem value="Газ">Газ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Коробка передач</Label>
              <Select value={formData.transmission} onValueChange={(value) => handleInputChange('transmission', value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Выберите коробку передач" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="Механическая">Механическая</SelectItem>
                  <SelectItem value="Автоматическая">Автоматическая</SelectItem>
                  <SelectItem value="Робот">Робот</SelectItem>
                  <SelectItem value="Вариатор">Вариатор</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Описание */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-300">
              Описание
            </Label>
            <Textarea
              id="description"
              placeholder="Дополнительная информация об автомобиле, комплектации, состоянии..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="resize-none bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
          </div>

          {/* Предупреждение */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Внимание:</strong> Все объявления проходят предварительную модерацию. 
              Публикация может занять до 24 часов.
            </p>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              className="flex-1 bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={addCarMutation.isPending}
              className="flex-1 gap-2 bg-primary hover:bg-primary/90"
            >
              {addCarMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Добавление...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  Добавить автомобиль
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
