// Core Libraries
import { useLocation, useNavigate } from "react-router-dom";
import { error } from "@tauri-apps/plugin-log";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import SimpleBar from "simplebar-react";

// Custom Components
import ImageWithFallBack from "../../components/imageFallback";
import { SongLyrics, SongLyricsSearch, Songs } from "../../globalValues";

// Image Components
import ArrowBackIcon from '../../images/arrow-left.svg';


export default function LRCLIBSearchResults() {

    const location = useLocation();
    const navigate = useNavigate();
    const [scrollParent, setScrollParent] = useState<any>(null);

    const [song, setSong] = useState<Songs>();
    const [lyricsResults, setLyricsResults] = useState<SongLyricsSearch[]>([]);

    const [songLyrics, setSongLyrics] = useState<SongLyrics>();
    const [loading, isLoading] = useState<boolean>(true);
    const [lyricsLoading, setLyricsLoading] = useState<boolean>(true);
    const [lyricsDisplay, setLyricsDisplay] = useState({ bool: false, index: -1, instrumental: false });

    // On first load get the album details
    useEffect(() => {
        getSong();
    }, []);

    async function getSong() {
        isLoading(true);
        try {            
            const res: Songs = await invoke("get_song", {song_path: location.state.name});
            setSong(res);
            getSongLyrics();
            getSongLyricsResults(res.name, res.album_artist, res.album);
        }
        catch(e) {
            error("LRCLIB Search Results - Error Getting Song Information: " + e);
            console.log("Error Getting Song Information: " + e);
        }
        finally {
            isLoading(false);
        }
    }

    async function getSongLyrics() {
        try{
            const res: SongLyrics = await invoke("get_lyrics", {song_id: location.state.name});
            if(res !== undefined) {
                setSongLyrics(res);         
            }
        }
        catch(e) {
            setSongLyrics(undefined);
            console.log("Error Getting Song's Lyrics: " + e);
        }
        finally {
            isLoading(false);
        }
    }

    // Move this to backend soon
    async function getSongLyricsResults(name: string, artist: string, album: string) {
        try{
            setLyricsLoading(true);
            await fetch(`https://lrclib.net/api/search?artist_name=${artist}&track_name=${name}&album_name=${album}`, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Robintuk v0.3.0 Music Player",
                }
                }).then(response => response.json())
                .then(data => {
                    setLyricsResults(data);
                });
        }
        catch(e) {
            error("LRCLIB Search Results - Error Getting Song Lyrics: " + e);
            console.log("Error getting song lyrics: " + e);
        }
        finally {
            setLyricsLoading(false);
        }
    }

    async function updateSongLyrics() {
        try {
            resetLyricsDisplay();
            await invoke("update_remote_lyrics", {
                path: location.state.name,
                synced_lyrics: lyricsResults[lyricsDisplay.index].syncedLyrics,
                plain_lyrics: lyricsResults[lyricsDisplay.index].plainLyrics,
                lyrics_id: lyricsResults[lyricsDisplay.index].id
            });
        }
        catch(e) {
            error("LRCLIB Search Results - Error Updating Lyrics: " + e);
            console.log("Error updating lyrics: " + e);
        }
    }

    function handleLyricsDisplay(index: number, instrumental: boolean) {
        if(index === -1) {
            setLyricsDisplay({bool: true, index: -1, instrumental: instrumental});
        }
        else {
            setLyricsDisplay({bool: true, index: index, instrumental: instrumental});
        }
        
    }

    function resetLyricsDisplay() {
        setLyricsDisplay({bool: false, index: -1, instrumental: false});
    }


    if(loading === true) {
        return(
            <div className="d-flex vertical-centered">
                <span className="loader"/>
            </div>
        );
    }
    else if(loading === false) {
        return(
            <SimpleBar forceVisible="y" autoHide={false} ref={setScrollParent}>
                <div className="d-flex top-row justify-content-between">
                    <img src={ArrowBackIcon} className="icon icon-size" onClick={() => {navigate(-1)}}/>
                </div>
                {/* Album Details */}
                <div className="album-details d-flex">
                    <ImageWithFallBack image={song!.cover} alt={""} image_type={"album"}/>

                    <span style={{paddingLeft: "10px"}} className="grid-15">
                        <div style={{paddingBottom: "10px"}} className="section-15 header-font font-3">Song Name: <span className="misc-details">{song!.name}</span> </div>
                        <div style={{paddingBottom: "10px"}} className="section-15 header-font font-2">Album: <span className="misc-details">{song!.album}</span> </div>
                        <div style={{paddingBottom: "10px"}} className="section-15 header-font font-2">Album Artist: <span className="misc-details">{song!.album_artist}</span> </div>
                        <div style={{paddingBottom: "10px"}} className="section-15 header-font font-2">Artist: <span className="misc-details">{song!.artist}</span> </div>
                        <span className="section-15 font-0 misc-details">
                            {song!.release && <> {song!.release} &#x2022;</>}
                            {song!.duration && <> {new Date(song!.duration * 1000).toISOString().slice(11, 19)} </>}
                        </span>
                        {songLyrics !== undefined && 
                            <button 
                                onClick={() => {handleLyricsDisplay(-1, false);}} 
                                className="section-6 header-font font-1"
                                style={{width: '180px'}}
                            >Current Lyrics</button>
                        }
                    </span>                    
                </div>

                {lyricsDisplay.bool &&
                    <>
                        {lyricsDisplay.index === -1 &&
                            <LyricsPopup
                                synced_lyrics={songLyrics?.synced_lyrics}
                                plain_lyrics={songLyrics?.plain_lyrics}
                                bool={lyricsDisplay.bool}                        
                                instrumental={lyricsDisplay.instrumental}
                                resetLyricsDisplay={resetLyricsDisplay}
                                updateSongLyrics={updateSongLyrics}
                                index={-1}
                            />
                        }
                        {lyricsDisplay.index !== -1 &&
                            <LyricsPopup
                                synced_lyrics={lyricsResults[lyricsDisplay.index].syncedLyrics}
                                plain_lyrics={lyricsResults[lyricsDisplay.index].plainLyrics}
                                bool={lyricsDisplay.bool}                        
                                instrumental={lyricsDisplay.instrumental}
                                resetLyricsDisplay={resetLyricsDisplay}
                                updateSongLyrics={updateSongLyrics}
                                index={lyricsDisplay.index}
                            />
                        }
                    </>
                }

                <div>
                    {lyricsLoading &&
                        <div className="text-center lyrics-loader">
                            <div>Searching for Lyrics</div>
                            <div><span className="loader"/></div>
                        </div>
                    }

                    {!lyricsLoading && lyricsResults.length > 0 && 
                        <div className="song-list">
                            <Virtuoso 
                                totalCount={lyricsResults.length}
                                itemContent={(index) => {
                                    return(
                                        <div key={index} onClick={() => {handleLyricsDisplay(index, lyricsResults[index].instrumental);}}>
                                            <div
                                                className={`grid-20 lyrics song-row align-items-center ${lyricsDisplay.index === index? "current-song" : ""}`}
                                            >
                                                <span className="section-2 text-center">
                                                    {lyricsResults[index].syncedLyrics !== null && <div className="lyrics-synced">Synced</div>}
                                                    {lyricsResults[index].plainLyrics !== null && lyricsResults[index].syncedLyrics === null && <div className="lyrics-plain">Plain</div>}
                                                    {lyricsResults[index].instrumental && <div className="lyrics-instrumental">Instrumental</div>}
                                                </span>
                                                <span className="section-1 text-center">  </span>
                                                <span className="section-5 font-0 name ">{lyricsResults[index].name}</span>
                                                <span className="section-5 artist ">{lyricsResults[index].albumName}</span>
                                                <span className="section-6 artist">{lyricsResults[index].artistName}</span>
                                                <span className="section-1 header-font duration ">{new Date(lyricsResults[index].duration * 1000).toISOString().slice(14, 19)}</span>
                                            </div>
                                            <hr />
                                        </div>
                                    );                                
                                }}
                                customScrollParent={scrollParent ? scrollParent.contentWrapperEl : undefined}
                            />
                        </div>
                    }

                    {!lyricsLoading && lyricsResults.length === 0 && 
                        <div className="d-flex justify-content-center header-font font-4">
                            No Results
                        </div>
                    }                 
                    <div className="empty-space"/>
                </div>
            </SimpleBar>
        );
    }
}

type P = {
    synced_lyrics: string | undefined,
    plain_lyrics: string | undefined,
    instrumental: boolean,
    bool: boolean,
    resetLyricsDisplay: () => void,
    updateSongLyrics: () => void,
    index: number
}

function LyricsPopup({bool, synced_lyrics, plain_lyrics, instrumental, resetLyricsDisplay, updateSongLyrics, index}: P) {

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

                    {index !== -1 &&
                        <div style={{position: "absolute", bottom: "12px", right: "50%", transform: 'translate(50%, 0%)'}}>
                            <button className="header-font" onClick={updateSongLyrics}>
                                Save Lyrics
                            </button>
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