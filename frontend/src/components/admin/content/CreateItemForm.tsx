import { useState, useRef } from 'react';
import { useTelegram } from '../../../hooks/useTelegram';
import { toast } from '../../ui/Toast';

interface CreateItemFormProps {
  placeholder: string;
  isPending?: boolean;
  onSubmit: (title: string) => void;
  buttonLabel?: string;
  maxLength?: number;
}

export function CreateItemForm({
  placeholder,
  isPending,
  onSubmit,
  buttonLabel = "Qo'shish",
  maxLength = 120,
}: CreateItemFormProps) {
  const { haptic, hapticNotify } = useTelegram();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();

    if (!trimmed) {
      hapticNotify('error');
      toast('error', "Nomini kiriting!");
      inputRef.current?.focus();
      return;
    }

    if (trimmed.length > maxLength) {
      hapticNotify('error');
      toast('error', `Maksimal ${maxLength} ta belgi`);
      return;
    }

    haptic('light');
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-stretch">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={isPending}
        className="flex-1 bg-surface/40 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px] disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isPending || !value.trim()}
        className="shrink-0 text-xs font-semibold px-4 py-3 rounded-2xl bg-gold text-base active:scale-[0.97] transition-transform disabled:opacity-50 min-h-[44px]"
      >
        {isPending ? (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </span>
        ) : (
          buttonLabel
        )}
      </button>
    </form>
  );
}

export default CreateItemForm;