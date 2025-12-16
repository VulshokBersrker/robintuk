// Core Libraries
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import SimpleBar from 'simplebar-react';

// Custom Components
import { AlbumDetails, playAlbum, PlayHistory, PlaylistList, Playlists, playPlaylist, saveQueue, Songs } from '../globalValues';
import ImageWithFallBack from '../components/imageFallback';

// Images
import QueueIcon from '../images/rectangle-list-regular-full.svg';
import AlbumIcon from '../images/vinyl-record-svgrepo-com.svg';
import ArtistIcon from '../images/user-regular-full.svg';
import PlayIcon from '../images/play-solid-full.svg';
import AddIcon from '../images/plus-solid-full.svg';
import Circle from '../images/circle.svg';

export default function Home() {

    const navigate = useNavigate();

    const [playlists, setPlaylists] = useState<Playlists[]>([]);
    const [albums, setAlbums] = useState<AlbumDetails[]>([]);
    const [songs, setSongs] = useState<Songs[]>([]);
    const [playHistory, setPlayHistory] = useState<PlayHistory[]>([]);

    const [contextMenu, setContextMenu] = useState({ isToggled: false, context_type: "", album: "", artist: "", playlist: 0, index: 0, posX: 0, posY: 0 });
    const isContextMenuOpen = useRef<any>(null);

    // Playlist Values
    const [playlistList, setPlaylistList] = useState<Playlists[]>([]);

    useEffect(() => {
        getPlaylists();
        getAlbums();
        getSongs();
        getHistory();

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

    // ------------------- Fetch Data Functions -------------------

    async function getPlaylists() {
        try{
            const list = await invoke<Playlists[]>('get_all_playlists');
            setPlaylists(list);
            setPlaylistList(list)
        }
        catch(e) {
            console.log(e);
        }
    }

    async function getAlbums() {
        try{
            const list: AlbumDetails[] = await invoke<AlbumDetails[]>('get_albums_with_limit', { limit: 30 } );
            // console.log(list);
            setAlbums(list);
        }
        catch(e) {
            console.log(e);
        }
    }

    async function getSongs() {
        try{
            const list = await invoke<Songs[]>('get_songs_with_limit', { limit: 30 } );
            setSongs(list);
        }
        catch(e) {
            console.log(e);
        }
    }

    async function getHistory() {
         try{
            const list = await invoke<PlayHistory[]>('get_play_history', { limit: 10 } );
            setPlayHistory(list);
        }
        catch(e) {
            console.log(e);
        }
    }

    // ------------------- Play Music Functions -------------------

    async function playSong(index: number) {
        try {
            const arr: Songs[] = [songs[index]];
            // Update the music controls state somehow
            await invoke('player_load_album', {queue: arr, index: 0});
            await invoke('update_current_song_played', {path: arr[0].path});
            saveQueue(arr);
        }
        catch (err) {
            alert(`Failed to play song: ${err}`);
        }        
    }

    // ------------------- Navigation Functions -------------------

    const navigateToAlbumOverview = (name: string) => {
        navigate("/albums/overview", {state: {name: name}});
    }

    const navigateToPlaylistOverview = (name: number) => {
        navigate("/playlists/overview", {state: {name: name}});
    }

    function handleContextMenu(e: any, album: string, artist: string, playlist: number, index: number, type: string) {
        if(e.pageX < window.innerWidth / 2) {
            if(e.pageY < window.innerHeight / 2) {
                setContextMenu({ isToggled: true, context_type: type, album: album, artist: artist, playlist: playlist, index: index, posX: e.pageX, posY: e.pageY});
            }
            else {
                setContextMenu({ isToggled: true, context_type: type, album: album, artist: artist, playlist: playlist, index: index, posX: e.pageX, posY: e.pageY - 20});
            }
        }
        else {
            if(e.pageY < window.innerHeight / 2) {
                setContextMenu({ isToggled: true, context_type: type, album: album, artist: artist, playlist: playlist, index: index, posX: e.pageX - 150, posY: e.pageY});
            }
            else {
                setContextMenu({ isToggled: true, context_type: type, album: album, artist: artist, playlist: playlist, index: index, posX: e.pageX - 150, posY: e.pageY - 20});
            }
        }
    }

    function resetContextMenu() {
        console.log("Resetting Context Menu");
        setContextMenu({ isToggled: false, context_type: "", album: "", artist: "", playlist: 0, index: 0, posX: 0, posY: 0});
    }


    async function addToQueue() {
        try {
            let songList: Songs[] = [];
            
            
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
            let songList: Songs[] = [];
            
            
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
            let songList: Songs[] = [];
            
            
            await invoke('create_playlist', {name: name });
            await invoke('add_to_playlist', {songs: songList, playlist_name: name});
            await invoke('new_playlist_added');
        }
        catch(e) {
            console.log(e);
        }
        resetContextMenu();
    }

    
    return(
        <SimpleBar forceVisible="y" autoHide={false} >
            <div className="grid-20">
                {/* Albums */}
                <div className="section-20 home albums">
                    <div className="header-font font-3 cursor-pointer" style={{width: '120px'}} onClick={() => navigate('/albums')} >Albums</div>
                    <div className={`list ${albums.length === 0 ? "": "d-flex flex-wrap"}`}>
                        {albums.length === 0 && <div className="text-center font-secondary">No Albums</div>}

                        {albums.map((entry, i) => {
                            return(
                                <div key={`album-${i}`} className="album-link" id={`album-${i}`}>
                                    <div className="album-image-container"
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            handleContextMenu(e, albums[i].album, albums[i].album_artist, 0, i, "album");
                                        }}
                                    >
                                        <div className="play-album" onClick={() => playAlbum(entry.album)}>
                                            <img src={PlayIcon} alt="play icon" className="play-pause-icon" />
                                            <img src={Circle} className="circle"/>
                                        </div>
                                        
                                        <div className="container" onClick={() => navigateToAlbumOverview(entry.album)} >
                                            <ImageWithFallBack image={entry.cover} alt={entry.album} image_type={"album"} />
                                        </div>
                                        <div className="album-image-name header-font">
                                            <div className="album-name">{entry.album}</div>
                                            <div className="artist-name">{entry.album_artist}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>


                {/* Songs */}
                <div className="section-10 home songs">
                    <div className="header-font font-3 cursor-pointer" style={{width: '100px'}} onClick={() => navigate('/songs')} >Songs</div>
                    <div className={`list ${songs.length === 0 ? "": "d-flex flex-wrap"}`}>
                        {songs.length === 0 && <div className="text-center font-secondary">No Songs</div>}

                        {songs.map((song, i) => {
                            return(
                                <div
                                    key={`song-${i}`}
                                    className="song grid-10"
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        handleContextMenu(e, albums[i].album, albums[i].album_artist, 0, i, "song");
                                    }}
                                >
                                    <span className="section-2 d-flex position-relative" onClick={() => playSong(i)}>
                                        <img src={PlayIcon} className="play"/>
                                        <ImageWithFallBack image={song.cover} alt={""} image_type={"album"}/>
                                    </span>
                                    <span className="section-8">
                                        <div className="song-name line-clamp-1">{song.name}</div>
                                        <div className="album line-clamp-1">{song.album}</div>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Playlists - History*/}
                <div className="section-10 playlists-history grid-10">
                    {/* Playlists */}
                    <div className="section-10 home playlists">
                        <div className="header-font font-3 cursor-pointer" style={{width: '120px'}} onClick={() => navigate('/playlists')} >Playlists</div>
                        <div className={`list ${playlists.length === 0 ? "": "d-flex flex-wrap"}`}>
                            {playlists.length === 0 && <div className="text-center font-secondary">No Playlists</div>}
                            
                            {playlists.map((item, i) => {
                                return(
                                    <div
                                        key={i}
                                        className="album-link playlist"
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            handleContextMenu(e, albums[i].album, albums[i].album_artist, item.id, i, "playlist");
                                        }}
                                    >
                                        <div className="album-image-container ">
                                            <div className="play-album" onClick={() => playPlaylist(item.id)}>
                                                <img src={PlayIcon} alt="play icon" className="play-pause-icon" />
                                                <img src={Circle} className="circle"/>
                                            </div>
                                            
                                            <div className="container" onClick={() => navigateToPlaylistOverview(item.id)} >
                                                <ImageWithFallBack image={item.image} alt={item.name} image_type={"album"} />
                                            </div>
                                            <div className="album-image-name header-font">
                                                <div className="album-name">{item.name}</div>
                                            </div>
                                        </div>                                    
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* History */}
                    <div className="section-10 history home">
                        <div className="header-font font-3 cursor-pointer" style={{width: '110px'}} onClick={() => navigate('/history')} >History</div>
                        <div className={`list ${playlists.length === 0 ? "": "d-flex flex-wrap"}`}>
                            {playHistory.length === 0 && <div className="text-center font-secondary">No Playlists</div>}
                            
                            {playHistory.map((item, i) => {
                                return(
                                    <div key={i} className="album-link playlist">
                                        <div className="album-image-container ">
                                            <div className="play-album" onClick={() => playSong(i)}>
                                                <img src={PlayIcon} alt="play icon" className="play-pause-icon" />
                                                <img src={Circle} className="circle"/>
                                            </div>
                                            
                                            <div className="container"  onClick={() => navigate('/history')}>
                                                <ImageWithFallBack image={item.cover} alt={item.name} image_type={"album"} />
                                            </div>
                                            <div className="album-image-name header-font">
                                                <div className="album-name">{item.name}</div>
                                            </div>
                                        </div>                                    
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <div className="empty-space" />

            <CustomContextMenu
                isToggled={contextMenu.isToggled}
                context_type={contextMenu.context_type}
                album={contextMenu.album}
                artist={contextMenu.artist}
                index={contextMenu.index}
                playAlbum={playAlbum}
                playSong={playSong}
                playPlaylist={playPlaylist}
                posX={contextMenu.posX}
                posY={contextMenu.posY}
                playlist={contextMenu.playlist}
                playlistList={playlistList}
                createPlaylist={createPlaylist}
                addToPlaylist={addToPlaylist}
                addToQueue={addToQueue}
                ref={isContextMenuOpen}
                resetContextMenu={resetContextMenu}
            />
        </SimpleBar>
    );
}



type Props = {
    isToggled: boolean,
    context_type: string, // Album / Song / Artist / Playlist / Playlist Songs
    album: string,
    artist: string,
    index: number,
    playAlbum: (name: string) => void,
    playSong: (index: number) => void,
    playPlaylist: (id: number) => void,
    posX: number,
    posY: number,
    // Playlist
    playlist: number,
    playlistList: PlaylistList[],
    createPlaylist: (name: string) => void,
    addToPlaylist: (name: string) => void
    addToQueue: () => void,
    ref: any,
    resetContextMenu: () => void
}

function CustomContextMenu({ 
    isToggled, context_type, album, artist, index, 
    playAlbum, playSong, playPlaylist, posX, posY,
    playlist, playlistList, createPlaylist, addToPlaylist, addToQueue, ref, resetContextMenu
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
                <li 
                    onClick={() => {
                        if(context_type === "album") {
                            playAlbum(album);
                        }
                        else if(context_type === "playlist") {
                            playPlaylist(playlist)
                        }
                        else if(context_type === "song") {
                            playSong(index);
                            
                        }
                        resetContextMenu();
                    }}
                className="d-flex align-items-center">
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
                            
                            {playlistList?.map((p) => {
                                if(p.id !== playlist) {
                                    return(
                                        <div key={p.name} onClick={() => addToPlaylist(p.name)}>
                                            {p.name}
                                        </div>
                                    );
                                }                                            
                            })}
                        </div>
                    }
                </li>
                {context_type !== "playlist" && 
                    <li  className="d-flex align-items-center" onClick={NavigateToAlbum} >
                        <img src={AlbumIcon} /> &nbsp; Show Album
                    </li>
                }
                {(context_type !== "artist" && context_type !== "playlist") && 
                    <li  className="d-flex align-items-center" onClick={NavigateToArtist} >
                        <img src={ArtistIcon} /> &nbsp; Show Artist
                    </li>
                }
            </div>
        );
    }
    else { return; }    
}
