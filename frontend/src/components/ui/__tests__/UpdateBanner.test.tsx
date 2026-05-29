import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UpdateBanner } from '../UpdateBanner'
import { useUpdaterStore } from '../../../stores/updaterStore'
import { useSettingsStore } from '../../../stores/settingsStore'

vi.mock('../../../services/api/updaterAPI', () => ({
  UpdaterAPI: {
    getCurrentVersion: vi.fn().mockResolvedValue('dev'),
    getUpdateState: vi.fn().mockResolvedValue({ pending: false, pendingVersion: '', downloadedAt: '' }),
    wasJustUpdated: vi.fn().mockResolvedValue(false),
    checkForUpdate: vi.fn().mockResolvedValue(null),
    downloadUpdate: vi.fn().mockResolvedValue(undefined),
  },
}))

const resetSettings = () => useSettingsStore.setState({
  autoUpdate: false,
  language: 'en',
  theme: 'dark',
  viewerMode: 'vertical',
  verticalWidth: 80,
  scrollSpeed: 50,
  lateralMode: 'single',
  readingDirection: 'ltr',
  panicKey: 'Escape',
  lastFolder: '',
  sidebarCollapsed: false,
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
  tabMemorySaving: false,
  restoreTabs: false,
  generateThumbnails: true,
  localNetworkServer: false,
  setLanguage: vi.fn(),
  setTheme: vi.fn(),
  setViewerMode: vi.fn(),
  setVerticalWidth: vi.fn(),
  setScrollSpeed: vi.fn(),
  setLateralMode: vi.fn(),
  setReadingDirection: vi.fn(),
  setPanicKey: vi.fn(),
  setLastFolder: vi.fn(),
  toggleSidebar: vi.fn(),
  setShowImageInfo: vi.fn(),
  setPreloadImages: vi.fn(),
  setPreloadCount: vi.fn(),
  setEnableHistory: vi.fn(),
  setMinImageSize: vi.fn(),
  setProcessDroppedFolders: vi.fn(),
  setLastPage: vi.fn(),
  toggleMenuItem: vi.fn(),

  setTabMemorySaving: vi.fn(),
  setRestoreTabs: vi.fn(),
  setGenerateThumbnails: vi.fn(),
  setAutoUpdate: vi.fn(),
  setLocalNetworkServer: vi.fn(),
  updateSettings: vi.fn(),
  resetSettings: vi.fn(),
  loadSettings: vi.fn(),
})

describe('UpdateBanner', () => {
  beforeEach(() => {
    resetSettings()
    useUpdaterStore.setState({
      currentVersion: '',
      updateInfo: null,
      updateState: { pending: false, pendingVersion: '', downloadedAt: '' },
      isChecking: false,
      isDownloading: false,
      lastCheckTime: null,
      updatedRecently: false,
      init: vi.fn(),
      checkForUpdate: vi.fn(),
      downloadUpdate: vi.fn(),
      dismissUpdated: vi.fn(),
    })
  })

  it('renders nothing when autoUpdate is on and no update available', () => {
    useSettingsStore.setState({ autoUpdate: true })
    const { container } = render(<UpdateBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders update available banner', () => {
    useUpdaterStore.setState({ updateInfo: { available: true, version: 'b1001', url: 'https://example.com/dl' } })
    render(<UpdateBanner />)
    expect(screen.getByText('updater.available')).toBeInTheDocument()
    expect(screen.getByText('updater.download')).toBeInTheDocument()
  })

  it('disables download button while downloading', () => {
    useUpdaterStore.setState({ updateInfo: { available: true, version: 'b1001', url: '' }, isDownloading: true })
    render(<UpdateBanner />)
    expect(screen.getByText('common.loading')).toBeInTheDocument()
  })

  it('renders pending state (already downloaded)', () => {
    useUpdaterStore.setState({ updateState: { pending: true, pendingVersion: 'b1001', downloadedAt: '2024-01-01' } })
    render(<UpdateBanner />)
    expect(screen.getByText('updater.downloaded')).toBeInTheDocument()
  })

  it('renders updated recently banner', () => {
    useUpdaterStore.setState({ updatedRecently: true })
    render(<UpdateBanner />)
    expect(screen.getByText('updater.updated')).toBeInTheDocument()
  })

  it('calls dismissUpdated on close button click', async () => {
    const user = userEvent.setup()
    const dismissUpdated = vi.fn()
    useUpdaterStore.setState({ updatedRecently: true, dismissUpdated })
    render(<UpdateBanner />)
    await user.click(screen.getByText('Close'))
    expect(dismissUpdated).toHaveBeenCalled()
  })

  it('hides update info when autoUpdate is on and update is available', () => {
    useSettingsStore.setState({ autoUpdate: true })
    useUpdaterStore.setState({ updateInfo: { available: true, version: 'b1001', url: '' } })
    const { container } = render(<UpdateBanner />)
    expect(container.firstChild).toBeNull()
  })
})
