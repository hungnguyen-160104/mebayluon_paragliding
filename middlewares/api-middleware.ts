// middlewares/api-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ValidationError, UnauthorizedError } from '@/lib/errors';
import { formatValidationErrors } from '@/lib/validation-schemas';
import { errorResponse } from '@/lib/api-response';
import { createLogger } from '@/lib/logger';

const logger = createLogger('API-Middleware');

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T extends z.ZodSchema>(schema: T) {
  return async (request: NextRequest) => {
    try {
      const body = await request.json();
      const result = schema.safeParse(body);
      
      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        logger.warn('Validation failed', { errors });
        return errorResponse(
          new ValidationError('Invalid request body', errors),
        );
      }
      
      return result.data;
    } catch (error) {
      logger.error('Failed to parse request body', error as Error);
      return errorResponse(
        new ValidationError('Invalid JSON'),
      );
    }
  };
}

/**
 * Verify JWT token from Authorization header
 */
export function verifyAuth(request: NextRequest): { valid: boolean; error?: NextResponse } {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      valid: false,
      error: errorResponse(
        new UnauthorizedError('Missing or invalid authorization header'),
      ),
    };
  }
  
  // Token validation would go here
  // For now, just check if it exists
  const token = authHeader.substring(7);
  
  if (!token) {
    return {
      valid: false,
      error: errorResponse(
        new UnauthorizedError('Invalid token'),
      ),
    };
  }
  
  return { valid: true };
}

/**
 * Middleware to require authentication
 */
export function requireAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const auth = verifyAuth(request);
    
    if (!auth.valid) {
      return auth.error;
    }
    
    return handler(request);
  };
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return response;
}
