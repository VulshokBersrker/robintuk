import { useNavigate } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from "react";
import SimpleBar from 'simplebar-react';

// Custom Components
import { saveQueue, Songs, savePosition, Playlists } from "../globalValues.js";
import ImageWithFallBack from "../components/imageFallback.js";

// Images
import PlayIcon from '../images/play-solid-full.svg';
import PlusIcon from '../images/plus-solid-full.svg';
import Circle from '../images/circle.svg';
import CloseIcon from '../images/x.svg';

type NewPlaylistList = {
    playlist: Playlists[]
}

export default function PlaylistPage() {

    const navigate = useNavigate();
    const [playlistList, setPlaylistList] = useState<Playlists[]>([]);
    const [displayCreate, setDisplayCreate] = useState<boolean>(false);
    const [newPlaylistName, setNewPlaylistName] = useState<string>("");

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
    }, []);

    // Just for listeners
    useEffect(() => {
        // Load the new playlist from the backend
        const unlisten_get_playlists= listen<NewPlaylistList>("new-playlist-created", (event) => { console.log(event.payload.playlist); setPlaylistList(event.payload.playlist); });
        
        return () => {
            unlisten_get_playlists.then(f => f());
        }        
    }, []);

    const navigateToPlaylistOverview = (name: number) => {
        navigate("/playlists/overview", {state: {name: name}});
    }

    async function playPlaylist(album_name: string) {
        try {
            const playlistRes: Songs[] = await invoke('get_album', { name: album_name });
            console.log(playlistRes);
            // Load the music to be played and saved
            await invoke('player_load_album', {queue: playlistRes, index: 0});
            await invoke('update_current_song_played');
            saveQueue(playlistRes);
            savePosition(0);
            await invoke('create_queue', { songs: playlistRes });
        }
        catch(e) {
            console.log(e);
        }
    }

    async function createPlaylist(name: string) {
        try {
            await invoke('create_playlist', {name: name});
            await invoke('new_playlist_added');
        }
        catch(e) {
            console.log(e);
        }
        finally {
            setDisplayCreate(false);
            setNewPlaylistName("");
        }
    }

    return(
        <SimpleBar forceVisible="y" autoHide={false} >
            <div className="header-font font-4 page-header d-flex align-items-center">Playlists</div>

            <div className="playlist-buttons d-flex align-items-center">
                <span className="">
                    <button className={`d-flex align-items-center ${displayCreate ? "red" : "white"}`} onClick={() => {setDisplayCreate(!displayCreate)}}>
                        {!displayCreate && <> <img src={PlusIcon} alt={""} /> &nbsp; New Playlist </>}
                        {displayCreate && <> <img src={CloseIcon} alt={""} /> &nbsp; Cancel</>}
                    </button>
                </span>
                
                {displayCreate &&
                    <>
                        <input
                            id="playlist-name"
                            type="text"
                            placeholder="Playlist Name"
                            value={newPlaylistName}
                            className=""
                            autoComplete="off"
                            style={{width: '280px'}}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                        />
                        <span>
                            <button className="white d-flex align-items-center" onClick={() => {createPlaylist(newPlaylistName);}}>
                                Create
                            </button>
                        </span>
                    </>
                }
            </div>

            <div className="d-flex flex-wrap" style={{marginTop: '10px'}}>
                {playlistList.map((item, i) => {
                    return(
                        <div key={i} className="album-link playlist">
                            <div className="album-image-container playlist">
                                <div className="play-album" onClick={() => playPlaylist(item.name)} >
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
            <div className="empty-space" />
        </ SimpleBar>
    );
}