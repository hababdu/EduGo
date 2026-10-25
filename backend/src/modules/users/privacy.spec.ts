import { PrivacyService } from './privacy.service';

describe('PrivacyService', () => {
  const mk = () => {
    const tx: any = {
      refreshToken: { updateMany: jest.fn() }, notification: { deleteMany: jest.fn() },
      assignmentSubmission: { updateMany: jest.fn() }, user: { update: jest.fn() },
    };
    const prisma: any = { $transaction: jest.fn((fn: any) => fn(tx)) };
    return { tx, svc: new PrivacyService(prisma) };
  };
  it("o'quvchi hisobini anonimlashtiradi va sessiyalarni bekor qiladi", async () => {
    const { svc, tx } = mk();
    await svc.deleteMine({ id: 'u1', role: 'STUDENT' } as any, 'DELETE');
    const d = tx.user.update.mock.calls[0][0].data;
    expect(d).toMatchObject({ lastName: null, username: null, phone: null, telegramId: 'deleted_u1', status: 'BLOCKED' });
    expect(d.deletedAt).toBeInstanceOf(Date);
    expect(tx.refreshToken.updateMany).toHaveBeenCalled();
  });
  it('tasdiqsiz yoki xodim uchun rad etiladi', async () => {
    const { svc, tx } = mk();
    await expect(svc.deleteMine({ id: 'u1', role: 'STUDENT' } as any, 'yes')).rejects.toThrow();
    await expect(svc.deleteMine({ id: 't1', role: 'TEACHER' } as any, 'DELETE')).rejects.toThrow();
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
