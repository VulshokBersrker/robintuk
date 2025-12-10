import { HashLink } from 'react-router-hash-link';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { VirtuosoGrid } from 'react-virtuoso';
import { useEffect, useState } from "react";
import SimpleBar from 'simplebar-react';
import { forwardRef } from 'react';

// Custom Components
import { saveQueue, Songs, savePosition, PlaylistList, playSelection, AlbumDetails, alphabeticallyOrdered, ArtistRes, AllArtistResults } from "../globalValues";
import ImageWithFallBack from "../components/imageFallback.js";

// Images
import SearchIcon from '../images/search_icon.svg';
import PlaceholderArtistImage from '../images/placeholder_artist.png';

type P = {
    artists: AllArtistResults[];
}

export default function ArtistsPage({artists}: P) {

    const navigate = useNavigate();

    // Used to add SimpleBar to React Virtuoso
    const [scrollParent, setScrollParent] = useState<any>(null);

    console.log(artists)

    // const [loading, setLoading] = useState(false);
    const [artistList, setArtistList] = useState<AllArtistResults[]>(artists);
    const [filteredArtists, setFilteredArtists] = useState<AllArtistResults[]>(artists);
    const [searchValue, setSearchValue] = useState<string>("");

    async function getArtists() {
        try {
            const list = await invoke<AllArtistResults[]>('get_all_artists');
            // console.log(list);
            setArtistList(list);
        }
        catch (err) {
            alert(`Failed to scan folder: ${err}`);
        }
    }

    useEffect(() => {
        // getArtists();
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

            {/* <div className="section-list">
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
            </div> */}

            {/* <div className="d-flex flex-wrap">
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
            </div> */}

            <SimpleBar forceVisible="y" autoHide={false} ref={setScrollParent}>
                    <VirtuosoGrid
                        style={{ paddingBottom: '170px' }}
                        totalCount={filteredArtists.length}
                        components={gridComponents}
                        increaseViewportBy={{ top: 210, bottom: 420 }}
                        itemContent={(index) =>
                            <div className="album-link" key={index} id={`${filteredArtists[index].album_artist}-${index}`}>
                                <div className="album-image-container"
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        // handleContextMenu(e, filteredArtists[index].album, filteredArtists[index].name, index);
                                    }}
                                >                                    
                                    <div className="container" onClick={() => navigateToArtistOverview(filteredArtists[index].album_artist)} >
                                        <ImageWithFallBack image={PlaceholderArtistImage} alt={filteredArtists[index].album_artist} image_type={"album"} />
                                    </div>
                                    <div className="album-image-name header-font">
                                        <div className="album-name">{filteredArtists[index].album_artist}</div>
                                    </div>
                                </div>
                            </div>
                        }
                        customScrollParent={scrollParent ? scrollParent.contentWrapperEl : undefined}
                    />
                </SimpleBar>
        </div>
    );
}

// For the Virtual Grid
const gridComponents = {
    List: forwardRef(({ style, children, ...props }: any, ref) => (
        <div ref={ref} {...props} style={{ display: "flex", flexWrap: "wrap", ...style, }} >
            {children}
        </div>
    )),

  Item: ({ children, ...props }: any) => (
    <div {...props} style={{  width: "168px", display: "flex", flex: "none", boxSizing: "border-box", }} >
        {children}
    </div>
  )
}