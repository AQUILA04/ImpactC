import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('AppController', () => {
  let appController: AppController;
  let responseInterceptor: ResponseInterceptor<unknown>;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    responseInterceptor = new ResponseInterceptor();
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });

    it('should wrap the response in the required envelope', (done) => {
      const mockExecutionContext = {
        switchToHttp: () => ({
          getResponse: () => ({ statusCode: 200 }),
          getRequest: () => ({ url: '/' }),
        }),
      } as ExecutionContext;

      const mockCallHandler = {
        handle: () => of(appController.getHello()),
      } as CallHandler;

      responseInterceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result) => {
          expect(result).toEqual({
            status: 'OK',
            statusCode: 200,
            message: 'default.message.success',
            service: 'OPTIMIZE-SERVICE',
            data: 'Hello World!',
          });
          done();
        });
    });
  });
});
