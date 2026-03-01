// Core Libraries
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Virtuoso } from "react-virtuoso";
import SimpleBar from "simplebar-react";

// Custom Components
import { GetCurrentSong, PlaylistFull, PlaylistList, playSelection, savePosition, Songs } from "../../globalValues";
import ImageWithFallBack from "../../components/imageFallback";
import SongDetailsModal from "../../components/songDetails";

// Images
import DeselectIcon from '../../images/circle-xmark-regular-full.svg';
import QueueIcon from '../../images/rectangle-list-regular-full.svg';
import SelectIcon from '../../images/circle-check-regular-full.svg';
import EditIcon from '../../images/pen-to-square-regular-full.svg';
import AlbumIcon from '../../images/vinyl-record-svgrepo-com.svg';
import PlayOutlineIcon from '../../images/play-icon-outline.svg';
import DeleteIcon from '../../images/trash-can-regular-full.svg';
import ShuffleIcon from '../../images/shuffle-solid-full.svg';
import ArtistIcon from '../../images/user-regular-full.svg';
import PlayIcon from '../../images/play-solid-full.svg';
import ArrowBackIcon from '../../images/arrow-left.svg';
import InfoIcon from '../../images/info-solid-full.svg';
import AddIcon from '../../images/plus-solid-full.svg';
import CloseIcon from '../../images/x.svg';


interface PlaylistDetails {
    name: string,
    total_duration: number,
    image: string,
    num_songs: number,
}

