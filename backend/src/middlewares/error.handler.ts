import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Enhanced terminal logging with better visibility
  console.error('\n' + '='.repeat(80));
  console.error('🔴 ERROR CAUGHT BY ERROR HANDLER');
  console.error('='.repeat(80));
  console.error('Message:', err.message);
  console.error('URL:', req.url);
  console.error('Method:', req.method);
  if (Object.keys(req.body).length > 0) {
    console.error('Request Body:', JSON.stringify(req.body, null, 2));
  }
  if (err.stack) {
    console.error('Stack Trace:', err.stack);
  }
  console.error('='.repeat(80) + '\n');

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ 
      error: 'Application Error',
      message: err.message,
      success: false,
      statusCode: err.statusCode
    });
  }

  // Handle specific error types
  if (err.message.includes('JSON')) {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'The request body contains invalid JSON',
      success: false,
      statusCode: 400
    });
  }

  if (err.message.includes('GROQ_API_KEY')) {
    return res.status(500).json({
      error: 'Configuration Error',
      message: 'AI service is not properly configured',
      success: false,
      statusCode: 500
    });
  }

  if (err.message.includes('Hedera') || err.message.includes('private key')) {
    return res.status(400).json({
      error: 'Blockchain Error',
      message: 'Invalid Hedera credentials or network error',
      success: false,
      statusCode: 400
    });
  }

  // Default error response
  return res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    success: false,
    statusCode: 500
  });
};
