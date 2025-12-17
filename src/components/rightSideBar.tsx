// Core Components
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

// Custom Components
import ImageWithFallBack from "./imageFallback";
import { Playlists, playPlaylist } from "../globalValues";

// Images
import AlbumIcon from '../images/vinyl-record-svgrepo-com.svg';
import PlayIcon from '../images/play-solid-full.svg';

type NewPlaylistList = {
    playlist: Playlists[]
}

export default function RightSideBar() {
    
    const navigate = useNavigate();
    const location = useLocation();

    const [playlistLists, setPlaylistLists] = useState<Playlists[]>([]);
    const [contextMenu, setContextMenu] = useState({ isToggled: false, playlist: 0, posX: 0, posY: 0 });

    const [scanOnGoing, setScanOnGoing] = useState<boolean>(false);


    // Used to keep the correct link active
    useEffect(() => {
        // Get the list of playlists from the database
        getPlaylists();


        const handler = () => {
            if(!contextMenu.isToggled) {
                resetContextMenu();
            }
        }
        document.addEventListener('click', handler);
        
        return () => {
            document.removeEventListener('click', handler);
        }
    }, []);

    // Just for listeners
    useEffect(() => {
        // Load the new playlist from the backend
        const unlisten_get_playlists = listen<NewPlaylistList>("new-playlist-created", (event) => { setPlaylistLists(event.payload.playlist); });

        const unlisten_scan_started = listen("scan-started", () => { console.log("scan started"); setScanOnGoing(true); });
        const unlisten_scan_finished = listen("scan-finished", () => { console.log("scan ended"); setScanOnGoing(false); localStorage.setItem("folder-scan", JSON.stringify(false)); });
        
        return () => {
            unlisten_get_playlists.then(f => f());
            unlisten_scan_started.then(f => f());
            unlisten_scan_finished.then(f => f());
        }        
    }, []);

    function handleContextMenu(e: any, playlist: number) {
        if(e.pageX < window.innerWidth / 2) {
            setContextMenu({ isToggled: true, playlist: playlist, posX: e.pageX, posY: e.pageY });
        }
        else {
            setContextMenu({ isToggled: true, playlist: playlist, posX: e.pageX - 150, posY: e.pageY });
        }
    }

    function resetContextMenu() {
        setContextMenu({ isToggled: false, playlist: 0, posX: 0, posY: 0});
    }

    async function getPlaylists() {
        try{
            const list: Playlists[] = await invoke<Playlists[]>('get_all_playlists');
            setPlaylistLists(list);
        }
        catch(e) {
            console.log(e);
        }
    }

    const navigateToPlaylistOverview = (name: number) => {
        navigate("/playlists/overview", {state: {name: name}});
    }

    return(
        <div className="grid-10 side-navbar">

            <div className="section-10">
                <Link to={"/"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/" ? "active" : ""}`} >
                    <span className="nav-font" > Home </span>
                </Link>

                <Link to={"/songs"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/songs" ? "active" : ""}`} >
                    <span className="nav-font" > Songs </span>
                </Link>

                <Link to={"/albums"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/albums" ? "active" : ""}`} >
                    <span className="nav-font" > Albums </span>
                </Link>

                <Link to={"/artists"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/artists" ? "active" : ""}`} >
                    <span className="nav-font" > Artists </span>
                </Link>

                <hr />
                <Link to={"/queue"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/queue" ? "active" : ""}`} >
                    <span className="nav-font" >Queue </span>
                </Link>
                <Link to={"/playlists"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/playlists" ? "active" : ""}`} >
                    <span className="nav-font" >Playlists </span>
                </Link>
            </div>
            
            {/* Playlist Section */}
            <div className="nav-scrollable section-10" >
                <nav className="grid-10" >
                    {playlistLists.map((item, i) => {
                        return(
                            <div
                                key={i} onClick={() => navigateToPlaylistOverview(item.id)}
                                className={`section-10 nav-item nav-link d-flex align-items-center ${(location.pathname === "/playlists/overview" && location.state.name === item.id) ? "active" : ""}`}
                                id={item.name}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    handleContextMenu(e, item.id);
                                }}
                            >
                                <ImageWithFallBack image={item.image} alt="" image_type="sidebar-playlist-image"/>
                                <span className="nav-font line-clamp-1" >{item.name}</span>
                            </div>
                        );
                    })}
                </nav>
            </div>

            {/* Scan Status Marker */}
            <div className={`scan-status-container vertical-centered ${scanOnGoing ? "loaded" : "unloaded"}`}>
                <span style={{paddingRight: '5px'}}><span className="loader" /> </span>
                <span>Scanning...</span>
            </div>

            <ContextMenu
                isToggled={contextMenu.isToggled}
                playlist_id={contextMenu.playlist}
                posX={contextMenu.posX}
                posY={contextMenu.posY}
                play={playPlaylist}
                navigateToPlaylistOverview={navigateToPlaylistOverview}
            />
        </div>
    );
}

type Props = {
    navigateToPlaylistOverview: (name: number) => void,
    isToggled: boolean,
    playlist_id: number,
    play: (album_name: number) => void, // playSong / playAlbum function
    posX: number,
    posY: number
}

function ContextMenu({ navigateToPlaylistOverview, isToggled, playlist_id, play, posX, posY }: Props) {

    if(isToggled) {
        return(
            <div 
                className="context-menu-container header-font font-1"
                style={{ position: "fixed", left: `${posX}px`, top: `${posY}px`}}
                onContextMenu={(e) => {  e.preventDefault(); }}
            >
                <li onClick={() => {play(playlist_id)}} className="d-flex align-items-center">
                    <img src={PlayIcon} />
                    &nbsp; Play
                </li>

                <li className="d-flex align-items-center" onClick={() => navigateToPlaylistOverview(playlist_id)} >
                    <img src={AlbumIcon} />
                    &nbsp; View
                </li>                
            </div>
        );
    }
    else { return; }
}