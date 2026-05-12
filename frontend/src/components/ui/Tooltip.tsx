import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string;
  children: ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({
  content,
  children,
  placement = "bottom",
  className = "",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: -9999, left: -9999 });
  const [isReady, setIsReady] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<number>();
  const hideTimeoutRef = useRef<number>();

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 8;

    let top = 0;
    let left = 0;

    switch (placement) {
      case "top":
        top = triggerRect.top - tooltipRect.height - gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case "bottom":
        top = triggerRect.bottom + gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case "left":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - gap;
        break;
      case "right":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + gap;
        break;
    }

    // Keep tooltip within viewport bounds
    const padding = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < padding) left = padding;
    if (left + tooltipRect.width > viewportWidth - padding) {
      left = Math.max(padding, viewportWidth - tooltipRect.width - padding);
    }
    if (top < padding) top = padding;
    if (top + tooltipRect.height > viewportHeight - padding) {
      top = Math.max(padding, viewportHeight - tooltipRect.height - padding);
    }

    setPosition({ top, left });
    setIsReady(true);
  }, [placement]);

  // Update position when tooltip becomes visible (after render)
  useEffect(() => {
    if (isVisible) {
      const rafId = requestAnimationFrame(() => {
        updatePosition();
      });

      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isVisible, updatePosition]);

  const handleMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = undefined;
    }
    setIsReady(false);
    showTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, 100); // Small delay to prevent flicker
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = undefined;
    }
    hideTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
      setIsReady(false);
    }, 50);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  if (!content) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        ref={triggerRef}
        className={`flex items-center justify-center ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none"
            style={{
              top: position.top,
              left: position.left,
              backgroundColor: "var(--color-surface-elevated)",
              color: "var(--color-text-primary)",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid var(--color-border)",
              zIndex: 99999,
              opacity: isReady ? 1 : 0,
              transition: "opacity 0.15s ease",
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}

export default Tooltip;
