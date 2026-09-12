import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTests, useCreateTest } from '../../../hooks/useTests';
import { StatusBadge } from '../../../components/admin/content/StatusBadge';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';

/* ============================================================
   TYPES
   ============================================================ */
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface QuestionDraft {
  text: string;
  difficulty: Difficulty;
  points: number;
  options: string[];
  correctAnswerIndex: number;
}

interface TestItem {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  _count?: {
    questions?: number;
    assignments?: number;
    attempts?: number;
  };
}

const EMPTY_QUESTION: QuestionDraft = {
  text: '',
  difficulty: 'MEDIUM',
  points: 1,
  options: ['', ''],
  correctAnswerIndex: 0,
};

/* ============================================================
   COMPONENT
   ============================================================ */
export function AdminTests() {
  const navigate = useNavigate();
  const {
    haptic,
    hapticNotify,
    showMainButton,
    hideMainButton,
  } = useTelegram();

  const { data: tests, isLoading } = useTests();
  const createTest = useCreateTest();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  /* ---------- Form state ---------- */
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(1800);
  const [passingScore, setPassingScore] = useState(50);
  const [randomQuestions, setRandomQuestions] = useState(false);
  const [randomAnswerOrder, setRandomAnswerOrder] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([{ ...EMPTY_QUESTION }]);

  /* ---------- Filter ---------- */
  const filteredTests = useMemo<TestItem[]>(() => {
    if (!tests || !Array.isArray(tests)) return [];
    const q = search.trim().toLowerCase();
    return (tests as TestItem[]).filter((t) => {
      const matchesSearch = !q || t.title.toLowerCase().includes(q);
      const matchesStatus = statusFilter ? t.status === statusFilter : true;
      return matchesSearch && matchesStatus;
    });
  }, [tests, search, statusFilter]);

  const hasActiveFilters = search.trim() !== '' || statusFilter !== '';

  const handleResetFilters = () => {
    haptic('light');
    setSearch('');
    setStatusFilter('');
  };

  /* ---------- Question handlers ---------- */
  const handleAddQuestion = () => {
    haptic('light');
    setQuestions((prev) => [...prev, { ...EMPTY_QUESTION }]);
  };

  const handleRemoveQuestion = (index: number) => {
    haptic('light');
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionChange = <K extends keyof QuestionDraft>(
    index: number,
    field: K,
    value: QuestionDraft[K]
  ) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const options = [...updated[qIndex].options];
      options[optIndex] = value;
      updated[qIndex] = { ...updated[qIndex], options };
      return updated;
    });
  };

  const handleAddOption = (qIndex: number) => {
    haptic('light');
    setQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex] = {
        ...updated[qIndex],
        options: [...updated[qIndex].options, ''],
      };
      return updated;
    });
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    haptic('light');
    setQuestions((prev) => {
      const updated = [...prev];
      const options = updated[qIndex].options.filter((_, i) => i !== optIndex);
      // correctAnswerIndex ni tuzatish
      let correctIdx = updated[qIndex].correctAnswerIndex;
      if (optIndex === correctIdx) correctIdx = 0;
      else if (optIndex < correctIdx) correctIdx -= 1;

      updated[qIndex] = {
        ...updated[qIndex],
        options,
        correctAnswerIndex: correctIdx,
      };
      return updated;
    });
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSubjectId('');
    setDurationSeconds(1800);
    setPassingScore(50);
    setRandomQuestions(false);
    setRandomAnswerOrder(false);
    setQuestions([{ ...EMPTY_QUESTION }]);
  };

  /* ---------- Submit ---------- */
  const handleSubmit = useCallback(() => {
    if (!title.trim()) {
      hapticNotify('error');
      toast('error', 'Test nomini kiriting!');
      return;
    }
    const hasEmptyQuestion = questions.some((q) => !q.text.trim());
    if (hasEmptyQuestion) {
      hapticNotify('error');
      toast('error', "Ba'zi savollar bo'sh!");
      return;
    }
    const hasEmptyOption = questions.some((q) =>
      q.options.some((o) => !o.trim())
    );
    if (hasEmptyOption) {
      hapticNotify('error');
      toast('error', "Ba'zi javob variantlari bo'sh!");
      return;
    }

    createTest.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        subjectId: subjectId || undefined,
        durationSeconds: Number(durationSeconds),
        passingScore: Number(passingScore),
        randomQuestions,
        randomAnswerOrder,
        questions,
      } as any,
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', 'Test muvaffaqiyatli yaratildi!');
          setShowForm(false);
          resetForm();
        },
        onError: (error: any) => {
          hapticNotify('error');
          toast('error', error?.message || 'Saqlashda xatolik!');
        },
      }
    );
  }, [
    title,
    description,
    subjectId,
    durationSeconds,
    passingScore,
    randomQuestions,
    randomAnswerOrder,
    questions,
    createTest,
    hapticNotify,
  ]);

  /* ---------- Telegram MainButton ---------- */
  useEffect(() => {
    if (!showForm) {
      hideMainButton();
      return;
    }
    const cleanup = showMainButton(
      createTest.isPending ? 'Saqlanmoqda...' : 'TESTNI SAQLASH',
      handleSubmit,
      {
        loading: createTest.isPending,
        disabled: createTest.isPending,
      }
    );
    return () => {
      cleanup?.();
      hideMainButton();
    };
  }, [showForm, createTest.isPending, handleSubmit, showMainButton, hideMainButton]);

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5 pb-32">
      {/* ========== HEADER ========== */}
      <div className="flex flex-col gap-4 bg-surface/20 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl text-ink">Testlar</h1>
            <p className="text-xs text-ink-muted mt-1">
              {tests ? `Jami: ${tests.length} ta test` : 'Yuklanmoqda...'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            haptic('light');
            setShowForm((v) => !v);
            if (!showForm) resetForm();
          }}
          className="w-full text-sm bg-gold text-base rounded-2xl px-5 py-3.5 font-semibold active:scale-[0.98] transition-transform shadow-lg shadow-gold/10"
        >
          {showForm ? '✕ Yopish' : '+ Yangi test yaratish'}
        </button>
      </div>

      {/* ========== FORMA ========== */}
      {showForm && (
        <div className="bg-surface/40 p-5 sm:p-6 rounded-3xl border border-white/10 space-y-5 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="font-display text-base text-ink">Yangi test</h2>
            <button
              type="button"
              onClick={() => {
                haptic('light');
                setShowForm(false);
                resetForm();
              }}
              className="text-xs text-ink-muted hover:text-ink px-3 py-2 rounded-xl bg-white/5"
            >
              Bekor qilish
            </button>
          </div>

          {/* Asosiy ma'lumotlar */}
          <div className="space-y-3">
            <Field label="Test nomi *">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Matematika 1-chorak testi"
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
              />
            </Field>

            <Field label="Fan ID (ixtiyoriy)">
              <input
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                placeholder="Subject ID"
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
              />
            </Field>

            <Field label="Tavsif (ixtiyoriy)">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Test haqida qisqacha..."
                rows={2}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink resize-none focus:border-gold/50"
              />
            </Field>
          </div>

          {/* Sozlamalar */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Davomiyligi (sek)">
              <input
                type="number"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
              />
            </Field>

            <Field label="O'tish balli (%)">
              <input
                type="number"
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
              />
            </Field>
          </div>

          <div className="space-y-3">
            <CheckboxRow
              checked={randomQuestions}
              onChange={setRandomQuestions}
              label="Savollarni qorishtirish"
            />
            <CheckboxRow
              checked={randomAnswerOrder}
              onChange={setRandomAnswerOrder}
              label="Variantlarni qorishtirish"
            />
          </div>

          {/* Savollar */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">
                Savollar ({questions.length})
              </h3>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="text-xs bg-gold/10 text-gold px-3 py-2 rounded-xl font-semibold active:scale-[0.98] transition-transform"
              >
                + Savol
              </button>
            </div>

            {questions.map((q, qIndex) => (
              <div
                key={qIndex}
                className="bg-surface/50 p-4 rounded-2xl border border-white/5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-muted">
                    {qIndex + 1}-savol
                  </span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      O'chirish
                    </button>
                  )}
                </div>

                <textarea
                  value={q.text}
                  onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                  placeholder="Savol matnini kiriting..."
                  rows={2}
                  className="w-full bg-surface rounded-xl px-3 py-2.5 text-sm outline-none border border-white/5 text-ink resize-none focus:border-gold/50"
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={q.difficulty}
                    onChange={(e) =>
                      handleQuestionChange(
                        qIndex,
                        'difficulty',
                        e.target.value as Difficulty
                      )
                    }
                    className="bg-surface rounded-xl px-3 py-2.5 text-xs outline-none border border-white/5 text-ink min-h-[44px]"
                  >
                    <option value="EASY">🟢 Oson</option>
                    <option value="MEDIUM">🟡 O'rta</option>
                    <option value="HARD">🔴 Qiyin</option>
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={q.points}
                    onChange={(e) =>
                      handleQuestionChange(qIndex, 'points', Number(e.target.value))
                    }
                    placeholder="Ball"
                    className="bg-surface rounded-xl px-3 py-2.5 text-xs outline-none border border-white/5 text-ink min-h-[44px]"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs text-ink-muted">
                    Javob variantlari (radio = to'g'ri javob)
                  </label>
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={q.correctAnswerIndex === optIndex}
                        onChange={() =>
                          handleQuestionChange(qIndex, 'correctAnswerIndex', optIndex)
                        }
                        className="cursor-pointer accent-gold shrink-0"
                      />
                      <input
                        value={opt}
                        onChange={(e) =>
                          handleOptionChange(qIndex, optIndex, e.target.value)
                        }
                        placeholder={`${optIndex + 1}-variant`}
                        className="flex-1 bg-surface rounded-xl px-3 py-2.5 text-xs outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
                      />
                      {q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(qIndex, optIndex)}
                          className="text-red-400 text-xs px-2 py-2 rounded-lg bg-red-500/10 shrink-0"
                        >
                          ✕
                        </button>
                      )}
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

          <p className="text-[10px] text-ink-muted text-center">
            Pastdagi Telegram tugmasi orqali saqlashingiz mumkin
          </p>
        </div>
      )}

      {/* ========== SEARCH + FILTER ========== */}
      <div className="space-y-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Test nomi bo'yicha qidirish..."
          className="w-full bg-surface/30 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink min-h-[44px]"
        />

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {[
            { key: '', label: 'Barchasi' },
            { key: 'DRAFT', label: 'Qoralama' },
            { key: 'PUBLISHED', label: "E'lon qilingan" },
            { key: 'ARCHIVED', label: 'Arxivlangan' },
          ].map(({ key, label }) => (
            <button
              key={key || 'all'}
              type="button"
              onClick={() => {
                haptic('light');
                setStatusFilter(key);
              }}
              className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors ${
                statusFilter === key
                  ? 'bg-gold text-base'
                  : 'bg-white/5 text-ink-muted hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ========== ACTIVE FILTERS ========== */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between bg-surface/20 px-4 py-3 rounded-2xl border border-white/5">
          <span className="text-xs text-ink-muted">
            Topildi: <strong className="text-ink">{filteredTests.length}</strong> ta
          </span>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-gold font-semibold"
          >
            Tozalash
          </button>
        </div>
      )}

      {/* ========== LIST ========== */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-surface/30 rounded-2xl animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : filteredTests.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? 'Natija topilmadi' : 'Hali testlar yo\'q'}
          subtitle={
            hasActiveFilters
              ? "Filtr yoki qidiruvni o'zgartirib ko'ring"
              : "Birinchi testingizni yarating"
          }
          ctaLabel={hasActiveFilters ? 'Filtrlarni tozalash' : '+ Test yaratish'}
          onCta={() => {
            haptic('light');
            if (hasActiveFilters) handleResetFilters();
            else setShowForm(true);
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredTests.map((t) => (
            <div
              key={t.id}
              onClick={() => {
                haptic('light');
                navigate(`/teacher/tests/${t.id}`);
              }}
              className="group bg-surface/20 hover:bg-surface/40 p-4 rounded-3xl border border-white/5 transition-all cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink group-hover:text-gold transition-colors truncate">
                  {t.title}
                </p>
                <p className="text-xs text-ink-muted mt-1 flex items-center gap-2 flex-wrap">
                  <span>{t._count?.questions ?? 0} ta savol</span>
                  <span>·</span>
                  <span>{t._count?.assignments ?? 0} ta biriktirma</span>
                  <span>·</span>
                  <span>{t._count?.attempts ?? 0} ta urinish</span>
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

/* ============================================================
   YORDAMCHI KOMPONENTLAR
   ============================================================ */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-ink-muted font-medium">{label}</label>
      {children}
    </div>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-2xl bg-surface/50 border border-white/5 active:scale-[0.99] transition-transform min-h-[48px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="cursor-pointer accent-gold w-5 h-5 shrink-0"
      />
      <span className="text-sm text-ink">{label}</span>
    </label>
  );
}

function EmptyState({
  title,
  subtitle,
  ctaLabel,
  onCta,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <div className="text-center py-14 px-6 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="text-xs text-ink-muted">{subtitle}</p>
      <button
        type="button"
        onClick={onCta}
        className="mt-2 text-xs font-semibold text-gold bg-gold/10 px-4 py-2.5 rounded-2xl active:scale-[0.98] transition-transform"
      >
        {ctaLabel}
      </button>
    </div>
  );
}

export default AdminTests;