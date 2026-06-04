import { useState, useMemo, useEffect, useRef } from 'react';
import { BaseFolder, ExplorerEntry } from '../types';
import type { SortBy } from './useExplorerSorting';
import { ExplorerAPI } from '@services/api/explorerAPI';

interface UseExplorerSearchOptions {
  baseFolders: BaseFolder[];
  entries: ExplorerEntry[];
  sortBy: SortBy;
  sortOrder: 'asc' | 'desc';
  pinnedFolders?: string[];
  pinnedImages?: string[];
  currentPath?: string | null;
}

export function useExplorerSearch({
  baseFolders,
  entries,
  sortBy,
  sortOrder,
  pinnedFolders = [],
  pinnedImages = [],
  currentPath,
}: UseExplorerSearchOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExplorerEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const roots: string[] = currentPath
      ? [currentPath]
      : baseFolders.map(f => f.path);

    if (roots.length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();

    Promise.all(
      roots.map(root => ExplorerAPI.searchExplorer(root, query))
    ).then(results => {
      if (controller.signal.aborted) return;
      const flat = results.flat();
      setSearchResults(flat);
    }).catch(err => {
      if (controller.signal.aborted) return;
      console.error('[useExplorerSearch] Search failed:', err);
      setSearchResults([]);
    }).finally(() => {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    });

    return () => controller.abort();
  }, [searchQuery, currentPath, baseFolders]);

  const matchesSearch = (item: BaseFolder | ExplorerEntry, query: string): boolean => {
    if (!query.trim()) return true;
    const searchTerm = query.toLowerCase();
    return item.name.toLowerCase().includes(searchTerm) ||
      ('path' in item && item.path.toLowerCase().includes(searchTerm));
  };

  const sortedBaseFolders = useMemo(() => {
    if (searchQuery.trim()) return [];
    return [...baseFolders]
      .filter(folder => matchesSearch(folder, searchQuery))
      .sort((a, b) => {
        let res = 0;
        if (sortBy === 'name') {
          res = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        } else {
          const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
          const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
          res = dateA - dateB;
        }
        return sortOrder === 'asc' ? res : -res;
      });
  }, [baseFolders, searchQuery, sortBy, sortOrder]);

  const sortedEntries = useMemo(() => {
    if (searchQuery.trim()) return [];
    const filtered = [...entries]
      .filter(entry => matchesSearch(entry, searchQuery));

    const pinnedFolderSet = new Set(pinnedFolders);
    const pinnedImageSet = new Set(pinnedImages);

    const dirs = filtered.filter(e => e.isDirectory);
    const images = filtered.filter(e => !e.isDirectory);

    const pinnedDirs = dirs.filter(e => pinnedFolderSet.has(e.name));
    const unpinnedDirs = dirs.filter(e => !pinnedFolderSet.has(e.name));
    const pinnedFolderOrder = pinnedFolders.filter(name => pinnedDirs.some(e => e.name === name));
    pinnedDirs.sort((a, b) => {
      const idxA = pinnedFolderOrder.indexOf(a.name);
      const idxB = pinnedFolderOrder.indexOf(b.name);
      return idxA - idxB;
    });

    const pinnedImgs = images.filter(e => pinnedImageSet.has(e.name));
    const unpinnedImgs = images.filter(e => !pinnedImageSet.has(e.name));
    const pinnedImageOrder = pinnedImages.filter(name => pinnedImgs.some(e => e.name === name));
    pinnedImgs.sort((a, b) => {
      const idxA = pinnedImageOrder.indexOf(a.name);
      const idxB = pinnedImageOrder.indexOf(b.name);
      return idxA - idxB;
    });

    // Backend is the single source of truth for all sorting (name, date, custom, auto).
    // No client-side re-sorting needed — entries already arrive sorted from ListDirectoryWithSort.

    return [...pinnedDirs, ...unpinnedDirs, ...pinnedImgs, ...unpinnedImgs];
  }, [entries, searchQuery, sortBy, sortOrder, pinnedFolders, pinnedImages]);

  return {
    searchQuery,
    setSearchQuery,
    sortedBaseFolders,
    sortedEntries,
    searchResults,
    isSearching,
  };
}
