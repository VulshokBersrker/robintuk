// Core Libraries
import {DragDropContext, Draggable, Droppable} from '@hello-pangea/dnd';
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from "@tauri-apps/api/event";
import { error } from '@tauri-apps/plugin-log';
import { invoke } from "@tauri-apps/api/core";
import { Virtuoso } from "react-virtuoso";
import SimpleBar from "simplebar-react";
import './details.css';

// Custom Components
import { GetCurrentSong, PlaylistFull, PlaylistList, savePosition, Songs } from "../../globalValues";
import SongDetailsModal from "../../components/songDetails/songDetails";
import SongSelectionBar from '../../components/songSelectionBar';
import ImageWithFallBack from "../../components/imageFallback";

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
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [isDelete, setIsDelete] = useState<boolean>(false);

    const [loading, isLoading] = useState<boolean>(true);
    const [playlistDetails, setPlaylistDetails] = useState<PlaylistDetails>({ name: "", total_duration: 0, image: "", num_songs: 0 });

    const [songSelection, setSongSelection] = useState<Songs[]>([]);
    const [checkBoxNumber, setCheckBoxNumber] = useState<boolean[]>([]);

    // Playlist Values
    
    const [_displayAddToMenu, setDisplayAddToMenu] = useState<boolean>(false);
    const [playlistList, setPlaylistList] = useState<PlaylistList[]>([]);
    

    const[isCurrent, setIsCurrent] = useState<Songs>({ id: -1,  name: "", path: "", cover: "", release: "", track: 0, album: "",
        artist: "", genre: "", album_artist: "", disc_number: 0,  duration: 0, song_section: 0, album_id: -1, album_artist_id: -1
    });

    const[contextMenu, setContextMenu] = useState({ isToggled: false, context_type: "playlistsong", album: "", artist: "", index: 0, posX: 0, posY: 0, side: 0 });
    const isContextMenuOpen = useRef<any>(null);
    const [displaySongDetails, setDisplaySongDetails] = useState<boolean>(false);
    const [displaySong, setDisplaySong] = useState<number>(-1);

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
        // const unlisten_remove_song = listen<GetCurrentSong>("remove-song", (event) => { setPlaylist(l => l.filter(item => item.path !== event.payload.q.path)); });

        const handler = (e: any) => {
            if(!contextMenu.isToggled && !isContextMenuOpen.current?.contains(e.target)) {
                resetContextMenu();
            }
        }
        document.addEventListener('mousedown', handler);
        
        return () => {
            unlisten_get_current_song.then(f => f());
            // unlisten_remove_song.then(f => f());
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

        setIsEdit(false);
    }, [location.state.name]);

    function navigateToAlbum(album: string) {
        navigate("/albums/overview", {state: {name: album}});
    }
    function navigateToArtist(artist: string) {
        navigate("/artists/overview", {state: {name: artist}});
    }

    function closeEdit() {
        setIsEdit(false);
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
        }
        catch(e) {
            console.log("Error getting playlist: " + e);
            error(`Playlist Overview (Error) - Error Getting Playlist Details ${location.state.name}`);
            navigate("/playlists");
        }
        finally {
            isLoading(false);
        }
    }

    // Add are you sure part
    async function deletePlaylist() {
        try {
            isLoading(true);
            await invoke("delete_playlist", {id: location.state.name});
            await invoke('new_playlist_added');
        }
        catch(e) {
            error("Playlist Overview (Error) - Error Deleting Playlist");
            console.log(e);
        }
        finally {
            navigate("/playlists");
            isLoading(false);
        }
    }
    function cancelDelete() {
        setIsDelete(false);
    }

    async function updatePlaylist(name: string, cover: string) {
        try {
            setPlaylistDetails({...playlistDetails, name: name, image: cover});
            invoke("rename_playlist", { id: location.state.name, name: name });
            await invoke("add_playlist_cover", { file_path: cover, playlist_name: playlistDetails.name, playlist_id: location.state.name });
        }
        catch(e) {
            error("Playlist Overview (Error) - Error Updating Playlist Details");
            console.log(e)
        }
        finally {
            await invoke('new_playlist_added');
            setIsEdit(false);
        }
    }

    // Load the song the user clicked on but also queue the entire album
    async function playPlaylist(index: number, shuffled: boolean) {
        resetContextMenu();
        setDisplayAddToMenu(false);
        try {        
            localStorage.setItem("shuffle-mode", JSON.stringify(shuffled) );
            await invoke("set_shuffle_mode", { mode: shuffled });
            
            await invoke("play_playlist", {playlist_id: location.state.name, index: index, shuffled: shuffled})
            savePosition(index);
        }
        catch(err) {
            error("Playlist Overview (Error) - Error Playing Playlist");
            console.log(`Failed to play song: ${err}`);
        }
    }

    async function removeSong(index: number) {
        resetContextMenu();
        setDisplayAddToMenu(false);
        try {
            let temp: Songs[] = playlist;
            temp = playlist.filter((song) => song.path !== playlist[index].path)
            setPlaylist(temp);
            await invoke("remove_song_from_playlist", {playlist_id: location.state.name, position: index });       
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
            error(`Remove Selected Songs: Failed to remove songs: ${err}`);
            console.log(`Remove Selected Songs: Failed to remove songs: ${err}`);
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
            error("Playlist Overview (Error) - Error Adding to Queue");
            console.log(e);
        }        
    }

    async function createPlaylist(name: string, song: Songs) {
        resetContextMenu();
        setDisplayAddToMenu(false);
        try {
            await invoke('create_playlist', {name: name, songs: [song], songs_to_add: true});
            await invoke('new_playlist_added');
        }
        catch(e) {
            error("Playlist Overview (Error) - Error Creating Playlist");
            console.log(e);
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
            error("Playlist Overview (Error) - Error Getting All Playlist Names");
            console.log(e);
        }
    }

    async function playSelection() {
        try {
            await invoke('play_selection', {songs: songSelection, shuffled: false});
            clearSelection();
            await invoke('update_current_song_played');
            savePosition(0);
            // Update the music controls state somehow
        }
        catch (err) {
            error(`Failed to play song: ${err}`);
            console.log(`Failed to play song: ${err}`);
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


    // ------------ Context Menu Functions ------------

    function handleContextMenu(e: any, album: string, artist: string, index: number) {
        if(e.pageX < window.innerWidth / 2) {
            if(e.pageY < window.innerHeight / 2) {
                setContextMenu({ isToggled: true, context_type: "playlistsong", album: album, artist: artist, index: index, posX: e.pageX, posY: e.pageY, side: 0});
            }
            else {
                setContextMenu({ isToggled: true, context_type: "playlistsong", album: album, artist: artist, index: index, posX: e.pageX, posY: e.pageY - 268, side: 0});
            }
        }
        else {
            if(e.pageY < window.innerHeight / 2) {
                setContextMenu({ isToggled: true, context_type: "playlistsong", album: album, artist: artist, index: index, posX: e.pageX - 150, posY: e.pageY, side: 1});
            }
            else {
                setContextMenu({ isToggled: true, context_type: "playlistsong", album: album, artist: artist, index: index, posX: e.pageX - 150, posY: e.pageY - 268, side: 1});
            }
        }
    }

    function resetContextMenu() {
        setContextMenu({ isToggled: false, context_type: "playlistsong", album: "", artist: "", index: 0, posX: 0, posY: 0, side: 0});
        setDisplayAddToMenu(false);
    }

    function updateSongDetailsDisplay(bool: boolean, id: number) {
        setDisplaySongDetails(bool);
        setDisplaySong(id);
        resetContextMenu();
    }

    async function addToPlaylistContextMenu(id: number, song: Songs) {
        setDisplayAddToMenu(false);
        resetContextMenu();
        try { 
            await invoke('add_to_playlist', {songs: [song], playlist_id: id});
        }
        catch(e) {
            console.log(e);
        }
        finally {
            clearSelection();
        }
    }

    // ------------ Drag and Drop Functions ------------
    async function onDragEnd(result: any) {
        if(!result.destination) {
            return;
        }
        if(result.source.index === result.destination.index) {
            return;
        }

        const newOrder = reorder(playlist, result.source.index, result.destination.index);
        // Save the song id from before the reorder for the backend
        const movedSong = playlist[result.source.index].path;
        setPlaylist(newOrder);

        try {
            await invoke("reorder_playlist", {playlist_id: location.state.name, song_path: movedSong, start: result.source.index, end: result.destination.index});
        }
        catch(e) {
            console.log(e);
        }
    }

    const HeightPreservingItem = useCallback(({ children, ...props }: any) => {
        const [size, setSize] = useState(0);
        const knownSize = props["data-known-size"];

        useEffect(() => {
            setSize((prevSize) => {
                return knownSize == 0 ? prevSize : knownSize;
            });
        }, [knownSize]);

        // check style.css for the height-preserving-container rule
        if(children.props.index !== null) {
            return(
                <div
                    {...props}
                    className="height-preserving-container"
                    style={{
                        "--child-height": `${size}px`
                    }}
                >
                    {/* The Item Function */}
                    {children}
                </div>
            );
        }
        
    }, []);


    function reorder(list: Songs[], startIndex: number, endIndex: number) {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);

        return result;
    }

    function Item({ provided, item, isDragging, itemIndex }: any) {
        return (
            <div
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                ref={provided.innerRef}
                style={provided.draggableProps.style}
                className={`item ${isDragging ? "is-dragging" : ""}`}
            >
                <div
                    className={`grid-20 song-row align-items-center ${item.path.localeCompare(isCurrent.path) ? "" : "current-song"}`}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        handleContextMenu(e, item.album, item.album_artist, item.index);
                    }}
                >
                    <span className="section-1 play">
                        <span className="form-control">
                            <input
                                type="checkbox" id={`select-${itemIndex}`} name={`select-${itemIndex}`}
                                onClick={(e) => editSelection(item, e.currentTarget.checked, itemIndex)}
                                onChange={() => {}}
                                checked={checkBoxNumber[itemIndex]}
                            />
                        </span>
                        <img src={PlayOutlineIcon} onClick={() => playPlaylist(itemIndex, false)} />
                    </span>
                    <span className="section-1 d-flex justify-content-end"><ImageWithFallBack image={item.cover} alt="" image_type="playlist-song" /></span>
                    <span className="section-9 font-0 name">{item.name}</span>
                    <span className="section-4 font-0 line-clamp-2 artist" onClick={() => navigateToAlbum(item.album)}>{item.album}</span>
                    <span className="section-4 font-0 line-clamp-2 artist" onClick={() => navigateToArtist(item.album_artist)}>{item.album_artist}</span>
                    <span className="section-1 header-font duration">{new Date(item.duration * 1000).toISOString().slice(14, 19)}</span>
                </div>
                <hr />
            </div>
        );
    }


    if(loading) {
        return(
            <div className="d-flex vertical-centered">
                <span className="loader"/>
            </div>
        );
    }
    else if(loading === false && playlist.length !== 0) {
        return(
            <SimpleBar forceVisible="y" autoHide={false} ref={setScrollParent} className="playlist-main">
                <div className="album-container">

                    <Delete isDelete={isDelete} deletePlaylist={deletePlaylist} cancelDelete={cancelDelete}/>
                    <EditPlaylist
                        isOpen={isEdit}
                        playlistDetails={playlistDetails}
                        updatePlaylist={updatePlaylist} 
                        closeEdit={closeEdit}
                    />                    

                    {displaySongDetails && <SongDetailsModal song_id={displaySong} bool={displaySongDetails} updateSongDetailsDisplay={updateSongDetailsDisplay} />}

                    
                    {/* Song Selection Bar */}
                    <SongSelectionBar
                        selectionBarType={1}
                        songSelection={songSelection}
                        addSelectedToPlaylist={addSelectedToPlaylist}
                        createSelectedPlaylist={createSelectedPlaylist}
                        clearSelection={clearSelection}
                        playlistList={playlistList}
                        removeSelectedSongs={removeSelectedSongs}
                        play={playSelection}
                        addToQueue={addToQueue}
                        currentPlaylistID={location.state.name}
                    />
                    

                    <div className="top-row">
                        <img src={ArrowBackIcon} className="icon icon-size" onClick={() => {navigate(-1)}}/>
                    </div>
                    {/* Playlist Details */}
                    <div className="album-details d-flex">   
                        <ImageWithFallBack image={playlistDetails.image} alt={"playlist image"} image_type={"album"}/>

                        <span style={{paddingLeft: "10px"}} className="grid-15">
                            <div style={{paddingBottom: "16px", marginLeft: '2px'}} className="section-15 header-font font-3">{playlistDetails.name}</div>
                            <span className="section-15 font-0 misc-details">
                                {playlistDetails.num_songs && <> {playlistDetails.num_songs} songs &#x2022;</>}
                                {playlistDetails.total_duration && <> {new Date(playlistDetails.total_duration * 1000).toISOString().slice(11, 19)} total runtime </>}
                            </span>
                            
                            <div className="section-15 d-flex album-commmands">
                                <span>
                                    <button
                                        className="font-1 borderless"
                                        disabled={isEdit}
                                        onClick={() => playPlaylist(0, false)}
                                    >
                                        <img src={PlayIcon} />
                                    </button>
                                </span>
                                <span><button className="font-1 borderless" disabled={isEdit} onClick={() => playPlaylist(0, true)}><img src={ShuffleIcon} /></button></span>
                                <span><button className="font-1 borderless" onClick={() => setIsEdit(true)}><img src={EditIcon} /></button></span>
                                <span>
                                    <button className={`font-1 borderless red`} onClick={() => setIsDelete(true)} >
                                        <img src={DeleteIcon} />
                                    </button>
                                </span>
                            </div>
                        </span>
                    </div>

                    {/* Song list */}
                    <div className="song-list">
                        <div className="grid-20 position-relative">
                            <span className="section-1 vertical-centered">
                                <span className="select-all-container">
                                    <input
                                        type="checkbox" id={`select-all`} name={`select-all`}
                                        className="select-all-checkbox"
                                        onClick={() => { 
                                            if(songSelection.length != playlist.length) { setSongSelection(playlist); }
                                            else { setSongSelection([]); }
                                        }}
                                        onChange={() => {}}
                                        checked={songSelection.length == playlist.length}
                                    />
                                </span>
                            </span>
                            <span className="section-1 vertical-centered"></span>
                            <span className="section-9 vertical-centered font-0 details">Name</span>
                            <span className="section-4 vertical-centered font-0 details">Album</span>
                            <span className="section-4 vertical-centered font-0 details">Album Artist</span>
                            <span className="section-1 vertical-centered details">Length</span>
                        </div>
                        <hr />

                        {!isEdit &&
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
                                                            checked={songSelection.filter(x => {
                                                                return x.path === playlist[index].path
                                                            }).length > 0}
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
                        }

                        {/* You can only Drag and Drop when you are editing a playlist */}
                        {isEdit &&
                            <DragDropContext onDragEnd={(e) => onDragEnd(e)}>
                                <Droppable
                                    droppableId="droppable"
                                    mode="virtual"
                                    renderClone={(provided, snapshot, rubric) => {
                                        return(
                                            <Item
                                                provided={provided}
                                                isDragging={snapshot.isDragging}
                                                item={playlist[rubric.source.index]}
                                                itemIndex={rubric.source.index}
                                            />
                                        )
                                    }}
                                >
                                {(provided) => {
                                    const ref = (el: Window | HTMLElement | null) => provided.innerRef(el as HTMLElement);
                                    
                                    return (
                                        <Virtuoso
                                            components={{ Item: HeightPreservingItem }}
                                            scrollerRef={ref}
                                            customScrollParent={scrollParent ? scrollParent.contentWrapperEl : undefined}
                                            data={playlist}
                                            // totalCount={playlist.length}
                                            itemContent={(index, item) => {
                                                return (
                                                    <Draggable
                                                        draggableId={item.path}
                                                        index={index}
                                                        key={item.path}
                                                    >
                                                        {(provided) => (
                                                            <Item
                                                                provided={provided}
                                                                item={item}
                                                                isDragging={false}
                                                                itemIndex={index}
                                                            />
                                                        )}
                                                    </Draggable>
                                                );
                                            }}
                                        />
                                    );
                                }}
                                </Droppable>
                            </DragDropContext>
                        }
                        
                    </div>

                    <CustomContextMenu
                        isToggled={contextMenu.isToggled}
                        song={playlist[contextMenu.index]}
                        album={contextMenu.album}
                        artist={contextMenu.artist}
                        index={contextMenu.index}
                        posX={contextMenu.posX}
                        posY={contextMenu.posY}
                        side={contextMenu.side}
                        play={playPlaylist}
                        editSelection={editSelection}
                        remove={removeSong}
                        isBeingAdded={checkBoxNumber[contextMenu.index]}
                        playlistList={playlistList}
                        name={playlistDetails.name}
                        createPlaylist={createPlaylist} 
                        addToPlaylist={addToPlaylistContextMenu} 
                        addToQueue={addToQueue}
                        updateSongDetailsDisplay={updateSongDetailsDisplay}
                        ref={isContextMenuOpen}
                    />
                    
                </div>
            </SimpleBar>
        );
    }
    else if(loading === false && playlist.length === 0) {
        return(
            <SimpleBar forceVisible="y" autoHide={false} >
                <div className="album-container">

                    <Delete isDelete={isDelete} deletePlaylist={deletePlaylist} cancelDelete={cancelDelete}/>
                    <EditPlaylist
                        isOpen={isEdit}
                        playlistDetails={playlistDetails}
                        updatePlaylist={updatePlaylist} 
                        closeEdit={closeEdit}
                    />
                
                    <div className="top-row">
                        <img src={ArrowBackIcon} className="icon icon-size" onClick={() => {navigate(-1)}}/>
                    </div>
                    {/* Playlist Details */}
                    <div className="d-flex">
                        <div className="album-details d-flex">   
                            <ImageWithFallBack image={playlistDetails.image} alt={"upload new image"} image_type={"album"}/>
                            
                            <span style={{paddingLeft: "10px"}} className="grid-15">
                                <div style={{paddingBottom: "16px", marginLeft: '2px'}} className="section-15 header-font font-3">{playlistDetails.name}</div>
                               
                                <span className="section-15 font-0 misc-details">
                                    0 songs
                                </span>
                                
                                <div className="section-15 d-flex album-commmands">
                                    <span><button className="font-1 borderless" disabled ><img src={PlayIcon} /></button></span>
                                    <span><button className="font-1 borderless" disabled ><img src={ShuffleIcon} /></button></span>
                                    <span><button className="font-1 borderless" onClick={() => setIsEdit(!isEdit)}><img src={EditIcon} /></button></span>
                                    <span>
                                        <button className={`font-1 borderless red`} onClick={deletePlaylist} >
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



type editPlaylistProps = {
    isOpen: boolean,
    playlistDetails: PlaylistDetails,
    updatePlaylist: (name: string, cover: string) => void,
    closeEdit: () => void
}

function EditPlaylist({isOpen, playlistDetails, updatePlaylist, closeEdit}: editPlaylistProps) {

    const [newPlaylistName, setNewPlaylistName] = useState<string>(playlistDetails.name);
    const [newPlaylistImage, setNewPlaylistImage] = useState<string>(playlistDetails.image);

    useEffect(() => {
        const element = document.getElementsByClassName("simplebar-content-wrapper");
        if(isOpen) {
            element[0].classList.add("overflow-y-hidden");
        }
        else {
            element[0].classList.remove("overflow-y-hidden");
            closeEdit();
        }
    }, [isOpen]);

    function updatePlaylistName(name: string) {
        setNewPlaylistName(name);
    }

    // Doesn't update image if you change the file of the old uploaded image with a new image (same name and extension but different image)
    async function addCustomPlaylistArtwork() {
        let cover_image: string = "";
        try {
            const file_path = await open({ multiple: false, directory: false, filters: [{name: "Image", extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif']}] });
            if(file_path !== null) {
                cover_image = file_path.toString();
                setNewPlaylistImage(cover_image);
            }    
        }
        catch(err) {
            error("Playlist Overview (Error) - Error Adding Custom Playlist Artwork: " + err);
            console.log(`Failed to add custom artwork: ${err}`);
        }
    }
    
    function cancelUpdate() {
        setNewPlaylistImage(playlistDetails.image);
        setNewPlaylistName(playlistDetails.name);
        closeEdit();
    }

    if(isOpen) {
        return(
            <div className="edit-playlist-container">
                <h2>Update Playlist Details</h2>
                <div className="close" onClick={closeEdit}> <img src={CloseIcon} alt="" /></div>

                <div className="details">

                    <div onClick={addCustomPlaylistArtwork} className="image-upload">
                        <ImageWithFallBack image={newPlaylistImage} alt={"upload new image"} image_type={"album"}/>
                    </div>

                    <input
                        id="current-playlist-name"
                        type="text"
                        className="header-font font-3"
                        autoComplete='false'
                        placeholder={newPlaylistName}
                        value={newPlaylistName}
                        onChange={(e) => updatePlaylistName(e.target.value) }
                    />
                </div>

                <span className="buttons">
                    <span> <button className="white" onClick={() => {updatePlaylist(newPlaylistName, newPlaylistImage);}}>Update</button> </span>

                    <span> <button className="red" onClick={cancelUpdate}>Cancel</button> </span>
                </span>
            </div>
        );
    }    
}



type deleteProps = {
    isDelete: boolean,
    deletePlaylist: () => void,
    cancelDelete: () => void
}

function Delete({isDelete, deletePlaylist, cancelDelete}: deleteProps) {

    if(isDelete) {
        return(
            <div className="selection-popup-container grid-20 header-font warning open">
                <div className="section-14" style={{marginLeft: "15px", marginBottom: "0px"}}>Are you sure you want to delete this playlist?</div>
                <div className="section-3 position-relative" style={{marginBottom: "0px"}}>
                    <button className="d-flex align-items-center red" onClick={deletePlaylist}>
                        Yes
                    </button>
                </div>

                <div className="section-3 position-relative" style={{marginBottom: "0px"}}>
                    <button className="d-flex align-items-center white" onClick={cancelDelete}>
                        No
                    </button>
                </div>
            </div> 
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
    play: (index: number, shuffle: boolean) => void,
    editSelection: (song: Songs, isBeingAdded: boolean, index: number) => void,
    remove: (index: number) => void,
    isBeingAdded: boolean,
    posX: number,
    posY: number,
    side: number,
    // Playlist
    name: string,
    playlistList: PlaylistList[],
    createPlaylist: (name: string, song: Songs) => void,
    addToPlaylist: (id: number, song: Songs) => void
    addToQueue: () => void,
    updateSongDetailsDisplay: (bool: boolean, id: number) => void,
    ref: any
}

function CustomContextMenu({ 
    isToggled, song, album, artist, index,  
    play, editSelection, remove, 
    isBeingAdded, posX, posY, side,
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
                    {isBeingAdded === true && <span className="d-flex context-row"> <img src={DeselectIcon} />&nbsp;Deselect </span>}
                    {isBeingAdded === false && <span className="d-flex context-row"> <img src={SelectIcon} />&nbsp;Select </span>}
                </li>

                <li onClick={() => {play(index, false)}} className="d-flex align-items-center">
                    <span className="d-flex context-row">
                        <img src={PlayIcon} /> &nbsp; Play
                    </span>
                </li>

                <li className="position-relative">
                    <span className="d-flex context-row" onClick={()=> setDisplayAddMenu(!displayAddMenu)}>
                        <img src={AddIcon} /> &nbsp; Add to
                    </span>
                    {displayAddMenu &&
                        <div className={`playlist-list-container add-context-menu header-font ${side === 0 ? "" : "left" }`}>
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
                                <span><button onClick={() => {createPlaylist(newPlaylistName, song)}}>Create</button></span>
                            </span>
                            
                            <SimpleBar forceVisible="y" autoHide={false} clickOnTrack={false} className="add-playlist-container">
                                {playlistList?.map((playlist) => {
                                    if(playlist.name !== name) {
                                        return(
                                            <div className="item" key={playlist.name} onClick={() => addToPlaylist(playlist.id, song)}>
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
                <li className="d-flex align-items-center" onClick={() => remove(index)} >
                    <span className="d-flex context-row">
                        <img src={CloseIcon} />  &nbsp; Remove
                    </span>
                </li>
                {/* Navigation Buttons */}
                {album !== "" &&
                    <li className="d-flex align-items-center" onClick={NavigateToAlbum} >
                        <span className="d-flex context-row">
                            <img src={AlbumIcon} />  &nbsp; Show Album
                        </span>
                    </li>
                }
                {artist !== "" &&
                    <li className="d-flex align-items-center" onClick={NavigateToArtist} >
                        <span className="d-flex context-row">
                            <img src={ArtistIcon} /> &nbsp; Show Artist
                        </span>
                    </li>
                }
                

                <li className="d-flex align-items-center" onClick={() => updateSongDetailsDisplay(true, song.id)} >
                    <span className="d-flex context-row">
                        <img src={InfoIcon} />  &nbsp; Song Details
                    </span>
                </li>
            </div>
        );
    }
    else { return; }    
}
