import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: (process.env.FRONTEND_ORIGINS ?? '').split(',').filter(Boolean), credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: false, forbidNonWhitelisted: false }));
  app.useGlobalFilters(new HttpExceptionFilter());
  const swagger = new DocumentBuilder().setTitle('ImpactC API').setDescription('Supervised community relationship platform API').setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));
  await app.listen(Number(process.env.PORT ?? 3001));
}
void bootstrap();
