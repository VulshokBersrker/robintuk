

export interface FileInfo {
    path: string,
    size: number,
    data: Songs
}

export interface Songs {
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
    duration: number
}

export interface AlbumRes {
    name: string,
    section: Songs[]
}

export interface AlbumDetails {
    album: string,
    artist: string,
    cover: string
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

export type GetCurrentSong = { q: Songs; };


export const alphabeticallyOrdered = [
    '&', '#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
    'W', 'X', 'Y', 'Z', '...'
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