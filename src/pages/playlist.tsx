import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from "react";

// Custom Components
import { saveQueue, Songs, savePosition, Playlists } from "../globalValues.js";
import ImageWithFallBack from "../components/imageFallback.js";

// Images
import EllipsisIcon from '../images/ellipsis-solid-full.svg';
import PlayIcon from '../images/play-icon-outline.svg';

export default function PlaylistPage() {

    const navigate = useNavigate();
    const [playlistList, setPlaylistList] = useState<Playlists[]>([]);

    async function getAlbums() {
        try {
            const list = await invoke<Playlists[]>('get_all_playlists');
            setPlaylistList(list);
        }
        catch (err) {
            alert(`Failed to scan folder: ${err}`);
        }
    }

    useEffect(() => {
        getAlbums();
    }, [])

    const navigateToPlaylistOverview = (name: string) => {
        navigate("/playlist/overview", {state: {name: name}});
    }

    async function playPlaylist(album_name: string) {
        try {
            const albumRes: Songs[] = await invoke('get_album', { name: album_name });
            console.log(albumRes);
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

    return(
        <>
            <div className="header-font font-4 page-header d-flex align-items-center">Playlists</div>

            <div className="playlist-button"> <button onClick={() => {}}>+ New Playlist</button> </div>

            <div className="d-flex flex-wrap">
                {playlistList.map((item, i) => {
                    return(
                        <div key={i} className="album-link playlist">
                            <div className="album-image-container playlist">
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
        </>
    );
}