-- Your SQL goes here

-- Create the tables for all the Music
CREATE TABLE IF NOT EXISTS songs (  
    id TEXT PRIMARY KEY,
    -- The name of the song
    name TEXT NOT NULL,
    -- The system path to the song
    path TEXT NOT NULL UNIQUE,
    -- The image of the album (song), base64 encoded ( is the system path to the album artwork otherwise )
    cover TEXT,
    -- --------------------- Extra metadata of the songs
    release TEXT,
    -- The track number of the song
    track INTEGER,
    album TEXT,
    artist TEXT,
    genre TEXT,
    album_artist TEXT,
    disc_number INTEGER,
    duration INTEGER
);

CREATE TABLE IF NOT EXISTS playlists (
    name TEXT PRIMARY KEY NOT NULL,
    image TEXT
);

-- The playlist's songs
CREATE TABLE IF NOT EXISTS playlist_tracks (
    -- The name of the playlist
    playlist_name TEXT NOT NULL,
    -- A reference to the song table to get the song's data
    track_id TEXT NOT NULL,
    -- Position in the playlist
    position INTEGER NOT NULL,
    PRIMARY KEY (playlist_name, track_id),
    FOREIGN KEY (playlist_name) REFERENCES playlists(name) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Stores the directory path a user as selected to scan music
CREATE TABLE IF NOT EXISTS dirs (  
    dir_path TEXT NOT NULL UNIQUE
);


CREATE TABLE IF NOT EXISTS history_songs (
    id TEXT PRIMARY KEY,
    date_played TEXT NOT NULL,
    song_id TEXT NOT NULL,
    FOREIGN KEY(song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS history_albums (
    id TEXT PRIMARY KEY,
    date_played TEXT NOT NULL,
    album_name TEXT NOT NULL,
    FOREIGN KEY(album_name) REFERENCES songs(album) ON DELETE CASCADE
);

-- CREATE INDEX idx_songs_artist ON songs(artist);
-- CREATE INDEX idx_songs_album ON songs(album);
-- CREATE INDEX idx_history_date_played ON history(date_played);