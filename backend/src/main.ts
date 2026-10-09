// src/main.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';
import { AppModule } from './app.module';

/* ============================================================
   RUXSAT ETILGAN ORIGINLAR
   ============================================================ */
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

/* ============================================================
   UPLOADS PAPKA YARATISH — MUHIM!
   ============================================================ */
function ensureUploadsDir(): string {
  const uploadsDir = join(process.cwd(), 'uploads', 'groups');

  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
    console.log(`[main] ✅ Uploads papka yaratildi: ${uploadsDir}`);
  } else {
    console.log(`[main] ✅ Uploads papka mavjud: ${uploadsDir}`);
  }

  return uploadsDir;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Render (va boshqa proksi) ortida haqiqiy mijoz IP'sini olish uchun. Busiz so'rov limiti (Throttler)
  // barcha foydalanuvchilarni BITTA IP (proksi) deb sanardi: biri limitga tushsa hamma bloklanardi.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // ✅ Uploads papka avtomatik yaratish — ENG MUHIM QADAM
  const uploadsDir = ensureUploadsDir();

  // ✅ Static fayllar serve
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Security
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
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
  if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
    console.warn(
      "[main] ⚠️ WEBAPP_URL / ALLOWED_ORIGINS belgilanmagan — CORS hamma originga ochiq. Render'da WEBAPP_URL ni kiriting!",
    );
  }
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

  console.log(`[main] 🚀 Backend ${port}-portda ishga tushdi`);
  console.log(
    `[main] 🌐 Ruxsat etilgan originlar: ${
      allowedOrigins.join(', ') || '(hech qaysi belgilanmagan!)'
    }`,
  );
  console.log(`[main] 📁 Uploads: ${uploadsDir}`);
}
bootstrap();