
-- Create the tables for all the Music
CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY,
    -- The name of the song
    name TEXT NOT NULL,
    -- The system path to the song
    path TEXT NOT NULL,
    -- The image of the album (song)
    cover TEXT,
    -- --------------------- Extra metadata of the songs
    release TEXT,
    -- The track number of the song
    track INTEGER,
    album INTEGER,
    artist TEXT,
    genre INTEGER,
    album_artist INTEGER,
    disc_number INTEGER,
    duration INTEGER,
    -- FOREIGN KEY (album) REFERENCES albums(id),
    keep BOOLEAN
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
    track_id INTEGER NOT NULL,
    -- Position in the playlist
    position INTEGER NOT NULL,
    PRIMARY KEY (playlist_id, track_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (track_id) REFERENCES songs(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Stores the directory path a user as selected to scan music
CREATE TABLE IF NOT EXISTS dirs (  
    dir_path TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS settings (  
    id INTEGER PRIMARY KEY,
    theme TEXT,
    last_scan_date TEXT
);

CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    song_id INTEGER NOT NULL,
    FOREIGN KEY(song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS queue (
    position INTEGER PRIMARY KEY,
    song_id INTEGER NOT NULL,
    FOREIGN KEY(song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS queue_shuffled (
    position INTEGER PRIMARY KEY,
    song_id INTEGER NOT NULL,
    FOREIGN KEY(song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lyrics (
    lyrics_id INTEGER PRIMARY KEY,
    plain_lyrics TEXT,
    synced_lyrics TEXT,
    song_id INTEGER,
    FOREIGN KEY(song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    album_artist INTEGER,
    cover TEXT,
    album_section INTEGER,
    genre INTEGER,
    keep BOOLEAN
);

CREATE TABLE IF NOT EXISTS album_artists (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    cover TEXT,
    artist_section INTEGER,
    keep BOOLEAN
);

CREATE TABLE IF NOT EXISTS genres (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    cover TEXT,
    genre_section INTEGER,
    keep BOOLEAN
);


INSERT OR IGNORE INTO settings (id, theme) VALUES (1, "red");

-- Indexes can increase query speed, but increase DB file size
CREATE INDEX IF NOT EXISTS idx_song_artist ON songs(album_artist);
CREATE INDEX IF NOT EXISTS idx_song_name ON songs(name);