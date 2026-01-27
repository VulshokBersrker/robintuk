// Core Components
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";

// Custom Components
import { Playlists, playPlaylist } from "../globalValues";
import ImageWithFallBack from "./imageFallback";

// Images
import AlbumIcon from '../images/vinyl-record-svgrepo-com.svg';
import ShuffleIcon from '../images/shuffle-solid-full.svg';
import PlayIcon from '../images/play-solid-full.svg';

// Images - Filled
import PlaylistFillIcon from '../images/playlist-fill.svg';
import AlbumsFillIcon from '../images/albums-fill.svg';
import QueueFullIcon from '../images/queue-fill.svg';
import ArtistFullIcon from '../images/user-fill.svg';
import SongFullIcon from '../images/songs-fill.svg';
import HomeFullIcon from '../images/home-fill.svg';


// Images - Outlined
import PlaylistOutlineIcon from '../images/playlist-outline.svg';
import ArtistOutlineIcon from '../images/user-regular-full.svg';
import AlbumsOutlineIcon from '../images/albums-outline.svg';
import HomeOutlineIcon from '../images/home-svgrepo-com.svg';
import QueueOutlineIcon from '../images/queue-outline.svg';
import SongOutlineIcon from '../images/songs-outline.svg';

type NewPlaylistList = {
    playlist: Playlists[]
}

interface ScanProgress {
    length: number,
    current: number
}

