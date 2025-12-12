// Core Libraries
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';

// Custom Components
import { AlbumDetails, playAlbum, PlayHistory, Playlists, playPlaylist, saveQueue, Songs } from '../globalValues';
import ImageWithFallBack from '../components/imageFallback';

// Images
import PlayIcon from '../images/play-solid-full.svg';
import Circle from '../images/circle.svg';
import SimpleBar from 'simplebar-react';


export default function Home() {

    const navigate = useNavigate();

    const [playlists, setPlaylists] = useState<Playlists[]>([]);
    const [albums, setAlbums] = useState<AlbumDetails[]>([]);
    const [songs, setSongs] = useState<Songs[]>([]);
    const [playHistory, setPlayHistory] = useState<PlayHistory[]>([]);


    useEffect(() => {
        getPlaylists();
        getAlbums();
        getSongs();
        getHistory();
    }, []);

    // ------------------- Fetch Data Functions -------------------

    async function getPlaylists() {
        try{
            const list = await invoke<Playlists[]>('get_playlists_with_limit', { limit: 10 } );
            setPlaylists(list);
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

    async function playSong(song: Songs) {
        try {
            const arr: Songs[] = [song];
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

    const navigateToPlaylistOverview = (name: string) => {
        navigate("/playlists/overview", {state: {name: name}});
    }

    
    return(
        <SimpleBar forceVisible="y" autoHide={false} >
            <div className="grid-20">
                {/* Albums */}
                <div className="section-20 home albums">
                    <div className="header-font font-3 cursor-pointer" onClick={() => navigate('/albums')} >Albums</div>
                    <div className={`list ${albums.length === 0 ? "": "d-flex flex-wrap"}`}>
                        {albums.length === 0 && <div className="text-center font-secondary">No Albums</div>}

                        {albums.map((entry, i) => {
                            return(
                                <div key={`album-${i}`} className="album-link" id={`album-${i}`}>
                                    <div className="album-image-container">
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
                    <div className="header-font font-3 cursor-pointer" onClick={() => navigate('/songs')} >Songs</div>
                    <div className={`list ${songs.length === 0 ? "": "d-flex flex-wrap"}`}>
                        {songs.length === 0 && <div className="text-center font-secondary">No Songs</div>}

                        {songs.map((song, i) => {
                            return(
                                <div key={`song-${i}`} className="song grid-10">
                                    <span className="section-2 d-flex position-relative" onClick={() => playSong(song)}>
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
                        <div className="header-font font-3 cursor-pointer" onClick={() => navigate('/playlists')} >Playlists</div>
                        <div className={`list ${playlists.length === 0 ? "": "d-flex flex-wrap"}`}>
                            {playlists.length === 0 && <div className="text-center font-secondary">No Playlists</div>}
                            
                            {playlists.map((item, i) => {
                                return(
                                    <div key={i} className="album-link playlist">
                                        <div className="album-image-container ">
                                            <div className="play-album" onClick={() => playPlaylist(item.name)}>
                                                <img src={PlayIcon} alt="play icon" className="play-pause-icon" />
                                                <img src={Circle} className="circle"/>
                                            </div>
                                            
                                            <div className="container" onClick={() => navigateToPlaylistOverview(item.name)} >
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
                        <div className="header-font font-3 cursor-pointer" onClick={() => navigate('/history')} >History</div>
                        <div className={`list ${playlists.length === 0 ? "": "d-flex flex-wrap"}`}>
                            {playHistory.length === 0 && <div className="text-center font-secondary">No Playlists</div>}
                            
                            {playHistory.map((item, i) => {
                                return(
                                    <div key={i} className="album-link playlist">
                                        <div className="album-image-container ">
                                            <div className="play-album" onClick={() => playSong(item)}>
                                                <img src={PlayIcon} alt="play icon" className="play-pause-icon" />
                                                <img src={Circle} className="circle"/>
                                            </div>
                                            
                                            <div className="container" onClick={() => navigateToPlaylistOverview(item.name)} >
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
        </SimpleBar>
    );
    
    
}