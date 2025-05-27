import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import CarCard from "@/components/car-card";
import { Heart } from "lucide-react";

export function FavoritesPage() {
  const { user } = useAuth();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: !!user,
    refetchOnWindowFocus: true,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <Heart className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Войдите в систему</h2>
          <p className="text-slate-400">
            Для просмотра избранных автомобилей необходимо войти в систему
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Избранное</h1>
          <div className="text-center py-20">
            <div className="text-slate-400">Загрузка избранных автомобилей...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="h-8 w-8 text-red-500 fill-current" />
          <h1 className="text-3xl font-bold text-white">
            Избранное ({favorites.length})
          </h1>
        </div>

        {favorites.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-20 text-center">
              <Heart className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Пока нет избранных автомобилей
              </h2>
              <p className="text-slate-400">
                Добавляйте понравившиеся автомобили в избранное, нажимая на ❤️
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((car: any) => (
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
  );
}
