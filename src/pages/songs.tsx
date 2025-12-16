import { useEffect, useRef, useState } from "react";
import { invoke } from '@tauri-apps/api/core';
import { Virtuoso } from 'react-virtuoso';
import SimpleBar from 'simplebar-react';

import { alphabeticallyOrdered, saveQueue, Songs, SongsFull } from "../globalValues";

// Images
import PlayIcon from '../images/play-icon-outline.svg';
import SearchIcon from '../images/search_icon.svg';

type Props = {
    songs: SongsFull[]
}

export default function SongPage({songs}: Props) {

    const [scrollParent, setScrollParent] = useState<any>(null);
    const virtuoso = useRef<any>(null);

    // const [loading, setLoading] = useState(false);
    const [songList, setSongList] = useState<SongsFull[]>(songs);
    const [searchValue, setSearchValue] = useState<string>("");

    const [filteredSongs, setFilteredSongs] = useState<SongsFull[]>(songs);
    const [songSections, setSongSections] = useState<number[]>([]);

    
    useEffect(() => {
        function setupSongs() {
            
            let tempSectionArray: number[] = [];
            const maxSection = alphabeticallyOrdered.indexOf( Math.max.apply(Math, songList.map((o: SongsFull) => { return o.song_section})) );
            console.log(maxSection)

            for(let i = 0; i < maxSection; i++) {
                const results = songList.filter(obj => obj.song_section === alphabeticallyOrdered[i] ).length;
                tempSectionArray[i] = results;
            }
            setSongSections(tempSectionArray); 
        }
        setupSongs();
    }, []);

    function updateSearchResults(value: string) {
        setSearchValue(value);

        const temp_section = songList.filter((entry) => {
            if(entry.name !== undefined) {
                return entry.name.toLowerCase().includes(value.toLowerCase());
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

    async function playSong(index: number) {
        try {
            const arr: Songs[] = [filteredSongs[index]];
            // Update the music controls state somehow
            await invoke('player_load_album', {queue: arr, index: 0});
            await invoke('update_current_song_played', {path: arr[0].path});
            await invoke('get_queue', {q: arr, index: 0});
            saveQueue(arr);
            await invoke('create_stored_queue', { songs: arr, shuffled: false });
        }
        catch (err) {
            alert(`Failed to play song: ${err}`);
        }
    }



    return(
        <SimpleBar forceVisible="y" autoHide={false} ref={setScrollParent}>
            <div className="song-page-list">
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

                <div className="section-list">
                    {alphabeticallyOrdered.map((section, i) => {
                        let totalIndex = 0;
                        for(let j = 0; j < i; j++) { totalIndex += songSections[j]; }
                        if(songSections[i] !== 0) {
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
                                                <span className="section-20 header-font" key={j}>
                                                    {filteredSongs[index].song_section === 0 && <h1 className="header-3">&</h1>}
                                                    {filteredSongs[index].song_section === 1 && <h1 className="header-3">#</h1>}
                                                    {filteredSongs[index].song_section > 1 && filteredSongs[index].song_section < 300 && <h1 className="header-3">{String.fromCharCode(filteredSongs[index].song_section)}</h1>}
                                                    {filteredSongs[index].song_section === 300 && <h1 className="header-3">...</h1>}
                                                </span>
                                                <span className="section-1"></span>
                                                <span className="section-6 details">Name</span>
                                                <span className="section-4 details">Album</span>
                                                <span className="section-4 details">Album Artist</span>
                                                <span className="section-2 details">Release</span>
                                                <span className="section-2 details">Genre</span>
                                                <span className="section-1 details">Length</span>
                                            </div>
                                            <hr />
                                            <div className="flex items-center justify-between">
                                                <div className="song-link">
                                                    <div className={`grid-20 song-row`}>
                                                        
                                                        <span className="section-1 vertical-centered play ">
                                                            <span style={{paddingRight: '3px', paddingLeft: "3px"}}>
                                                                <input type="checkbox" id="vehicle1" name="vehicle1" value="Bike" onChange={() => {}} />
                                                            </span>
                                                            <img src={PlayIcon} onClick={() => {playSong(index)}}/>
                                                        </span>
                                                        
                                                        <span className="section-6 vertical-centered font-0 name line-clamp-1">{filteredSongs[index].name}</span>
                                                        <span className="section-4 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].album}</span>
                                                        <span className="section-4 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].artist}</span>
                                                        <span className="section-2 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].release}</span>
                                                        <span className="section-2 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].genre}</span>
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
                                <div className="flex items-center justify-between">
                                    <div className="song-link">
                                        <div className={`grid-20 song-row`}>
                                            
                                            <span className="section-1 vertical-centered play ">
                                                <span style={{paddingRight: '3px', paddingLeft: "3px"}}>
                                                    <input type="checkbox" id="vehicle1" name="vehicle1" value="Bike" onChange={() => {}} />
                                                </span>
                                                <img src={PlayIcon} onClick={() => {playSong(index)}}/>
                                            </span>
                                            
                                            <span className="section-6 vertical-centered font-0 name line-clamp-1">{filteredSongs[index].name}</span>
                                            <span className="section-4 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].album}</span>
                                            <span className="section-4 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].artist}</span>
                                            <span className="section-2 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].release}</span>
                                            <span className="section-2 vertical-centered font-0 artist line-clamp-1">{filteredSongs[index].genre}</span>
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
    );
}


// async function getSongs() {
//     try {
//         const list: SongsFull[] = await invoke<SongsFull[]>('get_all_songs');

//         let tempSectionArray: number[] = [];
//         const maxSection = alphabeticallyOrdered.indexOf( Math.max.apply(Math, list.map((o: SongsFull) => { return o.song_section})) );
//         console.log(maxSection)

//         for(let i = 0; i < maxSection; i++) {
//             const results = list.filter(obj => obj.song_section === alphabeticallyOrdered[i] ).length;
//             tempSectionArray[i] = results;
//         }
//         setSongSections(tempSectionArray);
//         setSongList(list);
//         setFilteredSongs(list);
//     }
//     catch (err) {
//         alert(`Failed to scan folder: ${err}`);
//     }
// }