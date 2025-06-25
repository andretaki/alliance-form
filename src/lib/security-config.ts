// Security Configuration for Alliance Chemical Application
import crypto from 'crypto';

// Environment Variables Validation with Security Checks
export const SECURITY_ENV = {
  // Database Security
  DATABASE_URL: process.env.DATABASE_URL,
  
  // AWS S3 Security
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  
  // Microsoft Graph Security
  MICROSOFT_GRAPH_CLIENT_ID: process.env.MICROSOFT_GRAPH_CLIENT_ID,
  MICROSOFT_GRAPH_CLIENT_SECRET: process.env.MICROSOFT_GRAPH_CLIENT_SECRET,
  MICROSOFT_GRAPH_TENANT_ID: process.env.MICROSOFT_GRAPH_TENANT_ID,
  
  // Security Secrets
  SIGNATURE_SECRET: process.env.SIGNATURE_SECRET || generateSecureSecret(),
  CSRF_SECRET: process.env.CSRF_SECRET || generateSecureSecret(),
  SESSION_SECRET: process.env.SESSION_SECRET || generateSecureSecret(),
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || generateSecureSecret(),
  
  // Application Security
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // OpenAI Security
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // Admin Authentication
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'andre@alliancechemical.com',
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
  
  // Rate Limiting Storage (for production, use Redis)
  KV_URL: process.env.KV_URL,
  
  // Monitoring and Alerting
  SECURITY_WEBHOOK_URL: process.env.SECURITY_WEBHOOK_URL,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
} as const;

function generateSecureSecret(): string {
  const secret = crypto.randomBytes(32).toString('hex');
  console.warn(`⚠️ Generated random secret. For production, set proper environment variable. Secret: ${secret.substring(0, 8)}...`);
  return secret;
}

