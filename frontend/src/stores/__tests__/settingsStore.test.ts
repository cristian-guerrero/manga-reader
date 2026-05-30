import { useSettingsStore } from '../settingsStore'
import { AppAPI } from '../../services/api/appAPI'
import { applyTheme, getThemeById } from '../../themes'

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
      tabMemorySaving: false,
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

  it('setAccentColor sets accent and applies theme', () => {
    useSettingsStore.getState().setAccentColor('#ff0000')
    expect(useSettingsStore.getState().themeAccents).toEqual({ dark: '#ff0000' })
    expect(applyTheme).toHaveBeenCalled()
  })

  it('setAccentColor with empty string removes accent', () => {
    useSettingsStore.setState({ themeAccents: { dark: '#ff0000' } })
    useSettingsStore.getState().setAccentColor('')
    expect(useSettingsStore.getState().themeAccents).toEqual({})
  })

  it('setAccentColor with "default" removes accent', () => {
    useSettingsStore.setState({ themeAccents: { dark: '#ff0000' } })
    useSettingsStore.getState().setAccentColor('default')
    expect(useSettingsStore.getState().themeAccents).toEqual({})
  })

  it('setLastFolder updates last folder', () => {
    useSettingsStore.getState().setLastFolder('/manga/series')
    expect(useSettingsStore.getState().lastFolder).toBe('/manga/series')
    expect(AppAPI.updateSettings).toHaveBeenCalledWith({ lastFolder: '/manga/series' })
  })

  it('setSidebarCollapsed updates sidebar', () => {
    useSettingsStore.getState().setSidebarCollapsed(true)
    expect(useSettingsStore.getState().sidebarCollapsed).toBe(true)
    expect(AppAPI.saveSettings).toHaveBeenCalled()
  })

  it('setPreloadImages updates preload setting', () => {
    useSettingsStore.getState().setPreloadImages(false)
    expect(useSettingsStore.getState().preloadImages).toBe(false)
    expect(AppAPI.saveSettings).toHaveBeenCalled()
  })

  it('setPreloadCount updates preload count', () => {
    useSettingsStore.getState().setPreloadCount(5)
    expect(useSettingsStore.getState().preloadCount).toBe(5)
    expect(AppAPI.saveSettings).toHaveBeenCalled()
  })

  it('setEnableHistory updates history setting', () => {
    useSettingsStore.getState().setEnableHistory(false)
    expect(useSettingsStore.getState().enableHistory).toBe(false)
    expect(AppAPI.saveSettings).toHaveBeenCalled()
  })

  it('setMinImageSize clamps min image size', () => {
    useSettingsStore.getState().setMinImageSize(500)
    expect(useSettingsStore.getState().minImageSize).toBe(500)
    expect(AppAPI.saveSettings).toHaveBeenCalled()
  })

  it('setProcessDroppedFolders updates setting', () => {
    useSettingsStore.getState().setProcessDroppedFolders(false)
    expect(useSettingsStore.getState().processDroppedFolders).toBe(false)
    expect(AppAPI.updateSettings).toHaveBeenCalledWith({ processDroppedFolders: false })
  })

  it('setTabMemorySaving updates setting', () => {
    useSettingsStore.getState().setTabMemorySaving(false)
    expect(useSettingsStore.getState().tabMemorySaving).toBe(false)
    expect(AppAPI.updateSettings).toHaveBeenCalledWith({ tabMemorySaving: false })
  })

  it('setRestoreTabs updates setting', () => {
    useSettingsStore.getState().setRestoreTabs(true)
    expect(useSettingsStore.getState().restoreTabs).toBe(true)
    expect(AppAPI.updateSettings).toHaveBeenCalledWith({ restoreTabs: true })
  })

  it('setGenerateThumbnails updates setting', () => {
    useSettingsStore.getState().setGenerateThumbnails(false)
    expect(useSettingsStore.getState().generateThumbnails).toBe(false)
    expect(AppAPI.updateSettings).toHaveBeenCalledWith({ generateThumbnails: false })
  })

  it('setLastPage updates last page and saves', () => {
    useSettingsStore.getState().setLastPage('explorer')
    expect(useSettingsStore.getState().lastPage).toBe('explorer')
    expect(AppAPI.saveSettings).toHaveBeenCalled()
  })

  it('setEnabledMenuItems updates items and saves', () => {
    useSettingsStore.getState().setEnabledMenuItems({ home: true, settings: false })
    expect(useSettingsStore.getState().enabledMenuItems.settings).toBe(false)
    expect(AppAPI.saveSettings).toHaveBeenCalled()
  })

  it('setLocalNetworkServer reverts on API failure', async () => {
    vi.mocked(AppAPI.toggleLocalNetworkServer).mockRejectedValueOnce(new Error('fail'))
    useSettingsStore.setState({ localNetworkServer: false })
    await useSettingsStore.getState().setLocalNetworkServer(true)
    expect(useSettingsStore.getState().localNetworkServer).toBe(false)
  })

  it('loadSettings with null settings applies dark theme', async () => {
    vi.mocked(AppAPI.getSettings).mockResolvedValue(null)
    await useSettingsStore.getState().loadSettings()
    expect(applyTheme).toHaveBeenCalled()
  })

  it('loadSettings applies theme from loaded settings', async () => {
    vi.mocked(AppAPI.getSettings).mockResolvedValue({ theme: 'light', themeAccents: {} } as any)
    await useSettingsStore.getState().loadSettings()
    expect(getThemeById).toHaveBeenCalledWith('light')
    expect(applyTheme).toHaveBeenCalled()
  })

  it('saveSettings calls AppAPI.saveSettings', async () => {
    await useSettingsStore.getState().saveSettings()
    expect(AppAPI.saveSettings).toHaveBeenCalled()
  })
})
