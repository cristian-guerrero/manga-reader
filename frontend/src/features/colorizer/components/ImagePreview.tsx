import { useTranslation } from 'react-i18next';

interface ImagePreviewProps {
  originalPreview: string | null;
  colorizedPreview: string | null;
  children?: React.ReactNode;
}

export function ImagePreview({ originalPreview, colorizedPreview, children }: ImagePreviewProps) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center p-6 relative">
      {colorizedPreview ? (
        <img
          src={colorizedPreview}
          alt="Colorized manga"
          className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
        />
      ) : originalPreview ? (
        <img
          src={originalPreview}
          alt="Original manga"
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      ) : (
        <div className="text-center">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            style={{ color: 'var(--color-text-muted)', margin: '0 auto' }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="mt-4" style={{ color: 'var(--color-text-secondary)' }}>
            {t('colorizer.dragDrop')}
          </p>
        </div>
      )}

      {children}
    </div>
  );
}
