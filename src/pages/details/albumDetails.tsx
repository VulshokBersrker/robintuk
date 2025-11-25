// Core Libraries
import { useLocation, useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

// Custom Components
import { GetCurrentSong, savePosition, saveQueue, Songs } from "../../globalValues";
import ImageWithFallBack from "../../components/imageFallback";

// Image Components
import ShuffleIcon from '../../images/shuffle-solid-full.svg';
import PlayIcon from '../../images/play-icon-outline.svg';
import ArrowBackIcon from '../../images/arrow-left.svg';
import SearchIcon from '../../images/search_icon.svg';

interface AlbumDetails {
    name: string,
    total_duration: number,
    cover: string,
    artist: string,
    release: string,
    genre: string,
    num_songs: number,
    hasDiscValue: boolean
}

interface PlaylistList {
    name: string
}

export default function AlbumOverviewPage() {

    const location = useLocation();
    const navigate = useNavigate();
    const [albumList, setAlbumList] = useState<Songs[]>([]);
    // const savedAlbum = useRef(location.state.name);

    const [loading, isLoading] = useState<boolean>(false);
    const [albumDetails, setAlbumDetails] = useState<AlbumDetails>({ name: "", total_duration: 0, cover: "", artist: "", release: "", genre: "", num_songs: 0, hasDiscValue: false});

    const [searchValue, setSearchValue] = useState<string>("");
    const [songSelection, setSongSelection] = useState<Songs[]>([]);
    const [checkBoxNumber, setCheckBoxNumber] = useState<boolean[]>([]);

    const [discs, setDiscs] = useState<number[]>([]);

    // Playlist Values
    const [newPlaylistName, setNewPlaylistName] = useState<string>("");
    const [displayAddToMenu, setDisplayAddToMenu] = useState<boolean>(false);
    const [playlistList, setPlaylistList] = useState<PlaylistList[]>([]);

    const[isCurrent, setIsCurrent] = useState<Songs>({
        id: "", name: "", path: "", cover: "", release: "", track: 0, album: "",
        artist: "", genre: "", album_artist: "", disc_number: 0,  duration: 0
    });

    // On first load get the album details
    useEffect(() => {
        getAlbum();

        const checkCurrentSong = localStorage.getItem("last-played-song");
        if(checkCurrentSong !== null) {
            setIsCurrent(JSON.parse(checkCurrentSong));
        }

        // Load the current song (song / album / playlist) from the backend
        const unlisten_get_current_song = listen<GetCurrentSong>("get-current-song", (event) => { setIsCurrent(event.payload.q)});
        
        return () => {
            unlisten_get_current_song.then(f => f());
        } 
    }, []);

    async function getAlbum() {
        isLoading(true);
        try{
            const res: Songs[] = await invoke("get_album", {name: location.state.name});
            console.log(res);
            setAlbumList(res);
            let dur = 0;
            let checkboxArr: boolean[] = [];
            let i = 0;
            res.forEach((x) => { dur += x.duration; checkboxArr[i] = false; i++; });
            setCheckBoxNumber(checkboxArr);
            setAlbumDetails(
                { 
                    name: res[0].album, 
                    total_duration: dur, 
                    cover: res[0].cover,
                    artist: res[0].album_artist, 
                    release: res[0].release, 
                    genre: res[0].genre, 
                    num_songs: res.length,
                    hasDiscValue: (res[0].disc_number === null ? false : true) 
                }
            );
            let tempDiscArray: number[] = [];
            for(let i = 0; i <= Math.max.apply(Math, res.map((o: Songs) => { return o.disc_number})); i++) {
                tempDiscArray[i] = i;
            }
            setDiscs(tempDiscArray);
        }
        catch(e) {
            alert("Error getting album")
        }
        finally {
            isLoading(false);
        }
    }

    // Load the song the user clicked on but also queue the entire album
    async function playSong(index: number) {
        try {
            await invoke('player_load_album', {queue: albumList, index: index});
            await invoke('update_current_song_played', {path: albumList[index].path});
            await invoke('update_current_song_played');
            saveQueue(albumList);
            savePosition(index);
            // Update the music controls state somehow
        }
        catch (err) {
            alert(`Failed to play song: ${err}`);
        }
    }


    // Selection Function
    function editSelection(song: Songs, isBeingAdded: boolean, index: number) {
        // If we are adding to the array of selected songs
        if(isBeingAdded === true) {
            // Append to the array
            console.log("Adding song: " + song.name);
            setSongSelection([...songSelection, song]);
            const tempArr: boolean[] = checkBoxNumber;
            tempArr[index] = true;
            setCheckBoxNumber(tempArr);

        }
        // If we are removing a song from the array
        else {
            // Find the location of the song in the array with filter and only return the other songs
            console.log("Removing song: " + song.name);
            setSongSelection(songSelection.filter(item => item.id !== song.id));
            const tempArr: boolean[] = checkBoxNumber;
            tempArr[index] = false;
            setCheckBoxNumber(tempArr);
        }
    }

    function clearSelection() {
        setSongSelection([]);
        let tempArr: boolean[] = [];
        for(let i = 0; i < checkBoxNumber.length; i++) {
            tempArr[i]= false;
        }
        setCheckBoxNumber(tempArr);
    }

    // ------------ Selection Bar Functions ------------
     useEffect(() => {
        const fetchData = async() => {
            const list: PlaylistList[] | undefined = await getAllPlaylists();
            if(list !== undefined) {
                setPlaylistList(list);
                console.log("Playlist names: ");
                console.log(list);
            }
        }
        fetchData();        
    }, []);

    async function addToQueue() {
        try {
            await invoke('player_add_to_queue', {queue: songSelection});
        }
        catch(e) {
            console.log(e);
        }
        finally {
            await invoke('get_appended_queue');
            clearSelection();
        }
    }
    
    async function addToPlaylist(name: string) {
        try {
            await invoke('add_to_playlist', {songs: songSelection, playlist_name: name});
        }
        catch(e) {
            console.log(e);
        }
        finally {
            clearSelection();
        }
    }

    async function createPlaylist(name: string) {
        try {
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
    }

    async function getAllPlaylists() {
        try {
            const playlists: PlaylistList[] = await invoke('get_all_playlists',);
            console.log(playlists);
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


    if(loading === true) {
        return(
            <div className="d-flex vertical-centered">
                <span className="loader"/>
            </div>
        );
    }
    else if(loading === false && albumList.length !== 0 && discs.length > 0) {
        return(
            <div className="album-container">
                <div className={`album-details-container`}>
                    
                    {/* Song Selection Bar */}
                    {songSelection.length !== 0 && 
                        <div className="selection-popup-container vertical-centered grid-20">
                            <div className="section-4">{songSelection.length} items selected</div>
                            <div className="section-3"><button className="d-flex align-items-center"><img src={PlayIcon} />Play</button></div>
                            <div className="section-3 position-relative">
                                <button onClick={() => setDisplayAddToMenu(!displayAddToMenu)}>Add to</button>
                                {displayAddToMenu &&
                                    <div className="playlist-list-container">
                                        <div className="" onClick={addToQueue}> Queue </div>
                                        <hr/>
                                        <span className="d-flex justify-content-center align-items-center">
                                            <input
                                                id="new_playlist_input"
                                                type="text"
                                                className="new-playlist"
                                                placeholder="New Playlist"
                                                value={newPlaylistName}
                                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                            />
                                            <span><button onClick={() => {createPlaylist(newPlaylistName)}}>Create</button></span>
                                        </span>
                                        
                                        {playlistList?.map((playlist) => {
                                            return(
                                                <div onClick={() => addToPlaylist(playlist.name)}>
                                                    {playlist.name}
                                                </div>
                                            );
                                        })}
                                    </div>
                                }
                            </div>

                            {/* Only show when you are on a playlist or queue */}
                            <div className="section-3"><button>Remove</button></div>
                            <span className="section-1" onClick={clearSelection}>X</span>
                        </div>
                    }
                    {/* End of Song Selection Bar */}

                    <div className="d-flex top-row justify-content-between">
                        <img src={ArrowBackIcon} className="icon icon-size" onClick={() => {navigate(-1)}}/>
                        <span className="search-bar">
                            <img src={SearchIcon} className="search-icon icon-size"/>
                            <input
                                type="text" placeholder="Search" id="search_albums"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                        </span>
                    </div>
                    {/* Album Details */}
                    <div className="d-flex">
                        <div className="album-details d-flex">   
                            <ImageWithFallBack image={albumDetails.cover} alt={""} image_type={"album"}/>

                            <span style={{paddingLeft: "10px"}} className="grid-15">
                                <div style={{paddingBottom: "10px"}} className="section-15 header-font font-3">{albumDetails.name}</div>
                                <div style={{paddingBottom: "10px"}} className="section-15 header-font font-2">{albumDetails.artist}</div>
                                <span className="section-15 font-0 misc-details">
                                    {albumDetails.release && <> {albumDetails.release} &#x2022;</>}
                                    {albumDetails.num_songs && <> {albumDetails.num_songs} songs &#x2022;</>}
                                    {albumDetails.total_duration && <> {new Date(albumDetails.total_duration * 1000).toISOString().slice(11, 19)} total runtime </>}
                                </span>
                                
                                <div className="section-15 d-flex album-commmands">
                                    <span><button className="font-1 borderless" onClick={() => playSong(0)}><img src={PlayIcon} className=""    /></button></span>
                                    <span><button className="font-1 borderless"                            ><img src={ShuffleIcon} className="" /></button></span>
                                    <span><button className="font-1 position-relative">+ Add to</button></span>
                                </div>
                            </span>
                        </div>
                    </div>
                     
                </div>

                {/* Song list */}
                <div className="song-list">                    
                    {discs.map((disc_number: number) => {
                        let doesDiscExist = false;
                        for(let i = 0; i < albumList.length; i++) {
                            if(disc_number === albumList[i].disc_number) {
                                doesDiscExist = true;
                                break;
                            }
                        }
                        return(
                            <div key={`disc-${disc_number}`}>
                                {/* Row Details - Only render Discs that exist*/}
                                {doesDiscExist &&
                                    <div >
                                        <div className="grid-20 position-relative">
                                            <span className="section-20 header-font font-2" key={disc_number}>Disc {disc_number}</span>
                                            <span className="section-1"></span>
                                            <span className="section-1 track details">#</span>
                                            <span className="section-9 details">Track</span>
                                            <span className="section-8 details">Artist</span>
                                            <span className="section-1 details">Length</span>
                                        </div>
                                        <hr />
                                    </div>
                                }
                                {/* Display all the songs in that disc */}
                                {albumList.map((song, i) => {
                                    if(disc_number === song.disc_number) {
                                        return(
                                            <div key={i}>
                                                <div className={`grid-20 song-row align-items-center ${song.id.localeCompare(isCurrent.id) ? "" : "current-song"}`}>
                                                    <span className="section-1 play ">
                                                        <span className="form-control">
                                                            <input
                                                                type="checkbox" id={`select-${i}`} name={`select-${i}`}
                                                                onClick={(e) => editSelection(song, e.currentTarget.checked, i)}
                                                                onChange={() => {}}
                                                                checked={checkBoxNumber[i]}
                                                            />
                                                        </span>
                                                        <img src={PlayIcon} onClick={() => playSong(i)} />
                                                    </span>
                                                    <span className="section-1 font-0 track ">{song.track}</span>
                                                    <span className="section-9 font-0 name ">{song.name}</span>
                                                    <span className="section-8 font-0 artist ">{song.artist}</span>
                                                    <span className="section-1 header-font duration ">{new Date(song.duration * 1000).toISOString().slice(14, 19)}</span>
                                                </div>
                                                <hr />
                                            </div>
                                        );
                                    }
                                })}    
                            </div>
                        );               
                    })}

                    
                </div>
            </div>
        );
    }
    else if(loading === false && albumList.length !== 0) {
        return(
            <div className="album-container">
                <div className="d-flex top-row justify-content-between">
                    <img src={ArrowBackIcon} className="icon icon-size" onClick={() => {navigate(-1)}}/>
                    <span className="search-bar">
                        <img src={SearchIcon} className="search-icon icon-size"/>
                        <input
                            type="text" placeholder="Search" id="search_albums"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                    </span>
                </div>
                {/* Album Details */}
                <div className="d-flex">
                    <div className="album-details d-flex">   
                        <ImageWithFallBack image={albumDetails.cover} alt={""} image_type={"album"}/>

                        <span style={{paddingLeft: "10px"}} className="grid-15">
                            <div style={{paddingBottom: "10px"}} className="section-15 header-font font-3">{albumDetails.name}</div>
                            <div style={{paddingBottom: "10px"}} className="section-15 header-font font-2">{albumDetails.artist}</div>
                            <span className="section-15 font-0 misc-details">
                                {albumDetails.release} &#x2022; {albumDetails.num_songs} songs &#x2022; {new Date(albumDetails.total_duration * 1000).toISOString().slice(11, 19)} total runtime
                            </span>
                            
                            <div className="section-15 d-flex album-commmands">
                                <span><button className="font-1 d-flex align-items-center" onClick={() => playSong(0)}><img src={PlayIcon} />Play</button></span>
                                <span><button className="font-1">Shuffle play</button></span>
                                <span><button className="font-1">+ Add to</button></span>
                            </div>
                        </span>
                    </div>
                </div>

                {/* Song list */}
                <div className="song-list">
                    <div>
                        <div className="grid-20 position-relative">
                            <span className="section-1"></span>
                            <span className="section-1 vertical-centered font-0 track details">#</span>
                            <span className="section-9 vertical-centered font-0 details">Track</span>
                            <span className="section-8 vertical-centered font-0 details">Artist</span>
                            <span className="section-1 details">Length</span>
                        </div>
                        <hr />
                    </div>
                    {albumList.map((song, i) => {
                        return(
                            <div key={i}>
                                <div className="grid-20 song-row ">
                                    <span className="section-1 vertical-centered play">
                                        <span className="form-control">
                                            <input
                                                type="checkbox" id={`select-${i}`} name={`select-${i}`}
                                                onClick={(e) => editSelection(song, e.currentTarget.checked, i)}
                                                onChange={() => {}}
                                                checked={checkBoxNumber[i]}
                                            />
                                        </span>
                                        <img src={PlayIcon} onClick={() => playSong(i)} />
                                    </span>
                                    <span className="section-1 vertical-centered font-0 track">{song.track}</span>
                                    <span className="section-9 vertical-centered font-0 name">{song.name}</span>
                                    <span className="section-8 vertical-centered font-0 artist">{song.artist}</span>
                                    <span className="section-1 header-font vertical-centered duration">{new Date(song.duration * 1000).toISOString().slice(14, 19)}</span>
                                </div>
                                <hr />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
        
}
