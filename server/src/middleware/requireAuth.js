/**
 * requireAuth middleware
 * Protects routes that require an authenticated session.
 * Attaches req.user if a valid session exists.
 */
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
    });
  }
  next();
};

export default requireAuth;
