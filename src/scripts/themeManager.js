import Events from 'utils/events';
import { EventType } from 'constants/eventType';

import { getDefaultTheme, getThemes as getConfiguredThemes } from './settings/webSettings';

let currentThemeId;

function getThemes() {
    return getConfiguredThemes();
}

function getThemeStylesheetInfo(id) {
    return getThemes().then(themes => {
        let theme;

        if (id) {
            theme = themes.find(currentTheme => {
                return currentTheme.id === id;
            });
        }

        if (!theme) {
            theme = getDefaultTheme();
        }

        return theme;
    });
}

function setTheme(id) {
    return new Promise(function (resolve) {
        if (currentThemeId && currentThemeId === id) {
            resolve();
            return;
        }

        getThemeStylesheetInfo(id).then(function (info) {
            if (currentThemeId && currentThemeId === info.id) {
                resolve();
                return;
            }

            currentThemeId = info.id;

            // Smooth cross-fade: allow color/background transitions for one frame, then suppress again
            const root = document.documentElement;
            const style = document.createElement('style');
            style.id = 'theme-transition';
            style.textContent = '* { transition: background-color .45s ease, color .45s ease, border-color .45s ease, box-shadow .45s ease !important; }';
            root.appendChild(style);
            window.setTimeout(() => style.remove(), 500);

            // set the theme attribute for mui
            root.setAttribute('data-theme', info.id);

            // set the meta theme color
            document.getElementById('themeColor').content = info.color;

            Events.trigger(document, EventType.THEME_CHANGE, [ info.id ]);
        });
    });
}

export default {
    getThemes,
    setTheme
};
