import type { Api } from '@jellyfin/sdk/lib/api';

import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { VideoRangeType } from '@jellyfin/sdk/lib/generated-client/models/video-range-type';
import { getImageApi, getLibraryApi } from '@jellyfin/sdk/lib/utils/api';
import type { ApiClient } from 'jellyfin-apiclient';

import { playbackManager } from 'components/playback/playbackmanager';
import { appRouter } from 'components/router/appRouter';
import layoutManager from 'components/layoutManager';
import globalize from 'lib/globalize';
import ServerConnections from 'lib/jellyfin-apiclient/ServerConnections';
import { queryClient } from 'utils/query/queryClient';

const HERO_ROTATION_MS = 12000;
const HERO_TYPES = [ BaseItemKind.Movie, BaseItemKind.Series ];

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getBadges(item: BaseItemDto): string {
    const badges: string[] = [];
    const video = item.MediaStreams?.find(s => s.Type === 'Video');
    if (video?.Width && video.Width >= 3800) badges.push('4K');
    if (item.MediaStreams?.some(s => s.VideoRange && s.VideoRange !== VideoRangeType.Sdr)) badges.push('HDR');
    if (item.OfficialRating) badges.push(escapeHtml(item.OfficialRating));
    if (item.ProductionYear) badges.push(String(item.ProductionYear));
    return badges.map(b => `<span class="heroBadge">${b}</span>`).join('');
}

function getItemImageUrl(api: Api, item: BaseItemDto, imageType: ImageType): string | undefined {
    return getImageApi(api).getItemImageUrl(item, imageType, { maxWidth: imageType === ImageType.Backdrop ? 1920 : 600 });
}

export function loadHeroBillboard(
    elem: HTMLElement,
    apiClient: ApiClient
): void {
    if (layoutManager.tv) return; // TV layout uses focus navigation; a billboard hero is skipped there

    const api = ServerConnections.getApi(apiClient.serverId())!;
    const userId = apiClient.getCurrentUserId();

    const container = document.createElement('div');
    container.className = 'heroBillboard hide';
    elem.prepend(container);

    const fetchHero = () => queryClient.fetchQuery({
        queryKey: [ 'User', userId, 'HeroBillboard' ],
        queryFn: async () => {
            const result = await getLibraryApi(api).getItems({
                userId,
                recursive: true,
                includeItemTypes: HERO_TYPES,
                imageTypes: [ ImageType.Backdrop, ImageType.Logo ],
                sortBy: [ ItemSortBy.Random ],
                sortOrder: [ SortOrder.Ascending ],
                limit: 5,
                fields: [ ItemFields.MediaStreams, ItemFields.Overview, ItemFields.Genres ],
                enableTotalRecordCount: false
            });
            return (result.data.Items ?? []).filter(item => item.BackdropImageTags?.length || item.ImageTags?.Backdrop);
        },
        staleTime: 5 * 60 * 1000
    });

    void fetchHero().then(items => {
        if (!items.length || container.isConnected === false) return;
        renderHero(container, api, apiClient, items);
    }).catch(err => console.error('[heroBillboard]', err));
}

function renderHero(
    container: HTMLElement,
    api: Api,
    apiClient: ApiClient,
    items: BaseItemDto[]
): void {
    let index = 0;
    let timer: number | undefined;

    const paint = (item: BaseItemDto) => {
        const backdropUrl = getItemImageUrl(api, item, ImageType.Backdrop);
        const logoUrl = getItemImageUrl(api, item, ImageType.Logo);
        const detailUrl = appRouter.getRouteUrl(item, apiClient.serverId);

        const rawOverview = item.Overview ?? '';
        const truncated = rawOverview.length > 320 ? rawOverview.slice(0, 320) + '…' : rawOverview;
        const overview = truncated ? escapeHtml(truncated) : '';
        const logoTitle = logoUrl ?
            `<img class="heroLogo" src="${logoUrl}" alt="${escapeHtml(item.Name ?? '')}">` :
            `<h1 class="heroTitle">${escapeHtml(item.Name ?? '')}</h1>`;

        container.style.backgroundImage = backdropUrl ? `url("${backdropUrl}")` : 'none';
        container.innerHTML = `
            <div class="heroGradient"></div>
            <div class="heroContent padded-left padded-right">
                ${logoTitle}
                <div class="heroMeta">${getBadges(item)}</div>
                ${overview ? `<p class="heroOverview">${overview}</p>` : ''}
                <div class="heroActions">
                    <button type="button" class="heroPlay emby-button raised button-submit" aria-label="${globalize.translate('Play')}: ${escapeHtml(item.Name ?? '')}">
                        <span class="material-icons" aria-hidden="true">play_arrow</span>
                        ${globalize.translate('Play')}
                    </button>
                    <a class="heroInfo emby-button button-flat" href="${detailUrl}" aria-label="${globalize.translate('ButtonInfo')}: ${escapeHtml(item.Name ?? '')}">
                        <span class="material-icons" aria-hidden="true">info</span>
                        ${globalize.translate('ButtonInfo')}
                    </a>
                </div>
            </div>
            <div class="heroDots">${items.map((_, i) => `<span class="heroDot${i === index ? ' active' : ''}"></span>`).join('')}</div>
        `;

        container.querySelector('.heroPlay')?.addEventListener('click', () => {
            void playbackManager.play({ items: [ item ] });
        });
        container.querySelector('.heroInfo')?.addEventListener('click', (e) => {
            e.preventDefault();
            appRouter.showItem(item, apiClient.serverId);
        });

        container.classList.remove('hide');
        container.classList.add('heroVisible');
    };

    const next = () => {
        if (!container.isConnected) {
            window.clearInterval(timer);
            return;
        }
        index = (index + 1) % items.length;
        setTimeout(() => {
            paint(items[index]);
            container.querySelectorAll('.heroDot').forEach((d, i) => {
                d.classList.toggle('active', i === index);
            });
        }, 400);
    };

    paint(items[0]);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (items.length > 1 && !reducedMotion) {
        timer = window.setInterval(next, HERO_ROTATION_MS);
        container.addEventListener('mouseenter', () => window.clearInterval(timer));
        container.addEventListener('mouseleave', () => {
            timer = window.setInterval(next, HERO_ROTATION_MS);
        });
    }
}

