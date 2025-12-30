// Core Libraries
import { openUrl } from '@tauri-apps/plugin-opener';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from "react";
import SimpleBar from 'simplebar-react';

import { DirectoryInfo } from '../globalValues';

// Images
import CheckIcon from '../images/circle-check-regular-full.svg';
import ErrorIcon from '../images/circle-xmark-regular-full.svg';
import BackupIcon from '../images/shield-halved-solid-full.svg';
import DatabaseIcon from '../images/database-solid-full.svg';
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

// Add function to remove all entries if the list is emptied
// Add an "Are you sure" message to let the user know all the music will be gone
// Get restore feature working (It can't replace files right now)

export default function Settings() {

    const [loading, setLoading] = useState<boolean>(false);
    const [showResults, setShowResults] = useState<boolean>(false);
    const [directoryList, setDirectoryList] = useState<DirectoryInfo[]>([]);
    const [scanResults, setScanResults] = useState<ScanResults>();

    const [themeColor, setThemeColor] = useState<string>(localStorage.getItem('theme') !== null ? localStorage.getItem('theme')! : "red");


    async function scanMusic() {
        setLoading(true);
        localStorage.setItem("folder-scan", JSON.stringify(true));
        try {
            const scannedFiles = await invoke<ScanResults>('scan_directory');
            console.log(scannedFiles);
            setScanResults(scannedFiles);
        }
        catch (err) {
            alert(`Failed to scan folder: ${err}`);
            localStorage.setItem("folder-scan", JSON.stringify(false));
        }
        finally {
            setLoading(false);
            // Show the popup with the results for 3 seconds
            setShowResults(true);
            setTimeout(() => {
                setShowResults(false);
            }, 5000);
            localStorage.setItem("folder-scan", JSON.stringify(false));
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
            // console.log(directory_list);
            if(directoryList !== null) {
                setDirectoryList(directory_list);
            }            
        }
        catch (err) {
            alert(`Failed find any directories: ${err}`);
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
    async function remove_directory(value: string) {
        setDirectoryList(directoryList.filter(item => item.dir_path !== value));
        await invoke("remove_directory", { directory_name: value })
    }

    function setTheme(theme: string) {
        setThemeColor(theme);
        document.querySelector('body')?.setAttribute("data-theme", theme);
        localStorage.setItem('theme', theme);
    }

    async function backupData() {
        try{
            const res = await invoke("create_backup");
            console.log(res);
        }
        catch(e) {
            console.log(e);
        }
    }
    async function restoreData() {
        try{
            const res = await invoke("use_restore");
            console.log(res);
        }
        catch(e) {
            console.log(e);
        }
    }

    // Get the list of directories on load
    useEffect(() => {
        const isScanOnging = JSON.parse(localStorage.getItem("folder-scan")!);
        if(isScanOnging === true) {
            setLoading(false); // Rework this method
        }
        getDirectories();
    }, []);

    useEffect(() => {
        // Load the new playlist from the backend

        const unlisten_scan_started = listen("scan-started", () => { console.log("scan started"); setLoading(true); });
        const unlisten_scan_finished = listen("scan-finished", () => { console.log("scan ended"); setLoading(false); });
        
        return () => {
            unlisten_scan_started.then(f => f());
            unlisten_scan_finished.then(f => f());
        }        
    }, []);


    return(
        <SimpleBar forceVisible="y" autoHide={false} className="scrollbar-settings-content" >

            {(showResults === true && scanResults !== undefined) &&
                <ErrorPopup success={scanResults.success} updated={scanResults.updated} error={scanResults.error} error_dets={scanResults.error_dets} type={0} />
            }
            {(showResults === true && scanResults === undefined) &&
                <ErrorPopup success={0} updated={0} error={1} error_dets={null} type={1} />
            }
            <div className="settings-section">
                <span className="header-font font-3">Folders to Scan</span>
                <p className="sub-font font-0">Select the folders that have your music</p>
                {directoryList.map((dir, i) => {
                    return(
                        <div className="directory-padding" key={i} >
                            <span className={`directory-container d-flex justify-content-between header-font ${loading ? "disabled" : ""}`}>
                                <span className="line-clamp-1">{dir.dir_path}</span>
                                <span className="remove-directory" onClick={() => remove_directory(dir.dir_path)}>X</span>
                            </span>
                        </div>
                    );
                })}

                {/* Buttons to add folders and scan for music */}
                <div className="directory-padding">
                    <button className="white header-font" onClick={addDirectory} disabled={loading}>+ Add Folder</button>
                </div>

                <div>
                    <button className="white header-font d-flex" onClick={scanMusic} disabled={loading || directoryList.length === 0}>
                        {loading === true && <span style={{paddingRight: '5px'}}><span className="loader" /> </span>}
                        <span>Scan Music</span>
                    </button>
                </div>
            </div>

            <div className="settings-section theme-container">
                <div className="header-font font-3" style={{marginBottom: '15px'}}>Choose Theme</div>
                {/* Update to dropdown */}
                <select name="themes" id={`theme-${themeColor}`} value={themeColor} onChange={(e) => setTheme(e.target.value)} >
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
                <div className="header-font font-3 sub-font" style={{marginBottom: '5px'}}>Data Backup/Restore (Not implemented yet)</div>
                <div className="sub-font font-0" style={{marginBottom: '10px'}}>Backup and Restore all your data on Robintuk, including your playlists</div>

                <div className="grid-10">
                    <span className="section-1" style={{marginRight: '20px'}}>
                        <button className="white vertical-centered font-1 header-font" onClick={backupData}>
                            <img src={BackupIcon} alt="icon" />&nbsp;Backup
                        </button>
                    </span>
                    <span className="section-1">
                        <button className="white vertical-centered font-1 header-font" onClick={restoreData}>
                            <img src={DatabaseIcon} alt="icon" />&nbsp;Restore
                        </button>
                    </span>
                </div>
            </div>

            {/* About */}
            <div className="settings-section">
                <div className="header-font font-3">About</div>

                <div><img src={logo} alt={"logo"} style={{height: '160px', width: '160px'}}/></div>
                <div className="header-font">Robintuk v0.1.4 <span className="sub-font font-0">&#169; 2025 VulshokBersrker</span></div>
                <div className="sub-font font-0">Open Source Music Player</div>    
                <div>
                    <button
                        className="white"
                        onClick={() => openUrl("https://github.com/VulshokBersrker/robintuk_player")}
                    >
                        View Github
                    </button>
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

const ErrorPopup = ({success, error, updated, type}: Props) => {    

    // 0 - Directory Scan
    if(type === 0) {
        console.log("Scanned " + (error + success + updated) + " songs - " + (success) + " songs added - "+ (updated) + " songs updated - " + (error) + " songs had errors");
        if(error !== 0) {
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
        
    
}