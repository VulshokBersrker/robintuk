// Core Components
import { Link, NavigateFunction, useLocation, useNavigate } from 'react-router-dom';
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

// Custom Components
import ImageWithFallBack from "./imageFallback";
import { Playlists, playPlaylist } from "../globalValues";

// Images
import SelectIcon from '../images/circle-check-regular-full.svg';
import AlbumIcon from '../images/vinyl-record-svgrepo-com.svg';
import ArtistIcon from '../images/user-regular-full.svg';
import PlayIcon from '../images/play-solid-full.svg';
import AddIcon from '../images/plus-solid-full.svg';

type NewPlaylistList = {
    playlist: Playlists[]
}

export default function RightSideBar() {
    
    const navigate = useNavigate();
    const location = useLocation();

    const [playlistLists, setPlaylistLists] = useState<Playlists[]>([]);
    const [contextMenu, setContextMenu] = useState({ isToggled: false, playlist: "", posX: 0, posY: 0 });


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
        const unlisten_get_playlists= listen<NewPlaylistList>("new-playlist-created", (event) => { console.log(event.payload.playlist); setPlaylistLists(event.payload.playlist); });
        
        return () => {
            unlisten_get_playlists.then(f => f());
        }        
    }, []);

    function handleContextMenu(e: any, playlist: string) {
        if(e.pageX < window.innerWidth / 2) {
            setContextMenu({ isToggled: true, playlist: playlist, posX: e.pageX, posY: e.pageY });
        }
        else {
            setContextMenu({ isToggled: true, playlist: playlist, posX: e.pageX - 150, posY: e.pageY });
        }
    }

    function resetContextMenu() {
        setContextMenu({ isToggled: false, playlist: "", posX: 0, posY: 0});
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

    const navigateToPlaylistOverview = (name: string) => {
        navigate("/playlists/overview", {state: {name: name}});
    }

    return(
        <div className="grid-10 side-navbar">

            <div className="section-10">
                <Link to={"/"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/" ? "active" : ""}`} >
                    {/* <img src={HomeIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" > Home </span>
                </Link>

                <Link to={"/songs"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/songs" ? "active" : ""}`} >
                    {/* <img src={MusicLibraryIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" > Songs </span>
                </Link>

                <Link to={"/albums"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/albums" ? "active" : ""}`} >
                    {/* <img src={MusicLibraryIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" > Albums </span>
                </Link>

                <Link to={"/artists"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/artists" ? "active" : ""}`} >
                    {/* <img src={MusicLibraryIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" > Artists </span>
                </Link>

                <hr />
                <Link to={"/queue"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/queue" ? "active" : ""}`} >
                    {/* <img src={MusicLibraryIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" >Queue </span>
                </Link>
                <Link to={"/playlists"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/playlists" ? "active" : ""}`} >
                    {/* <img src={MusicLibraryIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" >Playlists </span>
                </Link>
            </div>
            

            {/* Playlist Section */}
            <div className="nav-scrollable section-10" >
                <nav className="grid-10" >
                    {playlistLists.map((item, i) => {
                        return(
                            <div
                                key={i} onClick={() => navigateToPlaylistOverview(item.name)}
                                className={`section-10 nav-item nav-link d-flex align-items-center ${(location.pathname === "/playlists/overview" && location.state.name === item.name) ? "active" : ""}`}
                                id={item.name}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    handleContextMenu(e, item.name);
                                }}
                            >
                                <ImageWithFallBack image={item.image} alt="" image_type="sidebar-playlist-image"/>
                                <span className="nav-font" > {item.name} </span>
                            </div>
                        );
                    })}
                </nav>
            </div>
            <ContextMenuSideBar
                isToggled={contextMenu.isToggled}
                playlist={contextMenu.playlist}
                posX={contextMenu.posX}
                posY={contextMenu.posY}
                play={playPlaylist}
                navigateToPlaylistOverview={navigateToPlaylistOverview}
            />
        </div>
    );
}

type Props = {
    navigateToPlaylistOverview: (name: string) => void,
    isToggled: boolean,
    playlist: string,
    play: (album_name: string) => void, // playSong / playAlbum function
    posX: number,
    posY: number
}

function ContextMenuSideBar({ navigateToPlaylistOverview, isToggled, playlist, play, posX, posY }: Props) {

    useEffect(() => {
        const element = document.getElementsByClassName("content");
        if(isToggled) {
            element[0].classList.add("disable-scroll");
        }
        else {
            element[0].classList.remove("disable-scroll");
        }
    }, [isToggled]);

    if(isToggled) {
        return(
            <div 
                className="context-menu-container header-font font-1"
                style={{ position: "fixed", left: `${posX}px`, top: `${posY}px`}}
                onContextMenu={(e) => {  e.preventDefault(); }}
            >
                <li onClick={() => {play(playlist)}} className="d-flex align-items-center">
                    <img src={PlayIcon} />
                    &nbsp; Play
                </li>

                <li className="d-flex align-items-center" onClick={() => navigateToPlaylistOverview(playlist)} >
                    <img src={AddIcon} />
                    &nbsp; View
                </li>                
            </div>
        );
    }
    else { return; }
}
