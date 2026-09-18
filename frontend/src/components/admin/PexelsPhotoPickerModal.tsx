// src/components/admin/PexelsPhotoPickerModal.tsx
import { useState } from 'react';
import { usePexelsSearch, PexelsPhoto } from '../../hooks/usePexelsSearch';
import { useTelegram } from '../../hooks/useTelegram';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export function PexelsPhotoPickerModal({ isOpen, onClose, onSelect }: Props) {
  const { haptic, hapticNotify } = useTelegram();

  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = usePexelsSearch(searchQuery, isOpen);

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) {
      hapticNotify('error');
      return;
    }
    haptic('light');
    setSearchQuery(inputValue.trim());
  };

  const handleSelect = (photo: PexelsPhoto) => {
    haptic('medium');
    // `large` — 940px baland (yaxshi sifat + tez yuklash)
    onSelect(photo.src.large);
    setInputValue('');
    setSearchQuery('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-white/10 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-ink truncate">
              📷 Rasm qidirish
            </h3>
            <p className="text-[10px] text-ink-muted">
              Pexels'dan bepul rasmlar
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              haptic('light');
              onClose();
            }}
            className="text-ink-muted hover:text-ink text-sm p-2 rounded-xl bg-white/5 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Search form */}
        <form
          onSubmit={handleSearch}
          className="p-4 border-b border-white/5 flex gap-2"
        >
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="coding, mathematics, sport..."
            autoFocus
            className="flex-1 bg-surface/50 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="bg-gold text-base text-sm font-semibold px-5 py-3 rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[44px] shrink-0"
          >
            🔍 Qidirish
          </button>
        </form>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!searchQuery ? (
            <div className="text-center py-16 space-y-3">
              <div className="text-5xl">🔍</div>
              <p className="text-sm font-medium text-ink">
                Rasm qidirish
              </p>
              <p className="text-xs text-ink-muted max-w-xs mx-auto">
                Yuqoridagi maydonga kalit so'z kiriting va rasmlarni tanlang
              </p>
              <div className="flex flex-wrap gap-2 justify-center pt-4">
                {['coding', 'mathematics', 'science', 'books', 'music'].map(
                  (tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        haptic('light');
                        setInputValue(tag);
                        setSearchQuery(tag);
                      }}
                      className="text-xs bg-white/5 hover:bg-white/10 text-ink-muted px-3 py-1.5 rounded-full transition-colors"
                    >
                      {tag}
                    </button>
                  ),
                )}
              </div>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-surface/50 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16 space-y-3">
              <div className="text-4xl">❌</div>
              <p className="text-sm font-medium text-ink">
                Xatolik yuz berdi
              </p>
              <p className="text-xs text-ink-muted">
                {(error as any)?.response?.data?.message ||
                  (error as any)?.message ||
                  "Server bilan aloqa yo'q"}
              </p>
            </div>
          ) : !data?.photos || data.photos.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="text-4xl">🤷</div>
              <p className="text-sm font-medium text-ink">Rasm topilmadi</p>
              <p className="text-xs text-ink-muted">
                Boshqa kalit so'z bilan urinib ko'ring
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-ink-muted mb-3">
                {data.total_results.toLocaleString()} ta natija
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {data.photos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => handleSelect(photo)}
                    className="group relative aspect-square bg-surface/50 rounded-2xl overflow-hidden border border-white/5 active:scale-[0.97] transition-transform"
                  >
                    <img
                      src={photo.src.medium}
                      alt={photo.alt || 'Photo'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <p className="text-[10px] text-white truncate w-full">
                        {photo.photographer}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 text-center">
          <p className="text-[10px] text-ink-muted">
            Rasmlar{' '}
            <a
              href="https://www.pexels.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              Pexels
            </a>
            'dan olingan · Bepul foydalanish
          </p>
        </div>
      </div>
    </div>
  );
}