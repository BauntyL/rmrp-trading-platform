// ============ АДМИНИСТРАТИВНЫЕ РОУТЫ ============

// Applications routes для админов
app.get('/api/applications/pending', async (req, res) => {
  console.log(`📝 GET /api/applications/pending - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for pending applications`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  if (req.user.role !== 'admin') {
    console.log(`❌ Access denied for pending applications: ${req.user.username} (role: ${req.user.role})`);
    return res.status(403).json({ error: 'Нет прав доступа' });
  }

  try {
    const applications = await storage.getPendingCarApplications();
    console.log(`📋 Admin ${req.user.username} requested ${applications.length} pending applications`);
    res.json(applications);
  } catch (error) {
    console.error('❌ Error fetching pending applications:', error);
    res.status(500).json({ error: 'Ошибка получения заявок' });
  }
});

app.get('/api/applications', async (req, res) => {
  console.log(`📝 GET /api/applications - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for all applications`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  if (req.user.role !== 'admin') {
    console.log(`❌ Access denied for all applications: ${req.user.username} (role: ${req.user.role})`);
    return res.status(403).json({ error: 'Нет прав доступа' });
  }

  try {
    const applications = await storage.getAllCarApplications();
    console.log(`📋 Admin ${req.user.username} requested ${applications.length} total applications`);
    res.json(applications);
  } catch (error) {
    console.error('❌ Error fetching all applications:', error);
    res.status(500).json({ error: 'Ошибка получения всех заявок' });
  }
});

// Car applications handling
app.post('/api/car-applications', async (req, res) => {
  console.log(`📝 POST /api/car-applications - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for car application`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const applicationData = {
      ...req.body,
      userId: req.user.id,
    };
    
    console.log(`📝 Creating car application: ${JSON.stringify(applicationData)}`);
    const application = await storage.createCarApplication(applicationData);
    console.log(`✅ Car application created with ID: ${application.id}`);
    res.status(201).json(application);
  } catch (error) {
    console.error('❌ Error creating car application:', error);
    res.status(500).json({ error: 'Ошибка создания заявки на автомобиль' });
  }
});

app.put('/api/applications/:id/approve', async (req, res) => {
  console.log(`📝 PUT /api/applications/${req.params.id}/approve - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for application approval`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  if (req.user.role !== 'admin') {
    console.log(`❌ Access denied for application approval: ${req.user.username} (role: ${req.user.role})`);
    return res.status(403).json({ error: 'Нет прав доступа' });
  }

  try {
    const applicationId = parseInt(req.params.id);
    const application = await storage.updateCarApplicationStatus(applicationId, 'approved', req.user.id);
    
    if (!application) {
      console.log(`❌ Application not found for approval: ${applicationId}`);
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    console.log(`✅ Application approved: ${applicationId} by ${req.user.username}`);
    res.json(application);
  } catch (error) {
    console.error('❌ Error approving application:', error);
    res.status(500).json({ error: 'Ошибка одобрения заявки' });
  }
});

app.put('/api/applications/:id/reject', async (req, res) => {
  console.log(`📝 PUT /api/applications/${req.params.id}/reject - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for application rejection`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  if (req.user.role !== 'admin') {
    console.log(`❌ Access denied for application rejection: ${req.user.username} (role: ${req.user.role})`);
    return res.status(403).json({ error: 'Нет прав доступа' });
  }

  try {
    const applicationId = parseInt(req.params.id);
    const application = await storage.updateCarApplicationStatus(applicationId, 'rejected', req.user.id);
    
    if (!application) {
      console.log(`❌ Application not found for rejection: ${applicationId}`);
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    console.log(`✅ Application rejected: ${applicationId} by ${req.user.username}`);
    res.json(application);
  } catch (error) {
    console.error('❌ Error rejecting application:', error);
    res.status(500).json({ error: 'Ошибка отклонения заявки' });
  }
});

// ============ УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ============

app.get('/api/users', async (req, res) => {
  console.log(`📝 GET /api/users - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for users list`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  if (req.user.role !== 'admin') {
    console.log(`❌ Access denied for users list: ${req.user.username} (role: ${req.user.role})`);
    return res.status(403).json({ error: 'Нет прав доступа' });
  }

  try {
    const users = await storage.getAllUsers();
    console.log(`📋 Admin ${req.user.username} requested ${users.length} users`);
    
    // Убираем пароли из ответа
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ error: 'Ошибка получения списка пользователей' });
  }
});

app.put('/api/users/:id/role', async (req, res) => {
  console.log(`📝 PUT /api/users/${req.params.id}/role - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for role change`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  if (req.user.role !== 'admin') {
    console.log(`❌ Access denied for role change: ${req.user.username} (role: ${req.user.role})`);
    return res.status(403).json({ error: 'Нет прав доступа' });
  }

  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    if (!role || !['user', 'admin'].includes(role)) {
      console.log(`❌ Invalid role provided: ${role}`);
      return res.status(400).json({ error: 'Недопустимая роль пользователя' });
    }

    const updatedUser = await storage.updateUserRole(userId, role);
    
    if (!updatedUser) {
      console.log(`❌ User not found for role change: ${userId}`);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    console.log(`✅ User role updated: ${updatedUser.username} -> ${role} by ${req.user.username}`);
    
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    res.status(500).json({ error: 'Ошибка изменения роли пользователя' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  console.log(`📝 DELETE /api/users/${req.params.id} - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for user deletion`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  if (req.user.role !== 'admin') {
    console.log(`❌ Access denied for user deletion: ${req.user.username} (role: ${req.user.role})`);
    return res.status(403).json({ error: 'Нет прав доступа' });
  }

  try {
    const userId = parseInt(req.params.id);
    
    if (userId === req.user.id) {
      console.log(`❌ Admin trying to delete themselves: ${req.user.username}`);
      return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }

    const deleted = await storage.deleteUser(userId);
    
    if (!deleted) {
      console.log(`❌ User not found for deletion: ${userId}`);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    console.log(`✅ User deleted: ${userId} by ${req.user.username}`);
    res.json({ message: 'Пользователь удален' });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ error: 'Ошибка удаления пользователя' });
  }
});

// Favorites management
app.post('/api/favorites', async (req, res) => {
  console.log(`📝 POST /api/favorites - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for adding favorite`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const { carId } = req.body;
    
    if (!carId) {
      return res.status(400).json({ error: 'Не указан ID автомобиля' });
    }

    const favorite = await storage.addToFavorites({
      userId: req.user.id,
      carId: parseInt(carId)
    });

    console.log(`✅ Added to favorites: car ${carId} by ${req.user.username}`);
    res.status(201).json(favorite);
  } catch (error) {
    console.error('❌ Error adding to favorites:', error);
    res.status(500).json({ error: 'Ошибка добавления в избранное' });
  }
});

app.delete('/api/favorites/:carId', async (req, res) => {
  console.log(`📝 DELETE /api/favorites/${req.params.carId} - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for removing favorite`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const carId = parseInt(req.params.carId);
    const removed = await storage.removeFromFavorites(req.user.id, carId);

    if (!removed) {
      console.log(`❌ Favorite not found for removal: car ${carId} by ${req.user.username}`);
      return res.status(404).json({ error: 'Избранное не найдено' });
    }

    console.log(`✅ Removed from favorites: car ${carId} by ${req.user.username}`);
    res.json({ message: 'Удалено из избранного' });
  } catch (error) {
    console.error('❌ Error removing from favorites:', error);
    res.status(500).json({ error: 'Ошибка удаления из избранного' });
  }
});
