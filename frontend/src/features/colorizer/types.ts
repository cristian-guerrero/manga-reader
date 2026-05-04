/**
 * Colorizer types
 */

export type InstallStatus =
    | 'not_installed'
    | 'downloading_python'
    | 'downloading_backend'
    | 'installing_deps'
    | 'installing'
    | 'ready'
    | 'starting_server'
    | 'running'
    | 'error'
    | 'stopping';

export interface InstallProgress {
    status: InstallStatus;
    message: string;
    percent: number;
    error?: string;
}

export interface ColorizeResponse {
    success: boolean;
    output_path?: string;
    output_base64?: string;
    message?: string;
    processing_ms: number;
}
