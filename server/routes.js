const express = require('express');
const path = require('path');
const storage = require('./storage');

function setupRoutes(app) {
  // Middleware для авторизации
  function requireAuth(req, res, next) {
    console.log('🔐 Auth check:', req.isAuthenticated() ? `User: ${req.user?.username}` : 'Not authenticated');
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
  }

  function requireModeratorOrAdmin(req, res, next) {
    console.log('🛡️ Role check:', req.user?.role);
    if (req.isAuthenticated() && (req.user.role === 'moderator' || req.user.role === 'admin')) {
      return next();
    }
    res.status(403).json({ error: 'Forbidden - Moderator or Admin role required' });
  }

  function requireAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') {
      return next();
    }
    res.status(403).json({ error: 'Forbidden - Admin role required' });
  }

  // API Routes - ДОЛЖНЫ БЫТЬ ПЕРВЫМИ!
  
  // Test endpoint
  app.get('/api/test', (req, res) => {
    console.log('🧪 Test endpoint called');
    res.json({ 
      message: 'API is working!', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Auth routes
  app.get('/api/user', (req, res) => {
    console.log('👤 User info requested');
    if (req.isAuthenticated()) {
      res.json({
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        createdAt: req.user.created_at
      });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  app.post('/api/logout', (req, res) => {
    console.log('🚪 Logout requested');
    req.logout((err) => {
      if (err) {
        console.error('❌ Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Car applications
  app.post('/api/applications', requireAuth, async (req, res) => {
    try {
      console.log('📝 Creating application for user:', req.user.username);
      console.log('📋 Application data:', req.body);
      
      const { brand, model, year, price, description } = req.body;
      
      // Валидация данных
      if (!brand || !model || !year || !price) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const application = await storage.createApplication({
        brand: brand.trim(),
        model: model.trim(),
        year: parseInt(year),
        price: parseFloat(price),
        description: description?.trim() || '',
        createdBy: req.user.id
      });

      console.log('✅ Application created with ID:', application.id);
      res.status(201).json(application);
    } catch (error) {
      console.error('❌ Error creating application:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/applications', requireModeratorOrAdmin, async (req, res) => {
    try {
      console.log('📋 Fetching applications for moderator/admin:', req.user.username);
      
      // No-cache headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const applications = await storage.getApplications();
      console.log('📦 Found applications count:', applications.length);
      
      if (applications.length > 0) {
        console.log('📄 First application:', {
          id: applications[0].id,
          brand: applications[0].brand,
          model: applications[0].model,
          status: applications[0].status
        });
      }
      
      res.json(applications);
    } catch (error) {
      console.error('❌ Error fetching applications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/my-applications', requireAuth, async (req, res) => {
    try {
      console.log('📋 Fetching applications for user:', req.user.username);
      
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const applications = await storage.getUserApplications(req.user.id);
      console.log('📦 Found user applications:', applications.length);
      
      res.json(applications);
    } catch (error) {
      console.error('❌ Error fetching user applications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/applications/:id', requireModeratorOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      console.log(`🔄 Updating application ${id} to status: ${status} by ${req.user.username}`);

      const application = await storage.updateApplicationStatus(parseInt(id), status);
      
      // Если заявка одобрена, создаем объявление
      if (status === 'approved') {
        console.log('✅ Application approved, creating car listing...');
        try {
          await storage.createCarListing({
            brand: application.brand,
            model: application.model,
            year: application.year,
            price: application.price,
            description: application.description,
            ownerId: application.created_by,
            applicationId: application.id
          });
          console.log('🚗 Car listing created successfully');
        } catch (listingError) {
          console.error('❌ Error creating car listing:', listingError);
        }
      }

      res.json(application);
    } catch (error) {
      console.error('❌ Error updating application:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Car listings
  app.get('/api/cars', async (req, res) => {
    try {
      console.log('🚗 Fetching car listings...');
      
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const cars = await storage.getCarListings();
      console.log('🚗 Found cars:', cars.length);
      
      res.json(cars);
    } catch (error) {
      console.error('❌ Error fetching cars:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/cars/:id', async (req, res) => {
    try {
      const { id } = req.params;
      console.log('🚗 Fetching car by ID:', id);
      
      const car = await storage.getCarListingById(parseInt(id));
      
      if (!car) {
        return res.status(404).json({ error: 'Car not found' });
      }

      res.json(car);
    } catch (error) {
      console.error('❌ Error fetching car:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Messages
  app.get('/api/messages', requireAuth, async (req, res) => {
    try {
      console.log('💬 Fetching messages for user:', req.user.username);
      
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const messages = await storage.getUserMessages(req.user.id);
      res.json(messages);
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/messages', requireAuth, async (req, res) => {
    try {
      const { receiverId, content, carId } = req.body;
      console.log('💬 Creating message from:', req.user.username);
      
      const message = await storage.createMessage({
        senderId: req.user.id,
        receiverId: parseInt(receiverId),
        content,
        carId: carId ? parseInt(carId) : null
      });

      res.status(201).json(message);
    } catch (error) {
      console.error('❌ Error creating message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/messages/:id/read', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markMessageAsRead(parseInt(id), req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Error marking message as read:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Unread counts
  app.get('/api/unread-count', requireAuth, async (req, res) => {
    try {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const count = await storage.getUnreadMessageCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error('❌ Error fetching unread count:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // User management (admin only)
  app.get('/api/users', requireAdmin, async (req, res) => {
    try {
      console.log('👥 Fetching users for admin:', req.user.username);
      
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/users/:id/role', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      console.log(`👤 Updating user ${id} role to: ${role}`);
      
      const user = await storage.updateUserRole(parseInt(id), role);
      res.json(user);
    } catch (error) {
      console.error('❌ Error updating user role:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Favorites
  app.get('/api/favorites', requireAuth, async (req, res) => {
    try {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const favorites = await storage.getUserFavorites(req.user.id);
      res.json(favorites);
    } catch (error) {
      console.error('❌ Error fetching favorites:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/favorites', requireAuth, async (req, res) => {
    try {
      const { carId } = req.body;
      await storage.addToFavorites(req.user.id, parseInt(carId));
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Error adding to favorites:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/favorites/:carId', requireAuth, async (req, res) => {
    try {
      const { carId } = req.params;
      await storage.removeFromFavorites(req.user.id, parseInt(carId));
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Error removing from favorites:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Pending applications count for moderators/admins
  app.get('/api/pending', requireModeratorOrAdmin, async (req, res) => {
    try {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const count = await storage.getPendingApplicationsCount();
      res.json({ count });
    } catch (error) {
      console.error('❌ Error fetching pending count:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // STATIC FILES - ПОСЛЕ ВСЕХ API ROUTES
  console.log('📁 Setting up static files middleware...');
  app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0'
  }));

  // CATCH-ALL - САМЫМ ПОСЛЕДНИМ (для React Router)
  console.log('🔄 Setting up catch-all route for React Router...');
  app.get('*', (req, res) => {
    console.log('📄 Serving React app for:', req.path);
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

module.exports = setupRoutes;
