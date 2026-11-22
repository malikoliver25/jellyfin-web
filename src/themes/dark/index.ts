import type { ColorSystemOptions } from '@mui/material/styles';
import merge from 'lodash-es/merge';

import { DEFAULT_COLOR_SCHEME } from '../_base/theme';

/** The default "Dark" color scheme. */
const theme = merge<ColorSystemOptions, ColorSystemOptions, ColorSystemOptions>(
    {},
    DEFAULT_COLOR_SCHEME,
    {
        palette: {
            primary: {
                main: '#7b5cff',
                dark: '#5a3fd4',
                light: '#9d85ff',
                contrastText: 'rgba(0, 0, 0, 0.87)'
            },
            secondary: {
                main: '#7b5cff'
            },
            background: {
                default: '#080808',
                paper: '#141414'
            },
            SnackbarContent: {
                bg: '#303030',
                color: 'rgba(255, 255, 255, 0.87)'
            }
        }
    }
);

export default theme;
