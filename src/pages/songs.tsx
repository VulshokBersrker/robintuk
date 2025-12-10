import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from "react";

import ListVirtualization from '../components/lists/listVirtualization.js';
import { SongRes, Songs } from "../globalValues";

import SearchIcon from '../images/search_icon.svg';



export default function SongPage() {

    // const [loading, setLoading] = useState(false);
    const [songList, setSongList] = useState<any[]>([]);
    const [searchValue, setSearchValue] = useState<string>("");

    const [filteredSongs, setFilteredSongs] = useState<any[]>([]);

    async function getSongs() {
        try {
            const list: SongRes[] = await invoke<SongRes[]>('get_all_songs');
            let testV: any[] = [];
            for(let i = 0; i < list.length; i++) {
                testV.push(list[i].name);
                for(let j = 0; j < list[i].song_list.length; j++) {
                    testV.push(list[i].song_list[j]);
                }
            }
            console.log(testV)
            setSongList(testV);
            setFilteredSongs(testV);
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
        
        // console.log(temp_section);
        setFilteredSongs(temp_section);
    }



    return(
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

            <ListVirtualization song_data={filteredSongs} />

        </div>
    );
}
