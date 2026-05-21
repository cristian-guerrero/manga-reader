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
}

export function useExplorerSearch({
  baseFolders,
  entries,
  sortBy,
  sortOrder,
  pinnedFolders = [],
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

    const pinnedSet = new Set(pinnedFolders);

    const pinned = filtered.filter(e => e.isDirectory && pinnedSet.has(e.name));
    const rest = filtered.filter(e => !e.isDirectory || !pinnedSet.has(e.name));

    const pinnedOrder = pinnedFolders.filter(name => pinned.some(e => e.name === name));
    pinned.sort((a, b) => {
      const idxA = pinnedOrder.indexOf(a.name);
      const idxB = pinnedOrder.indexOf(b.name);
      return idxA - idxB;
    });

    if (sortBy === 'custom' || sortBy === 'auto') {
      return [...pinned, ...rest];
    }

    rest.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
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

    return [...pinned, ...rest];
  }, [entries, searchQuery, sortBy, sortOrder, pinnedFolders]);

  return {
    searchQuery,
    setSearchQuery,
    sortedBaseFolders,
    sortedEntries,
  };
}
