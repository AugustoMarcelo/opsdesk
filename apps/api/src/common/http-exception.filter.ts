import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorResponse = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  requestId?: string;
  errors?: string[];
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = request.headers['x-request-id'];
    const instance = request.originalUrl ?? request.url ?? '';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      const { detail, errors } = this.normalizeMessage(exceptionResponse);

      const payload: ErrorResponse = {
        type: 'about:blank',
        title: this.titleForStatus(status),
        status,
        detail,
        instance,
        requestId: typeof requestId === 'string' ? requestId : undefined,
        ...(errors ? { errors } : {}),
      };

      response.status(status).json(payload);
      return;
    }

    const payload: ErrorResponse = {
      type: 'about:blank',
      title: this.titleForStatus(HttpStatus.INTERNAL_SERVER_ERROR),
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'Unexpected error',
      instance,
      requestId: typeof requestId === 'string' ? requestId : undefined,
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(payload);
  }

  private normalizeMessage(exceptionResponse: unknown): {
    detail: string;
    errors?: string[];
  } {
    if (typeof exceptionResponse === 'string') {
      return { detail: exceptionResponse };
    }

    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const message = (exceptionResponse as { message?: unknown }).message;
      if (Array.isArray(message)) {
        return { detail: 'Validation failed', errors: message.map(String) };
      }

      if (typeof message === 'string') {
        return { detail: message };
      }
    }

    return { detail: 'Request failed' };
  }

  private titleForStatus(status: number): string {
    const titles: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
      [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
    };

    return titles[status] ?? 'Error';
  }
}