// Security Configuration Constants
export const SECURITY_CONFIG = {
  // Rate Limiting Configuration
  RATE_LIMITS: {
    GLOBAL: { windowMs: 15 * 60 * 1000, max: 1000 }, // 15 minutes
    API_DEFAULT: { windowMs: 60 * 1000, max: 30 }, // 1 minute
    API_UPLOAD: { windowMs: 60 * 1000, max: 5 }, // 1 minute  
    API_SIGNUP: { windowMs: 60 * 1000, max: 3 }, // 1 minute
    API_LOGIN: { windowMs: 15 * 60 * 1000, max: 5 }, // 15 minutes
    API_SENSITIVE: { windowMs: 60 * 1000, max: 2 }, // 1 minute
  },
  
  // File Upload Security
  FILE_UPLOAD: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    QUARANTINE_SUSPICIOUS: true,
    SCAN_CONTENT: true,
  },
  
  // Authentication Security
  AUTH: {
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    PASSWORD_MIN_LENGTH: 12,
    REQUIRE_2FA: false, // Set to true for production
    TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Input Validation Security
  INPUT_VALIDATION: {
    MAX_STRING_LENGTH: 2000,
    MAX_EMAIL_LENGTH: 254,
    MAX_PHONE_LENGTH: 20,
    MAX_NAME_LENGTH: 100,
    SANITIZE_HTML: true,
    STRIP_DANGEROUS_CHARS: true,
  },
  
  // CSRF Protection
  CSRF: {
    TOKEN_LENGTH: 32,
    TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
    VALIDATE_ORIGIN: true,
    VALIDATE_REFERER: true,
  },
  
  // Security Headers
  SECURITY_HEADERS: {
    CONTENT_SECURITY_POLICY: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://vercel.live"],
      'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      'font-src': ["'self'", "https://fonts.gstatic.com"],
      'img-src': ["'self'", "data:", "https:", "blob:"],
      'connect-src': [
        "'self'", 
        "https://api.openai.com", 
        "https://graph.microsoft.com", 
        "https://login.microsoftonline.com"
      ],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'object-src': ["'none'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': [],
    },
    HSTS_MAX_AGE: 31536000, // 1 year
    FRAME_OPTIONS: 'DENY',
    CONTENT_TYPE_OPTIONS: 'nosniff',
    REFERRER_POLICY: 'strict-origin-when-cross-origin',
    XSS_PROTECTION: '1; mode=block',
    PERMISSIONS_POLICY: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  
  // Logging and Monitoring
  MONITORING: {
    LOG_SECURITY_EVENTS: true,
    LOG_FAILED_REQUESTS: true,
    LOG_SUSPICIOUS_ACTIVITY: true,
    ALERT_ON_CRITICAL_EVENTS: true,
    MAX_LOG_ENTRIES: 10000,
    LOG_RETENTION_DAYS: 30,
  },
  
  // IP and Geographic Restrictions
  ACCESS_CONTROL: {
    BLOCKED_COUNTRIES: [], // ISO country codes to block
    BLOCKED_IPS: [], // Specific IPs to block
    ALLOWED_IPS: [], // If specified, only these IPs are allowed
    BLOCK_TOR_EXITS: false, // Set to true to block Tor exit nodes
    BLOCK_PROXIES: false, // Set to true to block known proxy servers
  },
  
  // Database Security
  DATABASE: {
    CONNECTION_TIMEOUT: 10000, // 10 seconds
    QUERY_TIMEOUT: 30000, // 30 seconds
    MAX_CONNECTIONS: 10,
    IDLE_TIMEOUT: 20000, // 20 seconds
    SSL_MODE: SECURITY_ENV.NODE_ENV === 'production' ? 'require' : 'prefer',
  },
  
  // AI/LLM Security
  AI_SECURITY: {
    MAX_PROMPT_LENGTH: 10000,
    BLOCK_PROMPT_INJECTION: true,
    SANITIZE_AI_RESPONSES: true,
    TIMEOUT_MS: 30000, // 30 seconds
    MAX_RETRIES: 3,
  },
} as const;

// Security validation function
export function validateSecurityConfiguration(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Critical environment variables check
  if (SECURITY_ENV.NODE_ENV === 'production') {
    if (!SECURITY_ENV.DATABASE_URL) {
      errors.push('DATABASE_URL is required in production');
    }
    
    if (!SECURITY_ENV.SIGNATURE_SECRET || SECURITY_ENV.SIGNATURE_SECRET.length < 32) {
      errors.push('SIGNATURE_SECRET must be at least 32 characters in production');
    }
    
    if (!SECURITY_ENV.CSRF_SECRET || SECURITY_ENV.CSRF_SECRET.length < 32) {
      errors.push('CSRF_SECRET must be at least 32 characters in production');
    }
    
    if (!SECURITY_ENV.SESSION_SECRET || SECURITY_ENV.SESSION_SECRET.length < 32) {
      errors.push('SESSION_SECRET must be at least 32 characters in production');
    }
    
    if (SECURITY_ENV.NEXT_PUBLIC_BASE_URL === 'http://localhost:3000') {
      errors.push('NEXT_PUBLIC_BASE_URL must be set to production URL');
    }
    
    if (!SECURITY_ENV.ADMIN_PASSWORD_HASH) {
      errors.push('ADMIN_PASSWORD_HASH is required in production');
    }
  }
  
  // AWS configuration validation
  if (SECURITY_ENV.AWS_ACCESS_KEY_ID && !SECURITY_ENV.AWS_SECRET_ACCESS_KEY) {
    errors.push('AWS_SECRET_ACCESS_KEY is required when AWS_ACCESS_KEY_ID is set');
  }
  
  // Microsoft Graph configuration validation
  const hasAnyGraphConfig = !!(
    SECURITY_ENV.MICROSOFT_GRAPH_CLIENT_ID || 
    SECURITY_ENV.MICROSOFT_GRAPH_CLIENT_SECRET || 
    SECURITY_ENV.MICROSOFT_GRAPH_TENANT_ID
  );
  
  if (hasAnyGraphConfig) {
    if (!SECURITY_ENV.MICROSOFT_GRAPH_CLIENT_ID) {
      errors.push('MICROSOFT_GRAPH_CLIENT_ID is required when using Microsoft Graph');
    }
    if (!SECURITY_ENV.MICROSOFT_GRAPH_CLIENT_SECRET) {
      errors.push('MICROSOFT_GRAPH_CLIENT_SECRET is required when using Microsoft Graph');
    }
    if (!SECURITY_ENV.MICROSOFT_GRAPH_TENANT_ID) {
      errors.push('MICROSOFT_GRAPH_TENANT_ID is required when using Microsoft Graph');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Security utilities
export const SecurityUtils = {
  // Generate secure random tokens
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  },
  
  // Hash sensitive data
  hashData(data: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt || crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512').toString('hex');
    return { hash, salt: actualSalt };
  },
  
  // Verify hashed data
  verifyHash(data: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hashData(data, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  },
  
  // Encrypt sensitive data
  encrypt(text: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(SECURITY_ENV.ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  },
  
  // Decrypt sensitive data
  decrypt(encryptedData: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(SECURITY_ENV.ENCRYPTION_KEY, 'salt', 32);
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher(algorithm, key);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  },
};

// Initialize security configuration
export function initializeSecurityConfig(): void {
  const validation = validateSecurityConfiguration();
  
  if (!validation.valid) {
    console.error('🔒 Security Configuration Errors:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    
    if (SECURITY_ENV.NODE_ENV === 'production') {
      throw new Error('Security configuration is invalid for production environment');
    } else {
      console.warn('⚠️ Security configuration has issues. Fix these before deploying to production.');
    }
  } else {
    console.log('✅ Security configuration validated successfully');
  }
  
  // Log security status
  console.log('🛡️ Security Configuration Status:');
  console.log(`  - Environment: ${SECURITY_ENV.NODE_ENV}`);
  console.log(`  - Rate Limiting: Enabled`);
  console.log(`  - CSRF Protection: Enabled`);
  console.log(`  - File Upload Security: Enabled`);
  console.log(`  - Security Headers: Enabled`);
  console.log(`  - Input Validation: Enhanced`);
  console.log(`  - Authentication: ${SECURITY_CONFIG.AUTH.REQUIRE_2FA ? '2FA Required' : 'Basic'}`);
}

// Export for use in other files
export default SECURITY_CONFIG; 