// Core Libraries
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Virtuoso } from "react-virtuoso";
import SimpleBar from "simplebar-react";

// Custom Components
import { GetCurrentSong, Songs, playSong } from "../globalValues";
import ImageWithFallBack from "../components/imageFallback";

// Images
import AlbumIcon from '../images/vinyl-record-svgrepo-com.svg';
import ArtistIcon from '../images/user-regular-full.svg';
import PlayIcon from '../images/play-solid-full.svg';
import ArrowBackIcon from '../images/arrow-left.svg';

export default function PlayHistoryPage() {

    const navigate = useNavigate();
    const [scrollParent, setScrollParent] = useState<any>(null);

    const [playHistory, setPlayHistory] = useState<Songs[]>([]);
    const [isCurrent, setIsCurrent] = useState<Songs>({ name: "", path: "", cover: "", release: "", track: 0, album: "", artist: "", genre: "", album_artist: "", disc_number: 0,  duration: 0, song_section: 0 });

    const [contextMenu, setContextMenu] = useState({ isToggled: false, album: "", artist: "", index: 0, posX: 0, posY: 0 });
    const isContextMenuOpen = useRef<any>(null);

    // On first load get the album details
    useEffect(() => {
        getHistory();
    }, []);

    // Listeners
    useEffect(() => {

        const checkCurrentSong = localStorage.getItem("last-played-song");
        if(checkCurrentSong !== null) {
            setIsCurrent(JSON.parse(checkCurrentSong));
        }

        // Load the current song (song / album / playlist) from the backend
        const unlisten_get_current_song = listen<GetCurrentSong>("get-current-song", (event) => { 
            setTimeout(() => {
                setIsCurrent(event.payload.q);
                getHistory();
            }, 100);
        });

        const handler = (e: any) => {
            if(!contextMenu.isToggled && !isContextMenuOpen.current?.contains(e.target)) {
                resetContextMenu();
            }
        }
        document.addEventListener('mousedown', handler);
        
        return () => {
            document.removeEventListener('mousedown', handler),
            unlisten_get_current_song.then(f => f());
        }
    }, []);

    async function getHistory() {
        try{
            const list: Songs[] = await invoke<Songs[]>('get_play_history', { limit: -1 } );
            setPlayHistory(list);
        }
        catch(e) {
            console.log(e);
        }
    }

    const navigateToAlbumOverview = (name: string) => {
        navigate("/albums/overview", {state: {name: name}});
    }
    const navigateToArtistOverview = (name: string) => {
        navigate("/artists/overview", {state: {name: name}});
    }

    function handleContextMenu(e: any, album: string, artist: string, index: number) {
        if(e.pageX < window.innerWidth / 2) {
            if(e.pageY < window.innerHeight / 2) {
                setContextMenu({ isToggled: true, album: album, artist: artist, index: index, posX: e.pageX, posY: e.pageY});
            }
            else {
                setContextMenu({ isToggled: true, album: album, artist: artist, index: index, posX: e.pageX, posY: e.pageY - 20});
            }
        }
        else {
            if(e.pageY < window.innerHeight / 2) {
                setContextMenu({ isToggled: true, album: album, artist: artist, index: index, posX: e.pageX - 150, posY: e.pageY});
            }
            else {
                setContextMenu({ isToggled: true, album: album, artist: artist, index: index, posX: e.pageX - 150, posY: e.pageY - 20});
            }
        }
    }

    function resetContextMenu() {
        setContextMenu({ isToggled: false, album: "", artist: "", index: 0, posX: 0, posY: 0});
    }


    return(
        <SimpleBar forceVisible="y" autoHide={false}  ref={setScrollParent}>
            <div className="album-container">
                <div className="d-flex top-row justify-content-start">
                    <img src={ArrowBackIcon} className="icon icon-size" onClick={() => {navigate(-1)}}/>
                </div>

                {/* Play History Details */}
                <div className="d-flex">
                    <div className="album-details d-flex">

                        <span style={{paddingLeft: "10px"}} className="grid-15">
                            <div style={{paddingBottom: "10px"}} className="section-15 header-font font-3">Play History</div>
                        </span>
                    </div>
                </div>

                {/* Song list */}
                <div className="song-list">
                    <div>
                        <div className="grid-20 position-relative">
                            <span className="section-1" style={{width: '65px'}}>&nbsp;</span>
                            <span className="section-9 vertical-centered font-0 details">Track</span>
                            <span className="section-4 vertical-centered font-0 details">Album</span>
                            <span className="section-4 vertical-centered font-0 details">Album Artist</span>
                            <span className="section-1 details">Length</span>
                        </div>
                        <hr />
                    </div>

                    <Virtuoso 
                        totalCount={playHistory.length}
                        itemContent={(index) => {
                            return(
                                <div key={index}>
                                    <div className={`grid-20 song-row playlist align-items-center ${playHistory[index].path.localeCompare(isCurrent.path) ? "" : "current-song"}`}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            handleContextMenu(e, playHistory[index].album, playHistory[index].album_artist, index);
                                        }}
                                    >
                                        <span className="section-1 play">
                                            <img src={PlayIcon} onClick={() => playSong(playHistory[index])} />
                                        </span>
                                        <span className="section-1 d-flex justify-content-end"><ImageWithFallBack image={playHistory[index].cover} alt="" image_type="playlist-song" /></span>
                                        
                                        <span className="section-8 font-0 name">{playHistory[index].name}</span>
                                        <span className="section-4 font-0 line-clamp-2 artist" onClick={() => navigateToAlbumOverview(playHistory[index].album)}>{playHistory[index].album}</span>
                                        <span className="section-4 font-0 line-clamp-2 artist" onClick={() => navigateToArtistOverview(playHistory[index].album_artist)}>{playHistory[index].album_artist}</span>
                                        <span className="section-1 header-font duration">{new Date(playHistory[index].duration * 1000).toISOString().slice(14, 19)}</span>
                                    </div>
                                    <hr />
                                </div>
                            );                                
                        }}
                        customScrollParent={scrollParent ? scrollParent.contentWrapperEl : undefined}
                    />
                </div>
            </div>
            <div className="empty-space"/>

            <CustomContextMenu
                isToggled={contextMenu.isToggled}
                song={playHistory[contextMenu.index]}
                album={contextMenu.album}
                artist={contextMenu.artist}
                playSong={playSong}
                posX={contextMenu.posX}
                posY={contextMenu.posY}
                ref={isContextMenuOpen}
                resetContextMenu={resetContextMenu}
            />
        </SimpleBar>
    );
}



type Props = {
    isToggled: boolean,
    album: string,
    song: Songs,
    artist: string,
    playSong: (song: Songs) => void,
    posX: number,
    posY: number,
    ref: any,
    resetContextMenu: () => void
}

function CustomContextMenu({ 
    isToggled, song, album, artist, playSong, posX, posY, ref, resetContextMenu
}: Props) {

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
                <li onClick={() => { playSong(song); resetContextMenu(); }} className="d-flex align-items-center" >
                    <img src={PlayIcon} />
                    &nbsp; Play
                </li>

                {album !== "" && 
                    <li  className="d-flex align-items-center" onClick={NavigateToAlbum} >
                        <img src={AlbumIcon} /> &nbsp; Show Album
                    </li>
                }
                {artist !== "" && 
                    <li  className="d-flex align-items-center" onClick={NavigateToArtist} >
                        <img src={ArtistIcon} /> &nbsp; Show Artist
                    </li>
                }
            </div>
        );
    }
    else { return; }    
}
