import { useState } from 'react';
import { gradeAnswer, AIServiceError, type GradingResult } from '../../lib/ai-service';

/* ============================================================
   AI ANSWER CHECK — matnli javobni AI bilan oldindan tekshirish
   MUHIM: bu faqat o'quvchi uchun formativ (yordamchi) tekshiruv —
   rasmiy ball baribir serverda (o'qituvchi/backend) hisoblanadi.
   ============================================================ */

interface AIAnswerCheckProps {
  question: string;
  answer: string;
  referenceAnswer?: string;
}

export function AIAnswerCheck({
  question,
  answer,
  referenceAnswer,
}: AIAnswerCheckProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [grading, setGrading] = useState<GradingResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!answer.trim()) return;
    setIsChecking(true);
    setErrorMsg(null);
    try {
      const result = await gradeAnswer({
        question,
        studentAnswer: answer.trim(),
        referenceAnswer,
      });
      setGrading(result);
    } catch (err: any) {
      setErrorMsg(
        err instanceof AIServiceError
          ? err.message
          : "Tekshirishda xatolik yuz berdi",
      );
    } finally {
      setIsChecking(false);
    }
  };

  const scoreColor =
    grading == null
      ? ''
      : grading.score >= 70
        ? 'text-teal'
        : grading.score >= 40
          ? 'text-gold'
          : 'text-red-400';

  return (
    <div className="space-y-2.5">
      {!grading && (
        <button
          type="button"
          onClick={handleCheck}
          disabled={isChecking || !answer.trim()}
          className="text-xs font-semibold text-gold bg-gold/10 border border-gold/20 rounded-xl px-3.5 py-2.5 active:scale-[0.97] transition-transform disabled:opacity-40 flex items-center gap-2"
        >
          {isChecking ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              Tekshirilmoqda...
            </>
          ) : (
            "🤖 AI bilan tekshirtirish"
          )}
        </button>
      )}

      {errorMsg && (
        <p className="text-xs text-red-400">{errorMsg}</p>
      )}

      {grading && (
        <div className="bg-surface/50 border border-white/5 rounded-2xl p-4 space-y-3 animate-[checkFadeIn_0.25s_ease-out]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide">
              AI taxminiy bahosi
            </span>
            <span className={`text-lg font-display tabular-nums ${scoreColor}`}>
              {grading.score}%
            </span>
          </div>

          <p className="text-sm text-ink leading-relaxed">{grading.feedback}</p>

          {grading.strengths.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-teal">
                ✓ Yaxshi tomonlari
              </p>
              <ul className="space-y-0.5">
                {grading.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-ink-muted pl-3.5 relative">
                    <span className="absolute left-0">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {grading.improvements.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-gold">
                ↗ Yaxshilash mumkin
              </p>
              <ul className="space-y-0.5">
                {grading.improvements.map((s, i) => (
                  <li key={i} className="text-xs text-ink-muted pl-3.5 relative">
                    <span className="absolute left-0">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => setGrading(null)}
            className="text-[11px] text-ink-muted underline"
          >
            Yopish
          </button>
        </div>
      )}

      <style>{`
        @keyframes checkFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default AIAnswerCheck;