import { useSettingsStore } from '../settingsStore'
import { AppAPI } from '../../services/api/appAPI'

vi.mock('../../services/api/appAPI', () => ({
  AppAPI: {
    updateSettings: vi.fn().mockResolvedValue(undefined),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue(null),
    resetSettings: vi.fn().mockResolvedValue(undefined),
    toggleLocalNetworkServer: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../../themes', () => ({
  applyTheme: vi.fn(),
  getThemeById: vi.fn((id: string) =>
    id === 'dark' ? { id: 'dark', name: 'Dark', isDark: true, colors: { accent: '#000' } } : undefined,
  ),
  darkTheme: { id: 'dark', name: 'Dark', isDark: true, colors: { accent: '#000' } },
}))

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
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
      enabledMenuItems: {
        home: true, history: true, oneShot: true, series: true,
        explorer: true, download: true, colorizer: true,
        settings: true, 'library-manager': true,
      },
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
    vi.clearAllMocks()
  })

  it('setLanguage updates language and calls backend', () => {
    useSettingsStore.getState().setLanguage('es')
    expect(useSettingsStore.getState().language).toBe('es')
    expect(AppAPI.updateSettings).toHaveBeenCalledWith({ language: 'es' })
  })

  it('setTheme updates theme and calls backend', () => {
    useSettingsStore.getState().setTheme('dark')
    expect(useSettingsStore.getState().theme).toBe('dark')
    expect(AppAPI.updateSettings).toHaveBeenCalledWith({ theme: 'dark' })
  })

  it('setViewerMode updates viewer mode', () => {
    useSettingsStore.getState().setViewerMode('lateral')
    expect(useSettingsStore.getState().viewerMode).toBe('lateral')
  })

  it('setVerticalWidth clamps between 10 and 100', () => {
    useSettingsStore.getState().setVerticalWidth(200)
    expect(useSettingsStore.getState().verticalWidth).toBe(100)

    useSettingsStore.getState().setVerticalWidth(5)
    expect(useSettingsStore.getState().verticalWidth).toBe(10)
  })

  it('setScrollSpeed clamps between 0 and 100', () => {
    useSettingsStore.getState().setScrollSpeed(150)
    expect(useSettingsStore.getState().scrollSpeed).toBe(100)

    useSettingsStore.getState().setScrollSpeed(-10)
    expect(useSettingsStore.getState().scrollSpeed).toBe(0)
  })

  it('setLateralMode updates lateral mode', () => {
    useSettingsStore.getState().setLateralMode('double')
    expect(useSettingsStore.getState().lateralMode).toBe('double')
  })

  it('setReadingDirection updates direction', () => {
    useSettingsStore.getState().setReadingDirection('rtl')
    expect(useSettingsStore.getState().readingDirection).toBe('rtl')
  })

  it('toggleSidebar toggles sidebarCollapsed', () => {
    expect(useSettingsStore.getState().sidebarCollapsed).toBe(false)
    useSettingsStore.getState().toggleSidebar()
    expect(useSettingsStore.getState().sidebarCollapsed).toBe(true)
    useSettingsStore.getState().toggleSidebar()
    expect(useSettingsStore.getState().sidebarCollapsed).toBe(false)
  })

  it('setShowImageInfo updates showImageInfo', () => {
    useSettingsStore.getState().setShowImageInfo(true)
    expect(useSettingsStore.getState().showImageInfo).toBe(true)
  })

  it('setPanicKey updates panic key', () => {
    useSettingsStore.getState().setPanicKey('F12')
    expect(useSettingsStore.getState().panicKey).toBe('F12')
  })

  it('toggleMenuItem toggles menu item', () => {
    expect(useSettingsStore.getState().enabledMenuItems.home).toBe(true)
    useSettingsStore.getState().toggleMenuItem('home')
    expect(useSettingsStore.getState().enabledMenuItems.home).toBe(false)
  })

  it('toggleMenuItem does not toggle settings', () => {
    useSettingsStore.getState().toggleMenuItem('settings')
    expect(useSettingsStore.getState().enabledMenuItems.settings).toBe(true)
  })

  it('setAutoUpdate updates auto update', () => {
    useSettingsStore.getState().setAutoUpdate(false)
    expect(useSettingsStore.getState().autoUpdate).toBe(false)
  })

  it('setLocalNetworkServer calls API and updates state', async () => {
    await useSettingsStore.getState().setLocalNetworkServer(true)
    expect(AppAPI.toggleLocalNetworkServer).toHaveBeenCalledWith(true)
    expect(useSettingsStore.getState().localNetworkServer).toBe(true)
  })

  it('updateSettings updates multiple settings', () => {
    useSettingsStore.getState().updateSettings({ language: 'es', theme: 'light' })
    expect(useSettingsStore.getState().language).toBe('es')
    expect(useSettingsStore.getState().theme).toBe('light')
  })

  it('resetSettings calls API and reloads', async () => {
    await useSettingsStore.getState().resetSettings()
    expect(AppAPI.resetSettings).toHaveBeenCalled()
  })
})
