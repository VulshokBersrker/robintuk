// Core Libraries
import { useLocation, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { VirtuosoGrid } from "react-virtuoso";
import { useEffect, useRef, useState } from "react";
import SimpleBar from "simplebar-react";
import { forwardRef } from 'react';

// Custom Components
import { ArtistDetails, ContextMenu, PlaylistList, playSelection, savePosition, saveQueue, shuffle, Songs } from "../../globalValues";
import ImageWithFallBack from "../../components/imageFallback";

// Images
import ArtistPlaceholderImage from '../../images/placeholder_artist.png';
import DeselectIcon from '../../images/circle-xmark-regular-full.svg';
import QueueIcon from '../../images/rectangle-list-regular-full.svg';
import SelectIcon from '../../images/circle-check-regular-full.svg';
import AlbumIcon from '../../images/vinyl-record-svgrepo-com.svg';
import ShuffleIcon from '../../images/shuffle-solid-full.svg';
import PlayIcon from '../../images/play-solid-full.svg';
import ArrowBackIcon from '../../images/arrow-left.svg';
import AddIcon from '../../images/plus-solid-full.svg';
import Circle from '../../images/circle.svg';
import CloseIcon from '../../images/x.svg';

// Add To needs to be added

export default function ArtistOverviewPage() {

    const location = useLocation();
    const navigate = useNavigate();

    // Used to add SimpleBar to React Virtuoso
    const [scrollParent, setScrollParent] = useState<any>(null);

    const [loading, isLoading] = useState<boolean>(false);
    const [artistDetails, setArtistDetails] = useState<ArtistDetails>({ total_duration: 0, album_artist: "", albums: [], num_tracks: 0});

    const [albumSelection, setAlbumSelection] = useState<String[]>([]);
    const [checkBoxNumber, setCheckBoxNumber] = useState<boolean[]>([]);

    // Playlist Values
    const [newPlaylistName, setNewPlaylistName] = useState<string>("");
    const [displayAddToMenu, setDisplayAddToMenu] = useState<boolean>(false);
    const [playlistList, setPlaylistList] = useState<PlaylistList[]>([]);


    const[contextMenu, setContextMenu] = useState<ContextMenu>({ isToggled: false, context_type: "artist", album: "", artist: "", index: 0, posX: 0, posY: 0 });
    const isContextMenuOpen = useRef<any>(null);


    // On first load get the album details
    useEffect(() => {
        getAlbums();

        const handler = (e: any) => {
            if(!contextMenu.isToggled && !isContextMenuOpen.current?.contains(e.target)) {
                resetContextMenu();
            }
        }
        document.addEventListener('mousedown', handler);
        
        return () => {
            document.removeEventListener('mousedown', handler);
        }
    }, []);

    async function getAlbums() {
        isLoading(true);
        try{
            const res: ArtistDetails = await invoke("get_albums_by_artist", {artist: location.state.name});
            // console.log(res);
            setArtistDetails(res);
            setCheckBoxNumber(Array(res.albums.length).fill(false));
        }
        catch(e) {
            alert(e)
        }
        finally {
            isLoading(false);
        }
    }

    const navigateToAlbumOverview = (name: string) => {
        navigate("/albums/overview", {state: {name: name}});
    }

    // Load the song the user clicked on but also queue the entire album
    async function playAlbum(album_name: string) {
        try {
            const albumRes: Songs[] = await invoke('get_album', { name: album_name });
            // Load the music to be played and saved
            await invoke('player_load_album', {queue: albumRes, index: 0});
            await invoke('update_current_song_played');
            saveQueue(albumRes);
            savePosition(0);
        }
        catch(e) {
            console.log(e);
        }
    }

    async function playArtist() {
        try {
            let albums_songs_arr: Songs[] = [];
            for(let i = 0; i < artistDetails.albums.length; i++) {
                const temp_arr: Songs[] = await invoke<Songs[]>("get_album", { name: artistDetails.albums[i].album });
                albums_songs_arr = albums_songs_arr.concat(temp_arr);
            }
            playSelection(albums_songs_arr);
        }
        catch(e) {
            console.log(e);
        }
        finally {
            clearSelection();
        }
    }

    async function shuffleArtist() {
        try {
            let albums_songs_arr: Songs[] = [];
            for(let i = 0; i < artistDetails.albums.length; i++) {
                const temp_arr: Songs[] = await invoke<Songs[]>("get_album", { name: artistDetails.albums[i].album });
                albums_songs_arr = albums_songs_arr.concat(temp_arr);
            }
            clearSelection();

            let shufflePlaylist = albums_songs_arr.slice();
            shuffle(shufflePlaylist);
            playSelection(shufflePlaylist);
        }
        catch(e) {
            console.log(e);
        }
    }


    // Selection Function
    function editSelection(album: String, isBeingAdded: boolean, index: number) {
        resetContextMenu();
        // If we are adding to the array of selected songs
        if(isBeingAdded === true) {
            // Append to the array
            setAlbumSelection([...albumSelection, album]);
            let tempArr: boolean[] = checkBoxNumber;
            tempArr[index] = true;
            setCheckBoxNumber(tempArr);

        }
        // If we are removing a song from the array
        else {
            // Find the location of the song in the array with filter and only return the other songs
            setAlbumSelection(albumSelection.filter(item => item !== album));
            let tempArr: boolean[] = checkBoxNumber;
            tempArr[index] = false;
            setCheckBoxNumber(tempArr);;
        }       
    }

    function clearSelection() {
        setAlbumSelection([]);
        setCheckBoxNumber(Array(checkBoxNumber.length).fill(false));
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
            for(let i = 0; i < albumSelection.length; i++) {
                const temp: Songs[] = await invoke<Songs[]>('get_album', {name: albumSelection[i]});
                songList.push(...temp);
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
            let songList: Songs[] = [];
            for(let i = 0; i < albumSelection.length; i++) {
                const temp: Songs[] = await invoke<Songs[]>('get_album', {name: albumSelection[i]});
                songList.push(...temp);
            }
            clearSelection();
            await invoke('add_to_playlist', {songs: songList, playlist_name: name});
        }
        catch(e) {
            console.log(e);
        }
        finally {
            resetContextMenu();
        }        
    }

    async function createPlaylist(name: string) {
        try {
            setDisplayAddToMenu(false);
            let songList: Songs[] = [];
            for(let i = 0; i < albumSelection.length; i++) {
                const temp: Songs[] = await invoke<Songs[]>('get_album', {name: albumSelection[i]});
                songList.push(...temp);
            }
            clearSelection();
            await invoke('create_playlist', {name: name });
            await invoke('add_to_playlist', {songs: songList, playlist_name: name});
            await invoke('new_playlist_added');
        }
        catch(e) {
            console.log(e);
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

    async function playSelectedAlbums() {
        try {
            let albums_songs_arr: Songs[] = [];
            for(let i = 0; i < albumSelection.length; i++) {
                const temp_arr: Songs[] = await invoke<Songs[]>("get_album", { name: albumSelection[i] });
                albums_songs_arr = albums_songs_arr.concat(temp_arr);
            }
            playSelection(albums_songs_arr);
        }
        catch(e) {
            console.log(e);
        }
        finally {
            clearSelection();
        }        
    }
    // ------------ End of Selection Bar Functions ------------

    function handleContextMenu(e: any, album: string, artist: string, index: number) {
        if(e.pageX < window.innerWidth / 2) {
            setContextMenu({ isToggled: true, context_type: "artist", album: album, artist: artist, index: index, posX: e.pageX, posY: e.pageY});
        }
        else {
            setContextMenu({ isToggled: true, context_type: "artist", album: album, artist: artist, index: index, posX: e.pageX - 150, posY: e.pageY});
        }
    }

    function resetContextMenu() {
        console.log("Resetting Context Menu");
        setContextMenu({ isToggled: false, context_type: "artist", album: "", artist: "", index: 0, posX: 0, posY: 0});
    }


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
                    <div className={`selection-popup-container grid-20 header-font ${albumSelection.length >= 1 ? "open" : "closed"}`}>
                        <div className="section-8">{albumSelection.length} item{albumSelection.length > 1 && <>s</>} selected</div>
                        <div className="section-4">
                            <button className="d-flex align-items-center" onClick={playSelectedAlbums}>
                                <img src={PlayIcon} />
                                &nbsp;Play
                            </button>
                        </div>                        
                        <div className="section-6 position-relative">
                            <button className="d-flex align-items-center"onClick={() => setDisplayAddToMenu(!displayAddToMenu)}>
                                <img src={AddIcon} />
                                &nbsp;Add to
                            </button>
                            {displayAddToMenu && albumSelection.length >= 1 &&
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
                                            <div key={playlist.name} onClick={() => addToPlaylist(playlist.name)}>
                                                {playlist.name}
                                            </div>
                                        );
                                    })}
                                </div>
                            }
                        </div>
                        <span className="vertical-centered section-2 cursor-pointer" onClick={clearSelection}> <img src={CloseIcon} /></span>
                    </div>                    
                    {/* End of Song Selection Bar */}

                    {/* Album Details */}
                    <div className="d-flex">
                        <div className="album-details d-flex">   
                            <ImageWithFallBack image={ArtistPlaceholderImage} alt={""} image_type={"artist"}/>

                            <span style={{paddingLeft: "10px"}} className="grid-15">
                                <div style={{paddingBottom: "10px"}} className="section-15 header-font font-3">{artistDetails.album_artist}</div>
                                <span className="section-15 font-0 misc-details">
                                    {artistDetails.albums.length} album{artistDetails.albums.length !== 0 && <span>s</span>} &#x2022; {artistDetails.num_tracks} songs &#x2022; {new Date(artistDetails.total_duration * 1000).toISOString().slice(11, 19)} total runtime
                                </span>
                                
                                <div className="section-15 d-flex album-commmands">
                                    <span><button className="font-1 borderless" onClick={playArtist}><img src={PlayIcon} /></button></span>
                                    <span><button className="font-1 borderless" onClick={shuffleArtist}><img src={ShuffleIcon} /></button></span>
                                    <span className="position-relative">
                                        <button className="font-1 borderless" disabled={artistDetails.albums.length === 0} onClick={() => setDisplayAddToMenu(!displayAddToMenu)}  >
                                            <img src={AddIcon} />
                                        </button>
                                        
                                        {displayAddToMenu && albumSelection.length === 0 &&
                                            <div className="playlist-list-container add header-font">
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
                                    </span>
                                </div>
                            </span>
                        </div>
                    </div>

                    {/* Song list */}
                    <div className="song-list">
                        <hr />        
                        <VirtuosoGrid
                            style={{ paddingBottom: '170px' }}
                            totalCount={artistDetails.albums.length}
                            components={gridComponents}
                            increaseViewportBy={{ top: 210, bottom: 420 }}
                            itemContent={(index) =>
                                <div className="album-link" key={index} id={`${artistDetails.albums[index].album_section}-${index}`}>
                                    <div className="album-image-container"
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            handleContextMenu(e, artistDetails.albums[index].album, artistDetails.albums[index].album_artist, index);
                                        }}
                                    >
                                        <span className="checkbox-container">
                                            <input
                                                type="checkbox"
                                                id={`select-${index}`} name={`select-${index}`}
                                                onClick={(e) => editSelection(artistDetails.albums[index].album, e.currentTarget.checked, index)}
                                                checked={checkBoxNumber[index]} onChange={() => {}}
                                            />
                                        </span>
                                        <div className="play-album" onClick={() => playAlbum(artistDetails.albums[index].album)}>
                                            <img src={PlayIcon} alt="play icon" className="play-pause-icon" />
                                            <img src={Circle} className="circle"/>
                                        </div>
                                        
                                        <div className="container" onClick={() => navigateToAlbumOverview(artistDetails.albums[index].album)} >
                                            <ImageWithFallBack image={artistDetails.albums[index].cover} alt={artistDetails.albums[index].album} image_type={"album"} />
                                        </div>
                                        <div className="album-image-name header-font">
                                            <div className="album-name">{artistDetails.albums[index].album}</div>
                                            <div className="artist-name">{artistDetails.albums[index].album_artist}</div>
                                        </div>
                                    </div>
                                </div>
                            }
                            customScrollParent={scrollParent ? scrollParent.contentWrapperEl : undefined}
                        />
                    </div>
                </div>

                <CustomContextMenu
                    isToggled={contextMenu.isToggled}
                    album={contextMenu.album}
                    artist={contextMenu.artist}
                    index={contextMenu.index}
                    play={playAlbum}
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
            </SimpleBar>
        );
    }
}


