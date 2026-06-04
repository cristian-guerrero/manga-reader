import { SettingsAPI } from '../settingsAPI'
import { HistoryAPI } from '../historyAPI'
import { FolderAPI } from '../folderAPI'
import { ImageAPI } from '../imageAPI'
import { LibraryAPI } from '../libraryAPI'
import { TabsAPI } from '../tabsAPI'
import { ViewerStateAPI } from '../viewerStateAPI'
import { UpdaterAPI } from '../updaterAPI'
import { LibraryManagerAPI } from '../libraryManagerAPI'
import { FolderViewModeAPI } from '../folderViewModeAPI'
import { FolderGridSizeAPI } from '../folderGridSizeAPI'
import { FolderOrderAPI } from '../folderOrderAPI'
import { ImageOrderAPI } from '../imageOrderAPI'
import { UIPreferencesAPI } from '../uiPreferencesAPI'
import { ExplorerAPI } from '../explorerAPI'
import { DownloadAPI } from '../downloadAPI'
import { SeriesAPI } from '../seriesAPI'
import { ThumbnailAPI } from '../thumbnailAPI'
import { ColorizerAPI } from '../colorizerAPI'
import { AppAPI } from '../appAPI'

vi.mock('../../../../wailsjs/go/main/App', () => {
  function mock<T>(val?: T) {
    return vi.fn(() => Promise.resolve(val ?? null)) as unknown as T & ReturnType<typeof vi.fn>
  }
  return {
    GetSettings: mock(),
    UpdateSettings: mock(undefined),
    SaveSettings: mock(undefined),
    ResetSettings: mock(undefined),
    GetHistoryEntry: mock(),
    AddHistory: mock(undefined),
    GetHistory: mock([]),
    RemoveHistory: mock(undefined),
    ClearHistory: mock(undefined),
    GetFolderInfo: mock(),
    GetFolderInfoShallow: mock(),
    GetImagesWithSort: mock([]),
    GetImagesShallowWithSort: mock([]),
    GetImagesSorted: mock([]),
    ExploreFolder: mock([]),
    ResolveFolder: mock(''),
    AddFolder: mock(),
    IsSeries: mock(false),
    SelectFolder: mock(),
    GetImages: mock([]),
    GetImagesShallow: mock([]),
    GetThumbnail: mock(),
    SetThumbnailsPaused: mock(undefined),
    AddBaseFolder: mock(undefined),
    RemoveBaseFolder: mock(undefined),
    GetBaseFolders: mock([]),
    GetLibrary: mock([]),
    RemoveLibraryEntry: mock(undefined),
    ClearLibrary: mock(undefined),
    GetTabs: mock(),
    SaveTabs: mock(undefined),
    GetViewerState: mock(),
    SaveViewerState: mock(undefined),
    GetSeries: mock([]),
    RemoveSeries: mock(undefined),
    ClearSeries: mock(undefined),
    GetChapterNavigation: mock(),
    GetFolderNavigation: mock(),
    GetFolderNavigationWithSort: mock(),
    SearchExplorer: mock([]),
    FetchMangaInfo: mock(),
    StartDownload: mock(''),
    GetDownloadHistory: mock([]),
    ClearDownloadHistory: mock(undefined),
    RemoveDownloadJob: mock(undefined),
    ResumeIncompleteDownloads: mock(undefined),
    AddDownloadedFolder: mock(''),
    AddDownloadedSeries: mock(''),
    OpenInFileManager: mock(undefined),
    GetDownloadAlgorithmConfig: mock({}),
    SaveDownloadAlgorithmConfig: mock(undefined),
    GetExplorerSortPreferences: mock({}),
    GetExplorerSortPreference: mock(),
    SetExplorerSortPreference: mock(undefined),
    GetSeriesSortBy: mock(),
    SetSeriesSortBy: mock(undefined),
    GetSeriesSortOrder: mock(),
    SetSeriesSortOrder: mock(undefined),
    GetOneShotSortBy: mock(),
    SetOneShotSortBy: mock(undefined),
    GetOneShotSortOrder: mock(),
    SetOneShotSortOrder: mock(undefined),
    GetSeriesDetailsSortPreferences: mock({}),
    GetSeriesDetailsSortPreference: mock(),
    SetSeriesDetailsSortPreference: mock(undefined),
    GetExplorerRootViewMode: mock(),
    SetExplorerRootViewMode: mock(undefined),
    GetHistoryViewMode: mock(),
    SetHistoryViewMode: mock(undefined),
    CheckForUpdate: mock(),
    DownloadUpdate: mock(undefined),
    GetUpdateState: mock(),
    GetCurrentVersion: mock(),
    IsUpdatePending: mock(false),
    WasJustUpdated: mock(false),
    GetLibraries: mock([]),
    GetLibraryByID: mock(),
    GetActiveLibraryID: mock(),
    GetDefaultLibrary: mock(),
    CreateLibrary: mock(),
    DeleteLibrary: mock(undefined),
    OpenLibraryFile: mock(),
    SwitchLibrary: mock(undefined),
    SelectLibraryFile: mock(),
    GetFolderViewMode: mock(),
    SetFolderViewMode: mock(undefined),
    GetFolderGridSize: mock(0),
    SetFolderGridSize: mock(undefined),
    GetFolderOrder: mock([]),
    SetFolderOrder: mock(undefined),
    ResetFolderOrder: mock(undefined),
    HasFolderCustomOrder: mock(false),
    GetFolderOriginalOrder: mock([]),
    GetFolderAutoOrder: mock([]),
    SetFolderAutoOrder: mock(undefined),
    PromoteToAutoOrder: mock([]),
    HasFolderAutoOrder: mock(false),
    ResetFolderAutoOrder: mock(undefined),
    PinFolder: mock(undefined),
    UnpinFolder: mock(undefined),
    GetPinnedFolders: mock([]),
    ReorderPinnedFolders: mock(undefined),
    HasCustomOrder: mock(false),
    GetOriginalOrder: mock([]),
    SaveImageOrder: mock(undefined),
    ResetImageOrder: mock(undefined),
    PinImage: mock(undefined),
    UnpinImage: mock(undefined),
    GetPinnedImages: mock([]),
    ReorderPinnedImages: mock(undefined),
    ClearAllData: mock(undefined),
    UpdateTaskbarIcon: mock(undefined),
    ToggleLocalNetworkServer: mock(undefined),
    GetLocalNetworkServerStatus: mock(false),
    GetLocalNetworkAddress: mock(''),
    ColorizerGetStatus: mock(),
    ColorizerInstall: mock(undefined),
    ColorizerStartServer: mock(undefined),
    ColorizerStopServer: mock(undefined),
    ColorizerRestartServer: mock(undefined),
    ColorizerIsRunning: mock(false),
    ColorizerIsInstalled: mock(false),
    ColorizerHealthCheck: mock(false),
    ColorizeImage: mock(),
    LoadImageAsBase64: mock(),
    SaveColorizedImage: mock(),
    SaveMultipleColorizedImages: mock([]),
    SaveColorizedImageAuto: mock(),
    SaveMultipleColorizedImagesAuto: mock([]),
  }
})

