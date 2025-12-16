// Core Libraries
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

// Custom Components
import { PlaylistList, Songs } from '../globalValues';

// Images
import DeselectIcon from '../images/circle-xmark-regular-full.svg';
import QueueIcon from '../images/rectangle-list-regular-full.svg';
import SelectIcon from '../images/circle-check-regular-full.svg';
import AlbumIcon from '../images/vinyl-record-svgrepo-com.svg';
import ArtistIcon from '../images/user-regular-full.svg';
import PlayIcon from '../images/play-icon-outline.svg';
import AddIcon from '../images/plus-solid-full.svg';

/*
    Song / Album Context Menu - 

    Select
    Play (Entire Song/Album)
    Add to - Queue/Playlist
    Show Album
    Show Artist

    Artist Context Menu - 
    
    Select
    Play (Entire artist's music)
    Add to - Queue/Playlist
    Show Artist

    Playlist Context Menu - 
    
    Select
    Play (Entire playlist)
    Add to - Queue/Playlist
    Rename
    Delete    

    Playlist Songs Context Menu - 
    
    Select
    Play (Entire playlist)
    Add to - Queue/Playlist
    Remove
    Move Up/Down
    Show Album
    Show Artist

*/

type Props = {
    isToggled: boolean,
    context_type: string, // Album / Song / Artist / Playlist / Playlist Songs
    song: Songs,
    album: string,
    artist: string,
    index: number,
    play: (index: number) => void, // playSong / playAlbum function
    editSelection: (song: Songs, isBeingAdded: boolean, index: number) => void,
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

export default function CustomContextMenu({ 
    isToggled, context_type, song, album, artist, index, 
    play, editSelection, isBeingAdded, posX, posY,
    name, playlistList, createPlaylist, addToPlaylist, addToQueue, ref
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
                    {isBeingAdded === true && <><img src={DeselectIcon} />&nbsp;Deselect</>}
                    {isBeingAdded === false && <><img src={SelectIcon} />&nbsp;Select</>}
                </li>

                <li onClick={() => {play(index)}} className="d-flex align-items-center">
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

                {context_type !== "playlist" && 
                    <li  className="d-flex align-items-center" onClick={NavigateToAlbum} >
                        <img src={AlbumIcon} />
                        &nbsp; Show Album
                    </li>
                }
                {context_type !== "artist" && 
                    <li  className="d-flex align-items-center" onClick={NavigateToArtist} >
                        <img src={ArtistIcon} />
                        &nbsp; Show Artist
                    </li>
                }                
            </div>
        );
    }
    else { return; }    
}
