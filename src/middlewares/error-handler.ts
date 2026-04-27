import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for developers
  if (process.env.NODE_ENV !== 'test') {
    console.error('ERROR 💥', err);
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Girdi doğrulama hatası',
        details: err.issues.map((e: any) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // Handle AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode || 'APP_ERROR',
        message: err.message,
      },
    });
  }

  // Handle Mongoose/Prisma or other known DB errors if needed
  // ...

  // Generic Error (don't leak details in production)
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Bir şeyler ters gitti' 
    : err.message || 'Dahili sunucu hatası';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.errorCode || 'INTERNAL_SERVER_ERROR',
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};
