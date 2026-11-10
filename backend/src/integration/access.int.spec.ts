/**
 * HTTP darajasidagi integratsiya testi: haqiqiy controller'lar, RolesGuard / ParentScopeGuard / SuperReadOnlyGuard,
 * ValidationPipe va webhook imzosi. Servis va baza mock (ma'lumotlar bazasi talab qilinmaydi).
 */
import { CanActivate, ExecutionContext, INestApplication, Injectable, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { ParentScopeGuard } from '../common/guards/parent-scope.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SuperReadOnlyGuard } from '../common/guards/super-readonly.guard';
import { Reflector } from '@nestjs/core';
import { CatalogController } from '../modules/catalog/catalog.controller';
import { CatalogService } from '../modules/catalog/catalog.service';
import { AdminMembershipsController, MembershipsController } from '../modules/memberships/memberships.controller';
import { MembershipsService } from '../modules/memberships/memberships.service';
import { BillingWebhookController } from '../modules/super-admin/super-admin.controller';
import { OrgInvoiceService, signPayload } from '../modules/super-admin/org-invoice.service';
import { AdminTeachingController, TimetableController } from '../modules/teaching/teaching.controller';
import { TeachingService } from '../modules/teaching/teaching.service';
import { AdminTrialsController, TrialsController } from '../modules/trials/trials.controller';
import { TrialsService } from '../modules/trials/trials.service';

/** JWT o'rniga: `x-test-user` sarlavhasidagi JSON — foydalanuvchi. Public yo'llar o'tadi. */
@Injectable()
class FakeAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const pub = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    const raw = req.headers['x-test-user'];
    if (raw) req.user = JSON.parse(raw as string);
    if (pub) return true;
    if (!req.user) throw new UnauthorizedException();
    return true;
  }
}

const SECRET = 's3cret';
const as = (role: string, extra: any = {}) => JSON.stringify({ id: `${role}-1`, role, status: 'ACTIVE', organizationId: 'o1', ...extra });
const ok = () => jest.fn().mockResolvedValue({ ok: true });

