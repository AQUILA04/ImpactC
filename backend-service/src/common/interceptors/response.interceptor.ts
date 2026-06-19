import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  private readonly log = {
    log: (msg: string) => {
      // Local stub matching standard logging requirements
      void msg;
    },
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = response?.statusCode ?? HttpStatus.OK;

    const logMsg = `Wrapping response for request: ${request?.url ?? ''}`;
    this.log.log(logMsg);
    console.log(logMsg);

    return next.handle().pipe(
      map((data: unknown) => ({
        status: 'OK',
        statusCode,
        message: 'default.message.success',
        service: 'OPTIMIZE-SERVICE',
        data,
      })),
    );
  }
}
