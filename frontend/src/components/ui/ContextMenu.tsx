import { useEffect, useRef, useCallback } from 'react';
import type { ContextMenuItem } from '@types';

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClickOutside, handleKeyDown]);

  const adjustedPos = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - items.length * 40 - 16),
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[180px] py-1 rounded-xl shadow-2xl border backdrop-blur-md animate-scale-in"
      style={{
        left: adjustedPos.x,
        top: adjustedPos.y,
        backgroundColor: 'var(--color-surface-elevated)',
        borderColor: 'var(--color-border)',
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            color: item.danger ? '#ef4444' : 'var(--color-text-primary)',
          }}
          onMouseEnter={(e) => {
            if (!item.disabled) {
              e.currentTarget.style.backgroundColor = 'var(--color-accent)';
              e.currentTarget.style.color = item.danger ? '#fff' : '#fff';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = item.danger ? '#ef4444' : 'var(--color-text-primary)';
          }}
          disabled={item.disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }}
        >
          {item.icon && (
            <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 opacity-70">
              {item.icon}
            </span>
          )}
          <span className="flex-1">{item.label}</span>
          {item.shortcut && (
            <span
              className="text-xs opacity-50 ml-4"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {item.shortcut}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
