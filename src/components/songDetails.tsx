// Core Libraries
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from "react";

import ImageWithFallBack from './imageFallback';
import { Songs } from '../globalValues';

type Props = {
    song_path: String,
    bool: boolean,
    updateSongDetailsDisplay: (bool: boolean, path: string) => void
}

export default function SongDetailsModal({song_path, bool, updateSongDetailsDisplay}: Props) {

    const [songDetails, setSongDetails] = useState<Songs>();

    // Get the list of directories on load
    useEffect(() => {
        async function getSong() {
            try {
                const res: Songs = await invoke<Songs>("get_song", { song_path: song_path });
                setSongDetails(res);
            }
            catch(e) {
                console.log(e)
            }
        }
        getSong();
    }, []);

    if(bool === true && songDetails !== undefined) {
        return(
            <div className="song-details-modal">
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