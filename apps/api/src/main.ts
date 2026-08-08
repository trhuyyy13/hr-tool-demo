import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // UC-001 replaced the old x-demo-employee-id header with a real
  // session cookie, but the login step is still a fake "pick an employee"
  // picker (no Google Cloud OAuth credentials wired up yet) — anyone can
  // still "log in" as anyone. Keep refusing to boot in production until
  // real Google OAuth lands.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Refusing to start: login is still a demo picker (POST /auth/login by email, ' +
        'no real Google OAuth). Do not run with NODE_ENV=production until UC-001 has real SSO.',
    );
  }

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.WEB_BASE_URL ?? 'http://localhost:3000', credentials: true });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
