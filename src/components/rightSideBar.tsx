// Core Components
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

// Custom Components
import ImageWithFallBack from "./imageFallback";
import { Playlists } from "../globalValues";

type NewPlaylistList = {
    playlist: Playlists[]
}

export default function RightSideBar() {
    
    const navigate = useNavigate();
    const location = useLocation();

    const [isSidebarCollapsed, setIsSideBarCollapsed] = useState<Boolean>(false);

    const [playlistLists, setPlaylistLists] = useState<Playlists[]>([]);

    // Used to keep the correct link active
    useEffect(() => {
        // Get the list of playlists from the database
        getPlaylists();
    }, []);

    // Just for listeners
    useEffect(() => {
        // Load the new playlist from the backend
        const unlisten_get_playlists= listen<NewPlaylistList>("new-playlist-created", (event) => { console.log(event.payload.playlist); setPlaylistLists(event.payload.playlist); });
        
        return () => {
            unlisten_get_playlists.then(f => f());
        }        
    }, []);

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
        <div className={`grid-10 side-navbar ${isSidebarCollapsed === true ? "closed" : "open"}`} >

            <div className="section-10">
                <Link to={"/"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/" ? "active" : ""}`} >
                    {/* <img src={HomeIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" onClick={() => { if(isSidebarCollapsed === true) {setIsSideBarCollapsed(!isSidebarCollapsed)} }} > Home </span>
                </Link>

                <Link to={"/songs"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/songs" ? "active" : ""}`} >
                    {/* <img src={MusicLibraryIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" onClick={() => { if(isSidebarCollapsed === true) {setIsSideBarCollapsed(!isSidebarCollapsed)} }} > Songs </span>
                </Link>

                <Link to={"/albums"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/albums" ? "active" : ""}`} >
                    {/* <img src={MusicLibraryIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" onClick={() => { if(isSidebarCollapsed === true) {setIsSideBarCollapsed(!isSidebarCollapsed)} }} > Albums </span>
                </Link>

                <Link to={"/artists"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/artists" ? "active" : ""}`} >
                    {/* <img src={MusicLibraryIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" onClick={() => { if(isSidebarCollapsed === true) {setIsSideBarCollapsed(!isSidebarCollapsed)} }} > Artists </span>
                </Link>

                <hr />
                <Link to={"/queue"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/queue" ? "active" : ""}`} >
                    {/* <img src={MusicLibraryIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" onClick={() => { if(isSidebarCollapsed === true) {setIsSideBarCollapsed(!isSidebarCollapsed)} }} >Queue </span>
                </Link>
                <Link to={"/playlists"} className={`nav-item nav-link d-flex align-items-center ${location.pathname === "/playlists" ? "active" : ""}`} >
                    {/* <img src={MusicLibraryIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" onClick={() => { if(isSidebarCollapsed === true) {setIsSideBarCollapsed(!isSidebarCollapsed)} }} >Playlists </span>
                </Link>
            </div>
            

            {/* Playlist Section */}
            <div className={`nav-scrollable section-10 ${isSidebarCollapsed === true ? "" : "mobile-viewable"}`} >
                <nav className="grid-10" >
                    {playlistLists.map((item, i) => {
                        return(
                            <div
                                key={i} onClick={() => navigateToPlaylistOverview(item.name)}
                                className={`section-10 nav-item nav-link d-flex align-items-center ${(location.pathname === "/playlists/overview" && location.state.name === item.name) ? "active" : ""}`}
                                id={item.name}
                            >
                                <ImageWithFallBack image={item.image} alt="" image_type="sidebar-playlist-image"/>
                                <span className="nav-font" onClick={() => { if(isSidebarCollapsed === true) {setIsSideBarCollapsed(!isSidebarCollapsed)} }} > {item.name} </span>
                            </div>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}