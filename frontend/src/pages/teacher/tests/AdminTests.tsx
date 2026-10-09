// src/pages/admin/AdminTests.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../../components/ui/Toast';
import { apiFetch } from '../../../lib/api-client';
import type { GeneratedQuestion } from '../../../lib/ai-service';
import { AIQuestionGenerator } from '../../../components/ai/AIQuestionGenerator';
import {
  PageHeader,
  CardList,
  ListRow,
  EmptyState,
  FilterBar,
  Field,
  CheckboxRow,
  Skeleton,
} from '../../../components/ui';
import {
  Plus,
  X,
  Sparkles,
  Trash2,
  Check,
  FileText,
  AlertTriangle,
  RotateCw,
} from '../../../design/icons';
import { TEXT, CONTROL, PAGE } from '../../../design/tokens';

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
  _count?: { questions?: number; assignments?: number; attempts?: number };
}

interface TeacherGroup {
  id: string;
  name: string;
  _count?: { members?: number };
}

const EMPTY_QUESTION: QuestionDraft = {
  text: '',
  difficulty: 'MEDIUM',
  points: 1,
  options: ['', ''],
  correctAnswerIndex: 0,
};

/* ============================================================
   HOOKS
   ============================================================ */
function useTests() {
  return useQuery({
    queryKey: ['tests'],
    queryFn: async () => {
      const result = await apiFetch<TestItem[]>('/api/v1/tests');
      return result;
    },
    staleTime: 30_000,
    retry: 1,
  });
}

function useTeacherGroups() {
  return useQuery({
    queryKey: ['teacher', 'groups'],
    queryFn: () => apiFetch<TeacherGroup[]>('/api/v1/teacher/groups'),
    staleTime: 60_000,
    retry: 1,
  });
}

function useCreateTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch<TestItem>('/api/v1/tests', { method: 'POST', data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tests'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'groups'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'overview'] });
    },
  });
}

/* ============================================================
   COMPONENT
   ============================================================ */
