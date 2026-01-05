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
	    chapters: persistence.ChapterInfo[];
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
	        this.chapters = this.convertValues(source["chapters"], persistence.ChapterInfo);
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

export namespace struct { Path string "json:\"path\""; ThumbnailURL string "json:\"thumbnailUrl\""; ImageURL string "json:\"imageUrl\""; Name string "json:\"name\""; Extension string "json:\"extension\""; Size int64 "json:\"size\""; Index int "json:\"index\""; ModTime int64 "json:\"modTime\"" } {
	
	export class  {
	    path: string;
	    thumbnailUrl: string;
	    imageUrl: string;
	    name: string;
	    extension: string;
	    size: number;
	    index: number;
	    modTime: number;
	
	    static createFrom(source: any = {}) {
	        return new (source);
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

}

