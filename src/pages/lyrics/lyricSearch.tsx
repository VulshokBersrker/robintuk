// Core Libraries
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Virtuoso } from "react-virtuoso";
import SimpleBar from "simplebar-react";

// Custom Components
import { SongsFull, alphabeticallyOrdered, } from "../../globalValues";

// Image
import SearchIcon from '../../images/search_icon.svg';

type Props = { songs: SongsFull[] }

export default function LyricSearch({songs}: Props) {

    const navigate = useNavigate();

    const [scrollParent, setScrollParent] = useState<any>(null);
    const virtuoso = useRef<any>(null);

    const [songList] = useState<SongsFull[]>(songs);
    const [searchValue, setSearchValue] = useState<string>("");

    const [filteredSongs, setFilteredSongs] = useState<SongsFull[]>(songs);
    const [songSections, setSongSections] = useState<number[]>([]);

    
    useEffect(() => {
        function setupSongs() {
            
            let tempSectionArray: number[] = [];
            const maxSection = alphabeticallyOrdered.indexOf( Math.max.apply(Math, songList.map((o: SongsFull) => { return o.song_section})) );

            for(let i = 0; i < maxSection + 1; i++) {
                const results = songs.filter(obj => obj.song_section === alphabeticallyOrdered[i] ).length;
                tempSectionArray[i] = results;
            }
            setSongSections(tempSectionArray); 
        }
        setupSongs();
    }, []);

    function updateSearchResults(value: string) {
        setSearchValue(value);

        const temp_section = songList.filter((entry) => {
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

        let tempSectionArray: number[] = [];
            const maxSection = alphabeticallyOrdered.length;

            for(let i = 0; i < maxSection; i++) {
                const results = temp_section.filter(obj => obj.song_section === alphabeticallyOrdered[i] ).length;
                tempSectionArray[i] = results;
            }
            setSongSections(tempSectionArray);
        
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
                        <Virtuoso 
                            ref={virtuoso}
                            totalCount={filteredSongs.length}
                            increaseViewportBy={{ top: 210, bottom: 10 }}
                            itemContent={(index) => {
                                let totalIndex = 0;
                                for(let j = 0; j < songSections.length; j++) {                                        
                                    if(totalIndex === index) {
                                        return(
                                            <>
                                                <div className="grid-20 position-relative" key={index} id={`${index}`}>
                                                    <span className="section-20 header-font header-color" key={j}>
                                                        {filteredSongs[index].song_section === 0 && <h1 className="font-6">&</h1>}
                                                        {filteredSongs[index].song_section === 1 && <h1 className="font-6">#</h1>}
                                                        {filteredSongs[index].song_section > 1 && filteredSongs[index].song_section < 300 && <h1 className="font-p6">{String.fromCharCode(filteredSongs[index].song_section)}</h1>}
                                                        {filteredSongs[index].song_section === 300 && <h1 className="font-6">...</h1>}
                                                    </span>
                                                    <span className="section-5 details">Name</span>
                                                    <span className="section-7 details">Album</span>
                                                    <span className="section-5 details">Album Artist</span>
                                                    <span className="section-2 details">Release</span>
                                                    <span className="section-1 details">Length</span>
                                                </div>
                                                <hr />
                                                <div className="items-center justify-between">
                                                    <div className="song-link"
                                                        onClick={() => { navigate("/lyrics/lrclib-results", {state: {name: filteredSongs[index].path }});}}
                                                    >
                                                        <div className={`grid-20 song-row`}>
                                                            <span className="section-5 vertical-centered font-0 name line-clamp-1">{filteredSongs[index].name}</span>
                                                            <span className="section-7 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].album}</span>
                                                            <span className="section-5 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].album_artist}</span>
                                                            <span className="section-2 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].release}</span>
                                                            <span className="section-1 header-font vertical-centered duration">{new Date(filteredSongs[index].duration * 1000).toISOString().slice(14, 19)}</span>
                                                        </div>
                                                        <hr />
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    }
                                    totalIndex += songSections[j];
                                }
                                return(
                                    <div className="items-center justify-between">
                                        <div className="song-link"
                                            onClick={() => { navigate("/lyrics/lrclib-results", {state: {name: filteredSongs[index].path }});}}
                                        >
                                            <div className={`grid-20 song-row`}>
                                                <span className="section-5 vertical-centered font-0 name line-clamp-1">{filteredSongs[index].name}</span>
                                                <span className="section-7 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].album}</span>
                                                <span className="section-5 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].album_artist}</span>
                                                <span className="section-2 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].release}</span>
                                                <span className="section-1 header-font vertical-centered duration">{new Date(filteredSongs[index].duration * 1000).toISOString().slice(14, 19)}</span>
                                            </div>
                                            <hr />
                                        </div>
                                    </div>
                                );                                
                            }}
                            customScrollParent={scrollParent ? scrollParent.contentWrapperEl : undefined}
                        />
                    </div>
                    <div className="empty-space"/>
                </div>            
            </SimpleBar>
        </>
    );
}

