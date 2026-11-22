import React, { type FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

/** Toolbar shortcut to the Ask Jellyfin agent on the search page. */
const AskButton: FC = () => {
    const location = useLocation();
    const isSearchPath = location.pathname === '/search';

    return (
        <Tooltip title='Ask Jellyfin'>
            <IconButton
                size='large'
                aria-label='Ask Jellyfin'
                color='inherit'
                component={Link}
                disabled={isSearchPath}
                to='/search'
            >
                <SmartToyIcon />
            </IconButton>
        </Tooltip>
    );
};

export default AskButton;
