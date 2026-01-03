-- Your SQL goes here

-- Create the tables for all the Music
CREATE TABLE IF NOT EXISTS songs (
    -- The name of the song
    name TEXT NOT NULL,
    -- The system path to the song
    path TEXT NOT NULL PRIMARY KEY,
    -- The image of the album (song)
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
    duration INTEGER,
    -- Favorited value - might not use
    favorited BOOLEAN,
    song_section INTEGER NOT NULL,
    album_section INTEGER,
    artist_section INTEGER,
    lyrics_id INTEGER,
    keep BOOLEAN NOT NULL,
    FOREIGN KEY (lyrics_id) REFERENCES lyrics(lyrics_id)
);

CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    image TEXT
);

-- The playlist's songs
CREATE TABLE IF NOT EXISTS playlist_tracks (
    -- The name of the playlist
    playlist_id INTEGER NOT NULL,
    -- A reference to the song table to get the song's data
    track_id TEXT NOT NULL,
    -- Position in the playlist
    position INTEGER NOT NULL,
    PRIMARY KEY (playlist_id, track_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE ON UPDATE CASCADE
    FOREIGN KEY (track_id) REFERENCES songs(path) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Stores the directory path a user as selected to scan music
CREATE TABLE IF NOT EXISTS dirs (  
    dir_path TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    song_id TEXT NOT NULL,
    FOREIGN KEY(song_id) REFERENCES songs(path) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS queue (
    position INTEGER PRIMARY KEY,
    song_id TEXT NOT NULL,
    FOREIGN KEY(song_id) REFERENCES songs(path) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS queue_shuffled (
    position INTEGER PRIMARY KEY,
    song_id TEXT NOT NULL,
    FOREIGN KEY(song_id) REFERENCES songs(path) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lyrics (
    lyrics_id INTEGER PRIMARY KEY NOT NULL,  
    duration INTEGER,
    instrumental BOOLEAN NOT NULL,
    plain_lyrics TEXT,
    synced_lyrics TEXT
);

-- Indexes can increase query speed, but increase DB file size
CREATE INDEX idx_song_album ON songs(album);
CREATE INDEX idx_song_artist ON songs(album_artist);
CREATE INDEX idx_song_name ON songs(name);