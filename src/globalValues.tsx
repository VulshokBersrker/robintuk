

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

export interface Playlists {
    name: string,
    image: string,
}

export const alphabeticallyOrdered = [
    '&', '#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
    'W', 'X', 'Y', 'Z', '...'
];


export function saveQueue(q: Songs[]) {
    localStorage.setItem('last-played-queue', JSON.stringify(q));
    localStorage.setItem('last-played-queue-length', (q.length - 1).toString());
}
export function savePosition(p: number) {
    localStorage.setItem('last-played-queue-position', p.toString());
}