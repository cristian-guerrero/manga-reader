export namespace main {
	
	export class FolderInfo {
	    path: string;
	    name: string;
	    imageCount: number;
	    coverImage: string;
	    lastModified: string;
	
	    static createFrom(source: any = {}) {
	        return new FolderInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.imageCount = source["imageCount"];
	        this.coverImage = source["coverImage"];
	        this.lastModified = source["lastModified"];
	    }
	}
	export class ImageInfo {
	    path: string;
	    name: string;
	    extension: string;
	    size: number;
	    index: number;
	
	    static createFrom(source: any = {}) {
	        return new ImageInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.extension = source["extension"];
	        this.size = source["size"];
	        this.index = source["index"];
	    }
	}

}

export namespace persistence {
	
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
	export class LibraryEntry {
	    id: string;
	    folderPath: string;
	    folderName: string;
	    totalImages: number;
	    addedAt: string;
	    coverImage?: string;
	
	    static createFrom(source: any = {}) {
	        return new LibraryEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.folderPath = source["folderPath"];
	        this.folderName = source["folderName"];
	        this.totalImages = source["totalImages"];
	        this.addedAt = source["addedAt"];
	        this.coverImage = source["coverImage"];
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
	    }
	}

}

