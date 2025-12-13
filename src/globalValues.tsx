import { invoke } from "@tauri-apps/api/core";


export interface FileInfo {
    path: string,
    size: number,
    data: Songs
}

export interface SongRes {
    name: string,
    song_list: Songs[]
}

export interface Songs {
    name: string,
    path: string,
    cover: string,
    release: string,
    track: number,
    album: string,
    artist: string,
    genre: string,
    album_artist: string,
    disc_number: number,
    duration: number,
    song_section: number
}

export interface SongsFull {
    name: string,
    path: string,
    cover: string,
    release: string,
    track: number,
    album: string,
    artist: string,
    genre: string,
    album_artist: string,
    disc_number: number,
    duration: number,
    song_section: number
}

export interface AlbumRes {
    name: string,
    section: Songs[]
}

export interface AlbumDetails {
    album: string,
    album_artist: string,
    cover: string,
    album_section: number
}

export interface ArtistRes {
    name: string,
    section: Songs[]
}

export interface AllArtistResults {
    album_artist: string,
    name: string,
    artist_section: number
}

export interface ArtistDetails {
    num_tracks: number,
    total_duration: number,
    album_artist: string,
    albums: AlbumDetails[],
}

export interface Playlists {
    name: string,
    image: string,
}

export interface PlaylistList {
    name: string
}

export interface PlaylistFull {
    name: string,
    image: string,
    songs: Songs[],
}

export interface ContextMenu {
    isToggled: boolean,
    context_type: string, // Album / Song / Artist / Playlist / Playlist Songs
    album: string,
    artist: string,
    index: number,
    posX: number,
    posY: number
}

export interface DirectoryInfo {
    dir_path: string
}

export interface PlayHistory {
    id: string,
    name: string,
    path: string,
    cover: string,
    release: string,
    track: number,
    album: string,
    artist: string,
    genre: string,
    album_artist: string,
    disc_number: number,
    duration: number,
    song_section: number
}

export type GetCurrentSong = { q: Songs; };

// &, 0-9, A-Z, ...
export const alphabeticallyOrdered = [
    0, 1, //&, #
    65, 66, 67, 68, 69, 70, 71, 72, 73, 74,
    75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86,
    87, 88, 89, 90,
    300
];


export function saveQueue(q: Songs[]) {
    localStorage.setItem('last-played-queue', JSON.stringify(q));
    localStorage.setItem('last-played-queue-length', (q.length - 1).toString());
}
export function saveShuffledQueue(q: Songs[]) {
    localStorage.setItem('shuffled-queue', JSON.stringify(q));
    localStorage.setItem('shuffled-queue-length', (q.length - 1).toString());
}
export function savePosition(p: number) {
    localStorage.setItem('last-played-queue-position', p.toString());
}

export function shuffle(array: Songs[]) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

export async function playSelection(array: Songs[]) {
    try {
        console.log("playSelection");
        console.log(array);
        // Load the music to be played and saved
        await invoke('player_load_album', {queue: array, index: 0});
        await invoke('update_current_song_played');
        saveQueue(array);
        savePosition(0);
    }
    catch(e) {
        console.log(e);
    }
    finally {
        localStorage.setItem("shuffled-queue", JSON.stringify([]));
        localStorage.setItem("shuffle-mode", JSON.stringify(false) );
        await invoke("set_shuffle_mode", { mode: false });
    }
}

export async function playAlbum(album_name: string) {
    try {
        const albumRes: Songs[] = await invoke('get_album', { name: album_name });
        // Load the music to be played and saved
        await invoke('player_load_album', {queue: albumRes, index: 0});
        await invoke('update_current_song_played');
        saveQueue(albumRes);
        savePosition(0);
    }
    catch(e) {
        console.log(e);
    }
    finally {
        localStorage.setItem("shuffled-queue", JSON.stringify([]));
        localStorage.setItem("shuffle-mode", JSON.stringify(false) );
        await invoke("set_shuffle_mode", { mode: false });
    }
}

export async function playPlaylist(playlist_name: string) {
    try {
        const res: PlaylistFull = await invoke("get_playlist", {name: playlist_name});
        // Load the music to be played and saved
        await invoke('player_load_album', {queue: res.songs, index: 0});
        await invoke('update_current_song_played', {path: res.songs[0].path});
        await invoke('update_current_song_played');
        saveQueue(res.songs);
        savePosition(0);
    }
    catch (err) {
        alert(`Failed to play song: ${err}`);
    }
    finally {
        localStorage.setItem("shuffled-queue", JSON.stringify([]));
        localStorage.setItem("shuffle-mode", JSON.stringify(false) );
        await invoke("set_shuffle_mode", { mode: false });
    }
}



export function clearLocalStorage() {
    localStorage.clear();
}