import { HashLink } from 'react-router-hash-link';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from "react";

// Custom Components
import { saveQueue, Songs, savePosition, AlbumRes } from "../globalValues";
import ImageWithFallBack from "../components/imageFallback.js";

// Images
import EllipsisIcon from '../images/ellipsis-solid-full.svg';
import PlayIcon from '../images/play-icon-outline.svg';
import SearchIcon from '../images/search_icon.svg';


// Need to add filtering, should be easy because all the data is there
// Begin work on caching data

// List virtualization might be good for these lists



export default function AlbumPage() {

    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [albumList, setAlbumList] = useState<AlbumRes[]>([]);
    const [searchValue, setSearchValue] = useState<string>("");

    const [filteredAlbums, setFilteredAlbums] = useState<AlbumRes[]>([]);

    async function getAlbums() {
        try {
            setLoading(true);
            const list = await invoke<AlbumRes[]>('get_all_albums');
            // console.log(list);
            setAlbumList(list);
            setFilteredAlbums(list);
        }
        catch (err) {
            alert(`Failed to scan folder: ${err}`);
        }
        finally {
            setLoading(false);
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
            // console.log(albumRes);
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

    function updateSearchResults(value: string) {
        setSearchValue(value);
        let temp: AlbumRes[] = [];
        for(let i = 0; i < albumList.length; i++) {            
            const temp_section = albumList[i].section.filter((entry) => {
                return entry.album.toLowerCase().includes(value.toLowerCase());
            });
            temp.push({ name: albumList[i].name, section: temp_section });
        }
        setFilteredAlbums(temp);
    }

    if(loading) {
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
                            onChange={(e) => updateSearchResults(e.target.value)}
                        />
                    </span>
                </div>

                <div className="d-flex flex-wrap">
                    {[...Array(70)].map(i => {
                        return(
                            <div key={i} className="album-link placeholder">
                                <div className="album-image-container placeholder">                                                
                                    <div className="album-image placeholder">
                                        {/* <div className="activity"/> */}
                                    </div>
                                    <div className="album-image-name header-font">
                                    <div className="album-name"></div>
                                    <div className="artist-name"></div>
                                </div>
                                </div>
                            </div>
                        );        
                    })}                
                </div>
            </div>
        );
    }
    else {
        return(
            <div>
                <div className="search-filters d-flex justify-content-end vertical-centered"> 
                    {/* <span className="filter">Sort By: <span className="value">A-Z</span></span>
                    <span className="filter">Genre: <span className="value">All Genres</span></span> */}

                    <span className="search-bar">
                        <img src={SearchIcon} className="bi search-icon icon-size"/>
                        <input
                            type="text" placeholder="Search Albums" id="search_albums"
                            value={searchValue}
                            onChange={(e) => updateSearchResults(e.target.value)}
                        />
                    </span>
                </div>

                <div className="section-list">
                    {albumList.map(section => {
                        if(section.section.length !== 0) {
                            return(
                                <div key={`main-${section.name}`}>
                                    <HashLink to={`/albums#${section.name}-0`} smooth>
                                        {section.name}
                                    </HashLink>
                                </div>
                            );
                        }                    
                    })}
                </div>

                <div className="d-flex flex-wrap">
                    {filteredAlbums.map(part => {
                        if(part.section.length > 0) {
                            return(
                                part.section.map((entry, i) => {
                                    return(
                                        <div key={`${part.name}-${i}`} className="album-link" id={`${part.name}-${i}`}>
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
                                })
                            );
                        }            
                    })}                
                </div>
                <div className="empty-space" />
            </div>
        );
    }    
}