export default function PlaylistOverviewPage() {

    const location = useLocation();
    const navigate = useNavigate();
    const [scrollParent, setScrollParent] = useState<any>(null);

    const [playlist, setPlaylist] = useState<Songs[]>([]);
    const [editPlaylist, setEditPlaylist] = useState<boolean>(false);
    const [currentPlaylistName, setCurrentPlaylistName] = useState<string>("");

    const [loading, isLoading] = useState<boolean>(false);
    const [playlistDetails, setPlaylistDetails] = useState<PlaylistDetails>({ name: "", total_duration: 0, image: "", num_songs: 0 });

    const [songSelection, setSongSelection] = useState<Songs[]>([]);
    const [checkBoxNumber, setCheckBoxNumber] = useState<boolean[]>([]);

    // Playlist Values
    const [newPlaylistName, setNewPlaylistName] = useState<string>("");
    const [displayAddToMenu, setDisplayAddToMenu] = useState<boolean>(false);
    const [playlistList, setPlaylistList] = useState<PlaylistList[]>([]);
    

    const[isCurrent, setIsCurrent] = useState<Songs>({ name: "", path: "", cover: "", release: "", track: 0, album: "",
        artist: "", genre: "", album_artist: "", disc_number: 0,  duration: 0, song_section: 0
    });

    const[contextMenu, setContextMenu] = useState({ isToggled: false, context_type: "playlistsong", album: "", artist: "", index: 0, posX: 0, posY: 0 });
    const isContextMenuOpen = useRef<any>(null);
    const [displaySongDetails, setDisplaySongDetails] = useState<boolean>(false);
    const [displaySong, setDisplaySong] = useState<string>("");

    // On first load get the playlits details
    useEffect(() => {
        getPlaylist();
        getAllPlaylists();

        const checkCurrentSong = localStorage.getItem("last-played-song");
        if(checkCurrentSong !== null) {
            setIsCurrent(JSON.parse(checkCurrentSong));
        }

        // Load the current song (song / album / playlist) from the backend
        const unlisten_get_current_song = listen<GetCurrentSong>("get-current-song", (event) => { setIsCurrent(event.payload.q)});
        const unlisten_remove_song = listen<GetCurrentSong>("remove-song", (event) => { setPlaylist(l => l.filter(item => item.path !== event.payload.q.path)); });

        const handler = (e: any) => {
            if(!contextMenu.isToggled && !isContextMenuOpen.current?.contains(e.target)) {
                resetContextMenu();
            }
        }
        document.addEventListener('mousedown', handler);
        
        return () => {
            unlisten_get_current_song.then(f => f());
            unlisten_remove_song.then(f => f());
            document.removeEventListener('mousedown', handler);
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

    function navigateToAlbum(album: string) {
        navigate("/albums/overview", {state: {name: album}});
    }
    function navigateToArtist(artist: string) {
        navigate("/artists/overview", {state: {name: artist}});
    }

    // --------------------------- Playlist Functions ---------------------------

    async function getPlaylist() {
        isLoading(true);        
        try{
            const res: PlaylistFull = await invoke("get_playlist", {id: location.state.name});
            setPlaylist(res.songs);
            let dur = 0;
            let checkboxArr: boolean[] = Array(res.songs.length).fill(false);
            res.songs.forEach((x) => { dur += x.duration; });
            setCheckBoxNumber(checkboxArr);
            setPlaylistDetails(
                { 
                    name: res.name, 
                    total_duration: dur, 
                    image: res.image,
                    num_songs: res.songs.length
                }
            );
            setCurrentPlaylistName(res.name);
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
            isLoading(false);
        }
    }

    async function updatePlaylistName() {
        try {
            invoke("rename_playlist", { old_name: playlistDetails.name, new_name: currentPlaylistName });
        }
        catch(e) {
            console.log(e)
        }
        finally {
            await invoke('new_playlist_added');
            setPlaylistDetails({...playlistDetails, name: currentPlaylistName});
            setEditPlaylist(false);
            
        }
    }

    // Doesn't update image if you change the file of the old uploaded image with a new image (same name and extension but different image)
    async function addCustomPlaylistArtwork() {
        let cover_image: string = "";
        try {
            const file_path = await open({ multiple: false, directory: false, filters: [{name: "Image", extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif']}] });
            if(file_path !== null) {
                cover_image = file_path.toString();
                await invoke("add_playlist_cover", { file_path: file_path.toString(), playlist_name: playlistDetails.name, playlist_id: location.state.name });
            }
        }
        catch(err) {
            console.log(`Failed to add custom artwork: ${err}`);
        }
        finally {
            if(cover_image !== "") {
                setPlaylistDetails({ ...playlistDetails, image: cover_image });
                await invoke('new_playlist_added');
            }
        }
    }

    // Load the song the user clicked on but also queue the entire album
    async function playPlaylist(index: number, shuffled: boolean) {
        resetContextMenu();
        setDisplayAddToMenu(false);
        try {            
            await invoke("play_playlist", {playlist_id: location.state.name, index: index, shuffled: shuffled})
            savePosition(index);
        }
        catch(err) {
            console.log(`Failed to play song: ${err}`);
        }
        finally {
            localStorage.setItem("shuffle-mode", JSON.stringify(shuffled) );
            await invoke("set_shuffle_mode", { mode: shuffled });
        }
    }

    async function removeSong(index: number) {
        resetContextMenu();
        setDisplayAddToMenu(false);
        try {
            let temp: Songs[] = playlist;
            temp = playlist.filter((song) => song.path !== playlist[index].path)
            setPlaylist(temp);
            await invoke("remove_song_from_playlist", {playlist_id: location.state.name, song_path: playlist[index].path, songs: temp });       
        }
        catch (err) {
            alert(`Failed remove song from playlist: ${err}`);
        }        
    }
    async function removeSelectedSongs() {
        resetContextMenu();
        setDisplayAddToMenu(false);
        try {
            const selection = songSelection;
            clearSelection();
            const newList = removeFromArray(selection);
            setPlaylist(newList);
            await invoke("remove_multiple_songs_from_playlist", {playlist_id: location.state.name, songs: selection });
            
        }
        catch (err) {
            alert(`Failed remove song from playlist: ${err}`);
        }
    }

    function removeFromArray(args: Songs[]) {
        return playlist.filter(e => !args.some(j => j.path === e.path));
    }

    // ------------ Selection Bar Functions ------------
    async function addToQueue() {
        resetContextMenu();
        setDisplayAddToMenu(false);
        try {            
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
    }
    
    async function addToPlaylist(name: string) {
        resetContextMenu();
        setDisplayAddToMenu(false);
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
        resetContextMenu();
        setDisplayAddToMenu(false);
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
            const playlists: PlaylistList[] = await invoke('get_all_playlists');
            if(playlists.length !== 0) {
                setPlaylistList(playlists);
            }
            else {
                setPlaylistList([]);
            }            
        }
        catch(e) {
            console.log(e);
        }
    }

    // ------------ Start of Selection Bar Functions ------------
    
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
        setDisplayAddToMenu(false);
    }

    // ------------ End of Selection Bar Functions ------------


    async function reorderPlaylist(old_index: number, new_index: number) {
        try {
            let temp: Songs[] = playlist;
            temp.splice(new_index, 0, temp.splice(old_index, 1)[0]);
            setPlaylist(temp);
            invoke("reorder_playlist", { playlist_id: location.state.name, songs: temp });
        }
        catch(e) {
            console.log("Error reordering playlist" + e);
        }
        resetContextMenu();
    };

    // Context Menu Functions

    function handleContextMenu(e: any, album: string, artist: string, index: number) {
        if(e.pageX < window.innerWidth / 2) {
            if(e.pageY < window.innerHeight / 2) {
                setContextMenu({ isToggled: true, context_type: "playlistsong", album: album, artist: artist, index: index, posX: e.pageX, posY: e.pageY});
            }
            else {
                setContextMenu({ isToggled: true, context_type: "playlistsong", album: album, artist: artist, index: index, posX: e.pageX, posY: e.pageY - 380});
            }
        }
        else {
            if(e.pageY < window.innerHeight / 2) {
                setContextMenu({ isToggled: true, context_type: "playlistsong", album: album, artist: artist, index: index, posX: e.pageX - 150, posY: e.pageY});
            }
            else {
                setContextMenu({ isToggled: true, context_type: "playlistsong", album: album, artist: artist, index: index, posX: e.pageX - 150, posY: e.pageY - 380});
            }
        }
    }

    function resetContextMenu() {
        setContextMenu({ isToggled: false, context_type: "playlistsong", album: "", artist: "", index: 0, posX: 0, posY: 0});
        setDisplayAddToMenu(false);
    }

    function updateSongDetailsDisplay(bool: boolean, path: string) {
        setDisplaySongDetails(bool);
        setDisplaySong(path)
        resetContextMenu();
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
            <SimpleBar forceVisible="y" autoHide={false} ref={setScrollParent}>
                <div className="album-container">

                    {displaySongDetails && <SongDetailsModal song_path={displaySong} bool={displaySongDetails} updateSongDetailsDisplay={updateSongDetailsDisplay} />}
                    
                    {/* Song Selection Bar */}
                    <div className={`selection-popup-container grid-20 header-font ${songSelection.length >= 1 ? "open" : "closed"}`}>
                        <div className="section-6 font-0" style={{marginLeft: "8px"}}>{songSelection.length} item{songSelection.length > 1 && <>s</>} selected</div>
                        <div className="section-4 position-relative ">
                            <button className="d-flex align-items-center" onClick={() => { playSelection(songSelection); clearSelection(); }}>
                                <img src={PlayIcon} />
                                &nbsp;Play
                            </button>
                        </div>
                        <div className="section-4 position-relative ">
                            <button className="d-flex align-items-center" onClick={() => setDisplayAddToMenu(!displayAddToMenu)}>
                                <img src={AddIcon} />
                                &nbsp;Add
                            </button>

                            {displayAddToMenu &&
                                <div className="playlist-list-container header-font">
                                    <div className="item d-flex align-items-center" onClick={addToQueue}>
                                        <img src={QueueIcon} className="icon-size"/> &nbsp;Queue
                                    </div>
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
                                            if(playlist.id !== location.state.name) {
                                                return(
                                                    <div className="item" key={playlist.name} onClick={() => addToPlaylist(playlist.name)}>
                                                        {playlist.name}
                                                    </div>
                                                );
                                            }                                            
                                        })}
                                    </SimpleBar>
                                </div>
                            }
                        </div>

                        <div className="section-4 position-relative ">
                            <button className="d-flex align-items-center"  onClick={() => removeSelectedSongs()}>
                                <img src={DeselectIcon} />
                                &nbsp;Remove
                            </button>
                        </div>

                        <span className="section-1 vertical-centered cursor-pointer" style={{marginRight: "-15px"}} onClick={clearSelection}> <img src={CloseIcon} /></span>
                    </div>                    
                    {/* End of Song Selection Bar */}

                    <div className="top-row">
                        <img src={ArrowBackIcon} className="icon icon-size" onClick={() => {navigate(-1)}}/>
                    </div>
                    {/* Playlist Details */}
                    <div className="d-flex">
                        <div className="album-details d-flex">   
                            <div onClick={addCustomPlaylistArtwork} className="image-upload">
                                <ImageWithFallBack image={playlistDetails.image} alt={"upload new image"} image_type={"album"}/>
                            </div>
                            

                            <span style={{paddingLeft: "10px"}} className="grid-15">
                                {!editPlaylist && <div style={{paddingBottom: "16px", marginLeft: '2px'}} className="section-15 header-font font-3">{currentPlaylistName}</div>}
                                {editPlaylist &&
                                    <div style={{marginTop: '-5px', marginLeft:'-9px', paddingBottom: "12px"}} className="section-15 d-flex align-items-center">
                                        <input
                                            id="current-playlist-name"
                                            type="text"
                                            className="header-font font-3"
                                            style={{width: '300px', height: '40px'}}
                                            placeholder={currentPlaylistName}
                                            value={currentPlaylistName}
                                            onChange={(e) => setCurrentPlaylistName(e.target.value) }
                                        />
                                        <span className="" style={{marginBottom: '0px', marginLeft: '6px'}}>
                                            <button className="white" onClick={updatePlaylistName}>Update</button>
                                        </span>
                                    </div>
                                }
                                <span className="section-15 font-0 misc-details">
                                    {playlistDetails.num_songs && <> {playlistDetails.num_songs} songs &#x2022;</>}
                                    {playlistDetails.total_duration && <> {new Date(playlistDetails.total_duration * 1000).toISOString().slice(11, 19)} total runtime </>}
                                </span>
                                
                                <div className="section-15 d-flex album-commmands">
                                    <span>
                                        <button
                                            className="font-1 borderless"
                                            disabled={editPlaylist}
                                            onClick={() => playPlaylist(0, false)}
                                        >
                                            <img src={PlayIcon} />
                                        </button>
                                    </span>
                                    <span><button className="font-1 borderless" disabled={editPlaylist} onClick={() => playPlaylist(0, true)}><img src={ShuffleIcon} /></button></span>
                                    <span><button className="font-1 borderless" onClick={() => setEditPlaylist(!editPlaylist)}><img src={EditIcon} /></button></span>
                                    <span>
                                        <button
                                            className={`font-1 borderless red ${editPlaylist ? "" : "display-none"}`}
                                            onClick={deletePlaylist}
                                        >
                                            <img src={DeleteIcon} />
                                        </button>
                                    </span>
                                </div>
                            </span>
                        </div>
                    </div>

                    {/* Song list */}
                    <div className="song-list">
                        <div className="grid-20 position-relative">
                            <span className="section-2" style={{width: '125px'}}>&nbsp;</span>
                            <span className="section-9 vertical-centered font-0 details">Name</span>
                            <span className="section-4 vertical-centered font-0 details">Album</span>
                            <span className="section-4 vertical-centered font-0 details">Album Artist</span>
                            <span className="section-1 details">Length</span>
                        </div>
                        <hr />

                        <Virtuoso 
                            totalCount={playlist.length}
                            itemContent={(index) => {
                                return(
                                    <div key={index} >
                                        <div
                                            className={`grid-20 song-row align-items-center ${playlist[index].path.localeCompare(isCurrent.path) ? "" : "current-song"}`}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                handleContextMenu(e, playlist[index].album, playlist[index].album_artist, index);
                                            }}
                                        >
                                            <span className="section-1 play">
                                                <span className="form-control">
                                                    <input
                                                        type="checkbox" id={`select-${index}`} name={`select-${index}`}
                                                        onClick={(e) => editSelection(playlist[index], e.currentTarget.checked, index)}
                                                        onChange={() => {}}
                                                        checked={checkBoxNumber[index]}
                                                    />
                                                </span>
                                                <img src={PlayOutlineIcon} onClick={() => playPlaylist(index, false)} />
                                            </span>
                                            <span className="section-1 d-flex justify-content-end"><ImageWithFallBack image={playlist[index].cover} alt="" image_type="playlist-song" /></span>
                                            <span className="section-9 font-0 name">{playlist[index].name}</span>
                                            <span className="section-4 font-0 line-clamp-2 artist" onClick={() => navigateToAlbum(playlist[index].album)}>{playlist[index].album}</span>
                                            <span className="section-4 font-0 line-clamp-2 artist" onClick={() => navigateToArtist(playlist[index].album_artist)}>{playlist[index].album_artist}</span>
                                            <span className="section-1 header-font duration">{new Date(playlist[index].duration * 1000).toISOString().slice(14, 19)}</span>
                                        </div>
                                        <hr />
                                    </div>
                                );                                
                            }}
                            customScrollParent={scrollParent ? scrollParent.contentWrapperEl : undefined}
                        />
                    </div>

                    <CustomContextMenu
                        isToggled={contextMenu.isToggled}
                        song={playlist[contextMenu.index]}
                        album={contextMenu.album}
                        artist={contextMenu.artist}
                        index={contextMenu.index}
                        length={playlist.length}
                        posX={contextMenu.posX}
                        posY={contextMenu.posY}
                        play={playPlaylist}
                        editSelection={editSelection}
                        reorder={reorderPlaylist}
                        remove={removeSong}
                        isBeingAdded={checkBoxNumber[contextMenu.index]}
                        playlistList={playlistList}
                        name={playlistDetails.name}
                        createPlaylist={createPlaylist} 
                        addToPlaylist={addToPlaylist} 
                        addToQueue={addToQueue}
                        updateSongDetailsDisplay={updateSongDetailsDisplay}
                        ref={isContextMenuOpen}
                    />
                    
                </div>
                <div className="empty-space" />
            </SimpleBar>
        );
    }
    else if(loading === false && playlist.length === 0) {
        return(
            <SimpleBar forceVisible="y" autoHide={false} >
                <div className="album-container">

                    <div className="top-row">
                        <img src={ArrowBackIcon} className="icon icon-size" onClick={() => {navigate(-1)}}/>
                    </div>
                    {/* Playlist Details */}
                    <div className="d-flex">
                        <div className="album-details d-flex">   
                            <div onClick={addCustomPlaylistArtwork} className="image-upload">
                                <ImageWithFallBack image={playlistDetails.image} alt={"upload new image"} image_type={"album"}/>
                            </div>
                            

                            <span style={{paddingLeft: "10px"}} className="grid-15">
                                {!editPlaylist && <div style={{paddingBottom: "16px", marginLeft: '2px'}} className="section-15 header-font font-3">{currentPlaylistName}</div>}
                                {editPlaylist &&
                                    <div style={{marginTop: '-5px', marginLeft:'-9px', paddingBottom: "12px"}} className="section-15 d-flex align-items-center">
                                        <input
                                            id="current-playlist-name"
                                            type="text"
                                            className="header-font font-3"
                                            style={{width: '300px', height: '40px'}}
                                            placeholder={currentPlaylistName}
                                            value={currentPlaylistName}
                                            onChange={(e) => setCurrentPlaylistName(e.target.value) }
                                        />
                                        <span className="" style={{marginBottom: '0px', marginLeft: '6px'}}>
                                            <button className="white" onClick={updatePlaylistName}>Update</button>
                                        </span>
                                    </div>
                                }
                                <span className="section-15 font-0 misc-details">
                                    0 songs
                                </span>
                                
                                <div className="section-15 d-flex album-commmands">
                                    <span><button className="font-1 borderless" disabled ><img src={PlayIcon} /></button></span>
                                    <span><button className="font-1 borderless" disabled ><img src={ShuffleIcon} /></button></span>
                                    <span><button className="font-1 borderless" onClick={() => setEditPlaylist(!editPlaylist)}><img src={EditIcon} /></button></span>
                                    <span>
                                        <button
                                            className={`font-1 borderless red ${editPlaylist ? "" : "display-none"}`}
                                            onClick={deletePlaylist}
                                        >
                                            <img src={DeleteIcon} />
                                        </button>
                                    </span>
                                </div>
                            </span>
                        </div>
                    </div>

                    {/* Song list */}
                    <div className="song-list">
                        <div className="grid-20 position-relative">
                            <span className="section-2" style={{width: '125px'}}>&nbsp;</span>
                            <span className="section-9 vertical-centered font-0 details">Name</span>
                            <span className="section-4 vertical-centered font-0 details">Album</span>
                            <span className="section-4 vertical-centered font-0 details">Album Artist</span>
                            <span className="section-1 details">Length</span>
                        </div>
                        <hr />
                    </div>
                </div>
                <div className="empty-space" />
            </SimpleBar>
        );
    }
}


type Props = {
    isToggled: boolean,
    // Song Values
    song: Songs,
    album: string,
    artist: string,
    index: number,
    length: number,
    play: (index: number, shuffle: boolean) => void,
    editSelection: (song: Songs, isBeingAdded: boolean, index: number) => void,
    reorder: (old_index: number, new_index: number) => void,
    remove: (index: number) => void,
    isBeingAdded: boolean,
    posX: number,
    posY: number,
    // Playlist
    name: string,
    playlistList: PlaylistList[],
    createPlaylist: (name: string) => void,
    addToPlaylist: (name: string) => void
    addToQueue: () => void,
    updateSongDetailsDisplay: (bool: boolean, path: string) => void,
    ref: any
}

function CustomContextMenu({ 
    isToggled, song, album, artist, index, length, 
    play, editSelection, reorder, remove, 
    isBeingAdded, posX, posY,
    playlistList, name,
    createPlaylist, addToPlaylist, addToQueue, updateSongDetailsDisplay,
    ref
}: Props) {

    const [displayAddMenu, setDisplayAddMenu] = useState<boolean>(false);
    const [newPlaylistName, setNewPlaylistName] = useState<string>("");

    const navigate = useNavigate();

    function NavigateToAlbum() {
        navigate("/albums/overview", {state: {name: album}});
    }
    function NavigateToArtist() {
        navigate("/artists/overview", {state: {name: artist}});
    }

    useEffect(() => {
        const element = document.getElementsByClassName("simplebar-content-wrapper");
        if(isToggled) {
            element[0].classList.add("overflow-y-hidden");
        }
        else {
            element[0].classList.remove("overflow-y-hidden");
            setDisplayAddMenu(false);
        }
    }, [isToggled]);
    
    if(isToggled) {
        return(
            <div 
                className="context-menu-container header-font font-1"
                style={{ position: "fixed", left: `${posX}px`, top: `${posY}px`}}
                onContextMenu={(e) => {  e.preventDefault(); }}
                ref={ref}
            >
                <li className="d-flex align-items-center"
                    onClick={() => editSelection(song, !isBeingAdded, index) }
                >
                    {isBeingAdded === true && <><img src={DeselectIcon} />&nbsp;Deselect</>}
                    {isBeingAdded === false && <><img src={SelectIcon} />&nbsp;Select</>}
                </li>

                <li onClick={() => {play(index, false)}} className="d-flex align-items-center">
                    <img src={PlayIcon} /> &nbsp; Play
                </li>

                <li className="position-relative">
                    <span className="d-flex" onClick={()=> setDisplayAddMenu(!displayAddMenu)}>
                        <img src={AddIcon} /> &nbsp; Add to
                    </span>
                    {displayAddMenu &&
                        <div className="playlist-list-container add-context-menu header-font">
                            <div className="item d-flex align-items-center" onClick={addToQueue}>
                                <img src={QueueIcon} className="icon-size"/> &nbsp;Queue
                            </div>
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
                                    if(playlist.name !== name) {
                                        return(
                                            <div className="item" key={playlist.name} onClick={() => addToPlaylist(playlist.name)}>
                                                {playlist.name}
                                            </div>
                                        );
                                    }                                            
                                })}
                            </SimpleBar>
                        </div>
                    }
                </li>

               {/* Playlist Buttons */}
                {index > 0 &&
                    <li className="d-flex align-items-center" onClick={() => reorder(index, index - 1)} >
                        <img src={ArrowBackIcon} className="rotate-up icon"/>
                        &nbsp; Move Up
                    </li>
                }
                {index !== length - 1 &&
                    <li className="d-flex align-items-center" onClick={() => reorder(index, index + 1)} >
                        <img src={ArrowBackIcon} className="rotate-down icon" />
                        &nbsp; Move Down
                    </li>
                }
                <li className="d-flex align-items-center" onClick={() => remove(index)} >
                    <img src={CloseIcon} />
                    &nbsp; Remove
                </li>
                {/* Navigation Buttons */}
                {album !== "" &&
                        <li className="d-flex align-items-center" onClick={NavigateToAlbum} >
                        <img src={AlbumIcon} />
                        &nbsp; Show Album
                    </li>
                }
                {artist !== "" &&
                    <li className="d-flex align-items-center" onClick={NavigateToArtist} >
                        <img src={ArtistIcon} />
                        &nbsp; Show Artist
                    </li>
                }
                

                <li  className="d-flex align-items-center" onClick={() => updateSongDetailsDisplay(true, song.path)} >
                    <img src={InfoIcon} />
                    &nbsp; Song Details
                </li>
            </div>
        );
    }
    else { return; }    
}
