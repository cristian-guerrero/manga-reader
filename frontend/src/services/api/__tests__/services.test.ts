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
})

describe('ImageAPI', () => {
  it('getImages returns list', async () => {
    App.GetImages.mockResolvedValue([])
    expect(await ImageAPI.getImages('/path')).toEqual([])
  })
})

describe('LibraryAPI', () => {
  it('getBaseFolders returns folders', async () => {
    App.GetBaseFolders.mockResolvedValue([{ path: '/manga', name: 'Manga', addedAt: '2024', isVisible: true }])
    const result = await LibraryAPI.getBaseFolders()
    expect(result).toHaveLength(1)
  })
})

describe('TabsAPI', () => {
  it('getTabs calls GetTabs', async () => {
    App.GetTabs.mockResolvedValue({ activeTabId: 't1', tabs: [] })
    const result = await TabsAPI.getTabs()
    expect(result?.activeTabId).toBe('t1')
  })
})

describe('ViewerStateAPI', () => {
  it('saveViewerState calls SaveViewerState', async () => {
    await ViewerStateAPI.saveViewerState('/path', 0, 80, 0)
    expect(App.SaveViewerState).toHaveBeenCalledWith('/path', 0, 80, 0)
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
})

describe('LibraryManagerAPI', () => {
  it('getLibraries returns list', async () => {
    App.GetLibraries.mockResolvedValue([{ id: '1', name: 'Default', filename: 'db.db', isDefault: true }])
    const result = await LibraryManagerAPI.getLibraries()
    expect(result).toHaveLength(1)
  })
})

describe('FolderViewModeAPI', () => {
  it('setFolderViewMode calls SetFolderViewMode', async () => {
    await FolderViewModeAPI.setFolderViewMode('/path', 'grid')
    expect(App.SetFolderViewMode).toHaveBeenCalledWith('/path', 'grid')
  })
})

describe('FolderGridSizeAPI', () => {
  it('getFolderGridSize returns number', async () => {
    App.GetFolderGridSize.mockResolvedValue(200)
    expect(await FolderGridSizeAPI.getFolderGridSize('/path')).toBe(200)
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
})

describe('ImageOrderAPI', () => {
  it('hasCustomOrder returns boolean', async () => {
    App.HasCustomOrder.mockResolvedValue(false)
    expect(await ImageOrderAPI.hasCustomOrder('/path')).toBe(false)
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
})

describe('ThumbnailAPI', () => {
  it('getThumbnail returns data URL', async () => {
    App.GetThumbnail.mockResolvedValue('data:image/jpg')
    expect(await ThumbnailAPI.getThumbnail('/path')).toBe('data:image/jpg')
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
})
