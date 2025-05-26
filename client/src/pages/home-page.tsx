import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Car } from "@shared/schema";
import { Sidebar } from "@/components/sidebar";
import { CarCard } from "@/components/car-card";
import { CarDetailsModal } from "@/components/car-details-modal";
import { AddCarModal } from "@/components/add-car-modal";
import { EditCarModal } from "@/components/edit-car-modal";
import { DeleteCarModal } from "@/components/delete-car-modal";
import { RemoveCarModal } from "@/components/remove-car-modal";
import { ModerationPanel } from "@/components/moderation-panel";
import { MessageModerationPanel } from "@/components/message-moderation-panel";
import { SecurityAlerts } from "@/components/security-alerts";
import { MessagesPanel } from "@/components/messages-panel";
import { NotificationSystem } from "@/components/notification-system";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus } from "lucide-react";

type ActiveSection = "catalog" | "favorites" | "security" | "my-cars" | "applications" | "moderation" | "message-moderation" | "users" | "messages";

export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<ActiveSection>("catalog");
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  const [showEditCarModal, setShowEditCarModal] = useState(false);
  const [carToEdit, setCarToEdit] = useState<Car | null>(null);
  const [showDeleteCarModal, setShowDeleteCarModal] = useState(false);
  const [carToDelete, setCarToDelete] = useState<Car | null>(null);
  const [showRemoveCarModal, setShowRemoveCarModal] = useState(false);
  const [carToRemove, setCarToRemove] = useState<Car | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedServer, setSelectedServer] = useState<string>("all");

  const { data: cars = [], isLoading: carsLoading, refetch: refetchCars } = useQuery<Car[]>({
    queryKey: ["/api/cars", { search: searchQuery, category: selectedCategory, server: selectedServer }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedServer !== 'all') params.append('server', selectedServer);
      
      const url = `/api/cars${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch cars');
      return response.json();
    },
    enabled: activeSection === "catalog",
    refetchInterval: 3000, // Быстрое автообновление каждые 3 секунды
    refetchOnWindowFocus: true,
    refetchOnMount: "always", // Всегда обновляем при монтировании
  });

  const { data: favorites = [], isLoading: favoritesLoading, refetch: refetchFavorites } = useQuery<Car[]>({
    queryKey: ["/api/favorites"],
    enabled: activeSection === "favorites",
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  const { data: myCars = [], isLoading: myCarsLoading, refetch: refetchMyCars } = useQuery<Car[]>({
    queryKey: ["/api/my-cars"],
    enabled: activeSection === "my-cars",
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  const { data: myApplications = [], isLoading: applicationsLoading } = useQuery({
    queryKey: ["/api/my-applications"],
    enabled: activeSection === "applications",
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const deleteCarMutation = useMutation({
    mutationFn: async (carId: number) => {
      await apiRequest("DELETE", `/api/cars/${carId}`);
    },
    onSuccess: () => {
      // Принудительно обновляем все связанные кеши
      queryClient.removeQueries({ queryKey: ["/api/cars"] });
      queryClient.removeQueries({ queryKey: ["/api/my-cars"] });
      queryClient.removeQueries({ queryKey: ["/api/favorites"] });
      
      // Перезапрашиваем данные
      refetchCars();
      refetchMyCars();
      refetchFavorites();
      
      toast({
        title: "Автомобиль удален",
        description: "Автомобиль успешно удален из каталога",
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

  // Удаление из избранного
  const removeFromFavoritesMutation = useMutation({
    mutationFn: async (carId: number) => {
      const response = await apiRequest("POST", `/api/favorites/toggle/${carId}`, {});
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: (result, carId) => {
      // Обновляем кеши
      queryClient.removeQueries({ queryKey: ["/api/favorites"] });
      queryClient.setQueryData(["/api/favorites/check", carId], { isFavorite: false });
      
      // Перезапрашиваем избранное
      refetchFavorites();
      
      toast({
        title: "Удалено из избранного",
        description: "Автомобиль успешно удален из избранного",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить из избранного",
        variant: "destructive",
      });
    },
  });

  const handleEditCar = (car: Car) => {
    setCarToEdit(car);
    setShowEditCarModal(true);
  };

  const handleDeleteCar = (car: Car) => {
    setCarToDelete(car);
    setShowDeleteCarModal(true);
  };

  const confirmDeleteCar = () => {
    if (carToDelete) {
      deleteCarMutation.mutate(carToDelete.id);
      setShowDeleteCarModal(false);
      setCarToDelete(null);
    }
  };

  const handleRemoveCar = (car: Car) => {
    setCarToRemove(car);
    setShowRemoveCarModal(true);
  };

  const confirmRemoveCar = () => {
    if (carToRemove) {
      removeFromFavoritesMutation.mutate(carToRemove.id);
      setShowRemoveCarModal(false);
      setCarToRemove(null);
    }
  };

  // Функция для принудительного обновления всех данных
  const forceRefreshAll = () => {
    queryClient.removeQueries({ queryKey: ["/api/cars"] });
    queryClient.removeQueries({ queryKey: ["/api/my-cars"] });
    queryClient.removeQueries({ queryKey: ["/api/favorites"] });
    queryClient.removeQueries({ queryKey: ["/api/my-applications"] });
    
    // Перезапрашиваем в зависимости от активной секции
    if (activeSection === "catalog") refetchCars();
    if (activeSection === "my-cars") refetchMyCars();
    if (activeSection === "favorites") refetchFavorites();
  };

  const renderContent = () => {
    switch (activeSection) {
      case "catalog":
        if (carsLoading) {
          return (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-slate-400">Загрузка каталога...</p>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {/* Поиск и фильтры */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Поиск автомобилей..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48 bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Категория" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    <SelectItem value="standard">Стандарт</SelectItem>
                    <SelectItem value="sport">Спорт</SelectItem>
                    <SelectItem value="coupe">Купе</SelectItem>
                    <SelectItem value="suv">Внедорожник</SelectItem>
                    <SelectItem value="motorcycle">Мотоцикл</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedServer} onValueChange={setSelectedServer}>
                  <SelectTrigger className="w-full sm:w-48 bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Сервер" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все серверы</SelectItem>
                    <SelectItem value="arbat">Арбат</SelectItem>
                    <SelectItem value="patriki">Патрики</SelectItem>
                    <SelectItem value="rublevka">Рублёвка</SelectItem>
                    <SelectItem value="tverskoy">Тверской</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={forceRefreshAll}
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  Обновить
                </Button>
              </div>
            </div>

            {/* Результаты */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Каталог автомобилей
                {cars.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-slate-700 text-slate-300">
                    {cars.length}
                  </Badge>
                )}
              </h2>
            </div>

            {cars.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400 text-lg">Автомобили не найдены</p>
                <p className="text-slate-500 text-sm mt-2">
                  Попробуйте изменить параметры поиска
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    onViewDetails={setSelectedCar}
                    onEdit={user && (user.role === 'admin' || user.role === 'moderator' || car.createdBy === user.id) ? handleEditCar : undefined}
                    onDelete={user && (user.role === 'admin' || user.role === 'moderator' || car.createdBy === user.id) ? handleDeleteCar : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case "favorites":
        if (favoritesLoading) {
          return (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-slate-400">Загрузка избранного...</p>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Избранные автомобили
                {favorites.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-slate-700 text-slate-300">
                    {favorites.length}
                  </Badge>
                )}
              </h2>
              <Button 
                onClick={refetchFavorites}
                variant="outline"
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                Обновить
              </Button>
            </div>

            {favorites.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400 text-lg">У вас нет избранных автомобилей</p>
                <p className="text-slate-500 text-sm mt-2">
                  Добавьте автомобили в избранное из каталога
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    onViewDetails={setSelectedCar}
                    onRemove={handleRemoveCar}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case "my-cars":
        if (myCarsLoading) {
          return (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-slate-400">Загрузка ваших автомобилей...</p>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Мои автомобили
                {myCars.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-slate-700 text-slate-300">
                    {myCars.length}
                  </Badge>
                )}
              </h2>
              <Button 
                onClick={refetchMyCars}
                variant="outline"
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                Обновить
              </Button>
            </div>

            {myCars.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400 text-lg">У вас нет опубликованных автомобилей</p>
                <p className="text-slate-500 text-sm mt-2">
                  Подайте заявку на добавление автомобиля
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myCars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    onViewDetails={setSelectedCar}
                    onEdit={handleEditCar}
                    onDelete={handleDeleteCar}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case "applications":
        if (applicationsLoading) {
          return (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-slate-400">Загрузка заявок...</p>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Мои заявки
                {myApplications.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-slate-700 text-slate-300">
                    {myApplications.length}
                  </Badge>
                )}
              </h2>
              <Button
                onClick={() => setShowAddCarModal(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Подать заявку
              </Button>
            </div>

            {myApplications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400 text-lg">У вас нет поданных заявок</p>
                <Button
                  onClick={() => setShowAddCarModal(true)}
                  className="mt-4 bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Подать первую заявку
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {myApplications.map((application: any) => (
                  <div key={application.id} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">{application.name}</h3>
                      <Badge 
                        variant={
                          application.status === "approved" ? "default" :
                          application.status === "rejected" ? "destructive" : "secondary"
                        }
                        className={
                          application.status === "approved" ? "bg-green-600 text-green-100" :
                          application.status === "rejected" ? "bg-red-600 text-red-100" : "bg-yellow-600 text-yellow-100"
                        }
                      >
                        {application.status === "approved" ? "Одобрено" :
                         application.status === "rejected" ? "Отклонено" : "На рассмотрении"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Цена:</span>
                        <p className="text-white font-medium">{application.price?.toLocaleString()} ₽</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Категория:</span>
                        <p className="text-white font-medium">{application.category}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Сервер:</span>
                        <p className="text-white font-medium">{application.server}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Дата:</span>
                        <p className="text-white font-medium">
                          {new Date(application.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "security":
        return <SecurityAlerts />;

      case "moderation":
        return <ModerationPanel />;

      case "message-moderation":
        return <MessageModerationPanel />;

      case "messages":
        return <MessagesPanel />;

      default:
        return (
          <div className="text-center py-12">
            <p className="text-slate-400">Выберите раздел из меню</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <main className="flex-1 lg:ml-64">
        <div className="p-6">
          {renderContent()}
        </div>
      </main>

      {/* Modals */}
      <CarDetailsModal
        car={selectedCar}
        open={!!selectedCar}
        onOpenChange={(open) => !open && setSelectedCar(null)}
      />

      <AddCarModal
        open={showAddCarModal}
        onOpenChange={setShowAddCarModal}
      />

      <EditCarModal
        car={carToEdit}
        open={showEditCarModal}
        onOpenChange={(open) => {
          setShowEditCarModal(open);
          if (!open) {
            setCarToEdit(null);
          }
        }}
      />

      <DeleteCarModal
        car={carToDelete}
        open={showDeleteCarModal}
        onOpenChange={setShowDeleteCarModal}
        onConfirm={confirmDeleteCar}
        isLoading={deleteCarMutation.isPending}
      />

      <RemoveCarModal
        car={carToRemove}
        open={showRemoveCarModal}
        onOpenChange={setShowRemoveCarModal}
        onConfirm={confirmRemoveCar}
        isLoading={removeFromFavoritesMutation.isPending}
      />

      <NotificationSystem />
    </div>
  );
}
