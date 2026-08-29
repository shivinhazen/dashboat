require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Refusing to start with an insecure default.`);
  }
  return value;
}

function requireJwtSecret() {
  const secret = requireEnv('JWT_SECRET');
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }
  return secret;
}

function requireAdminPasswordHash() {
  const hash = requireEnv('ADMIN_PASSWORD');
  if (!/^\$2[aby]\$\d{2}\$/.test(hash)) {
    throw new Error('ADMIN_PASSWORD must be a bcrypt hash, not a plaintext password.');
  }
  return hash;
}

const config = {
  port: process.env.PORT || 5000,
  node_env: process.env.NODE_ENV || 'development',
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    service: process.env.EMAIL_SERVICE || 'gmail',
    defaultRecipient: process.env.EMAIL_RECIPIENT,
  },
  jwt: {
    secret: requireJwtSecret(),
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
      windowMs: 15 * 60 * 1000,
      max: process.env.NODE_ENV === 'development' ? 1000 : 100,
    },
    form: {
      windowMs: 60 * 60 * 1000,
      max: process.env.NODE_ENV === 'development' ? 100 : 5,
    },
    api: {
      windowMs: 15 * 60 * 1000,
      max: process.env.NODE_ENV === 'development' ? 500 : 50,
    },
  },
  admin: {
    username: requireEnv('ADMIN_USER'),
    password: requireAdminPasswordHash(),
  },
};

module.exports = config;