describe('Access control (HTTP)', () => {
  let app: INestApplication;
  const trials = { request: ok(), approve: ok(), list: ok(), mine: ok(), cancel: ok(), decline: ok(), attended: ok(), noShow: ok(), admit: ok() };
  const memberships = { requestJoin: ok(), schools: ok(), mine: ok(), cancel: ok(), list: ok(), attach: ok(), decide: ok(), changeRole: ok(), remove: ok() };
  const teaching = { addSlot: ok(), listSubjects: ok(), createSubject: ok(), removeSubject: ok(), listAssignments: ok(), assign: ok(), unassign: ok(), timetable: ok(), removeSlot: ok(), mine: ok() };
  const catalog = { list: ok(), cities: ok(), detail: ok(), review: ok() };
  const invoicePrisma: any = {
    orgInvoice: { findUnique: jest.fn().mockResolvedValue({ id: 'i1', organizationId: 'o1', month: '2026-11', amount: 1000, status: 'PENDING', createdById: 's' }), update: jest.fn() },
    orgPayment: { upsert: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }])],
      controllers: [TrialsController, AdminTrialsController, MembershipsController, AdminMembershipsController, AdminTeachingController, TimetableController, CatalogController, BillingWebhookController],
      providers: [
        { provide: TrialsService, useValue: trials },
        { provide: MembershipsService, useValue: memberships },
        { provide: TeachingService, useValue: teaching },
        { provide: CatalogService, useValue: catalog },
        { provide: OrgInvoiceService, useValue: new OrgInvoiceService(invoicePrisma, { get: () => SECRET } as unknown as ConfigService) },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_GUARD, useClass: SuperReadOnlyGuard },
        { provide: APP_GUARD, useClass: ParentScopeGuard },
      ],
    }).compile();
    app = mod.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(() => app.close());

  const api = () => request(app.getHttpServer());

  it('tokensiz so\'rov — 401', async () => {
    await api().get('/api/v1/memberships/mine').expect(401);
    await api().get('/api/v1/admin/memberships').expect(401);
  });

  it("rol chegaralari: o'quvchi/o'qituvchi admin endpointlariga kira olmaydi", async () => {
    for (const role of ['STUDENT', 'TEACHER', 'PARENT']) {
      await api().get('/api/v1/admin/memberships').set('x-test-user', as(role)).expect(403);
      await api().post('/api/v1/admin/trials/t1/approve').set('x-test-user', as(role)).send({ scheduledAt: '2099-01-01T10:00:00Z' }).expect(403);
      await api().post('/api/v1/admin/teaching/subjects').set('x-test-user', as(role)).send({ name: 'Fizika' }).expect(403);
    }
    await api().get('/api/v1/admin/memberships').set('x-test-user', as('ADMIN')).expect(200);
  });

  it("o'qituvchi sinov darsiga yozila olmaydi; o'quvchi va ota-ona yozadi", async () => {
    await api().post('/api/v1/trials').set('x-test-user', as('TEACHER')).send({ organizationId: 'org-12345' }).expect(403);
    await api().post('/api/v1/trials').set('x-test-user', as('STUDENT')).send({ organizationId: 'org-12345' }).expect(201);
    await api().post('/api/v1/trials').set('x-test-user', as('PARENT')).send({ organizationId: 'org-12345', studentId: 'child-12345' }).expect(201);
  });

  it("ota-ona faqat oq ro'yxatdagi yo'llarga kiradi (admin/memberships/teaching yopiq)", async () => {
    await api().get('/api/v1/memberships/mine').set('x-test-user', as('PARENT')).expect(403);
    await api().get('/api/v1/timetable/mine').set('x-test-user', as('PARENT')).expect(403);
    await api().get('/api/v1/catalog').set('x-test-user', as('PARENT')).expect(200);
  });

  it("super admin 'ADMIN' ko'rish rejimida ham (realRole) maktab ma'lumotini o'zgartira olmaydi", async () => {
    const viewAsAdmin = as('ADMIN', { realRole: 'SUPER_ADMIN', organizationId: 'o1' });
    await api().post('/api/v1/admin/teaching/subjects').set('x-test-user', viewAsAdmin).send({ name: 'Fizika' }).expect(403);
    await api().get('/api/v1/admin/memberships').set('x-test-user', viewAsAdmin).expect(200);
  });

  it("super admin maktab ichida faqat o'qiydi (yozish 403), GET ishlaydi", async () => {
    await api().get('/api/v1/admin/memberships').set('x-test-user', as('SUPER_ADMIN', { organizationId: null })).expect(200);
    await api().post('/api/v1/admin/memberships/attach').set('x-test-user', as('SUPER_ADMIN', { organizationId: null })).send({ userId: 'user-12345', role: 'TEACHER' }).expect(403);
    await api().post('/api/v1/admin/teaching/subjects').set('x-test-user', as('SUPER_ADMIN', { organizationId: null })).send({ name: 'Fizika' }).expect(403);
  });

  it('validatsiya: ortiqcha maydon, noto\'g\'ri rol va vaqt formati 400', async () => {
    const st = as('STUDENT');
    await api().post('/api/v1/trials').set('x-test-user', st).send({ organizationId: 'org-12345', hack: 1 }).expect(400);
    await api().post('/api/v1/memberships/requests').set('x-test-user', st).send({ organizationId: 'org-12345', role: 'ADMIN' }).expect(400);
    await api().post('/api/v1/memberships/requests').set('x-test-user', st).send({ organizationId: 'org-12345', role: 'TEACHER' }).expect(201);
    await api().patch('/api/v1/admin/memberships/m1/role').set('x-test-user', as('ADMIN')).send({ role: 'SUPER_ADMIN' }).expect(400);
    await api().post('/api/v1/admin/teaching/assignments/a1/slots').set('x-test-user', as('ADMIN')).send({ weekday: 9, startTime: '9:00', endTime: '10:00' }).expect(400);
    await api().post('/api/v1/admin/teaching/assignments/a1/slots').set('x-test-user', as('ADMIN')).send({ weekday: 2, startTime: '09:00', endTime: '10:00' }).expect(201);
    await api().post('/api/v1/catalog/org-12345/reviews').set('x-test-user', st).send({ rating: 6 }).expect(400);
  });

  it("webhook: JWT shart emas, lekin imzosiz yoki noto'g'ri imzo 401; to'g'ri imzo 200", async () => {
    const body = { invoiceId: 'i1', externalId: 'e1', status: 'paid', amount: 1000 };
    const raw = JSON.stringify(body);
    await api().post('/api/v1/billing/webhook/payme').set('content-type', 'application/json').send(raw).expect(401);
    await api().post('/api/v1/billing/webhook/payme').set('content-type', 'application/json').set('x-signature', signPayload(raw, 'boshqa')).send(raw).expect(401);
    await api().post('/api/v1/billing/webhook/payme').set('content-type', 'application/json').set('x-signature', signPayload(raw, SECRET)).send(raw).expect(200);
    expect(invoicePrisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
