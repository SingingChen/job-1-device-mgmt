import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Validate/transform all incoming DTOs; strip unknown properties and reject
  // requests that send them.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Allow the web frontend (different origin) to call the API. We use Bearer
  // tokens (no cookies), so credentials aren't needed. Restrict to CORS_ORIGINS
  // (comma-separated) when set; otherwise reflect any origin.
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ?? true,
  });
  // Ensure onModuleDestroy ($disconnect) runs on SIGTERM (e.g. Cloud Run).
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
