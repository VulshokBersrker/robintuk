// Core Libraries
import { useLocation, useNavigate } from "react-router-dom";
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

// Custom Components
import { GetCurrentSong, savePosition, saveQueue, saveShuffledQueue, shuffle, Songs } from "../../globalValues";
import ImageWithFallBack from "../../components/imageFallback";

// Images
import EditIcon from '../../images/pen-to-square-regular-full.svg';
import DeleteIcon from '../../images/trash-can-regular-full.svg';
import ShuffleIcon from '../../images/shuffle-solid-full.svg';
import PlayIcon from '../../images/play-icon-outline.svg';
import ArrowBackIcon from '../../images/arrow-left.svg';

interface PlaylistDetails {
    name: string,
    total_duration: number,
    image: string,
    num_songs: number,
}

interface PlaylistFull {
    name: string,
    image: string,
    songs: Songs[],
}

export default function PlaylistOverviewPage() {

    const location = useLocation();
    const navigate = useNavigate();
    const [playlist, setPlaylist] = useState<Songs[]>([]);

    const [loading, isLoading] = useState<boolean>(false);
    const [playlistDetails, setPlaylistDetails] = useState<PlaylistDetails>({ name: "", total_duration: 0, image: "", num_songs: 0 });

    const [songSelection, setSongSelection] = useState<Songs[]>([]);
    const [checkBoxNumber, setCheckBoxNumber] = useState<boolean[]>([]);

    const[isCurrent, setIsCurrent] = useState<Songs>({ id: "", name: "", path: "", cover: "", release: "", track: 0, album: "",
        artist: "", genre: "", album_artist: "", disc_number: 0,  duration: 0
    });

    // On first load get the playlits details
    useEffect(() => {
        getPlaylist();

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

    // On refresh if a user select another playlist from the sidebar while still looking at a playlist
    useEffect(() => {
        getPlaylist();

        const checkCurrentSong = localStorage.getItem("last-played-song");
        if(checkCurrentSong !== null) {
            setIsCurrent(JSON.parse(checkCurrentSong));
        }

        
    }, [location.state.name]);

    // --------------------------- Playlist Functions ---------------------------

    async function getPlaylist() {
        isLoading(true);
        
        try{
            const res: PlaylistFull = await invoke("get_playlist", {name: location.state.name});
            // console.log(res);
            setPlaylist(res.songs);
            let dur = 0;
            let checkboxArr: boolean[] = [];
            let i = 0;
            res.songs.forEach((x) => { dur += x.duration; checkboxArr[i] = false; i++; });
            setCheckBoxNumber(checkboxArr);
            setPlaylistDetails(
                { 
                    name: res.name, 
                    total_duration: dur, 
                    image: res.image,
                    num_songs: res.songs.length
                }
            );
        }
        catch(e) {
            alert("Error getting playlist: " + e)
        }
        finally {
            isLoading(false);
        }
    }

    // Add are you sure part
    async function deletePlaylist() {
        try {
            isLoading(true);
            await invoke("delete_playlist", {name: playlistDetails.name});
            await invoke('new_playlist_added');
        }
        catch(e) {
            console.log(e);
        }
        finally {
            navigate("/playlists");
        }
    }

    // Doesn't update image if you change the file of the old uploaded image with a new image (same name and extension but different image)
    async function AddCustomPlaylistArtwork() {
        try {
            const file_path = await open({ multiple: false, directory: false });
            if(file_path !== null) {
                await invoke("add_playlist_cover", { file_path: file_path.toString(), playlist_name: location.state.name });
            }
        }
        catch(err) {
            alert(`Failed to add custom artwork: ${err}`);
        }
        finally {
            const res: PlaylistFull = await invoke("get_playlist", {name: location.state.name});
            // update the image
            setPlaylistDetails(
                { 
                    name: res.name, 
                    total_duration: playlistDetails.total_duration, 
                    image: res.image,
                    num_songs: res.songs.length
                }
            );
            await invoke('new_playlist_added');
        }
    }

    // Load the song the user clicked on but also queue the entire album
    async function playPlaylist(index: number) {
        try {
            await invoke('player_load_album', {queue: playlist, index: index});
            await invoke('update_current_song_played', {path: playlist[index].path});
            await invoke('update_current_song_played');
            saveQueue(playlist);
            savePosition(index);
            // Update the music controls state somehow
        }
        catch (err) {
            alert(`Failed to play song: ${err}`);
        }
        finally {
            localStorage.setItem("shuffle-mode", JSON.stringify(false) );
            await invoke("set_shuffle_mode", { mode: false });
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

    async function shufflePlaylist() {
        try {
            let shufflePlaylist = playlist.slice();
            shuffle(shufflePlaylist);
            await invoke('player_load_album', { queue: shufflePlaylist, index: 0 });
            await invoke('update_current_song_played', { path: shufflePlaylist[0].path });
            await invoke('update_current_song_played');
            saveQueue(playlist);
            saveShuffledQueue(shufflePlaylist);
            savePosition(0);
            // Update the music controls state somehow
        }
        catch (err) {
            alert(`Failed to play song: ${err}`);
        }
        finally {
            localStorage.setItem("shuffle-mode", JSON.stringify(true) );
            await invoke("set_shuffle_mode", { mode: true });
        }
    }



    if(loading === true) {
        return(
            <div className="d-flex vertical-centered">
                <span className="loader"/>
            </div>
        );
    }
    else if(loading === false && playlist.length !== 0) {
        return(
            <div className="album-container">
                <div className="d-flex top-row justify-content-between">
                    <img src={ArrowBackIcon} className="icon icon-size" onClick={() => {navigate(-1)}}/>
                </div>
                {/* Album Details */}
                <div className="d-flex">
                    <div className="album-details d-flex">   
                        <div onClick={AddCustomPlaylistArtwork} className="image-upload">
                            <ImageWithFallBack image={playlistDetails.image} alt={"upload new image"} image_type={"album"}/>
                        </div>
                        

                        <span style={{paddingLeft: "10px"}} className="grid-15">
                            <div style={{paddingBottom: "10px"}} className="section-15 header-font font-3">{location.state.name}</div>
                            <span className="section-15 font-0 misc-details">
                                {playlistDetails.num_songs && <> {playlistDetails.num_songs} songs &#x2022;</>}
                                {playlistDetails.total_duration && <> {new Date(playlistDetails.total_duration * 1000).toISOString().slice(11, 19)} total runtime </>}
                            </span>
                            
                            <div className="section-15 d-flex album-commmands">
                                <span><button className="font-1 borderless" onClick={() => playPlaylist(0)}><img src={PlayIcon} className=""    /></button></span>
                                <span><button className="font-1 borderless" onClick={shufflePlaylist}><img src={ShuffleIcon} className="" /></button></span>
                                <span><button className="font-1 borderless"><img src={EditIcon} className="icon"/></button></span>
                                <span><button className="font-1 borderless" onClick={deletePlaylist}><img src={DeleteIcon} className="icon"/></button></span>
                            </div>
                        </span>
                    </div>
                </div>

                {/* Song list */}
                <div className="song-list">
                    <div className="grid-20 position-relative">
                        <span className="section-2"></span>
                        <span className="section-9 vertical-centered font-0 details">Name</span>
                        <span className="section-4 vertical-centered font-0 details">Album</span>
                        <span className="section-4 vertical-centered font-0 details">Artist</span>
                        <span className="section-1 details">Length</span>
                    </div>
                    <hr />
                    {playlist.map((song, i) => {
                        return(
                            <div key={i}>
                                <div className={`grid-20 song-row playlist align-items-center ${song.id.localeCompare(isCurrent.id) ? "" : "current-song"}`}>
                                    <span className="section-1 play">
                                        <span style={{paddingRight: '3px', paddingLeft: "3px"}}>
                                            <input
                                                type="checkbox" id={`select-${i}`} name={`select-${i}`}
                                                onClick={(e) => editSelection(song, e.currentTarget.checked, i)}
                                                checked={checkBoxNumber[i]} onChange={() => {}}
                                            />
                                        </span>
                                        <img src={PlayIcon} onClick={() => playPlaylist(i)} />
                                    </span>
                                    <span className="section-1 d-flex justify-content-end"><ImageWithFallBack image={song.cover} alt="" image_type="playlist-song" /></span>
                                    <span className="section-9 font-0 name">{song.name}</span>
                                    <span className="section-4 font-0 line-clamp-2 artist">{song.album}</span>
                                    <span className="section-4 font-0 line-clamp-2 artist">{song.artist}</span>
                                    <span className="section-1 header-font duration">{new Date(song.duration * 1000).toISOString().slice(14, 19)}</span>
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

type P = {
    selection: Songs[],
    clearSelection: () => void
}
interface PlaylistList {
    name: string
}

function SelectionPopup({selection, clearSelection}: P) {

    const [displayAddToMenu, setDisplayAddToMenu] = useState<boolean>(false);
    const [playlistList, setPlaylistList] = useState<PlaylistList[]>([]);

    const [newPlaylistName, setNewPlaylistName] = useState<string>("");

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
            await invoke('player_add_to_queue', {queue: selection});
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
            await invoke('add_to_playlist', {songs: selection, playlist_name: name});
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
            await invoke('add_to_playlist', {songs: selection, playlist_name: name});
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

    function Playlist_List() {
        return(
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
        );
    }

    return(
        <div className="selection-popup-container vertical-centered grid-20">
            <div className="section-4">{selection.length} items selected</div>
            <div className="section-3"><button className="d-flex align-items-center"><img src={PlayIcon} />Play</button></div>
            <div className="section-3 position-relative">
                <button onClick={() => setDisplayAddToMenu(!displayAddToMenu)}>Add to</button>
                {displayAddToMenu && <Playlist_List />}
            </div>

            {/* Only show when you are on a playlist or queue */}
            <div className="section-3"><button>Remove</button></div>
            <span className="section-1" onClick={clearSelection}>X</span>
        </div>
    );
}


