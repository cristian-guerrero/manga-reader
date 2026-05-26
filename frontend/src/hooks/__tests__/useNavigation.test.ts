import { renderHook, act } from '@testing-library/react'
import { useNavigation } from '../useNavigation'
import { useTabStore } from '../../stores/tabStore'
import { useGlobalNavigationStore } from '../../stores/globalNavigationStore'
import type { Tab } from '../../stores/tabStore'

const createTab = (overrides: Partial<Tab> = {}): Tab => ({
  id: 'tab-1',
  title: 'Home',
  page: 'home',
  fromPage: null,
  params: {},
  history: [{ page: 'home', params: {} }],
  activeMenuPage: 'home',
  explorerState: null,
  thumbnailScrollPositions: {},
  viewerState: null,
  ...overrides,
})

describe('useNavigation', () => {
  beforeEach(() => {
    useTabStore.setState({
      tabs: [createTab()],
      activeTabId: 'tab-1',
      isReady: false,
    })
    useGlobalNavigationStore.setState({
      isPanicMode: false,
      isProcessing: false,
      folders: [],
    })
  })

  describe('state derivation', () => {
    it('returns currentPage from active tab', () => {
      const { result } = renderHook(() => useNavigation())
      expect(result.current.currentPage).toBe('home')
    })

    it('returns params from active tab', () => {
      useTabStore.setState({
        tabs: [createTab({ params: { path: '/manga' } })],
      })
      const { result } = renderHook(() => useNavigation())
      expect(result.current.params).toEqual({ path: '/manga' })
    })

    it('returns previousPage as second-to-last history entry', () => {
      useTabStore.setState({
        tabs: [createTab({
          page: 'viewer',
          history: [{ page: 'home', params: {} }, { page: 'viewer', params: { folder: '/x' } }],
        })],
      })
      const { result } = renderHook(() => useNavigation())
      expect(result.current.previousPage).toBe('home')
    })

    it('returns previousPage as null when history has single entry', () => {
      const { result } = renderHook(() => useNavigation())
      expect(result.current.previousPage).toBeNull()
    })

    it('returns global panic state', () => {
      useGlobalNavigationStore.setState({ isPanicMode: true })
      const { result } = renderHook(() => useNavigation())
      expect(result.current.isPanicMode).toBe(true)
    })
  })

  describe('navigate', () => {
    it('navigates to a main page and sets activeMenuPage', () => {
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.navigate('settings', {}) })
      const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
      expect(tab?.page).toBe('settings')
      expect(tab?.activeMenuPage).toBe('settings')
    })

    it('navigates to a sub-page and preserves activeMenuPage', () => {
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.navigate('viewer', { folder: '/manga/ch1' }) })
      const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
      expect(tab?.page).toBe('viewer')
      expect(tab?.activeMenuPage).toBe('home')
    })

    it('sets title to folder name for viewer pages', () => {
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.navigate('viewer', { folder: '/manga/Naruto Chapter 1' }) })
      const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
      expect(tab?.title).toBe('Naruto Chapter 1')
    })

    it('sets title to capitalized page name for non-viewer pages', () => {
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.navigate('history', {}) })
      const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
      expect(tab?.title).toBe('History')
    })

    it('uses activeMenuPageOverride when provided', () => {
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.navigate('viewer', { folder: '/x' }, 'explorer') })
      const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
      expect(tab?.activeMenuPage).toBe('explorer')
    })

    it('preserves fromPage from params', () => {
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.navigate('viewer', { folder: '/x', from: 'explorer' }) })
      const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
      expect(tab?.fromPage).toBe('explorer')
    })

    it('pushes to history', () => {
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.navigate('explorer', { path: '/manga' }) })
      const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
      expect(tab?.history).toHaveLength(2)
      expect(tab?.history[1].page).toBe('explorer')
    })

    it('does nothing when no active tab exists', () => {
      useTabStore.setState({ tabs: [], activeTabId: '' })
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.navigate('home', {}) })
      expect(useTabStore.getState().tabs).toHaveLength(0)
    })
  })

  describe('goBack', () => {
    it('pops history and navigates to previous page', () => {
      useTabStore.setState({
        tabs: [createTab({
          page: 'explorer',
          history: [{ page: 'home', params: {} }, { page: 'explorer', params: { path: '/x' } }],
        })],
      })
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.goBack() })
      const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
      expect(tab?.page).toBe('home')
      expect(tab?.history).toHaveLength(1)
    })

    it('resets to home when history has single entry', () => {
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.goBack() })
      const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
      expect(tab?.page).toBe('home')
      expect(tab?.activeMenuPage).toBe('home')
    })

    it('sets correct activeMenuPage when going back to sub-page', () => {
      useTabStore.setState({
        tabs: [createTab({
          page: 'viewer',
          activeMenuPage: 'home',
          history: [
            { page: 'home', params: {} },
            { page: 'explorer', params: { path: '/x' } },
            { page: 'viewer', params: { folder: '/x/ch1' } },
          ],
        })],
      })
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.goBack() })
      const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
      expect(tab?.page).toBe('explorer')
      expect(tab?.activeMenuPage).toBe('explorer')
      expect(tab?.title).toBe('Explorer')
    })
  })

  describe('setParams', () => {
    it('updates params and last history entry', () => {
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.setParams({ custom: 'value' }) })
      const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
      expect(tab?.params).toEqual({ custom: 'value' })
      expect(tab?.history[0].params).toEqual({ custom: 'value' })
    })
  })

  describe('clearHistory', () => {
    it('resets to home with single history entry', () => {
      useTabStore.setState({
        tabs: [createTab({
          page: 'viewer',
          history: [
            { page: 'home', params: {} },
            { page: 'explorer', params: {} },
            { page: 'viewer', params: { folder: '/x' } },
          ],
        })],
      })
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.clearHistory() })
      const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
      expect(tab?.page).toBe('home')
      expect(tab?.params).toEqual({})
      expect(tab?.activeMenuPage).toBe('home')
      expect(tab?.history).toHaveLength(1)
    })
  })

  describe('setThumbnailScrollPosition', () => {
    it('stores scroll position per folder path', () => {
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.setThumbnailScrollPosition('/manga/folder', 150) })
      const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
      expect(tab?.thumbnailScrollPositions['/manga/folder']).toBe(150)
    })

    it('preserves existing scroll positions', () => {
      useTabStore.setState({
        tabs: [createTab({ thumbnailScrollPositions: { '/existing': 50 } })],
      })
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.setThumbnailScrollPosition('/new', 100) })
      const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
      expect(tab?.thumbnailScrollPositions['/existing']).toBe(50)
      expect(tab?.thumbnailScrollPositions['/new']).toBe(100)
    })
  })

  describe('setExplorerState', () => {
    it('updates explorer state', () => {
      const state = { currentPath: '/manga', pathHistory: ['/'], forwardHistory: [] }
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.setExplorerState(state) })
      const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
      expect(tab?.explorerState).toEqual(state)
    })

    it('sets explorer state to null', () => {
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.setExplorerState(null) })
      const tab = useTabStore.getState().tabs.find(t => t.id === 'tab-1')
      expect(tab?.explorerState).toBeNull()
    })
  })

  describe('global state delegation', () => {
    it('exposes triggerPanic', () => {
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.triggerPanic() })
      expect(useGlobalNavigationStore.getState().isPanicMode).toBe(true)
    })

    it('exposes exitPanic', () => {
      useGlobalNavigationStore.setState({ isPanicMode: true })
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.exitPanic() })
      expect(useGlobalNavigationStore.getState().isPanicMode).toBe(false)
    })

    it('exposes isProcessing', () => {
      useGlobalNavigationStore.setState({ isProcessing: true })
      const { result } = renderHook(() => useNavigation())
      expect(result.current.isProcessing).toBe(true)
    })

    it('exposes setFolders', () => {
      const { result } = renderHook(() => useNavigation())
      act(() => { result.current.setFolders([{ path: '/manga', name: 'Manga' }] as any) })
      expect(useGlobalNavigationStore.getState().folders).toHaveLength(1)
    })
  })
})
