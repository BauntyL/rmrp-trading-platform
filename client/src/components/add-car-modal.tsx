import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';

interface AddCarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (carData: any) => void;
  isLoading?: boolean;
}

export function AddCarModal({ isOpen, onClose, onSubmit, isLoading = false }: AddCarModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    server: '',
    price: '',
    maxSpeed: '',
    acceleration: '',
    drive: '',
    description: '',
    phone: '',
    telegram: '',
    discord: '',
    imageUrl: '',
    isPremium: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Название обязательно';
    if (!formData.category) newErrors.category = 'Выберите категорию';
    if (!formData.server) newErrors.server = 'Выберите сервер';
    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Введите корректную цену';
    }
    if (!formData.description.trim()) newErrors.description = 'Описание обязательно';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      price: parseInt(formData.price),
      maxSpeed: formData.maxSpeed ? parseInt(formData.maxSpeed) : null,
    };

    console.log('🚗 Submitting car application:', submitData);
    onSubmit(submitData);
  };

  const handleReset = () => {
    setFormData({
      name: '',
      category: '',
      server: '',
      price: '',
      maxSpeed: '',
      acceleration: '',
      drive: '',
      description: '',
      phone: '',
      telegram: '',
      discord: '',
      imageUrl: '',
      isPremium: false
    });
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Подать заявку на автомобиль</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Закрыть модальное окно"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Название */}
          <div>
            <Label htmlFor="car-name">Название автомобиля *</Label>
            <Input
              id="car-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Например: BMW M5 E60"
              disabled={isLoading}
              aria-describedby={errors.name ? "name-error" : undefined}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p id="name-error" className="text-red-500 text-sm mt-1" role="alert">
                {errors.name}
              </p>
            )}
          </div>

          {/* Категория */}
          <div>
            <Label htmlFor="car-category">Категория *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              disabled={isLoading}
            >
              <SelectTrigger 
                id="car-category"
                aria-describedby={errors.category ? "category-error" : undefined}
                className={errors.category ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="muscle">Muscle</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="super">Super</SelectItem>
                <SelectItem value="sedan">Sedan</SelectItem>
                <SelectItem value="suv">SUV</SelectItem>
                <SelectItem value="coupe">Coupe</SelectItem>
                <SelectItem value="offroad">Offroad</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p id="category-error" className="text-red-500 text-sm mt-1" role="alert">
                {errors.category}
              </p>
            )}
          </div>

          {/* Сервер */}
          <div>
            <Label htmlFor="car-server">Сервер *</Label>
            <Select 
              value={formData.server} 
              onValueChange={(value) => setFormData({ ...formData, server: value })}
              disabled={isLoading}
            >
              <SelectTrigger 
                id="car-server"
                aria-describedby={errors.server ? "server-error" : undefined}
                className={errors.server ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Выберите сервер" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="server1">Сервер 1</SelectItem>
                <SelectItem value="server2">Сервер 2</SelectItem>
                <SelectItem value="server3">Сервер 3</SelectItem>
                <SelectItem value="server4">Сервер 4</SelectItem>
                <SelectItem value="server5">Сервер 5</SelectItem>
              </SelectContent>
            </Select>
            {errors.server && (
              <p id="server-error" className="text-red-500 text-sm mt-1" role="alert">
                {errors.server}
              </p>
            )}
          </div>

          {/* Цена */}
          <div>
            <Label htmlFor="car-price">Цена (₽) *</Label>
            <Input
              id="car-price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="1000000"
              min="1"
              disabled={isLoading}
              aria-describedby={errors.price ? "price-error" : undefined}
              className={errors.price ? "border-red-500" : ""}
            />
            {errors.price && (
              <p id="price-error" className="text-red-500 text-sm mt-1" role="alert">
                {errors.price}
              </p>
            )}
          </div>

          {/* Технические характеристики */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="car-maxspeed">Макс. скорость (км/ч)</Label>
              <Input
                id="car-maxspeed"
                type="number"
                value={formData.maxSpeed}
                onChange={(e) => setFormData({ ...formData, maxSpeed: e.target.value })}
                placeholder="250"
                min="1"
                disabled={isLoading}
                aria-describedby="maxspeed-description"
              />
              <p id="maxspeed-description" className="text-gray-500 text-xs mt-1">
                Максимальная скорость автомобиля
              </p>
            </div>

            <div>
              <Label htmlFor="car-acceleration">Разгон 0-100</Label>
              <Input
                id="car-acceleration"
                type="text"
                value={formData.acceleration}
                onChange={(e) => setFormData({ ...formData, acceleration: e.target.value })}
                placeholder="3.5 сек"
                disabled={isLoading}
                aria-describedby="acceleration-description"
              />
              <p id="acceleration-description" className="text-gray-500 text-xs mt-1">
                Время разгона до 100 км/ч
              </p>
            </div>

            <div>
              <Label htmlFor="car-drive">Привод</Label>
              <Select 
                value={formData.drive} 
                onValueChange={(value) => setFormData({ ...formData, drive: value })}
                disabled={isLoading}
              >
                <SelectTrigger id="car-drive" aria-describedby="drive-description">
                  <SelectValue placeholder="Тип привода" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rwd">RWD (Задний)</SelectItem>
                  <SelectItem value="fwd">FWD (Передний)</SelectItem>
                  <SelectItem value="awd">AWD (Полный)</SelectItem>
                </SelectContent>
              </Select>
              <p id="drive-description" className="text-gray-500 text-xs mt-1">
                Тип привода автомобиля
              </p>
            </div>
          </div>

          {/* Описание */}
          <div>
            <Label htmlFor="car-description">Описание *</Label>
            <Textarea
              id="car-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Опишите автомобиль, его состояние, особенности..."
              rows={4}
              disabled={isLoading}
              aria-describedby={errors.description ? "description-error" : "description-help"}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description ? (
              <p id="description-error" className="text-red-500 text-sm mt-1" role="alert">
                {errors.description}
              </p>
            ) : (
              <p id="description-help" className="text-gray-500 text-sm mt-1">
                Подробно опишите автомобиль для покупателей
              </p>
            )}
          </div>

          {/* Контакты */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="car-phone">Телефон</Label>
              <Input
                id="car-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+7 (xxx) xxx-xx-xx"
                disabled={isLoading}
                aria-describedby="phone-description"
              />
              <p id="phone-description" className="text-gray-500 text-xs mt-1">
                Контактный телефон
              </p>
            </div>

            <div>
              <Label htmlFor="car-telegram">Telegram</Label>
              <Input
                id="car-telegram"
                type="text"
                value={formData.telegram}
                onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                placeholder="@username"
                disabled={isLoading}
                aria-describedby="telegram-description"
              />
              <p id="telegram-description" className="text-gray-500 text-xs mt-1">
                Ник в Telegram
              </p>
            </div>

            <div>
              <Label htmlFor="car-discord">Discord</Label>
              <Input
                id="car-discord"
                type="text"
                value={formData.discord}
                onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                placeholder="username#1234"
                disabled={isLoading}
                aria-describedby="discord-description"
              />
              <p id="discord-description" className="text-gray-500 text-xs mt-1">
                Discord тег
              </p>
            </div>
          </div>

          {/* Изображение */}
          <div>
            <Label htmlFor="car-image">URL изображения</Label>
            <Input
              id="car-image"
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://example.com/car-image.jpg"
              disabled={isLoading}
              aria-describedby="image-description"
            />
            <p id="image-description" className="text-gray-500 text-sm mt-1">
              Ссылка на изображение автомобиля (необязательно)
            </p>
          </div>

          {/* Премиум */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="car-premium"
              checked={formData.isPremium}
              onCheckedChange={(checked) => setFormData({ ...formData, isPremium: !!checked })}
              disabled={isLoading}
              aria-describedby="premium-description"
            />
            <Label htmlFor="car-premium">Премиум автомобиль</Label>
          </div>
          <p id="premium-description" className="text-gray-500 text-sm ml-6">
            Отметьте, если это редкий или эксклюзивный автомобиль
          </p>

          {/* Кнопки */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
            >
              Очистить
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? 'Отправка...' : 'Подать заявку'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
