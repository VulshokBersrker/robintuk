// Core Libraries
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";

// Custom Components
import { savePosition, saveQueue, Songs } from "../globalValues";
import ImageWithFallBack from "../components/imageFallback";

// Images
import PlayIcon from '../images/play-icon-outline.svg';
import ArrowBackIcon from '../images/arrow-left.svg';

export default function QueueOverviewPage() {

    const navigate = useNavigate();

    const [loading, isLoading] = useState<boolean>(false);
    const [queue, setQueue] = useState<Songs[]>([]);
    const [duration, setDuration] = useState<number>(0);

    const [songSelection, setSongSelection] = useState<Songs[]>([]);
    const [checkBoxNumber, setCheckBoxNumber] = useState<boolean[]>([]);
    const[isCurrent, setIsCurrent] = useState<Songs>({ id: "", name: "", path: "", cover: "", release: "", track: 0, album: "",
        artist: "", genre: "", album_artist: "", disc_number: 0,  duration: 0
    });


    // On first load get the album details
    useEffect(() => {
        getQueue();

        const checkCurrentSong = localStorage.getItem("last-played-song");
        if(checkCurrentSong !== null) {
            setIsCurrent(JSON.parse(checkCurrentSong));
        }
    }, []);

    async function getQueue() {
        isLoading(true);
        try{
            const res: Songs[] = await invoke("player_get_queue");
            // console.log(res);
            setQueue(res);
            let dur = 0;
            let checkboxArr: boolean[] = [];
            let i = 0;
            res.forEach((x) => { dur += x.duration; checkboxArr[i] = false; i++; });
            setCheckBoxNumber(checkboxArr);
            setDuration(dur);
        }
        catch(e) {
            alert(e)
        }
        finally {
            isLoading(false);
        }
    }

    const navigateToAlbumOverview = (name: string) => {
        navigate("/albums/overview", {state: {name: name}});
    }

    // Load the song the user clicked on but also queue the entire album
    async function playSong(index: number) {
        try {
            await invoke('player_load_album', {queue: queue, index: index});
            await invoke('update_current_song_played', {path: queue[index].path});
            await invoke('update_current_song_played');
            saveQueue(queue);
            savePosition(index);
            // Update the music controls state somehow
        }
        catch (err) {
            alert(`Failed to play song: ${err}`);
        }
    }


    // Selection Function
    function editSelection(song: Songs, isBeingAdded: boolean, index: number) {
        // If we are adding to the array of selected songs
        if(isBeingAdded === true) {
            // Append to the array
            console.log("Adding song: " + song.name);
            setSongSelection([...songSelection, song]);
            const tempArr: boolean[] = checkBoxNumber;
            tempArr[index] = true;
            setCheckBoxNumber(tempArr);

        }
        // If we are removing a song from the array
        else {
            // Find the location of the song in the array with filter and only return the other songs
            console.log("Removing song: " + song.name);
            setSongSelection(songSelection.filter(item => item.id !== song.id));
            const tempArr: boolean[] = checkBoxNumber;
            tempArr[index] = false;
            setCheckBoxNumber(tempArr);
        }
    }

    function clearSelection() {
        setSongSelection([]);
        let tempArr: boolean[] = [];
        for(let i = 0; i < checkBoxNumber.length; i++) {
            tempArr[i]= false;
        }
        setCheckBoxNumber(tempArr);
    }

    if(loading) {
        return(
            <div className="d-flex vertical-centered">
                <span className="loader"/>
            </div>
        );
    }
    else {
        return(
            <div className="album-container">
                <div className="d-flex top-row justify-content-start">
                    <img src={ArrowBackIcon} className="icon icon-size" onClick={() => {navigate(-1)}}/>
                </div>

                {/* Album Details */}
                <div className="d-flex">
                    <div className="album-details d-flex">

                        <span style={{paddingLeft: "10px"}} className="grid-15">
                            <div style={{paddingBottom: "10px"}} className="section-15 header-font font-3">Music Queue</div>
                            <span className="section-15 font-0 misc-details">
                                {queue.length} songs &#x2022; {new Date(duration * 1000).toISOString().slice(11, 19)} total runtime
                            </span>
                            
                            <div className="section-15 d-flex album-commmands">
                                <span><button className="font-1 d-flex align-items-center" ><img src={PlayIcon} />Clear</button></span>
                                <span><button className="font-1">+ Add to</button></span>
                            </div>
                        </span>
                    </div>
                </div>

                {/* Song list */}
                <div className="song-list">
                    <div>
                        <div className="grid-20 position-relative">
                            <span className="section-1"></span>
                            <span className="section-1 vertical-centered font-0 track details">#</span>
                            <span className="section-9 vertical-centered font-0 details">Track</span>
                            <span className="section-8 vertical-centered font-0 details">Artist</span>
                            <span className="section-1 details">Length</span>
                        </div>
                        <hr />
                    </div>
                    {queue.map((song, i) => {
                        return(
                            <div key={i}>
                                <div className={`grid-20 song-row playlist align-items-center ${song.id.localeCompare(isCurrent.id) ? "" : "current-song"}`}>
                                    <span className="section-1 play">
                                        <span style={{paddingRight: '3px', paddingLeft: "3px"}}>
                                            <input
                                                type="checkbox" id={`select-${i}`} name={`select-${i}`}
                                                onClick={(e) => editSelection(song, e.currentTarget.checked, i)}
                                                checked={checkBoxNumber[i]}
                                            />
                                        </span>
                                        <img src={PlayIcon} onClick={() => playSong(i)} />
                                    </span>
                                    <span className="section-1 d-flex justify-content-end"><ImageWithFallBack image={song.cover} alt="" image_type="playlist-song" /></span>
                                    <span className="section-9 font-0 name">{song.name}</span>
                                    <span className="section-4 font-0 line-clamp-2 artist">{song.album}</span>
                                    <span className="section-4 font-0 line-clamp-2 artist">{song.artist}</span>
                                    <span className="section-1 header-font duration">{new Date(song.duration * 1000).toISOString().slice(14, 19)}</span>
                                </div>
                                <hr />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
}
