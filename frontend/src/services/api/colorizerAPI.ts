import * as AppBackend from '../../../wailsjs/go/main/App';
import { BaseAPI } from './baseAPI';
import { colorizer, main } from '../../../wailsjs/go/models';

export class ColorizerAPI extends BaseAPI {
  static async getStatus(): Promise<colorizer.InstallProgress | null> {
    return this.callOrNull(
      () => AppBackend.ColorizerGetStatus(),
      { component: 'ColorizerAPI', action: 'getStatus' }
    );
  }

  static async install(): Promise<void> {
    return this.callVoid(
      () => AppBackend.ColorizerInstall(),
      { component: 'ColorizerAPI', action: 'install' }
    );
  }

  static async startServer(): Promise<void> {
    return this.callVoid(
      () => AppBackend.ColorizerStartServer(),
      { component: 'ColorizerAPI', action: 'startServer' }
    );
  }

  static async stopServer(): Promise<void> {
    return this.callVoid(
      () => AppBackend.ColorizerStopServer(),
      { component: 'ColorizerAPI', action: 'stopServer' }
    );
  }

  static async restartServer(): Promise<void> {
    return this.callVoid(
      () => AppBackend.ColorizerRestartServer(),
      { component: 'ColorizerAPI', action: 'restartServer' }
    );
  }

  static async isRunning(): Promise<boolean> {
    return this.callOrFalse(
      () => AppBackend.ColorizerIsRunning(),
      { component: 'ColorizerAPI', action: 'isRunning' }
    );
  }

  static async isInstalled(): Promise<boolean> {
    return this.callOrFalse(
      () => AppBackend.ColorizerIsInstalled(),
      { component: 'ColorizerAPI', action: 'isInstalled' }
    );
  }

  static async healthCheck(): Promise<boolean> {
    return this.callOrFalse(
      () => AppBackend.ColorizerHealthCheck().then(() => true),
      { component: 'ColorizerAPI', action: 'healthCheck' }
    );
  }

  static async colorizeImage(
    path: string,
    colorize: boolean,
    upscale: boolean,
    denoise: boolean,
    denoiseSigma: number,
    upscaleFactor: number,
  ): Promise<colorizer.ColorizeResponse | null> {
    return this.callOrNull(
      () => AppBackend.ColorizeImage(path, colorize, upscale, denoise, denoiseSigma, upscaleFactor),
      {
        component: 'ColorizerAPI',
        action: 'colorizeImage',
        details: { path, colorize, upscale, denoise, denoiseSigma, upscaleFactor }
      }
    );
  }

  static async loadImageAsBase64(path: string): Promise<string | null> {
    return this.callOrNull(
      () => AppBackend.LoadImageAsBase64(path),
      { component: 'ColorizerAPI', action: 'loadImageAsBase64', details: { path } }
    );
  }

  static async saveColorizedImage(base64Data: string, fileName: string): Promise<string | null> {
    return this.callOrNull(
      () => AppBackend.SaveColorizedImage(base64Data, fileName),
      { component: 'ColorizerAPI', action: 'saveColorizedImage', details: { fileName } }
    );
  }

  static async saveMultipleColorizedImages(items: { base64Data: string; fileName: string }[]): Promise<string[] | null> {
    const reqs = items.map(i => {
      const r = new main.SaveImageRequest();
      r.base64Data = i.base64Data;
      r.fileName = i.fileName;
      return r;
    });
    return this.callOrNull(
      () => AppBackend.SaveMultipleColorizedImages(reqs),
      { component: 'ColorizerAPI', action: 'saveMultipleColorizedImages' }
    );
  }

  static async saveColorizedImageAuto(base64Data: string, fileName: string, originalPath: string): Promise<string | null> {
    return this.callOrNull(
      () => AppBackend.SaveColorizedImageAuto(base64Data, fileName, originalPath),
      {
        component: 'ColorizerAPI',
        action: 'saveColorizedImageAuto',
        details: { fileName, originalPath }
      }
    );
  }

  static async saveMultipleColorizedImagesAuto(
    items: { base64Data: string; fileName: string }[],
    sourcePaths: string[],
  ): Promise<string[] | null> {
    const reqs = items.map(i => {
      const r = new main.SaveImageRequest();
      r.base64Data = i.base64Data;
      r.fileName = i.fileName;
      return r;
    });
    return this.callOrNull(
      () => AppBackend.SaveMultipleColorizedImagesAuto(reqs, sourcePaths),
      { component: 'ColorizerAPI', action: 'saveMultipleColorizedImagesAuto' }
    );
  }

  static async selectFolder(): Promise<string | null> {
    return this.callOrNull(
      () => AppBackend.SelectFolder(),
      { component: 'ColorizerAPI', action: 'selectFolder' }
    );
  }

  static async resolveFolder(path: string): Promise<string> {
    return this.call(
      () => AppBackend.ResolveFolder(path),
      { component: 'ColorizerAPI', action: 'resolveFolder', details: { path }, defaultValue: path }
    );
  }

  static async exploreFolder(path: string, sortMode = '', sortOrder = 'asc'): Promise<any[]> {
    return this.callOrEmpty(
      () => AppBackend.ExploreFolder(path, sortMode, sortOrder),
      { component: 'ColorizerAPI', action: 'exploreFolder', details: { path, sortMode, sortOrder } }
    );
  }
}
