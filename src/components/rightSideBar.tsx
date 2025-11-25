// Core Components
import { Link, useNavigate } from 'react-router-dom';
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

// Custom Components
import ImageWithFallBack from "./imageFallback";
import { Playlists } from "../globalValues";

// Image Components
import SettingsIcon from '../images/settings-svgrepo-com.svg';
// import MusicLibraryIcon from '../images/music-outline.svg';
// import HomeIcon from '../images/home-outline.svg';

type NewPlaylistList = {
    playlist: Playlists[]
}

export default function RightSideBar() {
    
    const navigate = useNavigate();

    const [isSidebarCollapsed, setIsSideBarCollapsed] = useState<Boolean>(false);
    const [isActive, setIsActive] = useState<boolean[]>([false, false, false, false, false, false, false, false]);
    
    const navArray = ["home", "songs", "albums", "artists", "settings"];

    const [playlistLists, setPlaylistLists] = useState<Playlists[]>([]);

    function toggleActive(index: number) {
        const temp: boolean[] = new Array(5).fill(false);
        temp[index] = true;
        setIsActive(temp);
    }

    // Used to keep the correct link active
    useEffect(() => {
        const url = window.location.href;
        let temp: boolean[] = new Array(5).fill(false);

        if(url.split("/")[url.split("/").length - 1] === null || url.split("/")[url.split("/").length - 1] === undefined  || url.split("/")[url.split("/").length - 1] === "") {
            temp[0] = true;
        }
        else {
            temp[navArray.indexOf(url.split("/")[url.split("/").length - 1])] = true;
        }
        setIsActive(temp);
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
                <Link to={"/"} className={`nav-item nav-link d-flex align-items-center ${isActive[0] === true ? "active" : ""}`} onClick={() => toggleActive(0)}>
                    {/* <img src={HomeIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" onClick={() => { if(isSidebarCollapsed === true) {setIsSideBarCollapsed(!isSidebarCollapsed)} }} > Home </span>
                </Link>

                <Link to={"/songs"} className={`nav-item nav-link d-flex align-items-center ${isActive[1] === true ? "active" : ""}`} onClick={() => toggleActive(1)} >
                    {/* <img src={MusicLibraryIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" onClick={() => { if(isSidebarCollapsed === true) {setIsSideBarCollapsed(!isSidebarCollapsed)} }} > Songs </span>
                </Link>

                <Link to={"/albums"} className={`nav-item nav-link d-flex align-items-center ${isActive[2] === true ? "active" : ""}`} onClick={() => toggleActive(2)}>
                    {/* <img src={MusicLibraryIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" onClick={() => { if(isSidebarCollapsed === true) {setIsSideBarCollapsed(!isSidebarCollapsed)} }} > Albums </span>
                </Link>

                <Link to={"/artists"} className={`nav-item nav-link d-flex align-items-center ${isActive[3] === true ? "active" : ""}`} onClick={() => toggleActive(3)}>
                    {/* <img src={MusicLibraryIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" onClick={() => { if(isSidebarCollapsed === true) {setIsSideBarCollapsed(!isSidebarCollapsed)} }} > Artists </span>
                </Link>

                <hr />
                <Link to={"/queue"} className={`nav-item nav-link d-flex align-items-center ${isActive[4] === true ? "active" : ""}`} onClick={() => toggleActive(4)}>
                    {/* <img src={MusicLibraryIcon} className="bi icon icon-size" aria-hidden="true" /> */}
                    <span className="nav-font" onClick={() => { if(isSidebarCollapsed === true) {setIsSideBarCollapsed(!isSidebarCollapsed)} }} >Queue </span>
                </Link>
                <Link to={"/playlists"} className={`nav-item nav-link d-flex align-items-center ${isActive[5] === true ? "active" : ""}`} onClick={() => toggleActive(5)}>
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
                                className="section-10 nav-item nav-link d-flex align-items-center"
                                id={item.name}
                            >
                                <ImageWithFallBack image={item.image} alt="" image_type="sidebar-playlist-image"/>
                                <span className="nav-font" onClick={() => { if(isSidebarCollapsed === true) {setIsSideBarCollapsed(!isSidebarCollapsed)} }} > {item.name} </span>
                            </div>
                        );
                    })}
                </nav>
            </div>

            <hr />

            <div className="section-10 settings-section" >
                <Link to="/settings" className={`nav-item nav-link d-flex align-items-center ${isActive[6] === true ? "active" : ""}`} onClick={() => toggleActive(6)}>
                    <img src={SettingsIcon} className="bi icon icon-size" aria-hidden="true" />
                    <span className="nav-font" onClick={() => { if(isSidebarCollapsed === true) {setIsSideBarCollapsed(!isSidebarCollapsed)} }} > Settings </span>
                </Link>
            </div>

        </div>
    );
}