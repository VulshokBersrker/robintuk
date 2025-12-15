import { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { VirtuosoGrid } from 'react-virtuoso';
import SimpleBar from 'simplebar-react';
import { forwardRef } from 'react';

// Custom Components
import { saveQueue, Songs, savePosition, PlaylistList, playSelection, AlbumDetails, alphabeticallyOrdered } from "../globalValues";
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

// AT THE MOMENT ---- THE SECTION BUTTONS ON THE SIDE DO NOT WORK
// ALSO NEED TO ADD SCROLL RESTORATION AT SOME POINT

type P = {
    albums: AlbumDetails[];
}

export default function AlbumPage({albums}: P) {

    const navigate = useNavigate();

    // Used to add SimpleBar to React Virtuoso
    const [scrollParent, setScrollParent] = useState<any>(null);
    const virtuoso = useRef<any>(null);

    const [loading, setLoading] = useState(true);
    const [albumList, setAlbumList] = useState<AlbumDetails[]>(albums);
    const [searchValue, setSearchValue] = useState<string>("");

    const [filteredAlbums, setFilteredAlbums] = useState<AlbumDetails[]>(albums);
    const [albumSections, setAlbumSections] = useState<number[]>([]);    

    const [albumSelection, setAlbumSelection] = useState<String[]>([]);
    const [checkBoxNumber, setCheckBoxNumber] = useState<boolean[]>([]);
    const [contextMenu, setContextMenu] = useState({ isToggled: false, isBeingAdded: true, album: "", artist: "", index: 0, posX: 0, posY: 0 });

    // Playlist Values
    const [newPlaylistName, setNewPlaylistName] = useState<string>("");
    const [displayAddToMenu, setDisplayAddToMenu] = useState<boolean>(false);
    const [playlistList, setPlaylistList] = useState<PlaylistList[]>([]);

    useEffect(() => {
        function setupAlbumList() {
            
            setLoading(true);
            setCheckBoxNumber(Array(albumList.length).fill(false));

            let tempSectionArray: number[] = [];
            const maxSection = alphabeticallyOrdered.indexOf( Math.max.apply(Math, albumList.map((o: AlbumDetails) => { return o.album_section})) );
            console.log(maxSection);

            for(let i = 0; i < maxSection; i++) {
                const results = albumList.filter(obj => obj.album_section === alphabeticallyOrdered[i] ).length;
                tempSectionArray[i] = results;
            }
            setAlbumSections(tempSectionArray);
            
            setLoading(false);
        }
        setupAlbumList();
        // getAlbums();
        

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
        const temp_section = albumList.filter((entry): any => {
            return entry.album.toLowerCase().includes(value.toLowerCase());
        })
        setFilteredAlbums(temp_section);

        let tempSectionArray: number[] = [];
        const maxSection = alphabeticallyOrdered.length;

        for(let i = 0; i < maxSection; i++) {
            const results = temp_section.filter(obj => obj.album_section === alphabeticallyOrdered[i] ).length;
            tempSectionArray[i] = results;
        }
        setAlbumSections(tempSectionArray);
    }

    function handleContextMenu(e: any, album: string, artist: string, index: number) {
        if(e.pageX < window.innerWidth / 2) {
            setContextMenu({ isToggled: true, isBeingAdded: checkBoxNumber[index], album: album, artist: artist, index: index, posX: e.pageX, posY: e.pageY});
        }
        else {
            setContextMenu({ isToggled: true, isBeingAdded: checkBoxNumber[index], album: album, artist: artist, index: index, posX: e.pageX - 150, posY: e.pageY});
        }
    }

    function resetContextMenu() {
        console.log("Resetting Context Menu");
        setContextMenu({ isToggled: false, isBeingAdded: false, album: "", artist: "", index: 0, posX: 0, posY: 0});
    }

    // ------------ Start of Selection Bar Functions ------------
    
    function editSelection(album: String, isBeingAdded: boolean, index: number) {
        resetContextMenu();
        // If we are adding to the array of selected songs
        if(isBeingAdded === true) {
            // Append to the array
            setAlbumSelection([...albumSelection, album]);
            let tempArr: boolean[] = checkBoxNumber;
            tempArr[index] = true;
            setCheckBoxNumber(tempArr);

        }
        // If we are removing a song from the array
        else {
            // Find the location of the song in the array with filter and only return the other songs
            setAlbumSelection(albumSelection.filter(item => item !== album));
            let tempArr: boolean[] = checkBoxNumber;
            tempArr[index] = false;
            setCheckBoxNumber(tempArr);;
        }
        
    }

    function clearSelection() {
        setAlbumSelection([]);
        setCheckBoxNumber(Array(checkBoxNumber.length).fill(false));
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
            let songList: Songs[] = [];
            for(let i = 0; i < albumSelection.length; i++) {
                const temp: Songs[] = await invoke<Songs[]>('get_album', {name: albumSelection[i]});
                songList.push(...temp);
            }
            await invoke('add_to_playlist', {songs: songList, playlist_name: name});
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
            let songList: Songs[] = [];
            for(let i = 0; i < albumSelection.length; i++) {
                const temp: Songs[] = await invoke<Songs[]>('get_album', {name: albumSelection[i]});
                songList.push(...temp);
            }
            await invoke('create_playlist', {name: name});
            await invoke('add_to_playlist', {songs: songList, playlist_name: name});
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
                <SimpleBar forceVisible="y" autoHide={false} ref={setScrollParent}>
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

                    <VirtuosoGrid
                        style={{ paddingBottom: '170px' }}
                        totalCount={Array(70).length}
                        components={gridComponents}
                        increaseViewportBy={{ top: 210, bottom: 420 }}
                        itemContent={(i) =>
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
                        }
                        customScrollParent={scrollParent ? scrollParent.contentWrapperEl : undefined}
                    />
                </SimpleBar>
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

                <SimpleBar forceVisible="y" autoHide={false} ref={setScrollParent} clickOnTrack={false} >
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
                        {alphabeticallyOrdered.map((section, i) => {
                            let totalIndex = 0;
                            for(let j = 0; j < i; j++) { totalIndex += albumSections[j]; }
                            if(albumSections[i] !== 0) {
                                return(
                                    <div
                                        id={`main-${section}`} key={`main-${section}`} className="section-key"
                                        onClick={() => {
                                            virtuoso.current.scrollToIndex({ index: totalIndex });
                                            return false;
                                        }}
                                    >
                                        <span>
                                            {section === 0 && "&"}
                                            {section === 1 && "#"}
                                            {section > 1 && section < 300 && section !== 0 && String.fromCharCode(section)}
                                            {section === 300 && "..."}
                                        </span>
                                    </div>                                
                                ); 
                            }                          
                        })}
                    </div>

                    <VirtuosoGrid
                        totalCount={filteredAlbums.length}
                        components={gridComponents}
                        increaseViewportBy={{ top: 210, bottom: 420 }}
                        ref={virtuoso}
                        itemContent={(index) => 
                            <div className="album-link" key={index} id={`${filteredAlbums[index].album_section}-${index}`}>
                                <div className="album-image-container"
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        handleContextMenu(e, filteredAlbums[index].album, filteredAlbums[index].album_artist, index);
                                    }}
                                >
                                    <span className="checkbox-container">
                                        <input
                                            type="checkbox"
                                            id={`select-${index}`} name={`select-${index}`}
                                            onClick={(e) => editSelection(filteredAlbums[index].album, e.currentTarget.checked, index)}
                                            checked={checkBoxNumber[index]} onChange={() => {}}
                                        />
                                    </span>
                                    <div className="play-album" onClick={() => playAlbum(filteredAlbums[index].album)}>
                                        <img src={PlayIcon} alt="play icon" className="play-pause-icon" />
                                        <img src={Circle} className="circle"/>
                                    </div>
                                    
                                    <div className="container" onClick={() => navigateToAlbumOverview(filteredAlbums[index].album)} >
                                        <ImageWithFallBack image={filteredAlbums[index].cover} alt={filteredAlbums[index].album} image_type={"album"} />
                                    </div>
                                    <div className="album-image-name header-font">
                                        <div className="album-name">{filteredAlbums[index].album}</div>
                                        <div className="artist-name">{filteredAlbums[index].album_artist}</div>
                                    </div>
                                </div>
                            </div>                           
                        }
                        customScrollParent={scrollParent ? scrollParent.contentWrapperEl : undefined}
                    />
                    <div className="empty-space"/>
                    <div className="empty-space"/>
                </SimpleBar>
                
                <ContextMenuAlbums
                    isToggled={contextMenu.isToggled}
                    album={contextMenu.album}
                    artist={contextMenu.artist}
                    index={contextMenu.index}
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
    album: string,
    artist: string,
    index: number,
    play: (album_name: string) => void, // playSong / playAlbum function
    editSelection: (album: string, isBeingAdded: boolean, index: number) => void,
    isBeingAdded: boolean,
    posX: number,
    posY: number
}

function ContextMenuAlbums({ isToggled, album, artist, index, play, editSelection, isBeingAdded, posX, posY }: Props) {

    const navigate = useNavigate();

    function NavigateToAlbum() {
        navigate("/albums/overview", {state: {name: album}});
    }
    function NavigateToArtist() {
        navigate("/artists/overview", {state: {name: artist}});
    }

    useEffect(() => {
        const element = document.getElementsByClassName("simplebar-content-wrapper");
        if(isToggled) {
            element[0].classList.add("overflow-y-hidden");
        }
        else {
            element[0].classList.remove("overflow-y-hidden");
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
                    onClick={() => editSelection(album, !isBeingAdded, index) }
                >
                    <img src={SelectIcon} /> &nbsp; Select
                </li>

                <li onClick={() => {play(album)}} className="d-flex align-items-center">
                    <img src={PlayIcon} />  &nbsp; Play
                </li>

                <li className="d-flex align-items-center">
                    <img src={AddIcon} /> &nbsp; Add to
                </li>

                <li className="d-flex align-items-center" onClick={NavigateToAlbum} >
                    <img src={AlbumIcon} /> &nbsp; Show Album
                </li>
            
                <li className="d-flex align-items-center" onClick={NavigateToArtist} >
                    <img src={ArtistIcon} /> &nbsp; Show Artist
                </li>
            </div>
        );
    }
    else { return; }
}

// For the Virtual Grid
const gridComponents = {
    List: forwardRef(({ style, children, ...props }: any, ref) => (
        <div ref={ref} {...props} style={{ display: "flex", flexWrap: "wrap", ...style, }} >
            {children}
        </div>
    )),

  Item: ({ children, ...props }: any) => (
    <div {...props} style={{  width: "168px", display: "flex", flex: "none", boxSizing: "border-box", }} >
        {children}
    </div>
  )
}



// async function getAlbums() {
//     try {
//         setLoading(true);
//         const list = await invoke<AlbumDetails[]>('get_all_albums');
//         // console.log(list);
//         setAlbumList(list);
//         setFilteredAlbums(list);

//         let tempSectionArray: number[] = [];
//         const maxSection = alphabeticallyOrdered.indexOf( Math.max.apply(Math, list.map((o: AlbumDetails) => { return o.album_section})) );

//         for(let i = 0; i < maxSection; i++) {
//             const results = list.filter(obj => obj.album_section === alphabeticallyOrdered[i] ).length;
//             tempSectionArray[i] = results;
//         }
//         setAlbumSections(tempSectionArray);

//         setCheckBoxNumber(Array(list.length).fill(false));
        
//     }
//     catch (err) {
//         alert(`Failed to scan folder: ${err}`);
//     }
//     finally {
//         setLoading(false);
//     }
// }