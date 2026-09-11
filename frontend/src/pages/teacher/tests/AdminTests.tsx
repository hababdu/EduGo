import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTests, useCreateTest } from '../../../hooks/useTests';
import { StatusBadge } from '../../../components/admin/content/StatusBadge';

export function AdminTests() {
  const { data: tests, isLoading } = useTests();
  const createTest = useCreateTest();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  // Test va savollar formasi uchun state'lar
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([
    { text: '', difficulty: 'MEDIUM', points: 1, options: ['', ''], correctAnswerIndex: 0 }
  ]);

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

  const handleAddQuestion = () => {
    setQuestions([...questions, { text: '', difficulty: 'MEDIUM', points: 1, options: ['', ''], correctAnswerIndex: 0 }]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    const options = [...updated[qIndex].options];
    options[optIndex] = value;
    updated[qIndex].options = options;
    setQuestions(updated);
  };

  const handleAddOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.push('');
    setQuestions(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createTest.mutate(
      { title, questions } as any,
      {
        onSuccess: () => {
          setShowForm(false);
          setTitle('');
          setQuestions([{ text: '', difficulty: 'MEDIUM', points: 1, options: ['', ''], correctAnswerIndex: 0 }]);
        },
      }
    );
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
          {showForm ? 'Yopish' : '+ Yangi test va savollar'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface/30 p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Yangi test va savollar yaratish</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-ink-muted hover:text-ink">
              Bekor qilish
            </button>
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Test nomi (masalan: Matematika 1-modul)"
            required
            className="w-full bg-surface rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 text-ink"
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Test savollari ({questions.length})</h3>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="text-xs bg-gold/10 text-gold px-3 py-1.5 rounded-xl font-semibold hover:bg-gold/20 transition-colors"
              >
                + Savol qo'shish
              </button>
            </div>

            {questions.map((q, qIndex) => (
              <div key={qIndex} className="bg-surface/50 p-4 rounded-2xl border border-white/5 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-muted">{qIndex + 1}-savol</span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="text-xs text-coral hover:underline"
                    >
                      O'chirish
                    </button>
                  )}
                </div>

                <input
                  value={q.text}
                  onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                  placeholder="Savol matnini kiriting..."
                  required
                  className="w-full bg-surface rounded-xl px-3 py-2 text-sm outline-none border border-white/5 text-ink"
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={q.difficulty}
                    onChange={(e) => handleQuestionChange(qIndex, 'difficulty', e.target.value)}
                    className="bg-surface rounded-xl px-3 py-2 text-xs outline-none border border-white/5 text-ink"
                  >
                    <option value="EASY">Oson</option>
                    <option value="MEDIUM">O'rtacha</option>
                    <option value="HARD">Qiyin</option>
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={q.points}
                    onChange={(e) => handleQuestionChange(qIndex, 'points', Number(e.target.value))}
                    placeholder="Ball"
                    className="bg-surface rounded-xl px-3 py-2 text-xs outline-none border border-white/5 text-ink"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs text-ink-muted">Javob variantlari (To'g'risini belgilang):</label>
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={q.correctAnswerIndex === optIndex}
                        onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', optIndex)}
                        className="cursor-pointer"
                      />
                      <input
                        value={opt}
                        onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                        placeholder={`${optIndex + 1}-variant`}
                        required
                        className="flex-1 bg-surface rounded-xl px-3 py-1.5 text-xs outline-none border border-white/5 text-ink"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddOption(qIndex)}
                    className="text-xs text-gold hover:underline pt-1"
                  >
                    + Variant qo'shish
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={createTest.isPending}
            className="w-full bg-gold text-base rounded-xl py-3 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {createTest.isPending ? 'Saqlanmoqda...' : 'Testni saqlash va yaratish'}
          </button>
        </form>
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
            <div
              key={t.id}
              onClick={() => navigate(`/teacher/tests/${t.id}`)}
              className="w-full flex items-center justify-between py-4 text-left hover:bg-white/[0.02] px-2 -mx-2 rounded-xl transition-colors group cursor-pointer"
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}