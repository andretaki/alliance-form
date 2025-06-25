import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import SECURITY_CONFIG from './security-config'

// Import security configuration from centralized config file

// Input sanitization utilities
export class InputSanitizer {
  static sanitizeString(input: string): string {
    // Remove potential XSS payloads
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
  }
  
  static sanitizeEmail(email: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const sanitized = this.sanitizeString(email).toLowerCase()
    
    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format')
    }
    
    return sanitized
  }
  
  static sanitizeFilename(filename: string): string {
    // Remove path traversal attempts and dangerous characters
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .replace(/_{2,}/g, '_')
      .substring(0, 255)
  }
  
  static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url)
      
      // Only allow specific protocols
      if (!['http:', 'https:', 'blob:', 'data:'].includes(parsed.protocol)) {
        throw new Error('Invalid URL protocol')
      }
      
      // Block private IP ranges for SSRF protection
      if (parsed.hostname) {
        const privateRanges = [
          /^127\./,
          /^10\./,
          /^172\.(1[6-9]|2[0-9]|3[01])\./,
          /^192\.168\./,
          /^169\.254\./,
          /^::1$/,
          /^fc00::/,
          /^fe80::/
        ]
        
        if (privateRanges.some(range => range.test(parsed.hostname))) {
          throw new Error('Private IP addresses not allowed')
        }
      }
      
      return parsed.toString()
    } catch (error) {
      throw new Error('Invalid URL format')
    }
  }
}

// CSRF Protection
export class CSRFProtection {
  private static readonly SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production'
  
  static generateToken(): string {
    const timestamp = Date.now().toString()
    const randomBytes = crypto.randomBytes(32).toString('hex')
    const payload = `${timestamp}-${randomBytes}`
    const hash = crypto.createHmac('sha256', this.SECRET).update(payload).digest('hex')
    
    return Buffer.from(`${payload}-${hash}`).toString('base64')
  }
  
  static validateToken(token: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString()
      const parts = decoded.split('-')
      
      if (parts.length !== 3) return false
      
      const [timestamp, randomBytes, providedHash] = parts
      const payload = `${timestamp}-${randomBytes}`
      const expectedHash = crypto.createHmac('sha256', this.SECRET).update(payload).digest('hex')
      
      // Verify hash
      if (providedHash !== expectedHash) return false
      
      // Check if token is not too old (24 hours)
      const tokenAge = Date.now() - parseInt(timestamp)
      if (tokenAge > 24 * 60 * 60 * 1000) return false
      
      return true
    } catch (error) {
      return false
    }
  }
}

