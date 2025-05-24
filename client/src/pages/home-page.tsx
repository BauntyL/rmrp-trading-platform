import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Car } from "@shared/schema";
import { Sidebar } from "@/components/sidebar";
import { CarCard } from "@/components/car-card";
import { CarDetailsModal } from "@/components/car-details-modal";
import { AddCarModal } from "@/components/add-car-modal";
import { ModerationPanel } from "@/components/moderation-panel";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";

type ActiveSection = "catalog" | "favorites" | "my-cars" | "applications" | "moderation" | "users";

export default function HomePage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<ActiveSection>("catalog");
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedServer, setSelectedServer] = useState<string>("all");

  const { data: cars = [], isLoading: carsLoading } = useQuery<Car[]>({
    queryKey: ["/api/cars", { search: searchQuery, category: selectedCategory, server: selectedServer }],
    enabled: activeSection === "catalog",
  });

  const { data: favorites = [], isLoading: favoritesLoading } = useQuery<Car[]>({
    queryKey: ["/api/favorites"],
    enabled: activeSection === "favorites",
  });

  const { data: myCars = [], isLoading: myCarsLoading } = useQuery<Car[]>({
    queryKey: ["/api/my-cars"],
    enabled: activeSection === "my-cars",
  });

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
                  />
                ))}
              </div>
            )}
          </div>
        );

      case "moderation":
      case "users":
        return <ModerationPanel activeTab={activeSection} />;

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
    </div>
  );
}
