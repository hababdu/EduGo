import { useState } from 'react';

interface CreateItemFormProps {
  placeholder: string;
  onSubmit: (title: string) => void;
  isPending?: boolean;
}

export function CreateItemForm({ placeholder, onSubmit, isPending }: CreateItemFormProps) {
  const [title, setTitle] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim());
    setTitle('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-surface rounded-lg px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold"
      />
      <button
        type="submit"
        disabled={isPending || !title.trim()}
        className="rounded-lg bg-gold text-base font-semibold px-4 py-2.5 text-sm disabled:opacity-40"
      >
        Qo'shish
      </button>
    </form>
  );
}
