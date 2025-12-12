// Core Libraries
import { useLocation, useNavigate } from "react-router-dom";
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { Virtuoso } from "react-virtuoso";


// Custom Components
import { ContextMenu, GetCurrentSong, PlaylistFull, PlaylistList, savePosition, saveQueue, saveShuffledQueue, shuffle, Songs } from "../../globalValues";
import CustomContextMenu from "../../components/customContextMenu";
import ImageWithFallBack from "../../components/imageFallback";

// Images
import QueueIcon from '../../images/rectangle-list-regular-full.svg';
import EditIcon from '../../images/pen-to-square-regular-full.svg';
import DeleteIcon from '../../images/trash-can-regular-full.svg';
import ShuffleIcon from '../../images/shuffle-solid-full.svg';
import PlayIcon from '../../images/play-icon-outline.svg';
import ArrowBackIcon from '../../images/arrow-left.svg';
import AddIcon from '../../images/plus-solid-full.svg';
import CloseIcon from '../../images/x.svg';
import SimpleBar from "simplebar-react";


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

    const[contextMenu, setContextMenu] = useState<ContextMenu>({ isToggled: false, context_type: "playlistsong", album: "", artist: "", index: 0, posX: 0, posY: 0 });

    // On first load get the playlits details
    useEffect(() => {
        getPlaylist();

        const checkCurrentSong = localStorage.getItem("last-played-song");
        if(checkCurrentSong !== null) {
            setIsCurrent(JSON.parse(checkCurrentSong));
        }

        // Load the current song (song / album / playlist) from the backend
        const unlisten_get_current_song = listen<GetCurrentSong>("get-current-song", (event) => { setIsCurrent(event.payload.q)});

        const handler = () => {
            if(!contextMenu.isToggled) {
                resetContextMenu();
            }
        }
        document.addEventListener('click', handler);
        
        return () => {
            unlisten_get_current_song.then(f => f());
            document.removeEventListener('click', handler);
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
        }
        catch (err) {
            alert(`Failed to play song: ${err}`);
        }
        finally {
            localStorage.setItem("shuffle-mode", JSON.stringify(false) );
            await invoke("set_shuffle_mode", { mode: false });
        }
    }

    // ------------ Selection Bar Functions ------------
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
            const q = localStorage.getItem("last-played-queue")
            if(q !== null) {
                const oldQ = JSON.parse(q);

                await invoke('player_add_to_queue', {queue: songSelection});
                const newQ = [...oldQ, songSelection];
                localStorage.setItem("last-played-queue", JSON.stringify(newQ) );
            }
            
        }
        catch(e) {
            console.log(e);
        }
        finally {
            const test = await invoke('player_get_queue');
            console.log(test)
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
            setDisplayAddToMenu(false);
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
            setDisplayAddToMenu(false);
            clearSelection();
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
        let tempArr: boolean[] = [];
        for(let i = 0; i < checkBoxNumber.length; i++) {
            tempArr[i]= false;
        }
        setCheckBoxNumber(tempArr);
    }

    // ------------ End of Selection Bar Functions ------------

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
        }
        catch (err) {
            alert(`Failed to play song: ${err}`);
        }
        finally {
            localStorage.setItem("shuffle-mode", JSON.stringify(true) );
            await invoke("set_shuffle_mode", { mode: true });
        }
    }

    function handleContextMenu(e: any, album: string, artist: string, index: number) {
        if(e.pageX < window.innerWidth / 2) {
            setContextMenu({ isToggled: true, context_type: "playlistsong", album: album, artist: artist, index: index, posX: e.pageX, posY: e.pageY});
        }
        else {
            setContextMenu({ isToggled: true, context_type: "playlistsong", album: album, artist: artist, index: index, posX: e.pageX - 150, posY: e.pageY});
        }
    }

    function resetContextMenu() {
        console.log("Resetting Context Menu");
        setContextMenu({ isToggled: false, context_type: "playlistsong", album: "", artist: "", index: 0, posX: 0, posY: 0});
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
                    
                    {/* Song Selection Bar */}
                    <div className={`selection-popup-container grid-20 header-font ${songSelection.length >= 1 ? "open" : "closed"}`}>
                        <div className="section-8">{songSelection.length} item{songSelection.length > 1 && <>s</>} selected</div>
                        <div className="section-4 position-relative">
                            <button className="d-flex align-items-center">
                                <img src={PlayIcon} />
                                &nbsp;Play
                            </button>
                        </div>
                        <div className="section-6 position-relative">
                            <button className="d-flex align-items-center" onClick={() => setDisplayAddToMenu(!displayAddToMenu)}>
                                <img src={AddIcon} />
                                &nbsp;Add to
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
                        <span className="section-2" onClick={clearSelection}> <img src={CloseIcon} /></span>
                    </div>                    
                    {/* End of Song Selection Bar */}

                    <div className="top-row">
                        <img src={ArrowBackIcon} className="icon icon-size" onClick={() => {navigate(-1)}}/>
                    </div>
                    {/* Playlist Details */}
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
                                    <span><button className="font-1 borderless"><img src={EditIcon} /></button></span>
                                    <span><button className="font-1 borderless" onClick={() => {}}><img src={DeleteIcon} /></button></span>
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
                                                <img src={PlayIcon} onClick={() => playPlaylist(index)} />
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
                        context_type={contextMenu.context_type}
                        song={playlist[contextMenu.index]}
                        album={contextMenu.album}
                        artist={contextMenu.artist}
                        index={contextMenu.index}
                        posX={contextMenu.posX}
                        posY={contextMenu.posY}
                        play={playPlaylist}
                        editSelection={editSelection}
                        isBeingAdded={checkBoxNumber[contextMenu.index]}
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
                            <div onClick={AddCustomPlaylistArtwork} className="image-upload">
                                <ImageWithFallBack image={playlistDetails.image} alt={"upload new image"} image_type={"album"}/>
                            </div>
                            

                            <span style={{paddingLeft: "10px"}} className="grid-15">
                                <div style={{paddingBottom: "10px"}} className="section-15 header-font font-3">{location.state.name}</div>
                                <span className="section-15 font-0 misc-details">
                                    0 songs
                                </span>
                                
                                <div className="section-15 d-flex album-commmands">
                                    <span><button className="font-1 borderless" disabled ><img src={PlayIcon} className=""    /></button></span>
                                    <span><button className="font-1 borderless" disabled ><img src={ShuffleIcon} className="" /></button></span>
                                    <span><button className="font-1 borderless" ><img src={EditIcon} /></button></span>
                                    <span><button className="font-1 borderless" onClick={() => {}}><img src={DeleteIcon} /></button></span>
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
