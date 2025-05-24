import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";

const editUserSchema = z.object({
  username: z.string().min(3, "Имя пользователя должно содержать минимум 3 символа"),
  role: z.enum(["user", "moderator", "admin"]),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserModalProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserModal({ user, open, onOpenChange }: EditUserModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: user?.username || "",
      role: user?.role || "user",
    },
  });

  // Обновляем значения формы при изменении пользователя
  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username,
        role: user.role,
      });
    }
  }, [user, form]);

  const editMutation = useMutation({
    mutationFn: async (data: EditUserFormData) => {
      if (!user) throw new Error("Пользователь не выбран");
      const res = await apiRequest("PATCH", `/api/users/${user.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Успешно",
        description: "Данные пользователя обновлены",
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

  const onSubmit = (data: EditUserFormData) => {
    editMutation.mutate(data);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Редактировать пользователя</DialogTitle>
          <DialogDescription className="text-slate-400">
            Изменение данных пользователя {user.username}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Имя пользователя</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Введите имя пользователя"
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Роль</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Выберите роль" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="user" className="text-white focus:bg-slate-600">
                        Пользователь
                      </SelectItem>
                      <SelectItem value="moderator" className="text-white focus:bg-slate-600">
                        Модератор
                      </SelectItem>
                      <SelectItem value="admin" className="text-white focus:bg-slate-600">
                        Администратор
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={editMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {editMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}