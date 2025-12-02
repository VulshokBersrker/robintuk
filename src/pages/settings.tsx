import { useEffect, useState } from "react";
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

import CheckIcon from '../images/circle-check-regular-full.svg';
import ErrorIcon from '../images/circle-xmark-regular-full.svg';
import ThemeOptions from "../components/themeOptions";

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

// Add check to remove any directories that are child folders of other already inputted directories

// Disable the scan button if the dirs are empty

export default function Settings() {

    const [loading, setLoading] = useState<boolean>(false);
    const [showResults, setShowResults] = useState<boolean>(false);

    const [directoryList, setDirectoryList] = useState<DirectoryInfo[]>([]);

    const [scanResults, setScanResults] = useState<ScanResults>();


    async function scanMusic() {
        setLoading(true);
        try {
            const scannedFiles = await invoke<ScanResults>('scan_directory');
            // console.log(scannedFiles);
            setScanResults(scannedFiles);
        } catch (err) {
            alert(`Failed to scan folder: ${err}`);
        } finally {
            setLoading(false);
            // Show the popup with the results for 3 seconds
            setShowResults(true);
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
    async function get_directories() {
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
    async function add_directory() {
        try {
            const folder_path = await open({ multiple: false, directory: true });
            // console.log(folder_path);
            if(folder_path !== null) {
                updateDirectoryList(folder_path.toString());
                await invoke("add_directory", { directory_name: folder_path.toString() });
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

    // Get the list of directories on load
    useEffect(() => {
        get_directories();
    }, []);


    return(
        <main className="container">
            {(showResults === true && scanResults !== undefined) && <ScanResultsPopup success={scanResults.success} error={scanResults.error} error_dets={scanResults.error_dets} />}
            <div className="">
                <span className="header-font font-3">Folders to Scan</span>
                <p className="font-1">Select the folders that have your music</p>
                {directoryList.map((dir, i) => {
                    return(
                        <div className="directory-padding" key={i} >
                            <span className={`directory-container d-flex justify-content-between header-font ${loading ? "disabled" : ""}`}>
                                <span>{dir.dir_path}</span>
                                <span className="remove-directory" onClick={() => remove_directory(dir.dir_path)}>X</span>
                            </span>
                        </div>
                    );
                })}

                {/* Buttons to add folders and scan for music */}
                <div className="directory-padding">
                    <button className="scan-folder-button header-font" onClick={add_directory} disabled={loading}>+ Add Folder</button>
                </div>

                <div>
                    <button className="scan-folder-button header-font d-flex" onClick={scanMusic} disabled={loading || directoryList.length === 0}>
                        {loading === true && <span style={{paddingRight: '5px'}}><span className="loader" /> </span>}
                        <span>Scan Music</span>
                    </button>
                </div>
            </div>

            <div className="theme-container">
                <div className="header-font font-3">Choose Theme</div>
                <div className="theme-options">
                    <span>
                        <ThemeOptions theme="red" />
                        <div id="theme-name">Red</div>
                    </span>
                    <span>
                        <ThemeOptions theme="blue" />
                        <div id="theme-name">Blue</div>
                    </span>
                    <span>
                        <ThemeOptions theme="purple" />
                        <div id="theme-name">Purple</div>
                    </span>
                    <span>
                        <ThemeOptions theme="orange" />
                        <div id="theme-name">Orange</div>
                    </span>
                    <span>
                        <ThemeOptions theme="green" />
                        <div id="theme-name">Green</div>
                    </span>
                    <span>
                        <ThemeOptions theme="dark-wave" />
                        <div id="theme-name">Dark Wave</div>
                    </span>
                </div>
            </div>

                   
        </main>
    )
}



type Props = {
    success: number,
    error: number,
    error_dets: ErrorInfo[],
};

const ScanResultsPopup = (props: Props) => {

    if(props !== undefined || props !== null) {
        if(props.error !== 0) {
            return(
                <div className="status-container error d-flex vertical-centered">
                    <span>
                        <img src={ErrorIcon} alt={"ff"} className="scan-status-icon error"/>
                    </span>
                    <span style={{paddingLeft: "10px"}}>
                        <div>Folders Scanned</div>
                        <div>Scanned {props.error + props.success} songs - {props.error} songs had errors</div>                    
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
                        <div>Scanned {props.error + props.success} songs - {props.error} songs had errors</div>                    
                    </span>
                </div>
            );
        }
    }
}