// This needs to be imported after vi.mock for proper hoisting
import * as AppModule from '../../../../wailsjs/go/main/App'
const App = AppModule as unknown as Record<string, ReturnType<typeof vi.fn>>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SettingsAPI', () => {
  it('getSettings calls GetSettings', async () => {
    App.GetSettings.mockResolvedValue({ language: 'es' })
    const result = await SettingsAPI.getSettings()
    expect(result).toEqual({ language: 'es' })
  })

  it('updateSettings calls UpdateSettings', async () => {
    await SettingsAPI.updateSettings({ language: 'es' })
    expect(App.UpdateSettings).toHaveBeenCalledWith({ language: 'es' })
  })

  it('saveSettings calls SaveSettings', async () => {
    const settings = { language: 'en' } as any
    await SettingsAPI.saveSettings(settings)
    expect(App.SaveSettings).toHaveBeenCalled()
  })

  it('resetSettings calls ResetSettings', async () => {
    await SettingsAPI.resetSettings()
    expect(App.ResetSettings).toHaveBeenCalled()
  })
})

describe('HistoryAPI', () => {
  it('getHistory returns data', async () => {
    App.GetHistory.mockResolvedValue([{ id: '1', folderPath: '/test', folderName: 'Test' }])
    const result = await HistoryAPI.getHistory()
    expect(result).toHaveLength(1)
  })

  it('addHistory calls AddHistory', async () => {
    await HistoryAPI.addHistory({ folderPath: '/test', folderName: 'T', lastImage: '', lastImageIndex: 0, scrollPosition: 0, totalImages: 1, lastRead: '' })
    expect(App.AddHistory).toHaveBeenCalled()
  })

  it('getHistoryEntry returns entry', async () => {
    App.GetHistoryEntry.mockResolvedValue({ id: '1', folderPath: '/test', folderName: 'Test', lastImage: '', lastImageIndex: 0, scrollPosition: 0, totalImages: 10, lastRead: '' })
    const result = await HistoryAPI.getHistoryEntry('/test')
    expect(result?.folderPath).toBe('/test')
  })

  it('removeHistory calls RemoveHistory', async () => {
    await HistoryAPI.removeHistory('/test')
    expect(App.RemoveHistory).toHaveBeenCalledWith('/test')
  })

  it('clearHistory calls ClearHistory', async () => {
    await HistoryAPI.clearHistory()
    expect(App.ClearHistory).toHaveBeenCalled()
  })
})

