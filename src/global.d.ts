export declare global {
    import { ApiClient, Events } from 'jellyfin-apiclient';
    import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
    import type { DeviceProfile } from '@jellyfin/sdk/lib/generated-client/models/device-profile';
    import type { ServerDiscoveryInfo } from '@jellyfin/sdk/lib/generated-client/models/server-discovery-info';
    import type { UserDto } from '@jellyfin/sdk/lib/generated-client/models/user-dto';
    import type { LayoutMode } from 'constants/layoutMode';

    interface NativeShellDeviceProfileOptions {
        audioChannels?: number;
        disableHlsVideoAudioCodecs?: string[];
        disableVideoAudioCodecs?: string[];
        enableHls?: boolean;
        enableMkvProgressive?: boolean;
        enablePgsRender?: boolean;
        enableSsaRender?: boolean;
        globalMaxVideoBitrate?: number;
        isRetry?: boolean;
        maxVideoWidth?: number;
        supportsDolbyAtmos?: boolean | null;
        supportsDolbyVision?: boolean | null;
        supportsDts?: boolean | null;
        supportsHdr10?: boolean | null;
        supportsHevc?: boolean;
        supportsHlg?: boolean | null;
        supportsMp2VideoAudio?: boolean;
        supportsTrueHd?: boolean;
    }

    type NativeShellDeviceProfileBuilder = (
        options?: NativeShellDeviceProfileOptions
    ) => DeviceProfile;

    interface NativeShellDownloadItem {
        url: string;
        filename?: string;
        item?: BaseItemDto;
        itemId?: string;
        serverId?: string;
        shareUrl?: string;
        title?: string;
    }

    interface NativeShellMediaInfo {
        action: string;
        album?: string;
        artist?: string;
        canSeek: boolean;
        duration: number;
        imageUrl?: string | null;
        isLocalPlayer: boolean;
        isPaused: boolean;
        itemId?: string | null;
        position: number;
        title?: string;
    }

    interface NativeShellAppInfo {
        appName?: string;
        appVersion?: string;
        deviceId?: string;
        deviceName?: string;
    }

    interface NativeShellScreen {
        height: number;
        width: number;
    }

    interface NativeShellAppHost {
        appName?(): string;
        appVersion?(): string;
        deviceId?(): string;
        deviceName?(): string;
        exit?(): void;
        getDefaultLayout(): LayoutMode;
        getDeviceProfile(
            profileBuilder: NativeShellDeviceProfileBuilder,
            appVersion: string
        ): DeviceProfile;
        init(): NativeShellAppInfo | Promise<NativeShellAppInfo>;
        screen?(): NativeShellScreen | null;
        supports(command: string): boolean;
    }

    interface NativeShell {
        AppHost: NativeShellAppHost;
        disableFullscreen?(): void;
        downloadFile?(item: NativeShellDownloadItem): void;
        downloadFiles?(items: NativeShellDownloadItem[]): void;
        enableFullscreen?(): void;
        findServers?(timeout: number): Promise<ServerDiscoveryInfo[]>;
        getPlugins(): string[];
        hideMediaSession?(): void;
        onLocalUserSignedIn?(user: UserDto, accessToken: string): void | Promise<void>;
        onLocalUserSignedOut?(logoutInfo: { serverId?: string }): void;
        openClientSettings?(): void;
        openDownloadManager?(): void;
        openUrl?(url: string, target?: string): void;
        selectServer?(): void;
        updateMediaSession?(mediaInfo: NativeShellMediaInfo): void;
        updateVolumeLevel?(volume: number): void;
    }

    interface Window {
        ApiClient: ApiClient;
        Events: Events;
        TaskButton: typeof import('./scripts/taskbutton').default;
        appMode?: string;
        NativeShell?: NativeShell;
        Loading: {
            show();
            hide();
        }
    }

    interface DocumentEventMap {
        'viewshow': CustomEvent;
    }

    const __COMMIT_SHA__: string;
    const __JF_BUILD_VERSION__: string;
    const __PACKAGE_JSON_NAME__: string;
    const __PACKAGE_JSON_VERSION__: string;
    const __USE_SYSTEM_FONTS__: boolean;
    const __WEBPACK_SERVE__: boolean;

    // Minimal Web Speech API types (not in TS lib.dom for this target)
    interface SpeechRecognitionResultItem { readonly transcript: string; }
    interface SpeechRecognitionResult { readonly [index: number]: SpeechRecognitionResultItem; readonly length: number; }
    interface SpeechRecognitionResultList { readonly [index: number]: SpeechRecognitionResult; readonly length: number; }
    interface SpeechRecognitionEvent { readonly results: SpeechRecognitionResultList; }
    interface SpeechRecognition {
        lang: string;
        interimResults: boolean;
        onresult: ((e: SpeechRecognitionEvent) => void) | null;
        onend: (() => void) | null;
        onerror: (() => void) | null;
        start(): void;
        stop(): void;
    }
    interface Window {
        SpeechRecognition?: new () => SpeechRecognition;
        webkitSpeechRecognition?: new () => SpeechRecognition;
    }
}
