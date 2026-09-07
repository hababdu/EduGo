import { useNavigate } from 'react-router-dom';
import { useDailyChallenge } from '../../hooks/useDailyChallenge';
import { haptic } from '../../lib/telegram';

/**
 * 40-band — Daily Challenge. Faqat bugungi challenge mavjud bo'lsa ko'rsatiladi.
 * Tugatilgan bo'lsa, "bajarildi" holatida (bosib bo'lmaydi).
 */
export function DailyChallengeCard() {
  const { data: challenge, isLoading } = useDailyChallenge();
  const navigate = useNavigate();

  if (isLoading || !challenge) return null;

  return (
    <section className="px-5">
      <button
        disabled={challenge.completed}
        onClick={() => {
          haptic('medium');
          if (challenge.test) navigate(`/tests/${challenge.test.id}`);
        }}
        className={`w-full text-left rounded-2xl p-5 relative overflow-hidden ${
          challenge.completed ? 'bg-surface opacity-60' : 'active:scale-[0.98] transition-transform'
        }`}
        style={
          challenge.completed
            ? undefined
            : { background: 'linear-gradient(135deg, #4A3A1A 0%, #1B1E3A 100%)' }
        }
      >
        <p className="text-xs text-gold mb-1">🔥 BUGUNGI CHALLENGE</p>
        <p className="font-display text-xl mb-2">{challenge.title}</p>
        {challenge.completed ? (
          <p className="text-sm text-teal">✅ Bajarildi</p>
        ) : (
          <p className="text-sm text-ink-muted">
            +{challenge.rewardScore} ball, +{challenge.rewardXp} XP
          </p>
        )}
      </button>
    </section>
  );
}
