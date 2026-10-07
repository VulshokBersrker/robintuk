// Core Libraries
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GroupedVirtuoso } from "react-virtuoso";
import SimpleBar from "simplebar-react";
import './lyricsData.css';

// Custom Components
import { Songs, alphabeticallyOrdered, getSectionNumber, } from "../../globalValues";

// Image
import SearchIcon from '../../images/search_icon.svg';

type Props = { songs: Songs[] }

export default function LyricSearch({songs}: Props) {

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [scrollParent, setScrollParent] = useState<any>(null);
    const virtuoso = useRef<any>(null);

    const [songList] = useState<Songs[]>(songs);
    const [searchValue, setSearchValue] = useState<string>("");

    const [filteredSongs, setFilteredSongs] = useState<Songs[]>(songs);
    const [songSections, setSongSections] = useState<number[]>([]);

    
    useEffect(() => {
        function setupSongs() {
            
            const groupCounts = alphabeticallyOrdered.map((letter) => {
                return songList.filter((entry) => letter === getSectionNumber(entry.name.toUpperCase().charAt(0)) ).length
            });

            setSongSections(groupCounts);
        }
        setupSongs();

        if(searchParams.get("q") !== null) {
            setSearchValue(searchParams.get("q")!);
            updateSearchResults(searchParams.get("q")!);
        }
    }, []);

    function navigateToLyricsOverview(song_id: number){
        navigate(`/lyrics/song-search?q=${searchValue}`, { replace: true });
        navigate("/lyrics/lrclib-results", {state: {name: song_id }});
    }

    function updateSearchResults(value: string) {
        setSearchValue(value);

        const temp_section: Songs[] = songList.filter((entry) => {
            if(entry.name !== undefined && entry.album !== undefined && entry.album_artist !== undefined) {
                return (entry.name.normalize('NFD').toLowerCase().replace(/[\u0300-\u036f]/g, '').includes(value.toLowerCase())
                || entry.album.normalize('NFD').toLowerCase().replace(/[\u0300-\u036f]/g, '').includes(value.toLowerCase())
                || entry.album_artist.normalize('NFD').toLowerCase().replace(/[\u0300-\u036f]/g, '').includes(value.toLowerCase())
            )
            }
            else {
                return entry;
            }
        });

        const groupCounts = alphabeticallyOrdered.map((letter) => {
            return temp_section.filter((entry) => letter === getSectionNumber(entry.name.toUpperCase().charAt(0)) ).length
        });
        setSongSections(groupCounts);
        
        // console.log(temp_section);
        setFilteredSongs(temp_section);
    }

    return(
        <>  
            <div className="section-list">
                {songList.length !== 0 && alphabeticallyOrdered.map((section, i) => {
                    let totalIndex = 0;
                    for(let j = 0; j < i; j++) { totalIndex += songSections[j]; }
                    if(songSections[i] !== 0 && songSections[i] !== undefined) {
                        // console.log(songSections[i] + " - " + alphabeticallyOrdered[i] + "-" + section);
                        return(
                            <div
                                id={`main-${section}-${totalIndex}`} key={`main-${section}-${totalIndex}`} className="section-key"
                                onClick={() => {
                                    virtuoso.current.scrollToIndex({ index: totalIndex });
                                    return false;
                                }}
                            >
                                <span>
                                    {section === 0 && "&"}
                                    {section === 1 && "#"}
                                    {section > 1 && section < 300 && section !== 0 && String.fromCharCode(section)}
                                    {section === 300 && "..."}
                                </span>
                            </div>                                
                        ); 
                    }                          
                })}
            </div>

            <SimpleBar forceVisible="y" autoHide={false} ref={setScrollParent} className="songs-main">
                <div className="song-page-list">
                    <div className="search-filters d-flex justify-content-between vertical-centered">
                        <h2 style={{textAlign: 'left'}}>Song Lyrics Search</h2> 
                        <span className="search-bar">
                            <img src={SearchIcon} className="bi search-icon icon-size"/>
                            <input
                                type="text" placeholder="Search Songs for Lyrics" id="search_songs_lyrics"
                                autoComplete="off"
                                value={searchValue}
                                onChange={(e) => updateSearchResults(e.target.value)}
                            />
                        </span>
                    </div>

                    <div className="song-list">
                        <GroupedVirtuoso
                            ref={virtuoso}
                            groupCounts={songSections}
                            style={{ height: '100%' }}
                            increaseViewportBy={{ top: 210, bottom: 10 }}
                            groupContent={(index) => {
                                if(songSections[index] !== 0) {
                                    return (
                                        <>
                                            <div className="grid-20 position-relative" key={index} id={`${index}`}>
                                                <span className="section-20 header-font header-color" key={index}>
                                                    {alphabeticallyOrdered[index] === 0 && <h1 className="font-6">&</h1>}
                                                    {alphabeticallyOrdered[index] === 1 && <h1 className="font-6">#</h1>}
                                                    {alphabeticallyOrdered[index] > 1 && alphabeticallyOrdered[index] < 300 && <h1 className="font-p6">{String.fromCharCode(alphabeticallyOrdered[index])}</h1>}
                                                    {alphabeticallyOrdered[index] === 300 && <h1 className="font-6">...</h1>}
                                                </span>
                                                <span className="section-1"></span>
                                                <span className="section-6 vertical-centered details">Name</span>
                                                <span className="section-4 vertical-centered details">Album</span>
                                                <span className="section-4 vertical-centered details">Album Artist</span>
                                                <span className="section-2 vertical-centered details">Release</span>
                                                <span className="section-2 vertical-centered details">Genre</span>
                                                <span className="section-1 vertical-centered details">Length</span>
                                            </div>
                                            <hr />
                                            <div className="song-link" style={{paddingBottom: "1px"}}/>
                                        </>
                                    );
                                }
                                else {
                                    return(<></>);
                                }                                
                            }}
                            itemContent={(index) => {
                                return(
                                    <div className="song-link"
                                        onClick={() => {navigateToLyricsOverview(filteredSongs[index].id)}}
                                        onContextMenu={(e) => { e.preventDefault(); }}
                                    >
                                        <div className={`grid-20 song-row`}>                                            
                                            <span className="section-1 vertical-centered play ">
                                            </span>
                                            
                                            <span className="section-6 vertical-centered font-0 name line-clamp-1">{filteredSongs[index].name}</span>
                                            <span className="section-4 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].album}</span>
                                            <span className="section-4 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].album_artist}</span>
                                            <span className="section-2 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].release}</span>
                                            <span className="section-2 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].genre}</span>
                                            <span className="section-1 header-font vertical-centered duration">{new Date(filteredSongs[index].duration * 1000).toISOString().slice(14, 19)}</span>
                                        </div>
                                        <hr />
                                    </div>
                                );
                            }}
                            components={{
                                Group: (props) => <div {...props} style={{ position: "static" }} />,
                                TopItemList: (props) => (
                                    <div {...props} style={{ position: "static" }} />
                                )
                            }}
                            customScrollParent={scrollParent ? scrollParent.contentWrapperEl : undefined}
                        />
                    </div>

                    {searchValue.length > 0 && filteredSongs.length === 0 &&
                        <div>
                            No Results
                        </div>
                    }
                    <div className="empty-space"/>
                </div>            
            </SimpleBar>
        </>
    );
}