describe('FolderAPI', () => {
  it('exploreFolder returns entries', async () => {
    App.ExploreFolder.mockResolvedValue([{ path: '/a', name: 'A', isDirectory: true, hasImages: false, imageCount: 0, subdirectoryCount: 0, coverImage: '', size: 0, lastModified: 0 }])
    const result = await FolderAPI.exploreFolder('/path', 'name', 'asc')
    expect(result).toHaveLength(1)
  })

  it('isSeries returns boolean', async () => {
    App.IsSeries.mockResolvedValue(true)
    expect(await FolderAPI.isSeries('/path')).toBe(true)
  })

  it('getFolderInfo returns info', async () => {
    App.GetFolderInfo.mockResolvedValue({ path: '/path', name: 'Folder', isSeries: false, coverImage: '' })
    const result = await FolderAPI.getFolderInfo('/path')
    expect(result?.name).toBe('Folder')
  })

  it('getFolderInfoShallow returns info', async () => {
    App.GetFolderInfoShallow.mockResolvedValue({ path: '/path', name: 'Shallow', isSeries: false, coverImage: '' })
    const result = await FolderAPI.getFolderInfoShallow('/path')
    expect(result?.name).toBe('Shallow')
  })

  it('getImagesSorted returns sorted images (shallow=false)', async () => {
    App.GetImagesSorted.mockResolvedValue([])
    const result = await FolderAPI.getImagesSorted('/path', 'name', 'asc', false)
    expect(result).toEqual([])
  })

  it('getImagesSorted returns sorted images (shallow=true)', async () => {
    App.GetImagesSorted.mockResolvedValue([])
    const result = await FolderAPI.getImagesSorted('/path', 'name', 'asc', true)
    expect(result).toEqual([])
  })

  it('resolveFolder returns resolved path', async () => {
    App.ResolveFolder.mockResolvedValue('/resolved/path')
    expect(await FolderAPI.resolveFolder('/path')).toBe('/resolved/path')
  })

  it('addFolder calls AddFolder', async () => {
    App.AddFolder.mockResolvedValue({ path: '/lib', isSeries: true })
    const result = await FolderAPI.addFolder('/lib')
    expect(result?.isSeries).toBe(true)
  })

  it('selectFolder returns path', async () => {
    App.SelectFolder.mockResolvedValue('/selected')
    expect(await FolderAPI.selectFolder()).toBe('/selected')
  })
})

describe('ImageAPI', () => {
  it('getImages returns list', async () => {
    App.GetImages.mockResolvedValue([])
    expect(await ImageAPI.getImages('/path')).toEqual([])
  })

  it('getImagesShallow returns shallow list', async () => {
    App.GetImagesShallow.mockResolvedValue([])
    expect(await ImageAPI.getImagesShallow('/path')).toEqual([])
  })
})

describe('LibraryAPI', () => {
  it('getBaseFolders returns folders', async () => {
    App.GetBaseFolders.mockResolvedValue([{ path: '/manga', name: 'Manga', addedAt: '2024', isVisible: true }])
    const result = await LibraryAPI.getBaseFolders()
    expect(result).toHaveLength(1)
  })

  it('addBaseFolder calls AddBaseFolder', async () => {
    await LibraryAPI.addBaseFolder('/manga')
    expect(App.AddBaseFolder).toHaveBeenCalledWith('/manga')
  })

  it('removeBaseFolder calls RemoveBaseFolder', async () => {
    await LibraryAPI.removeBaseFolder('/manga')
    expect(App.RemoveBaseFolder).toHaveBeenCalledWith('/manga')
  })

  it('getLibrary returns entries', async () => {
    App.GetLibrary.mockResolvedValue([])
    expect(await LibraryAPI.getLibrary()).toEqual([])
  })

  it('removeLibraryEntry calls RemoveLibraryEntry', async () => {
    await LibraryAPI.removeLibraryEntry('/path')
    expect(App.RemoveLibraryEntry).toHaveBeenCalledWith('/path')
  })

  it('clearLibrary calls ClearLibrary', async () => {
    await LibraryAPI.clearLibrary()
    expect(App.ClearLibrary).toHaveBeenCalled()
  })
})

describe('TabsAPI', () => {
  it('getTabs calls GetTabs', async () => {
    App.GetTabs.mockResolvedValue({ activeTabId: 't1', tabs: [] })
    const result = await TabsAPI.getTabs()
    expect(result?.activeTabId).toBe('t1')
  })

  it('saveTabs calls SaveTabs', async () => {
    await TabsAPI.saveTabs({ activeTabId: 't1', tabs: [] })
    expect(App.SaveTabs).toHaveBeenCalled()
  })
})

describe('ViewerStateAPI', () => {
  it('saveViewerState calls SaveViewerState', async () => {
    await ViewerStateAPI.saveViewerState('/path', 0, 80, 0)
    expect(App.SaveViewerState).toHaveBeenCalledWith('/path', 0, 80, 0)
  })

  it('getViewerState returns state', async () => {
    App.GetViewerState.mockResolvedValue({ path: '/path', currentIndex: 0, zoomLevel: 80, scrollPosition: 0 })
    const result = await ViewerStateAPI.getViewerState('/path')
    expect(result?.currentIndex).toBe(0)
  })
})

