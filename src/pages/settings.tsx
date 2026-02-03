// Core Libraries
import { openUrl } from '@tauri-apps/plugin-opener';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from "react";
import SimpleBar from 'simplebar-react';

import { DirectoryInfo, PlaylistList } from '../globalValues';

// Images
import CheckIcon from '../images/circle-check-regular-full.svg';
import ErrorIcon from '../images/circle-xmark-regular-full.svg';
import BackupIcon from '../images/shield-halved-solid-full.svg';
import DatabaseIcon from '../images/database-solid-full.svg';
import ImportIcon from '../images/download-solid-full.svg';
import ExportIcon from '../images/upload-solid-full.svg';
import logo from '../images/logo.svg';

interface ScanResults {
    success: number,
    updated: number,
    error: number,
    error_dets: ErrorInfo[] | null,
}
interface ErrorInfo {
    file_name: string,
    error_type: string,
}

interface ScanProgress {
    length: number,
    current: number
}

// Add function to remove all entries if the list is emptied
// Add an "Are you sure" message to let the user know all the music will be gone

export default function Settings() {

    const [loading, setLoading] = useState<boolean>(false);
    const [showResults, setShowResults] = useState<boolean>(false);
    const [directoryList, setDirectoryList] = useState<DirectoryInfo[]>([]);

    const [scanResults, setScanResults] = useState<ScanResults>();
    const [scanLength, setScanLength] = useState<number>(0);
    const [scanCurrent, setScanCurrent] = useState<number>(0);

    const [themeColor, setThemeColor] = useState<string>(localStorage.getItem('theme') !== null ? localStorage.getItem('theme')! : "red");

    const [isBackup, setIsBackup] = useState<boolean>(false);
    const [isRestore, setIsRestore] = useState<boolean>(false);
    const [isBackupRestore, setIsBackupRestore] = useState<boolean>(false);
    const [isReset, setIsReset] = useState<boolean>(false);

    const [playlistList, setPlaylistList] = useState<PlaylistList[]>([]);
    const [exportSelectedPlaylist, setExportSelectedPlaylist] = useState<number>(0);


    // Get the list of directories on load
    useEffect(() => {
        getDirectories();
        getAllPlaylists();
        getTheme();
    }, []);

    // Listeners
    useEffect(() => {
        const unlisten_scan_finished = listen("scan-finished", () => { setLoading(false); setIsBackupRestore(false); setScanCurrent(0); setScanLength(0); });
        const unlisten_scan_progress = listen<ScanProgress>("scan-length", (event) => { setScanCurrent(event.payload.current); setScanLength(event.payload.length); });

        const unlisten_backup_finished = listen("ending-backup", () => { setIsBackup(false); setIsBackupRestore(false); });
        const unlisten_restore_finished = listen("ending-restore", () => { setIsRestore(false); setIsBackupRestore(false); });
        const unlisten_reset_finished = listen("ending-reset", () => { setIsBackupRestore(false); });
        
        return () => {
            unlisten_scan_finished.then(f => f()),
            unlisten_scan_progress.then(f => f()),
            unlisten_backup_finished.then(f => f()),
            unlisten_reset_finished.then(f => f()),
            unlisten_restore_finished.then(f => f());
        }        
    }, []);


    async function scanMusic() {
        setLoading(true);
        setIsBackupRestore(true);
        setScanCurrent(0);
        setScanLength(0)
        try {
            const scannedFiles = await invoke<ScanResults>('scan_directory');
            // console.log(scannedFiles);
            setScanResults(scannedFiles);
        }
        catch(err) {
            console.log(`Failed to scan folder: ${err}`);
            setLoading(false);
            setIsBackupRestore(false);
        }
        finally {
            setLoading(false);
            // Show the popup with the results for 3 seconds
            setScanCurrent(0);
            setScanLength(0);
            setShowResults(true);
            setIsBackupRestore(false);
            setTimeout(() => {
                setShowResults(false);
            }, 5000);
        }
    }

    function updateDirectoryList(value: string) {
        var temp_item: DirectoryInfo = { dir_path: value };
        setDirectoryList([...directoryList, temp_item ]);
    }

    // Rust async commands for the dirs table
    async function getDirectories() {
        try {
            const directory_list = await invoke<DirectoryInfo[]>('get_directory');
            if(directoryList !== null) {
                setDirectoryList(directory_list);
            }            

            const res = await invoke<boolean>('check_for_ongoing_scan');
            setLoading(res);
            setIsBackupRestore(res);

            const res2: number = await invoke<number>('check_for_backup_restore');
            // No Backup or Restore ongoing
            if(res2 === 0) {
                setIsBackup(false);
                setIsRestore(false);
            }
            // There is a Backup ongoing
            else if(res2 === 1) {
                setIsBackup(true);
                setIsBackupRestore(true);
            }
            // There is a Restore ongoing
            else {
                setIsRestore(true);
                setIsBackupRestore(true);
            }
        }
        catch(err) {
            console.log(`Error in getDirectories: ${err}`);
        }
    }
    async function addDirectory() {
        try {
            const folder_path = await open({ multiple: false, directory: true });
            // console.log(folder_path);
            if(folder_path !== null) {
                let dup: boolean = false;
                for(let i = 0; i < directoryList.length; i++) {
                    if(folder_path.includes(directoryList[i].dir_path)) {
                        console.log("subfolder detected - cannot add subfolder to directory list");
                        dup = true;
                    }
                }
                if(dup === false) {
                    updateDirectoryList(folder_path.toString());
                    await invoke("add_directory", { directory_name: folder_path.toString() });
                }
                else {
                    setShowResults(true);
                    setTimeout(() => {
                        setShowResults(false);
                    }, 5000);
                }          
            }            
        }
        catch(err) {
            alert(`Failed to add directories: ${err}`);
        }
    }
    async function removeDirectory(value: string) {
        setDirectoryList(directoryList.filter(item => item.dir_path !== value));
        await invoke("remove_directory", { directory_name: value })
    }

    async function setTheme(theme: string) {
        try {
            setThemeColor(theme);
            document.querySelector('body')?.setAttribute("data-theme", theme);
            localStorage.setItem('theme', theme);
            await invoke('set_theme', { theme_color: theme });
        }
        catch(e) {
            console.log(e);
        }
    }
    async function getTheme() {
        try {
            const res: string = await invoke("get_settings");
            console.log("theme " + res);
            setTheme(res);            
        }
        catch(e) {
            console.log(e);
            setTheme("red");
        }
    }

    async function backupData() {
        try{
            setIsBackup(true);
            setIsBackupRestore(true);
            await invoke("create_backup");
        }
        catch(e) {
            console.log("Error creating backup: ",e);
        }
        finally {
            setIsBackup(false);
            setIsBackupRestore(false);
        }
    }
    async function restoreData() {
        try{
            setIsRestore(true);
            setIsBackupRestore(true);
            const res: boolean = await invoke<boolean>("check_for_backup");
            if(res) {
                await invoke("use_restore");
            }
            else {
                console.log("No backup exists");
            }
        }
        catch(e) {
            console.log("Error restoring from backup: ", e);
        }
        finally {
            setIsRestore(false);
            setIsBackupRestore(false);

            await getDirectories();
            await getTheme();
        }
    }

    async function resetApp() {
        try{
            setIsBackupRestore(true);
            await invoke("reset_database");
        }
        catch(e) {
            console.log("Error reseting database: ", e);
        }
        finally {
            // Reset Theme Color to base Red
            setTheme("red");
            document.querySelector('body')?.setAttribute("data-theme", "red");
            localStorage.setItem('theme', "red");
            setIsReset(false);
        }
    }


    // Playlist Functions

    async function getAllPlaylists() {
        try {
            const playlists: PlaylistList[] = await invoke('get_all_playlists');
            if(playlists.length !== 0) {
                setPlaylistList(playlists);
            }
            else {
                setPlaylistList([]);
            }            
        }
        catch(e) {
            console.log(e);
        }
    }

    async function importPlaylist() {
        try{
            const file = await open({ multiple: false, directory: false, filters: [{name: "Playlist", extensions: ['m3u', 'm3u8']}] });
            if(file !== null) {
                const res = await invoke("import_playlist", { file_path: file });
                console.log(res);
            }  
        }
        catch(e) {
            console.log(e);
        }
    }

    async function exportPlaylist() {
        try{
            const folder_path = await open({ multiple: false, directory: true });
            if(folder_path !== null && exportSelectedPlaylist !== 0) {
                const res = await invoke("export_playlist", { save_file_location: folder_path, playlist_id: exportSelectedPlaylist });  
                console.log(res);
            }
        }
        catch(e) {
            console.log(e);
        }
    }

    return(
        <SimpleBar forceVisible="y" autoHide={false} className="scrollbar-settings-content" >

            {(showResults === true && scanResults !== undefined) &&
                <ErrorPopup success={scanResults.success} updated={scanResults.updated} error={scanResults.error} error_dets={scanResults.error_dets} type={0} />
            }
            {(showResults === true && scanResults === undefined) &&
                <ErrorPopup success={0} updated={0} error={1} error_dets={null} type={1} />
            }
            {(showResults === true && scanResults === undefined) &&
                <ErrorPopup success={0} updated={0} error={1} error_dets={null} type={2} />
            }
            <div className="settings-section">
                <span className="header-font font-3">Folders to Scan</span>
                <p className="sub-font font-0">Select the folders that have your music</p>
                {directoryList.map((dir, i) => {
                    return(
                        <div className="directory-padding" key={i} >
                            <span className={`directory-container d-flex justify-content-between header-font ${loading ? "disabled" : ""} ${isBackupRestore ? "disabled" : ""}`}>
                                <span className="line-clamp-1">{dir.dir_path}</span>
                                <span className="remove-directory" onClick={() => removeDirectory(dir.dir_path)}>X</span>
                            </span>
                        </div>
                    );
                })}

                {/* Buttons to add folders and scan for music */}
                <div className="directory-padding">
                    <button className="white header-font" onClick={addDirectory} disabled={loading || isBackupRestore}>+ Add Folder</button>
                </div>

                <div className="d-flex vertical-centered">
                    <button className="white header-font d-flex" onClick={scanMusic} disabled={loading || directoryList.length === 0 || isBackupRestore}>
                        {loading === true && <span style={{paddingRight: '5px'}}><span className="loader" /> </span>}
                        <span>Scan Music</span>
                    </button>
                    {loading && scanCurrent >= 0 &&
                        <div style={{marginLeft: '10px'}}>
                            <div className="vertical-centered scan-progress">
                                <span style={{width: `${scanCurrent / scanLength * 100}%`}} className="scan-progress-bar" />
                            </div>
                            <span className="font-0 sub-font vertical-centered" style={{float: 'right'}} >
                                {scanCurrent} of {scanLength} -&nbsp;
                                
                                {scanCurrent === 0 && <>{0}</>}
                                {scanCurrent !== 0 && <>{(scanCurrent / scanLength * 100).toFixed(0)}</>}%
                                </span>
                        </div>
                    }                    
                </div>
            </div>

            {/* Theme Picker */}
            <div className="settings-section theme-container">
                <div className="header-font font-3" style={{marginBottom: '15px'}}>Choose Theme</div>
                {/* Update to dropdown */}
                <select 
                    name="themes" id={`theme-${themeColor}`}
                    className="themes"
                    value={themeColor} onChange={(e) => setTheme(e.target.value)}
                    disabled={loading || isBackupRestore}
                >
                    <option value="red" id="theme-red"> Red </option>
                    <option value="blue" id="theme-blue"> Blue </option>
                    <option value="purple" id="theme-purple"> Purple </option>
                    <option value="orange" id="theme-orange"> Orange </option>
                    <option value="green" id="theme-green"> Green </option>
                    <option value="dark-wave" id="theme-dark-wave"> Dark Wave </option>
                </select>
            </div>

            {/* Key Bindings */}
            <div className="settings-section keys-container">
                <div className="header-font font-3">Global Key Bindings</div>

                <div className="grid-20 vertical-centered">
                    <span className="key-binding header-font section-2 text-center">FN + Play</span>
                    <span className="section-8">Toggle Play and Pause Music</span>
                </div>
                <div className="grid-20 vertical-centered">
                    <span className="key-binding header-font section-2 text-center">FN + Previous</span>
                    <span className="section-8">Previous Song</span>
                </div>
                <div className="grid-20 vertical-centered">
                    <span className="key-binding header-font section-2 text-center">FN + Next</span>
                    <span className="section-8">Next Song</span>
                </div>
            </div>

            {/* Backup Restore */}
            <div className="settings-section backup">
                <div className="header-font font-3" style={{marginBottom: '5px'}}>Data Backup/Restore</div>
                <div className="sub-font font-0" style={{marginBottom: '10px'}}>Backup and Restore all your data on Robintuk, including your playlists</div>

                <div className="grid-10">
                    <span className="section-1" style={{marginRight: '20px'}}>
                        <button className="white vertical-centered font-1 header-font" onClick={backupData} disabled={isBackupRestore}>
                            {!isBackup && <img src={BackupIcon} alt="icon" />}
                            {isBackup && <span style={{paddingLeft: '5px', paddingRight: '5px', paddingBottom: '3px', paddingTop: '3px'}}><span className="loader large" /></span>}
                            &nbsp;Backup
                        </button>
                    </span>
                    <span className="section-1">
                        <button className="white vertical-centered font-1 header-font" onClick={restoreData} disabled={isBackupRestore}>
                            {!isRestore && <img src={DatabaseIcon} alt="icon" />}
                            {isRestore && <span style={{paddingLeft: '5px', paddingRight: '5px', paddingBottom: '3px', paddingTop: '3px'}}><span className="loader large" /></span>}
                            &nbsp;Restore
                        </button>
                    </span>
                </div>
            </div>

            {/* Playlists */}
            <div className="settings-section backup">
                <div className="header-font font-3" style={{marginBottom: '5px'}}>Export/Import Playlists</div>
                <div className="sub-font font-0" style={{marginBottom: '10px'}}>Bring over playlists from other apps using .m3u files or export a playlist from Robintuk</div>

                <div className="d-flex">
                    <span className="section-4 d-flex">
                        <select
                            name="playlists" className="playlists"
                            value={exportSelectedPlaylist}
                            onChange={(e) => setExportSelectedPlaylist(parseInt(e.target.value))}
                            disabled={loading || isBackupRestore}
                        >
                            <option value={0} >None</option>
                            {playlistList.map((item, i) => {
                                return(
                                    <option key={i} value={item.id} >{item.name}</option>
                                );
                            })}
                        </select>

                        <div style={{marginLeft: '10px'}}>
                            <button className="white vertical-centered font-1 header-font" onClick={exportPlaylist} disabled={loading || isBackupRestore || exportSelectedPlaylist == 0}>
                                {!isBackup && <img src={ExportIcon} alt="icon" />}
                                {isBackup && <span style={{paddingLeft: '5px', paddingRight: '5px', paddingBottom: '3px', paddingTop: '3px'}}><span className="loader large" /></span>}
                                &nbsp;Export
                            </button>
                        </div>
                    </span>

                    <span className="section-1"  style={{marginLeft: '30px'}}>
                        <button className="white vertical-centered font-1 header-font" onClick={importPlaylist} disabled={loading || isBackupRestore}>
                            {!isRestore && <img src={ImportIcon} alt="icon" />}
                            {isRestore && <span style={{paddingLeft: '5px', paddingRight: '5px', paddingBottom: '3px', paddingTop: '3px'}}><span className="loader large" /></span>}
                            &nbsp;Import
                        </button>
                    </span>
                </div>
            </div>

            {/* About */}
            <div className="settings-section">
                <div className="header-font font-3">About</div>

                <div><img src={logo} alt={"logo"} style={{height: '160px', width: '160px'}}/></div>
                <div className="header-font">Robintuk v0.2.3 <span className="sub-font font-0">&#169; 2025 VulshokBersrker</span></div>
                <div className="sub-font font-0">Open Source Music Player</div>    
                <div>
                    <button
                        className="white"
                        onClick={() => openUrl("https://github.com/VulshokBersrker/robintuk_player")}
                    >
                        View Github
                    </button>

                    <button
                        style={{marginLeft: "50px"}} className="red"
                        disabled={isBackupRestore}
                        onClick={() => { setIsReset(!isReset)}}
                    >
                        Reset
                    </button>


                    <div className={`selection-popup-container grid-20 header-font warning ${isReset ? "open" : "closed"}`}>
                        <div className="section-14" style={{marginLeft: "15px", marginBottom: "0px"}}>Are you sure you want to reset Robintuk?</div>
                        <div className="section-3 position-relative" style={{marginBottom: "0px"}}>
                            <button className="d-flex align-items-center red" onClick={resetApp}>
                                Yes
                            </button>
                        </div>

                        <div className="section-3 position-relative" style={{marginBottom: "0px"}}>
                            <button className="d-flex align-items-center white" onClick={() => setIsReset(false)}>
                                No
                            </button>
                        </div>
                    </div> 
                </div>

            </div>

            <div className="empty-space"></div>
        </SimpleBar>
    );
}


