import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TitleBar } from '../TitleBar'
import { useSettingsStore } from '../../../stores/settingsStore'
import { useTabStore } from '../../../stores/tabStore'

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
    enabledMenuItems: { home: true, history: true, oneShot: true, series: true, explorer: true, download: true, colorizer: true, settings: true, 'library-manager': true },
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
    tabs: [{ id: 'tab1', title: 'Home', page: 'home', params: {}, history: [], activeMenuPage: null, explorerState: null, thumbnailScrollPositions: {}, viewerState: null }],
    activeTabId: 'tab1',
    isReady: true,
  })
})

describe('TitleBar', () => {
  it('renders window control buttons', () => {
    render(<TitleBar />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })

  it('includes TabList component', () => {
    const { container } = render(<TitleBar />)
    expect(container.querySelector('.no-drag')).toBeInTheDocument()
  })
})
