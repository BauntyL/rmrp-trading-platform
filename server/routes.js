const express = require('express');
const path = require('path');
const storage = require('./storage');

function setupRoutes(app) {
  // Middleware для авторизации
  function requireAuth(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
  }

  function requireModeratorOrAdmin(req, res, next) {
    if (req.isAuthenticated() && (req.user.role === 'moderator' || req.user.role === 'admin')) {
      return next();
    }
    res.status(403).json({ error: 'Forbidden' });
  }

  function requireAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') {
      return next();
    }
    res.status(403).json({ error: 'Forbidden' });
  }

  // API Routes

  // Auth routes
  app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
      res.json({
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Car applications
  app.post('/api/applications', requireAuth, async (req, res) => {
    try {
      const { brand, model, year, price, description } = req.body;
      
      const application = await storage.createApplication({
        brand,
        model,
        year: parseInt(year),
        price: parseFloat(price),
        description,
        createdBy: req.user.id
      });

      res.status(201).json(application);
    } catch (error) {
      console.error('Error creating application:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/applications', requireModeratorOrAdmin, async (req, res) => {
    try {
      // Добавить no-cache headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const applications = await storage.getApplications();
      res.json(applications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/my-applications', requireAuth, async (req, res) => {
    try {
      // Добавить no-cache headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const applications = await storage.getUserApplications(req.user.id);
      res.json(applications);
    } catch (error) {
      console.error('Error fetching user applications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/applications/:id', requireModeratorOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const application = await storage.updateApplicationStatus(parseInt(id), status);
      
      // Если заявка одобрена, создаем объявление
      if (status === 'approved') {
        await storage.createCarListing({
          brand: application.brand,
          model: application.model,
          year: application.year,
          price: application.price,
          description: application.description,
          ownerId: application.created_by,
          applicationId: application.id
        });
      }

      res.json(application);
    } catch (error) {
      console.error('Error updating application:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Car listings
  app.get('/api/cars', async (req, res) => {
    try {
      // Добавить no-cache headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const cars = await storage.getCarListings();
      res.json(cars);
    } catch (error) {
      console.error('Error fetching cars:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/cars/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const car = await storage.getCarListingById(parseInt(id));
      
      if (!car) {
        return res.status(404).json({ error: 'Car not found' });
      }

      res.json(car);
    } catch (error) {
      console.error('Error fetching car:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Messages
  app.get('/api/messages', requireAuth, async (req, res) => {
    try {
      // Добавить no-cache headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const messages = await storage.getUserMessages(req.user.id);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/messages', requireAuth, async (req, res) => {
    try {
      const { receiverId, content, carId } = req.body;
      
      const message = await storage.createMessage({
        senderId: req.user.id,
        receiverId: parseInt(receiverId),
        content,
        carId: carId ? parseInt(carId) : null
      });

      res.status(201).json(message);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/messages/:id/read', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markMessageAsRead(parseInt(id), req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Unread counts
  app.get('/api/unread-count', requireAuth, async (req, res) => {
    try {
      // Добавить no-cache headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const count = await storage.getUnreadMessageCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // User management (admin only)
  app.get('/api/users', requireAdmin, async (req, res) => {
    try {
      // Добавить no-cache headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/users/:id/role', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      const user = await storage.updateUserRole(parseInt(id), role);
      res.json(user);
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Favorites
  app.get('/api/favorites', requireAuth, async (req, res) => {
    try {
      // Добавить no-cache headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const favorites = await storage.getUserFavorites(req.user.id);
      res.json(favorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/favorites', requireAuth, async (req, res) => {
    try {
      const { carId } = req.body;
      await storage.addToFavorites(req.user.id, parseInt(carId));
      res.json({ success: true });
    } catch (error) {
      console.error('Error adding to favorites:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/favorites/:carId', requireAuth, async (req, res) => {
    try {
      const { carId } = req.params;
      await storage.removeFromFavorites(req.user.id, parseInt(carId));
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing from favorites:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Pending applications count for moderators/admins
  app.get('/api/pending', requireModeratorOrAdmin, async (req, res) => {
    try {
      // Добавить no-cache headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const count = await storage.getPendingApplicationsCount();
      res.json({ count });
    } catch (error) {
      console.error('Error fetching pending count:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Serve static files from the React app build
  app.use(express.static(path.join(__dirname, '../public')));

  // Catch all handler: send back React's index.html file for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

module.exports = setupRoutes;
