/**
 * Shared Components - Re-export all shared/common components
 * 
 * Components are organized as follows:
 * - @components/ui: Base reusable UI components (Button, Toggle, Tooltip, etc.)
 * - @components/common: Domain-specific components (LibraryCard, MediaTile, etc.)
 * 
 * For new code, prefer importing directly from @components/ui or @components/common
 */

// Base UI components (from ui/)
export { Button, type ButtonProps } from '../../components/ui/Button';
export { Toggle } from '../../components/ui/Toggle';
export { Tooltip } from '../../components/ui/Tooltip';
export { ContextMenu } from '../../components/ui/ContextMenu';
export { LoadingSpinner } from '../../components/ui/LoadingSpinner';
export { EmptyState } from '../../components/ui/EmptyState';
export { ErrorDisplay } from '../../components/ui/ErrorDisplay';

// Domain-specific components (from common/)
export { Breadcrumb } from '../../components/common/Breadcrumb';
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
