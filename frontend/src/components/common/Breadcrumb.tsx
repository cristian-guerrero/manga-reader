import { useTranslation } from 'react-i18next';

interface BaseFolder {
    path: string;
    name: string;
    addedAt: string;
    isVisible: boolean;
    hasImages?: boolean;
    thumbnailUrl?: string;
}

interface BreadcrumbSegment {
    name: string;
    path: string | null;
}

interface BreadcrumbProps {
    currentPath: string | null;
    baseFolders: BaseFolder[];
    onNavigate: (path: string | null) => void;
    rootLabel?: string;
}

// Build breadcrumb segments from current path
const buildBreadcrumbSegments = (
    path: string | null,
    baseFolders: BaseFolder[],
    rootLabel: string
): BreadcrumbSegment[] => {
    if (!path) {
        return [{ name: rootLabel, path: null }];
    }

    const segments: BreadcrumbSegment[] = [
        { name: rootLabel, path: null }
    ];

    // Find the base folder that contains this path
    const baseFolder = baseFolders.find(bf => {
        const bfPath = bf.path.replace(/[\\/]$/, ''); // Remove trailing separator
        const normalizedBfPath = bfPath.replace(/\\/g, '/');
        const normalizedPath = path.replace(/\\/g, '/');
        return normalizedPath.startsWith(normalizedBfPath + '/') || normalizedPath === normalizedBfPath;
    });

    if (baseFolder) {
        // Add base folder to breadcrumb
        const basePath = baseFolder.path.replace(/[\\/]$/, '');
        segments.push({ name: baseFolder.name, path: basePath });

        // Get the relative path from base folder
        const basePathNormalized = basePath.replace(/\\/g, '/');
        const pathNormalized = path.replace(/\\/g, '/');
        const relativePath = pathNormalized.substring(basePathNormalized.length + 1);

        if (relativePath) {
            // Split relative path into parts
            const parts = relativePath.split('/').filter(part => part.length > 0);
            const pathSeparator = path.includes('\\') ? '\\' : '/';

            // Build intermediate paths
            let currentPathSegments = [basePath];
            for (let i = 0; i < parts.length; i++) {
                currentPathSegments.push(parts[i]);
                const segmentPath = currentPathSegments.join(pathSeparator);
                segments.push({
                    name: parts[i],
                    path: segmentPath
                });
            }
        }
    } else {
        // No base folder found, use path as-is
        const normalizedPath = path.replace(/\\/g, '/');
        const parts = normalizedPath.split('/').filter(part => part.length > 0);
        const pathSeparator = path.includes('\\') ? '\\' : '/';

        let currentPathSegments: string[] = [];
        for (let i = 0; i < parts.length; i++) {
            currentPathSegments.push(parts[i]);
            const segmentPath = currentPathSegments.join(pathSeparator);
            segments.push({
                name: parts[i],
                path: segmentPath
            });
        }
    }

    return segments;
};

export function Breadcrumb({ currentPath, baseFolders, onNavigate, rootLabel }: BreadcrumbProps) {
    const { t } = useTranslation();
    const label = rootLabel || t('explorer.title') || 'Explorer';
    const breadcrumbSegments = buildBreadcrumbSegments(currentPath, baseFolders, label);

    return (
        <nav className="flex items-center gap-2 min-w-0 flex-1" aria-label="Breadcrumb">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {breadcrumbSegments.map((segment, index) => {
                    const isLast = index === breadcrumbSegments.length - 1;
                    // Make clickable if: not the last segment AND (going to root OR path is different from current)
                    const isClickable = !isLast && (
                        (segment.path === null && currentPath !== null) || 
                        (segment.path !== null && segment.path !== currentPath)
                    );
                    
                    return (
                        <div key={index} className="flex items-center gap-2 flex-shrink-0">
                            {index > 0 && (
                                <svg 
                                    width="16" 
                                    height="16" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2"
                                    className="text-text-secondary/50 flex-shrink-0"
                                >
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            )}
                            {isClickable ? (
                                <button
                                    onClick={() => onNavigate(segment.path)}
                                    className="text-text-primary hover:text-accent transition-colors truncate max-w-[200px] px-2 py-1 rounded hover:bg-white/5 text-sm"
                                    title={segment.path || segment.name}
                                >
                                    {segment.name}
                                </button>
                            ) : (
                                <span 
                                    className={`${isLast ? 'text-text-primary font-semibold text-base' : 'text-text-secondary text-sm'} truncate max-w-[200px]`}
                                    title={segment.path || segment.name}
                                >
                                    {segment.name}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </nav>
    );
}
