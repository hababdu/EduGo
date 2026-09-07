import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * Ruxsat berilgan originlar ro'yxati. WEBAPP_URL asosiy, lekin
 * ALLOWED_ORIGINS orqali vergul bilan ajratilgan qo'shimcha domenlar
 * (masalan localhost dev muhiti + production) qo'shish mumkin.
 */
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

  // 63-band — XSS/clickjacking va boshqa umumiy hujumlardan himoya header'lari
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO'da yo'q maydonlar avtomatik olib tashlanadi
      forbidNonWhitelisted: true, // ...yoki so'rov butunlay rad etiladi (qat'iyroq)
      transform: true,
    }),
  );

  const allowedOrigins = buildAllowedOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      // origin=undefined bo'lishi mumkin (masalan server-to-server so'rovlar,
      // Postman) — bularga ruxsat beramiz. Brauzerdan kelgan so'rovlarda
      // origin har doim mavjud bo'ladi.
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: ${origin} ruxsat etilgan originlar orasida yo'q`));
      }
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Backend ${port}-portda ishga tushdi`);
  console.log(`Ruxsat etilgan originlar: ${allowedOrigins.join(', ') || '(hech qaysi belgilanmagan!)'}`);
}
bootstrap();
