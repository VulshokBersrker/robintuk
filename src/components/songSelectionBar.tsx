// Core Libraries
import { useState } from "react";
import SimpleBar from "simplebar-react";
import './selectionBar.css';

// Custom Components
import { PlaylistList, Songs } from "../globalValues";

// Images
import DeselectIcon from '../images/circle-xmark-regular-full.svg';
import QueueIcon from '../images/rectangle-list-regular-full.svg';
import PlayIcon from '../images/play-solid-full.svg';
import AddIcon from '../images/plus-solid-full.svg';
import CloseIcon from '../images/x.svg';

type Props = {
    selectionBarType: number,
    songSelection: Songs[],
    play: () => void,
    addToQueue: () => void,
    updateNewPlaylistName: (name: string) => void,
    addSelectedToPlaylist: (id: number) => void,
    createSelectedPlaylist: (name: string) => void,
    clearSelection: () => void,
    removeSelectedSongs: () => void,
    playlistList: PlaylistList[],
    currentPlaylistID: number
}

export default function SongSelectionBar({
    selectionBarType, songSelection, addToQueue,
    play, addSelectedToPlaylist, createSelectedPlaylist, clearSelection, removeSelectedSongs,
    // Playlist Values
    currentPlaylistID, playlistList
}: Props) {

    const [newPlaylistName, setNewPlaylistName] = useState<string>("");
    const [displayAddToMenu, setDisplayAddToMenu] = useState<boolean>(false);

    // Playlist - Queue Bar
    if(selectionBarType === 0 || selectionBarType === 1) {
        return(
            <div className={`selection-popup-container grid-20 header-font ${songSelection.length >= 1 ? "open" : "closed"}`}>
                <div className={`font-0 ${selectionBarType === 0? "section-10" : "section-6"}`} style={{marginLeft: "8px"}}>
                    {songSelection.length} song{songSelection.length > 1 && <>s</>} selected
                </div>
                
                {selectionBarType === 1 && 
                    <div className="section-4 position-relative">
                        <button className="d-flex align-items-center" onClick={() => { setDisplayAddToMenu(false); play(); }}>
                            <img src={PlayIcon} />
                            &nbsp;Play
                        </button>
                    </div>
                }

                <div className="section-4 position-relative">
                    <button className="d-flex align-items-center" onClick={() => setDisplayAddToMenu(!displayAddToMenu)}>
                        <img src={AddIcon} />
                        &nbsp;Add
                    </button>

                    {displayAddToMenu &&
                        <div className="playlist-list-container header-font">
                            {selectionBarType === 1 && <div className="item d-flex align-items-center" onClick={addToQueue}>
                                <img src={QueueIcon} className="icon-size"/> &nbsp;Queue
                            </div>}
                            <hr/>
                            <span className="playlist-input-container d-flex justify-content-center align-items-center">
                                <input
                                    id="new_playlist_input" type="text" autoComplete="off" placeholder="New Playlist"
                                    className="new-playlist" value={newPlaylistName}
                                    onChange={(e) => setNewPlaylistName(e.target.value)}
                                />
                                <span><button onClick={() => {setDisplayAddToMenu(false); createSelectedPlaylist(newPlaylistName)}}>Create</button></span>
                            </span>
                            
                            <SimpleBar forceVisible="y" autoHide={false} clickOnTrack={false} className="add-playlist-container">
                                {playlistList?.map((playlist) => {
                                    if(playlist.id !== currentPlaylistID) {
                                        return(
                                            <div className="item" key={playlist.name} onClick={() => {setDisplayAddToMenu(false); addSelectedToPlaylist(playlist.id);}}>
                                                {playlist.name}
                                            </div>
                                        );
                                    }                                            
                                })}
                            </SimpleBar>
                        </div>
                    }
                </div>
                <div className="section-4 position-relative">
                    <button className="d-flex align-items-center" onClick={() => {setDisplayAddToMenu(false); removeSelectedSongs();}}>
                        <img src={DeselectIcon} />
                        &nbsp;Remove
                    </button>
                </div>
                
                <span className="section-2 clear-selection" onClick={() => {setDisplayAddToMenu(false); clearSelection();}}> <img src={CloseIcon} /></span>
            </div>  
        );
    }
    // Album Bar
    else if(selectionBarType === 2) {
        return(
            <div className={`selection-popup-container grid-20 header-font ${songSelection.length >= 1 ? "open" : "closed"}`}>
                <div className="section-6 font-0 border" style={{marginLeft: "8px"}}>{songSelection.length} item{songSelection.length > 1 && <>s</>} selected</div>
                <div className="section-4 position-relative border">
                    <button className="d-flex align-items-center" onClick={() => { play(); }}>
                        <img src={PlayIcon} />
                        &nbsp;Play
                    </button>
                </div>
                <div className="section-4 position-relative border">
                    <button className="d-flex align-items-center" onClick={() => setDisplayAddToMenu(!displayAddToMenu)}>
                        <img src={AddIcon} />
                        &nbsp;Add
                    </button>

                    {displayAddToMenu &&
                        <div className="playlist-list-container header-font">
                            <div className="item d-flex align-items-center" onClick={addToQueue}>
                                <img src={QueueIcon} className="icon-size"/> &nbsp;Queue
                            </div>
                            <hr/>
                            <span className="playlist-input-container d-flex justify-content-center align-items-center">
                                <input
                                    id="new_playlist_input" type="text" autoComplete="off" placeholder="New Playlist"
                                    className="new-playlist" value={newPlaylistName}
                                    onChange={(e) => setNewPlaylistName(e.target.value)}
                                />
                                <span><button onClick={() => {createSelectedPlaylist(newPlaylistName)}}>Create</button></span>
                            </span>
                            
                            <SimpleBar forceVisible="y" autoHide={false} clickOnTrack={false} className="add-playlist-container">
                                {playlistList?.map((playlist) => {
                                    if(playlist.id !== currentPlaylistID) {
                                        return(
                                            <div className="item" key={playlist.name} onClick={() => addSelectedToPlaylist(playlist.id)}>
                                                {playlist.name}
                                            </div>
                                        );
                                    }                                            
                                })}
                            </SimpleBar>
                        </div>
                    }
                </div>
                
                <span className="section-2 clear-selection border" onClick={clearSelection}> <img src={CloseIcon} /></span>
            </div>  
        );
    }
}