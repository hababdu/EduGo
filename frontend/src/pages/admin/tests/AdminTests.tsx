import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTests } from '../../../hooks/useTests';
import { StatusBadge } from '../../../components/admin/content/StatusBadge';
import { CreateTestForm } from '../../../components/admin/tests/CreateTestForm';

export function AdminTests() {
  const { data: tests, isLoading } = useTests();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const filteredTests = useMemo(() => {
    if (!tests) return [];
    return tests.filter((t: any) => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter ? t.status === statusFilter : true;
      return matchesSearch && matchesStatus;
    });
  }, [tests, search, statusFilter]);

  const hasActiveFilters = search.trim() !== '' || statusFilter !== '';

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Sarlavha va Yangi test qo'shish */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Testlar Boshqaruvi</h1>
          <p className="text-xs text-ink-muted mt-1">
            {tests ? `Jami: ${tests.length} ta test` : "Testlar ro'yxati"}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs bg-gold text-base rounded-xl px-4 py-2.5 font-semibold hover:opacity-90 transition-opacity"
        >
          {showForm ? 'Yopish' : '+ Yangi test'}
        </button>
      </div>

      {showForm && (
        <div className="bg-surface/30 p-6 rounded-2xl border border-white/5">
          <CreateTestForm onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Qidirish va Filtrlar paneli */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Test nomi bo'yicha qidirish..."
          className="bg-surface rounded-xl px-4 py-2.5 text-sm placeholder:text-ink-faint outline-none border border-white/5 focus-visible:ring-2 focus-visible:ring-gold text-ink"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-surface rounded-xl px-3 py-2.5 text-sm outline-none border border-white/5 cursor-pointer text-ink"
        >
          <option value="">Barcha statuslar</option>
          <option value="DRAFT">DRAFT (Qoralama)</option>
          <option value="PUBLISHED">PUBLISHED (E'lon qilingan)</option>
          <option value="ARCHIVED">ARCHIVED (Arxivlangan)</option>
        </select>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between bg-surface/20 px-4 py-2 rounded-xl border border-white/5">
          <span className="text-xs text-ink-muted">
            Topildi: <strong className="text-ink">{filteredTests.length}</strong> ta test
          </span>
          <button
            onClick={handleResetFilters}
            className="text-xs text-gold hover:underline"
          >
            Filtrlarni tozalash
          </button>
        </div>
      )}

      {/* Kontent qismi */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-surface/50 rounded-xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="text-center py-12 bg-surface/20 rounded-2xl border border-white/5 space-y-3">
          <p className="text-sm text-ink-muted">
            {hasActiveFilters ? "Qidiruvga mos testlar topilmadi." : "Hali testlar yo'q. Yuqoridan birinchisini yarating."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs bg-gold text-base font-semibold px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
            >
              Filtrlarni olib tashlash
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-white/5 bg-surface/20 rounded-2xl border border-white/5 px-4">
          {filteredTests.map((t: any) => (
            <button
              key={t.id}
              onClick={() => navigate(`/admin/tests/${t.id}`)}
              className="w-full flex items-center justify-between py-4 text-left hover:bg-white/[0.02] px-2 -mx-2 rounded-xl transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-ink group-hover:text-gold transition-colors">
                  {t.title}
                </p>
                <p className="text-xs text-ink-muted mt-1 flex items-center gap-2">
                  <span>{t._count?.questions ?? 0} savol</span>
                  <span>·</span>
                  <span>{t._count?.assignments ?? 0} biriktirilgan</span>
                  <span>·</span>
                  <span>{t._count?.attempts ?? 0} urinish</span>
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