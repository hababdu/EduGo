import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTests } from '../../../hooks/useTests';
import { StatusBadge } from '../../../components/admin/content/StatusBadge';
import { CreateTestForm } from '../../../components/admin/tests/CreateTestForm';

export function AdminTests() {
  const { data: tests, isLoading } = useTests();
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl">Testlar</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm bg-gold text-base rounded-full px-4 py-2 font-medium"
        >
          {showForm ? 'Yopish' : '+ Yangi test'}
        </button>
      </div>

      {showForm && <CreateTestForm onCancel={() => setShowForm(false)} />}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tests && tests.length === 0 ? (
        <p className="text-sm text-ink-muted py-10 text-center">
          Hali testlar yo'q. Yuqoridan birinchisini yarating.
        </p>
      ) : (
        <div className="divide-y divide-white/5">
          {tests?.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/admin/tests/${t.id}`)}
              className="w-full flex items-center justify-between py-3.5 text-left hover:bg-surface/50 px-2 -mx-2 rounded-lg transition-colors"
            >
              <div>
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {t._count.questions} savol · {t._count.assignments} biriktirilgan · {t._count.attempts} urinish
                </p>
              </div>
              <StatusBadge status={t.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
