import { HashLink } from 'react-router-hash-link';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from "react";

// Custom Components
import { saveQueue, Songs, savePosition, AlbumRes, PlaylistList, playSelection } from "../globalValues";
import ImageWithFallBack from "../components/imageFallback.js";

// Images
import QueueIcon from '../images/rectangle-list-regular-full.svg';
import SelectIcon from '../images/circle-check-regular-full.svg';
import AlbumIcon from '../images/vinyl-record-svgrepo-com.svg';
import ArtistIcon from '../images/user-regular-full.svg';
import PlayIcon from '../images/play-solid-full.svg';
import AddIcon from '../images/plus-solid-full.svg';
import SearchIcon from '../images/search_icon.svg';
import Circle from '../images/circle.svg';
import CloseIcon from '../images/x.svg';


// Need to add filtering, should be easy because all the data is there
// Begin work on caching data

// List virtualization might be good for these lists

interface CheckBoxSelection {
    section: boolean[]
}

export default function AlbumPage() {

    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [albumList, setAlbumList] = useState<AlbumRes[]>([]);
    const [searchValue, setSearchValue] = useState<string>("");

    const [filteredAlbums, setFilteredAlbums] = useState<AlbumRes[]>([]);

    const [albumSelection, setAlbumSelection] = useState<String[]>([]);
    const [checkBoxNumber, setCheckBoxNumber] = useState<CheckBoxSelection[]>([]);
    const [contextMenu, setContextMenu] = useState({ isToggled: false, isBeingAdded: true, context_type: "album", album: "", artist: "", index: 0, outer_index: 0, posX: 0, posY: 0 });

    // Playlist Values
    const [newPlaylistName, setNewPlaylistName] = useState<string>("");
    const [displayAddToMenu, setDisplayAddToMenu] = useState<boolean>(false);
    const [playlistList, setPlaylistList] = useState<PlaylistList[]>([]);


    async function getAlbums() {
        try {
            setLoading(true);
            const list = await invoke<AlbumRes[]>('get_all_albums');
            console.log(list);
            setAlbumList(list);
            setFilteredAlbums(list);

            let checkboxArr: CheckBoxSelection[] = [];
            let i = 0;
            for(let j = 0; j < list.length; j++) {
                let temp: boolean[] = [];
                list[j].section.forEach(() => { temp[i] = false; i++; });
                i = 0;
                checkboxArr.push({section: temp});
            }
            setCheckBoxNumber(checkboxArr);
            
        }
        catch (err) {
            alert(`Failed to scan folder: ${err}`);
        }
        finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        getAlbums();

        const handler = () => {
            if(!contextMenu.isToggled) {
                resetContextMenu();
            }
        }
        document.addEventListener('click', handler);
        
        return () => {
            document.removeEventListener('click', handler);
        }
    }, []);

    const navigateToAlbumOverview = (name: string) => {
        navigate("/albums/overview", {state: {name: name}});
    }

    async function playAlbum(album_name: string) {
        try {
            const albumRes: Songs[] = await invoke('get_album', { name: album_name });
            // console.log(albumRes);
            // Load the music to be played and saved
            await invoke('player_load_album', {queue: albumRes, index: 0});
            await invoke('update_current_song_played');
            saveQueue(albumRes);
            savePosition(0);
            await invoke('create_queue', { songs: albumRes });
        }
        catch(e) {
            console.log(e);
        }
        finally {
            resetContextMenu();
        }
    }

    function updateSearchResults(value: string) {
        setSearchValue(value);
        let temp: AlbumRes[] = [];
        for(let i = 0; i < albumList.length; i++) {            
            const temp_section = albumList[i].section.filter((entry) => {
                return entry.album.toLowerCase().includes(value.toLowerCase());
            });
            temp.push({ name: albumList[i].name, section: temp_section });
        }
        setFilteredAlbums(temp);
    }

    function handleContextMenu(e: any, album: string, artist: string, index: number, outer_index: number) {
        if(e.pageX < window.innerWidth / 2) {
            setContextMenu({ isToggled: true, isBeingAdded: checkBoxNumber[outer_index].section[index], context_type: "album", album: album, artist: artist, index: index, posX: e.pageX, posY: e.pageY, outer_index: outer_index});
        }
        else {
            setContextMenu({ isToggled: true, isBeingAdded: checkBoxNumber[outer_index].section[index], context_type: "album", album: album, artist: artist, index: index, posX: e.pageX - 150, posY: e.pageY, outer_index: outer_index});
        }
    }

    function resetContextMenu() {
        console.log("Resetting Context Menu");
        setContextMenu({ isToggled: false, isBeingAdded: false, context_type: "album", album: "", artist: "", index: 0, outer_index: 0, posX: 0, posY: 0});
    }

    // ------------ Start of Selection Bar Functions ------------
    
    function editSelection(album: String, isBeingAdded: boolean, index: number, outer_index: number) {
        // If we are adding to the array of selected songs
        if(isBeingAdded === true) {
            // Append to the array
            setAlbumSelection([...albumSelection, album]);
            let tempArr: CheckBoxSelection[] = checkBoxNumber;
            tempArr[outer_index].section[index] = true;
            setCheckBoxNumber(tempArr);

        }
        // If we are removing a song from the array
        else {
            // Find the location of the song in the array with filter and only return the other songs
            setAlbumSelection(albumSelection.filter(item => item !== album));
            let tempArr: CheckBoxSelection[] = checkBoxNumber;
            tempArr[outer_index].section[index] = false;
            setCheckBoxNumber(tempArr);;
        }
        resetContextMenu();
    }

    function clearSelection() {
        setAlbumSelection([]);
        let tempArr: CheckBoxSelection[] = [];
        for(let j = 0; j < checkBoxNumber.length; j++) {
            let temp: boolean[] = [];
            for(let i = 0; i < checkBoxNumber[j].section.length; i++) {
                temp[i] = false;
            }
            tempArr.push({section: temp});
        }
        setCheckBoxNumber(tempArr);
    }

    // ------------ End of Selection Bar Functions ------------

    // ------------ Selection Bar Functions ------------
    useEffect(() => {
        const fetchData = async() => {
            const list: PlaylistList[] | undefined = await getAllPlaylists();
            if(list !== undefined) {
                setPlaylistList(list);
            }
        }
        fetchData();        
    }, []);

    async function addToQueue() {
        try {
            const q = localStorage.getItem("last-played-queue")
            if(q !== null) {
                const oldQ = JSON.parse(q);

                await invoke('player_add_to_queue', {queue: albumSelection});
                const newQ = [...oldQ, albumSelection];
                localStorage.setItem("last-played-queue", JSON.stringify(newQ) );
            }
            
        }
        catch(e) {
            console.log(e);
        }
        finally {
            const test = await invoke('player_get_queue');
            console.log(test)
            clearSelection();
        }
    }
    
    async function addToPlaylist(name: string) {
        try {
            await invoke('add_to_playlist', {songs: albumSelection, playlist_name: name});
        }
        catch(e) {
            console.log(e);
        }
        finally {
            setDisplayAddToMenu(false);
            clearSelection();
        }
    }

    async function createPlaylist(name: string) {
        try {
            await invoke('create_playlist', {name: name});
            await invoke('add_to_playlist', {songs: albumSelection, playlist_name: name});
            await invoke('new_playlist_added');
        }
        catch(e) {
            console.log(e);
        }
        finally {
            setDisplayAddToMenu(false);
            clearSelection();
        }
    }

    async function getAllPlaylists() {
        try {
            const playlists: PlaylistList[] = await invoke('get_all_playlists');
            if(playlists.length !== 0) {
                return playlists;
            }
            else {
                return [];
            }            
        }
        catch(e) {
            console.log(e);
        }
    }

    async function playSelectedAlbums() {
        try {
            let albums_songs_arr: Songs[] = [];
            for(let i = 0; i < albumSelection.length; i++) {
                const temp_arr: Songs[] = await invoke<Songs[]>("get_album", { name: albumSelection[i] });
                albums_songs_arr = albums_songs_arr.concat(temp_arr);
            }
            playSelection(albums_songs_arr);
        }
        catch(e) {
            console.log(e);
        }
        finally {
            clearSelection();
        }        
    }

    if(loading) {
        return(
            <div>
                <div className="search-filters d-flex justify-content-end vertical-centered">

                    <span className="search-bar">
                        <img src={SearchIcon} className="bi search-icon icon-size"/>
                        <input
                            type="text" placeholder="Search Albums" id="search_albums"
                            value={searchValue}
                            onChange={(e) => updateSearchResults(e.target.value)}
                        />
                    </span>
                </div>

                <div className="d-flex flex-wrap">
                    {[...Array(70)].map((_entry, i: number) => {
                        return(
                            <div key={`place-${i}`} className="album-link placeholder" id={`place-${i}`}>
                                <div className="album-image-container placeholder">                                                
                                    <div className="album-image placeholder">
                                        {/* <div className="activity"/> */}
                                    </div>
                                    <div className="album-image-name header-font">
                                    <div className="album-name"></div>
                                    <div className="artist-name"></div>
                                </div>
                                </div>
                            </div>
                        );
                    })}                
                </div>
            </div>
        );
    }
    else {
        return(
            <div>
                {/* Song Selection Bar */}
                <div className={`selection-popup-container grid-20 header-font ${albumSelection.length >= 1 ? "open" : "closed"}`}>
                    <div className="section-8">{albumSelection.length} item{albumSelection.length > 1 && <>s</>} selected</div>
                    <div className="section-4 position-relative">
                        <button className="d-flex align-items-center" onClick={playSelectedAlbums}>
                            <img src={PlayIcon} />
                            &nbsp;Play
                        </button>
                    </div>
                    <div className="section-6 position-relative">
                        <button className="d-flex align-items-center" onClick={() => setDisplayAddToMenu(!displayAddToMenu)}>
                            <img src={AddIcon} />
                             &nbsp;Add to
                        </button>

                        {displayAddToMenu &&
                            <div className="playlist-list-container header-font">
                                <div className="d-flex align-items-center" onClick={addToQueue}>
                                    <img src={QueueIcon} className="icon-size"/>
                                    &nbsp;Queue
                                </div>
                                <hr/>
                                <span className="playlist-input-container d-flex justify-content-center align-items-center">
                                    <input
                                        id="new_playlist_input" type="text" placeholder="New Playlist"
                                        className="new-playlist" value={newPlaylistName}
                                        onChange={(e) => setNewPlaylistName(e.target.value)}
                                    />
                                    <span><button onClick={() => {createPlaylist(newPlaylistName)}}>Create</button></span>
                                </span>
                                
                                {playlistList?.map((playlist) => {
                                    return(
                                        <div key={playlist.name} onClick={() => addToPlaylist(playlist.name)}>
                                            {playlist.name}
                                        </div>
                                    );
                                })}
                            </div>
                        }
                    </div>
                    <span className="section-2" onClick={clearSelection}> <img src={CloseIcon} /></span>
                </div>                    
                {/* End of Song Selection Bar */}


                <div className="search-filters d-flex justify-content-end vertical-centered"> 

                    <span className="search-bar">
                        <img src={SearchIcon} className="bi search-icon icon-size"/>
                        <input
                            type="text" placeholder="Search Albums" id="search_albums"
                            value={searchValue}
                            onChange={(e) => updateSearchResults(e.target.value)}
                        />
                    </span>
                </div>

                <div className="section-list">
                    {albumList.map(section => {
                        if(section.section.length !== 0) {
                            return(
                                <HashLink to={`/albums#${section.name}-0`} smooth key={`main-${section.name}`}>
                                    <div key={`main-${section.name}`}>
                                        {section.name}
                                    </div>
                                </HashLink>                                
                            );
                        }                    
                    })}
                </div>

                <div className="d-flex flex-wrap">
                    {filteredAlbums.length === 0 && <div> No Albums</div>}
                    {filteredAlbums.map((part, j) => {
                        if(part.section.length > 0) {
                            return(
                                part.section.map((entry, i) => {
                                    return(
                                        <div key={`${part.name}-${i}`} className="album-link" id={`${part.name}-${i}`} >
                                            <div className="album-image-container"
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    handleContextMenu(e, entry.album, entry.album_artist, i, j);
                                                }}
                                            >
                                                <span className="checkbox-container">
                                                    <input
                                                        type="checkbox" id={`select-${i}`} name={`select-${i}`}
                                                        onClick={(e) => editSelection(entry.album, e.currentTarget.checked, i, j)}
                                                        checked={checkBoxNumber[j].section[i]} onChange={() => {}}
                                                    />
                                                </span>
                                                <div className="play-album" onClick={() => playAlbum(entry.album)}>
                                                    <img src={PlayIcon} alt="play icon" className="play-pause-icon" />
                                                    <img src={Circle} className="circle"/>
                                                </div>
                                                
                                                <div className="container" onClick={() => navigateToAlbumOverview(entry.album)} >
                                                    <ImageWithFallBack image={entry.cover} alt={entry.album} image_type={"album"} />
                                                </div>
                                                <div className="album-image-name header-font">
                                                    <div className="album-name">{entry.album}</div>
                                                    <div className="artist-name">{entry.album_artist}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );                                        
                                })
                            );
                        }            
                    })}                 
                </div>
                <ContextMenuAlbums
                    isToggled={contextMenu.isToggled}
                    context_type={contextMenu.context_type}
                    album={contextMenu.album}
                    artist={contextMenu.artist}
                    index={contextMenu.index}
                    outer_index={contextMenu.outer_index}
                    posX={contextMenu.posX}
                    posY={contextMenu.posY}
                    play={playAlbum}
                    editSelection={editSelection}
                    isBeingAdded={contextMenu.isBeingAdded}
                />
            </div>
        );
    }    
}