describe('UpdaterAPI', () => {
  it('checkForUpdate returns info', async () => {
    App.CheckForUpdate.mockResolvedValue({ available: true, version: 'b1001', url: '' })
    const result = await UpdaterAPI.checkForUpdate()
    expect(result?.available).toBe(true)
  })

  it('wasJustUpdated returns boolean', async () => {
    App.WasJustUpdated.mockResolvedValue(true)
    expect(await UpdaterAPI.wasJustUpdated()).toBe(true)
  })

  it('downloadUpdate calls DownloadUpdate', async () => {
    await UpdaterAPI.downloadUpdate('b1002')
    expect(App.DownloadUpdate).toHaveBeenCalledWith('b1002')
  })

  it('getUpdateState returns state', async () => {
    App.GetUpdateState.mockResolvedValue({ pending: false, pendingVersion: '', downloadedAt: '' })
    const result = await UpdaterAPI.getUpdateState()
    expect(result?.pending).toBe(false)
  })

  it('getCurrentVersion returns version', async () => {
    App.GetCurrentVersion.mockResolvedValue('b1000')
    expect(await UpdaterAPI.getCurrentVersion()).toBe('b1000')
  })

  it('isUpdatePending returns boolean', async () => {
    App.IsUpdatePending.mockResolvedValue(true)
    expect(await UpdaterAPI.isUpdatePending()).toBe(true)
  })
})

describe('LibraryManagerAPI', () => {
  it('getLibraries returns list', async () => {
    App.GetLibraries.mockResolvedValue([{ id: '1', name: 'Default', filename: 'db.db', isDefault: true }])
    const result = await LibraryManagerAPI.getLibraries()
    expect(result).toHaveLength(1)
  })

  it('getLibraryByID returns library', async () => {
    App.GetLibraryByID.mockResolvedValue({ id: '1', name: 'Default', filename: 'db.db', isDefault: true })
    const result = await LibraryManagerAPI.getLibraryByID('1')
    expect(result?.name).toBe('Default')
  })

  it('getActiveLibraryID returns id', async () => {
    App.GetActiveLibraryID.mockResolvedValue('lib1')
    expect(await LibraryManagerAPI.getActiveLibraryID()).toBe('lib1')
  })

  it('getDefaultLibrary returns default', async () => {
    App.GetDefaultLibrary.mockResolvedValue({ id: '1', name: 'Default', filename: 'db.db', isDefault: true })
    const result = await LibraryManagerAPI.getDefaultLibrary()
    expect(result?.isDefault).toBe(true)
  })

  it('createLibrary calls CreateLibrary', async () => {
    App.CreateLibrary.mockResolvedValue({ id: '2', name: 'New', filename: 'new.db', isDefault: false })
    const result = await LibraryManagerAPI.createLibrary('New')
    expect(result?.name).toBe('New')
  })

  it('deleteLibrary calls DeleteLibrary', async () => {
    await LibraryManagerAPI.deleteLibrary('1')
    expect(App.DeleteLibrary).toHaveBeenCalledWith('1')
  })

  it('openLibraryFile calls OpenLibraryFile', async () => {
    App.OpenLibraryFile.mockResolvedValue({ id: '3', name: 'Imported', filename: 'imported.db', isDefault: false })
    const result = await LibraryManagerAPI.openLibraryFile('/path/to/lib.db')
    expect(result?.name).toBe('Imported')
  })

  it('switchLibrary calls SwitchLibrary', async () => {
    await LibraryManagerAPI.switchLibrary('2')
    expect(App.SwitchLibrary).toHaveBeenCalledWith('2')
  })

  it('selectLibraryFile returns path', async () => {
    App.SelectLibraryFile.mockResolvedValue('/path/to/lib.db')
    expect(await LibraryManagerAPI.selectLibraryFile()).toBe('/path/to/lib.db')
  })
})

describe('FolderViewModeAPI', () => {
  it('setFolderViewMode calls SetFolderViewMode', async () => {
    await FolderViewModeAPI.setFolderViewMode('/path', 'grid')
    expect(App.SetFolderViewMode).toHaveBeenCalledWith('/path', 'grid')
  })

  it('getFolderViewMode returns mode', async () => {
    App.GetFolderViewMode.mockResolvedValue('list')
    expect(await FolderViewModeAPI.getFolderViewMode('/path')).toBe('list')
  })
})

describe('FolderGridSizeAPI', () => {
  it('getFolderGridSize returns number', async () => {
    App.GetFolderGridSize.mockResolvedValue(200)
    expect(await FolderGridSizeAPI.getFolderGridSize('/path')).toBe(200)
  })

  it('setFolderGridSize calls SetFolderGridSize', async () => {
    await FolderGridSizeAPI.setFolderGridSize('/path', 150)
    expect(App.SetFolderGridSize).toHaveBeenCalledWith('/path', 150)
  })
})

