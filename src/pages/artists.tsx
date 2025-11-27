import { HashLink } from 'react-router-hash-link';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from "react";

// Custom Components
import ImageWithFallBack from "../components/imageFallback.js";
import { Songs } from "../globalValues";

// Images
import SearchIcon from '../images/search_icon.svg';

interface ArtistRes {
    name: string,
    section: Songs[]
}

export default function ArtistsPage() {

    const navigate = useNavigate();
    // const [loading, setLoading] = useState(false);
    const [artistList, setArtistList] = useState<ArtistRes[]>([]);
    const [searchValue, setSearchValue] = useState<string>("");

    async function getArtists() {
        try {
            const list = await invoke<ArtistRes[]>('get_all_artists');
            // console.log(list);
            setArtistList(list);
        }
        catch (err) {
            alert(`Failed to scan folder: ${err}`);
        }
    }

    useEffect(() => {
        getArtists();
    }, []);

    const navigateToArtistOverview = (name: string) => {
        navigate("/artists/overview", {state: {name: name}});
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

            <div className="section-list">
                {artistList.map(section => {
                    if(section.section.length !== 0) {
                        return(
                            <div key={section.name}>
                                <HashLink to={`/artists#${section.name}-0`} smooth>
                                    {section.name}
                                </HashLink>
                            </div>
                        );
                    }                    
                })}
            </div>

            <div className="d-flex flex-wrap">
                {artistList.map(section => {
                    if(section.section.length > 0) {
                        return(
                            section.section.map((entry, i) => {
                                return(
                                    <div key={`${section.name}-${i}`} className="album-link" id={`${section.name}-${i}`}>
                                        <div className="album-image-container">
                                            
                                            <div className="container" onClick={() => navigateToArtistOverview(entry.album_artist)} >
                                                <ImageWithFallBack image={entry.cover} alt={entry.album_artist} image_type={"artist"} />
                                            </div>
                                            <div className="album-image-name header-font">
                                                <div className="album-name">{entry.album_artist}</div>
                                            </div>
                                        </div>
                                    </div>
                                );                                        
                            })
                        );
                    }            
                })}                
            </div>
        </div>
    );
}