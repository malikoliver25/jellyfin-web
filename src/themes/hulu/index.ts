import { buildCustomColorScheme } from 'themes/utils';

/** Hulu-inspired color scheme: obsidian dark, emerald accent. */
const theme = buildCustomColorScheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#1ce783',
            dark: '#0ea85c',
            light: '#5cf0ab'
        },
        background: {
            default: '#0b0c0f',
            paper: '#16181d'
        },
        text: {
            primary: '#ffffff',
            secondary: 'rgba(255, 255, 255, 0.7)'
        },
        AppBar: {
            defaultBg: 'rgba(11, 12, 15, 0.92)',
            darkBg: 'rgba(11, 12, 15, 0.65)'
        }
    }
});

export default theme;
