import { BadRequestException, ConflictException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { OrgInvoiceService, signPayload } from './org-invoice.service';

const SECRET = 'topsecret';
function mk(inv: any, secret: string = SECRET) {
  const prisma: any = {
    orgInvoice: { findUnique: jest.fn().mockResolvedValue(inv), update: jest.fn().mockReturnValue('u'), findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'i1' }) },
    orgPayment: { upsert: jest.fn().mockReturnValue('p') },
    organization: { findUnique: jest.fn().mockResolvedValue({ id: 'o1', monthlyPlanFee: 500000 }) },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  return { prisma, svc: new OrgInvoiceService(prisma, { get: () => secret } as any) };
}
const inv = (o: any = {}) => ({ id: 'i1', organizationId: 'o1', month: '2026-11', amount: 500000, status: 'PENDING', createdById: 's1', ...o });
const send = (svc: OrgInvoiceService, body: any, secret = SECRET) => { const raw = Buffer.from(JSON.stringify(body)); return svc.webhook('payme', raw, signPayload(raw, secret), body); };
const paid = (o: any = {}) => ({ invoiceId: 'i1', externalId: 'ext1', status: 'paid', amount: 500000, ...o });

describe('OrgInvoiceService', () => {
  it("to'g'ri imzo: hisob PAID va oylik to'lov belgilanadi", async () => {
    const { svc, prisma } = mk(inv());
    await expect(send(svc, paid())).resolves.toEqual({ ok: true });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.orgPayment.upsert.mock.calls[0][0].create).toMatchObject({ organizationId: 'o1', month: '2026-11', status: 'PAID', amount: 500000 });
  });
  it("noto'g'ri/yo'q imzo va sozlanmagan secret rad etiladi", async () => {
    const { svc } = mk(inv());
    const raw = Buffer.from(JSON.stringify(paid()));
    await expect(svc.webhook('x', raw, signPayload(raw, 'boshqa'), paid())).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(svc.webhook('x', raw, 'zz', paid())).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(svc.webhook('x', raw, undefined, paid())).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(mk(inv(), '').svc.webhook('x', raw, 'a', paid())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it("takroriy chaqiruv idempotent; summa mos kelmasa va bekor qilingan hisob rad etiladi", async () => {
    const dup = mk(inv({ status: 'PAID' }));
    await expect(send(dup.svc, paid())).resolves.toMatchObject({ duplicate: true });
    expect(dup.prisma.$transaction).not.toHaveBeenCalled();
    await expect(send(mk(inv()).svc, paid({ amount: 1 }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(send(mk(inv({ status: 'CANCELLED' })).svc, paid())).rejects.toBeInstanceOf(ConflictException);
  });
  it("'paid' bo'lmagan holat e'tiborsiz qoldiriladi; hisob yaratishda tarif shart", async () => {
    await expect(send(mk(inv()).svc, paid({ status: 'pending' }))).resolves.toMatchObject({ ignored: true });
    const { svc, prisma } = mk(null);
    prisma.organization.findUnique.mockResolvedValue({ id: 'o1', monthlyPlanFee: null });
    await expect(svc.create({ id: 's1' } as any, 'o1', '2026-11')).rejects.toBeInstanceOf(BadRequestException);
  });
});
