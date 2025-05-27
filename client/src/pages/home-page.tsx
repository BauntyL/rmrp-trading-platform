import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CarCard from "@/components/car-card"; // ✅ Убрали фигурные скобки и .tsx
import { AddCarModal } from "@/components/add-car-modal";
import { ModerationPanel } from "@/components/moderation-panel";
import { FavoritesPage } from "@/pages/favorites-page";
import { MessagesPanel } from "@/components/messages-panel";
import { 
  Car, 
  Plus, 
  Settings, 
  Heart,
  MessageSquare, 
  LogOut,
  Filter
} from "lucide-react";

export function HomePage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("catalog");
  const [addCarModalOpen, setAddCarModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    server: "",
    category: "",
    minPrice: "",
    maxPrice: "",
  });

  // Получаем избранное для счетчика
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  // Получаем автомобили
  const { data: cars = [], isLoading } = useQuery({
    queryKey: ["/api/cars"],
    refetchOnWindowFocus: true,
  });

  // Получаем автомобили пользователя
  const { data: userCars = [] } = useQuery({
    queryKey: ["/api/cars/my"],
    enabled: !!user,
  });

  // Получаем непрочитанные сообщения
  const { data: unreadData } = useQuery({
    queryKey: ["/api/unread-count"],
    enabled: !!user,
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });

  const unreadCount = unreadData?.count || 0;
  const favoritesCount = favorites.length;

  // Фильтрация автомобилей
  const filteredCars = cars.filter((car: any) => {
    if (car.status !== 'approved') return false;
    
    if (filters.server && car.server !== filters.server) return false;
    if (filters.category && car.category !== filters.category) return false;
    if (filters.minPrice && car.price < parseInt(filters.minPrice)) return false;
    if (filters.maxPrice && car.price > parseInt(filters.maxPrice)) return false;
    
    return true;
  });

  const handleLogout = () => {
    logout.mutate();
  };

  const navigationItems = [
    {
      id: "catalog",
      icon: Car,
      label: "Каталог",
      badge: filteredCars.length,
    },
    {
      id: "favorites",
      icon: Heart,
      label: "Избранное",
      badge: favoritesCount,
      requireAuth: true,
    },
    {
      id: "my-cars",
      icon: Plus,
      label: "Мои объявления",
      badge: userCars.length,
      requireAuth: true,
    },
    {
      id: "messages",
      icon: MessageSquare,
      label: "Сообщения",
      badge: unreadCount,
      requireAuth: true,
    },
    {
      id: "moderation",
      icon: Settings,
      label: "Модерация",
      requireAuth: true,
      requireRole: ['moderator', 'admin'],
    },
  ];

  const visibleNavItems = navigationItems.filter(item => {
    if (item.requireAuth && !user) return false;
    if (item.requireRole && !item.requireRole.includes(user?.role)) return false;
    return true;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <Car className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Добро пожаловать!
            </h1>
            <p className="text-slate-400 mb-6">
              Войдите в систему для доступа к платформе
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Боковая панель */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        {/* Заголовок */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <Car className="h-8 w-8 text-emerald-400" />
            <div>
              <h1 className="text-xl font-bold text-white">CarTrade</h1>
              <p className="text-sm text-slate-400">Привет, {user.username}</p>
            </div>
          </div>
        </div>

        {/* Навигация */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {visibleNavItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                className={`w-full justify-start h-12 ${
                  activeTab === item.id
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "text-slate-300 hover:text-white hover:bg-slate-700"
                }`}
                onClick={() => setActiveTab(item.id)}
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge > 0 && (
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    activeTab === item.id
                      ? "bg-white text-emerald-600"
                      : "bg-emerald-600 text-white"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </nav>

        {/* Telegram ссылка и выход */}
        <div className="p-4 border-t border-slate-700 space-y-2">
          <Button
            variant="outline"
            className="w-full bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
            onClick={() => window.open('https://t.me/bauntyprog', '_blank')}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Мы в Telegram
          </Button>
          
          <Button
            variant="ghost"
            className="w-full text-slate-300 hover:text-white hover:bg-slate-700"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>
      </div>

      {/* Основной контент */}
      <div className="flex-1 overflow-auto">
        {activeTab === "catalog" && (
          <div className="p-6">
            <div className="max-w-6xl mx-auto">
              {/* Заголовок и кнопка добавления */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">
                  Каталог автомобилей ({filteredCars.length})
                </h2>
                <Button
                  onClick={() => setAddCarModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить объявление
                </Button>
              </div>

              {/* Фильтры */}
              <Card className="bg-slate-800 border-slate-700 mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Filter className="h-5 w-5 text-emerald-400" />
                    <h3 className="text-lg font-semibold text-white">Фильтры</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Сервер
                      </label>
                      <select
                        value={filters.server}
                        onChange={(e) => setFilters({...filters, server: e.target.value})}
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                      >
                        <option value="">Все серверы</option>
                        <option value="arbat">Арбат</option>
                        <option value="patriki">Патрики</option>
                        <option value="rublevka">Рублёвка</option>
                        <option value="tverskoy">Тверской</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Категория
                      </label>
                      <select
                        value={filters.category}
                        onChange={(e) => setFilters({...filters, category: e.target.value})}
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                      >
                        <option value="">Все категории</option>
                        <option value="standard">Стандарт</option>
                        <option value="sport">Спорт</option>
                        <option value="coupe">Купе</option>
                        <option value="suv">Внедорожник</option>
                        <option value="service">Служебная</option>
                        <option value="motorcycle">Мотоцикл</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Цена от
                      </label>
                      <input
                        type="number"
                        value={filters.minPrice}
                        onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                        placeholder="0"
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Цена до
                      </label>
                      <input
                        type="number"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                        placeholder="1000000"
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setFilters({server: "", category: "", minPrice: "", maxPrice: ""})}
                    className="mt-4 bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    Сбросить фильтры
                  </Button>
                </CardContent>
              </Card>

              {/* Список автомобилей */}
              {isLoading ? (
                <div className="text-center py-20">
                  <div className="text-slate-400">Загрузка автомобилей...</div>
                </div>
              ) : filteredCars.length === 0 ? (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="py-20 text-center">
                    <Car className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Автомобили не найдены
                    </h3>
                    <p className="text-slate-400">
                      Попробуйте изменить параметры фильтрации
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCars.map((car: any) => (
                    <CarCard 
                      key={car.id} 
                      car={car} 
                      showEditButton={false}
                      showModerationActions={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "favorites" && <FavoritesPage />}

        {activeTab === "my-cars" && (
          <div className="p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">
                  Мои объявления ({userCars.length})
                </h2>
                <Button
                  onClick={() => setAddCarModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить объявление
                </Button>
              </div>

              {userCars.length === 0 ? (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="py-20 text-center">
                    <Plus className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      У вас пока нет объявлений
                    </h3>
                    <p className="text-slate-400 mb-6">
                      Создайте первое объявление, чтобы начать продавать автомобили
                    </p>
                    <Button
                      onClick={() => setAddCarModalOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить объявление
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userCars.map((car: any) => (
                    <CarCard 
                      key={car.id} 
                      car={car} 
                      showEditButton={true}
                      showModerationActions={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "messages" && <MessagesPanel />}
        {activeTab === "moderation" && <ModerationPanel />}
      </div>

      {/* Модал добавления автомобиля */}
      <AddCarModal
        open={addCarModalOpen}
        onOpenChange={setAddCarModalOpen}
      />
    </div>
  );
}