describe('FolderOrderAPI', () => {
  it('getFolderOrder returns array', async () => {
    App.GetFolderOrder.mockResolvedValue(['a', 'b'])
    const result = await FolderOrderAPI.getFolderOrder('/path')
    expect(result).toEqual(['a', 'b'])
  })

  it('hasFolderCustomOrder returns boolean', async () => {
    App.HasFolderCustomOrder.mockResolvedValue(true)
    expect(await FolderOrderAPI.hasFolderCustomOrder('/path')).toBe(true)
  })

  it('setFolderOrder calls SetFolderOrder', async () => {
    await FolderOrderAPI.setFolderOrder('/path', ['b', 'a'], ['a', 'b'])
    expect(App.SetFolderOrder).toHaveBeenCalledWith('/path', ['b', 'a'], ['a', 'b'])
  })

  it('resetFolderOrder calls ResetFolderOrder', async () => {
    await FolderOrderAPI.resetFolderOrder('/path')
    expect(App.ResetFolderOrder).toHaveBeenCalledWith('/path')
  })

  it('getFolderOriginalOrder returns array', async () => {
    App.GetFolderOriginalOrder.mockResolvedValue(['a', 'b'])
    expect(await FolderOrderAPI.getFolderOriginalOrder('/path')).toEqual(['a', 'b'])
  })

  it('getFolderAutoOrder returns array', async () => {
    App.GetFolderAutoOrder.mockResolvedValue(['c', 'd'])
    expect(await FolderOrderAPI.getFolderAutoOrder('/path')).toEqual(['c', 'd'])
  })

  it('setFolderAutoOrder calls SetFolderAutoOrder', async () => {
    await FolderOrderAPI.setFolderAutoOrder('/path', ['c', 'd'], ['a', 'b'])
    expect(App.SetFolderAutoOrder).toHaveBeenCalledWith('/path', ['c', 'd'], ['a', 'b'])
  })

  it('promoteToAutoOrder returns promoted order', async () => {
    App.PromoteToAutoOrder.mockResolvedValue(['e', 'a', 'b'])
    expect(await FolderOrderAPI.promoteToAutoOrder('/path', 'e', ['a', 'b', 'e'])).toEqual(['e', 'a', 'b'])
  })

  it('hasFolderAutoOrder returns boolean', async () => {
    App.HasFolderAutoOrder.mockResolvedValue(true)
    expect(await FolderOrderAPI.hasFolderAutoOrder('/path')).toBe(true)
  })

  it('resetFolderAutoOrder calls ResetFolderAutoOrder', async () => {
    await FolderOrderAPI.resetFolderAutoOrder('/path')
    expect(App.ResetFolderAutoOrder).toHaveBeenCalledWith('/path')
  })

  it('pinFolder calls PinFolder', async () => {
    await FolderOrderAPI.pinFolder('/path', 'custom', 'entry')
    expect(App.PinFolder).toHaveBeenCalledWith('/path', 'custom', 'entry')
  })

  it('unpinFolder calls UnpinFolder', async () => {
    await FolderOrderAPI.unpinFolder('/path', 'custom', 'entry')
    expect(App.UnpinFolder).toHaveBeenCalledWith('/path', 'custom', 'entry')
  })

  it('getPinnedFolders returns list', async () => {
    App.GetPinnedFolders.mockResolvedValue(['a', 'b'])
    expect(await FolderOrderAPI.getPinnedFolders('/path', 'custom')).toEqual(['a', 'b'])
  })

  it('reorderPinnedFolders calls ReorderPinnedFolders', async () => {
    await FolderOrderAPI.reorderPinnedFolders('/path', 'custom', ['b', 'a'])
    expect(App.ReorderPinnedFolders).toHaveBeenCalledWith('/path', 'custom', ['b', 'a'])
  })
})

