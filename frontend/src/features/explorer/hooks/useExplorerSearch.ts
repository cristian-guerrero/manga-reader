/**
 * useExplorerSearch - Hook to handle search and filtering
 * Extracted from ExplorerPage to improve separation of concerns
 */

import { useState, useMemo } from 'react';
import { BaseFolder, ExplorerEntry } from '../types';
import type { SortBy } from './useExplorerSorting';

interface UseExplorerSearchOptions {
  baseFolders: BaseFolder[];
  entries: ExplorerEntry[];
  sortBy: SortBy;
  sortOrder: 'asc' | 'desc';
  pinnedFolders?: string[];
  pinnedImages?: string[];
}

export function useExplorerSearch({
  baseFolders,
  entries,
  sortBy,
  sortOrder,
  pinnedFolders = [],
  pinnedImages = [],
}: UseExplorerSearchOptions) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter function for search
  const matchesSearch = (item: BaseFolder | ExplorerEntry, query: string): boolean => {
    if (!query.trim()) return true;
    const searchTerm = query.toLowerCase();
    return item.name.toLowerCase().includes(searchTerm) ||
      ('path' in item && item.path.toLowerCase().includes(searchTerm));
  };

  // Sort and filter base folders
  const sortedBaseFolders = useMemo(() => {
    return [...baseFolders]
      .filter(folder => matchesSearch(folder, searchQuery))
      .sort((a, b) => {
        let res = 0;
        if (sortBy === 'name') {
          res = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        } else {
          // Date sort - use addedAt for base folders
          const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
          const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
          res = dateA - dateB;
        }
        return sortOrder === 'asc' ? res : -res;
      });
  }, [baseFolders, searchQuery, sortBy, sortOrder]);

  // Sort and filter entries (directory view)
  const sortedEntries = useMemo(() => {
    const filtered = [...entries]
      .filter(entry => matchesSearch(entry, searchQuery));

    const pinnedFolderSet = new Set(pinnedFolders);
    const pinnedImageSet = new Set(pinnedImages);

    const dirs = filtered.filter(e => e.isDirectory);
    const images = filtered.filter(e => !e.isDirectory);

    // Sort pinned folders
    const pinnedDirs = dirs.filter(e => pinnedFolderSet.has(e.name));
    const unpinnedDirs = dirs.filter(e => !pinnedFolderSet.has(e.name));
    const pinnedFolderOrder = pinnedFolders.filter(name => pinnedDirs.some(e => e.name === name));
    pinnedDirs.sort((a, b) => {
      const idxA = pinnedFolderOrder.indexOf(a.name);
      const idxB = pinnedFolderOrder.indexOf(b.name);
      return idxA - idxB;
    });

    // Sort pinned images
    const pinnedImgs = images.filter(e => pinnedImageSet.has(e.name));
    const unpinnedImgs = images.filter(e => !pinnedImageSet.has(e.name));
    const pinnedImageOrder = pinnedImages.filter(name => pinnedImgs.some(e => e.name === name));
    pinnedImgs.sort((a, b) => {
      const idxA = pinnedImageOrder.indexOf(a.name);
      const idxB = pinnedImageOrder.indexOf(b.name);
      return idxA - idxB;
    });

    // Sort unpinned dirs
    if (sortBy !== 'custom' && sortBy !== 'auto') {
      unpinnedDirs.sort((a, b) => {
        let res = 0;
        if (sortBy === 'name') {
          res = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        } else {
          const dateA = a.lastModified || 0;
          const dateB = b.lastModified || 0;
          res = dateA - dateB;
        }
        return sortOrder === 'asc' ? res : -res;
      });
    }

    // Sort unpinned images
    if (sortBy !== 'custom' && sortBy !== 'auto') {
      unpinnedImgs.sort((a, b) => {
        let res = 0;
        if (sortBy === 'name') {
          res = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        } else {
          const dateA = a.lastModified || 0;
          const dateB = b.lastModified || 0;
          res = dateA - dateB;
        }
        return sortOrder === 'asc' ? res : -res;
      });
    }

    return [...pinnedDirs, ...unpinnedDirs, ...pinnedImgs, ...unpinnedImgs];
  }, [entries, searchQuery, sortBy, sortOrder, pinnedFolders, pinnedImages]);

  return {
    searchQuery,
    setSearchQuery,
    sortedBaseFolders,
    sortedEntries,
  };
}
