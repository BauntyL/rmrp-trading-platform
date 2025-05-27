import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface AddCarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCarModal({ open, onOpenChange }: AddCarModalProps) {
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    server: "",
    category: "",
    driveType: "",
    serverId: "",
    price: "",
    description: "",
    imageUrl: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addCarMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Ошибка при добавлении автомобиля");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars/my"] });
      toast({
        title: "Автомобиль добавлен!",
        description: "Ваш автомобиль отправлен на модерацию.",
      });
      setFormData({
        brand: "",
        model: "",
        server: "",
        category: "",
        driveType: "",
        serverId: "",
        price: "",
        description: "",
        imageUrl: ""
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить автомобиль",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCarMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Добавить автомобиль</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand" className="text-white">Марка</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleInputChange("brand", e.target.value)}
                placeholder="BMW, Mercedes, Audi..."
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="model" className="text-white">Модель</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleInputChange("model", e.target.value)}
                placeholder="X5, E-Class, A6..."
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="server" className="text-white">Сервер</Label>
              <Select value={formData.server} onValueChange={(value) => handleInputChange("server", value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Выберите сервер" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="arbat">Арбат</SelectItem>
                  <SelectItem value="patriki">Патрики</SelectItem>
                  <SelectItem value="rublevka">Рублевка</SelectItem>
                  <SelectItem value="tverskoy">Тверской</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category" className="text-white">Категория</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="standard">Стандарт</SelectItem>
                  <SelectItem value="coupe">Купе</SelectItem>
                  <SelectItem value="suv">Внедорожник</SelectItem>
                  <SelectItem value="sport">Спорт</SelectItem>
                  <SelectItem value="service">Служебная</SelectItem>
                  <SelectItem value="motorcycle">Мотоцикл</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="driveType" className="text-white">Тип привода</Label>
              <Select value={formData.driveType} onValueChange={(value) => handleInputChange("driveType", value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Выберите тип привода" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="front">Передний</SelectItem>
                  <SelectItem value="rear">Задний</SelectItem>
                  <SelectItem value="all">Полный</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="serverId" className="text-white">ID на сервере</Label>
              <Input
                id="serverId"
                value={formData.serverId}
                onChange={(e) => handleInputChange("serverId", e.target.value)}
                placeholder="123-456"
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="price" className="text-white">Цена (₽)</Label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange("price", e.target.value)}
              placeholder="1500000"
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="imageUrl" className="text-white">Ссылка на изображение</Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) => handleInputChange("imageUrl", e.target.value)}
              placeholder="https://example.com/car-image.jpg"
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-white">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Опишите состояние автомобиля, особенности, дополнительное оборудование..."
              className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={addCarMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {addCarMutation.isPending ? "Добавление..." : "Добавить автомобиль"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
