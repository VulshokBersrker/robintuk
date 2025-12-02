// Core Libraries
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from "react";

// Custom Components
import { GetCurrentSong, savePosition, saveShuffledQueue, shuffle, Songs } from "../globalValues";
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


// One first install - needs to be blank - or be hidden when there is no music setup
// On app launches - needs to find the last played queue and preload the song and where it was last at in the song

// https://github.com/itsakeyfut/music-player/blob/main/my-app/src-tauri/src/main.rs
// https://github.com/CyanFroste/meowsic/blob/master/src/players.tsx
// https://github.com/vleerapp/Vleer/blob/main/src-tauri/src/api/commands.rs

// Event listener for media controls
// https://github.com/vleerapp/Vleer/blob/1da2d9b229dd5d072b57924ed45848aad4e4e2a8/app.vue#L13



export default function MusicControls() {

    const [displayFullscreen, setDisplayFullscreen] = useState<boolean>(false);

    // Song Info
    const [songProgress, setSongProgress] = useState<number>(0);
    const [songLengthFormatted, setSongLengthFormatted] = useState<String>("");

    // Media Player States    
    const [isLoaded, setIsLoaded] = useState<boolean>(true); // Will hide music player when no music is loaded (but still while paused)
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isShuffle, setIsShuffle] = useState<boolean>(false);
    const [repeatMode, setRepeatMode] = useState<number>(1); // Defaults to on full repeat
    const [volume, setVolume] = useState<number>(30);

    const [songDetails, setSongDetails] = useState<Songs>();

    // Called only once on load
    useEffect(() => {
        // Queue info stored in localstorage
        const qPosition = localStorage.getItem('last-played-queue-position');
        const queue = localStorage.getItem('last-played-queue');
        // Stop music from playing if the app refreshs - maybe only good in dev mode
        const storedVolume: string | null = localStorage.getItem("volume-level");
        const lastPlayedSong: string | null = localStorage.getItem('last-played-song');

        if(lastPlayedSong !== null) {
            firstLoad(JSON.parse(lastPlayedSong));
            pauseMusic();
        }
        if(qPosition !== null && queue !== null) {
            const shuffleMode: string | null = localStorage.getItem('shuffle-mode');
            if(shuffleMode !== null) {
                const shuffle: boolean = JSON.parse(shuffleMode);
                const shuffledQueue: string = localStorage.getItem("shuffled-queue")!;
                if(shuffle) {
                    setIsShuffle(true);
                    sendQueueToBackend(JSON.parse(shuffledQueue), JSON.parse(qPosition));
                }
                else {
                    sendQueueToBackend(JSON.parse(queue), JSON.parse(qPosition));
                }
            }            
        }
        else {
            setIsLoaded(false);
        }
        if(storedVolume !== null) {
            updateVolume(JSON.parse(storedVolume));
        }        
    }, []);

    // Just for listeners
    useEffect(() => {
        // Load the queue (song / album / playlist) from the backend
        const unlisten_get_current_song = listen<GetCurrentSong>("get-current-song", (event) => { loadSong(event.payload.q); });
        
        // Listen for when the MediaPlayPause shortcut is pressed
        const unlisten_play_pause = listen("controls-play-pause", async() => { 
            const isPaused = await invoke("player_is_paused");
            if(!isPaused) { pauseMusic(); }
            else { playMusic(); }
        });
        // Listen for when the MediaTrackNext shortcut is pressed
        const unlisten_next_song = listen<GetCurrentSong>("controls-next-song", () => { nextSong(); });
        // Listen for when the MediaTrackPrevious shortcut is pressed
        const unlisten_previous_song = listen<GetCurrentSong>("controls-prev-song", () => { previousSong() });

        // Listen for when the MediaTrackPrevious shortcut is pressed
        const unlisten_shuffle_setting = listen<boolean>("player-shuffle-mode", (event) => { setIsShuffle(event.payload) });
        
        return () => {
            unlisten_get_current_song.then(f => f());
            unlisten_play_pause.then(f => f());
            unlisten_next_song.then(f => f());
            unlisten_previous_song.then(f => f());
            unlisten_shuffle_setting.then(f => f());
        }        
    }, []);

    async function sendQueueToBackend(queue: Songs[], index: number) {
        // This will reset the song's progress when a refresh happens
        try {
            await invoke('player_setup_queue_and_song', { queue: queue, index: index });
        }
        catch(e) {
            alert(`Failed to get song: ${e}`);
            setIsLoaded(false);
        }
    }
    // Similar to the loadQueue, but doesn't play the music because it's just loading the data
    async function firstLoad(song: Songs) {
        try {
            setSongDetails(song);
            setSongProgress(0);
            setSongLengthFormatted(new Date(song.duration * 1000).toISOString().slice(12, 19));
            setIsLoaded(true);
        }
        catch(e) {
            alert(`Failed to get song: ${e}`);
            setIsLoaded(false);
        }
    }

    function saveSong(q: Songs) {
        localStorage.setItem('last-played-song', JSON.stringify(q));
    }
    
    // Load the Queue and last index from the emitter event in the backend
    async function loadSong(q: Songs) {
        try {
            setSongProgress(0);
            setSongDetails(q);
            setSongLengthFormatted(new Date(q.duration * 1000).toISOString().slice(12, 19));
            // Save the Queue in local storage
            saveSong(q);
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
   
    // Play the currently selected music
    async function playMusic() {
        try {
            await invoke("player_play");
            setIsPlaying(true);
        }
        catch(e) {
            console.log(e);
        }
        
    }

    async function pauseMusic() {
        try {
            await invoke("player_pause");
            setIsPlaying(false);
        }
        catch(e) {
            console.log(e);
        }
    }

    async function nextSong() {
        const qPosition: number = await invoke('player_get_current_position');
        const qLength: number  = await invoke('player_get_queue_length');
        try {
            if(repeatMode === 0 && qPosition + 1 > qLength - 1) {
                console.log("end of queue");
                await invoke("player_stop");
            }
            else {
                await invoke("player_next_song");
            }
        }
        catch(e) {
            console.log(e);
        }
        finally {
            if(repeatMode === 0 && qPosition + 1 > qLength - 1) {
                setSongProgress(0);
                pauseMusic();
            }
            else {
                const details = await invoke<Songs>('player_get_current_song');
                await invoke("update_current_song_played");
                setSongDetails(details);
                saveSong(details);
                resetSongValues(true);
                setSongLengthFormatted(new Date(details.duration * 1000).toISOString().slice(12, 19));
                await invoke('add_song_to_history', { path: details.path });
            }
            
        }
    }
    async function previousSong() {
        try {
            if(songProgress > 3) {
                seekSong(0);
            }
            else {
                await invoke("player_previous_song");
            }
        }
        catch(e) {
            console.log(e);
        }
        finally {
            const details = await invoke<Songs>('player_get_current_song');
            await invoke("update_current_song_played");
            setSongDetails(details);
            saveSong(details);
            resetSongValues(false);
            setSongLengthFormatted(new Date(details.duration * 1000).toISOString().slice(12, 19));
        }
    }

    async function resetSongValues(type: boolean) {
        try {
            const qPosition: number = await invoke('player_get_current_position');
            let qLength: number  = await invoke('player_get_queue_length');
            qLength = qLength - 1;
            // Next song
            if(type) {            
                let pos = qPosition;
                if(pos > qLength) {
                    pos = 0;
                }
                savePosition(pos);
            }
            // Previous
            else {
                let pos = qPosition;
                
                if(qPosition === 0) {
                    pos = qLength - 1;
                }
                savePosition(pos);
            }
            setSongProgress(0);
            setIsPlaying(true);
        }
        catch(e) {
            console.log(e);
        }
        finally {

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
            if(isShuffle) {
                setIsShuffle(false);
                const q: Songs[] = JSON.parse(localStorage.getItem("last-played-queue")!);
                // Index of the current song
                const index: number = q.map(e => e.path).indexOf(songDetails!.path);
                await invoke("player_update_queue_and_pos", { queue: q, index: index } );
                localStorage.setItem("shuffled-queue", JSON.stringify([]));
            }
            else {
                setIsShuffle(true);
                const shuffledQueue: Songs[] = JSON.parse(localStorage.getItem("last-played-queue")!);
                shuffle(shuffledQueue);
                // Index of the current song
                const index: number = shuffledQueue.map(e => e.path).indexOf(songDetails!.path);
                await invoke("player_update_queue_and_pos", { queue: shuffledQueue, index: index } );
                saveShuffledQueue(shuffledQueue);
            }
        }
        catch(e) {
            console.log(e);
        }
        finally {
             localStorage.setItem("shuffle-mode", JSON.stringify(!isShuffle));
        }
    }

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
            setIsPlaying(true);
        }
    }

    // Track the progress of the song (No idea if seek messes this up)
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
        const progress = new Date(songProgress * 1000).toISOString().slice(12, 19)
        if(progress === songLengthFormatted) {
            // wait 0.5s before playing next song, this is the test the song cutout issue
            setTimeout(function() {
                console.log("end of song - going to next song -> ");
                setIsPlaying(false);
                nextSong();
            }, 500);            
        }
    }, [songProgress]);


    if(isLoaded) {
        return(
            <>
                <div className="music-control-container">
                    <div className="music-progress-bar">
                        <input
                            type="range"
                            min={0}
                            step="0.01"
                            max={songDetails?.duration}
                            className="progress-bar"
                            value={songProgress}
                            onChange={(e) => { seekSong(parseInt(e.target.value)); }}
                            disabled={songDetails === undefined ? true : false}
                            onDrag={(e) => seekSong(parseInt(e.currentTarget.value))}
                        />
                    </div>

                    <div className="grid-15 music-controls">
                        {/* Current Song Details */}
                        <div className="section-5 music-details d-flex" onClick={() => setDisplayFullscreen(!displayFullscreen)} >
                            <span className="song-album-image">
                                <ImageWithFallBack image={songDetails?.cover} alt={"player album"} image_type={"player"} />
                            </span>
                            <span>
                                <div className="song-name">{songDetails?.name}</div>
                                <div className="song-album">{songDetails?.album}</div>
                                <div className="song-album">{songDetails?.artist}</div>                 
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

                                <div className="play-button" id="previous">
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

                                <div className="play-button" id="next">
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
                            <div className="d-flex">
                                {volume === 0 && <img src={VolumeEmpty} alt="" className="volume-icon"/>}
                                {(volume > 0 ) && <img src={VolumeStandard} alt="" className="volume-icon" onClick={() => updateVolume(0)}/>}

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
                    <span className="d-flex">
                        <ImageWithFallBack image={songDetails?.cover} alt="" image_type="album-larger" />
                        <div>
                            <p className="header-font font-4">{songDetails?.name}</p>
                            <p className="font-3 song-album">{songDetails?.album}</p>
                            <p className="font-2 song-album">{songDetails?.artist}</p>
                        </div>                        
                    </span>
                    <div className="vertical-centered" id="fullscreen-bg"><ImageWithFallBack image={songDetails?.cover} alt="" image_type="fullscreen" /></div>
                </div>
            </>
        );
    }
    else { return; }
}



