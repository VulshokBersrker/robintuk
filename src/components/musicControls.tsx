// Core Libraries
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useRef, useState } from "react";

// Custom Components
import { GetCurrentSong, savePosition, Songs, SongLyrics, DirectoryInfo } from "../globalValues";
import ImageWithFallBack from "./imageFallback";

// Images
import BackwardButton from '../images/backward-step-solid-full.svg';
import ForwardButton from '../images/backward-step-solid-full.svg';
import VolumeStandard from '../images/volume-low-solid-full.svg';
import VolumeEmpty from '../images/volume-off-solid-full.svg';
import ShuffleButton from '../images/shuffle-solid-full.svg';
import RepeatButton from '../images/repeat-solid-full.svg';
import PauseButton from '../images/pause-solid-full.svg';
import PlayButton from '../images/play-solid-full.svg';
import RepeatOneIcon from '../images/repeat-one.svg';
import Circle from '../images/circle.svg';

// Update Volume Mute to return the volume to what is was before the mute

interface Lyrics { plain_lyrics: string[], synced_lyrics: string[] }

export default function MusicControls() {

    const [displayFullscreen, setDisplayFullscreen] = useState<boolean>(false);

    // Song Info
    const [songProgress, setSongProgress] = useState<number>(0);

    // Media Player States    
    const [isLoaded, setIsLoaded] = useState<boolean>(false); // Will hide music player when no music is loaded (but still while paused)
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isShuffle, setIsShuffle] = useState<boolean>(false);
    const [repeatMode, setRepeatMode] = useState<number>(1); // Defaults to on full repeat
    const [volume, setVolume] = useState<number>(20);

    const [songDetails, setSongDetails] = useState<Songs>();

    // Song Lyric Values
    const [hasLyrics, setHasLyrics] = useState<boolean>(false);
    const [songLyrics, setSongLyrics] = useState<Lyrics>();

    const currentLineRef = useRef<HTMLDivElement | null>(null);
    const currentLineNumberRef = useRef<number | null>(null);

    useEffect(() => {
        if(currentLineRef.current) {
            currentLineRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    }, [songProgress]);

    // Called only once on load
    useEffect(() => {
        firstLoad();

        const storedVolume: string | null = localStorage.getItem("volume-level");
        if(storedVolume !== null) {
            updateVolume(JSON.parse(storedVolume));
        }        
    }, []);

    // Just for listeners
    useEffect(() => {
        // Load the queue (song / album / playlist) from the backend
        // Also is run when next and previous are emitted
        const unlisten_get_current_song = listen<GetCurrentSong>("get-current-song", (event) => { loadSong(event.payload.q); saveSong(event.payload.q); });
        const unlisten_update_song = listen<DirectoryInfo>("update-song", (event) => { updateSongDetails(event.payload.dir_path); });
        const check_for_clear = listen("queue-cleared", () => { stopSong(); });
        
        // Listen for when the MediaPlayPause shortcut is pressed
        const unlisten_play_pause = listen("controls-play-pause", async(event) => { if(!event.payload) { setIsPlaying(false); } else { setIsPlaying(true); } });
        const unlisten_shuffle_setting = listen<boolean>("player-shuffle-mode", (event) => { setIsShuffle(event.payload); });

        const handler = (e: any) => {
            if(e.clientY <= 29) {
                setTimeout(() => {
                    setDisplayFullscreen(false);
                }, 100);                
            }
        }
        document.addEventListener('mousedown', handler);
        
        return () => {
            unlisten_get_current_song.then(f => f()),
            check_for_clear.then(f => f()),
            unlisten_play_pause.then(f => f()),
            unlisten_shuffle_setting.then(f => f()),
            unlisten_update_song.then(f => f()),
            document.removeEventListener('mousedown', handler);
        }        
    }, []);

    // Track the progress of the song
    useEffect(() => {
        let interval = undefined;

        if(isPlaying) {
            interval = setInterval(() => {
                setSongProgress((time) => time + 1);
            }, 1000);
        }
        else {
            clearInterval(interval);
        }
        return () => {
            clearInterval(interval);
        };
    }, [isPlaying]);

    // Check if the song is over - play next song is able
    useEffect(() => {
        if(songProgress === songDetails?.duration) {
            setSongProgress(0);
            // Append the next song to the sink
            setNextSongforLoad();
        }
    }, [songProgress]);

    // --------------------- Start of Simple Media Functions ---------------------
    // Play the currently selected music
    async function playMusic() {
        try {
            setIsPlaying(true);
            await invoke("player_play");            
        }
        catch(e) {
            console.log(e);
        }          
    }

    async function pauseMusic() {
        try {
            setIsPlaying(false);
            await invoke("player_pause");
        }
        catch(e) {
            console.log(e);
        }   
    }

    function stopSong() {
        setIsPlaying(false);
        setIsLoaded(false);
        setSongProgress(0);
    }

    async function nextSong() {
        const qPosition: number = await invoke('player_get_current_position');
        const qLength: number  = await invoke('player_get_queue_length');
        
        try {
            // No Repeat Mode and at the end of the queue
            if(repeatMode === 0 && qPosition + 1 > qLength - 1) {
                console.log("end of queue");
                await invoke("player_stop");
            }
            // Repeat Mode - Repeat All
            else {
                // At the end of the queue and shuffle is on, reshuffle the queue
                if(isShuffle && qPosition + 1 > qLength - 1) {
                    await invoke("shuffle_queue", {song: songDetails?.path, shuffled: isShuffle});
                }
                await invoke("player_next_song");
                currentLineNumberRef.current = 0;
            }
            currentLineNumberRef.current = null;
        }
        catch(e) {
            console.log("Error playing the next song: " + e);
        }
        finally {
            // not repeat mode
            if(repeatMode === 0 && qPosition + 1 > qLength - 1) {
                setSongProgress(0);
                pauseMusic();
            }
            else {
                const song: Songs = await invoke("player_get_current_song");
                saveSong(song);
                const pos: number = await invoke("player_get_current_position");
                savePosition(pos);
                await invoke("update_current_song_played");
                await checkForLyrics(song.path);
            }
        }
    }
    async function previousSong() {
        if(isLoaded) {
            try {
                if(songProgress > 3) {
                    seekSong(0);
                    currentLineNumberRef.current = 0;
                }
                else {
                    await invoke("player_previous_song");
                    currentLineNumberRef.current = 0;
                }
                currentLineNumberRef.current = null;
            }
            catch(e) {
                console.log(e);
            }
            finally {
                const song: Songs = await invoke("player_get_current_song");
                saveSong(song);
                const pos: number = await invoke("player_get_current_position");
                savePosition(pos);
                await invoke("update_current_song_played");
                await checkForLyrics(song.path);
            }
        }
    }

    // Function to update the volume of the music player
    async function updateVolume(volume: number) {
        setVolume(volume);
        // console.log("volume is at: ", (volume / 50));
        await invoke("player_set_volume", { volume: (volume / 50) });
        localStorage.setItem("volume-level", JSON.stringify(volume));
    }
    // Function to update the volume of the music player
    async function updateRepeatMode(mode: number) {
        setRepeatMode(mode);
        await invoke("player_set_repeat_mode", { mode: mode });
        localStorage.setItem("repeat-mode", JSON.stringify(mode));
    }
    // Function to update the volume of the music player
    async function updateShuffleMode() {
        try {
            if(isShuffle && songDetails !== undefined) {
                setIsShuffle(false);
                // Index of the current song
                await invoke("shuffle_queue", { song: songDetails.path, shuffled: false });
            }
            else if(!isShuffle && songDetails !== undefined) {
                setIsShuffle(true);
                // Index of the current song
                await invoke("shuffle_queue", { song: songDetails.path, shuffled: true });
            }
        }
        catch(e) {
            console.log(e);
        }
        finally {
            localStorage.setItem("shuffle-mode", JSON.stringify(!isShuffle));
        }
    }
    // Set where in the song it plays
    async function seekSong(value: number) {
        try {
            setIsPlaying(false);
            setSongProgress(value);
            await invoke("player_set_seek", { pos: value });
        }
        catch(e) {
            console.log(e);
        }
        finally {
            playMusic();
        }
    }
    // --------------------- End of Simple Media Functions ---------------------


    // --------------------- Start of Song Management Functions ---------------------

    async function sendQueueToBackend(queue: Songs[], index: number) {
        // This will reset the song's progress when a refresh happens
        try {
            await invoke('player_setup_queue_and_song', { queue: queue, index: index });
        }
        catch(e) {
            console.log(`Failed to setup player: ${e}`);
            setIsLoaded(false);
        }
    }
    // Similar to the loadQueue, but doesn't play the music because it's just loading the data
    async function firstLoad() {
        const qPosition: string | null = localStorage.getItem('last-played-queue-position');
        const shuffleMode: boolean = JSON.parse(localStorage.getItem('shuffle-mode')!);

        pauseMusic();
        if(qPosition !== null) {
            try {
                // Get the last played song, if exists
                const queue: Songs[] = await invoke<Songs[]>("get_queue", {shuffled: shuffleMode !== null ? shuffleMode : false});
                // console.log(queue);

                if(queue.length === 0) {
                    setIsLoaded(false);
                }
                else if(queue.length < parseInt(qPosition)) {
                    console.log("qPosition is greater than queue length - cannot load");
                }
                else {
                    setSongDetails(queue[JSON.parse(qPosition!)]);
                    setSongProgress(0);
                    setIsLoaded(true);

                    if(shuffleMode !== null) {
                        if(shuffleMode) {
                            setIsShuffle(true);
                            sendQueueToBackend(queue, JSON.parse(qPosition!));
                        }
                        else {
                            sendQueueToBackend(queue, JSON.parse(qPosition!));
                        }
                        await checkForLyrics(queue[JSON.parse(qPosition!)].path);
                    }
                    else {
                        setIsShuffle(false);
                    }
                }
            }
            catch(e) {
                alert(`Failed load music controls: ${e}`);
                setIsLoaded(false);
            }
        }
        else {
            setIsLoaded(false);
        }

        const storedVolume = localStorage.getItem("volume-level");
        if(storedVolume !== null) {
            updateVolume(JSON.parse(storedVolume));
        }
        else {
            updateVolume(volume);
        }
    }

    async function checkForLyrics(path: string) {
        currentLineNumberRef.current = 0;
        currentLineRef.current = null;
        currentLineNumberRef.current = null;
        try {
            const res: SongLyrics = await invoke("get_lyrics", {song_id: path});
            setHasLyrics(true);

            let spilt_plain: string[] = [];
            let split_synced: string[] = [];

            if(res.plain_lyrics !== null) {
                if(res.plain_lyrics.includes("\\n")) {
                    split_synced = res.synced_lyrics.split("\\n");
                    spilt_plain = res.plain_lyrics.split("\\n");
                }
                else if(res.plain_lyrics.includes("\r\n")) {
                    split_synced = res.synced_lyrics.split("\r\n");
                    spilt_plain = res.plain_lyrics.split("\r\n");
                }
                else if(res.plain_lyrics.includes("\n")) {
                    split_synced = res.synced_lyrics.split("\n");
                    spilt_plain = res.plain_lyrics.split("\n");
                }

                if(spilt_plain.length >= 0) {
                    if(res.synced_lyrics === "null") {
                        setSongLyrics({plain_lyrics: spilt_plain, synced_lyrics: []});
                    }
                    else {
                        setSongLyrics({plain_lyrics: spilt_plain, synced_lyrics: split_synced});
                    }
                }
            }
        }
        catch(e) {
            setHasLyrics(false);
            setSongLyrics(undefined);
        }
    }

    function saveSong(q: Songs) {
        localStorage.setItem('last-played-song', JSON.stringify(q));
    }

    async function updateSongDetails(song_id: string) {
        try {
            const song: Songs = await invoke("get_song", {song_path: song_id});
            await checkForLyrics(song.path);
            setSongDetails(song);
        }
        catch(e) {
            console.log(e);
        }
    }
    
    // Load the Queue and last index from the emitter event in the backend
    async function loadSong(q: Songs) {
        try {
            setSongProgress(0);
            setSongDetails(q);
            await checkForLyrics(q.path);
        }
        catch(e) {
            alert(`Failed to get song: ${e}`);
            setIsLoaded(false);
            setIsPlaying(false);
        }
        finally {
            await invoke('add_song_to_history', { path: q.path });
            setIsLoaded(true);
            setIsPlaying(true);
        }
    }
    
    async function setNextSongforLoad() {
        try {
            
            // Used to limit the frontend from making an extra call, which would add a dup song
            const num_loaded_songs: number = await invoke("player_get_sink_length");

            const pos: number = await invoke("player_get_current_position");
            const qLength: number = await invoke("player_get_queue_length");
            if (pos + 1 >= qLength) {
                if (num_loaded_songs <= 2) {
                    await invoke("player_update_pos", { index: 0 });
                    savePosition(0);
                    // Load the next song in the queue to be ready
                    await invoke("player_load_song", { index: 0 });
                }
                savePosition(0);
            }
            else {
                if (num_loaded_songs <= 2) {
                    await invoke("player_update_pos", { index: pos + 1 });
                    savePosition(pos + 1);
                    // Load the next, unloaded song to the queue (The second song from the one that just ended)
                    if(pos + 2 >= qLength) {
                        await invoke("player_load_song", { index: 0 });
                    }
                    else {
                        await invoke("player_load_song", { index: pos + 2 });
                    }
                }
            }
        }
        catch(e) {
            console.log(e);
        }
        finally {
            // Get the new song's details
            const newSong: Songs = await invoke("player_get_current_song");
            setSongDetails(newSong);
            saveSong(newSong);
            
            // Send out update that a new song is being played
            await invoke("update_current_song_played");
            await checkForLyrics(newSong.path);
        }
    }
    // --------------------- End of Song Management Functions ---------------------
    
    

    if(isLoaded) {
        return(
            <>
                <div className="music-control-container">
                    <div className="music-progress-bar">
                        <input
                            type="range"
                            min={0}
                            step={0.1}
                            max={songDetails?.duration}
                            className="progress-bar"
                            value={songProgress}
                            onChange={(e) => seekSong(parseInt(e.target.value))}
                            disabled={songDetails === undefined ? true : false}
                            onDrag={(e) => seekSong(parseInt(e.currentTarget.value))}
                        />
                    </div>

                    <div className="grid-15 music-controls">
                        {/* Current Song Details */}
                        <div className="section-5 music-details d-flex">
                            <span className="full-screen-clickable" onClick={() => setDisplayFullscreen(!displayFullscreen)} >
                                <span className="song-album-image">
                                    <ImageWithFallBack image={songDetails?.cover} alt={"player album"} image_type={"player"} />
                                </span>
                                <span>
                                    <div className="song-name">{songDetails?.name}</div>
                                    <div className="song-album">{songDetails?.album}</div>
                                    <div className="song-album">{songDetails?.artist}</div>                 
                                </span>
                            </span>
                        </div>

                        {/* Music Control Buttons */}
                        <div className="section-5 player-buttons d-flex justify-content-center align-items-center">
                            <div className="d-flex justify-content-center align-items-center">
                                <div className="play-button" id="shuffle">
                                    <img
                                        src={ShuffleButton}
                                        alt="shuffle queue"
                                        onClick={updateShuffleMode}
                                        className={`cursor-pointer ${songDetails === undefined ? "disabled" : ""} ${isShuffle === true ? "on" : "off"}`}
                                    />
                                </div>

                                <div className="play-button cursor-pointer" id="previous">
                                    <img src={BackwardButton} alt="" className={`${songDetails === undefined ? "disabled" : ""}`}  onClick={previousSong}/>
                                </div>

                                
                                <div className="play-button d-flex align-items-center justify-content-center" id="play-pause">
                                    {(isPlaying === false || isPlaying === undefined) &&
                                        <div className="play-container" onClick={playMusic}>
                                            <img
                                                src={PlayButton} alt="play icon"
                                                className={`play-pause-icon ${songDetails === undefined ? "disabled" : ""}`}
                                            />
                                            <img src={Circle} className="circle"/>
                                        </div>
                                    }                           
                                    {isPlaying === true &&
                                        <div className="play-container" onClick={pauseMusic}>
                                            <img
                                                src={PauseButton} alt=""
                                                className={`play-pause-icon ${songDetails === undefined ? "disabled" : ""}`}
                                            />
                                            <img src={Circle} className="circle"/>
                                        </div>                                    
                                    }
                                </div>

                                <div className="play-button cursor-pointer" id="next">
                                    <img src={ForwardButton} alt="" className={`icon-flip ${songDetails === undefined ? "disabled" : ""}`} onClick={nextSong}/>
                                </div>

                                <div className="play-button" id="repeat">
                                    {repeatMode === 0 &&
                                        <img
                                            src={RepeatButton}
                                            alt="repeat song"
                                            onClick={() => updateRepeatMode(repeatMode + 1)}
                                            className={`cursor-pointer ${songDetails === undefined ? "disabled" : ""} off`}
                                        />
                                    }
                                    {repeatMode === 1 &&
                                        <img
                                            src={RepeatButton}
                                            alt="repeat song"
                                            onClick={() => updateRepeatMode(repeatMode + 1)}
                                            className={`cursor-pointer ${songDetails === undefined ? "disabled" : ""} on`}
                                        />
                                    }
                                    {repeatMode === 2 &&
                                        <img
                                            src={RepeatOneIcon}
                                            alt="repeat song"
                                            onClick={() => updateRepeatMode(0)}
                                            className={`cursor-pointer ${songDetails === undefined ? "disabled" : ""} on`}
                                        />
                                    }
                                    
                                </div>
                            </div>
                            
                        </div>
                        <div className="section-4 d-flex align-items-center justify-content-end"> 
                            <div className="d-flex vertical-centered">
                                {volume === 0 && <img src={VolumeEmpty} alt="" className="volume-icon cursor-pointer"/>}
                                {(volume > 0 ) && <img src={VolumeStandard} alt="" className="volume-icon cursor-pointer" onClick={() => updateVolume(0)}/>}

                                <input
                                    type="range" min={0} max={60}
                                    className={`volume ${songDetails === undefined ? "disabled" : ""}`}
                                    value={volume}
                                    onChange={(e) => updateVolume(parseInt(e.target.value))}
                                />                            
                            </div>

                        </div>
                        <div className="section-1 d-flex align-items-center justify-content-start"></div>
                    </div>
                </div>
                
                
                <div className={`fullscreen-music ${displayFullscreen ? "open" : "closed"}`} >
                    <span className={`d-flex artwork ${hasLyrics ? "lyric" : ""}`}>
                        <ImageWithFallBack image={songDetails?.cover} alt="" image_type="album-larger" />
                        <div>
                            <p className="header-font font-4">{songDetails?.name}</p>
                            <p className="font-3 song-album">{songDetails?.album}</p>
                            <p className="font-2 song-album">{songDetails?.artist}</p>
                        </div>                        
                    </span>
                    {hasLyrics && songLyrics !== undefined &&
                        <span className="lyrics">
                            <div style={{paddingTop: "40px"}} />
                            {songLyrics.plain_lyrics.length > 0 && songLyrics.synced_lyrics.length > 0 && songLyrics.synced_lyrics.map((entry, i): any => {
                                let timestamp: string = "";
                                let time_in_seconds: number = 0;
                                if(songLyrics.synced_lyrics !== null && songLyrics.synced_lyrics[i] !== undefined) {
                                    if(songLyrics.synced_lyrics[i].includes("[")) {
                                        timestamp = songLyrics.synced_lyrics[i].split("[")[1].substring(0, 8);

                                        time_in_seconds = (parseInt(timestamp.split(":")[0]) * 60) // Minutes
                                        + (parseInt(timestamp.split(":")[1].substring(0, 2))) // Seconds
                                        + (parseInt(timestamp.split(".")[1]) / 100); // Milliseconds

                                        // Works, but need to find a way for the highlight to stick until the next line is active
                                        if(Math.abs(time_in_seconds - songProgress) < 1) {
                                            currentLineNumberRef.current = i;
                                        }
                                    }
                                }

                                return(
                                    <div
                                        className={`lyric-row font-3 sub-font ${currentLineNumberRef.current === i ? "active" : ""} ${(songProgress > time_in_seconds) ? "old" : ""}`}
                                        id={`${timestamp === "" ? `${i}` : timestamp}`}
                                        key={`timestamp-${i}`} ref={currentLineNumberRef.current === i ? currentLineRef : null}
                                    >
                                        {entry.slice(11)}
                                    </div>
                                );
                            })}

                            {songLyrics.plain_lyrics.length > 0 && songLyrics.synced_lyrics.length === 0 && songLyrics.plain_lyrics.map((entry, i): any => {
                                return(
                                    <div className={`lyric-row font-3 sub-font`}  key={`timestamp-${i}`} ref={currentLineNumberRef.current === i ? currentLineRef : null} >
                                        {entry}
                                    </div>
                                );
                            })}
                            <div className="lyric-buffer" />
                        </span>
                    }
                    
                    <div className="vertical-centered" id="fullscreen-bg"><ImageWithFallBack image={songDetails?.cover} alt="" image_type="fullscreen" /></div>
                </div>
            </>
        );
    }
    else { return; }
}