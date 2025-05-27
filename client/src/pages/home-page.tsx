import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  PlusCircle, 
  MessageSquare, 
  LogOut, 
  User, 
  Heart, 
  Car, 
  Settings, 
  Users,
  Search,
  Shield,
  Send
} from "lucide-react";

import { CarCard } from "@/components/car-card.tsx";
import { AddCarModal } from "@/components/add-car-modal.tsx";
import { MessagesPanel } from "@/components/messages-panel.tsx";
import { UnreadMessagesCounter } from "@/components/unread-messages-counter.tsx";
// import { SecurityPanel } from "@/components/security-panel";
// import { MessageModerationPanel } from "@/components/message-moderation-panel";
// import { UserManagementPanel } from "@/components/user-management-panel.tsx";
import { useAuth } from "@/hooks/use-auth.tsx";

function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [addCarModalOpen, setAddCarModalOpen] = useState(false);
  const [activeView, setActiveView] = useState("catalog");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSort, setSelectedSort] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedServer, setSelectedServer] = useState("all");

  const { data: cars = [], isLoading: carsLoading } = useQuery({
    queryKey: ["/api/cars"],
  });

  const { data: userCars = [], isLoading: userCarsLoading } = useQuery({
    queryKey: ["/api/cars/my"],
  });

  const { data: favoriteCars = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ["/api/favorites"],
  });

  const approvedCars = cars.filter((car: any) => car.status === 'approved');
  const pendingCars = cars.filter((car: any) => car.status === 'pending');

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleTelegramClick = () => {
    window.open('https://t.me/bauntyprog', '_blank');
  };

  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator' || isAdmin;

  const sidebarItems = [
    { id: 'catalog', label: 'Каталог автомобилей', icon: Car },
    { id: 'favorites', label: 'Избранное', icon: Heart },
    { id: 'messages', label: 'Сообщения', icon: MessageSquare, hasCounter: true },
    { id: 'my-cars', label: 'Мои автомобили', icon: PlusCircle },
    { id: 'security', label: 'Безопасность', icon: Shield },
  ];

  const moderationItems = [
    { id: 'pending-cars', label: 'Заявки на модерацию', icon: Users },
    { id: 'moderation-history', label: 'Модерация сообщений', icon: MessageSquare },
    ...(isAdmin ? [{ id: 'user-management', label: 'Управление пользователями', icon: Settings }] : []),
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'catalog':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Каталог автомобилей</h1>
                <p className="text-slate-400">Найдите автомобиль своей мечты</p>
              </div>
              <Button onClick={() => setAddCarModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <PlusCircle className="h-4 w-4 mr-2" />
                Добавить авто
              </Button>
            </div>

            <div className="flex space-x-4 bg-slate-800 p-4 rounded-lg">
              <div className="flex-1">
                <Input
                  placeholder="Поиск автомобилей..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Категория" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">Все категории</SelectItem>
                  <SelectItem value="standard">Стандарт</SelectItem>
                  <SelectItem value="coupe">Купе</SelectItem>
                  <SelectItem value="suv">Внедорожник</SelectItem>
                  <SelectItem value="sport">Спорт</SelectItem>
                  <SelectItem value="service">Служебная</SelectItem>
                  <SelectItem value="motorcycle">Мотоцикл</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedServer} onValueChange={setSelectedServer}>
                <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Сервер" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">Все серверы</SelectItem>
                  <SelectItem value="arbat">Арбат</SelectItem>
                  <SelectItem value="patriki">Патрики</SelectItem>
                  <SelectItem value="rublevka">Рублевка</SelectItem>
                  <SelectItem value="tverskoy">Тверской</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedSort} onValueChange={setSelectedSort}>
                <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Сортировка" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">По умолчанию</SelectItem>
                  <SelectItem value="newest">Сначала новые</SelectItem>
                  <SelectItem value="price-low">Сначала дешевые</SelectItem>
                  <SelectItem value="price-high">Сначала дорогие</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-slate-400 text-sm">
              Найдено: {approvedCars.length} автомобилей
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
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {approvedCars.map((car: any) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>
            )}
          </div>
        );

      case 'messages':
        return <MessagesPanel />;

      case 'favorites':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Избранные автомобили</h2>
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
          </div>
        );

      case 'my-cars':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-white">Мои автомобили</h2>
              <Button onClick={() => setAddCarModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <PlusCircle className="h-4 w-4 mr-2" />
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
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userCars.map((car: any) => (
                  <CarCard key={car.id} car={car} showEditButton={true} />
                ))}
              </div>
            )}
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Shield className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">Безопасность</h1>
              <p className="text-slate-400">Ваши данные надежно защищены</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <h3 className="text-white font-semibold">Шифрование данных</h3>
                </div>
                <p className="text-slate-300 text-sm">Все ваши данные защищены современным шифрованием AES-256.</p>
              </div>
              
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <h3 className="text-white font-semibold">Защищенные соединения</h3>
                </div>
                <p className="text-slate-300 text-sm">Все коммуникации происходят через защищенный протокол HTTPS.</p>
              </div>
              
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <h3 className="text-white font-semibold">Приватность сообщений</h3>
                </div>
                <p className="text-slate-300 text-sm">Ваши личные сообщения видны только вам и получателю.</p>
              </div>
              
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <h3 className="text-white font-semibold">Модерация контента</h3>
                </div>
                <p className="text-slate-300 text-sm">Наша команда модераторов следит за качеством и безопасностью контента.</p>
              </div>
            </div>
            
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-4">Связаться с отделом безопасности</h3>
              <p className="text-slate-300 text-sm mb-4">
                Если у вас есть вопросы по безопасности или вы обнаружили уязвимость:
              </p>
              <div className="space-y-2 text-sm text-slate-400">
                <p>📧 Email: security@avtokatalog.ru</p>
                <p>⏰ Время ответа: в течение 24 часов</p>
              </div>
            </div>
          </div>
        );

      case 'pending-cars':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">
              Заявки на модерацию
              {pendingCars.length > 0 && (
                <Badge className="ml-2 bg-red-500">
                  {pendingCars.length}
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
          </div>
        );

      case 'moderation-history':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Модерация сообщений</h1>
              <p className="text-slate-400">Просмотр и управление диалогами пользователей</p>
            </div>

            <div className="flex space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Поиск по автомобилю или пользователю..."
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Диалоги (0)
                </h3>
                <div className="text-center py-8 text-slate-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет активных диалогов для модерации</p>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Сообщения
                </h3>
                <div className="text-center py-8 text-slate-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Выберите диалог для просмотра сообщений</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'user-management':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Управление пользователями</h1>
              <p className="text-slate-400">Управление ролями и статусами пользователей</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-8 w-8 text-blue-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">1</p>
                    <p className="text-sm text-slate-400">Всего пользователей</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <User className="h-8 w-8 text-green-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">1</p>
                    <p className="text-sm text-slate-400">Онлайн</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-8 w-8 text-orange-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">0</p>
                    <p className="text-sm text-slate-400">Заблокированы</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Settings className="h-8 w-8 text-purple-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">1</p>
                    <p className="text-sm text-slate-400">Администраторы</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Список пользователей
              </h3>
              <div className="text-center py-8 text-slate-400">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Функция управления пользователями в разработке</p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-slate-400 mb-2">
              Раздел в разработке
            </h3>
            <p className="text-slate-500">
              Этот раздел скоро будет доступен
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Car className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold">АвтоКаталог</h1>
              <p className="text-slate-400 text-sm">v2.0</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-white text-sm font-medium">{user?.username}</span>
                {user?.role === 'admin' && (
                  <Badge className="bg-orange-500 text-xs px-2 py-0.5">Администратор</Badge>
                )}
                {user?.role === 'moderator' && (
                  <Badge className="bg-green-500 text-xs px-2 py-0.5">Модератор</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeView === item.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm">{item.label}</span>
                {item.hasCounter && (
                  <UnreadMessagesCounter />
                )}
              </button>
            );
          })}

          {/* Moderation Section */}
          {isModerator && (
            <>
              <div className="pt-4 pb-2">
                <h3 className="text-slate-500 text-xs uppercase tracking-wider font-semibold px-3">
                  Модерация
                </h3>
              </div>
              {moderationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeView === item.id 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm">{item.label}</span>
                    {item.id === 'pending-cars' && pendingCars.length > 0 && (
                      <Badge className="bg-red-500 text-xs px-2 py-0.5">
                        {pendingCars.length}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 space-y-2">
          <button 
            onClick={handleTelegramClick}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-blue-600 hover:text-white transition-colors text-left group"
          >
            <Send className="h-5 w-5 group-hover:text-white" />
            <span className="text-sm font-medium">Мы в Telegram</span>
          </button>
          <button 
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-left"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm">
              {logoutMutation.isPending ? 'Выход...' : 'Выйти'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>

      <AddCarModal open={addCarModalOpen} onOpenChange={setAddCarModalOpen} />
    </div>
  );
}

export default HomePage;