// Authentication utilities
export class AuthUtils {
  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }
  
  static hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt || crypto.randomBytes(32).toString('hex')
    const hash = crypto.pbkdf2Sync(password, actualSalt, 100000, 64, 'sha512').toString('hex')
    
    return { hash, salt: actualSalt }
  }
  
  static verifyPassword(password: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hashPassword(password, salt)
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'))
  }
  
  static validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (password.length < SECURITY_CONFIG.AUTH.PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${SECURITY_CONFIG.AUTH.PASSWORD_MIN_LENGTH} characters long`)
    }
    
    // Note: Password complexity rules can be added here based on requirements
    // For now, just checking minimum length from AUTH config
    
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasUppercase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!hasLowercase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }
    
    if (!hasSymbols) {
      errors.push('Password must contain at least one special character');
    }
    
    return { valid: errors.length === 0, errors }
  }
}

// File security utilities
export class FileSecurityUtils {
  static validateFileType(file: File, allowedTypes?: string[]): boolean {
    const allowed: string[] = allowedTypes || [...SECURITY_CONFIG.FILE_UPLOAD.ALLOWED_TYPES]
    
    // Check MIME type
    if (!allowed.includes(file.type)) {
      return false
    }
    
    // Additional file signature validation could be added here
    return true
  }
  
  static validateFileSize(file: File, maxSize?: number): boolean {
    const max = maxSize || SECURITY_CONFIG.FILE_UPLOAD.MAX_SIZE
    return file.size <= max
  }
  
  static generateSecureFilename(originalName: string, applicationId: number): string {
    const extension = originalName.split('.').pop() || 'bin'
    const timestamp = Date.now()
    const randomString = crypto.randomBytes(16).toString('hex')
    
    return `app-${applicationId}-${timestamp}-${randomString}.${extension}`
  }
  
  static scanFileContent(buffer: Buffer): { safe: boolean; threats: string[] } {
    const threats: string[] = []
    const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024)) // Check first 1KB
    
    // Basic malware signature detection
    const malwareSignatures = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onclick/i,
      /onerror/i,
      /onload/i,
      /eval\(/i,
      /document\.write/i,
      /\.exe/i,
      /\.bat/i,
      /\.cmd/i,
      /\.scr/i,
      /\.vbs/i,
      /\.js/i,
      /\.jar/i
    ]
    
    malwareSignatures.forEach((signature, index) => {
      if (signature.test(content)) {
        threats.push(`Potential threat detected: signature ${index + 1}`)
      }
    })
    
    return { safe: threats.length === 0, threats }
  }
}

// Request validation utilities
export class RequestValidator {
  static validateIP(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
    const ipv6Regex = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip)
  }
  
  static extractClientIP(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const clientIP = request.ip
    
    // Parse forwarded-for header (can contain multiple IPs)
    if (forwardedFor) {
      const ips = forwardedFor.split(',').map(ip => ip.trim())
      const validIP = ips.find(ip => this.validateIP(ip) && !this.isPrivateIP(ip))
      if (validIP) return validIP
    }
    
    if (realIP && this.validateIP(realIP)) return realIP
    if (clientIP && this.validateIP(clientIP)) return clientIP
    
    return 'unknown'
  }
  
  static isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./
    ]
    
    return privateRanges.some(range => range.test(ip))
  }
  
  static validateUserAgent(userAgent: string): boolean {
    // Basic user agent validation
    if (!userAgent || userAgent.length < 10 || userAgent.length > 1000) {
      return false
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /curl/i,
      /wget/i,
      /python/i,
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i
    ]
    
    // Allow legitimate crawlers but flag others
    const legitimateBots = [
      /googlebot/i,
      /bingbot/i,
      /slurp/i,
      /duckduckbot/i,
      /baiduspider/i,
      /yandexbot/i,
      /facebookexternalhit/i,
      /twitterbot/i,
      /linkedinbot/i
    ]
    
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent))
    const isLegitimate = legitimateBots.some(pattern => pattern.test(userAgent))
    
    return !isSuspicious || isLegitimate
  }
}

// Security logging utilities
export class SecurityLogger {
  static logSecurityEvent(event: {
    type: 'AUTH_FAILURE' | 'RATE_LIMIT' | 'CSRF_VIOLATION' | 'FILE_UPLOAD_BLOCKED' | 'SUSPICIOUS_REQUEST'
    ip: string
    userAgent?: string
    endpoint: string
    details: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: event.type,
      ip: event.ip,
      userAgent: event.userAgent || 'unknown',
      endpoint: event.endpoint,
      details: event.details,
      severity: event.severity
    }
    
    // In production, send to security monitoring service
    console.warn(`🔒 SECURITY EVENT: ${JSON.stringify(logEntry)}`)
    
    // For critical events, you might want to trigger alerts
    if (event.severity === 'CRITICAL') {
      // TODO: Implement alerting mechanism (email, Slack, etc.)
      console.error(`🚨 CRITICAL SECURITY EVENT: ${event.details}`)
    }
  }
}

// Validation schemas with security enhancements
export const secureApplicationSchema = z.object({
  legalEntityName: z.string()
    .min(1, { message: "Legal Entity Name is required" })
    .max(SECURITY_CONFIG.INPUT_VALIDATION.MAX_NAME_LENGTH, { message: "Legal Entity Name is too long" })
    .transform((val) => InputSanitizer.sanitizeString(val)),
  
  dba: z.string()
    .max(SECURITY_CONFIG.INPUT_VALIDATION.MAX_NAME_LENGTH, { message: "DBA is too long" })
    .optional()
    .transform((val) => val ? InputSanitizer.sanitizeString(val) : val),
    
  taxEIN: z.string()
    .min(1, { message: "Tax EIN is required" })
    .regex(/^(\d{9}|\d{2}-\d{7})$/, { 
      message: "Tax EIN must be 9 digits or XX-XXXXXXX format" 
    })
    .transform((val) => InputSanitizer.sanitizeString(val)),
    
  phoneNo: z.string()
    .min(1, { message: "Phone Number is required" })
    .max(SECURITY_CONFIG.INPUT_VALIDATION.MAX_PHONE_LENGTH, { message: "Phone Number is too long" })
    .regex(/^[\d\s\-\(\)\+\.]+$/, { message: "Invalid phone number format" })
    .transform((val) => InputSanitizer.sanitizeString(val)),
    
  buyerNameEmail: z.string()
    .min(1, { message: "Buyer Name/Email is required" })
    .max(SECURITY_CONFIG.INPUT_VALIDATION.MAX_EMAIL_LENGTH, { message: "Email is too long" })
    .email({ message: "Invalid email format" })
    .transform((val) => InputSanitizer.sanitizeEmail(val)),
    
  accountsPayableNameEmail: z.string()
    .min(1, { message: "Accounts Payable Name/Email is required" })
    .max(SECURITY_CONFIG.INPUT_VALIDATION.MAX_EMAIL_LENGTH, { message: "Email is too long" })
    .email({ message: "Invalid email format" })
    .transform((val) => InputSanitizer.sanitizeEmail(val)),
    
  // Add more fields as needed...
})

export type SecureApplicationData = z.infer<typeof secureApplicationSchema> 