// Core Libraries
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// Custom Components
import { Songs } from '../globalValues';

// Images
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
    posY: number
}

export default function CustomContextMenu({ isToggled, context_type, song, album, artist, index, play, editSelection, isBeingAdded, posX, posY }: Props) {

    const navigate = useNavigate();

    function NavigateToAlbum() {
        navigate("/albums/overview", {state: {name: album}});
    }
    function NavigateToArtist() {
        navigate("/artists/overview", {state: {name: artist}});
    }

    useEffect(() => {
        const element = document.getElementsByClassName("content");
        if(isToggled) {
            element[0].classList.add("disable-scroll");
        }
        else {
            element[0].classList.remove("disable-scroll");
        }
    }, [isToggled]);

    if(isToggled) {
        return(
            <div 
                className="context-menu-container header-font font-1"
                style={{ position: "fixed", left: `${posX}px`, top: `${posY}px`}}
                onContextMenu={(e) => {  e.preventDefault(); }}
            >
                <li className="d-flex align-items-center"
                    onClick={() => editSelection(song, !isBeingAdded, index) }
                >
                    <img src={SelectIcon} />
                    &nbsp; Select
                </li>

                <li onClick={() => {play(index)}} className="d-flex align-items-center">
                    <img src={PlayIcon} />
                    &nbsp; Play
                </li>

                <li className="d-flex align-items-center">
                    <img src={AddIcon} />
                    &nbsp; Add to
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