export function AdminTests() {
  const navigate = useNavigate();
  const { haptic, hapticNotify } = useTelegram();

  const {
    data: tests,
    isLoading: testsLoading,
    error: testsError,
    isFetching: testsFetching,
  } = useTests();

  const {
    data: teacherGroups,
    isLoading: groupsLoading,
    error: groupsError,
  } = useTeacherGroups();

  const createTest = useCreateTest();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(1800);
  const [passingScore, setPassingScore] = useState(50);
  const [randomQuestions, setRandomQuestions] = useState(false);
  const [randomAnswerOrder, setRandomAnswerOrder] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { ...EMPTY_QUESTION },
  ]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredTests = useMemo<TestItem[]>(() => {
    if (!tests || !Array.isArray(tests)) return [];
    const q = search.trim().toLowerCase();
    return tests.filter((t) => {
      const ms = !q || t.title.toLowerCase().includes(q);
      const mst = statusFilter ? t.status === statusFilter : true;
      return ms && mst;
    });
  }, [tests, search, statusFilter]);

  const hasFilters = search.trim() !== '' || statusFilter !== '';

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDurationSeconds(1800);
    setPassingScore(50);
    setRandomQuestions(false);
    setRandomAnswerOrder(false);
    setQuestions([{ ...EMPTY_QUESTION, options: ['', ''] }]);
    setSelectedGroupIds([]);
    setOpenIndex(null);
  };

  const toggleGroup = (id: string) => {
    haptic('light');
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleAddQuestion = () => {
    haptic('light');
    setQuestions((prev) => {
      setOpenIndex(prev.length);
      return [...prev, { ...EMPTY_QUESTION, options: ['', ''] }];
    });
  };

  const handleDuplicateQuestion = (i: number) => {
    haptic('light');
    setQuestions((prev) => {
      const copy = { ...prev[i], options: [...prev[i].options] };
      const u = [...prev];
      u.splice(i + 1, 0, copy);
      setOpenIndex(i + 1);
      return u;
    });
  };

  const handleRemoveQuestion = (i: number) => {
    haptic('light');
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleQuestionChange = <K extends keyof QuestionDraft>(
    index: number,
    field: K,
    value: QuestionDraft[K],
  ) => {
    setQuestions((prev) => {
      const u = [...prev];
      u[index] = { ...u[index], [field]: value };
      return u;
    });
  };

  const handleOptionChange = (qi: number, oi: number, val: string) => {
    setQuestions((prev) => {
      const u = [...prev];
      const opts = [...u[qi].options];
      opts[oi] = val;
      u[qi] = { ...u[qi], options: opts };
      return u;
    });
  };

  const handleAddOption = (qi: number) => {
    haptic('light');
    setQuestions((prev) => {
      const u = [...prev];
      u[qi] = { ...u[qi], options: [...u[qi].options, ''] };
      return u;
    });
  };

  const handleRemoveOption = (qi: number, oi: number) => {
    haptic('light');
    setQuestions((prev) => {
      const u = [...prev];
      const opts = u[qi].options.filter((_, i) => i !== oi);
      let ci = u[qi].correctAnswerIndex;
      if (oi === ci) ci = 0;
      else if (oi < ci) ci -= 1;
      u[qi] = { ...u[qi], options: opts, correctAnswerIndex: ci };
      return u;
    });
  };

  const handleOpenAI = () => {
    haptic('light');

    // AI orqali test yaratilganda nomi bo'sh qolmasligi uchun
    // avtomatik boshlang'ich nom beramiz. Uni keyin o'zgartirish mumkin.
    if (!title.trim()) {
      setTitle('AI testi');
    }

    setShowAIModal(true);
  };

  const handleAIAccept = (generated: GeneratedQuestion[]) => {
    setQuestions((prev) => {
      const nonEmpty = prev.filter((q) => q.text.trim() !== '');
      return [...nonEmpty, ...generated];
    });

    if (!title.trim()) {
      setTitle('AI testi');
    }

    if (!description.trim()) {
      setDescription(
        `AI yordamida yaratilgan ${generated.length} ta savolli test`,
      );
    }

    hapticNotify('success');
    toast('success', `Testga ${generated.length} ta AI savol qo'shildi`);
    setShowAIModal(false);
  };

  const handleSubmit = useCallback(() => {
    if (!title.trim()) {
      hapticNotify('error');
      toast('error', 'Test nomini kiriting');
      return;
    }
    if (selectedGroupIds.length === 0) {
      hapticNotify('error');
      toast('error', 'Kamida 1 ta guruh tanlang');
      return;
    }
    if (questions.some((q) => !q.text.trim())) {
      hapticNotify('error');
      toast('error', "Ba'zi savollar bo'sh");
      return;
    }
    if (questions.some((q) => q.options.some((o) => !o.trim()))) {
      hapticNotify('error');
      toast('error', "Ba'zi variantlar bo'sh");
      return;
    }

    createTest.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        durationSeconds: Number(durationSeconds),
        passingScore: Number(passingScore),
        randomQuestions,
        randomAnswerOrder,
        questions,
        groupIds: selectedGroupIds,
      },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', 'Test yaratildi');
          setShowForm(false);
          resetForm();
        },
        onError: (err: any) => {
          hapticNotify('error');
          const msg =
            err?.response?.data?.message || err?.message || 'Xatolik';
          toast('error', Array.isArray(msg) ? msg[0] : msg);
        },
      },
    );
  }, [
    title,
    description,
    durationSeconds,
    passingScore,
    randomQuestions,
    randomAnswerOrder,
    questions,
    selectedGroupIds,
    createTest,
    hapticNotify,
  ]);


  /* ============================================================
     ERROR STATE — birinchi bo'lib tekshiriladi
     ============================================================ */
  if (testsError) {
    return (
      <div className={PAGE}>
        <PageHeader title="Testlar" />
        <div className="bg-surface/20 border border-white/5 rounded-2xl">
          <EmptyState
            icon={AlertTriangle}
            title="Testlarni yuklashda xatolik"
            subtitle={
              (testsError as any)?.response?.data?.message ||
              (testsError as any)?.message ||
              "Server bilan bog'lanishda muammo"
            }
            action={{
              label: 'Qayta yuklash',
              icon: RotateCw,
              onClick: () => window.location.reload(),
            }}
          />
        </div>
      </div>
    );
  }

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className={PAGE}>
      <PageHeader
        title="Testlar"
        subtitle={
          testsLoading
            ? 'Yuklanmoqda...'
            : `${tests?.length ?? 0} ta test`
        }
        actions={
          <button
            type="button"
            onClick={() => {
              haptic('light');
              setShowForm((v) => !v);
              if (!showForm) resetForm();
            }}
            className={CONTROL.buttonPrimary}
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Yopish' : 'Yangi'}
          </button>
        }
      />

      {showForm && (
        <TestForm
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          durationSeconds={durationSeconds}
          setDurationSeconds={setDurationSeconds}
          passingScore={passingScore}
          setPassingScore={setPassingScore}
          randomQuestions={randomQuestions}
          setRandomQuestions={setRandomQuestions}
          randomAnswerOrder={randomAnswerOrder}
          setRandomAnswerOrder={setRandomAnswerOrder}
          questions={questions}
          selectedGroupIds={selectedGroupIds}
          toggleGroup={toggleGroup}
          teacherGroups={teacherGroups}
          groupsLoading={groupsLoading}
          onAddQuestion={handleAddQuestion}
          onDuplicateQuestion={handleDuplicateQuestion}
          openIndex={openIndex}
          onSubmit={handleSubmit}
          submitting={createTest.isPending}
          onRemoveQuestion={handleRemoveQuestion}
          onQuestionChange={handleQuestionChange}
          onOptionChange={handleOptionChange}
          onAddOption={handleAddOption}
          onRemoveOption={handleRemoveOption}
          onOpenAI={handleOpenAI}
          onCancel={() => {
            haptic('light');
            setShowForm(false);
            resetForm();
          }}
        />
      )}

      {/* Filters */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Test qidirish..."
        chips={[
          { key: '', label: 'Barchasi' },
          { key: 'DRAFT', label: 'Qoralama' },
          { key: 'PUBLISHED', label: 'Faol' },
          { key: 'ARCHIVED', label: 'Arxiv' },
        ]}
        activeChip={statusFilter}
        onChipChange={setStatusFilter}
      />

      {hasFilters && (
        <div className="flex items-center justify-between px-1">
          <span className={TEXT.tiny}>
            Topildi: <strong className="text-ink">{filteredTests.length}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              haptic('light');
              setSearch('');
              setStatusFilter('');
            }}
            className="text-xs text-gold font-semibold"
          >
            Tozalash
          </button>
        </div>
      )}

      {/* List */}
      {testsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : !tests || tests.length === 0 ? (
        <div className="bg-surface/20 border border-white/5 rounded-2xl">
          <EmptyState
            icon={FileText}
            title="Testlar yo'q"
            subtitle="Birinchi testingizni yarating"
            action={{
              label: 'Test yaratish',
              icon: Plus,
              onClick: () => {
                haptic('light');
                setShowForm(true);
              },
            }}
          />
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="bg-surface/20 border border-white/5 rounded-2xl">
          <EmptyState
            icon={FileText}
            title="Natija topilmadi"
            subtitle="Filtr yoki qidiruvni o'zgartirib ko'ring"
            action={{
              label: 'Tozalash',
              icon: X,
              onClick: () => {
                haptic('light');
                setSearch('');
                setStatusFilter('');
              },
            }}
          />
        </div>
      ) : (
        <CardList>
          {filteredTests.map((t) => (
            <ListRow
              key={t.id}
              title={t.title}
              subtitle={`${t._count?.questions ?? 0} savol · ${
                t._count?.assignments ?? 0
              } biriktirma · ${t._count?.attempts ?? 0} urinish`}
              trailing={<StatusBadge status={t.status} />}
              onClick={() => {
                haptic('light');
                navigate(`/teacher/tests/${t.id}`);
              }}
            />
          ))}
        </CardList>
      )}

      <AIQuestionGenerator
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onAccept={handleAIAccept}
      />
    </div>
  );
}

