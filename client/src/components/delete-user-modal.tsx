import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";

interface DeleteUserModalProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteUserModal({ user, open, onOpenChange }: DeleteUserModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Пользователь не выбран");
      const res = await apiRequest("DELETE", `/api/users/${user.id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Успешно",
        description: "Пользователь полностью удален из системы",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-800 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Удалить пользователя?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Вы уверены, что хотите удалить пользователя <span className="font-semibold text-white">{user.username}</span>?
            <br />
            <br />
            <span className="text-red-400 font-medium">
              Аккаунт будет полностью удален из системы. Будут также удалены:
            </span>
            <ul className="list-disc ml-6 mt-2 text-slate-400">
              <li>Все автомобили пользователя</li>
              <li>Все заявки пользователя</li>
              <li>Весь список избранного</li>
            </ul>
            <br />
            <span className="text-orange-400 font-medium">
              Для повторного доступа потребуется новая регистрация.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            disabled={deleteMutation.isPending}
          >
            Отмена
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deleteMutation.isPending ? "Удаление..." : "Удалить"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}