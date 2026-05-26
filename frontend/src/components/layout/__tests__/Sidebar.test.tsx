import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from '../Sidebar'
import { useSettingsStore } from '../../../stores/settingsStore'
import { useTabStore } from '../../../stores/tabStore'

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

describe('Sidebar', () => {
  it('renders all navigation items', () => {
    render(<Sidebar />)
    expect(screen.getByText('navigation.home')).toBeInTheDocument()
    expect(screen.getByText('navigation.explorer')).toBeInTheDocument()
    expect(screen.getByText('navigation.history')).toBeInTheDocument()
    expect(screen.getByText('navigation.download')).toBeInTheDocument()
    expect(screen.getByText('navigation.settings')).toBeInTheDocument()
  })

  it('renders collapse button', () => {
    render(<Sidebar />)
    expect(screen.getByText('common.close')).toBeInTheDocument()
  })

  it('hides disabled menu items', () => {
    useSettingsStore.setState({ enabledMenuItems: { ...useSettingsStore.getState().enabledMenuItems, history: false } })
    render(<Sidebar />)
    expect(screen.queryByText('navigation.history')).not.toBeInTheDocument()
  })

  it('renders collapsed state', () => {
    useSettingsStore.setState({ sidebarCollapsed: true })
    const { container } = render(<Sidebar />)
    expect(screen.queryByText('common.close')).not.toBeInTheDocument()
    expect(container.querySelector('.sidebar-transition')).toBeInTheDocument()
  })
})
