"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const helmet_1 = require("helmet");
const app_module_1 = require("./app.module");
function buildAllowedOrigins() {
    const origins = new Set();
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
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const allowedOrigins = buildAllowedOrigins();
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
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
//# sourceMappingURL=main.js.map