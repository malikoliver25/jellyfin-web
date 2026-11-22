import React, { type FC, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import PaletteIcon from '@mui/icons-material/Palette';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import globalize from 'lib/globalize';

import { useThemes } from 'hooks/useThemes';
import { useUserTheme } from 'hooks/useUserTheme';
import { currentSettings } from 'scripts/settings/userSettings';
import themeManager from 'scripts/themeManager';

/** Toolbar button that cycles through the configured themes with a smooth color transition. */
const ThemeCycleButton: FC = () => {
    const location = useLocation();
    const { themes } = useThemes();
    const { theme } = useUserTheme();

    const onClick = useCallback(() => {
        const ids = themes.map(t => t.id);
        if (!ids.length) return;
        const idx = ids.indexOf(theme);
        const next = ids[(idx + 1) % ids.length] ?? ids[0];
        currentSettings.theme(next);
        void themeManager.setTheme(next);
    }, [themes, theme]);

    // hide on the video OSD like the other toolbar buttons
    if (location.pathname === '/video') return null;

    const currentName = themes.find(t => t.id === theme)?.name ?? theme;

    return (
        <Tooltip title={`${globalize.translate('LabelTheme')}: ${currentName}`}>
            <IconButton
                size='large'
                aria-label={`${globalize.translate('LabelTheme')}: ${currentName}`}
                color='inherit'
                onClick={onClick}
            >
                <PaletteIcon />
            </IconButton>
        </Tooltip>
    );
};

export default ThemeCycleButton;
