import { useRef } from "react";

import { useVirtualizer } from '@tanstack/react-virtual'

// import { Songs } from "../../globalValues";

import PlayIcon from '../../images/play-icon-outline.svg';
import { invoke } from "@tauri-apps/api/core";
import { saveQueue, Songs } from "../../globalValues";

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
                    style={{
                        height: virtualizer.getTotalSize(),
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    <div className=""
                        style={{
                            width: '100%',
                            transform: `translateY(${items[0]?.start ?? 0}px)`,
                        }}
                    >
                        {items.map((virtualRow) => (
                            <div
                                key={virtualRow.key} data-index={virtualRow.index} ref={virtualizer.measureElement}
                                className={`song-list`}
                            >
                                
                                <RowComponent song={song_data[virtualRow.index]}/>
                                {/* <div>Row {virtualRow.index} - {song_data[virtualRow.index].name}</div> */}
                                
                            </div>
                        ))}
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
    // console.log(song);

    async function playSong() {
        try {
            const arr: Songs[] = [song];
            // Update the music controls state somehow
            await invoke('player_load_album', {queue: arr, index: 0});
            await invoke('update_current_song_played', {path: arr[0].path});
            await invoke('get_queue', {q: arr, index: 0});
            saveQueue(arr, 0);
        }
        catch (err) {
            alert(`Failed to play song: ${err}`);
        }
    }

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
                    <div className="grid-20 song-row">
                        
                        <span className="section-1 vertical-centered play ">
                            <span style={{paddingRight: '3px', paddingLeft: "3px"}}>
                                <input type="checkbox" id="vehicle1" name="vehicle1" value="Bike" />
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


//  <button 
//                 style={{marginBottom: '5px'}}
//                 onClick={() => {
//                     virtuosoRef.current?.scrollToIndex({index: Math.random() * song_data.length, align: "start"})
//                 }}
//             >
//                 scroll
//             </button>
//             <GroupedVirtuoso 
//                 className="virtual-scroller"
//                 ref={virtuosoRef}
//                 groupCounts={groupCounts}
//                 groupContent={(index) => {
//                     return(
//                         // add background to the element to avoid seeing the items below it
//                         <h1 style={{position: "relative"}} className="header-3">
//                             {song_data[index].name} - {groupCounts[index]}
//                             {/* {song_data[index].name !== "." && <h1 className="header-3">{song_data[index].name}</h1>} */}
//                             {/* {song_data[index].name === "." && <h1 className="header-3">...</h1>} */}
                            
//                         </h1>
//                     );
//                 }}
//                 itemContent={(index, groupIndex) => {
//                     return(
//                         <div>
//                             {groupIndex}.{index}
//                             {/* {song_data[groupIndex].song_list[index].name} */}
//                             {/* <RowComponent song={song_data[groupIndex].song_list[index]}/> */}
//                         </div>
//                     );
//                 }}
//                 style={{ height: '91vh', position: "relative" }}
//             /> 