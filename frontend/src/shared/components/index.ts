/**
 * Shared Components - Re-export all shared/common components
 * 
 * Note: Components from common/ are re-exports from ui/ for backward compatibility.
 * For new code, prefer importing directly from @components/ui
 */

// Common components (re-exports from ui/)
export { Breadcrumb } from '../../components/common/Breadcrumb';
export { Button, type ButtonProps } from '../../components/common/Button';
export { ConfirmDialog } from '../../components/common/ConfirmDialog';
export { ErrorBoundary } from '../../components/common/ErrorBoundary';
export { GridContainer } from '../../components/common/GridContainer';
export { GridItem } from '../../components/common/GridItem';
export { HelpDialog } from '../../components/common/HelpDialog';
export { LibraryCard } from '../../components/common/LibraryCard';
export { MediaTile } from '../../components/common/MediaTile';
export { SearchBar } from '../../components/common/SearchBar';
export { SectionHeader } from '../../components/common/SectionHeader';
export { SortControls } from '../../components/common/SortControls';
export { useToast, type ToastType } from '../../components/common/Toast';
export { default as ToastProvider } from '../../components/common/Toast';
export { Toggle } from '../../components/common/Toggle';
export { Tooltip } from '../../components/common/Tooltip';

// UI-only components (not in common/)
export { LoadingSpinner } from '../../components/ui/LoadingSpinner';
export { EmptyState } from '../../components/ui/EmptyState';
export { ErrorDisplay } from '../../components/ui/ErrorDisplay';
