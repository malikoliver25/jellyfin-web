import { buildCustomColorScheme } from 'themes/utils';

/** Disney+-inspired color scheme: midnight navy gradient base, luminous blue accent. */
const theme = buildCustomColorScheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#4f9cf9',
            dark: '#2f6fd0',
            light: '#7db8ff'
        },
        background: {
            default: '#040714',
            paper: '#1a1d29'
        },
        text: {
            primary: '#f9f9f9',
            secondary: 'rgba(249, 249, 249, 0.7)'
        },
        AppBar: {
            defaultBg: 'rgba(4, 7, 20, 0.92)',
            darkBg: 'rgba(4, 7, 20, 0.6)'
        }
    }
});

export default theme;
