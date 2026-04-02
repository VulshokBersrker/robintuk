// Core Libraries
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from "react";
import SimpleBar from 'simplebar-react';


import { SongLyrics, Songs } from '../globalValues';
import ImageWithFallBack from './imageFallback';


type Props = {
    song_path: String,
    bool: boolean,
    updateSongDetailsDisplay: (bool: boolean, path: string) => void
}

export default function SongDetailsModal({song_path, bool, updateSongDetailsDisplay}: Props) {

    const [songDetails, setSongDetails] = useState<Songs>();

    // Song Lyric Values
    const [hasLyrics, setHasLyrics] = useState<boolean>(false);
    const [songLyrics, setSongLyrics] = useState({plain_lyrics: "", synced_lyrics: ""});
    const [lyricsDisplay, setLyricsDisplay] = useState<boolean>(false);

    // Get the list of directories on load
    useEffect(() => {
        async function getSong() {
            try {
                const res: Songs = await invoke<Songs>("get_song", { song_path: song_path });
                setSongDetails(res);

                const lyrics_res: SongLyrics = await invoke("get_lyrics", {song_id: song_path});
                if(lyrics_res !== undefined) {
                    setHasLyrics(true);
                    setSongLyrics({plain_lyrics: lyrics_res.plain_lyrics, synced_lyrics: lyrics_res.synced_lyrics});
                }
                else {
                    setHasLyrics(false);
                }
            }
            catch(e) {
                console.log(e)
            }
        }
        getSong();
    }, []);

    function resetLyricsDisplay() {
        setLyricsDisplay(false);
    }

    if(bool === true && songDetails !== undefined) {
        return(
            <div className="song-details-modal">
                {lyricsDisplay &&
                    <LyricsPopup
                        synced_lyrics={songLyrics?.synced_lyrics}
                        plain_lyrics={songLyrics?.plain_lyrics}
                        bool={lyricsDisplay}
                        instrumental={false}
                        resetLyricsDisplay={resetLyricsDisplay}
                    />
                    
                }
                <div className="container grid-20">
                    <div className="header-font font-2 section-20">Song Info</div>

                    <div className="section-7" style={{gridColumnStart: "1", gridRowStart: "2", gridRowEnd: "6"}}>
                        <ImageWithFallBack image={songDetails.cover}  image_type="artist" alt=""/>
                    </div>

                    <div className="section-11" style={{gridColumnStart: "10", gridRowStart: "2"}}>
                        <div className="font-0 sub-font">Title</div>
                        <div className="font-1 line-clamp-2">{songDetails.name}</div>
                    </div>

                    <div className="section-11" style={{gridColumnStart: "10", gridRowStart: "3"}}>
                        <div className="font-0 sub-font">Artist</div>
                        <div className="font-1 line-clamp-2">{songDetails.artist}</div>
                    </div>

                    <div className="section-11" style={{gridColumnStart: "10", gridRowStart: "4"}}>
                        <div className="font-0 sub-font">Album</div>
                        <div className="font-1 line-clamp-2">{songDetails.album}</div>
                    </div>

                    <div className="section-11" style={{gridColumnStart: "10", gridRowStart: "5"}}>
                        <div className="font-0 sub-font">Album Artist</div>
                        <div className="font-1 line-clamp-2">{songDetails.album_artist}</div>
                    </div>

                    <div className="section-9">
                        <div className="font-0 sub-font">Genre</div>
                        <div className="font-1">{songDetails.genre}</div>
                    </div>

                    <div className="section-10">
                        <div className="font-0 sub-font">Year</div>
                        <div className="font-1">{songDetails.release}</div>
                    </div>

                    <div className="section-9">
                        <div className="font-0 sub-font">Track</div>
                        <div className="font-1">{songDetails.track}</div>
                    </div>

                    <div className="section-10">
                        <div className="font-0 sub-font">Duration</div>
                        <div className="font-1">{new Date(songDetails.duration * 1000).toISOString().slice(14, 19)}</div>
                    </div>

                    <div className="section-9">
                        <div className="font-0 sub-font">Disc Number</div>
                        <div className="font-1">{songDetails.disc_number}</div>
                    </div>

                    <div className="section-11">
                        <div className="font-0 sub-font">Song Path</div>
                        <div className="font-1 line-clamp-3">{songDetails.path}</div>
                    </div>

                    {hasLyrics &&
                        <div className="section-12">
                            <button className="font-0 sub-font header-font" onClick={() => {setLyricsDisplay(true)}}>View Lyrics</button>
                        </div>
                    }

                    <div style={{position: "absolute", top: "12px", right: "20px"}}>
                        <button className="header-font close" onClick={() => updateSongDetailsDisplay(false, "")}>
                            Close
                        </button>
                    </div>
                </div>                
            </div>
        );
    }
}


