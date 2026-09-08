import { useState } from 'react';
import { useGroups } from '../../../hooks/useGroups';
import { useAssignTest } from '../../../hooks/useTests';

export function AssignTestForm({ testId }: { testId: string }) {
  const { data: groups } = useGroups();
  const assignTest = useAssignTest(testId);

  const [targetType, setTargetType] = useState<'ALL' | 'GROUP' | 'INDIVIDUAL'>('GROUP');
  const [groupId, setGroupId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    assignTest.mutate(
      {
        targetType,
        groupId: targetType === 'GROUP' ? groupId : undefined,
        studentId: targetType === 'INDIVIDUAL' ? studentId : undefined,
        deadline: deadline || undefined,
      },
      {
        onSuccess: () => setMessage('✅ Test biriktirildi va bildirishnoma yuborildi'),
        onError: (err: any) => setMessage(`❌ ${err.message ?? 'Xatolik'}`),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-surface p-4 space-y-3">
      <select
        value={targetType}
        onChange={(e) => setTargetType(e.target.value as any)}
        className="w-full bg-surfaceRaised rounded-lg px-3 py-2.5 text-sm"
      >
        <option value="ALL">Barcha studentlar</option>
        <option value="GROUP">Bitta guruh</option>
        <option value="INDIVIDUAL">Bitta student (ID orqali)</option>
      </select>

      {targetType === 'GROUP' && (
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="w-full bg-surfaceRaised rounded-lg px-3 py-2.5 text-sm"
        >
          <option value="">Guruhni tanlang</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      )}

      {targetType === 'INDIVIDUAL' && (
        <input
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="Student ID (Admin → Studentlar orqali topiladi)"
          className="w-full bg-surfaceRaised rounded-lg px-3 py-2.5 text-sm outline-none"
        />
      )}

      <input
        type="datetime-local"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        className="w-full bg-surfaceRaised rounded-lg px-3 py-2.5 text-sm outline-none"
      />

      {message && <p className="text-sm">{message}</p>}

      <button
        type="submit"
        disabled={assignTest.isPending || (targetType === 'GROUP' && !groupId) || (targetType === 'INDIVIDUAL' && !studentId)}
        className="rounded-full bg-teal text-base font-semibold px-5 py-2 text-sm disabled:opacity-50"
      >
        {assignTest.isPending ? 'Biriktirilmoqda...' : 'Biriktirish'}
      </button>
    </form>
  );
}
