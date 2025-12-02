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
import { invoke } from '@tauri-apps/api/core';

interface ScanResults {
    success: number,
    error: number,
    error_dets: ErrorInfo[],
}
interface ErrorInfo {
    file_name: string,
    error_type: string,
}
interface DirectoryInfo {
    dir_path: string
}


export default function CustomWindowsBar() {

    const appWindow = getCurrentWindow();
    const [isMaximized, setIsMaximized] = useState<boolean>();
    

    const [loading, setLoading] = useState<boolean>(false);
    const [scanResults, setScanResults] = useState<ScanResults>();

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

    // Used to scan for updated files or new files on first load
    useEffect(() => {

        async function checkForUpdates() {
            setLoading(true);
            try {
                const scannedFiles = await invoke<ScanResults>('scan_directory');
                // console.log(scannedFiles);
                setScanResults(scannedFiles);
            } catch (err) {
                alert(`Failed to scan folder: ${err}`);
            } finally {
                setLoading(false);
            }
        }
        
        // checkForUpdates();
               
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

            {/* Scanning for new files section */}
            <div className={`scan-container ${loading === true ? "" : "display-none"}`}>
                <span style={{paddingRight: '5px'}}><span className="loader" /> </span>
                <span>Scanning for changes...</span>
            </div>
        </div>
    );
}