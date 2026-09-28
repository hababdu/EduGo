import { ReactNode } from 'react';
import { Search, X } from '../../design/icons';
import { CONTROL, ICON } from '../../design/tokens';

interface ChipOption {
  key: string;
  label: string;
  count?: number;
}

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  chips?: ChipOption[];
  activeChip?: string;
  onChipChange?: (key: string) => void;
  extra?: ReactNode;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Qidirish...',
  chips,
  activeChip,
  onChipChange,
  extra,
}: Props) {
  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search
          className={`${ICON.sm} absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none`}
        />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className={`${CONTROL.input} pl-10 pr-10`}
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1"
            aria-label="Tozalash"
          >
            <X className={ICON.sm} />
          </button>
        )}
      </div>

      {chips && chips.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onChipChange?.(c.key)}
              className={`${CONTROL.chip} ${
                activeChip === c.key ? CONTROL.chipActive : CONTROL.chipInactive
              }`}
            >
              {c.label}
              {c.count !== undefined && c.count > 0 && (
                <span className="ml-1 opacity-70">· {c.count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {extra}
    </div>
  );
}