// Butun AiModule bog'liqliklar grafi HAQIQIY modullar bilan yig'iladi (faqat baza soxta):
// yangi imports/exports to'g'ri ulanganini va tsiklik bog'liqlik yo'qligini isbotlaydi.
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiModule } from '../ai.module';
import { AssistantService } from './assistant.service';
import { AssistantToolRegistry } from './assistant-tool.registry';

const fakePrisma = new Proxy({}, { get: () => new Proxy({}, { get: () => async () => null }) });

describe('AiModule — haqiqiy modul grafi', () => {
  it("barcha bog'liqliklar hal bo'ladi va tool'lar rolga qarab ajraladi", async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    const mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), EventEmitterModule.forRoot(), PrismaModule, AiModule],
    })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .compile();

    const registry = mod.get(AssistantToolRegistry, { strict: false });
    expect(mod.get(AssistantService, { strict: false })).toBeDefined();

    const names = (role: string) => registry.forUser({ id: 'x', telegramId: '1', role, status: 'ACTIVE' } as any).map((t) => t.name).sort();
    expect(names('STUDENT')).toEqual([
      'get_my_assigned_tests', 'get_my_overview', 'get_my_ranking', 'get_my_results', 'get_my_streak_and_challenge', 'get_my_weak_topics',
    ]);
    expect(names('TEACHER')).toEqual([
      'find_struggling_students', 'get_group_ranking', 'get_group_students', 'get_test_analytics', 'list_my_groups', 'list_tests',
    ]);
    expect(names('ADMIN')).toEqual([
      'find_struggling_students', 'get_group_ranking', 'get_group_students', 'get_platform_overview', 'get_student_detail', 'get_test_analytics',
      'list_my_groups', 'list_tests', 'search_students',
    ]);
    expect(names('SUPER_ADMIN')).toEqual(names('ADMIN'));
    expect(names('NOMALUM_ROL')).toEqual(names('STUDENT')); // noma'lum rol = eng kam huquq

    // YOZUVCHI tool'lar: o'quvchida umuman yo'q; ball/bloklash faqat adminda
    const writes = (role: string) => registry.writeToolsForUser({ id: 'x', telegramId: '1', role, status: 'ACTIVE' } as any).map((t) => t.name).sort();
    expect(writes('STUDENT')).toEqual([]);
    expect(writes('TEACHER')).toEqual(['assign_test', 'publish_test']);
    expect(writes('ADMIN')).toEqual(['adjust_student_score', 'assign_test', 'publish_test', 'set_student_blocked']);
    expect(writes('SUPER_ADMIN')).toEqual(writes('ADMIN'));
    expect(writes('NOMALUM_ROL')).toEqual([]);

    // model ko'radigan ta'riflar = o'qish + yozuvchi
    const defs = (role: string) => registry.definitionsFor({ id: 'x', telegramId: '1', role, status: 'ACTIVE' } as any).map((t) => t.name);
    expect(defs('TEACHER')).toEqual(expect.arrayContaining(['assign_test', 'publish_test', 'list_tests']));
    expect(defs('TEACHER')).not.toContain('adjust_student_score');
    expect(defs('STUDENT').some((n) => ['assign_test', 'publish_test', 'adjust_student_score', 'set_student_blocked'].includes(n))).toBe(false);

    // yozuvchi tool HECH QACHON o'qish yo'li (execute) orqali bajarilmaydi
    const out = await registry.execute({ id: 'x', telegramId: '1', role: 'ADMIN', status: 'ACTIVE' } as any, 'adjust_student_score', { studentId: 'cmfx1234abcd5678efgh9012', amount: 10, reason: 'sabab bor' });
    expect(out.ok).toBe(false);

    await mod.close();
  });
});
