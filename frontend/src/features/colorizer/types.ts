export interface ColorizeSettings {
  colorize: boolean;
  upscale: boolean;
  denoise: boolean;
  upscaleFactor: 2 | 4;
  denoiseSigma: number;
}

export interface DownloadItem {
  base64Data: string;
  fileName: string;
  originalPath: string;
}

export interface DownloadState {
  status: "idle" | "saving" | "success" | "error" | "cancelled";
  message: string;
  savedFiles: string[];
  progress: { current: number; total: number };
}
