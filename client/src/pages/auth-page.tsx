import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Shield, Users, Check, X } from "lucide-react";
import { Redirect } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";

// Компонент индикатора силы пароля
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const requirements = [
    { regex: /.{8,}/, text: "Минимум 8 символов" },
    { regex: /[A-Z]/, text: "Заглавная буква" },
    { regex: /[a-z]/, text: "Строчная буква" },
    { regex: /[0-9]/, text: "Цифра" },
    { regex: /[^A-Za-z0-9]/, text: "Специальный символ" },
  ];

  const metRequirements = requirements.filter(req => req.regex.test(password));
  const strength = metRequirements.length;

  const getStrengthColor = () => {
    if (strength <= 1) return "bg-red-500";
    if (strength <= 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    if (strength <= 1) return "Слабый";
    if (strength <= 3) return "Средний";
    return "Сильный";
  };

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-slate-600 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${(strength / 5) * 100}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${
          strength <= 1 ? "text-red-400" : 
          strength <= 3 ? "text-yellow-400" : "text-green-400"
        }`}>
          {getStrengthText()}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {requirements.map((req, index) => {
          const met = req.regex.test(password);
          return (
            <div key={index} className={`flex items-center space-x-2 text-xs ${
              met ? "text-green-400" : "text-slate-400"
            }`}>
              {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              <span>{req.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const loginSchema = z.object({
  username: z.string().min(1, "Введите имя пользователя"),
  password: z.string().min(1, "Введите пароль"),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z.object({
  username: z.string()
    .min(3, "Имя пользователя должно содержать минимум 3 символа")
    .max(50, "Имя пользователя не должно превышать 50 символов")
    .regex(/^[a-zA-Z0-9_-]+$/, "Имя пользователя может содержать только буквы, цифры, дефис и подчеркивание"),
  password: z.string()
    .min(8, "Пароль должен содержать минимум 8 символов")
    .regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву")
    .regex(/[a-z]/, "Пароль должен содержать хотя бы одну строчную букву")
    .regex(/[0-9]/, "Пароль должен содержать хотя бы одну цифру")
    .regex(/[^A-Za-z0-9]/, "Пароль должен содержать хотя бы один специальный символ"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");

  // Функции для работы с сохраненными данными
  const getSavedCredentials = () => {
    try {
      const saved = localStorage.getItem("rememberedCredentials");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const saveCredentials = (username: string, password: string) => {
    localStorage.setItem("rememberedCredentials", JSON.stringify({ username, password }));
  };

  const clearSavedCredentials = () => {
    localStorage.removeItem("rememberedCredentials");
  };

  const savedCredentials = getSavedCredentials();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: savedCredentials?.username || "",
      password: savedCredentials?.password || "",
      rememberMe: !!savedCredentials,
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const onLoginSubmit = (data: LoginFormData) => {
    // Сохраняем или очищаем данные в зависимости от выбора пользователя
    if (data.rememberMe) {
      saveCredentials(data.username, data.password);
    } else {
      clearSavedCredentials();
    }
    
    // Отправляем только username и password на сервер
    loginMutation.mutate({
      username: data.username,
      password: data.password
    });
  };

  const onRegisterSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left side - Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Car className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">АвтоКаталог</h1>
                <p className="text-slate-400 text-sm">Российский автомобильный каталог</p>
              </div>
            </div>
          </div>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center text-white">
                Добро пожаловать
              </CardTitle>
              <CardDescription className="text-center text-slate-400">
                Войдите в систему или создайте аккаунт
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                  <TabsTrigger value="login" className="data-[state=active]:bg-primary">Вход</TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-primary">Регистрация</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
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
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Пароль</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="password"
                                placeholder="Введите пароль"
                                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="rememberMe"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-slate-300 text-sm font-normal cursor-pointer">
                                Запомнить данные для входа
                              </FormLabel>
                              <p className="text-xs text-slate-500">
                                Данные будут сохранены в браузере для удобства
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Вход..." : "Войти"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
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
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">Пароль</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="password"
                                placeholder="Введите пароль"
                                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                              />
                            </FormControl>
                            <PasswordStrengthIndicator password={field.value || ""} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Регистрация..." : "Зарегистрироваться"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/20 to-slate-800 items-center justify-center p-8">
        <div className="text-center space-y-8 max-w-md">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-white">
              Найдите автомобиль мечты
            </h2>
            <p className="text-lg text-slate-300">
              Крупнейший каталог автомобилей с подробными характеристиками 
              и возможностью связи с продавцами
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-center space-x-4 p-4 bg-slate-800/50 rounded-lg backdrop-blur-sm">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <Car className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-white">Обширный каталог</h3>
                <p className="text-slate-300 text-sm">Тысячи автомобилей всех категорий</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-slate-800/50 rounded-lg backdrop-blur-sm">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-white">Проверенные объявления</h3>
                <p className="text-slate-300 text-sm">Модерация всех заявок</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-slate-800/50 rounded-lg backdrop-blur-sm">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-white">Активное сообщество</h3>
                <p className="text-slate-300 text-sm">Прямая связь с владельцами</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
