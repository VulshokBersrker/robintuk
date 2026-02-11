// Core Libraries
import { useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import SimpleBar from "simplebar-react";

// Custom Components
import { GetCurrentSong, PlaylistList, savePosition, saveQueue, saveSong, Songs } from "../globalValues";
import ImageWithFallBack from "../components/imageFallback";

// Images
import ClearIcon from '../images/trash-can-regular-full.svg';
import PlayIcon from '../images/play-icon-outline.svg';
import ArrowBackIcon from '../images/arrow-left.svg';
import PlusIcon from '../images/plus-solid-full.svg'
import CloseIcon from '../images/x.svg';

export default function QueueOverviewPage() {

    const navigate = useNavigate();
    const [scrollParent, setScrollParent] = useState<any>(null);

    const [loading, isLoading] = useState<boolean>(false);
    const [queue, setQueue] = useState<Songs[]>([]);
    const [duration, setDuration] = useState<number>(0);

    const [songSelection, setSongSelection] = useState<Songs[]>([]);
    const [checkBoxNumber, setCheckBoxNumber] = useState<boolean[]>([]);
    const [isCurrent, setIsCurrent] = useState<Songs>({ name: "", path: "", cover: "", release: "", track: 0, album: "", artist: "", genre: "", album_artist: "", disc_number: 0,  duration: 0, song_section: 0 });

    // Playlist Values
    const [newPlaylistName, setNewPlaylistName] = useState<string>("");
    const [displayAddToMenu, setDisplayAddToMenu] = useState<boolean>(false);
    const [playlistList, setPlaylistList] = useState<PlaylistList[]>([]);

    // On first load get the album details
    useEffect(() => {
        getQueue();

        const checkCurrentSong = localStorage.getItem("last-played-song");
        if(checkCurrentSong !== null) {
            setIsCurrent(JSON.parse(checkCurrentSong));
        }

        // Load the current song (song / album / playlist) from the backend
        const unlisten_get_current_song = listen<GetCurrentSong>("get-current-song", (event) => { setIsCurrent(event.payload.q); saveSong(event.payload.q); });
        
        return () => {
            unlisten_get_current_song.then(f => f());
        }  
    }, []);

    async function getQueue() {
        isLoading(true);
        try{
            const res: Songs[] = await invoke("player_get_queue");
            // console.log(res);
            setQueue(res);
            let dur = 0;
            let checkboxArr: boolean[] = [];
            let i = 0;
            res.forEach((x) => { dur += x.duration; checkboxArr[i] = false; i++; });
            setCheckBoxNumber(checkboxArr);
            setDuration(dur);
        }
        catch(e) {
            alert(e)
        }
        finally {
            isLoading(false);
        }
    }

    async function clearQueue() {
        try{
            setQueue([]);
            await invoke("clear_queue");
            await invoke("player_clear_queue");
            localStorage.removeItem("last-played-queue-position");
            localStorage.removeItem("last-played-song");
            
            setCheckBoxNumber([]);
            setDuration(0);
        }
        catch(e) {
            console.log("Error Clearing the Queue: " + e)
        }
        finally {
            isLoading(false);
        }
    }

    const navigateToAlbumOverview = (name: string) => {
        navigate("/albums/overview", {state: {name: name}});
    }
    const navigateToArtistOverview = (name: string) => {
        navigate("/artists/overview", {state: {name: name}});
    }

    // Load the song the user clicked on but also queue the entire album
    async function playSong(index: number) {
        try {
            await invoke('player_load_album', {queue: queue, index: index});
            await invoke('update_current_song_played', {path: queue[index].path});
            await invoke('update_current_song_played');
            saveQueue(queue);
            savePosition(index);
            // Update the music controls state somehow
        }
        catch (err) {
            alert(`Failed to play song: ${err}`);
        }
    }

    // ------------ Selection Bar Functions ------------
    function editSelection(song: Songs, isBeingAdded: boolean, index: number) {
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

    useEffect(() => {
        const fetchData = async() => {
            const list: PlaylistList[] | undefined = await getAllPlaylists();
            if(list !== undefined) {
                setPlaylistList(list);
            }
        }
        fetchData();        
    }, []);
    
    async function addToPlaylist(id: number) {
        setDisplayAddToMenu(false);
        try {
            await invoke('add_to_playlist', {songs: queue, playlist_id: id});
            clearSelection();
        }
        catch(e) {
            console.log(e);
        }
    }

    async function createPlaylist(name: string) {
        setDisplayAddToMenu(false);        
        try {
            await invoke('create_playlist', {name: name, songs: queue, songs_to_add: true});
            clearSelection();
            await invoke('new_playlist_added');
        }
        catch(e) {
            console.log(e);
        }
    }

    async function addSelectedToPlaylist(id: number) {
        setDisplayAddToMenu(false);
        try {
            await invoke('add_to_playlist', {songs: songSelection, playlist_id: id});
            clearSelection();
        }
        catch(e) {
            console.log(e);
        }
    }

    async function createSelectedPlaylist(name: string) {
        setDisplayAddToMenu(false);        
        try {
            await invoke('create_playlist', {name: name, songs: songSelection, songs_to_add: true});
            clearSelection();
            await invoke('new_playlist_added');
        }
        catch(e) {
            console.log(e);
        }
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

    // ------------ End of Selection Bar Functions ------------

    if(loading) {
        return(
            <div className="d-flex vertical-centered">
                <span className="loader"/>
            </div>
        );
    }
    else {
        return(
            <SimpleBar forceVisible="y" autoHide={false} ref={setScrollParent}>
                <div className="album-container">
                    <div className="d-flex top-row justify-content-start">
                        <img src={ArrowBackIcon} className="icon icon-size" onClick={() => {navigate(-1)}}/>
                    </div>

                    {/* Song Selection Bar */}
                    <div className={`selection-popup-container grid-20 header-font ${songSelection.length >= 1 ? "open" : "closed"}`}>
                        <div className="section-8">{songSelection.length} item{songSelection.length > 1 && <>s</>} selected</div>
                        <div className="section-4 position-relative"><button className="d-flex align-items-center"><img src={PlayIcon} /> &nbsp;Play</button></div>
                        <div className="section-6 position-relative">
                            <button onClick={() => setDisplayAddToMenu(!displayAddToMenu)}>Add to</button>
                            {displayAddToMenu && songSelection.length >= 1 &&
                                <div className="playlist-list-container add-context-menu header-font">
                                    <hr/>
                                    <span className="playlist-input-container d-flex justify-content-center align-items-center">
                                        <input
                                            id="new_playlist_input" type="text" autoComplete="off" placeholder="New Playlist"
                                            className="new-playlist" value={newPlaylistName}
                                            onChange={(e) => setNewPlaylistName(e.target.value)}
                                        />
                                        <span><button onClick={() => {createSelectedPlaylist(newPlaylistName)}}>Create</button></span>
                                    </span>
                                    
                                    <SimpleBar forceVisible="y" autoHide={false} clickOnTrack={false} className="add-playlist-container">
                                        {playlistList?.map((playlist) => {
                                            return(
                                                <div className="item" key={playlist.name} onClick={() => addSelectedToPlaylist(playlist.id)}>
                                                    {playlist.name}
                                                </div>
                                            );                                                                                      
                                        })}
                                    </SimpleBar>
                                </div>
                            }
                        </div>
                        <span className="section-2" onClick={clearSelection}> <img src={CloseIcon} /></span>
                    </div>                    
                    {/* End of Song Selection Bar */}

                    {/* Queue Details */}
                    <div className="d-flex">
                        <div className="album-details d-flex">

                            <span style={{paddingLeft: "10px"}} className="grid-15">
                                <div style={{paddingBottom: "10px"}} className="section-15 header-font font-3">Music Queue</div>
                                <span className="section-15 font-0 misc-details">
                                    {queue.length} songs &#x2022; {new Date(duration * 1000).toISOString().slice(11, 19)} total runtime
                                </span>
                                
                                <div className="section-15 d-flex album-commmands">
                                    <span><button className="borderless font-1 d-flex align-items-center" disabled={queue.length === 0} onClick={clearQueue} ><img src={ClearIcon} /></button></span>
                                    <span className="position-relative">
                                        <button className="borderless font-1" disabled={queue.length === 0} onClick={() => setDisplayAddToMenu(!displayAddToMenu)}  ><img src={PlusIcon} /></button>
                                    
                                        {displayAddToMenu &&
                                            <div className="playlist-list-container add header-font">
                                                <hr/>
                                                <span className="playlist-input-container d-flex justify-content-center align-items-center">
                                                    <input
                                                        id="new_playlist_input" type="text" autoComplete="off" placeholder="New Playlist"
                                                        className="new-playlist" value={newPlaylistName}
                                                        onChange={(e) => setNewPlaylistName(e.target.value)}
                                                    />
                                                    <span><button onClick={() => {createPlaylist(newPlaylistName)}}>Create</button></span>
                                                </span>
                                                
                                                <SimpleBar forceVisible="y" autoHide={false} clickOnTrack={false} className="add-playlist-container">
                                                    {playlistList?.map((playlist) => {
                                                        return(
                                                            <div className="item" key={playlist.name} onClick={() => addToPlaylist(playlist.id)}>
                                                                {playlist.name}
                                                            </div>
                                                        );                                
                                                    })}
                                                </SimpleBar>
                                            </div>
                                        }                                    
                                    </span>
                                </div>
                            </span>
                        </div>
                    </div>

                    {/* Song list */}
                    <div className="song-list">
                        <div className="grid-20 position-relative">
                            <span className="section-2"></span>
                            <span className="section-9 vertical-centered font-0 details">Track</span>
                            <span className="section-4 vertical-centered font-0 details">Album</span>
                            <span className="section-4 vertical-centered font-0 details">Album Artist</span>
                            <span className="section-1 details">Length</span>
                        </div>
                        <hr />
                        
                        <Virtuoso 
                            totalCount={queue.length}
                            itemContent={(index) => {
                                return(
                                    <div key={index}>
                                        <div className={`grid-20 song-row playlist align-items-center ${queue[index].path.localeCompare(isCurrent.path) ? "" : "current-song"}`}>
                                            <span className="section-1 play">
                                                <span style={{paddingRight: '3px', paddingLeft: "3px"}}>
                                                    <input
                                                        type="checkbox" id={`select-${index}`} name={`select-${index}`}
                                                        onClick={(e) => editSelection(queue[index], e.currentTarget.checked, index)}
                                                        checked={checkBoxNumber[index]} onChange={() => {}}
                                                    />
                                                </span>
                                                <img src={PlayIcon} onClick={() => playSong(index)} />
                                            </span>
                                            <span className="section-1 d-flex justify-content-end"><ImageWithFallBack image={queue[index].cover} alt="" image_type="playlist-song" /></span>
                                            <span className="section-9 font-0 name">{queue[index].name}</span>
                                            <span className="section-4 font-0 line-clamp-2 artist" onClick={() => navigateToAlbumOverview(queue[index].album)}>{queue[index].album}</span>
                                            <span className="section-4 font-0 line-clamp-2 artist" onClick={() => navigateToArtistOverview(queue[index].album_artist)}>{queue[index].album_artist}</span>
                                            <span className="section-1 header-font duration">{new Date(queue[index].duration * 1000).toISOString().slice(14, 19)}</span>
                                        </div>
                                        <hr />
                                    </div>
                                );                                
                            }}
                            customScrollParent={scrollParent ? scrollParent.contentWrapperEl : undefined}
                        />
                    </div>
                </div>
                <div className="empty-space"/>                
            </SimpleBar>
        );
    }
}
