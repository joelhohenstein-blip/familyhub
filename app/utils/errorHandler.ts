import { toast } from 'sonner';

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: unknown;
  statusCode?: number;
}

/**
 * Centralized error handling
 * Logs errors and shows user-friendly messages
 */
export function handleError(error: unknown, userMessage?: string): ErrorInfo {
  let errorInfo: ErrorInfo = {
    message: userMessage || 'An unexpected error occurred',
  };

  if (error instanceof Error) {
    errorInfo = {
      ...errorInfo,
      message: userMessage || error.message,
      details: error.stack,
    };
  } else if (typeof error === 'object' && error !== null) {
    const err = error as any;
    errorInfo = {
      ...errorInfo,
      message: userMessage || err.message || JSON.stringify(error),
      code: err.code,
      statusCode: err.statusCode,
      details: error,
    };
  } else if (typeof error === 'string') {
    errorInfo = {
      message: error,
    };
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', errorInfo);
  }

  // Show toast notification
  toast.error(errorInfo.message);

  return errorInfo;
}

/**
 * Handle tRPC errors specifically
 */
export function handleTRPCError(error: unknown, defaultMessage = 'Request failed'): ErrorInfo {
  const err = error as any;
  
  if (err?.data?.code === 'UNAUTHORIZED') {
    return handleError(error, 'Please sign in to continue');
  }
  
  if (err?.data?.code === 'FORBIDDEN') {
    return handleError(error, 'You don\'t have permission to do this');
  }
  
  if (err?.data?.code === 'NOT_FOUND') {
    return handleError(error, 'The requested item was not found');
  }
  
  if (err?.data?.code === 'BAD_REQUEST') {
    return handleError(error, err.message || 'Invalid request');
  }

  return handleError(error, defaultMessage);
}

/**
 * Validate required fields
 */
export function validateRequired(
  fields: Record<string, unknown>,
  fieldNames: string[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const fieldName of fieldNames) {
    if (!fields[fieldName]) {
      errors.push(`${fieldName} is required`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
