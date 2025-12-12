import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from "react";
import { Virtuoso } from 'react-virtuoso';
import SimpleBar from 'simplebar-react';


import { alphabeticallyOrdered, saveQueue, Songs, SongsFull } from "../globalValues";

// Images
import PlayIcon from '../images/play-icon-outline.svg';
import SearchIcon from '../images/search_icon.svg';


export default function SongPage() {

    const [scrollParent, setScrollParent] = useState<any>(null);

    // const [loading, setLoading] = useState(false);
    const [songList, setSongList] = useState<any[]>([]);
    const [searchValue, setSearchValue] = useState<string>("");

    const [filteredSongs, setFilteredSongs] = useState<any[]>([]);
    const [songSections, setSongSections] = useState<number[]>([]);

    async function getSongs() {
        try {
            const list: SongsFull[] = await invoke<SongsFull[]>('get_all_songs');

            let tempSectionArray: number[] = [];
            const maxSection = alphabeticallyOrdered.indexOf( Math.max.apply(Math, list.map((o: SongsFull) => { return o.song_section})) );
            console.log(maxSection)

            for(let i = 0; i < maxSection; i++) {
                const results = list.filter(obj => obj.song_section === alphabeticallyOrdered[i] ).length;
                tempSectionArray[i] = results;
            }
            setSongSections(tempSectionArray);
            setSongList(list);
            setFilteredSongs(list);
        }
        catch (err) {
            alert(`Failed to scan folder: ${err}`);
        }
    }

    useEffect(() => {
        getSongs();
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
            const maxSection = alphabeticallyOrdered.indexOf( Math.max.apply(Math, temp_section.map((o: SongsFull) => { return o.song_section})) );
            console.log(maxSection)

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

                <div className="song-list">
                    <Virtuoso 
                        totalCount={filteredSongs.length}
                        itemContent={(index) => {
                            let totalIndex = 0;
                            for(let j = 0; j < songSections.length; j++) {                                        
                                        if(totalIndex === index) {
                                            return(
                                                <>
                                                    <div className="grid-20 position-relative">
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
            </div>
            <div className="empty-space"/>
            <div className="empty-space"/>
        </SimpleBar>
    );
}