describe('ImageOrderAPI', () => {
  it('hasCustomOrder returns boolean', async () => {
    App.HasCustomOrder.mockResolvedValue(false)
    expect(await ImageOrderAPI.hasCustomOrder('/path')).toBe(false)
  })

  it('getOriginalOrder returns array', async () => {
    App.GetOriginalOrder.mockResolvedValue(['1.jpg', '2.jpg'])
    expect(await ImageOrderAPI.getOriginalOrder('/path')).toEqual(['1.jpg', '2.jpg'])
  })

  it('saveImageOrder calls SaveImageOrder', async () => {
    await ImageOrderAPI.saveImageOrder('/path', ['2.jpg', '1.jpg'], ['1.jpg', '2.jpg'])
    expect(App.SaveImageOrder).toHaveBeenCalledWith('/path', ['2.jpg', '1.jpg'], ['1.jpg', '2.jpg'])
  })

  it('resetImageOrder calls ResetImageOrder', async () => {
    await ImageOrderAPI.resetImageOrder('/path')
    expect(App.ResetImageOrder).toHaveBeenCalledWith('/path')
  })

  it('pinImage calls PinImage', async () => {
    await ImageOrderAPI.pinImage('/path', 'custom', 'image.jpg')
    expect(App.PinImage).toHaveBeenCalledWith('/path', 'custom', 'image.jpg')
  })

  it('unpinImage calls UnpinImage', async () => {
    await ImageOrderAPI.unpinImage('/path', 'custom', 'image.jpg')
    expect(App.UnpinImage).toHaveBeenCalledWith('/path', 'custom', 'image.jpg')
  })

  it('getPinnedImages returns list', async () => {
    App.GetPinnedImages.mockResolvedValue(['img1.jpg'])
    expect(await ImageOrderAPI.getPinnedImages('/path', 'custom')).toEqual(['img1.jpg'])
  })

  it('reorderPinnedImages calls ReorderPinnedImages', async () => {
    await ImageOrderAPI.reorderPinnedImages('/path', 'custom', ['img2.jpg', 'img1.jpg'])
    expect(App.ReorderPinnedImages).toHaveBeenCalledWith('/path', 'custom', ['img2.jpg', 'img1.jpg'])
  })
})

describe('UIPreferencesAPI', () => {
  it('getSeriesSortBy returns value', async () => {
    App.GetSeriesSortBy.mockResolvedValue('name')
    expect(await UIPreferencesAPI.getSeriesSortBy()).toBe('name')
  })

  it('setExplorerSortPreference calls backend', async () => {
    await UIPreferencesAPI.setExplorerSortPreference('/path', 'name', 'asc')
    expect(App.SetExplorerSortPreference).toHaveBeenCalledWith('/path', 'name', 'asc')
  })

  it('getExplorerSortPreferences returns all', async () => {
    App.GetExplorerSortPreferences.mockResolvedValue({})
    const result = await UIPreferencesAPI.getExplorerSortPreferences()
    expect(result).toEqual({})
  })

  it('getExplorerSortPreference returns pref', async () => {
    App.GetExplorerSortPreference.mockResolvedValue({ sortBy: 'date', sortOrder: 'desc' })
    const result = await UIPreferencesAPI.getExplorerSortPreference('/path')
    expect(result?.sortBy).toBe('date')
  })

  it('setSeriesSortBy calls SetSeriesSortBy', async () => {
    await UIPreferencesAPI.setSeriesSortBy('date')
    expect(App.SetSeriesSortBy).toHaveBeenCalledWith('date')
  })

  it('getSeriesSortOrder returns value', async () => {
    App.GetSeriesSortOrder.mockResolvedValue('desc')
    expect(await UIPreferencesAPI.getSeriesSortOrder()).toBe('desc')
  })

  it('setSeriesSortOrder calls SetSeriesSortOrder', async () => {
    await UIPreferencesAPI.setSeriesSortOrder('asc')
    expect(App.SetSeriesSortOrder).toHaveBeenCalledWith('asc')
  })

  it('getOneShotSortBy returns value', async () => {
    App.GetOneShotSortBy.mockResolvedValue('date')
    expect(await UIPreferencesAPI.getOneShotSortBy()).toBe('date')
  })

  it('setOneShotSortBy calls SetOneShotSortBy', async () => {
    await UIPreferencesAPI.setOneShotSortBy('name')
    expect(App.SetOneShotSortBy).toHaveBeenCalledWith('name')
  })

  it('getOneShotSortOrder returns value', async () => {
    App.GetOneShotSortOrder.mockResolvedValue('desc')
    expect(await UIPreferencesAPI.getOneShotSortOrder()).toBe('desc')
  })

  it('setOneShotSortOrder calls SetOneShotSortOrder', async () => {
    await UIPreferencesAPI.setOneShotSortOrder('asc')
    expect(App.SetOneShotSortOrder).toHaveBeenCalledWith('asc')
  })

  it('getSeriesDetailsSortPreferences returns all', async () => {
    App.GetSeriesDetailsSortPreferences.mockResolvedValue({})
    const result = await UIPreferencesAPI.getSeriesDetailsSortPreferences()
    expect(result).toEqual({})
  })

  it('getSeriesDetailsSortPreference returns pref', async () => {
    App.GetSeriesDetailsSortPreference.mockResolvedValue({ sortBy: 'chapter', sortOrder: 'asc' })
    const result = await UIPreferencesAPI.getSeriesDetailsSortPreference('/series')
    expect(result?.sortBy).toBe('chapter')
  })

  it('setSeriesDetailsSortPreference calls SetSeriesDetailsSortPreference', async () => {
    await UIPreferencesAPI.setSeriesDetailsSortPreference('/series', 'chapter', 'desc')
    expect(App.SetSeriesDetailsSortPreference).toHaveBeenCalledWith('/series', 'chapter', 'desc')
  })

  it('getExplorerRootViewMode returns mode', async () => {
    App.GetExplorerRootViewMode.mockResolvedValue('list')
    expect(await UIPreferencesAPI.getExplorerRootViewMode()).toBe('list')
  })

  it('setExplorerRootViewMode calls SetExplorerRootViewMode', async () => {
    await UIPreferencesAPI.setExplorerRootViewMode('grid')
    expect(App.SetExplorerRootViewMode).toHaveBeenCalledWith('grid')
  })

  it('getHistoryViewMode returns mode', async () => {
    App.GetHistoryViewMode.mockResolvedValue('grid')
    expect(await UIPreferencesAPI.getHistoryViewMode()).toBe('grid')
  })

  it('setHistoryViewMode calls SetHistoryViewMode', async () => {
    await UIPreferencesAPI.setHistoryViewMode('list')
    expect(App.SetHistoryViewMode).toHaveBeenCalledWith('list')
  })
})

