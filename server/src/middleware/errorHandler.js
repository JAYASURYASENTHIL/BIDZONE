/**
 * Centralised error handler — must be registered LAST in Express.
 * Keeps internal details out of production API responses.
 */
const errorHandler = (err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';

  // Mongoose duplicate key error (e.g. duplicate email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `An account with that ${field} already exists.`,
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({
      success: false,
      message: messages.join('. '),
    });
  }

  // Default — log in dev, hide in prod
  const status = err.status || err.statusCode || 500;
  console.error(`[ErrorHandler] ${err.stack || err.message}`);

  res.status(status).json({
    success: false,
    message: isProd ? 'An unexpected error occurred.' : err.message,
  });
};

export default errorHandler;
