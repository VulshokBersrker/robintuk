import { useVirtualizer } from '@tanstack/react-virtual';
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";



import { GetCurrentSong, saveQueue, Songs } from "../../globalValues";
import PlayIcon from '../../images/play-icon-outline.svg';
import { invoke } from "@tauri-apps/api/core";



type Props = {
    song_data: any
}

export default function ListVirtualization({song_data}: Props) {

    const length = song_data.length;
    const parentRef = useRef<HTMLDivElement>(null);

    // The virtualizer
    const virtualizer = useVirtualizer({
        count: length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 35,
    });

    // const randomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    // const sentences = new Array(length).fill(true).map(() => randomNumber(20, 70));
    // const count = sentences.length;

    const items = virtualizer.getVirtualItems();

    return(
        <div>
            {/* <button onClick={() => { virtualizer.scrollToIndex(0) }} > scroll to the top </button>
            <span style={{ padding: '0 4px' }} />
            <button onClick={() => { virtualizer.scrollToIndex(count / 2) }} > scroll to the middle </button>
            <span style={{ padding: '0 4px' }} />
            <button onClick={() => { virtualizer.scrollToIndex(count - 1) }} > scroll to the end </button>
            <span style={{ padding: '0 4px' }} /> */}

            <div ref={parentRef} className="virtual-scroller" >
                <div
                    style={{ height: virtualizer.getTotalSize(),  width: '100%', position: 'relative', }}
                >
                    <div className=""
                        style={{ width: '100%', transform: `translateY(${items[0]?.start ?? 0}px)`, }}
                    >
                        {items.map((virtualRow) => (
                            <div
                                key={virtualRow.key}
                                data-index={virtualRow.index}
                                ref={virtualizer.measureElement}
                                className={`song-list`}
                            >
                                <RowComponent song={song_data[virtualRow.index]}/>
                            </div>
                        ))}
                        <div className="empty-space" />
                    </div>
                </div>
            </div>
        </div>       
    );
};

type P = {
    song: any
}

function RowComponent({song}: P) {

    async function playSong() {
        try {
            const arr: Songs[] = [song];
            // Update the music controls state somehow
            await invoke('player_load_album', {queue: arr, index: 0});
            await invoke('update_current_song_played', {path: arr[0].path});
            await invoke('get_queue', {q: arr, index: 0});
            saveQueue(arr);
        }
        catch (err) {
            alert(`Failed to play song: ${err}`);
        }
    }

    const[isCurrent, setIsCurrent] = useState<Songs>({
        id: "", name: "", path: "", cover: "", release: "", track: 0, album: "",
        artist: "", genre: "", album_artist: "", disc_number: 0,  duration: 0
    });

    useEffect(() => {
        // Load the current song (song / album / playlist) from the backend
        const unlisten_get_current_song = listen<GetCurrentSong>("get-current-song", (event) => { setIsCurrent(event.payload.q)});
        
        return () => {
            unlisten_get_current_song.then(f => f());
        }
    }, []);

    if(song.name === null || song.name === undefined) {
        return (
            <div className="" id={song}>
                {song !== "." && <h1 className="header-3">{song}</h1>}
                {song === "." && <h1 className="header-3">...</h1>}
            </div>
        );
    }
    else {
        return (
            <div className="flex items-center justify-between">
                <div className="song-link">
                    <div className={`grid-20 song-row ${song.id.localeCompare(isCurrent.id) ? "" : "current-song"}`}>
                        
                        <span className="section-1 vertical-centered play ">
                            <span style={{paddingRight: '3px', paddingLeft: "3px"}}>
                                <input type="checkbox" id="vehicle1" name="vehicle1" value="Bike" onChange={() => {}} />
                            </span>
                            <img src={PlayIcon} onClick={playSong}/>
                        </span>
                        
                        <span className="section-6 vertical-centered font-0 name line-clamp-1">{song.name}</span>
                        <span className="section-4 vertical-centered font-0 artist line-clamp-1">{song.album}</span>
                        <span className="section-4 vertical-centered font-0 artist line-clamp-1">{song.artist}</span>
                        <span className="section-2 vertical-centered font-0 artist line-clamp-1">{song.release}</span>
                        <span className="section-2 vertical-centered font-0 artist line-clamp-1">{song.genre}</span>
                        <span className="section-1 header-font vertical-centered duration">{new Date(song.duration * 1000).toISOString().slice(14, 19)}</span>
                    </div>
                    <hr />
                </div>
            </div>
        );
    }   
}