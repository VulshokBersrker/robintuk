import { useEffect, useState } from "react";
import { invoke } from '@tauri-apps/api/core';
import { alphabeticallyOrdered, Songs } from "../globalValues";
import { Link, useNavigate, ScrollRestoration, NavigateFunction } from 'react-router-dom';
import ImageWithFallBack from "../components/imageFallback";

// Images
import EllipsisIcon from '../images/ellipsis-solid-full.svg';
import PlayIcon from '../images/play-icon-outline.svg';
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

            <div>
                {artistList.map(section => {
                    if(section.section.length > 0) {
                        return(
                            <div key={section.name} className="">
                                {/* Add ability to jump to a section - popup - best to use Links */}
                                {section.name !== "." &&
                                    <div className="section-list">
                                        <Link to={'/artists/#9'} className="position-relative" id={`${alphabeticallyOrdered.indexOf(section.name)}`} >
                                            <span className="header-3" >{section.name}</span>
                                        </Link>
                                    </div>
                                }
                                {section.name === "." && <h1 className="header-3 position-relative" id={"..."}>...</h1>}

                                <div className="d-flex flex-wrap">
                                    {section.section.map((entry, i) => {
                                        return(
                                            <div key={i} className="album-link">
                                                <div className="album-image-container">
                                                    <div className="play-album"><img src={PlayIcon} className="icon-size" /></div>
                                                    <div className="options"><img src={EllipsisIcon} className="icon-size" /></div>
                                                    
                                                    <div className="container" onClick={() => navigateToArtistOverview(entry.album)} >
                                                        <ImageWithFallBack image={entry.cover} alt={entry.album} image_type="artist" />
                                                    </div>
                                                    <div className="album-image-name header-font">
                                                        <div className="album-name">{entry.album_artist}</div>
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