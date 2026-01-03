// Core Libraries
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Virtuoso } from "react-virtuoso";

// Custom Components
import { ContextMenu, GetCurrentSong, savePosition, saveQueue, saveShuffledQueue, shuffle, Songs, PlaylistList } from "../../globalValues";
import CustomContextMenu from "../../components/customContextMenu";
import ImageWithFallBack from "../../components/imageFallback";

// Image Components
import QueueIcon from '../../images/rectangle-list-regular-full.svg';
import ShuffleIcon from '../../images/shuffle-solid-full.svg';
import PlayIcon from '../../images/play-icon-outline.svg';
import ArrowBackIcon from '../../images/arrow-left.svg';
import AddIcon from '../../images/plus-solid-full.svg';
import CloseIcon from '../../images/x.svg';
import SimpleBar from "simplebar-react";
import SongDetailsModal from "../../components/songDetails";


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

export default function AlbumOverviewPage() {

    const location = useLocation();
    const navigate = useNavigate();
    const [scrollParent, setScrollParent] = useState<any>(null);

    const [albumList, setAlbumList] = useState<Songs[]>([]);

    const [loading, isLoading] = useState<boolean>(false);
    const [albumDetails, setAlbumDetails] = useState<AlbumDetails>({ name: "", total_duration: 0, cover: "", artist: "", release: "", genre: "", num_songs: 0, hasDiscValue: false});

    const [songSelection, setSongSelection] = useState<Songs[]>([]);
    const [checkBoxNumber, setCheckBoxNumber] = useState<boolean[]>([]);

    const [discGroups, setDiscGroups] = useState<number[]>([]);

    // Playlist Values
    const [newPlaylistName, setNewPlaylistName] = useState<string>("");
    const [displayAddToMenu, setDisplayAddToMenu] = useState<boolean>(false);
    const [playlistList, setPlaylistList] = useState<PlaylistList[]>([]);

    const[isCurrent, setIsCurrent] = useState<Songs>({
        name: "", path: "", cover: "", release: "", track: 0, album: "",
        artist: "", genre: "", album_artist: "", disc_number: 0,  duration: 0, song_section: 0
    });

    const[contextMenu, setContextMenu] = useState<ContextMenu>({ isToggled: false, context_type: "album_songs", album: "", artist: "", index: 0, posX: 0, posY: 0 });
    const isContextMenuOpen = useRef<any>(null);
    const [displaySongDetails, setDisplaySongDetails] = useState<boolean>(false);
    const [displaySong, setDisplaySong] = useState<string>("");

    // On first load get the album details
    useEffect(() => {
        getAlbum();

        const checkCurrentSong = localStorage.getItem("last-played-song");
        if(checkCurrentSong !== null) {
            setIsCurrent(JSON.parse(checkCurrentSong));
        }
        // Load the current song (song / album / playlist) from the backend
        const unlisten_get_current_song = listen<GetCurrentSong>("get-current-song", (event) => { setIsCurrent(event.payload.q)});

        const handler = (e: any) => {
            if(!contextMenu.isToggled && !isContextMenuOpen.current?.contains(e.target)) {
                resetContextMenu();
            }
        }
        document.addEventListener('mousedown', handler);


        return () => {
            unlisten_get_current_song.then(f => f());
            document.removeEventListener('mousedown', handler);
        } 
    }, []);

    async function getAlbum() {
        isLoading(true);
        try{
            const res: Songs[] = await invoke("get_album", {name: location.state.name});
            // console.log(res);
            setAlbumList(res);
            let dur = 0;
            res.forEach((x) => { dur += x.duration; });
            setCheckBoxNumber(Array(res.length).fill(false));
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
            const maxDisc = Math.max.apply(Math, res.map((o: Songs) => { return o.disc_number}));

            for(let i = 1; i <= maxDisc; i++) {
                const results = res.filter(obj => obj.disc_number === i ).length;
                tempDiscArray[i] = results;
            }
            setDiscGroups(tempDiscArray);
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
        resetContextMenu();
        try {
            await invoke('player_load_album', {queue: albumList, index: index});
            await invoke('update_current_song_played', {path: albumList[index].path});
            saveQueue(albumList);
            savePosition(index);
        }
        catch (err) {
            alert(`Failed to play song: ${err}`);
        }
    }

    async function shuffleAlbum() {
        try {
            let shufflePlaylist = albumList.slice();
            shuffle(shufflePlaylist);
            await invoke('player_load_album', { queue: shufflePlaylist, index: 0 });
            await invoke('update_current_song_played', { path: shufflePlaylist[0].path });
            await invoke('update_current_song_played');
            saveQueue(albumList);
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

    // Selection Function
    function editSelection(song: Songs, isBeingAdded: boolean, index: number) {
        resetContextMenu();
        if(songSelection.length === 0) { setDisplayAddToMenu(false); }
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
    
    async function addToPlaylistContextMenu(id: number, song: Songs) {
        setDisplayAddToMenu(false);
        resetContextMenu();
        try {            
            const arr: Songs[] = [song];            
            await invoke('add_to_playlist', {songs: arr, playlist_id: id});
        }
        catch(e) {
            console.log(e);
        }
        finally {
            clearSelection();
        }        
    }

    async function addToPlaylist(id: number) {
        setDisplayAddToMenu(false);
        resetContextMenu();
        clearSelection();
        try { 
            await invoke('add_to_playlist', {songs: albumList, playlist_id: id});
        }
        catch(e) {
            console.log(e);
        }       
    }

    async function addSelectedToPlaylist(id: number) {
        setDisplayAddToMenu(false);
        resetContextMenu();
        try {
            await invoke('add_to_playlist', {songs: songSelection, playlist_id: id});
        }
        catch(e) {
            console.log(e);
        }
        finally {
            clearSelection();
        }
    }

    async function createSelectedPlaylist(name: string) {
        setDisplayAddToMenu(false);
        resetContextMenu();
        try {
            await invoke('create_playlist', {name: name, songs: songSelection, songs_to_add: true});
            clearSelection();
            await invoke('new_playlist_added');
        }
        catch(e) {
            console.log(e);
        }
    }

    async function createPlaylist(name: string) {
        setDisplayAddToMenu(false);
        resetContextMenu();
        clearSelection();
        try {
            await invoke('create_playlist', {name: name, songs: albumList, songs_to_add: true});
            await invoke('new_playlist_added');
        }
        catch(e) {
            console.log(e);
        }
    }

    function updateSongDetailsDisplay(bool: boolean, path: string) {
        setDisplaySongDetails(bool);
        setDisplaySong(path)
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

    // ------------ End of Selection Bar Functions ------------

    function handleContextMenu(e: any, album: string, artist: string, index: number) {
        if(e.pageX < window.innerWidth / 2) {
            if(e.pageY < window.innerHeight / 2) {
                setContextMenu({ isToggled: true, context_type: "album_songs", album: album, artist: artist, index: index, posX: e.pageX, posY: e.pageY});
            }
            else {
                setContextMenu({ isToggled: true, context_type: "album_songs", album: album, artist: artist, index: index, posX: e.pageX, posY: e.pageY - 125});
            }
        }
        else {
            if(e.pageY < window.innerHeight / 2) {
                setContextMenu({ isToggled: true, context_type: "album_songs", album: album, artist: artist, index: index, posX: e.pageX - 150, posY: e.pageY});
            }
            else {
                setContextMenu({ isToggled: true, context_type: "album_songs", album: album, artist: artist, index: index, posX: e.pageX - 150, posY: e.pageY - 125});
            }
        }
    }

    function resetContextMenu() {
        console.log("Resetting Context Menu");
        setContextMenu({ isToggled: false, context_type: "album_songs", album: "", artist: "", index: 0, posX: 0, posY: 0});
    }


    if(loading === true) {
        return(
            <div className="d-flex vertical-centered">
                <span className="loader"/>
            </div>
        );
    }
    else if(loading === false && albumList.length !== 0 && discGroups.length > 0) {
        return(
            <SimpleBar forceVisible="y" autoHide={false} ref={setScrollParent}>
                <div className="album-container">

                    {/* Song Selection Bar */}
                    <div className={`selection-popup-container grid-20 header-font ${songSelection.length >= 1 ? "open" : "closed"}`}>
                        <div className="section-8">{songSelection.length} item{songSelection.length > 1 && <>s</>} selected</div>
                        <div className="section-4 position-relative"><button className="d-flex align-items-center"><img src={PlayIcon} /> &nbsp;Play</button></div>
                        <div className="section-6 position-relative">
                            <button className="d-flex align-items-center" onClick={() => setDisplayAddToMenu(!displayAddToMenu)}>
                                <img src={AddIcon} />
                                &nbsp;Add to
                            </button>
                            {displayAddToMenu &&
                                <div className="playlist-list-container header-font">
                                    <div className="d-flex align-items-center" onClick={addToQueue}>
                                        <img src={QueueIcon} className="icon icon-size"/>
                                        <span>&nbsp;Queue</span>
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
                                            <div key={playlist.name} onClick={() => addSelectedToPlaylist(playlist.id)}>
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

                    {displaySongDetails && <SongDetailsModal song_path={displaySong} bool={displaySongDetails} updateSongDetailsDisplay={updateSongDetailsDisplay} />}
                    
                    
                    <div>
                        <div className="d-flex top-row justify-content-between">
                            <img src={ArrowBackIcon} className="icon icon-size" onClick={() => {navigate(-1)}}/>
                        </div>
                        {/* Album Details */}
                        <div>
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
                                        <span><button className="font-1 borderless" onClick={() => playSong(0)}><img src={PlayIcon} /></button></span>
                                        <span><button className="font-1 borderless" onClick={shuffleAlbum} ><img src={ShuffleIcon} /></button></span>
                                        <span className="position-relative">
                                            <button className="font-1 borderless" disabled={albumList.length === 0} onClick={() => setDisplayAddToMenu(!displayAddToMenu)}   ><img src={AddIcon} /> </button>

                                            {displayAddToMenu && songSelection.length === 0 &&
                                                <div className="playlist-list-container add header-font">
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
                                                        <span><button onClick={() => {createSelectedPlaylist(newPlaylistName)}}>Create</button></span>
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

                    </div>

                    {/* Song list */}
                    <div className="song-list">
                        <Virtuoso 
                            totalCount={albumList.length}
                            itemContent={(index) => {
                                    let totalIndex = 0;
                                    for(let j = 1; j < discGroups.length; j++) {                                        
                                        if(totalIndex === index) {
                                            return(
                                                <>
                                                    <div className="grid-20 position-relative" style={{marginTop: '20px'}}>
                                                        <span className="section-20 header-font font-3" key={j}>Disc {j}</span>
                                                        <span className="section-1" style={{width: '68px'}}>&nbsp;</span>
                                                        <span className="section-1 track details">#</span>
                                                        <span className="section-9 details">Name</span>
                                                        <span className="section-8 details">Artist</span>
                                                        <span className="section-1 details">Length</span>
                                                    </div>
                                                    <hr />
                                                    <div key={index} >
                                                        <div
                                                            className={`grid-20 song-row align-items-center ${albumList[index].path.localeCompare(isCurrent.path) ? "" : "current-song"}`}
                                                            onContextMenu={(e) => {
                                                                e.preventDefault();
                                                                handleContextMenu(e, albumList[index].album, albumList[index].album_artist, index);
                                                            }}
                                                        >
                                                            <span className="section-1 play">
                                                                <span className="form-control">
                                                                    <input
                                                                        type="checkbox" id={`select-${index}`} name={`select-${index}`}
                                                                        onClick={(e) => editSelection(albumList[index], e.currentTarget.checked, index)}
                                                                        onChange={() => {}}
                                                                        checked={checkBoxNumber[index]}
                                                                    />
                                                                </span>
                                                                <img src={PlayIcon} onClick={() => playSong(index)} />
                                                            </span>
                                                            <span className="section-1 track">{albumList[index].track}</span>
                                                            <span className="section-9 font-0 name ">{albumList[index].name}</span>
                                                            <span className="section-8 artist ">{albumList[index].artist}</span>
                                                            <span className="section-1 header-font duration ">{new Date(albumList[index].duration * 1000).toISOString().slice(14, 19)}</span>
                                                        </div>
                                                        <hr />
                                                    </div>
                                                </>
                                            );
                                        }
                                        else if(index === 0) {
                                            return(
                                                <>
                                                    <div className="grid-20 position-relative">
                                                        <span className="section-20 header-font font-3" key={1}>Disc {1}</span>
                                                        <span className="section-1" style={{width: '68px'}}>&nbsp;</span>
                                                        <span className="section-1 track details">#</span>
                                                        <span className="section-9 details">Name</span>
                                                        <span className="section-8 details">Artist</span>
                                                        <span className="section-1 details">Length</span>
                                                    </div>
                                                    <hr />
                                                    <div key={index} >
                                                        <div
                                                            className={`grid-20 song-row align-items-center ${albumList[index].path.localeCompare(isCurrent.path) ? "" : "current-song"}`}
                                                            onContextMenu={(e) => {
                                                                e.preventDefault();
                                                                handleContextMenu(e, albumList[index].album, albumList[index].album_artist, index);
                                                            }}
                                                        >
                                                            <span className="section-1 play">
                                                                <span className="form-control">
                                                                    <input
                                                                        type="checkbox" id={`select-${index}`} name={`select-${index}`}
                                                                        onClick={(e) => editSelection(albumList[index], e.currentTarget.checked, index)}
                                                                        onChange={() => {}}
                                                                        checked={checkBoxNumber[index]}
                                                                    />
                                                                </span>
                                                                <img src={PlayIcon} onClick={() => playSong(index)} />
                                                            </span>
                                                            <span className="section-1 track">{albumList[index].track}</span>
                                                            <span className="section-9 font-0 name ">{albumList[index].name}</span>
                                                            <span className="section-8 artist ">{albumList[index].artist}</span>
                                                            <span className="section-1 header-font duration ">{new Date(albumList[index].duration * 1000).toISOString().slice(14, 19)}</span>
                                                        </div>
                                                        <hr />
                                                    </div>
                                                </>
                                            );
                                        }
                                        totalIndex += discGroups[j];
                                    }
                                    return(
                                        <div key={index} >
                                            <div
                                                className={`grid-20 song-row align-items-center ${albumList[index].path.localeCompare(isCurrent.path) ? "" : "current-song"}`}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    handleContextMenu(e, albumList[index].album, albumList[index].album_artist, index);
                                                }}
                                            >
                                                <span className="section-1 play">
                                                    <span className="form-control">
                                                        <input
                                                            type="checkbox" id={`select-${index}`} name={`select-${index}`}
                                                            onClick={(e) => editSelection(albumList[index], e.currentTarget.checked, index)}
                                                            onChange={() => {}}
                                                            checked={checkBoxNumber[index]}
                                                        />
                                                    </span>
                                                    <img src={PlayIcon} onClick={() => playSong(index)} />
                                                </span>
                                                <span className="section-1 track">{albumList[index].track}</span>
                                                <span className="section-9 font-0 name ">{albumList[index].name}</span>
                                                <span className="section-8 artist ">{albumList[index].artist}</span>
                                                <span className="section-1 header-font duration ">{new Date(albumList[index].duration * 1000).toISOString().slice(14, 19)}</span>
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
                        song={albumList[contextMenu.index]}
                        album={contextMenu.album}
                        artist={contextMenu.artist}
                        index={contextMenu.index}
                        posX={contextMenu.posX}
                        posY={contextMenu.posY}
                        play={playSong}
                        editSelection={editSelection}
                        isBeingAdded={checkBoxNumber[contextMenu.index]}
                        playlistList={playlistList}
                        name={""}
                        createPlaylist={createPlaylist} 
                        addToPlaylist={addToPlaylistContextMenu} 
                        addToQueue={addToQueue}
                        updateSongDetailsDisplay={updateSongDetailsDisplay}
                        ref={isContextMenuOpen}
                    />
                    <div className="empty-space"/>
                </div>
                
            </SimpleBar>
        );
    }
    else if(loading === false && albumList.length !== 0) {
        return(
            <SimpleBar forceVisible="y" autoHide={false} ref={setScrollParent}>
                <div className="album-container">

                    {/* Song Selection Bar */}
                    <div className={`selection-popup-container grid-20 header-font ${songSelection.length >= 1 ? "open" : "closed"}`}>
                        <div className="section-8">{songSelection.length} item{songSelection.length > 1 && <>s</>} selected</div>
                        <div className="section-4 position-relative"><button className="d-flex align-items-center"><img src={PlayIcon} /> &nbsp;Play</button></div>
                        <div className="section-6 position-relative">
                            <button className="d-flex align-items-center" onClick={() => setDisplayAddToMenu(!displayAddToMenu)}>
                                <img src={AddIcon} />
                                &nbsp;Add to
                            </button>
                            {displayAddToMenu && songSelection.length >= 1 &&
                                <div className="playlist-list-container header-font">
                                    <div className="d-flex align-items-center" onClick={addToQueue}>
                                        <img src={QueueIcon} className="icon-size"/>
                                        <span>&nbsp;Queue</span>
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
                                            <div key={playlist.name} onClick={() => addSelectedToPlaylist(playlist.id)}>
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
                    
                    {displaySongDetails && <SongDetailsModal song_path={displaySong} bool={displaySongDetails} updateSongDetailsDisplay={updateSongDetailsDisplay} />}
                    
                    <div>
                        <div className="d-flex top-row justify-content-between">
                            <img src={ArrowBackIcon} className="icon icon-size" onClick={() => {navigate(-1)}}/>
                        </div>
                        {/* Album Details */}
                        <div>
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
                                        <span><button className="font-1 borderless" onClick={() => playSong(0)}><img src={PlayIcon} /></button></span>
                                        <span><button className="font-1 borderless" onClick={shuffleAlbum} ><img src={ShuffleIcon} /></button></span>
                                        <span className="position-relative">
                                            <button className="font-1 borderless" disabled={albumList.length === 0} onClick={() => setDisplayAddToMenu(!displayAddToMenu)}   ><img src={AddIcon} /> </button>

                                            {displayAddToMenu && songSelection.length === 0 &&
                                                <div className="playlist-list-container add header-font">
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
                                                        <span><button onClick={() => {createSelectedPlaylist(newPlaylistName)}}>Create</button></span>
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

                    </div>

                    {/* Song list */}
                    <div className="song-list">
                        <>
                            <div className="grid-20 position-relative">
                                <span className="section-1" style={{width: '68px'}}>&nbsp;</span>
                                <span className="section-1 track details">#</span>
                                <span className="section-9 details">Name</span>
                                <span className="section-8 details">Artist</span>
                                <span className="section-1 details">Length</span>
                            </div>
                            <hr />
                        </>                        
                        <Virtuoso 
                            totalCount={albumList.length}
                            itemContent={(index) => {
                                return(
                                    <div key={index} >
                                        <div
                                            className={`grid-20 song-row align-items-center ${albumList[index].path.localeCompare(isCurrent.path) ? "" : "current-song"}`}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                handleContextMenu(e, albumList[index].album, albumList[index].album_artist, index);
                                            }}
                                        >
                                            <span className="section-1 play">
                                                <span className="form-control">
                                                    <input
                                                        type="checkbox" id={`select-${index}`} name={`select-${index}`}
                                                        onClick={(e) => editSelection(albumList[index], e.currentTarget.checked, index)}
                                                        onChange={() => {}}
                                                        checked={checkBoxNumber[index]}
                                                    />
                                                </span>
                                                <img src={PlayIcon} onClick={() => playSong(index)} />
                                            </span>
                                            <span className="section-1 track">{albumList[index].track}</span>
                                            <span className="section-9 font-0 name ">{albumList[index].name}</span>
                                            <span className="section-8 artist ">{albumList[index].artist}</span>
                                            <span className="section-1 header-font duration ">{new Date(albumList[index].duration * 1000).toISOString().slice(14, 19)}</span>
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
                        song={albumList[contextMenu.index]}
                        album={contextMenu.album}
                        artist={contextMenu.artist}
                        index={contextMenu.index}
                        posX={contextMenu.posX}
                        posY={contextMenu.posY}
                        play={playSong}
                        editSelection={editSelection}
                        isBeingAdded={checkBoxNumber[contextMenu.index]} 
                        name={""} 
                        playlistList={playlistList} 
                        createPlaylist={createPlaylist}
                        addToPlaylist={addToPlaylistContextMenu}
                        addToQueue={addToQueue}
                        updateSongDetailsDisplay={updateSongDetailsDisplay}
                        ref={isContextMenuOpen}                    
                    />
                    <div className="empty-space"/>
                </div>
            </SimpleBar>
        );
    }
}