type Props = {
    success: number,
    updated: number,
    error: number,
    error_dets: ErrorInfo[] | null,
    type: number,
};

const ErrorPopup = ({success, error, updated, type, error_dets}: Props) => {    

    // 0 - Directory Scan
    if(type === 0) {
        console.log("Scanned " + (error + success + updated) + " songs - " + (success) + " songs added - "+ (updated) + " songs updated - " + (error) + " songs had errors");
        if(error === 1 && error_dets![0].error_type.includes("ongoing")) {
            return(
                <div className="status-container error d-flex vertical-centered">
                    <span>
                        <img src={ErrorIcon} alt={"ff"} className="scan-status-icon error"/>
                    </span>
                    <span style={{paddingLeft: "10px"}}>
                        <div>A scan is already on going - please wait</div>                    
                    </span>
                </div>
            );
        }
        else if(error !== 0) {
            return(
                <div className="status-container error d-flex vertical-centered">
                    <span>
                        <img src={ErrorIcon} alt={"ff"} className="scan-status-icon error"/>
                    </span>
                    <span style={{paddingLeft: "10px"}}>
                        <div>Folders Scanned</div>
                        <div>Scanned {error + success + updated} songs - {success} songs added - {updated} songs updated - {error} songs had errors</div>                    
                    </span>
                </div>
            );
        }
        else {
            return(
                <div className="status-container success d-flex vertical-centered">
                    <span>
                        <img src={CheckIcon} alt={"ff"} className="scan-status-icon success"/>
                    </span>
                    <span style={{paddingLeft: "10px"}}>
                        <div>Folders Scanned</div>
                        <div>Scanned {error + success + updated} songs - {success} songs added - {updated} songs updated - {error} songs had errors</div>                    
                    </span>
                </div>
            );
        }
    }
    // Duplicate/Subfolder added to directory list
    else if(type === 1) {
        return(
            <div className="status-container error d-flex vertical-centered">
                <span>
                    <img src={ErrorIcon} alt={"ff"} className="scan-status-icon error"/>
                </span>
                <span style={{paddingLeft: "10px"}}>
                    <div>Overlapping Folders Detected</div>
                    <div>Cannot add subfolder to list, files would be scanned twice</div>                    
                </span>
            </div>
        );
    }
    // Backup/Restore Errors
    else if(type === 2) {
        return(
            <div className="status-container error d-flex vertical-centered">
                <span>
                    <img src={ErrorIcon} alt={"ff"} className="scan-status-icon error"/>
                </span>
                <span style={{paddingLeft: "10px"}}>
                    <div>Cannot Restore</div>
                    <div>No Backup File Found</div>                    
                </span>
            </div>
        );
    }
}