describe('ExplorerAPI', () => {
  it('getFolderNavigation returns navigation', async () => {
    App.GetFolderNavigation.mockResolvedValue({
      prevFolder: null, nextFolder: null, parentPath: '/', currentIndex: 0, totalFolders: 1,
    })
    const result = await ExplorerAPI.getFolderNavigation('/path')
    expect(result?.parentPath).toBe('/')
  })

  it('searchExplorer returns entries', async () => {
    App.SearchExplorer.mockResolvedValue([])
    expect(await ExplorerAPI.searchExplorer('/', 'naruto')).toEqual([])
  })

  it('getFolderNavigationWithSort returns navigation with sort', async () => {
    App.GetFolderNavigationWithSort.mockResolvedValue({
      prevFolder: null, nextFolder: null, parentPath: '/', currentIndex: 0, totalFolders: 1,
    })
    const result = await ExplorerAPI.getFolderNavigationWithSort('/path', 'name', 'asc')
    expect(result?.parentPath).toBe('/')
  })
})

describe('DownloadAPI', () => {
  it('getDownloadHistory returns jobs', async () => {
    App.GetDownloadHistory.mockResolvedValue([])
    expect(await DownloadAPI.getDownloadHistory()).toEqual([])
  })

  it('fetchMangaInfo calls FetchMangaInfo', async () => {
    await DownloadAPI.fetchMangaInfo('https://example.com')
    expect(App.FetchMangaInfo).toHaveBeenCalledWith('https://example.com')
  })

  it('startDownload calls StartDownload', async () => {
    App.StartDownload.mockResolvedValue('job-123')
    const result = await DownloadAPI.startDownload('https://example.com')
    expect(result).toBe('job-123')
  })

  it('clearDownloadHistory calls ClearDownloadHistory', async () => {
    await DownloadAPI.clearDownloadHistory()
    expect(App.ClearDownloadHistory).toHaveBeenCalled()
  })

  it('removeDownloadJob calls RemoveDownloadJob', async () => {
    await DownloadAPI.removeDownloadJob('job-1')
    expect(App.RemoveDownloadJob).toHaveBeenCalledWith('job-1')
  })

  it('getDownloadAlgorithmConfig returns config', async () => {
    App.GetDownloadAlgorithmConfig.mockResolvedValue({})
    const result = await DownloadAPI.getDownloadAlgorithmConfig()
    expect(result).toEqual({})
  })

  it('saveDownloadAlgorithmConfig calls SaveDownloadAlgorithmConfig', async () => {
    const config = { default: { maxParallelChapters: 2, maxParallelImages: 3 } }
    await DownloadAPI.saveDownloadAlgorithmConfig(config)
    expect(App.SaveDownloadAlgorithmConfig).toHaveBeenCalledWith(config)
  })
})

describe('SeriesAPI', () => {
  it('getSeries returns list', async () => {
    App.GetSeries.mockResolvedValue([])
    expect(await SeriesAPI.getSeries()).toEqual([])
  })

  it('removeSeries calls RemoveSeries', async () => {
    await SeriesAPI.removeSeries('/path')
    expect(App.RemoveSeries).toHaveBeenCalledWith('/path')
  })

  it('clearSeries calls ClearSeries', async () => {
    await SeriesAPI.clearSeries()
    expect(App.ClearSeries).toHaveBeenCalled()
  })

  it('getChapterNavigation returns navigation', async () => {
    App.GetChapterNavigation.mockResolvedValue({
      prevChapter: null, nextChapter: null, seriesName: 'Naruto', chapterIndex: 0, totalChapters: 10,
    })
    const result = await SeriesAPI.getChapterNavigation('/path')
    expect(result?.seriesName).toBe('Naruto')
  })
})

