import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTests, useCreateTest } from '../../../hooks/useTests';

export function TeacherAssignments() {
  const { data: tests, isLoading } = useTests();
  const createTest = useCreateTest();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(1800);
  const [passingScore, setPassingScore] = useState(50);
  
  const [questions, setQuestions] = useState([
    { text: '', difficulty: 'MEDIUM', points: 1, options: ['', ''], correctAnswerIndex: 0 }
  ]);

  const filteredTests = useMemo(() => {
    if (!tests) return [];
    return tests.filter((t: any) => t.title.toLowerCase().includes(search.toLowerCase()));
  }, [tests, search]);

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
      {
        title,
        description,
        durationSeconds: Number(durationSeconds),
        passingScore: Number(passingScore),
        questions,
      } as any,
      {
        onSuccess: () => {
          setShowForm(false);
          setTitle('');
          setDescription('');
          setQuestions([{ text: '', difficulty: 'MEDIUM', points: 1, options: ['', ''], correctAnswerIndex: 0 }]);
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Dars mavzulari va Topsiriqlar</h1>
          <p className="text-xs text-ink-muted mt-1">
            Guruhlaringiz uchun o'quv rejalari va topshiriqlarni boshqaring
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs bg-gold text-base rounded-xl px-4 py-2.5 font-semibold hover:opacity-90 transition-opacity"
        >
          {showForm ? 'Yopish' : '+ Yangi topshiriq qo\'shish'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface/30 p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Yangi topshiriq yoki mavzu yaratish</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-ink-muted hover:text-ink">
              Bekor qilish
            </button>
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Topshiriq yoki mavzu nomi *"
            required
            className="w-full bg-surface rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 text-ink"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mavzu tavsifi yoki ko'rsatmalar"
            rows={2}
            className="w-full bg-surface rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 text-ink resize-none"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink-muted block mb-1">Vaqt chegarasi (sekund)</label>
              <input
                type="number"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="w-full bg-surface rounded-xl px-3 py-2 text-xs outline-none border border-white/5 text-ink"
              />
            </div>
            <div>
              <label className="text-xs text-ink-muted block mb-1">O'tish balli</label>
              <input
                type="number"
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className="w-full bg-surface rounded-xl px-3 py-2 text-xs outline-none border border-white/5 text-ink"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Savollar va topshiriqlar ({questions.length})</h3>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="text-xs bg-gold/10 text-gold px-3 py-1.5 rounded-xl font-semibold hover:bg-gold/20 transition-colors"
              >
                + Savol qo'shish
              </button>
            </div>

            {questions.map((q, qIndex) => (
              <div key={qIndex} className="bg-surface/50 p-4 rounded-2xl border border-white/5 space-y-3">
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
                  placeholder="Savol matni..."
                  required
                  className="w-full bg-surface rounded-xl px-3 py-2 text-sm outline-none border border-white/5 text-ink"
                />

                <div className="space-y-2 pt-2">
                  <label className="text-xs text-ink-muted">Javob variantlari:</label>
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
            {createTest.isPending ? 'Saqlanmoqda...' : 'Topshiriqni saqlash'}
          </button>
        </form>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Topshiriq nomi bo'yicha qidirish..."
        className="w-full bg-surface rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 text-ink"
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-surface/50 rounded-xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredTests.length === 0 ? (
        <p className="text-sm text-ink-muted py-10 text-center">Hali topshiriqlar mavjud emas.</p>
      ) : (
        <div className="divide-y divide-white/5 bg-surface/20 rounded-2xl border border-white/5 px-4">
          {filteredTests.map((t: any) => (
            <div
              key={t.id}
              onClick={() => navigate(`/teacher/assignments/${t.id}`)}
              className="py-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-ink">{t.title}</p>
                <p className="text-xs text-ink-muted mt-1">{t._count?.questions ?? 0} ta savol</p>
              </div>
              <span className="text-xs text-gold font-semibold">Boshqarish →</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}