export default function RightSideBar() {
    
    const navigate = useNavigate();
    const location = useLocation();

    const [playlistLists, setPlaylistLists] = useState<Playlists[]>([]);
    const [contextMenu, setContextMenu] = useState({ isToggled: false, playlist: 0, posX: 0, posY: 0 });
    const isContextMenuOpen = useRef<any>(null);

    const [scanLength, setScanLength] = useState<number>(0);
    const [scanCurrent, setScanCurrent] = useState<number>(0);
    const [scanOnGoing, setScanOnGoing] = useState<boolean>(false);

    // Used to keep the correct link active
    useEffect(() => {
        // Get the list of playlists from the database
        getPlaylists();

        const handler = (e: any) => {
            if(!contextMenu.isToggled && !isContextMenuOpen.current?.contains(e.target)) {
                resetContextMenu();
            }
        }
        document.addEventListener('mousedown', handler);
        
        return () => {
            document.removeEventListener('mousedown', handler);
        }
    }, []);

    // Just for listeners
    useEffect(() => {
        // Load the new playlist from the backend
        const unlisten_get_playlists = listen<NewPlaylistList>("new-playlist-created", (event) => { setPlaylistLists(event.payload.playlist); });

        const unlisten_scan_started = listen("scan-started", () => { setScanCurrent(0); setScanLength(0); setScanOnGoing(true);  });
        const unlisten_scan_finished = listen("scan-finished", () => { setScanOnGoing(false); });
        
        const unlisten_scan_progress = listen<ScanProgress>("scan-length", (event) => { setScanCurrent(event.payload.current); setScanLength(event.payload.length); });
        const unlisten_restore_finished = listen<boolean>("ending-restore", () => { getPlaylists(); });
        
        return () => {
            unlisten_get_playlists.then(f => f()),
            unlisten_scan_progress.then(f => f()),
            unlisten_scan_started.then(f => f()),
            unlisten_scan_finished.then(f => f()),
            unlisten_restore_finished.then(f => f());
        }        
    }, []);


    function handleContextMenu(e: any, playlist: number) {
        if(e.pageX < window.innerWidth / 2) {
            if(e.pageY < window.innerHeight / 2) {
                setContextMenu({ isToggled: true, playlist: playlist, posX: e.pageX, posY: e.pageY});
            }
            else {
                setContextMenu({ isToggled: true, playlist: playlist, posX: e.pageX, posY: e.pageY - 130});
            }
        }
        else {
            if(e.pageY < window.innerHeight / 2) {
                setContextMenu({ isToggled: true, playlist: playlist, posX: e.pageX - 150, posY: e.pageY});
            }
            else {
                setContextMenu({ isToggled: true, playlist: playlist, posX: e.pageX - 150, posY: e.pageY - 130});
            }
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
        resetContextMenu();
        navigate("/playlists/overview", {state: {name: name}});
    }

    return(
        <div className="grid-10 side-navbar">

            <div className="section-10">
                <Link to={"/"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/" ? "active" : ""}`} >
                    {location.pathname !== "/" && <img src={HomeOutlineIcon} className="bi icon-size" aria-hidden="true" />}
                    {location.pathname === "/" && <img src={HomeFullIcon} className="bi icon-size" aria-hidden="true" />}                    
                    <span className="nav-font" > Home </span>
                </Link>

                <Link to={"/songs"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/songs" ? "active" : ""}`} >
                    {location.pathname !== "/songs" && <img src={SongOutlineIcon} className="bi icon-size" aria-hidden="true" />}
                    {location.pathname === "/songs" && <img src={SongFullIcon} className="bi icon-size" aria-hidden="true" />}                    
                    <span className="nav-font" > Songs </span>
                </Link>

                <Link to={"/albums"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/albums" ? "active" : ""}`} >
                    {location.pathname !== "/albums" && <img src={AlbumsOutlineIcon} className="bi icon-size" aria-hidden="true" />}
                    {location.pathname === "/albums" && <img src={AlbumsFillIcon} className="bi icon-size" aria-hidden="true" />} 
                    <span className="nav-font" > Albums </span>
                </Link>

                <Link to={"/artists"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/artists" ? "active" : ""}`} >
                    {location.pathname !== "/artists" && <img src={ArtistOutlineIcon} className="bi icon-size" aria-hidden="true" />}
                    {location.pathname === "/artists" && <img src={ArtistFullIcon} className="bi icon-size" aria-hidden="true" />}
                    <span className="nav-font" > Artists </span>
                </Link>

                <hr />

                <Link to={"/queue"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/queue" ? "active" : ""}`} >
                    {location.pathname !== "/queue" && <img src={QueueOutlineIcon} className="bi icon-size" aria-hidden="true" />}
                    {location.pathname === "/queue" && <img src={QueueFullIcon} className="bi icon-size" aria-hidden="true" />}
                    <span className="nav-font" >Queue </span>
                </Link>
                <Link to={"/playlists"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/playlists" ? "active" : ""}`} >
                    {location.pathname !== "/playlists" && <img src={PlaylistOutlineIcon} className="bi icon-size" aria-hidden="true" />}
                    {location.pathname === "/playlists" && <img src={PlaylistFillIcon} className="bi icon-size" aria-hidden="true" />}
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
            {scanOnGoing && scanCurrent > 0 &&
                <div className={`scan-status-container veritcal-centered loaded`}>

                    <span className="vertical-centered" style={{marginRight: '12px'}}>Scanning:</span>
                    <div className="vertical-centered scan-progress mini">
                        <span style={{width: `${scanCurrent / scanLength * 100}%`}} className="scan-progress-bar" />
                    </div>
                    <span className="sub-font vertical-centered" style={{float: 'right'}} > {(scanCurrent / scanLength * 100).toFixed(0)}% </span>
                    
                </div>
            }
            

            <ContextMenu
                isToggled={contextMenu.isToggled}
                playlist_id={contextMenu.playlist}
                posX={contextMenu.posX}
                posY={contextMenu.posY}
                play={playPlaylist}
                navigateToPlaylistOverview={navigateToPlaylistOverview}
                resetContextMenu={resetContextMenu}
                ref={isContextMenuOpen}
            />
        </div>
    );
}

type Props = {
    navigateToPlaylistOverview: (name: number) => void,
    isToggled: boolean,
    playlist_id: number,
    play: (playlist_id: number, shuffled: boolean) => void, // playSong / playAlbum function
    posX: number,
    posY: number,
    resetContextMenu: () => void,
    ref: any
}

function ContextMenu({ navigateToPlaylistOverview, isToggled, playlist_id, play, posX, posY, resetContextMenu, ref }: Props) {

    if(isToggled) {
        return(
            <div 
                className="context-menu-container header-font font-1"
                style={{ position: "fixed", left: `${posX}px`, top: `${posY}px`}}
                onContextMenu={(e) => {  e.preventDefault(); }}
                ref={ref}
            >
                <li onClick={() => {resetContextMenu(); play(playlist_id, false); }} className="d-flex align-items-center">
                    <img src={PlayIcon} />
                    &nbsp; Play
                </li>

                <li onClick={() => {resetContextMenu(); play(playlist_id, true); }} className="d-flex align-items-center">
                    <img src={ShuffleIcon} />
                    &nbsp; Shuffle
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