import { useTranslation } from 'react-i18next';
import type { ImageFile } from '../hooks/useColorizerImages';

interface ImageListProps {
  images: ImageFile[];
  currentImage: string | null;
  isLoading: boolean;
  onSelectImage: (path: string) => void;
  onSelectFolder: () => void;
  onClear: () => void;
}

export function ImageList({
  images,
  currentImage,
  isLoading,
  onSelectImage,
  onSelectFolder,
  onClear,
}: ImageListProps) {
  const { t } = useTranslation();

  return (
    <div
      className="w-64 border-r flex flex-col min-h-0"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div
        className="p-4 border-b space-y-2"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          onClick={onSelectFolder}
          className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--color-surface-tertiary)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('colorizer.selectFolder')}
        </button>
        {images.length > 0 && (
          <button
            onClick={onClear}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: 'var(--color-danger)', color: 'white' }}
          >
            {t('colorizer.clear')}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Loading images...
            </div>
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {t('colorizer.dragDrop')}
            </p>
          </div>
        ) : (
          images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => onSelectImage(img.path)}
              className={`w-full px-3 py-2 rounded-lg text-sm text-left truncate transition-all ${
                currentImage === img.path
                  ? 'bg-accent/20 border-accent'
                  : 'hover:bg-surface-hover'
              }`}
              style={{
                backgroundColor:
                  currentImage === img.path ? 'var(--color-accent)' : 'rgba(0,0,0,0)',
                color:
                  currentImage === img.path ? 'white' : 'var(--color-text-primary)',
                border:
                  currentImage === img.path
                    ? '1px solid var(--color-accent)'
                    : '1px solid transparent',
              }}
            >
              {img.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
