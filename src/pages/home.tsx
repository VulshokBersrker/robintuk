// Core Libraries
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';

// Custom Components
import { AlbumDetails, PlaylistFull, Playlists, savePosition, saveQueue, Songs } from '../globalValues';
import ImageWithFallBack from '../components/imageFallback';

// Images
import EllipsisIcon from '../images/ellipsis-solid-full.svg';
import PlayIcon from '../images/play-icon-outline.svg';

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
            console.log(list);
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
            console.log(list);
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

    async function playAlbum(album_name: string) {
        try {
            const albumRes: Songs[] = await invoke('get_album', { name: album_name });
            // console.log(albumRes);
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

    async function playPlaylist(playlist_name: string) {
        try {
            const res: PlaylistFull = await invoke("get_playlist", {name: playlist_name});
            
            await invoke('player_load_album', {queue: res.songs, index: 0});
            await invoke('update_current_song_played', {path: res.songs[0].path});
            await invoke('update_current_song_played');
            saveQueue(res.songs);
            savePosition(0);
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

    // ------------------- Navigation Functions -------------------

    const navigateToAlbumOverview = (name: string) => {
        navigate("/albums/overview", {state: {name: name}});
    }

    const navigateToPlaylistOverview = (name: string) => {
        navigate("/playlist/overview", {state: {name: name}});
    }

    return(
        <div className="grid-20">
            {/* Albums */}
            <div className="section-20 home albums">
                <div className="header-font font-3">Albums</div>
                <div className="d-flex flex-wrap list">
                    {albums.map((entry, i) => {
                        return(
                            <div key={`album-${i}`} className="album-link" id={`album-${i}`}>
                                <div className="album-image-container">
                                    <div className="play-album"><img src={PlayIcon} className="icon-size" onClick={() => playAlbum(entry.album)}/></div>
                                    <div className="options"><img src={EllipsisIcon} className="icon-size" /></div>
                                    
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
                <div className="d-flex flex-wrap list">
                    {songs.map((song, i) => {
                        return(
                            <div key={`song-${i}`} className="song grid-10">
                                <span className="section-2 d-flex position-relative">
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
                    <div className="d-flex flex-wrap list">
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
            <div className="empty-space"/>
        </div>
    );
}