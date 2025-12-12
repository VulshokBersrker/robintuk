// Core Libraries
import { useLocation, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { VirtuosoGrid } from "react-virtuoso";
import { useEffect, useState } from "react";
import SimpleBar from "simplebar-react";
import { forwardRef } from 'react';

// Custom Components
import { ArtistDetails, PlaylistList, playSelection, savePosition, saveQueue, shuffle, Songs } from "../../globalValues";
import ImageWithFallBack from "../../components/imageFallback";

// Images
import ShuffleIcon from '../../images/shuffle-solid-full.svg';
import PlayIcon from '../../images/play-solid-full.svg';
import ArrowBackIcon from '../../images/arrow-left.svg';
import AddIcon from '../../images/plus-solid-full.svg';
import Circle from '../../images/circle.svg';

// Add To needs to be added
// Context Menu needs to be done

export default function ArtistOverviewPage() {

    const location = useLocation();
    const navigate = useNavigate();

    // Used to add SimpleBar to React Virtuoso
    const [scrollParent, setScrollParent] = useState<any>(null);

    const [loading, isLoading] = useState<boolean>(false);
    const [artistDetails, setArtistDetails] = useState<ArtistDetails>({ total_duration: 0, album_artist: "", albums: [], num_tracks: 0});

    const [songSelection, setSongSelection] = useState<Songs[]>([]);
    const [checkBoxNumber, setCheckBoxNumber] = useState<boolean[]>([]);

    // Playlist Values
    const [newPlaylistName, setNewPlaylistName] = useState<string>("");
    const [displayAddToMenu, setDisplayAddToMenu] = useState<boolean>(false);
    const [playlistList, setPlaylistList] = useState<PlaylistList[]>([]);


    // On first load get the album details
    useEffect(() => {
        getAlbums();
    }, []);

    async function getAlbums() {
        isLoading(true);
        try{
            const res: ArtistDetails = await invoke("get_albums_by_artist", {artist: location.state.name});
            // console.log(res);
            setArtistDetails(res);
        }
        catch(e) {
            alert(e)
        }
        finally {
            isLoading(false);
        }
    }

    const navigateToAlbumOverview = (name: string) => {
        navigate("/albums/overview", {state: {name: name}});
    }

    // Load the song the user clicked on but also queue the entire album
    async function playAlbum(album_name: string) {
        try {
            const albumRes: Songs[] = await invoke('get_album', { name: album_name });
            // console.log(albumRes);
            // Load the music to be played and saved
            await invoke('player_load_album', {queue: albumRes, index: 0});
            await invoke('update_current_song_played');
            saveQueue(albumRes);
            savePosition(0);
        }
        catch(e) {
            console.log(e);
        }
    }

    async function playArtist() {
        try {
            let albums_songs_arr: Songs[] = [];
            for(let i = 0; i < artistDetails.albums.length; i++) {
                const temp_arr: Songs[] = await invoke<Songs[]>("get_album", { name: artistDetails.albums[i].album });
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

    async function shuffleArtist() {
        try {
            let albums_songs_arr: Songs[] = [];
            for(let i = 0; i < artistDetails.albums.length; i++) {
                const temp_arr: Songs[] = await invoke<Songs[]>("get_album", { name: artistDetails.albums[i].album });
                albums_songs_arr = albums_songs_arr.concat(temp_arr);
            }
            let shufflePlaylist = albums_songs_arr.slice();
            shuffle(shufflePlaylist);
            playSelection(shufflePlaylist);
        }
        catch(e) {
            console.log(e);
        }
        finally {
            clearSelection();
        }
    }


    // Selection Function
    function editSelection(song: Songs, isBeingAdded: boolean, index: number) {
        // If we are adding to the array of selected songs
        if(isBeingAdded === true) {
            // Append to the array
            console.log("Adding song: " + song.name);
            setSongSelection([...songSelection, song]);
            const tempArr: boolean[] = checkBoxNumber;
            tempArr[index] = true;
            setCheckBoxNumber(tempArr);

        }
        // If we are removing a song from the array
        else {
            // Find the location of the song in the array with filter and only return the other songs
            console.log("Removing song: " + song.name);
            setSongSelection(songSelection.filter(item => item.path !== song.path));
            const tempArr: boolean[] = checkBoxNumber;
            tempArr[index] = false;
            setCheckBoxNumber(tempArr);
        }
    }

    function clearSelection() {
        setSongSelection([]);
        let tempArr: boolean[] = [];
        for(let i = 0; i < checkBoxNumber.length; i++) {
            tempArr[i]= false;
        }
        setCheckBoxNumber(tempArr);
    }

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
            await invoke('player_add_to_queue', {queue: songSelection});
        }
        catch(e) {
            console.log(e);
        }
        finally {
            await invoke('get_appended_queue');
            clearSelection();
        }
    }
    
    async function addToPlaylist(name: string) {
        try {
            await invoke('add_to_playlist', {songs: songSelection, playlist_name: name});
        }
        catch(e) {
            console.log(e);
        }
        finally {
            clearSelection();
        }
    }

    async function createPlaylist(name: string) {
        try {
            await invoke('create_playlist', {name: name});
            await invoke('add_to_playlist', {songs: songSelection, playlist_name: name});
            await invoke('new_playlist_added');
        }
        catch(e) {
            console.log(e);
        }
        finally {
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
    // ------------ End of Selection Bar Functions ------------


    if(loading) {
        return(
            <div className="d-flex vertical-centered">
                <span className="loader"/>
            </div>
        );
    }
    else {
        return(
            <SimpleBar forceVisible="y" autoHide={false} ref={setScrollParent}>
                <div className="album-container">
                    <div className="d-flex top-row justify-content-start">
                        <img src={ArrowBackIcon} className="icon icon-size" onClick={() => {navigate(-1)}}/>
                    </div>

                    {/* Album Details */}
                    <div className="d-flex">
                        <div className="album-details d-flex">   
                            <ImageWithFallBack image={""} alt={""} image_type={"artist"}/>

                            <span style={{paddingLeft: "10px"}} className="grid-15">
                                <div style={{paddingBottom: "10px"}} className="section-15 header-font font-3">{artistDetails.album_artist}</div>
                                <span className="section-15 font-0 misc-details">
                                    {artistDetails.albums.length} album{artistDetails.albums.length !== 0 && <span>s</span>} &#x2022; {artistDetails.num_tracks} songs &#x2022; {new Date(artistDetails.total_duration * 1000).toISOString().slice(11, 19)} total runtime
                                </span>
                                
                                <div className="section-15 d-flex album-commmands">
                                    <span><button className="font-1 borderless" onClick={playArtist}><img src={PlayIcon} /></button></span>
                                    <span><button className="font-1 borderless" onClick={shuffleArtist}><img src={ShuffleIcon} /></button></span>
                                    <span><button className="font-1 borderless" ><img src={AddIcon} /> </button></span>
                                </div>
                            </span>
                        </div>
                    </div>

                    {/* Song list */}
                    <div className="song-list">
                        <hr />        
                        <VirtuosoGrid
                            style={{ paddingBottom: '170px' }}
                            totalCount={artistDetails.albums.length}
                            components={gridComponents}
                            increaseViewportBy={{ top: 210, bottom: 420 }}
                            itemContent={(index) =>
                                <div className="album-link" key={index} id={`${artistDetails.albums[index].album_section}-${index}`}>
                                    <div className="album-image-container"
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            // handleContextMenu(e, artistDetails.albums[index].album, artistDetails.albums[index].album_artist, index);
                                        }}
                                    >
                                        <span className="checkbox-container">
                                            <input
                                                type="checkbox"
                                                id={`select-${index}`} name={`select-${index}`}
                                                // onClick={(e) => editSelection(artistDetails.albums[index].album, e.currentTarget.checked, index)}
                                                checked={checkBoxNumber[index]} onChange={() => {}}
                                            />
                                        </span>
                                        <div className="play-album" onClick={() => playAlbum(artistDetails.albums[index].album)}>
                                            <img src={PlayIcon} alt="play icon" className="play-pause-icon" />
                                            <img src={Circle} className="circle"/>
                                        </div>
                                        
                                        <div className="container" onClick={() => navigateToAlbumOverview(artistDetails.albums[index].album)} >
                                            <ImageWithFallBack image={artistDetails.albums[index].cover} alt={artistDetails.albums[index].album} image_type={"album"} />
                                        </div>
                                        <div className="album-image-name header-font">
                                            <div className="album-name">{artistDetails.albums[index].album}</div>
                                            <div className="artist-name">{artistDetails.albums[index].album_artist}</div>
                                        </div>
                                    </div>
                                </div>
                            }
                            customScrollParent={scrollParent ? scrollParent.contentWrapperEl : undefined}
                        />
                    </div>
                </div>
            </SimpleBar>
        );
    }
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