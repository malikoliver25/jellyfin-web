import { buildCustomColorScheme } from 'themes/utils';

/** Netflix-inspired color scheme: charcoal #141414, crimson accent. */
const theme = buildCustomColorScheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#e50914',
            dark: '#b20710',
            light: '#ff1a25'
        },
        background: {
            default: '#080808',
            paper: '#141414'
        },
        text: {
            primary: '#ffffff',
            secondary: 'rgba(255, 255, 255, 0.65)'
        },
        AppBar: {
            defaultBg: 'rgba(8, 8, 8, 0.92)',
            darkBg: 'rgba(8, 8, 8, 0.65)'
        }
    }
});

export default theme;
