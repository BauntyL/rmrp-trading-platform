import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CarApplication, User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Users, Shield, Crown, Clock } from "lucide-react";

interface ModerationPanelProps {
  activeTab: "moderation" | "users";
}

const categoryNames = {
  standard: "Стандарт",
  sport: "Спорт",
  coupe: "Купе", 
  suv: "Внедорожник",
  motorcycle: "Мотоцикл",
};

const serverNames = {
  arbat: "Арбат",
  patriki: "Патрики",
  rublevka: "Рублёвка",
  tverskoy: "Тверской",
};

const statusNames = {
  pending: "На рассмотрении",
  approved: "Одобрено",
  rejected: "Отклонено",
};

const statusColors = {
  pending: "bg-yellow-500 text-yellow-900",
  approved: "bg-green-500 text-green-100",
  rejected: "bg-red-500 text-red-100",
};

const roleNames = {
  user: "Пользователь",
  moderator: "Модератор",
  admin: "Администратор",
};

const roleColors = {
  user: "bg-gray-500 text-gray-100",
  moderator: "bg-blue-500 text-blue-100",
  admin: "bg-amber-500 text-amber-900",
};

export function ModerationPanel({ activeTab }: ModerationPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<CarApplication | null>(null);

  const { data: applications = [], isLoading: applicationsLoading } = useQuery<CarApplication[]>({
    queryKey: ["/api/applications"],
    enabled: activeTab === "moderation" && (user?.role === "moderator" || user?.role === "admin"),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: activeTab === "users" && user?.role === "admin",
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "approved" | "rejected" }) => {
      const res = await apiRequest("PATCH", `/api/applications/${id}`, { status });
      return await res.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications/pending"] });
      toast({
        title: status === "approved" ? "Заявка одобрена" : "Заявка отклонена",
        description: status === "approved" 
          ? "Автомобиль добавлен в каталог"
          : "Заявка отклонена и удалена",
      });
      setSelectedApplication(null);
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус заявки",
        variant: "destructive",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: "user" | "moderator" | "admin" }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}/role`, { role });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Роль обновлена",
        description: "Роль пользователя успешно изменена",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить роль пользователя",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingApplications = applications.filter(app => app.status === "pending");
  const processedApplications = applications.filter(app => app.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {activeTab === "moderation" ? "Модерация заявок" : "Управление пользователями"}
        </h2>
        <p className="text-slate-400">
          {activeTab === "moderation" 
            ? "Рассмотрение заявок на добавление автомобилей"
            : "Управление ролями и правами пользователей"
          }
        </p>
      </div>

      {activeTab === "moderation" && (
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="pending" className="data-[state=active]:bg-primary">
              <Clock className="h-4 w-4 mr-2" />
              На рассмотрении ({pendingApplications.length})
            </TabsTrigger>
            <TabsTrigger value="processed" className="data-[state=active]:bg-primary">
              <CheckCircle className="h-4 w-4 mr-2" />
              Обработанные ({processedApplications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {applicationsLoading ? (
              <div className="text-center py-8">
                <div className="text-slate-400">Загрузка заявок...</div>
              </div>
            ) : pendingApplications.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-8 text-center">
                  <div className="text-slate-400 text-lg mb-2">Нет заявок на рассмотрении</div>
                  <p className="text-slate-500">Все заявки обработаны</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingApplications.map((application) => (
                  <Card key={application.id} className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white">{application.name}</CardTitle>
                          <CardDescription className="text-slate-400">
                            Заявка от {formatDate(application.createdAt)}
                          </CardDescription>
                        </div>
                        <div className="flex space-x-2">
                          <Badge className={`${statusColors[application.status]}`}>
                            {statusNames[application.status]}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Категория:</span>
                          <div className="text-white font-medium">{categoryNames[application.category]}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Сервер:</span>
                          <div className="text-white font-medium">{serverNames[application.server]}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Цена:</span>
                          <div className="text-emerald-400 font-medium">{formatPrice(application.price)}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Макс. скорость:</span>
                          <div className="text-white font-medium">{application.maxSpeed} км/ч</div>
                        </div>
                      </div>

                      {application.description && (
                        <div>
                          <span className="text-slate-400 text-sm">Описание:</span>
                          <p className="text-slate-300 text-sm mt-1">{application.description}</p>
                        </div>
                      )}

                      <div className="flex space-x-3">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-slate-600 text-slate-300 hover:bg-slate-700"
                              onClick={() => setSelectedApplication(application)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Подробнее
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
                            <DialogHeader>
                              <DialogTitle className="text-white">Детали заявки</DialogTitle>
                            </DialogHeader>
                            {selectedApplication && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-semibold text-white mb-2">Основная информация</h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Название:</span>
                                        <span className="text-white">{selectedApplication.name}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Категория:</span>
                                        <span className="text-white">{categoryNames[selectedApplication.category]}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Сервер:</span>
                                        <span className="text-white">{serverNames[selectedApplication.server]}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Цена:</span>
                                        <span className="text-emerald-400">{formatPrice(selectedApplication.price)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-white mb-2">Характеристики</h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Макс. скорость:</span>
                                        <span className="text-white">{selectedApplication.maxSpeed} км/ч</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Разгон:</span>
                                        <span className="text-white">{selectedApplication.acceleration}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Привод:</span>
                                        <span className="text-white">{selectedApplication.drive}</span>
                                      </div>
                                      {selectedApplication.serverId && (
                                        <div className="flex justify-between">
                                          <span className="text-slate-400">ID сервера:</span>
                                          <span className="text-white">{selectedApplication.serverId}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {(selectedApplication.phone || selectedApplication.telegram || selectedApplication.discord) && (
                                  <div>
                                    <h4 className="font-semibold text-white mb-2">Контакты</h4>
                                    <div className="space-y-1 text-sm">
                                      {selectedApplication.phone && (
                                        <div>Телефон: <span className="text-slate-300">{selectedApplication.phone}</span></div>
                                      )}
                                      {selectedApplication.telegram && (
                                        <div>Telegram: <span className="text-slate-300">{selectedApplication.telegram}</span></div>
                                      )}
                                      {selectedApplication.discord && (
                                        <div>Discord: <span className="text-slate-300">{selectedApplication.discord}</span></div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {selectedApplication.description && (
                                  <div>
                                    <h4 className="font-semibold text-white mb-2">Описание</h4>
                                    <p className="text-slate-300 text-sm">{selectedApplication.description}</p>
                                  </div>
                                )}

                                <div className="flex space-x-3 pt-4 border-t border-slate-700">
                                  <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={() => updateApplicationMutation.mutate({ 
                                      id: selectedApplication.id, 
                                      status: "approved" 
                                    })}
                                    disabled={updateApplicationMutation.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Одобрить
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={() => updateApplicationMutation.mutate({ 
                                      id: selectedApplication.id, 
                                      status: "rejected" 
                                    })}
                                    disabled={updateApplicationMutation.isPending}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Отклонить
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => updateApplicationMutation.mutate({ 
                            id: application.id, 
                            status: "approved" 
                          })}
                          disabled={updateApplicationMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Одобрить
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => updateApplicationMutation.mutate({ 
                            id: application.id, 
                            status: "rejected" 
                          })}
                          disabled={updateApplicationMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Отклонить
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="processed" className="space-y-4">
            {processedApplications.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-8 text-center">
                  <div className="text-slate-400 text-lg mb-2">Нет обработанных заявок</div>
                  <p className="text-slate-500">Здесь будут отображаться одобренные и отклоненные заявки</p>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">Название</TableHead>
                    <TableHead className="text-slate-300">Категория</TableHead>
                    <TableHead className="text-slate-300">Статус</TableHead>
                    <TableHead className="text-slate-300">Дата обработки</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedApplications.map((application) => (
                    <TableRow key={application.id} className="border-slate-700">
                      <TableCell className="text-white">{application.name}</TableCell>
                      <TableCell className="text-slate-300">{categoryNames[application.category]}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[application.status]}`}>
                          {statusNames[application.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {application.reviewedAt ? formatDate(application.reviewedAt) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      )}

      {activeTab === "users" && user?.role === "admin" && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Users className="h-5 w-5 mr-2" />
              Пользователи системы
            </CardTitle>
            <CardDescription className="text-slate-400">
              Управление ролями и правами пользователей
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="text-center py-8">
                <div className="text-slate-400">Загрузка пользователей...</div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">Пользователь</TableHead>
                    <TableHead className="text-slate-300">Роль</TableHead>
                    <TableHead className="text-slate-300">Дата регистрации</TableHead>
                    <TableHead className="text-slate-300">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userItem) => (
                    <TableRow key={userItem.id} className="border-slate-700">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-primary/40 to-primary rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {userItem.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-white font-medium">{userItem.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${roleColors[userItem.role]} flex items-center w-fit`}>
                          {userItem.role === "admin" && <Crown className="h-3 w-3 mr-1" />}
                          {userItem.role === "moderator" && <Shield className="h-3 w-3 mr-1" />}
                          {roleNames[userItem.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {formatDate(userItem.createdAt)}
                      </TableCell>
                      <TableCell>
                        {userItem.id !== user.id && (
                          <Select
                            value={userItem.role}
                            onValueChange={(newRole: "user" | "moderator" | "admin") => {
                              updateUserRoleMutation.mutate({ id: userItem.id, role: newRole });
                            }}
                          >
                            <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Пользователь</SelectItem>
                              <SelectItem value="moderator">Модератор</SelectItem>
                              <SelectItem value="admin">Администратор</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {userItem.id === user.id && (
                          <span className="text-slate-500 text-sm">Текущий пользователь</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
