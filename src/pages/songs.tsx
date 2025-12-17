import { useEffect, useRef, useState } from "react";
import { invoke } from '@tauri-apps/api/core';
import { Virtuoso } from 'react-virtuoso';
import SimpleBar from 'simplebar-react';

import { alphabeticallyOrdered, ContextMenu, PlaylistList, saveQueue, Songs, SongsFull } from "../globalValues";
import CustomContextMenu from "../components/customContextMenu";

// Images
import QueueIcon from '../images/rectangle-list-regular-full.svg';
import PlayIcon from '../images/play-icon-outline.svg';
import AddIcon from '../images/plus-solid-full.svg';
import SearchIcon from '../images/search_icon.svg';
import CloseIcon from '../images/x.svg';

type Props = {
    songs: SongsFull[]
}

export default function SongPage({songs}: Props) {

    const [scrollParent, setScrollParent] = useState<any>(null);
    const virtuoso = useRef<any>(null);

    // const [loading, setLoading] = useState(false);
    const [songList] = useState<SongsFull[]>(songs);
    const [searchValue, setSearchValue] = useState<string>("");

    const [filteredSongs, setFilteredSongs] = useState<SongsFull[]>(songs);
    const [songSections, setSongSections] = useState<number[]>([]);

    // Playlist Values
    const [newPlaylistName, setNewPlaylistName] = useState<string>("");
    const [displayAddToMenu, setDisplayAddToMenu] = useState<boolean>(false);
    const [playlistList, setPlaylistList] = useState<PlaylistList[]>([]);
    
    const [songSelection, setSongSelection] = useState<Songs[]>([]);
    const [checkBoxNumber, setCheckBoxNumber] = useState<boolean[]>([]);

    const[contextMenu, setContextMenu] = useState<ContextMenu>({ isToggled: false, context_type: "song", album: "", artist: "", index: 0, posX: 0, posY: 0 });
    const isContextMenuOpen = useRef<any>(null);

    
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
            saveQueue(arr);
            await invoke('create_queue', { songs: arr, shuffled: false });
        }
        catch (err) {
            alert(`Failed to play song: ${err}`);
        }
    }

    // ------------ Start of Selection Bar Functions ------------

    useEffect(() => {
        const fetchData = async() => {
            const list: PlaylistList[] | undefined = await getAllPlaylists();
            if(list !== undefined) {
                setPlaylistList(list);
            }
        }
        fetchData();        
    }, []);

    async function addToQueue() {
        try {
            setDisplayAddToMenu(false);
            let songList: Songs[] = [];
            for(let i = 0; i < songSelection.length; i++) {
                const temp: Songs = await invoke<Songs>('get_song', {song_path: songSelection[i].path});
                songList.push(temp);
            }
            clearSelection();
            await invoke('add_to_queue', {songs: songList});
            await invoke('player_add_to_queue', {queue: songList});
        }
        catch(e) {
            console.log(e);
        }
        resetContextMenu();
    }
    
    async function addToPlaylist(name: string) {
        try {
            setDisplayAddToMenu(false);
            await invoke('add_to_playlist', {songs: songSelection, playlist_name: name});
        }
        catch(e) {
            console.log(e);
        }
        finally {
            
            clearSelection();
        }
        resetContextMenu();
    }

    async function createPlaylist(name: string) {
        try {
            setDisplayAddToMenu(false);
            await invoke('create_playlist', {name: name});
            await invoke('add_to_playlist', {songs: songSelection, playlist_name: name});
            await invoke('new_playlist_added');
        }
        catch(e) {
            console.log(e);
        }
        finally {
            
            clearSelection();
        }
        resetContextMenu();
    }

    async function getAllPlaylists() {
        try {
            const playlists: PlaylistList[] = await invoke('get_all_playlists');
            if(playlists.length !== 0) {
                return playlists;
            }
            else {
                return [];
            }            
        }
        catch(e) {
            console.log(e);
        }
    }
    
    function editSelection(song: Songs, isBeingAdded: boolean, index: number) {
        resetContextMenu();
        // If we are adding to the array of selected songs
        if(isBeingAdded === true) {
            // Append to the array
            setSongSelection([...songSelection, song]);
            const tempArr: boolean[] = checkBoxNumber;
            tempArr[index] = true;
            setCheckBoxNumber(tempArr);

        }
        // If we are removing a song from the array
        else {
            // Find the location of the song in the array with filter and only return the other songs
            setSongSelection(songSelection.filter(item => item.path !== song.path));
            const tempArr: boolean[] = checkBoxNumber;
            tempArr[index] = false;
            setCheckBoxNumber(tempArr);
        }
    }

    function clearSelection() {
        setSongSelection([]);
        setCheckBoxNumber(Array(checkBoxNumber.length).fill(false));
    }

    // ------------ End of Selection Bar Functions ------------

    // Context Menu Functions

    function handleContextMenu(e: any, album: string, artist: string, index: number) {
        if(e.pageX < window.innerWidth / 2) {
            if(e.pageY < window.innerHeight / 2) {
                setContextMenu({ isToggled: true, context_type: "playlistsong", album: album, artist: artist, index: index, posX: e.pageX, posY: e.pageY});
            }
            else {
                setContextMenu({ isToggled: true, context_type: "playlistsong", album: album, artist: artist, index: index, posX: e.pageX, posY: e.pageY - 180});
            }
        }
        else {
            if(e.pageY < window.innerHeight / 2) {
                setContextMenu({ isToggled: true, context_type: "playlistsong", album: album, artist: artist, index: index, posX: e.pageX - 150, posY: e.pageY});
            }
            else {
                setContextMenu({ isToggled: true, context_type: "playlistsong", album: album, artist: artist, index: index, posX: e.pageX - 150, posY: e.pageY - 180});
            }
        }
    }

    function resetContextMenu() {
        console.log("Resetting Context Menu");
        setContextMenu({ isToggled: false, context_type: "playlistsong", album: "", artist: "", index: 0, posX: 0, posY: 0});
        setDisplayAddToMenu(false);
    }



    return(
        <SimpleBar forceVisible="y" autoHide={false} ref={setScrollParent}>
            <div className="song-page-list">
                <div className="search-filters d-flex justify-content-end vertical-centered"> 
                    <span className="search-bar">
                        <img src={SearchIcon} className="bi search-icon icon-size"/>
                        <input
                            type="text" placeholder="Search Albums" id="search_albums"
                            autoComplete="off"
                            value={searchValue}
                            onChange={(e) => updateSearchResults(e.target.value)}
                        />
                    </span>
                </div>

                {/* Song Selection Bar */}
                    <div className={`selection-popup-container grid-20 header-font ${songSelection.length >= 1 ? "open" : "closed"}`}>
                        <div className="section-8">{songSelection.length} item{songSelection.length > 1 && <>s</>} selected</div>
                        <div className="section-5 position-relative">
                            <button className="d-flex align-items-center">
                                <img src={PlayIcon} />
                                &nbsp;Play
                            </button>
                        </div>
                        <div className="section-6 position-relative">
                            <button className="d-flex align-items-center" onClick={() => setDisplayAddToMenu(!displayAddToMenu)}>
                                <img src={AddIcon} />
                                &nbsp;Add
                            </button>

                            {displayAddToMenu &&
                                <div className="playlist-list-container header-font">
                                    <div className="d-flex align-items-center" onClick={addToQueue}>
                                        <img src={QueueIcon} className="icon-size"/>
                                        &nbsp;Queue
                                    </div>
                                    <hr/>
                                    <span className="playlist-input-container d-flex justify-content-center align-items-center">
                                        <input
                                            id="new_playlist_input" type="text" placeholder="New Playlist"
                                            className="new-playlist" value={newPlaylistName}
                                            onChange={(e) => setNewPlaylistName(e.target.value)}
                                        />
                                        <span><button onClick={() => {createPlaylist(newPlaylistName)}}>Create</button></span>
                                    </span>
                                    
                                    {playlistList?.map((playlist) => {
                                        return(
                                            <div key={playlist.name} onClick={() => addToPlaylist(playlist.name)}>
                                                {playlist.name}
                                            </div>
                                        );
                                    })}
                                </div>
                            }
                        </div>

                        <span className="vertical-centered section-1" onClick={clearSelection}> <img src={CloseIcon} /></span>
                    </div>                    
                    {/* End of Song Selection Bar */}

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
                                                <div className="song-link"
                                                    onContextMenu={(e) => {
                                                        e.preventDefault();
                                                        handleContextMenu(e, filteredSongs[index].album, filteredSongs[index].album_artist, index);
                                                    }}
                                                >
                                                    <div className={`grid-20 song-row`}>
                                                        
                                                        <span className="section-1 vertical-centered play ">
                                                            <span className="form-control">
                                                                <input
                                                                    type="checkbox" id={`select-${index}`} name={`select-${index}`}
                                                                    onClick={(e) => editSelection(filteredSongs[index], e.currentTarget.checked, index)}
                                                                    onChange={() => {}} checked={checkBoxNumber[index]}
                                                                />
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
                                    <div className="song-link"
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            handleContextMenu(e, filteredSongs[index].album, filteredSongs[index].album_artist, index);
                                        }}
                                    >
                                        <div className={`grid-20 song-row`}>
                                            
                                            <span className="section-1 vertical-centered play ">
                                                <span className="form-control">
                                                    <input
                                                        type="checkbox" id={`select-${index}`} name={`select-${index}`}
                                                        onClick={(e) => editSelection(filteredSongs[index], e.currentTarget.checked, index)}
                                                        onChange={() => {}} checked={checkBoxNumber[index]}
                                                    />
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

                <CustomContextMenu
                    isToggled={contextMenu.isToggled}
                    context_type={contextMenu.context_type}
                    song={filteredSongs[contextMenu.index]}
                    album={contextMenu.album}
                    artist={contextMenu.artist}
                    index={contextMenu.index}
                    play={playSong}
                    editSelection={editSelection}
                    isBeingAdded={checkBoxNumber[contextMenu.index]}
                    posX={contextMenu.posX}
                    posY={contextMenu.posY}
                    name={""}
                    playlistList={playlistList}
                    createPlaylist={createPlaylist}
                    addToPlaylist={addToPlaylist}
                    addToQueue={addToQueue}
                    ref={isContextMenuOpen}                
                />
            </div>            
        </SimpleBar>
    );
}