// Core Libraries
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";

// Images
import CheckIcon from '../images/circle-check-regular-full.svg';
import ErrorIcon from '../images/circle-xmark-regular-full.svg';

type Props = {
    isToggled: boolean,
    popupType: number
}

export default function Popup({isToggled, popupType}: Props) {

    const [close, setClose] = useState<boolean>(false);

    useEffect(() => {
        if(isToggled === false) {
            setClose(true);
        }

        if(popupType === 1 || popupType === 2) {
            setTimeout(function() {
                setClose(true);
            }, 700);
        }
    }, [isToggled, close]);

    if(isToggled === true && close === false) {
        // New Version Notification
        if(popupType === 0) {
            return(
                <div className="notification-popup version">
                    <div className="grid-20">
                        <div className="header-font font-2 section-20 text-center">A new Version of Robintuk is Available!</div>
                        <div className="font-1 section-20 text-center"></div>

                        <div className="section-10 text-center">
                            <button className="header-font close" onClick={() => {openUrl("https://github.com/VulshokBersrker/robintuk/releases/latest"); setClose(true);}}>
                                Download
                            </button>
                        </div>
                        <div className="section-10 text-center">
                            <button className="header-font close" onClick={() => setClose(true)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        // Unplayable Song - (Does not exist)
        else if(popupType === 1) {
            return(
                <div className="notification-popup song-error warning d-flex vertical-centered font-0">
                    <img src={ErrorIcon} alt="error icon" className="scan-status-icon error" />
                    <span style={{paddingLeft: "10px"}}>
                        Song file does not exist, cannot play.
                    </span>
                </div>
            );
        }
        // Song Added to Playlist
        else if(popupType === 2) {
            return(
                <div className="notification-popup song-added d-flex vertical-centered font-0">
                    <img src={CheckIcon} alt="error icon" className="scan-status-icon success" />                    
                    <span style={{paddingLeft: "10px"}}>
                        Song was added to playlist
                    </span>
                </div>
            );
        }
        else {
            return(
                <></>
            );
        }
    }
    else {
        return(
            <></>
        );
    }
}