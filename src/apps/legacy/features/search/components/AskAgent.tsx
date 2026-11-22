import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi, getSearchApi } from '@jellyfin/sdk/lib/utils/api';
import React, { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import { appRouter } from 'components/router/appRouter';
import globalize from 'lib/globalize';

// Stop-word lookup for the tiny local "agent" (static keys → Record, not Set).
// Turns a natural-language query ("action movies from the 90s not watched") into a Jellyfin items query.
const STOP_WORDS: Record<string, true> = {
    a: true, an: true, the: true, and: true, or: true, of: true, in: true, on: true,
    with: true, from: true, to: true, that: true, this: true, it: true, is: true,
    are: true, was: true, were: true, be: true, my: true, your: true, our: true,
    i: true, me: true, we: true, you: true, show: true, find: true, get: true,
    give: true, want: true, like: true, movies: true, movie: true, films: true,
    film: true, shows: true, series: true, something: true, anything: true,
    please: true, about: true
};

const DECADE_RE = /\b(19|20)(\d)0s\b/i;
const UNWATCHED_RE = /\b(not watched|unwatched|haven'?t seen|new)\b/i;
const FAVORITE_RE = /\b(favorite|favourite|favorite(s)?)\b/i;
// Category hints → Jellyfin item types / filters the agent understands.
const CATEGORY_HINTS: Record<string, { kinds: BaseItemKind[]; genre?: string; label: string }> = {
    anime: { kinds: [BaseItemKind.Movie, BaseItemKind.Series], genre: 'Anime', label: 'Anime' },
    manga: { kinds: [BaseItemKind.Book], label: 'Books' },
    music: { kinds: [BaseItemKind.MusicAlbum, BaseItemKind.MusicArtist, BaseItemKind.Audio], label: 'Music' },
    song: { kinds: [BaseItemKind.Audio], label: 'Music' },
    collection: { kinds: [BaseItemKind.BoxSet], label: 'Collections' },
    playlist: { kinds: [BaseItemKind.Playlist], label: 'Playlists' },
    recording: { kinds: [BaseItemKind.Recording], label: 'Recordings' },
    livetv: { kinds: [BaseItemKind.TvChannel], label: 'LiveTV' },
    'live tv': { kinds: [BaseItemKind.TvChannel], label: 'LiveTV' },
    kid: { kinds: [BaseItemKind.Movie, BaseItemKind.Series], genre: 'Kids', label: 'Kids' },
    book: { kinds: [BaseItemKind.Book], label: 'Books' }
};
const GENRE_HINTS: Record<string, string> = {
    action: 'Action', comedy: 'Comedy', horror: 'Horror', thriller: 'Thriller',
    romance: 'Romance', 'sci-fi': 'Science Fiction', scifi: 'Science Fiction',
    fantasy: 'Fantasy', drama: 'Drama', animation: 'Animation', animated: 'Animation',
    documentary: 'Documentary', crime: 'Crime', adventure: 'Adventure', mystery: 'Mystery'
};

interface ParsedQuery {
    searchTerm?: string;
    genres?: string[];
    kinds: BaseItemKind[];
    favoritesOnly: boolean;
    categoryLabel?: string;
    minYear?: number;
    maxYear?: number;
    sortBy?: ItemSortBy;
    sortOrder?: SortOrder;
    dateField?: 'PremiereDate' | 'DateCreated';
    actorName?: string;
    place?: string;
    artistOrigin?: string;
    liveTvQuery?: string;
    liveTvMode?: 'channel' | 'time';
    recommendation: boolean;
    unwatchedOnly: boolean;
}
function parseQuery(raw: string): ParsedQuery {
    const q = raw.toLowerCase();
    const parsed: ParsedQuery = {
        unwatchedOnly: UNWATCHED_RE.test(q),
        favoritesOnly: FAVORITE_RE.test(q),
        recommendation: /\b(recommend|suggest|something like|similar)\b/.test(q),
        kinds: [BaseItemKind.Movie, BaseItemKind.Series, BaseItemKind.MusicAlbum, BaseItemKind.Audio, BaseItemKind.Book, BaseItemKind.Playlist, BaseItemKind.BoxSet, BaseItemKind.Recording, BaseItemKind.TvChannel]
    };

    // category hint (anime / manga / music / collections / kid movies / live tv …)
    const catKey = Object.keys(CATEGORY_HINTS).find(c => q.includes(c));
    if (catKey) {
        const cat = CATEGORY_HINTS[catKey];
        parsed.kinds = cat.kinds;
        parsed.categoryLabel = cat.label;
        if (cat.genre) parsed.genres = [cat.genre];
    }

    const decade = DECADE_RE.exec(q);
    if (decade) {
        const start = parseInt(decade[0].slice(0, 4), 10);
        parsed.minYear = start;
        parsed.maxYear = start + 9;
    }

    const genreWords = Object.keys(GENRE_HINTS).filter(g => q.includes(g)).map(g => GENRE_HINTS[g]);
    if (genreWords.length) parsed.genres = [...new Set([...(parsed.genres ?? []), ...genreWords])];

    if (/\b(best|top|rated|highest)\b/.test(q)) parsed.sortBy = ItemSortBy.CommunityRating;
    else if (/\b(recent|latest|added)\b/.test(q)) parsed.sortBy = ItemSortBy.DateCreated;
    else parsed.sortBy = ItemSortBy.Random;

    const words = q.split(/[^a-z0-9-]+/).filter(w => w.length > 2 && !STOP_WORDS[w] && !GENRE_HINTS[w] && !CATEGORY_HINTS[w] && !DECADE_RE.test(w));
    if (words.length) parsed.searchTerm = words.slice(0, 3).join(' ');
    return parsed;
}

interface AskAgentProps {
    query: string;
    onQueryChange?: (q: string) => void;
}

const AskAgent: FC<AskAgentProps> = ({ query, onQueryChange }) => {
    const { api, user } = useApi();
    const [items, setItems] = useState<BaseItemDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>();
    const [ran, setRan] = useState(false);
    const [degradedNote, setDegradedNote] = useState<string>();
    const [listening, setListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    const recognitionSupported = useMemo(
        () => !!(window.SpeechRecognition || window.webkitSpeechRecognition),
        []
    );

    const parsed = useMemo(() => parseQuery(query), [query]);

    const toggleListening = useCallback(() => {
        const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Ctor) return;
        if (listening) {
            recognitionRef.current?.stop();
            setListening(false);
            return;
        }
        // eslint-disable-next-line compat/compat -- feature-detected via recognitionSupported
        const rec = new Ctor();
        rec.lang = navigator.language;
        rec.interimResults = false; // one final transcript per session — no per-word URL churn
        rec.onresult = (e: SpeechRecognitionEvent) => {
            const text = Array.from(e.results).map(r => r[0].transcript).join(' ');
            onQueryChange?.(text);
        };
        rec.onend = () => setListening(false);
        rec.onerror = () => setListening(false);
        recognitionRef.current = rec;
        rec.start();
        setListening(true);
    }, [listening, onQueryChange]);

    // Stop the mic if the panel unmounts mid-listen
    useEffect(() => () => {
        recognitionRef.current?.stop();
    }, []);

    const run = useCallback(async () => {
        if (!api || !user?.Id || !query.trim()) return;
        setLoading(true);
        setError(undefined);
        setRan(true);
        try {
            const userId = user.Id;
            // Actor intent: resolve the name to a Person id, then filter items by personIds
            let personIds: string[] | undefined;
            if (parsed.actorName) {
                const people = await getLibraryApi(api).getItems({
                    userId,
                    recursive: true,
                    includeItemTypes: [BaseItemKind.Person],
                    searchTerm: parsed.actorName,
                    limit: 5
                });
                personIds = (people.data.Items ?? []).map(p => p.Id).filter((id): id is string => !!id);
            }
            // Place/origin (e.g. "New York", "artist from LA") can't be filtered server-side —
            // degrade to a normal term search and surface a note instead of silent zero results.
            const note = parsed.place || parsed.artistOrigin;
            // 1) exact-ish text match via search hints (fast)
            const hints = parsed.searchTerm ?
                (await getSearchApi(api).getSearchHints({ searchTerm: parsed.searchTerm, userId, limit: 20, includeItemTypes: parsed.kinds })).data.SearchHints ?? [] :
                [];
            // 2) filtered browse query with parsed intent.
            //    release intent → sort by PremiereDate (when the movie/show came out);
            //    added intent → sort by DateCreated (when it was uploaded to the server)
            const result = await getLibraryApi(api).getItems({
                userId,
                recursive: true,
                includeItemTypes: parsed.kinds,
                genres: parsed.genres,
                years: parsed.minYear ? Array.from({ length: (parsed.maxYear ?? parsed.minYear) - parsed.minYear + 1 }, (_, i) => parsed.minYear! + i) : undefined,
                personIds,
                sortBy: [parsed.sortBy ?? ItemSortBy.Random],
                sortOrder: [parsed.sortOrder ?? SortOrder.Descending],
                isPlayed: parsed.unwatchedOnly ? false : undefined,
                isFavorite: parsed.favoritesOnly ? true : undefined,
                searchTerm: parsed.searchTerm,
                limit: 12,
                fields: [ItemFields.Overview, ItemFields.Genres, ItemFields.DateCreated, ItemFields.MediaStreams]
            });
            setDegradedNote(note ? `Note: "${note}" isn't a server-side filter — showing best text matches.` : undefined);
            const hintItems = hints.map(h => h.Id).filter((id): id is string => !!id);
            const hintDetails = hintItems.length ?
                (await getLibraryApi(api).getItems({ userId, ids: hintItems, limit: hintItems.length })).data.Items ?? [] :
                [];
            const merged = [...hintDetails, ...(result.data.Items ?? [])];
            // dedupe by Id
            const seen = new Set<string>();
            setItems(merged.filter(i => i?.Id && !seen.has(i.Id) && seen.add(i.Id)) as BaseItemDto[]);
        } catch (e) {
            console.error('[AskAgent]', e);
            setError(globalize.translate('ErrorDefault'));
        } finally {
            setLoading(false);
        }
    }, [api, user, query, parsed]);

    // Auto-run on query change (search.tsx debounces 500ms before passing query down)
    useEffect(() => {
        if (query.trim()) void run();
    }, [query, run]);

    return (
        <div className='askAgent padded-left padded-right'>
            <div className='askAgentBar'>
                <span className='material-icons' aria-hidden='true'>smart_toy</span>
                <span className='askAgentLabel'>Ask Jellyfin</span>
                <button
                    type='button'
                    className={`emby-button button-flat askAgentMic${listening ? ' listening' : ''}`}
                    aria-label={listening ? 'Stop listening' : 'Voice input'}
                    aria-pressed={listening}
                    onClick={toggleListening}
                    disabled={!recognitionSupported}
                    title={recognitionSupported ? 'Voice input' : 'Voice input not supported in this browser'}
                >
                    <span className='material-icons' aria-hidden='true'>mic</span>
                </button>
                <button type='button' className='emby-button raised button-submit' onClick={run} disabled={loading || !query.trim()}>
                    {loading ? '…' : globalize.translate('Search')}
                </button>
            </div>
            {ran && !loading && !error && (() => {
                const plural = items.length === 1 ? '' : 's';
                const summary = items.length ?
                    `${items.length} result${plural}` :
                    globalize.translate('MessageNothingHere');
                return (
                    <p className='askAgentSummary'>
                        {summary}
                        {parsed.categoryLabel ? ` · ${parsed.categoryLabel}` : ''}
                        {parsed.genres?.length ? ` · ${parsed.genres.join(', ')}` : ''}
                        {parsed.minYear ? ` · ${parsed.minYear}–${parsed.maxYear}` : ''}
                        {parsed.unwatchedOnly ? ' · unwatched' : ''}
                        {parsed.favoritesOnly ? ' · favorites' : ''}
                    </p>
                );
            })()}
            {degradedNote && <p className='askAgentSummary'>{degradedNote}</p>}
            {error && <p className='askAgentError'>{error}</p>}
            {items.length > 0 && (
                <div className='askAgentResults scrollSlider focuscontainer-x'>
                    {items.map(item => (
                        <Link
                            key={item.Id}
                            to={appRouter.getRouteUrl(item)}
                            className='cardBox askAgentCard'
                            title={item.Name ?? ''}
                        >
                            <div className='cardScalable'>
                                <div className='cardPadder' />
                                <div className='cardContent cardImageContainer'>
                                    <span className='cardText'>{item.Name}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AskAgent;
