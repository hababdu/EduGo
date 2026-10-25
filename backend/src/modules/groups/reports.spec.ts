import * as ExcelJS from 'exceljs';
import { monthRange, ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('monthRange', () => {
    expect(monthRange('2026-10')).toEqual({ from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-11-01T00:00:00Z') });
    expect(monthRange('2026-12').to).toEqual(new Date('2027-01-01T00:00:00Z'));
  });

  it("to'lov va davomat varaqlarini yaratadi, faqat o'z maktabi bo'yicha so'raydi", async () => {
    const prisma: any = {
      group: { findMany: jest.fn().mockResolvedValue([{
        id: 'g1', name: 'Ingliz', monthlyFee: 100000, teacher: { firstName: 'Ali', lastName: 'V' },
        members: [
          { joinedAt: new Date('2026-09-01T00:00:00Z'), student: { id: 's1', firstName: 'Vali', lastName: null, username: null, phone: '+998' } },
          { joinedAt: new Date('2026-09-01T00:00:00Z'), student: { id: 's2', firstName: 'Sami', lastName: null, username: null, phone: null } },
        ],
      }]) },
      payment: { findMany: jest.fn().mockResolvedValue([{ groupId: 'g1', studentId: 's1', status: 'PAID', amount: 100000, paidAt: new Date('2026-10-03T00:00:00Z') }]) },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([{ groupId: 'g1', studentId: 's1', status: 'PRESENT' }, { groupId: 'g1', studentId: 's1', status: 'ABSENT' }]) },
    };
    const svc = new ReportsService(prisma);
    const { buffer, fileName } = await svc.monthlyXlsx({ id: 'a', role: 'ADMIN', organizationId: 'o1' } as any, '2026-10', new Date('2026-10-25T00:00:00Z'));
    expect(fileName).toBe('hisobot_2026-10.xlsx');
    expect(prisma.group.findMany.mock.calls[0][0].where).toMatchObject({ organizationId: 'o1' });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);
    const pay = wb.getWorksheet("To'lovlar")!;
    expect(pay.getRow(2).getCell(6).value).toBe("To'lagan");
    expect(pay.getRow(3).getCell(6).value).toBe("To'lamagan");
    const att = wb.getWorksheet('Davomat')!;
    expect(att.getRow(2).getCell(6).value).toBe(50);
  });
});
