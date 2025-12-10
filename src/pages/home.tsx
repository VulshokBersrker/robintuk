// Core Libraries
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';

// Custom Components
import { AlbumDetails, playAlbum, Playlists, playPlaylist, savePosition, saveQueue, Songs } from '../globalValues';
import ImageWithFallBack from '../components/imageFallback';

// Images
import EllipsisIcon from '../images/ellipsis-solid-full.svg';
import PlayIcon from '../images/play-solid-full.svg';
import Circle from '../images/circle.svg';


export default function Home() {

    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [playlists, setPlaylists] = useState<Playlists[]>([]);
    const [albums, setAlbums] = useState<AlbumDetails[]>([]);
    const [songs, setSongs] = useState<Songs[]>([]);


    useEffect(() => {
        getPlaylists();
        getAlbums();
        getSongs();
    }, []);

    // ------------------- Fetch Data Functions -------------------

    async function getPlaylists() {
        try{
            const list = await invoke<Playlists[]>('get_playlists_with_limit', { limit: 30 } );
            // console.log(list);
            setPlaylists(list);
        }
        catch(e) {
            console.log(e);
        }
        finally {

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
        finally {
            
        }
    }

    async function getSongs() {
        try{
            const list = await invoke<Songs[]>('get_songs_with_limit', { limit: 30 } );
            console.log(list);
            setSongs(list);
        }
        catch(e) {
            console.log(e);
        }
        finally {
            
        }
    }

    // ------------------- Play Music Functions -------------------

    async function playSong(song: Songs) {
        try {
            const arr: Songs[] = [song];
            // Update the music controls state somehow
            await invoke('player_load_album', {queue: arr, index: 0});
            await invoke('update_current_song_played', {path: arr[0].path});
            await invoke('get_queue', {q: arr, index: 0});
            saveQueue(arr);
            await invoke('create_stored_queue', { songs: arr, shuffled: false });
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
        navigate("/playlist/overview", {state: {name: name}});
    }

    if(loading) { return( <></> ); }
    else {
        return(
            <div className="grid-20">
                {/* Albums */}
                <div className="section-20 home albums">
                    <div className="header-font font-3">Albums</div>
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
                    <div className="header-font font-3">Songs</div>
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
                        <div className="header-font font-3">Playlists</div>
                        <div className={`list ${playlists.length === 0 ? "": "d-flex flex-wrap"}`}>
                            {playlists.length === 0 && <div className="text-center font-secondary">No Playlists</div>}
                            
                            {playlists.map((item, i) => {
                                return(
                                    <div key={i} className="album-link playlist">
                                        <div className="album-image-container ">
                                            <div className="play-album"><img src={PlayIcon} className="icon-size" onClick={() => playPlaylist(item.name)}/></div>
                                            <div className="options"><img src={EllipsisIcon} className="icon-size" /></div>
                                            
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
                    {/* <div className="section-10 border history home">
                        <div className="header-font font-3">History</div>
                    </div> */}
                </div>
            </div>
        );
    }
    
}