type P = {
    synced_lyrics: string | undefined,
    plain_lyrics: string | undefined,
    instrumental: boolean,
    bool: boolean,
    resetLyricsDisplay: () => void
}

function LyricsPopup({bool, synced_lyrics, plain_lyrics, instrumental, resetLyricsDisplay}: P) {

    const [display, setDisplay] = useState<boolean>(false);

    const [syncedArray, setSyncedArray] = useState<string[]>([]);
    const [plainArray, setPlainArray] = useState<string[]>([]);

    useEffect(() => {
        if(plain_lyrics !== 'null') {
            
            let spilt_plain: string[] = [];
            let split_synced: string[] = [];

            if(plain_lyrics !== null && plain_lyrics !== undefined && synced_lyrics !== undefined) {
                if(plain_lyrics.includes("\\r\\n")) {
                    spilt_plain = plain_lyrics.split("\\r\\n");
                }
                else if(plain_lyrics.includes("\r\n")) {
                    spilt_plain = plain_lyrics.split("\r\n");
                }
                else if(plain_lyrics.includes("\\n")) {
                    spilt_plain =plain_lyrics.split("\\n");
                }
                else if(plain_lyrics.includes("\n")) {
                    spilt_plain = plain_lyrics.split("\n");
                }

                if(synced_lyrics !== null) {
                    if(plain_lyrics.includes("\\r\\n")) {
                        split_synced = synced_lyrics.split("\\r\\n");
                    }
                    else if(plain_lyrics.includes("\r\n")) {
                        split_synced = synced_lyrics.split("\r\n");
                    }
                    else if(plain_lyrics.includes("\\n")) {
                        split_synced = synced_lyrics.split("\\n");
                    }
                    else if(plain_lyrics.includes("\n")) {
                        split_synced = synced_lyrics.split("\n");
                    }
                }

                if(spilt_plain.length >= 0) {
                    if(synced_lyrics === "null") {
                        setSyncedArray([]);
                        setPlainArray(spilt_plain);
                    }
                    else {
                        setPlainArray(spilt_plain);
                        setSyncedArray(split_synced);
                    }
                }
            }
        }    
    }, [bool]);

    if(bool === true) {
        return(
            <div className="song-details-modal lyrics">
                <div className="container">
                    <div className="header-font font-2 ">Song Lyrics</div>

                    <div className="header">
                        <div className="text-center d-flex justify-content-center">
                            <div className={`title ${display ? "" : "active"}`} onClick={() => setDisplay(false)}>Plain Lyrics</div>
                            <div className={`title ${display ? "active" : ""}`} onClick={() => setDisplay(true)}>Synced Lyrics</div>
                        </div>
                    </div>

                    {!instrumental &&
                        <>
                            {!display &&
                                <SimpleBar forceVisible="y" autoHide={false}>
                                    {plainArray.map((item, index)=> {
                                        return(
                                            <div key={`plain-${index}`}> {item} </div>
                                        );
                                    })}
                                    {syncedArray.length === 0 && <>No Lyrics</>}
                                </SimpleBar>
                            }
                            {display &&
                                <SimpleBar forceVisible="y" autoHide={false}>
                                    {syncedArray.map((item, index) => {
                                        return(
                                            <div key={`sync-${index}`}> {item} </div>
                                        );
                                    })}
                                    {syncedArray.length === 0 && <>No Synced Lyrics</>}
                                </SimpleBar>
                            }                        
                        </>
                    }

                    {instrumental &&
                        <div className="text-center header-font header-2">
                            This song is instrumental                        
                        </div>
                    }

                    <div style={{position: "absolute", top: "12px", right: "20px"}}>
                        <button className="header-font close" onClick={resetLyricsDisplay}>
                            Close
                        </button>
                    </div>
                </div>                
            </div>
        );
    }
}