describe('ThumbnailAPI', () => {
  it('getThumbnail returns data URL', async () => {
    App.GetThumbnail.mockResolvedValue('data:image/jpg')
    expect(await ThumbnailAPI.getThumbnail('/path')).toBe('data:image/jpg')
  })

  it('setThumbnailsPaused calls SetThumbnailsPaused', () => {
    ThumbnailAPI.setThumbnailsPaused(true)
    expect(App.SetThumbnailsPaused).toHaveBeenCalledWith(true)
  })
})

describe('ColorizerAPI', () => {
  it('getStatus returns status', async () => {
    App.ColorizerGetStatus.mockResolvedValue({ status: 'installing', percent: 50 })
    const result = await ColorizerAPI.getStatus()
    expect(result?.percent).toBe(50)
  })

  it('install calls ColorizerInstall', async () => {
    await ColorizerAPI.install()
    expect(App.ColorizerInstall).toHaveBeenCalled()
  })

  it('startServer calls ColorizerStartServer', async () => {
    await ColorizerAPI.startServer()
    expect(App.ColorizerStartServer).toHaveBeenCalled()
  })

  it('stopServer calls ColorizerStopServer', async () => {
    await ColorizerAPI.stopServer()
    expect(App.ColorizerStopServer).toHaveBeenCalled()
  })

  it('restartServer calls ColorizerRestartServer', async () => {
    await ColorizerAPI.restartServer()
    expect(App.ColorizerRestartServer).toHaveBeenCalled()
  })

  it('isRunning returns boolean', async () => {
    App.ColorizerIsRunning.mockResolvedValue(true)
    expect(await ColorizerAPI.isRunning()).toBe(true)
  })

  it('isInstalled returns boolean', async () => {
    App.ColorizerIsInstalled.mockResolvedValue(true)
    expect(await ColorizerAPI.isInstalled()).toBe(true)
  })

  it('healthCheck returns boolean', async () => {
    App.ColorizerHealthCheck.mockResolvedValue(true)
    expect(await ColorizerAPI.healthCheck()).toBe(true)
  })

  it('colorizeImage returns response', async () => {
    App.ColorizeImage.mockResolvedValue({ image: 'data:image/png', success: true })
    const result = await ColorizerAPI.colorizeImage('/path', true, false, false, 0, 2)
    expect(result?.success).toBe(true)
  })

  it('loadImageAsBase64 returns data', async () => {
    App.LoadImageAsBase64.mockResolvedValue('data:image/jpg')
    expect(await ColorizerAPI.loadImageAsBase64('/path')).toBe('data:image/jpg')
  })

  it('saveColorizedImage returns path', async () => {
    App.SaveColorizedImage.mockResolvedValue('/output/file.png')
    const result = await ColorizerAPI.saveColorizedImage('data:', 'file.png')
    expect(result).toBe('/output/file.png')
  })

  it('saveMultipleColorizedImages returns paths', async () => {
    App.SaveMultipleColorizedImages.mockResolvedValue(['/out/1.png'])
    const result = await ColorizerAPI.saveMultipleColorizedImages([{ base64Data: 'data:', fileName: '1.png' }])
    expect(result).toEqual(['/out/1.png'])
  })

  it('saveColorizedImageAuto returns path', async () => {
    App.SaveColorizedImageAuto.mockResolvedValue('/auto/file.png')
    const result = await ColorizerAPI.saveColorizedImageAuto('data:', 'file.png', '/orig/file.jpg')
    expect(result).toBe('/auto/file.png')
  })

  it('saveMultipleColorizedImagesAuto returns paths', async () => {
    App.SaveMultipleColorizedImagesAuto.mockResolvedValue(['/auto/1.png'])
    const result = await ColorizerAPI.saveMultipleColorizedImagesAuto([{ base64Data: 'data:', fileName: '1.png' }], ['/orig/1.jpg'])
    expect(result).toEqual(['/auto/1.png'])
  })
})

describe('AppAPI', () => {
  it('clearAllData calls ClearAllData', async () => {
    await AppAPI.clearAllData()
    expect(App.ClearAllData).toHaveBeenCalled()
  })

  it('getLocalNetworkServerStatus returns boolean', async () => {
    App.GetLocalNetworkServerStatus.mockResolvedValue(true)
    expect(await AppAPI.getLocalNetworkServerStatus()).toBe(true)
  })

  it('toggleLocalNetworkServer calls ToggleLocalNetworkServer', async () => {
    App.ToggleLocalNetworkServer.mockResolvedValue(undefined)
    await AppAPI.toggleLocalNetworkServer(true)
    expect(App.ToggleLocalNetworkServer).toHaveBeenCalledWith(true)
  })

  it('getLocalNetworkAddress returns address', async () => {
    App.GetLocalNetworkAddress.mockResolvedValue('192.168.1.100:8080')
    expect(await AppAPI.getLocalNetworkAddress()).toBe('192.168.1.100:8080')
  })
})
