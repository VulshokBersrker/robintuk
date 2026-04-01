import { error, info } from '@tauri-apps/plugin-log';
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

export interface AllGenreResults {
    genre: string,
    genre_section: number
}

export interface ArtistDetails {
    num_tracks: number,
    total_duration: number,
    album_artist: string,
    albums: AlbumDetails[],
}

export interface GenreDetails {
    num_tracks: number,
    total_duration: number,
    genre: string,
    albums: AlbumDetails[],
}

export interface Playlists {
    id: number,
    name: string,
    image: string,
}

export interface PlaylistList {
    id: number,
    name: string
}

export interface PlaylistFull {
    name: string,
    image: string,
    songs: Songs[],
}

export interface ContextMenu {
    isToggled: boolean,
    isBeingAdded: boolean,
    context_type: string, // Album / Song / Artist / Playlist / Playlist Songs
    album: string,
    artist: string,
    index: number,
    posX: number,
    posY: number,
    side: number
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

export interface SongLyrics {
    lyrics_id: number,
    plain_lyrics: string,
    synced_lyrics: string,
}

// &, 0-9, A-Z, ...
export const alphabeticallyOrdered = [
    // &, #
    0, 1,
    // A - Z
    65, 66, 67, 68, 69, 70, 71, 72, 73, 74,
    75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86,
    87, 88, 89, 90,
    // ...
    300
];


export async function saveQueue(q: Songs[]) {
    try {
        await invoke('create_queue', {songs: q, shuffled: false});
    }
    catch(e) {
        error("Save Queue Global (Error) - Error Saving Queue: " + e);
        console.log(e);
    }
}
export async function saveShuffledQueue(q: Songs[]) {
    try {
        await invoke('create_queue', {songs: q, shuffled: true});
    }
    catch(e) {
        error("Save Shuffled Queue Global (Error) - Error Saving Shuffled Queue: " + e);
        console.log(e);
    }
}
export function savePosition(p: number) {
    localStorage.setItem('last-played-queue-position', p.toString());
}

export function saveSong(q: Songs) {
    localStorage.setItem('last-played-song', JSON.stringify(q));
}

export async function playSelection(array: Songs[]) {
    try {
        localStorage.setItem("shuffle-mode", JSON.stringify(false) );
        await invoke("set_shuffle_mode", { mode: false });

        // Load the music to be played and saved
        await invoke('play_selection', {songs: array, shuffled: false});
        savePosition(0);
        saveSong(array[0]);
    }
    catch(e) {
        error("Play Selection Global (Error) - Error Playing Selection: " + e);
        console.log(e);
    }
}

export async function playAlbum(album_name: string, shuffled: boolean) {
    try {
        localStorage.setItem("shuffle-mode", JSON.stringify(shuffled) );
        await invoke("set_shuffle_mode", { mode: shuffled });

        await invoke("play_album", {album_name: album_name, index: 0, shuffled: shuffled});
        savePosition(0);
    }
    catch(e) {
        error("Play Album Global (Error) - Error Playing Album: " + e);
        console.log(e);
    }
}

export async function playSong(song: Songs) {
    try {
        // Load the music to be played and saved
        await invoke('play_song', { song: song });
        savePosition(0);
    }
    catch(e) {
        error("Play Song Global (Error) - Error Playing Song: " + e);
        console.log(e);
    }
    finally {
        localStorage.setItem("shuffle-mode", JSON.stringify(false) );
        await invoke("set_shuffle_mode", { mode: false });
    }
}

export async function playPlaylist(playlist_id: number, shuffled: boolean) {
    try {
        localStorage.setItem("shuffle-mode", JSON.stringify(shuffled) );
        await invoke("set_shuffle_mode", { mode: shuffled });

        await invoke("play_playlist", {playlist_id: playlist_id, index: 0, shuffled: shuffled});
        savePosition(0);
    }
    catch(err) {
        error("Play Playlist Global (Error) - Error Playing Playlist: " + err);
        console.log(`Error trying to play playlist - globalV: ${err}`);
    } 
}


export function clearLocalStorage() {
    info("Clearing Local Storage");
    localStorage.clear();
}