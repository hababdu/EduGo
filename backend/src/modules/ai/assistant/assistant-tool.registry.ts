// src/modules/ai/assistant/assistant-tool.registry.ts
import { HttpException, Injectable, Logger } from '@nestjs/common';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { AdminStudentsService } from '../../admin/students/admin-students.service';
import { OverviewService } from '../../admin/overview/overview.service';
import { AnalyticsService } from '../../analytics/analytics.service';
import { DashboardService } from '../../dashboard/dashboard.service';
import { ChallengesService } from '../../gamification/challenges/challenges.service';
import { StreakService } from '../../gamification/streak/streak.service';
import { GroupsService } from '../../groups/groups.service';
import { RankingService } from '../../ranking/ranking.service';
import { TeacherService } from '../../teacher/teacher.service';
import { TestManagementService } from '../../tests/management/test-management.service';
import { AiToolDefinition } from '../ai.types';
import { AssistantDataService } from './assistant-data.service';
import { AssistantTool, AssistantWriteTool, effectiveRole } from './assistant.types';
import { adminTools } from './tools/admin-tools';
import { studentTools } from './tools/student-tools';
import { teacherTools } from './tools/teacher-tools';
import { writeTools } from './tools/write-tools';
import { ToolInputError } from './tool-input';

export type ToolOutcome = { ok: true; content: string } | { ok: false; content: string };

export const TOOL_TIMEOUT_MS = 15_000;
export const MAX_TOOL_RESULT_CHARS = 12_000;

@Injectable()
export class AssistantToolRegistry {
  private readonly logger = new Logger(AssistantToolRegistry.name);
  private readonly tools: AssistantTool[];
  private readonly writes: AssistantWriteTool[];

  constructor(
    dashboard: DashboardService,
    tests: TestManagementService,
    ranking: RankingService,
    streak: StreakService,
    challenges: ChallengesService,
    data: AssistantDataService,
    groups: GroupsService,
    teacher: TeacherService,
    analytics: AnalyticsService,
    overview: OverviewService,
    students: AdminStudentsService,
  ) {
    this.tools = [
      ...studentTools({ dashboard, tests, ranking, streak, challenges, data }),
      ...teacherTools({ groups, teacher, tests, ranking, analytics }),
      ...adminTools({ overview, students }),
    ];
    this.writes = writeTools({ tests, students, data });
    const names = new Set<string>();
    for (const t of [...this.tools, ...this.writes]) {
      if (names.has(t.name)) throw new Error(`Takrorlanuvchi assistant tool nomi: ${t.name}`);
      names.add(t.name);
    }
  }

  /** Foydalanuvchi roliga KO'RINADIGAN tool'lar. Boshqa rolning tool'i modelga umuman berilmaydi. */
  forUser(user: CurrentUserPayload): AssistantTool[] {
    const role = effectiveRole(user.role);
    return this.tools.filter((t) => t.roles.includes(role));
  }

  /** Rolga ko'rinadigan YOZUVCHI tool'lar (ular hech qachon execute() orqali bajarilmaydi — faqat taklif yaratadi). */
  writeToolsForUser(user: CurrentUserPayload): AssistantWriteTool[] {
    const role = effectiveRole(user.role);
    return this.writes.filter((t) => t.roles.includes(role));
  }

  writeToolByName(user: CurrentUserPayload, name: string): AssistantWriteTool | undefined {
    return this.writeToolsForUser(user).find((t) => t.name === name);
  }

  /** Modelga beriladigan ta'riflar: o'qish + (rol ruxsat bersa) yozuvchi tool'lar. */
  definitionsFor(user: CurrentUserPayload): AiToolDefinition[] {
    return [...this.forUser(user), ...this.writeToolsForUser(user)].map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
  }

  label(user: CurrentUserPayload, name: string): string {
    if (this.writeToolByName(user, name)) return 'Amal tayyorlanmoqda';
    return this.forUser(user).find((t) => t.name === name)?.label ?? "Ma'lumot olinmoqda";
  }

  /**
   * Tool'ni xavfsiz bajaradi. HECH QACHON xato tashlamaydi: xatolar modelga `is_error` natija sifatida
   * qaytadi (u o'zini tuzatib qayta urinishi yoki foydalanuvchiga tushuntirishi uchun).
   */
  async execute(user: CurrentUserPayload, name: string, rawInput: unknown): Promise<ToolOutcome> {
    // Rolga ko'rinmaydigan (yoki mavjud bo'lmagan) tool — model uydirgan yoki ruxsatni oshirishga urinish. Bajarilmaydi.
    const tool = this.forUser(user).find((t) => t.name === name);
    if (!tool) {
      this.logger.warn(`Ruxsatsiz/noma'lum tool so'raldi: ${name} (rol=${user.role}, user=${user.id})`);
      return { ok: false, content: JSON.stringify({ error: `"${name}" nomli tool mavjud emas` }) };
    }

    let timer: NodeJS.Timeout | undefined;
    try {
      const input = tool.parse(rawInput);
      const result = await Promise.race([
        tool.run(user, input),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('TOOL_TIMEOUT')), TOOL_TIMEOUT_MS);
        }),
      ]);

      const content = JSON.stringify(result ?? null);
      if (content.length > MAX_TOOL_RESULT_CHARS) {
        return { ok: false, content: JSON.stringify({ error: "Natija juda katta. So'rovni toraytiring (masalan, aniqroq filtr bering)" }) };
      }
      return { ok: true, content };
    } catch (e) {
      if (e instanceof ToolInputError) {
        return { ok: false, content: JSON.stringify({ error: e.message }) };
      }
      if (e instanceof HttpException) {
        // Servislarning o'z (o'zbekcha, xavfsiz) xabarlari: "Bu guruh sizga biriktirilmagan", "Test topilmadi"...
        const body = e.getResponse();
        const message = typeof body === 'string' ? body : ((body as any)?.message ?? e.message);
        return { ok: false, content: JSON.stringify({ error: Array.isArray(message) ? message[0] : message }) };
      }
      this.logger.error(`Tool "${name}" xatosi: ${(e as Error)?.message}`);
      const msg = (e as Error)?.message === 'TOOL_TIMEOUT' ? "Ma'lumot olish juda uzoq davom etdi" : "Ma'lumotni olishda xatolik yuz berdi";
      return { ok: false, content: JSON.stringify({ error: msg }) };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