/* ============================================================
   TEST FORM
   ============================================================ */
interface TestFormProps {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  durationSeconds: number;
  setDurationSeconds: (v: number) => void;
  passingScore: number;
  setPassingScore: (v: number) => void;
  randomQuestions: boolean;
  setRandomQuestions: (v: boolean) => void;
  randomAnswerOrder: boolean;
  setRandomAnswerOrder: (v: boolean) => void;
  questions: QuestionDraft[];
  selectedGroupIds: string[];
  toggleGroup: (id: string) => void;
  teacherGroups: TeacherGroup[] | undefined;
  groupsLoading: boolean;
  onAddQuestion: () => void;
  onDuplicateQuestion: (i: number) => void;
  openIndex: number | null;
  onSubmit: () => void;
  submitting: boolean;
  onRemoveQuestion: (i: number) => void;
  onQuestionChange: <K extends keyof QuestionDraft>(
    index: number,
    field: K,
    value: QuestionDraft[K],
  ) => void;
  onOptionChange: (qi: number, oi: number, val: string) => void;
  onAddOption: (qi: number) => void;
  onRemoveOption: (qi: number, oi: number) => void;
  onOpenAI: () => void;
  onCancel: () => void;
}

/* ============================================================
   COLLAPSIBLE SECTION
   ============================================================ */

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
}

