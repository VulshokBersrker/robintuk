// Core Libraries
import { useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import SimpleBar from "simplebar-react";

// Custom Components
import { GetCurrentSong, PlayHistory, savePosition, saveQueue, Songs } from "../globalValues";
import ImageWithFallBack from "../components/imageFallback";

// Images
import PlayIcon from '../images/play-icon-outline.svg';
import ArrowBackIcon from '../images/arrow-left.svg';

export default function PlayHistoryPage() {

    const navigate = useNavigate();
    const [scrollParent, setScrollParent] = useState<any>(null);

    const [playHistory, setPlayHistory] = useState<PlayHistory[]>([]);
    const [isCurrent, setIsCurrent] = useState<Songs>({ name: "", path: "", cover: "", release: "", track: 0, album: "", artist: "", genre: "", album_artist: "", disc_number: 0,  duration: 0, song_section: 0 });

    // On first load get the album details
    useEffect(() => {
        getHistory(); 
    }, []);

    // On first load get the album details
    useEffect(() => {

        const checkCurrentSong = localStorage.getItem("last-played-song");
        if(checkCurrentSong !== null) {
            setIsCurrent(JSON.parse(checkCurrentSong));
        }

        // // Load the current song (song / album / playlist) from the backend
        const unlisten_get_current_song = listen<GetCurrentSong>("get-current-song", (event) => { setIsCurrent(event.payload.q); getHistory(); });
        
        return () => {
            unlisten_get_current_song.then(f => f());
        }  
    }, []);

    // To update the list when playHistory Changes
    useEffect(() => {
        getHistory();
    }, [playHistory]);

    async function getHistory() {
        try{
            const list = await invoke<PlayHistory[]>('get_play_history', { limit: -1 } );
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

    // Load the song the user clicked on but also queue the entire album
    async function playSong(index: number) {
        try {
            await invoke('player_load_album', {queue: playHistory, index: index});
            await invoke('update_current_song_played');
            saveQueue(playHistory);
            savePosition(index);
            // Update the music controls state somehow
        }
        catch (err) {
            alert(`Failed to play song: ${err}`);
        }
    }


    // ------------ End of Selection Bar Functions ------------


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
                                <div className={`grid-20 song-row playlist align-items-center ${playHistory[index].path.localeCompare(isCurrent.path) ? "" : "current-song"}`}>
                                    <span className="section-1 play">
                                        <img src={PlayIcon} onClick={() => playSong(index)} />
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
        </SimpleBar>
    );
    
}
