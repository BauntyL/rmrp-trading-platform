import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { db, users, insertUserSchema, selectUserSchema } from "./storage.js";
import { eq } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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

// Passport Local Strategy
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (user.length === 0) {
        return done(null, false, { message: 'Incorrect email.' });
      }

      const validPassword = await bcrypt.compare(password, user[0].password);
      
      if (!validPassword) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      return done(null, user[0]);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
    done(null, user[0] || null);
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

// API Routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, username } = insertUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user
    const newUser = await db.insert(users).values({
      email,
      password: hashedPassword,
      username
    }).returning();

    res.status(201).json({ 
      message: 'User created successfully', 
      user: { id: newUser[0].id, email: newUser[0].email, username: newUser[0].username }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: 'Invalid input data' });
  }
});

app.post('/api/login', passport.authenticate('local'), (req, res) => {
  res.json({ 
    message: 'Login successful', 
    user: { 
      id: req.user.id, 
      email: req.user.email, 
      username: req.user.username 
    }
  });
});

app.post('/api/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logout successful' });
  });
});

app.get('/api/user', requireAuth, (req, res) => {
  res.json({ 
    user: { 
      id: req.user.id, 
      email: req.user.email, 
      username: req.user.username 
    }
  });
});

// Serve static files
app.use(express.static(join(__dirname, '../public')));

// Catch all handler for SPA
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