function CollapsibleSection({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children,
  action,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-2xl bg-surface/40">
      <div className="flex items-center gap-2 px-3 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-0.5 text-left transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]"
          aria-expanded={open}
        >
          <span
            className={`
              flex h-7 w-7 shrink-0 items-center justify-center rounded-lg
              bg-white/5 text-ink-muted
              transition-transform duration-200
              ${open ? 'rotate-0' : '-rotate-90'}
            `}
            aria-hidden="true"
          >
            <span className="text-base leading-none">⌄</span>
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-sm font-bold text-ink">{title}</span>
              {badge && (
                <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold">
                  {badge}
                </span>
              )}
            </span>

            {subtitle && !open && (
              <span className="mt-0.5 block truncate text-[11px] text-ink-muted">
                {subtitle}
              </span>
            )}
          </span>
        </button>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div
        className={`
          grid transition-[grid-template-rows] duration-200 ease-out
          ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}
        `}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-4 pb-4 pt-1">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   TEST FORM
   ============================================================ */

function TestForm({
  title,
  setTitle,
  description,
  setDescription,
  durationSeconds,
  setDurationSeconds,
  passingScore,
  setPassingScore,
  randomQuestions,
  setRandomQuestions,
  randomAnswerOrder,
  setRandomAnswerOrder,
  questions,
  selectedGroupIds,
  toggleGroup,
  teacherGroups,
  groupsLoading,
  onAddQuestion,
  onDuplicateQuestion,
  openIndex,
  onSubmit,
  submitting,
  onRemoveQuestion,
  onQuestionChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onOpenAI,
  onCancel,
}: TestFormProps) {
  const totalPoints = questions.reduce((n, q) => n + (Number(q.points) || 0), 0);
  const incomplete = questions.filter((q) => !q.text.trim() || q.options.some((o) => !o.trim())).length;
  return (
    <div className="space-y-3 pb-24">
      {/* Form header */}
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface/40 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">Yangi test</p>
          <p className="text-[11px] text-ink-muted">
            Testni bo‘limlar orqali bosqichma-bosqich to‘ldiring
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-ink-muted transition hover:bg-white/5 hover:text-ink"
        >
          Bekor qilish
        </button>
      </div>

      {/* Basic information */}
      <CollapsibleSection
        title="Asosiy ma'lumotlar"
        subtitle={
          title.trim()
            ? `${title}${description.trim() ? ' · Tavsif mavjud' : ''}`
            : 'Test nomi va tavsifini kiriting'
        }
        defaultOpen
      >
        <div className="space-y-3">
          <Field label="Test nomi" required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Matematika 1-chorak"
              className={CONTROL.input}
            />
          </Field>

          <Field label="Tavsif">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Qisqacha ma'lumot..."
              className={CONTROL.textarea}
            />
          </Field>
        </div>
      </CollapsibleSection>

      {/* Groups */}
      <CollapsibleSection
        title="Guruhlar"
        badge={`${selectedGroupIds.length} tanlangan`}
        subtitle={
          selectedGroupIds.length
            ? `${selectedGroupIds.length} ta guruh testni ko‘radi`
            : 'Testni qaysi guruhlarga berishni tanlang'
        }
        defaultOpen
      >
        {groupsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !teacherGroups || teacherGroups.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-surface/30 py-6 text-center">
            <p className={TEXT.bodySm}>Guruhlar yo‘q</p>
          </div>
        ) : (
          <div className="space-y-2">
            {teacherGroups.map((g: TeacherGroup) => {
              const selected = selectedGroupIds.includes(g.id);

              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className={`
                    w-full rounded-xl border p-3 text-left transition
                    flex items-center gap-3 active:scale-[0.99]
                    ${
                      selected
                        ? 'border-gold/40 bg-gold/10'
                        : 'border-white/5 bg-surface/40 hover:bg-white/[0.05]'
                    }
                  `}
                >
                  <div
                    className={`
                      flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2
                      ${selected ? 'border-gold bg-gold' : 'border-white/20'}
                    `}
                  >
                    {selected && <Check className="h-3 w-3 text-base" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {g.name}
                    </p>

                    {g._count?.members !== undefined && (
                      <p className={TEXT.tiny}>{g._count.members} talaba</p>
                    )}
                  </div>

                  {selected && (
                    <span className="text-[10px] font-bold text-gold">
                      TANLANDI
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* Settings */}
      <CollapsibleSection
        title="Test sozlamalari"
        subtitle={`${Math.floor(durationSeconds / 60)} daqiqa · ${passingScore}% o'tish balli`}
        badge={
          randomQuestions || randomAnswerOrder
            ? 'Qorishtirish yoqilgan'
            : undefined
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Davomiyligi (daqiqa)">
              <input
                type="number"
                min="1"
                value={Math.round(durationSeconds / 60)}
                onChange={(e) => setDurationSeconds(Math.max(1, Number(e.target.value)) * 60)}
                className={CONTROL.input}
              />
            </Field>

            <Field label="O'tish balli (%)">
              <input
                type="number"
                min="0"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className={CONTROL.input}
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            {[10, 20, 30, 45, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDurationSeconds(m * 60)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
                  durationSeconds === m * 60
                    ? 'border-gold/40 bg-gold/15 text-gold'
                    : 'border-white/10 bg-white/5 text-ink-muted'
                }`}
              >
                {m} daqiqa
              </button>
            ))}
          </div>

          <div className="space-y-2">
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
        </div>
      </CollapsibleSection>

      {/* Questions */}
      <CollapsibleSection
        title="Savollar"
        badge={`${questions.length} ta`}
        subtitle={
          questions.length
            ? `${questions.length} ta savol tayyor`
            : 'Savollar qo‘shing'
        }
        defaultOpen
        action={
          <button
            type="button"
            onClick={onAddQuestion}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-gold hover:bg-gold/10"
          >
            <Plus className="h-3.5 w-3.5" />
            Qo‘shish
          </button>
        }
      >
        <div className="space-y-3">
          {/* AI */}
          <button
            type="button"
            onClick={onOpenAI}
            className="group w-full rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/10 via-gold/5 to-transparent p-4 text-left transition hover:border-gold/35 hover:bg-gold/10 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold transition group-hover:scale-105">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink">
                  AI bilan test yaratish
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-muted">
                  Mavzuni ayting — AI savollar va javob variantlarini tayyorlaydi
                </span>
              </span>
              <span className="text-lg text-gold transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </button>

          {questions.map((q, qi) => (
            <QuestionCard
              key={qi}
              index={qi}
              question={q}
              canRemove={questions.length > 1}
              defaultOpen={qi === 0 || qi === openIndex}
              onRemove={() => onRemoveQuestion(qi)}
              onDuplicate={() => onDuplicateQuestion(qi)}
              onChange={onQuestionChange}
              onOptionChange={onOptionChange}
              onAddOption={onAddOption}
              onRemoveOption={onRemoveOption}
            />
          ))}
        </div>
      </CollapsibleSection>

      {/* Saqlash paneli */}
      <div className="sticky bottom-3 z-20 flex items-center gap-3 rounded-2xl bg-base/95 ring-1 ring-white/10 p-3 backdrop-blur-md shadow-xl">
        <div className="min-w-0 flex-1 text-[11px] text-ink-muted leading-tight">
          <p>
            <span className="font-bold text-ink">{questions.length}</span> savol ·{' '}
            <span className="font-bold text-ink">{totalPoints}</span> ball
          </p>
          <p className={incomplete ? 'text-gold' : 'text-teal'}>
            {incomplete ? `${incomplete} ta savol to'ldirilmagan` : "Hammasi tayyor"}
          </p>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="rounded-xl bg-gold px-6 py-3 text-sm font-bold text-black active:scale-[0.98] transition disabled:opacity-50"
        >
          {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   QUESTION CARD
   ============================================================ */

interface QuestionCardProps {
  index: number;
  question: QuestionDraft;
  canRemove: boolean;
  defaultOpen?: boolean;
  onRemove: () => void;
  onDuplicate: () => void;
  onChange: <K extends keyof QuestionDraft>(
    index: number,
    field: K,
    value: QuestionDraft[K],
  ) => void;
  onOptionChange: (qi: number, oi: number, val: string) => void;
  onAddOption: (qi: number) => void;
  onRemoveOption: (qi: number, oi: number) => void;
}

function QuestionCard({
  index,
  question,
  canRemove,
  defaultOpen = false,
  onRemove,
  onDuplicate,
  onChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
}: QuestionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const filledOptions = question.options.filter((o) => o.trim()).length;
  const complete = !!question.text.trim() && question.options.every((o) => o.trim());
  const preview =
    question.text.trim() || `Savol ${index + 1} — hali to‘ldirilmagan`;

  return (
    <div className={`overflow-hidden rounded-2xl bg-surface/40 ${complete ? '' : 'ring-1 ring-gold/30'}`}>
      {/* Question header */}
      <div className="flex items-center gap-2 px-3 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <span
            className={`
              flex h-8 w-8 shrink-0 items-center justify-center rounded-xl
              text-xs font-black
              ${
                open
                  ? 'bg-gold text-black'
                  : 'border border-white/10 bg-white/[0.03] text-ink-muted'
              }
            `}
          >
            {index + 1}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">
              {preview}
            </span>

            {!open && (
              <span className="mt-0.5 block text-[10px] text-ink-muted">
                {question.difficulty === 'EASY'
                  ? 'Oson'
                  : question.difficulty === 'HARD'
                    ? 'Qiyin'
                    : "O'rta"}{' '}
                · {question.points} ball · {filledOptions} variant
                {!complete && <span className="text-gold"> · to'ldirilmagan</span>}
              </span>
            )}
          </span>

          <span
            className={`shrink-0 text-ink-muted transition-transform ${
              open ? 'rotate-0' : '-rotate-90'
            }`}
          >
            ⌄
          </span>
        </button>

        <button
          type="button"
          onClick={onDuplicate}
          className="shrink-0 rounded-xl px-2 py-2 text-[11px] font-semibold text-ink-muted transition hover:bg-white/5 hover:text-ink"
          aria-label="Savoldan nusxa olish"
        >
          Nusxa
        </button>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 rounded-xl p-2 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
            aria-label="Savolni o‘chirish"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Question body */}
      <div
        className={`
          grid transition-[grid-template-rows] duration-200 ease-out
          ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}
        `}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 px-4 pb-4 pt-1">
            <textarea
              value={question.text}
              onChange={(e) => onChange(index, 'text', e.target.value)}
              placeholder="Savol matni..."
              rows={3}
              className={CONTROL.textarea}
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Qiyinlik"
                value={question.difficulty}
                onChange={(e) =>
                  onChange(
                    index,
                    'difficulty',
                    e.target.value as Difficulty,
                  )
                }
                className={CONTROL.select}
              >
                <option value="EASY">Oson</option>
                <option value="MEDIUM">O'rta</option>
                <option value="HARD">Qiyin</option>
              </select>

              <input
                type="number"
                min="1"
                value={question.points}
                onChange={(e) =>
                  onChange(index, 'points', Number(e.target.value))
                }
                placeholder="Ball"
                aria-label="Ball"
                className={CONTROL.input}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className={TEXT.tiny}>
                  Variantlar
                </label>

                <span className="text-[10px] text-ink-muted">
                  Harfni bosing — to'g'ri javob belgilanadi
                </span>
              </div>

              {question.options.map((opt: string, oi: number) => (
                <div
                  key={oi}
                  className={`
                    flex items-center gap-2 rounded-xl border p-1.5
                    ${
                      question.correctAnswerIndex === oi
                        ? 'border-teal/40 bg-teal/5'
                        : 'border-white/5 bg-white/[0.02]'
                    }
                  `}
                >
                  <button
                    type="button"
                    onClick={() => onChange(index, 'correctAnswerIndex', oi)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition ${
                      question.correctAnswerIndex === oi ? 'bg-teal text-black' : 'bg-white/10 text-ink-muted'
                    }`}
                    aria-pressed={question.correctAnswerIndex === oi}
                    aria-label={`Variant ${oi + 1} to'g'ri javob`}
                  >
                    {question.correctAnswerIndex === oi ? '✓' : String.fromCharCode(65 + oi)}
                  </button>

                  <input
                    value={opt}
                    onChange={(e) =>
                      onOptionChange(index, oi, e.target.value)
                    }
                    placeholder={`Variant ${oi + 1}`}
                    className={CONTROL.input + ' flex-1 border-0 bg-transparent'}
                  />

                  {question.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => onRemoveOption(index, oi)}
                      className="shrink-0 rounded-lg bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/15"
                      aria-label={`Variant ${oi + 1} ni o‘chirish`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => onAddOption(index)}
                className="inline-flex items-center gap-1 rounded-lg px-1 py-1 text-xs font-semibold text-gold hover:bg-gold/10"
              >
                <Plus className="h-3 w-3" />
                Variant qo'shish
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminTests;
