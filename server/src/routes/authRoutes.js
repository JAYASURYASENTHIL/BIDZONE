import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { signup, login, logout, getMe } from '../controllers/authController.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

const isDev = process.env.NODE_ENV !== 'production';

// ─── Rate limiter: login — 10 attempts/15 min (prod), 100 (dev) ────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  skipSuccessfulRequests: true,
});

// ─── Signup limiter: 5/hr (prod), 50/hr (dev) ───────────────────────────────
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 50 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many accounts created. Please try again later.',
  },
});

// ─── Input validators ────────────────────────────────────────────────────────
const signupValidators = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.'),
];

const loginValidators = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

// ─── Routes ──────────────────────────────────────────────────────────────────
router.post('/signup', signupLimiter, signupValidators, signup);
router.post('/login',  loginLimiter,  loginValidators,  login);
router.post('/logout', requireAuth, logout);
router.get('/me',      requireAuth, getMe);

export default router;
