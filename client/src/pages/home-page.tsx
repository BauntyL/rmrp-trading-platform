import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MessageSquare, LogOut, User, Heart, Car, Settings, Users } from "lucide-react";

import { CarCard } from "@/components/car-card";
import { AddCarModal } from "@/components/add-car-modal";
import { MessagesPanel } from "@/components/messages-panel";
import { UnreadMessagesCounter } from "@/components/unread-messages-counter";
import { useAuth } from "@/hooks/use-auth";

// ИСПРАВЛЯЕМ: убираем импорт Car из схемы, используем any для простоты
type CarType = any;

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [addCarModalOpen, setAddCarModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("catalog");

  // ИСПРАВЛЯЕМ: добавляем проверки для безопасности
  const isValidUser = user && 
                     typeof user === 'object' && 
                     user.id && 
                     user.username && 
                     typeof user.id === 'number';

  console.log('🏠 HomePage render:', { 
    user, 
    isValidUser, 
    userId: user?.id, 
    userType: typeof user 
  });

  // Если пользователь невалидный, показываем заглушку
  if (!isValidUser) {
    console.log('❌ Invalid user on HomePage, redirecting...');
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <p className="text-white mb-4">Ошибка загрузки данных пользователя</p>
          <Button onClick={() => window.location.reload()}>
            Перезагрузить страницу
          </Button>
        </div>
      </div>
    );
  }

  const { data: cars = [], isLoading: carsLoading } = useQuery<CarType[]>({
    queryKey: ["/api/cars"],
    enabled: isValidUser, // Загружаем только если пользователь валидный
  });

  // ИСПРАВЛЯЕМ: безопасное получение автомобилей пользователя
  const { data: userCars = [], isLoading: userCarsLoading } = useQuery<CarType[]>({
    queryKey: ["/api/cars/my"],
    enabled: isValidUser, // Загружаем только если пользователь валидный
  });

  // ИСПРАВЛЯЕМ: безопасное получение избранного
  const { data: favoriteCars = [], isLoading: favoritesLoading } = useQuery<CarType[]>({
    queryKey: ["/api/favorites"],
    enabled: isValidUser, // Загружаем только если пользователь валидный
  });

  // Мемоизируем фильтрацию для производительности
  const { approvedCars, pendingCars } = useMemo(() => {
    const approved = cars.filter(car => car.status === 'approved');
    const pending = cars.filter(car => car.status === 'pending');
    return { approvedCars: approved, pendingCars: pending };
  }, [cars]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isAdmin = user.role === 'admin';
  const isModerator = user.role === 'moderator' || isAdmin;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Car className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-white">АвтоКаталог</h1>
              </div>
              <Badge variant="outline" className="text-primary border-primary">
                {user.role === 'admin' ? 'Администратор' : 
                 user.role === 'moderator' ? 'Модератор' : 'Пользователь'}
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-300">
                <User className="h-4 w-4" />
                <span>{user.username}</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {logoutMutation.isPending ? 'Выход...' : 'Выйти'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-6 bg-slate-800">
            <TabsTrigger value="catalog" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">Каталог</span>
            </TabsTrigger>
            
            <TabsTrigger value="messages" className="flex items-center gap-2 relative">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Сообщения</span>
              <UnreadMessagesCounter />
            </TabsTrigger>
            
            <TabsTrigger value="my-cars" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Мои авто</span>
            </TabsTrigger>
            
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Избранное</span>
            </TabsTrigger>

            {isModerator && (
              <TabsTrigger value="moderation" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Модерация</span>
                {pendingCars.length > 0 && (
                  <Badge className="ml-1 bg-red-500 text-white text-xs px-1 py-0.5">
                    {pendingCars.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Каталог автомобилей */}
          <TabsContent value="catalog" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Каталог автомобилей</h2>
              <Button onClick={() => setAddCarModalOpen(true)} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Добавить автомобиль
              </Button>
            </div>

            {carsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-slate-800 rounded-lg p-6 animate-pulse">
                    <div className="w-full h-48 bg-slate-700 rounded-lg mb-4"></div>
                    <div className="h-6 bg-slate-700 rounded mb-2"></div>
                    <div className="h-4 bg-slate-700 rounded mb-4 w-2/3"></div>
                    <div className="h-8 bg-slate-700 rounded"></div>
                  </div>
                ))}
              </div>
            ) : approvedCars.length === 0 ? (
              <div className="text-center py-12">
                <Car className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-400 mb-2">
                  Автомобили не найдены
                </h3>
                <p className="text-slate-500">
                  Станьте первым, кто добавит автомобиль в каталог!
                </p>
                <Button 
                  onClick={() => setAddCarModalOpen(true)} 
                  className="mt-4 gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Добавить автомобиль
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {approvedCars.map((car: any) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Сообщения */}
          <TabsContent value="messages">
            <MessagesPanel />
          </TabsContent>

          {/* Мои автомобили */}
          <TabsContent value="my-cars" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Мои автомобили</h2>
              <Button onClick={() => setAddCarModalOpen(true)} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Добавить автомобиль
              </Button>
            </div>

            {userCarsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-slate-800 rounded-lg p-6 animate-pulse">
                    <div className="w-full h-48 bg-slate-700 rounded-lg mb-4"></div>
                    <div className="h-6 bg-slate-700 rounded mb-2"></div>
                    <div className="h-4 bg-slate-700 rounded mb-4 w-2/3"></div>
                    <div className="h-8 bg-slate-700 rounded"></div>
                  </div>
                ))}
              </div>
            ) : userCars.length === 0 ? (
              <div className="text-center py-12">
                <Car className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-400 mb-2">
                  У вас нет автомобилей
                </h3>
                <p className="text-slate-500">
                  Добавьте свой первый автомобиль в каталог
                </p>
                <Button 
                  onClick={() => setAddCarModalOpen(true)} 
                  className="mt-4 gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Добавить автомобиль
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userCars.map((car: any) => (
                  <CarCard key={car.id} car={car} showEditButton={true} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Избранное */}
          <TabsContent value="favorites" className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Избранные автомобили</h2>

            {favoritesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-slate-800 rounded-lg p-6 animate-pulse">
                    <div className="w-full h-48 bg-slate-700 rounded-lg mb-4"></div>
                    <div className="h-6 bg-slate-700 rounded mb-2"></div>
                    <div className="h-4 bg-slate-700 rounded mb-4 w-2/3"></div>
                    <div className="h-8 bg-slate-700 rounded"></div>
                  </div>
                ))}
              </div>
            ) : favoriteCars.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-400 mb-2">
                  Нет избранных автомобилей
                </h3>
                <p className="text-slate-500">
                  Добавляйте автомобили в избранное, нажимая на сердечко
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteCars.map((car: any) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Модерация */}
          {isModerator && (
            <TabsContent value="moderation" className="space-y-6">
              <h2 className="text-2xl font-bold text-white">
                Модерация объявлений
                {pendingCars.length > 0 && (
                  <Badge className="ml-2 bg-red-500">
                    {pendingCars.length} на рассмотрении
                  </Badge>
                )}
              </h2>

              {carsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-slate-800 rounded-lg p-6 animate-pulse">
                      <div className="w-full h-48 bg-slate-700 rounded-lg mb-4"></div>
                      <div className="h-6 bg-slate-700 rounded mb-2"></div>
                      <div className="h-4 bg-slate-700 rounded mb-4 w-2/3"></div>
                      <div className="h-8 bg-slate-700 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : pendingCars.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-400 mb-2">
                    Нет заявок на модерацию
                  </h3>
                  <p className="text-slate-500">
                    Все объявления рассмотрены
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingCars.map((car: any) => (
                    <CarCard key={car.id} car={car} showModerationActions={true} />
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Модал добавления автомобиля */}
      <AddCarModal
        open={addCarModalOpen}
        onOpenChange={setAddCarModalOpen}
      />
    </div>
  );
}
