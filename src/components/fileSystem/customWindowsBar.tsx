import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

//  Tray icons
import MinimizeWindowIcon from '../../images/window-minimize-solid-full.svg';
import SettingsIcon from '../../images/settings-svgrepo-com.svg';
import FullscreenWindowIcon from '../../images/maximize.svg';
import TabWindowIcon from '../../images/minimize.svg'
import CloseWindowIcon from '../../images/x.svg';
import AppLogo from '../../images/logo.svg';

export default function CustomWindowsBar() {

    const appWindow = getCurrentWindow();
    const [isMaximized, setIsMaximized] = useState<boolean>();

    useEffect(() => {
        if(isMaximized === null || isMaximized === undefined) {
            getMaximizedStatus();
        }

        let unlisten: any = undefined;

        const listen_window_resize = async() => {
            unlisten = await appWindow.onResized(() => {
                getMaximizedStatus();
            });
        };

        listen_window_resize();
        return () => unlisten && unlisten();         
    }, []);

    async function getMaximizedStatus() {
        let m: boolean = await appWindow.isMaximized();
        // console.log(isMaximized + "  - in function -  " + m);
        if(m === false) {
            setIsMaximized(false);
        }
        else {
            setIsMaximized(true);
        }        
    }

    return(
        <div className="titlebar">
            <div data-tauri-drag-region></div>
            <div className="logo"><img src={AppLogo} className="window-logo"/></div>
            <div className="controls">
                <Link to="/settings" className="" id="titlebar-settings" title="settings">
                    <img src={SettingsIcon} />
                </Link>
                <button className="" id="titlebar-minimize" title="minimize" onClick={() => appWindow.minimize()}>
                    <img src={MinimizeWindowIcon} />
                </button>
                <button id="titlebar-maximize" title="maximize" className="border" onClick={() => { setIsMaximized(!isMaximized); appWindow.toggleMaximize(); }}>
                    {isMaximized === false && <img src={FullscreenWindowIcon} />}
                    {isMaximized === true && <img src={TabWindowIcon} />}
                </button>
                <button id="titlebar-close" title="close" onClick={() => appWindow.close()}>
                    <img src={CloseWindowIcon} />
                </button>
            </div>
        </div>
    );
}