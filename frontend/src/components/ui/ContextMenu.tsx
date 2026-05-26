import { useEffect, useRef, useCallback, useState } from 'react';
import type { ContextMenuItem } from '@types';

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

function MenuItem({
  item,
  onClose,
  depth = 0,
}: {
  item: ContextMenuItem;
  onClose: () => void;
  depth?: number;
}) {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const submenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (item.children && item.children.length > 0) {
      if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current);
      setSubmenuOpen(true);
    }
  }, [item.children]);

  const handleMouseLeave = useCallback(() => {
    if (item.children && item.children.length > 0) {
      submenuTimerRef.current = setTimeout(() => {
        setSubmenuOpen(false);
      }, 150);
    }
  }, [item.children]);

  useEffect(() => {
    return () => {
      if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current);
    };
  }, []);

  if (item.type === 'separator') {
    return (
      <div
        className="my-1 mx-2"
        style={{ height: '1px', backgroundColor: 'var(--color-border)' }}
      />
    );
  }

  const hasSubmenu = item.children && item.children.length > 0;

  return (
    <div
      ref={itemRef}
      className="relative"
      onMouseEnter={() => {
        handleMouseEnter();
        if (!item.disabled && !hasSubmenu) {
          const el = itemRef.current?.querySelector('button');
          if (el) {
            el.style.backgroundColor = 'var(--color-accent)';
            el.style.color = item.danger ? '#fff' : '#fff';
          }
        }
      }}
      onMouseLeave={() => {
        handleMouseLeave();
        const el = itemRef.current?.querySelector('button');
        if (el) {
          el.style.backgroundColor = 'transparent';
          el.style.color = item.danger ? '#ef4444' : 'var(--color-text-primary)';
        }
      }}
    >
      <button
        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          color: item.danger ? '#ef4444' : 'var(--color-text-primary)',
        }}
        onMouseEnter={(e) => {
          if (!item.disabled && !hasSubmenu) {
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
          if (!item.disabled && item.onClick) {
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
        {hasSubmenu && (
          <span className="text-xs opacity-50 ml-2">▸</span>
        )}
        {item.shortcut && (
          <span
            className="text-xs opacity-50 ml-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {item.shortcut}
          </span>
        )}
      </button>

      {hasSubmenu && submenuOpen && (
        <div
          className="fixed z-[10000] min-w-[160px] py-1 rounded-xl shadow-2xl border backdrop-blur-md animate-scale-in"
          style={{
            left: Math.min(
              (itemRef.current?.getBoundingClientRect().right || 0) + 4,
              window.innerWidth - 180,
            ),
            top: Math.min(
              (itemRef.current?.getBoundingClientRect().top || 0),
              window.innerHeight - (item.children?.length || 0) * 36 - 16,
            ),
            backgroundColor: 'var(--color-surface-elevated)',
            borderColor: 'var(--color-border)',
          }}
          onMouseEnter={() => {
            if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current);
            setSubmenuOpen(true);
          }}
          onMouseLeave={() => {
            submenuTimerRef.current = setTimeout(() => {
              setSubmenuOpen(false);
            }, 100);
          }}
        >
          {item.children!.map((child) => (
            <MenuItem key={child.id} item={child} onClose={onClose} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
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
        <MenuItem key={item.id} item={item} onClose={onClose} />
      ))}
    </div>
  );
}
