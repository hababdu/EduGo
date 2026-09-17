// src/main.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';   // 👈
import { join } from 'path';                                          // 👈
import helmet from 'helmet';
import { AppModule } from './app.module';

function buildAllowedOrigins(): string[] {
  const origins = new Set<string>();
  if (process.env.WEBAPP_URL)
    origins.add(process.env.WEBAPP_URL.replace(/\/$/, ''));
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean)
      .forEach((o) => origins.add(o));
  }
  return Array.from(origins);
}

async function bootstrap() {
  // 👇 `NestExpressApplication` — static fayllar uchun
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ Static fayllar (uploads)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Security
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },   // 👈 MUHIM
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const allowedOrigins = buildAllowedOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(
          new Error(
            `CORS: ${origin} ruxsat etilgan originlar orasida yo'q`,
          ),
        );
      }
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Backend ${port}-portda ishga tushdi`);
  console.log(
    `Ruxsat etilgan originlar: ${
      allowedOrigins.join(', ') || '(hech qaysi belgilanmagan!)'
    }`,
  );
}
bootstrap();