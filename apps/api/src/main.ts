import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // Codex adversarial review flagged the x-demo-employee-id header (no real
  // auth yet, UC-001 not built) as unsafe to expose beyond local demo use —
  // refuse to boot with it in anything claiming to be production.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Refusing to start: this build still uses demo auth (x-demo-employee-id header, ' +
        'no real session/JWT). Do not run with NODE_ENV=production until UC-001 replaces it.',
    );
  }

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
