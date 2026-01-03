// Core Libraries
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SimpleBar from 'simplebar-react';

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
    addToPlaylist: (id: number, song: Songs) => void
    addToQueue: () => void,
    updateSongDetailsDisplay: (bool: boolean, path: string) => void,
    ref: any
}

export default function CustomContextMenu({ 
    isToggled, context_type, song, album, artist, index, 
    play, editSelection, isBeingAdded, posX, posY,
    name, playlistList, createPlaylist, addToPlaylist, addToQueue, updateSongDetailsDisplay,
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
                <li className="d-flex align-items-center" onClick={() => editSelection(song, !isBeingAdded, index) } >
                    {!isBeingAdded === false && <><img src={DeselectIcon} />&nbsp;Deselect</>}
                    {!isBeingAdded === true && <><img src={SelectIcon} />&nbsp;Select</>}
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
                                <span><button onClick={() => {createPlaylist(newPlaylistName)}}>Create</button></span>
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

                {!context_type.includes("playlist") || !context_type.includes("album_songs") && 
                    <li  className="d-flex align-items-center" onClick={NavigateToAlbum} >
                        <img src={AlbumIcon} />
                        &nbsp; Show Album
                    </li>
                }
                {!context_type.includes("artist") || !context_type.includes("album_songs") && 
                    <li  className="d-flex align-items-center" onClick={NavigateToArtist} >
                        <img src={ArtistIcon} />
                        &nbsp; Show Artist
                    </li>
                }    
                <li  className="d-flex align-items-center" onClick={() => updateSongDetailsDisplay(true, song.path)} >
                    <img src={ArtistIcon} />
                    &nbsp; Song Details
                </li>            
            </div>
        );
    }
    else { return; }    
}
