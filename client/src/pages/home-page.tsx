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

  const { data: cars = [], isLoading: carsLoading } = useQuery<Car[]>({
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
    refetchInterval: 5000, // Автообновление каждые 5 секунд
    refetchOnWindowFocus: true, // Обновление при возврате на вкладку
  });

  const { data: favorites = [], isLoading: favoritesLoading } = useQuery<Car[]>({
    queryKey: ["/api/favorites"],
    enabled: activeSection === "favorites",
    refetchInterval: 5000, // Автообновление каждые 5 секунд
    refetchOnWindowFocus: true,
  });

  const { data: myCars = [], isLoading: myCarsLoading } = useQuery<Car[]>({
    queryKey: ["/api/my-cars"],
    enabled: activeSection === "my-cars",
    refetchInterval: 5000, // Автообновление каждые 5 секунд
    refetchOnWindowFocus: true,
  });

  const { data: myApplications = [], isLoading: applicationsLoading } = useQuery({
    queryKey: ["/api/my-applications"],
    enabled: activeSection === "applications",
    refetchInterval: 5000, // Автообновление каждые 5 секунд
    refetchOnWindowFocus: true,
  });

  const deleteCarMutation = useMutation({
    mutationFn: async (carId: number) => {
      await apiRequest("DELETE", `/api/cars/${carId}`);
    },
    onSuccess: () => {
      // Принудительно обновляем все связанные кеши
      queryClient.removeQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
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

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (carId: number) => {
      if (!user) {
        throw new Error("Необходимо войти в систему");
      }
      
      const response = await apiRequest("POST", `/api/favorites/toggle/${carId}`, {});
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Необходимо войти в систему");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get("content-type");
      console.log("Response content-type:", contentType);
      console.log("Response status:", response.status);
      
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text();
        console.log("Response text (first 200 chars):", responseText.substring(0, 200));
        throw new Error("Получен неверный формат данных");
      }
      
      const result = await response.json();
      return result;
    },
    onSuccess: (result, carId) => {
      // Принудительно обновляем все кеши
      queryClient.setQueryData(["/api/favorites/check", carId], { isFavorite: result.isFavorite });
      queryClient.removeQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/check"] });
      
      toast({
        title: result.action === "added" ? "Добавлено в избранное" : "Удалено из избранного",
        description: result.action === "added" 
          ? "Автомобиль успешно добавлен в избранное"
          : "Автомобиль успешно удален из избранного",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить избранное",
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
    console.log("handleRemoveCar вызвана для автомобиля:", car.name);
    setCarToRemove(car);
    setShowRemoveCarModal(true);
    console.log("Состояние модального окна установлено в true");
  };

  const renderContent = () => {
    switch (activeSection) {
      case "catalog":
        return (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-white">Каталог автомобилей</h2>
                <p className="text-slate-400">Найдите автомобиль своей мечты</p>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Поиск автомобилей..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-80 pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
                
                <Button 
                  onClick={() => setShowAddCarModal(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить авто
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="flex items-center space-x-2">
                <label className="text-slate-300 text-sm font-medium">Категория:</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48 bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Все категории" />
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
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-slate-300 text-sm font-medium">Сервер:</label>
                <Select value={selectedServer} onValueChange={setSelectedServer}>
                  <SelectTrigger className="w-48 bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Все серверы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все серверы</SelectItem>
                    <SelectItem value="arbat">Арбат</SelectItem>
                    <SelectItem value="patriki">Патрики</SelectItem>
                    <SelectItem value="rublevka">Рублевка</SelectItem>
                    <SelectItem value="tverskoy">Тверской</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="ml-auto text-slate-400 text-sm">
                Найдено: <span className="text-white font-medium">{cars.length}</span> автомобилей
              </div>
            </div>

            {carsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden animate-pulse">
                    <div className="w-full h-48 bg-slate-700" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-slate-700 rounded w-3/4" />
                      <div className="h-3 bg-slate-700 rounded w-1/2" />
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-700 rounded" />
                        <div className="h-3 bg-slate-700 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : cars.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-400 text-lg mb-2">Автомобили не найдены</div>
                <p className="text-slate-500">Попробуйте изменить параметры поиска</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {cars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    onViewDetails={setSelectedCar}
                    onEdit={handleEditCar}
                    onDelete={handleDeleteCar}
                    onToggleFavorite={() => 
                      toggleFavoriteMutation.mutate(car.id)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        );

      case "favorites":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Избранное</h2>
              <p className="text-slate-400">Ваши любимые автомобили</p>
            </div>
            
            {favoritesLoading ? (
              <div>Загрузка...</div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-400 text-lg mb-2">Избранное пусто</div>
                <p className="text-slate-500">Добавьте автомобили в избранное из каталога</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {favorites.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    onViewDetails={setSelectedCar}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case "messages":
        return <MessagesPanel />;

      case "security":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Безопасность аккаунта</h2>
              <p className="text-slate-400">Настройки и статус защиты вашего аккаунта</p>
            </div>
            
            <SecurityAlerts />
          </div>
        );

      case "my-cars":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Мои автомобили</h2>
                <p className="text-slate-400">Автомобили, которые вы добавили</p>
              </div>
              <Button onClick={() => setShowAddCarModal(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Добавить авто
              </Button>
            </div>
            
            {myCarsLoading ? (
              <div>Загрузка...</div>
            ) : myCars.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-400 text-lg mb-2">У вас нет автомобилей</div>
                <p className="text-slate-500">Добавьте свой первый автомобиль</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {myCars.map((car) => (
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

      case "applications":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Мои заявки</h2>
              <p className="text-slate-400">Статус ваших заявок на добавление автомобилей</p>
            </div>
            
            {applicationsLoading ? (
              <div className="text-center py-8">
                <div className="text-slate-400">Загрузка заявок...</div>
              </div>
            ) : myApplications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-400 text-lg mb-2">У вас нет заявок</div>
                <p className="text-slate-500 mb-4">Создайте заявку на добавление автомобиля</p>
                <Button onClick={() => setShowAddCarModal(true)} className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить автомобиль
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {myApplications.map((application: any) => (
                  <div key={application.id} className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">{application.name}</h3>
                        <p className="text-slate-400 text-sm">
                          Подано: {new Date(application.createdAt).toLocaleDateString("ru-RU", {
                            day: "2-digit",
                            month: "2-digit", 
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={`${
                          application.status === "pending" ? "bg-yellow-500 text-yellow-900" :
                          application.status === "approved" ? "bg-green-500 text-green-100" :
                          "bg-red-500 text-red-100"
                        }`}>
                          {application.status === "pending" ? "На рассмотрении" :
                           application.status === "approved" ? "Одобрено" :
                           "Отклонено"}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="text-slate-400 text-sm">Категория:</span>
                        <div className="text-white font-medium">
                          {application.category === "standard" ? "Стандарт" :
                           application.category === "sport" ? "Спорт" :
                           application.category === "coupe" ? "Купе" :
                           application.category === "suv" ? "Внедорожник" :
                           "Мотоцикл"}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 text-sm">Сервер:</span>
                        <div className="text-white font-medium">
                          {application.server === "arbat" ? "Арбат" :
                           application.server === "patriki" ? "Патрики" :
                           application.server === "rublevka" ? "Рублёвка" :
                           "Тверской"}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 text-sm">Цена:</span>
                        <div className="text-emerald-400 font-medium">
                          {new Intl.NumberFormat("ru-RU", {
                            style: "currency",
                            currency: "RUB",
                            minimumFractionDigits: 0,
                          }).format(application.price)}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 text-sm">Макс. скорость:</span>
                        <div className="text-white font-medium">{application.maxSpeed} км/ч</div>
                      </div>
                    </div>

                    {application.description && (
                      <div className="mb-4">
                        <span className="text-slate-400 text-sm">Описание:</span>
                        <p className="text-slate-300 text-sm mt-1">{application.description}</p>
                      </div>
                    )}

                    {application.status === "approved" && (
                      <div className="text-sm text-green-400">
                        ✓ Ваш автомобиль добавлен в каталог
                      </div>
                    )}

                    {application.status === "rejected" && application.reviewedAt && (
                      <div className="text-sm text-red-400">
                        ✗ Заявка отклонена {new Date(application.reviewedAt).toLocaleDateString("ru-RU")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "moderation":
      case "users":
        return <ModerationPanel activeTab={activeSection} />;

      case "message-moderation":
        return <MessageModerationPanel />;

      default:
        return <div>Раздел в разработке</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto p-6">
          {renderContent()}
        </div>
      </main>

      {/* Система уведомлений работает в фоне */}
      <NotificationSystem />

      {selectedCar && (
        <CarDetailsModal
          car={selectedCar}
          open={!!selectedCar}
          onOpenChange={(open) => !open && setSelectedCar(null)}
        />
      )}

      <AddCarModal
        open={showAddCarModal}
        onOpenChange={setShowAddCarModal}
      />

      <EditCarModal
        car={carToEdit}
        open={showEditCarModal}
        onOpenChange={setShowEditCarModal}
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
      />
    </div>
  );
}
