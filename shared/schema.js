// Упрощенные схемы без Drizzle для in-memory хранилища
export const users = {
  table: 'users'
};

export const cars = {
  table: 'cars'
};

export const carApplications = {
  table: 'car_applications'
};

export const favorites = {
  table: 'favorites'
};

export const messages = {
  table: 'messages'
};

// Перечисления для валидации
export const Categories = {
  STANDARD: 'standard',
  SPORT: 'sport', 
  COUPE: 'coupe',
  SUV: 'suv',
  MOTORCYCLE: 'motorcycle'
};

export const Servers = {
  ARBAT: 'arbat',
  PATRIKI: 'patriki', 
  RUBLEVKA: 'rublevka',
  TVERSKOY: 'tverskoy'
};

export const UserRoles = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
};
