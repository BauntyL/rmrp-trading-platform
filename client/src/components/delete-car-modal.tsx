import { Car } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteCarModalProps {
  car: Car | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteCarModal({ car, open, onOpenChange, onConfirm, isLoading }: DeleteCarModalProps) {
  if (!car) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-800 border-slate-700">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">
                Удалить автомобиль
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Это действие нельзя отменить
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-slate-300 mb-4">
            Вы уверены, что хотите удалить автомобиль{" "}
            <span className="font-semibold text-white">"{car.name}"</span>?
          </p>
          
          <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Категория:</span>
              <span className="text-white">
                {car.category === "standard" ? "Стандарт" :
                 car.category === "sport" ? "Спорт" :
                 car.category === "coupe" ? "Купе" :
                 car.category === "suv" ? "Внедорожник" :
                 "Мотоцикл"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Сервер:</span>
              <span className="text-white">
                {car.server === "arbat" ? "Арбат" :
                 car.server === "patriki" ? "Патрики" :
                 car.server === "rublevka" ? "Рублёвка" :
                 "Тверской"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Цена:</span>
              <span className="text-emerald-400 font-medium">
                {new Intl.NumberFormat("ru-RU", {
                  style: "currency",
                  currency: "RUB",
                  minimumFractionDigits: 0,
                }).format(car.price)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="flex-1 bg-slate-700 hover:bg-slate-600"
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? "Удаление..." : "Удалить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}