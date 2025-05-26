import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Check } from "lucide-react";

interface TermsModalProps {
  open: boolean;
  onAccept: () => void;
}

export function TermsModal({ open, onAccept }: TermsModalProps) {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}} modal>
      <DialogContent className="sm:max-w-[600px] bg-slate-800 border-slate-700 max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <FileText className="h-5 w-5" />
            Пользовательское соглашение
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Пожалуйста, ознакомьтесь с условиями использования нашего сервиса
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-96 pr-4">
          <div className="space-y-4 text-sm text-slate-300">
            <div>
              <h3 className="font-semibold text-white mb-2">1. Общие положения</h3>
              <p>
                Добро пожаловать в АвтоКаталог! Используя наш сервис, вы соглашаетесь 
                соблюдать следующие правила и условия.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">2. Правила размещения объявлений</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Размещайте только достоверную информацию об автомобилях</li>
                <li>Используйте качественные фотографии</li>
                <li>Указывайте корректную цену и контактные данные</li>
                <li>Не размещайте дубликаты объявлений</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">3. Правила общения</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Соблюдайте вежливость в переписке</li>
                <li>Не используйте нецензурную лексику</li>
                <li>Запрещены спам и навязчивая реклама</li>
                <li>Не обманывайте покупателей</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">4. Ответственность</h3>
              <p>
                Администрация не несет ответственности за качество товаров и услуг, 
                предлагаемых пользователями. Все сделки совершаются на свой страх и риск.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">5. Модерация</h3>
              <p>
                Все объявления проходят предварительную модерацию. Администрация оставляет 
                за собой право удалять объявления, нарушающие правила сервиса.
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-amber-800 dark:text-amber-200 text-sm">
                <strong>Важно:</strong> Нарушение правил может привести к блокировке аккаунта. 
                Будьте внимательны и соблюдайте правила сообщества.
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button 
            onClick={onAccept}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            <Check className="h-4 w-4" />
            Принимаю условия соглашения
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
