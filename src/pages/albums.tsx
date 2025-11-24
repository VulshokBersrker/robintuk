import { Link, useNavigate, ScrollRestoration, NavigateFunction } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from "react";

// Custom Components
import { saveQueue, Songs, alphabeticallyOrdered, savePosition } from "../globalValues";
import ImageWithFallBack from "../components/imageFallback.js";

// Images
import EllipsisIcon from '../images/ellipsis-solid-full.svg';
import PlayIcon from '../images/play-icon-outline.svg';
import SearchIcon from '../images/search_icon.svg';


// Need to add filtering, should be easy because all the data is there
// Make the album covers interactive - Getting ready to link them to dynamic pages
// Begin work on caching data

// List virtualization might be good for these lists
// Look for fix on the section hashes not working - they are needed to help navigate the lists better/faster

interface AlbumRes {
    name: string,
    section: Songs[]
}

export default function AlbumPage() {

    const navigate = useNavigate();
    // const [loading, setLoading] = useState(false);
    const [albumList, setAlbumList] = useState<AlbumRes[]>([]);
    const [searchValue, setSearchValue] = useState<string>("");

    async function getAlbums() {
        try {
            const list = await invoke<AlbumRes[]>('get_all_albums');
            // console.log(list);
            setAlbumList(list);
        }
        catch (err) {
            alert(`Failed to scan folder: ${err}`);
        }
    }

    useEffect(() => {
        getAlbums();
    }, []);

    const navigateToAlbumOverview = (name: string) => {
        navigate("/albums/overview", {state: {name: name}});
    }

    async function playAlbum(album_name: string) {
        try {
            const albumRes: Songs[] = await invoke('get_album', { name: album_name });
            console.log(albumRes);
            // Load the music to be played and saved
            await invoke('player_load_album', {queue: albumRes, index: 0});
            await invoke('update_current_song_played');
            saveQueue(albumRes);
            savePosition(0);
        }
        catch(e) {
            console.log(e);
        }
    }


    return(
        <div>
            <div className="search-filters d-flex justify-content-end vertical-centered"> 
                <span className="filter">Sort By: <span className="value">A-Z</span></span>
                <span className="filter">Genre: <span className="value">All Genres</span></span>

                <span className="search-bar">
                    <img src={SearchIcon} className="bi search-icon icon-size"/>
                    <input
                        type="text" placeholder="Search Albums" id="search_albums"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                    />
                </span>

            </div>

            <div>
                {albumList.map(section => {
                    if(section.section.length > 0) {
                        return(
                            <div key={section.name} className="">
                                {/* Add ability to jump to a section - popup - best to use Links */}
                                {section.name !== "." &&
                                    <div className="section-list">
                                        <Link to={'/albums/#9'} className="position-relative" id={`${alphabeticallyOrdered.indexOf(section.name)}`} >
                                            <span className="header-3" >{section.name}</span>   
                                            {/* <ListSections nav={navigate} /> */}
                                        </Link>
                                    </div>
                                }
                                {section.name === "." && <h1 className="header-3 position-relative" id={"..."}>...</h1>}

                                <div className="d-flex flex-wrap">
                                    {section.section.map((entry, i) => {
                                        return(
                                            <div key={i} className="album-link">
                                                <div className="album-image-container">
                                                    <div className="play-album"><img src={PlayIcon} className="icon-size" onClick={() => playAlbum(entry.album)}/></div>
                                                    <div className="options"><img src={EllipsisIcon} className="icon-size" /></div>
                                                    
                                                    <div className="container" onClick={() => navigateToAlbumOverview(entry.album)} >
                                                        <ImageWithFallBack image={entry.cover} alt={entry.album} image_type={"album"} />
                                                    </div>
                                                    <div className="album-image-name header-font">
                                                        <div className="album-name">{entry.album}</div>
                                                        <div className="artist-name">{entry.artist}</div>
                                                    </div>
                                                </div>
                                                
                                            </div>
                                        );                                        
                                    })}
                                </div>
                            </div>
                        );
                    }            
                })}                
            </div>
        </div>
    );
}


type Props = {
    nav: NavigateFunction
}

// This is display a popup to allow a user to jump to other sections of the list based on section
function ListSections({nav}: Props) {

    const navigateToSection = (index: number) => {
        console.log("navigating to section: " + index);
        nav({ pathname: "", hash: `#${index}`});
    }

    return(
        <div className="section-list-container">
            <div>   
                {alphabeticallyOrdered.map((letter) => {
                    return(
                        <span key={letter} onClick={() => navigateToSection(alphabeticallyOrdered.indexOf(letter) )} className="border">
                            {letter}
                        </span>
                    );
                })}
            </div>            
        </div>
    );
}