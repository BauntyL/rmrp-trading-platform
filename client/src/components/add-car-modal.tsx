import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const carApplicationSchema = z.object({
  name: z.string().min(1, "Введите название автомобиля"),
  category: z.enum(["standard", "sport", "coupe", "suv", "motorcycle"], {
    required_error: "Выберите категорию",
  }),
  server: z.enum(["arbat", "patriki", "rublevka", "tverskoy"], {
    required_error: "Выберите сервер",
  }),
  price: z.coerce.number().min(1, "Цена должна быть больше 0"),
  maxSpeed: z.coerce.number().min(1, "Максимальная скорость должна быть больше 0"),
  acceleration: z.string().min(1, "Введите время разгона"),
  drive: z.enum(["FWD", "RWD", "AWD"], {
    required_error: "Выберите тип привода",
  }),
  serverId: z.string().optional(),
  phone: z.string().optional(),
  telegram: z.string().optional(),
  discord: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  isPremium: z.boolean().default(false),
});

type CarApplicationFormData = z.infer<typeof carApplicationSchema>;

interface AddCarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCarModal({ open, onOpenChange }: AddCarModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CarApplicationFormData>({
    resolver: zodResolver(carApplicationSchema),
    defaultValues: {
      name: "",
      category: undefined,
      server: undefined,
      price: 0,
      maxSpeed: 0,
      acceleration: "",
      drive: undefined,
      serverId: "",
      phone: "",
      telegram: "",
      discord: "",
      imageUrl: "",
      description: "",
      isPremium: false,
    },
  });

  const createApplicationMutation = useMutation({
    mutationFn: async (data: CarApplicationFormData) => {
      console.log('🚀 Starting form submission...');
      console.log('📤 Original form data:', data);
      
      // Filter out empty strings for optional fields
      const cleanData = {
        ...data,
        serverId: data.serverId || undefined,
        phone: data.phone || undefined,
        telegram: data.telegram || undefined,
        discord: data.discord || undefined,
        imageUrl: data.imageUrl || undefined,
        description: data.description || undefined,
      };
      
      console.log('📤 Clean data to send:', cleanData);
      
      try {
        console.log('📡 Making API request to /api/applications...');
        const res = await apiRequest("POST", "/api/applications", cleanData);
        console.log('📥 Raw API Response:', res);
        console.log('📊 Response status:', res.status);
        console.log('📊 Response ok:', res.ok);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ API Error response:', errorText);
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        
        const result = await res.json();
        console.log('✅ Parsed API Response:', result);
        return result;
        
      } catch (error) {
        console.error('💥 API Request failed:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log('🎉 Mutation successful:', result);
      queryClient.invalidateQueries({ queryKey: ["/api/my-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/pending"] });
      toast({
        title: "Заявка отправлена",
        description: "Ваша заявка на добавление автомобиля отправлена на модерацию",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('💥 Mutation failed:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CarApplicationFormData) => {
    console.log('🚀 Form submitted with data:', data);
    console.log('🔄 Starting mutation...');
    createApplicationMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Добавить автомобиль</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Car Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Название автомобиля *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Например: BMW M5 Competition"
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category and Server */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Категория *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Стандарт</SelectItem>
                        <SelectItem value="sport">Спорт</SelectItem>
                        <SelectItem value="coupe">Купе</SelectItem>
                        <SelectItem value="suv">Внедорожник</SelectItem>
                        <SelectItem value="motorcycle">Мотоцикл</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="server"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Сервер *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Выберите сервер" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="arbat">Арбат</SelectItem>
                        <SelectItem value="patriki">Патрики</SelectItem>
                        <SelectItem value="rublevka">Рублёвка</SelectItem>
                        <SelectItem value="tverskoy">Тверской</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Price and Speed */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Цена (₽) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="1500000"
                        className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxSpeed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Макс. скорость (км/ч) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="250"
                        className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Acceleration and Drive */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="acceleration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Разгон до 100 км/ч *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="5.2 сек"
                        className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="drive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Тип привода *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Выберите привод" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FWD">Передний (FWD)</SelectItem>
                        <SelectItem value="RWD">Задний (RWD)</SelectItem>
                        <SelectItem value="AWD">Полный (AWD)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Server ID */}
            <FormField
              control={form.control}
              name="serverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">ID на сервере</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Например: #ABC-123"
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">Контактная информация</h4>
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Телефон</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="+7 (999) 123-45-67"
                        className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="telegram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Telegram</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="@username"
                          className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discord"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Discord</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="username#1234"
                          className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Image URL */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Ссылка на изображение</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      placeholder="https://example.com/car-image.jpg"
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Дополнительное описание</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Дополнительная информация об автомобиле..."
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Premium checkbox */}
            <FormField
              control={form.control}
              name="isPremium"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-slate-600 p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="border-slate-500 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-slate-300 cursor-pointer">
                      Премиум автомобиль
                    </FormLabel>
                    <p className="text-sm text-slate-400">
                      Отметьте, если это редкий или эксклюзивный автомобиль
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={createApplicationMutation.isPending}
              >
                {createApplicationMutation.isPending ? "Отправка..." : "Отправить заявку"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
