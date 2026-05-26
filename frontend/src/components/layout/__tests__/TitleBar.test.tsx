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
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
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

  it('renders minimize, maximize, and close buttons', () => {
    render(<TitleBar />)
    expect(screen.getByLabelText('Minimize')).toBeInTheDocument()
    expect(screen.getByLabelText('Maximize')).toBeInTheDocument()
    expect(screen.getByLabelText('Close')).toBeInTheDocument()
  })

  it('includes TabList component', () => {
    const { container } = render(<TitleBar />)
    expect(container.querySelector('.no-drag')).toBeInTheDocument()
  })

  it('calls WindowMinimise on minimize click', async () => {
    const user = userEvent.setup()
    render(<TitleBar />)
    await user.click(screen.getByLabelText('Minimize'))
    expect(window.runtime!.WindowMinimise).toHaveBeenCalled()
  })

  it('calls WindowMaximise on maximize click when not maximized', async () => {
    const user = userEvent.setup()
    render(<TitleBar />)
    const btn = await screen.findByLabelText('Maximize')
    await user.click(btn)
    expect(window.runtime!.WindowMaximise).toHaveBeenCalled()
  })

  it('calls WindowUnmaximise on maximize click when maximized', async () => {
    window.runtime!.WindowIsMaximised = vi.fn(() => Promise.resolve(true))
    const user = userEvent.setup()
    render(<TitleBar />)
    const btn = await screen.findByLabelText('Restore')
    expect(btn).toBeInTheDocument()
    await user.click(btn)
    expect(window.runtime!.WindowUnmaximise).toHaveBeenCalled()
  })

  it('calls Quit on close click', async () => {
    const user = userEvent.setup()
    render(<TitleBar />)
    await user.click(screen.getByLabelText('Close'))
    expect(window.runtime!.Quit).toHaveBeenCalled()
  })

  it('checks maximized state on mount', () => {
    render(<TitleBar />)
    expect(window.runtime!.WindowIsMaximised).toHaveBeenCalled()
  })

  it('double-clicking spacer calls handleMaximize', async () => {
    const user = userEvent.setup()
    render(<TitleBar />)
    const spacer = document.querySelector('.drag')
    expect(spacer).not.toBeNull()
    if (spacer) {
      await user.dblClick(spacer)
    expect(window.runtime!.WindowMaximise).toHaveBeenCalled()
    }
  })
})
