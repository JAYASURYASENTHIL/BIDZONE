import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';
import User from '../models/User.js';

const BCRYPT_ROUNDS = 12; // good balance of security vs performance

// ─── Helper: send validation errors ────────────────────────────────────────
const sendValidationErrors = (res, errors) => {
  return res.status(422).json({
    success: false,
    message: errors.array().map((e) => e.msg).join('. '),
  });
};

// ─── POST /api/auth/signup ──────────────────────────────────────────────────
export const signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationErrors(res, errors);

    const { name, email, password } = req.body;

    // Hash password using bcrypt (Argon2id unavailable as native binary on all platforms)
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
    });

    // Establish session immediately after signup
    req.session.userId = user._id.toString();

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/login ───────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationErrors(res, errors);

    const { email, password } = req.body;

    // Explicitly select passwordHash (excluded by default via schema)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

    // Generic error — never reveal whether the email exists
    const INVALID_MSG = 'Invalid email or password.';

    if (!user) {
      return res.status(401).json({ success: false, message: INVALID_MSG });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: INVALID_MSG });
    }

    // Regenerate session ID on login to prevent session fixation
    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.userId = user._id.toString();

      res.status(200).json({
        success: true,
        message: 'Logged in successfully.',
        user: user.toSafeObject(),
      });
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/logout ──────────────────────────────────────────────────
export const logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);

    // Clear the session cookie on the client
    res.clearCookie(process.env.SESSION_COOKIE_NAME || 'campus.sid');

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  });
};

// ─── GET /api/auth/me ───────────────────────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      // Session points to a deleted user — clear it
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        message: 'User not found. Please log in again.',
      });
    }

    return res.status(200).json({
      success: true,
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};