type Props = {
    isToggled: boolean,
    album: string,
    artist: string,
    index: number,
    play: (name: string) => void, // playSong / playAlbum function
    editSelection: (albums: string, isBeingAdded: boolean, index: number) => void,
    isBeingAdded: boolean,
    posX: number,
    posY: number,
    // Playlist
    name: string,
    playlistList: PlaylistList[],
    createPlaylist: (name: string) => void,
    addToPlaylist: (name: string) => void
    addToQueue: () => void,
    ref: any
}

function CustomContextMenu({ 
    isToggled, album, index, 
    play, editSelection, isBeingAdded, posX, posY,
    name, playlistList, createPlaylist, addToPlaylist, addToQueue, ref
}: Props) {

    const [displayAddMenu, setDisplayAddMenu] = useState<boolean>(false);
    const [newPlaylistName, setNewPlaylistName] = useState<string>("");

    const navigate = useNavigate();

    function NavigateToAlbum() {
        navigate("/albums/overview", {state: {name: album}});
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
                    onClick={() => editSelection(album, !isBeingAdded, index) }
                >
                    {isBeingAdded === true && <><img src={DeselectIcon} />&nbsp;Deselect</>}
                    {isBeingAdded === false && <><img src={SelectIcon} />&nbsp;Select</>}
                </li>

                <li onClick={() => {play(album)}} className="d-flex align-items-center">
                    <img src={PlayIcon} />
                    &nbsp; Play
                </li>

                <li className="position-relative">
                    <span className="d-flex" onClick={()=> setDisplayAddMenu(!displayAddMenu)}>
                        <img src={AddIcon} /> &nbsp; Add to
                    </span>
                    {displayAddMenu &&
                        <div className="playlist-list-container add-context-menu header-font">
                            <div className="d-flex align-items-center" onClick={addToQueue}>
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
                            
                            {playlistList?.map((playlist) => {
                                if(playlist.name !== name) {
                                    return(
                                        <div key={playlist.name} onClick={() => addToPlaylist(playlist.name)}>
                                            {playlist.name}
                                        </div>
                                    );
                                }                                            
                            })}
                        </div>
                    }
                </li>

                <li  className="d-flex align-items-center" onClick={NavigateToAlbum} >
                    <img src={AlbumIcon} />
                    &nbsp; Show Album
                </li>
                               
            </div>
        );
    }
    else { return; }    
}


// For the Virtual Grid
const gridComponents = {
    List: forwardRef(({ style, children, ...props }: any, ref) => (
        <div ref={ref} {...props} style={{ display: "flex", flexWrap: "wrap", ...style, }} >
            {children}
        </div>
    )),

  Item: ({ children, ...props }: any) => (
    <div {...props} style={{  width: "168px", display: "flex", flex: "none", boxSizing: "border-box", }} >
        {children}
    </div>
  )
}