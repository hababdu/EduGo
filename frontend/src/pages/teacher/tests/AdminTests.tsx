// src/pages/admin/AdminTests.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Section,
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
   HOOKS — diagnostic bilan
   ============================================================ */
function useTests() {
  return useQuery({
    queryKey: ['tests'],
    queryFn: async () => {
      console.log('[useTests] Fetching /api/v1/tests ...');
      const result = await apiFetch<TestItem[]>('/api/v1/tests');
      console.log('[useTests] Result:', result);
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
  const { haptic, hapticNotify, showMainButton, hideMainButton } = useTelegram();

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

  // Diagnostika
  useEffect(() => {
    console.log('[AdminTests state]', {
      tests,
      testsLoading,
      testsFetching,
      testsError,
      groupsLoading,
      groupsError,
    });
  }, [tests, testsLoading, testsFetching, testsError, groupsLoading, groupsError]);

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
    setQuestions([{ ...EMPTY_QUESTION }]);
    setSelectedGroupIds([]);
  };

  const toggleGroup = (id: string) => {
    haptic('light');
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleAddQuestion = () => {
    haptic('light');
    setQuestions((prev) => [...prev, { ...EMPTY_QUESTION }]);
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

  const handleAIAccept = (generated: GeneratedQuestion[]) => {
    setQuestions((prev) => {
      const nonEmpty = prev.filter((q) => q.text.trim() !== '');
      return [...nonEmpty, ...generated];
    });
    hapticNotify('success');
    toast('success', `${generated.length} ta savol qo'shildi`);
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

  useEffect(() => {
    if (!showForm) {
      hideMainButton();
      return;
    }
    const cleanup = showMainButton(
      createTest.isPending ? 'Saqlanmoqda...' : 'SAQLASH',
      handleSubmit,
      { loading: createTest.isPending, disabled: createTest.isPending },
    );
    return () => {
      cleanup?.();
      hideMainButton();
    };
  }, [
    showForm,
    createTest.isPending,
    handleSubmit,
    showMainButton,
    hideMainButton,
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
          onRemoveQuestion={handleRemoveQuestion}
          onQuestionChange={handleQuestionChange}
          onOptionChange={handleOptionChange}
          onAddOption={handleAddOption}
          onRemoveOption={handleRemoveOption}
          onOpenAI={() => {
            haptic('light');
            setShowAIModal(true);
          }}
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
  onRemoveQuestion,
  onQuestionChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onOpenAI,
  onCancel,
}: TestFormProps) {
  return (
    <div className="bg-surface/30 border border-white/10 rounded-2xl p-5 space-y-5 backdrop-blur-xl">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <h2 className={TEXT.h2}>Yangi test</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-ink-muted hover:text-ink"
        >
          Bekor qilish
        </button>
      </div>

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
            placeholder="Qisqacha..."
            className={CONTROL.textarea}
          />
        </Field>
      </div>

      <Section
        title="Guruhlar"
        action={
          <span className={TEXT.tiny}>
            {selectedGroupIds.length} ta tanlangan
          </span>
        }
      >
        {groupsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !teacherGroups || teacherGroups.length === 0 ? (
          <div className="text-center py-6 bg-surface/30 rounded-xl border border-white/5">
            <p className={TEXT.bodySm}>Guruhlar yo'q</p>
          </div>
        ) : (
          <div className="space-y-2">
            {teacherGroups.map((g: TeacherGroup) => {
              const sel = selectedGroupIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 active:scale-[0.99] ${
                    sel
                      ? 'bg-gold/10 border-gold/40'
                      : 'bg-surface/40 border-white/5 hover:bg-white/[0.05]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                      sel ? 'bg-gold border-gold' : 'border-white/20'
                    }`}
                  >
                    {sel && <Check className="w-3 h-3 text-base" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {g.name}
                    </p>
                    {g._count?.members !== undefined && (
                      <p className={TEXT.tiny}>{g._count.members} talaba</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Sozlamalar">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Davomiyligi (sek)">
            <input
              type="number"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Number(e.target.value))}
              className={CONTROL.input}
            />
          </Field>
          <Field label="O'tish balli (%)">
            <input
              type="number"
              value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              className={CONTROL.input}
            />
          </Field>
        </div>
        <div className="space-y-2 mt-3">
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
      </Section>

      <button
        type="button"
        onClick={onOpenAI}
        className={CONTROL.buttonSubtle + ' w-full'}
      >
        <Sparkles className="w-4 h-4" />
        AI bilan savol yaratish
      </button>

      <Section
        title={`Savollar · ${questions.length}`}
        action={
          <button
            type="button"
            onClick={onAddQuestion}
            className="text-xs text-gold font-semibold inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Qo'shish
          </button>
        }
      >
        <div className="space-y-3">
          {questions.map((q, qi) => (
            <QuestionCard
              key={qi}
              index={qi}
              question={q}
              canRemove={questions.length > 1}
              onRemove={() => onRemoveQuestion(qi)}
              onChange={onQuestionChange}
              onOptionChange={onOptionChange}
              onAddOption={onAddOption}
              onRemoveOption={onRemoveOption}
            />
          ))}
        </div>
      </Section>
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
  onRemove: () => void;
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
  onRemove,
  onChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
}: QuestionCardProps) {
  return (
    <div className="bg-surface/40 border border-white/5 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className={TEXT.label}>Savol {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-400 hover:text-red-300 p-1"
            aria-label="O'chirish"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <textarea
        value={question.text}
        onChange={(e) => onChange(index, 'text', e.target.value)}
        placeholder="Savol matni..."
        rows={2}
        className={CONTROL.textarea}
      />

      <div className="grid grid-cols-2 gap-2">
        <select
          value={question.difficulty}
          onChange={(e) =>
            onChange(index, 'difficulty', e.target.value as Difficulty)
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
          onChange={(e) => onChange(index, 'points', Number(e.target.value))}
          placeholder="Ball"
          className={CONTROL.input}
        />
      </div>

      <div className="space-y-2">
        <label className={TEXT.tiny}>Variantlar (radio = to'g'ri javob)</label>
        {question.options.map((opt: string, oi: number) => (
          <div key={oi} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${index}`}
              checked={question.correctAnswerIndex === oi}
              onChange={() => onChange(index, 'correctAnswerIndex', oi)}
              className="cursor-pointer accent-gold shrink-0 w-4 h-4"
            />
            <input
              value={opt}
              onChange={(e) => onOptionChange(index, oi, e.target.value)}
              placeholder={`Variant ${oi + 1}`}
              className={CONTROL.input + ' flex-1'}
            />
            {question.options.length > 2 && (
              <button
                type="button"
                onClick={() => onRemoveOption(index, oi)}
                className="text-red-400 p-1.5 rounded-lg bg-red-500/10 shrink-0"
                aria-label="O'chirish"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => onAddOption(index)}
          className="text-xs text-gold font-semibold inline-flex items-center gap-1 mt-1"
        >
          <Plus className="w-3 h-3" /> Variant
        </button>
      </div>
    </div>
  );
}

export default AdminTests;