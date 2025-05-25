console.log('🚀 Starting server...');
console.log('PORT:', process.env.PORT || 10000);
console.log('NODE_ENV:', process.env.NODE_ENV);

console.log('📦 Trying to import express...');
import express from "express";

console.log('📦 Trying to import other modules...');
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

console.log('📦 Trying to import storage...');
try {
  const { storage } = await import("./storage.js");
  console.log('✅ Storage imported successfully');
} catch (error) {
  console.error('❌ Error importing storage:', error);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🔧 Setting up middleware...');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

console.log('🔧 Setting up passport strategy...');

// Passport Local Strategy
passport.use(new LocalStrategy(
  { usernameField: 'username' },
  async (username, password, done) => {
    try {
      console.log('🔑 Trying to authenticate user:', username);
      const { storage } = await import("./storage.js");
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        console.log('❌ User not found:', username);
        return done(null, false, { message: 'Incorrect username.' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        console.log('❌ Invalid password for user:', username);
        return done(null, false, { message: 'Incorrect password.' });
      }

      console.log('✅ User authenticated successfully:', username);
      return done(null, user);
    } catch (error) {
      console.error('❌ Authentication error:', error);
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { storage } = await import("./storage.js");
    const user = await storage.getUser(id);
    done(null, user || null);
  } catch (error) {
    done(error);
  }
});

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

console.log('🔧 Setting up API routes...');

// API Routes
app.post('/api/register', async (req, res) => {
  try {
    console.log('📝 Registration attempt:', req.body.username);
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const { storage } = await import("./storage.js");
    
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    
    if (existingUser) {
      console.log('❌ User already exists:', username);
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const newUser = await storage.createUser({
      username,
      password: hashedPassword,
      role: 'user'
    });

    console.log('✅ User created successfully:', username);
    res.status(201).json({ 
      message: 'User created successfully', 
      user: { id: newUser.id, username: newUser.username, role: newUser.role }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', passport.authenticate('local'), (req, res) => {
  console.log('✅ Login successful:', req.user.username);
  res.json({ 
    message: 'Login successful', 
    user: { 
      id: req.user.id, 
      username: req.user.username, 
      role: req.user.role 
    }
  });
});

app.post('/api/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    console.log('✅ Logout successful');
    res.json({ message: 'Logout successful' });
  });
});

app.get('/api/user', requireAuth, (req, res) => {
  res.json({ 
    user: { 
      id: req.user.id, 
      username: req.user.username, 
      role: req.user.role 
    }
  });
});

console.log('🔧 Setting up static files...');

// Serve static files
app.use(express.static(join(__dirname, '../public')));

// Catch all handler for SPA
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

console.log('🔧 About to start listening on port:', PORT);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server successfully running on port ${PORT}`);
  console.log(`🌐 Server listening on 0.0.0.0:${PORT}`);
});

console.log('🎯 Server setup complete, waiting for connections...');
