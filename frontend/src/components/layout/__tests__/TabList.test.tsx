import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TabList } from '../TabList'
import { useTabStore } from '../../../stores/tabStore'
import { useSettingsStore } from '../../../stores/settingsStore'

class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

beforeAll(() => {
  global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
})

beforeEach(() => {
  useSettingsStore.setState({
    sidebarCollapsed: false,
    language: 'en',
    theme: 'dark',
    viewerMode: 'vertical',
    verticalWidth: 80,
    scrollSpeed: 50,
    lateralMode: 'single',
    readingDirection: 'ltr',
    panicKey: 'Escape',
    lastFolder: '',
    showImageInfo: false,
    preloadImages: true,
    preloadCount: 3,
    enableHistory: true,
    minImageSize: 0,
    processDroppedFolders: true,
    lastPage: 'home',
    enabledMenuItems: { home: true, history: true, oneShot: true, series: true, explorer: true, download: true, colorizer: true, settings: true, 'library-manager': true },
    downloadPath: '',
    clipboardAutoMonitor: true,
    autoResumeDownloads: false,
    themeAccents: {},
    tabMemorySaving: true,
    restoreTabs: false,
    generateThumbnails: true,
    autoUpdate: true,
    localNetworkServer: false,
  })
  useTabStore.setState({
    tabs: [
      { id: 'tab1', title: 'Home', page: 'home', params: {}, history: [], activeMenuPage: null, explorerState: null, thumbnailScrollPositions: {}, viewerState: null },
      { id: 'tab2', title: 'Explorer', page: 'explorer', params: {}, history: [], activeMenuPage: null, explorerState: null, thumbnailScrollPositions: {}, viewerState: null },
    ],
    activeTabId: 'tab1',
    isReady: true,
  })
})

describe('TabList', () => {
  it('renders all tabs', () => {
    render(<TabList />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Explorer')).toBeInTheDocument()
  })

  it('renders add tab button (SVG)', () => {
    const { container } = render(<TabList />)
    const buttons = container.querySelectorAll('button')
    const addBtn = Array.from(buttons).find(b => b.querySelector('svg line'))
    expect(addBtn).toBeInTheDocument()
  })

  it('adds a tab on add button click', async () => {
    const user = userEvent.setup()
    const { container } = render(<TabList />)
    expect(useTabStore.getState().tabs).toHaveLength(2)
    const buttons = container.querySelectorAll('button')
    const addBtn = Array.from(buttons).find(b => b.querySelector('svg line'))
    await user.click(addBtn!)
    expect(useTabStore.getState().tabs).toHaveLength(3)
  })
})
