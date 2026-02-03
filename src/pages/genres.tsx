import { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { VirtuosoGrid } from 'react-virtuoso';
import SimpleBar from 'simplebar-react';
import { forwardRef } from 'react';

// Custom Components
import {alphabeticallyOrdered, AllGenreResults } from "../globalValues";
import ImageWithFallBack from "../components/imageFallback.js";

// Images
import PlaceholderArtistImage from '../images/placeholder_artist.png';
import SearchIcon from '../images/search_icon.svg';

type P = {
    genres: AllGenreResults[];
}

export default function GenresPage({genres}: P) {

    const navigate = useNavigate();

    // Used to add SimpleBar to React Virtuoso
    const [scrollParent, setScrollParent] = useState<any>(null);
    const virtuoso = useRef<any>(null);

    const [loading, setLoading] = useState(true);
    const [artistList] = useState<AllGenreResults[]>(genres);

    const [filteredArtists, setFilteredArtists] = useState<AllGenreResults[]>(genres);
    const [searchValue, setSearchValue] = useState<string>("");
    const [genreSections, setGenreSections] = useState<number[]>([]);    

    useEffect(() => {
        function setupGenres() {
            setLoading(true);

            let tempSectionArray: number[] = [];
            const maxSection = alphabeticallyOrdered.indexOf( Math.max.apply(Math, artistList.map((o: AllGenreResults) => { return o.genre_section})) );
            // console.log(maxSection);

            for(let i = 0; i < maxSection + 1; i++) {
                const results = artistList.filter(obj => obj.genre_section === alphabeticallyOrdered[i] ).length;
                tempSectionArray[i] = results;
            }
            setGenreSections(tempSectionArray);            
            setLoading(false);
        }
        setupGenres();
    }, []);

    function updateSearchResults(value: string) {
        setSearchValue(value);
        const temp_section = artistList.filter((entry): any => {
            return entry.genre.toLowerCase().includes(value.toLowerCase());
        })
        setFilteredArtists(temp_section);

        let tempSectionArray: number[] = [];
        const maxSection = alphabeticallyOrdered.length;
        
        for(let i = 0; i < maxSection; i++) {
            const results = temp_section.filter(obj => obj.genre_section === alphabeticallyOrdered[i] ).length;
            tempSectionArray[i] = results;
        }
        setGenreSections(tempSectionArray);
    }

    const navigateToGenreOverview = (name: string) => {
        navigate("/genres/overview", {state: {name: name}});
    }

    if(loading) {
        return(
            <div>
                <SimpleBar forceVisible="y" autoHide={false} ref={setScrollParent}>
                    <div className="search-filters d-flex justify-content-end vertical-centered"> 
                        <span className="search-bar">
                            <img src={SearchIcon} className="bi search-icon icon-size"/>
                            <input
                                type="text" placeholder="Search Albums" id="search_albums"
                                value={searchValue}
                                onChange={(e) => updateSearchResults(e.target.value)}
                            />
                        </span>
                    </div>

                    <VirtuosoGrid
                        style={{ paddingBottom: '170px' }}
                        totalCount={Array(70).length}
                        components={gridComponents}
                        increaseViewportBy={{ top: 210, bottom: 420 }}
                        itemContent={(i) =>
                            <div key={`place-${i}`} className="album-link placeholder" id={`place-${i}`}>
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
                        }
                        customScrollParent={scrollParent ? scrollParent.contentWrapperEl : undefined}
                    />
                </SimpleBar>
            </div>
        );
    }
    else {
        return(
            <SimpleBar forceVisible="y" autoHide={false} ref={setScrollParent} className="artists-main">
                <div className="search-filters d-flex justify-content-end vertical-centered"> 
                    <span className="search-bar">
                        <img src={SearchIcon} className="bi search-icon icon-size"/>
                        <input
                            type="text" placeholder="Search Genres" id="search_genres"
                            value={searchValue}
                            onChange={(e) => updateSearchResults(e.target.value)}
                        />
                    </span>
                </div>

                <div className="section-list">
                    {artistList.length !== 0 && alphabeticallyOrdered.map((section, i) => {
                        let totalIndex = 0;
                        for(let j = 0; j < i; j++) { totalIndex += genreSections[j]; }
                        if(genreSections[i] !== 0 && genreSections[i] !== undefined) {
                            return(
                                <div
                                    id={`main-${section}`} key={`main-${section}`} className="section-key"
                                    onClick={() => {
                                        virtuoso.current.scrollToIndex({ index: totalIndex });
                                        return false;
                                    }}
                                >
                                    <span>
                                        {alphabeticallyOrdered[i] === 0 && "&"}
                                        {alphabeticallyOrdered[i] === 1 && "#"}
                                        {alphabeticallyOrdered[i] > 1 && alphabeticallyOrdered[i] < 300 && alphabeticallyOrdered[i] !== 0 && String.fromCharCode(alphabeticallyOrdered[i])}
                                        {alphabeticallyOrdered[i] === 300 && "..."}
                                    </span>
                                </div>                                
                            ); 
                        }                          
                    })}
                </div>

                <VirtuosoGrid
                    totalCount={filteredArtists.length}
                    components={gridComponents}
                    ref={virtuoso}
                    increaseViewportBy={{ top: 210, bottom: 420 }}
                    itemContent={(index) =>
                        <div className="album-link" key={index} id={`${filteredArtists[index].genre}-${index}`}>
                            <div className="album-image-container"
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    // handleContextMenu(e, filteredArtists[index].album, filteredArtists[index].name, index);
                                }}
                            >                                    
                                <div className="container" onClick={() => navigateToGenreOverview(filteredArtists[index].genre)} >
                                    <ImageWithFallBack image={PlaceholderArtistImage} alt={filteredArtists[index].genre} image_type={"artist"} />
                                </div>
                                <div className="album-image-name header-font">
                                    <div className="album-name">{filteredArtists[index].genre}</div>
                                </div>
                            </div>
                        </div>
                    }
                    customScrollParent={scrollParent ? scrollParent.contentWrapperEl : undefined}
                />
                <div className="empty-space"/>
            </SimpleBar>
        );
    }
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
