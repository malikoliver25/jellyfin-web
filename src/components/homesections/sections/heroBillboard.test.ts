import { vi } from 'vitest';

vi.mock('components/playback/playbackmanager', () => ({ playbackManager: { play: vi.fn() } }));
vi.mock('components/router/appRouter', () => ({ appRouter: { getRouteUrl: vi.fn(() => '#/details?id=x'), showItem: vi.fn() } }));
vi.mock('components/layoutManager', () => ({ default: { tv: false } }));
vi.mock('lib/globalize', () => ({ default: { translate: (k: string) => k } }));
vi.mock('lib/jellyfin-apiclient/ServerConnections', () => ({ default: { getApi: vi.fn() } }));
vi.mock('utils/query/queryClient', () => ({ queryClient: { fetchQuery: vi.fn() } }));

import { describe, expect, it } from 'vitest';

import { escapeHtml, getBadges } from './heroBillboard';

describe('escapeHtml', () => {
    it('escapes html-significant characters', () => {
        expect(escapeHtml('<b>"A & B"</b>')).toBe('&lt;b&gt;&quot;A &amp; B&quot;&lt;/b&gt;');
    });
});

describe('getBadges', () => {
    it('adds 4K badge for wide video streams', () => {
        const html = getBadges({ MediaStreams: [ { Type: 'Video', Width: 3840 } ] });
        expect(html).toContain('4K');
    });

    it('adds HDR badge for non-SDR video range', () => {
        const html = getBadges({ MediaStreams: [ { Type: 'Video', VideoRange: 'HDR' as never } ] });
        expect(html).toContain('HDR');
    });

    it('adds rating and year badges', () => {
        const html = getBadges({ OfficialRating: 'PG-13', ProductionYear: 2024 });
        expect(html).toContain('PG-13');
        expect(html).toContain('2024');
    });

    it('escapes a malicious rating string', () => {
        const html = getBadges({ OfficialRating: '<script>' });
        expect(html).not.toContain('<script>');
        expect(html).toContain('&lt;script&gt;');
    });

    it('returns empty string when no badgeable fields', () => {
        expect(getBadges({})).toBe('');
    });
});
