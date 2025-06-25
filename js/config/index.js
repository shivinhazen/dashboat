require('dotenv').config();

const config = {
  port: process.env.PORT || 5000,
  node_env: process.env.NODE_ENV || 'development',
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    service: process.env.EMAIL_SERVICE || 'gmail',
    defaultRecipient:
      process.env.EMAIL_RECIPIENT || 'solemarbuziospousada@gmail.com',
  },
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'a-long-and-secure-default-secret-key-for-development',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  cors: {
    origin: process.env.CORS_ORIGIN,
  },
  cache: {
    duration: process.env.CACHE_DURATION || 30000,
  },
  rateLimit: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: process.env.NODE_ENV === 'development' ? 1000 : 100,
    },
    form: {
      windowMs: 60 * 60 * 1000, // 1 hora
      max: process.env.NODE_ENV === 'development' ? 100 : 5,
    },
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: process.env.NODE_ENV === 'development' ? 500 : 50,
    },
  },
  admin: {
    username: process.env.ADMIN_USER || 'admin',
    password:
      process.env.ADMIN_PASSWORD ||
      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password'
  },
};

module.exports = config;