type Props = {
    isToggled: boolean,
    context_type: string, // Album / Song / Artist / Playlist / Playlist Songs
    album: string,
    artist: string,
    index: number,
    outer_index: number,
    play: (album_name: string) => void, // playSong / playAlbum function
    editSelection: (album: string, isBeingAdded: boolean, index: number, outer_index: number) => void,
    isBeingAdded: boolean,
    posX: number,
    posY: number
}

function ContextMenuAlbums({ isToggled, context_type, album, artist, index, play, editSelection, isBeingAdded, posX, posY, outer_index }: Props) {

    const navigate = useNavigate();

    function NavigateToAlbum() {
        navigate("/albums/overview", {state: {name: album}});
    }
    function NavigateToArtist() {
        navigate("/artists/overview", {state: {name: artist}});
    }

    useEffect(() => {
        const element = document.getElementsByClassName("content");
        if(isToggled) {
            element[0].classList.add("disable-scroll");
        }
        else {
            element[0].classList.remove("disable-scroll");
        }
    }, [isToggled]);

    if(isToggled) {
        return(
            <div 
                className="context-menu-container header-font font-1"
                style={{ position: "fixed", left: `${posX}px`, top: `${posY}px`}}
                onContextMenu={(e) => {  e.preventDefault(); }}
            >
                <li className="d-flex align-items-center"
                    onClick={() => editSelection(album, !isBeingAdded, index, outer_index) }
                >
                    <img src={SelectIcon} />
                    &nbsp; Select
                </li>

                <li onClick={() => {play(album)}} className="d-flex align-items-center">
                    <img src={PlayIcon} />
                    &nbsp; Play
                </li>

                <li className="d-flex align-items-center">
                    <img src={AddIcon} />
                    &nbsp; Add to
                </li>

                {context_type !== "playlist" && 
                    <li  className="d-flex align-items-center" onClick={NavigateToAlbum} >
                        <img src={AlbumIcon} />
                        &nbsp; Show Album
                    </li>
                }
                {context_type !== "artist" && 
                    <li  className="d-flex align-items-center" onClick={NavigateToArtist} >
                        <img src={ArtistIcon} />
                        &nbsp; Show Artist
                    </li>
                }

                
            </div>
        );
    }
    else { return; }
}
