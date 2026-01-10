export namespace downloader {
	
	export class ChapterInfo {
	    ID: string;
	    Name: string;
	    URL: string;
	    Date: string;
	    ScanGroup: string;
	    Language: string;
	
	    static createFrom(source: any = {}) {
	        return new ChapterInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Name = source["Name"];
	        this.URL = source["URL"];
	        this.Date = source["Date"];
	        this.ScanGroup = source["ScanGroup"];
	        this.Language = source["Language"];
	    }
	}
	export class ImageDownload {
	    URL: string;
	    Filename: string;
	    Index: number;
	    Headers: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new ImageDownload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.URL = source["URL"];
	        this.Filename = source["Filename"];
	        this.Index = source["Index"];
	        this.Headers = source["Headers"];
	    }
	}
	export class SiteInfo {
	    SeriesName: string;
	    ChapterName: string;
	    Images: ImageDownload[];
	    SiteID: string;
	    DownloadDelay: number;
	    Type: string;
	    Chapters: ChapterInfo[];
	
	    static createFrom(source: any = {}) {
	        return new SiteInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.SeriesName = source["SeriesName"];
	        this.ChapterName = source["ChapterName"];
	        this.Images = this.convertValues(source["Images"], ImageDownload);
	        this.SiteID = source["SiteID"];
	        this.DownloadDelay = source["DownloadDelay"];
	        this.Type = source["Type"];
	        this.Chapters = this.convertValues(source["Chapters"], ChapterInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace explorer {
	
	export class BaseFolderEntry {
	    path: string;
	    name: string;
	    addedAt: string;
	    isVisible: boolean;
	    hasImages: boolean;
	    thumbnailUrl: string;
	
	    static createFrom(source: any = {}) {
	        return new BaseFolderEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.addedAt = source["addedAt"];
	        this.isVisible = source["isVisible"];
	        this.hasImages = source["hasImages"];
	        this.thumbnailUrl = source["thumbnailUrl"];
	    }
	}
	export class ExplorerEntry {
	    path: string;
	    name: string;
	    isDirectory: boolean;
	    hasImages: boolean;
	    imageCount: number;
	    coverImage: string;
	    thumbnailUrl: string;
	    size: number;
	    lastModified: number;
	
	    static createFrom(source: any = {}) {
	        return new ExplorerEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.isDirectory = source["isDirectory"];
	        this.hasImages = source["hasImages"];
	        this.imageCount = source["imageCount"];
	        this.coverImage = source["coverImage"];
	        this.thumbnailUrl = source["thumbnailUrl"];
	        this.size = source["size"];
	        this.lastModified = source["lastModified"];
	    }
	}

}

export namespace persistence {
	
	export class AddFolderResult {
	    path: string;
	    isSeries: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AddFolderResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.isSeries = source["isSeries"];
	    }
	}
	export class ChapterInfo {
	    path: string;
	    name: string;
	    coverImage: string;
	    imageCount: number;
	
	    static createFrom(source: any = {}) {
	        return new ChapterInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.coverImage = source["coverImage"];
	        this.imageCount = source["imageCount"];
	    }
	}
	export class DownloadJob {
	    id: string;
	    url: string;
	    site: string;
	    seriesName: string;
	    chapterName: string;
	    status: string;
	    progress: number;
	    totalPages: number;
	    error?: string;
	    createdAt: string;
	    completedAt?: string;
	    path: string;
	
	    static createFrom(source: any = {}) {
	        return new DownloadJob(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.url = source["url"];
	        this.site = source["site"];
	        this.seriesName = source["seriesName"];
	        this.chapterName = source["chapterName"];
	        this.status = source["status"];
	        this.progress = source["progress"];
	        this.totalPages = source["totalPages"];
	        this.error = source["error"];
	        this.createdAt = source["createdAt"];
	        this.completedAt = source["completedAt"];
	        this.path = source["path"];
	    }
	}
	export class FolderInfo {
	    path: string;
	    name: string;
	    imageCount: number;
	    coverImage: string;
	    thumbnailUrl?: string;
	    lastModified?: string;
	
	    static createFrom(source: any = {}) {
	        return new FolderInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.imageCount = source["imageCount"];
	        this.coverImage = source["coverImage"];
	        this.thumbnailUrl = source["thumbnailUrl"];
	        this.lastModified = source["lastModified"];
	    }
	}
	export class HistoryEntry {
	    id: string;
	    folderPath: string;
	    folderName: string;
	    lastImage: string;
	    lastImageIndex: number;
	    scrollPosition: number;
	    totalImages: number;
	    lastRead: string;
	
	    static createFrom(source: any = {}) {
	        return new HistoryEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.folderPath = source["folderPath"];
	        this.folderName = source["folderName"];
	        this.lastImage = source["lastImage"];
	        this.lastImageIndex = source["lastImageIndex"];
	        this.scrollPosition = source["scrollPosition"];
	        this.totalImages = source["totalImages"];
	        this.lastRead = source["lastRead"];
	    }
	}
	export class ImageInfo {
	    path: string;
	    thumbnailUrl: string;
	    imageUrl: string;
	    name: string;
	    extension: string;
	    size: number;
	    index: number;
	    modTime: number;
	
	    static createFrom(source: any = {}) {
	        return new ImageInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.thumbnailUrl = source["thumbnailUrl"];
	        this.imageUrl = source["imageUrl"];
	        this.name = source["name"];
	        this.extension = source["extension"];
	        this.size = source["size"];
	        this.index = source["index"];
	        this.modTime = source["modTime"];
	    }
	}
	export class Settings {
	    language: string;
	    theme: string;
	    viewerMode: string;
	    verticalWidth: number;
	    lateralMode: string;
	    readingDirection: string;
	    panicKey: string;
	    lastFolder: string;
	    sidebarCollapsed: boolean;
	    showImageInfo: boolean;
	    preloadImages: boolean;
	    preloadCount: number;
	    enableHistory: boolean;
	    minImageSize: number;
	    processDroppedFolders: boolean;
	    windowWidth: number;
	    windowHeight: number;
	    windowX: number;
	    windowY: number;
	    windowMaximized: boolean;
	    lastPage: string;
	    enabledMenuItems: Record<string, boolean>;
	    downloadPath: string;
	    clipboardAutoMonitor: boolean;
	    autoResumeDownloads: boolean;
	    tabMemorySaving: boolean;
	    restoreTabs: boolean;
	    savedTabs: string;
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.language = source["language"];
	        this.theme = source["theme"];
	        this.viewerMode = source["viewerMode"];
	        this.verticalWidth = source["verticalWidth"];
	        this.lateralMode = source["lateralMode"];
	        this.readingDirection = source["readingDirection"];
	        this.panicKey = source["panicKey"];
	        this.lastFolder = source["lastFolder"];
	        this.sidebarCollapsed = source["sidebarCollapsed"];
	        this.showImageInfo = source["showImageInfo"];
	        this.preloadImages = source["preloadImages"];
	        this.preloadCount = source["preloadCount"];
	        this.enableHistory = source["enableHistory"];
	        this.minImageSize = source["minImageSize"];
	        this.processDroppedFolders = source["processDroppedFolders"];
	        this.windowWidth = source["windowWidth"];
	        this.windowHeight = source["windowHeight"];
	        this.windowX = source["windowX"];
	        this.windowY = source["windowY"];
	        this.windowMaximized = source["windowMaximized"];
	        this.lastPage = source["lastPage"];
	        this.enabledMenuItems = source["enabledMenuItems"];
	        this.downloadPath = source["downloadPath"];
	        this.clipboardAutoMonitor = source["clipboardAutoMonitor"];
	        this.autoResumeDownloads = source["autoResumeDownloads"];
	        this.tabMemorySaving = source["tabMemorySaving"];
	        this.restoreTabs = source["restoreTabs"];
	        this.savedTabs = source["savedTabs"];
	    }
	}
	export class Tab {
	    id: string;
	    title: string;
	    page: string;
	    params: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new Tab(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.page = source["page"];
	        this.params = source["params"];
	    }
	}
	export class TabsData {
	    activeTabId: string;
	    tabs: Tab[];
	
	    static createFrom(source: any = {}) {
	        return new TabsData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.activeTabId = source["activeTabId"];
	        this.tabs = this.convertValues(source["tabs"], Tab);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ViewerState {
	    currentIndex: number;
	    mode: string;
	
	    static createFrom(source: any = {}) {
	        return new ViewerState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.currentIndex = source["currentIndex"];
	        this.mode = source["mode"];
	    }
	}

}

export namespace series {
	
	export class ChapterNavigation {
	    prevChapter?: persistence.ChapterInfo;
	    nextChapter?: persistence.ChapterInfo;
	    seriesPath: string;
	    seriesName: string;
	    chapterIndex: number;
	    totalChapters: number;
	
	    static createFrom(source: any = {}) {
	        return new ChapterNavigation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.prevChapter = this.convertValues(source["prevChapter"], persistence.ChapterInfo);
	        this.nextChapter = this.convertValues(source["nextChapter"], persistence.ChapterInfo);
	        this.seriesPath = source["seriesPath"];
	        this.seriesName = source["seriesName"];
	        this.chapterIndex = source["chapterIndex"];
	        this.totalChapters = source["totalChapters"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ChapterWithURLs {
	    path: string;
	    name: string;
	    coverImage: string;
	    imageCount: number;
	    thumbnailUrl: string;
	
	    static createFrom(source: any = {}) {
	        return new ChapterWithURLs(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.coverImage = source["coverImage"];
	        this.imageCount = source["imageCount"];
	        this.thumbnailUrl = source["thumbnailUrl"];
	    }
	}
	export class SeriesEntryWithURLs {
	    id: string;
	    path: string;
	    name: string;
	    coverImage: string;
	    addedAt: string;
	    isTemporary: boolean;
	    thumbnailUrl: string;
	    chapters: ChapterWithURLs[];
	
	    static createFrom(source: any = {}) {
	        return new SeriesEntryWithURLs(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.path = source["path"];
	        this.name = source["name"];
	        this.coverImage = source["coverImage"];
	        this.addedAt = source["addedAt"];
	        this.isTemporary = source["isTemporary"];
	        this.thumbnailUrl = source["thumbnailUrl"];
	        this.chapters = this.convertValues(source["chapters"], ChapterWithURLs);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

