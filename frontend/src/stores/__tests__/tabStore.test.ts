import { useTabStore } from '../tabStore'

const createValidTab = () => {
  const id = useTabStore.getState().addTab()
  return id
}

describe('tabStore', () => {
  beforeEach(() => {
    useTabStore.setState({
      tabs: [{
        id: 'default',
        title: 'Home',
        page: 'home',
        fromPage: null,
        params: {},
        history: [{ page: 'home', params: {} }],
        activeMenuPage: 'home',
        explorerState: null,
        thumbnailScrollPositions: {},
        viewerState: null,
      }],
      activeTabId: 'default',
      isReady: false,
    })
  })

  it('starts with one tab', () => {
    const state = useTabStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.activeTabId).toBe('default')
  })

  it('addTab creates a new tab and sets it active', () => {
    const state = useTabStore.getState()
    const id = state.addTab('explorer', { path: '/test' }, 'Explorer')
    const newState = useTabStore.getState()
    expect(newState.tabs).toHaveLength(2)
    expect(newState.activeTabId).toBe(id)
  })

  it('addTab with makeActive=false does not switch', () => {
    useTabStore.getState().addTab('explorer', {}, 'Tab', {}, false)
    expect(useTabStore.getState().activeTabId).toBe('default')
  })

  it('closeTab removes a tab', () => {
    const id1 = useTabStore.getState().addTab('explorer', {}, 'Tab1')
    const id2 = useTabStore.getState().addTab('history', {}, 'Tab2')
    expect(useTabStore.getState().tabs).toHaveLength(3)

    useTabStore.getState().closeTab(id1)
    expect(useTabStore.getState().tabs).toHaveLength(2)
  })

  it('closeTab does not close the last tab', () => {
    expect(useTabStore.getState().tabs).toHaveLength(1)
    useTabStore.getState().closeTab('default')
    expect(useTabStore.getState().tabs).toHaveLength(1)
  })

  it('setActiveTab by ID switches active tab', () => {
    const newId = useTabStore.getState().addTab()
    useTabStore.getState().setActiveTab('default')
    expect(useTabStore.getState().activeTabId).toBe('default')
  })

  it('setActiveTab by index switches active tab', () => {
    useTabStore.getState().addTab()
    useTabStore.getState().setActiveTab(0)
    expect(useTabStore.getState().activeTabId).toBe('default')
  })

  it('setActiveTab with invalid index does nothing', () => {
    useTabStore.getState().setActiveTab(99)
    expect(useTabStore.getState().activeTabId).toBe('default')
  })

  it('updateActiveTab updates the active tab', () => {
    useTabStore.getState().updateActiveTab({ title: 'New Title' })
    const active = useTabStore.getState().getActiveTab()
    expect(active.title).toBe('New Title')
  })

  it('updateTab updates a specific tab', () => {
    const id = useTabStore.getState().addTab()
    useTabStore.getState().updateTab(id, { title: 'Updated' })
    expect(useTabStore.getState().tabs.find(t => t.id === id)?.title).toBe('Updated')
  })

  it('reorderTabs moves a tab', () => {
    const id1 = useTabStore.getState().addTab('explorer', {}, 'Explorer')
    useTabStore.getState().addTab('history', {}, 'History')
    useTabStore.getState().reorderTabs(2, 0)
    const tabs = useTabStore.getState().tabs
    expect(tabs[0].page).toBe('history')
  })

  it('getActiveTab returns active tab or first', () => {
    const tab = useTabStore.getState().getActiveTab()
    expect(tab.id).toBe('default')
    expect(tab.page).toBe('home')
  })

  it('saveTabs returns JSON string', () => {
    const saved = useTabStore.getState().saveTabs()
    const parsed = JSON.parse(saved)
    expect(parsed.tabs).toHaveLength(1)
    expect(parsed.activeTabId).toBe('default')
  })

  it('restoreTabs reconstructs tabs from saved JSON', () => {
    const saved = JSON.stringify({
      tabs: [{ id: 't1', title: 'Explorer', page: 'explorer', params: {} }],
      activeTabId: 't1',
    })
    useTabStore.getState().restoreTabs(saved)
    const state = useTabStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].page).toBe('explorer')
    expect(state.activeTabId).toBe('t1')
  })

  it('saveTabsForBackend returns minimal data', () => {
    const data = useTabStore.getState().saveTabsForBackend()
    expect(data.activeTabId).toBe('default')
    expect(data.tabs).toHaveLength(1)
    expect(data.tabs[0].page).toBe('home')
  })

  it('restoreTabsFromBackend restores tabs', () => {
    useTabStore.getState().restoreTabsFromBackend({
      activeTabId: 't1',
      tabs: [{ id: 't1', title: 'Settings', page: 'settings', params: {} }],
    })
    const state = useTabStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].page).toBe('settings')
    expect(state.activeTabId).toBe('t1')
    expect(state.isReady).toBe(false)
  })

  it('setReady updates ready flag', () => {
    useTabStore.getState().setReady(true)
    expect(useTabStore.getState().isReady).toBe(true)
  })
})
