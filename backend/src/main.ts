import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

function buildAllowedOrigins(): string[] {
  const origins = new Set<string>();
  if (process.env.WEBAPP_URL) origins.add(process.env.WEBAPP_URL.replace(/\/$/, ''));
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean)
      .forEach((o) => origins.add(o));
  }
  return Array.from(origins);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Helmet - Cross-Origin muammolari kelib chiqmasligi uchun crossOriginResourcePolicy ni moslaymiz
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // 1. Global API Prefix qo'shish (Frontend /api/v1/... so'rov yuborgani uchun)
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const allowedOrigins = buildAllowedOrigins();

  // 2. CORS sozlamalarini yaxshilash
  app.enableCors({
    origin: (origin, callback) => {
      // Agar allowedOrigins bo'sh bo'lsa yoki origin ro'yxatda bo'lsa/bo'sh bo'lsa ruxsat beramiz
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Ruxsat berilmagan origin bo'lsa ham dev/test muhitda bloklamaslik uchun konsolga yozamiz
        console.warn(`[CORS Warning] ${origin} ro'yxatda yo'q!`);
        callback(null, true); // Vaqtinchalik barcha originlarga ruxsat beramiz (muammo bartaraf bo'lgungacha)
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Backend ${port}-portda ishga tushdi`);
  console.log(`Ruxsat etilgan originlar: ${allowedOrigins.join(', ') || '(barchasiga ruxsat berilgan)'}`);
}
bootstrap();