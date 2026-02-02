import { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import SimpleBar from 'simplebar-react';

// Custom Components
import { Playlists, playPlaylist } from "../globalValues.js";
import ImageWithFallBack from "../components/imageFallback.js";

// Images
import AlbumIcon from '../images/vinyl-record-svgrepo-com.svg';
import ShuffleIcon from '../images/shuffle-solid-full.svg';
import PlayIcon from '../images/play-solid-full.svg';
import PlusIcon from '../images/plus-solid-full.svg';
import Circle from '../images/circle.svg';
import CloseIcon from '../images/x.svg';

export default function PlaylistPage() {

    const navigate = useNavigate();
    const [playlistList, setPlaylistList] = useState<Playlists[]>([]);
    const [displayCreate, setDisplayCreate] = useState<boolean>(false);
    const [newPlaylistName, setNewPlaylistName] = useState<string>("");

    const [contextMenu, setContextMenu] = useState({ isToggled: false, playlist: 0, posX: 0, posY: 0 });
    const isContextMenuOpen = useRef<any>(null);

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

    // Just for listeners
    useEffect(() => {
        // Load the new playlist from the backend
        const unlisten_get_playlists= listen<{playlist: Playlists[]}>("new-playlist-created", (event) => { console.log(event.payload.playlist); setPlaylistList(event.payload.playlist); });
        
        return () => {
            unlisten_get_playlists.then(f => f());
        }        
    }, []);

    const navigateToPlaylistOverview = (name: number) => {
        navigate("/playlists/overview", {state: {name: name}});
    }

    async function play(playlist_id: number, shuffled: boolean) {
        resetContextMenu();
        playPlaylist(playlist_id, shuffled);
    }

    async function createPlaylist(name: string) {
        resetContextMenu();
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

    function handleContextMenu(e: any, playlist: number) {
        if(e.pageX < window.innerWidth / 2) {
            if(e.pageY < window.innerHeight / 2) {
                setContextMenu({ isToggled: true, playlist: playlist, posX: e.pageX, posY: e.pageY});
            }
            else {
                setContextMenu({ isToggled: true, playlist: playlist, posX: e.pageX, posY: e.pageY - 130});
            }
        }
        else {
            if(e.pageY < window.innerHeight / 2) {
                setContextMenu({ isToggled: true, playlist: playlist, posX: e.pageX - 150, posY: e.pageY});
            }
            else {
                setContextMenu({ isToggled: true, playlist: playlist, posX: e.pageX - 150, posY: e.pageY - 130});
            }
        }
    }

    function resetContextMenu() {
        setContextMenu({ isToggled: false, playlist: 0, posX: 0, posY: 0});
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
                        <div
                            key={i}
                            className="album-link playlist"
                            onContextMenu={(e) => {
                                e.preventDefault();
                                handleContextMenu(e, item.id);
                            }}
                        >
                            <div className="album-image-container playlist">
                                <div className="play-album" onClick={() => play(item.id, false)} >
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

            <ContextMenu
                isToggled={contextMenu.isToggled}
                playlist_id={contextMenu.playlist}
                posX={contextMenu.posX}
                posY={contextMenu.posY}
                play={play}
                navigateToPlaylistOverview={navigateToPlaylistOverview}
                ref={isContextMenuOpen}
            />
        </ SimpleBar>
    );
}


type Props = {
    navigateToPlaylistOverview: (name: number) => void,
    isToggled: boolean,
    playlist_id: number,
    play: (playlist_id: number, shuffled: boolean) => void, // playSong / playAlbum function
    posX: number,
    posY: number,
    ref: any
}

function ContextMenu({ navigateToPlaylistOverview, isToggled, playlist_id, play, posX, posY, ref }: Props) {

    if(isToggled) {
        return(
            <div 
                className="context-menu-container header-font font-1"
                style={{ position: "fixed", left: `${posX}px`, top: `${posY}px`}}
                onContextMenu={(e) => {  e.preventDefault(); }}
                ref={ref}
            >
                <li onClick={() => {play(playlist_id, false)}} className="d-flex align-items-center">
                    <img src={PlayIcon} />
                    &nbsp; Play
                </li>

                <li onClick={() => {play(playlist_id, true)}} className="d-flex align-items-center">
                    <img src={ShuffleIcon} />
                    &nbsp; Shuffle
                </li>

                <li className="d-flex align-items-center" onClick={() => navigateToPlaylistOverview(playlist_id)} >
                    <img src={AlbumIcon} />
                    &nbsp; View
                </li>                
            </div>
        );
    }
    else { return; }
}