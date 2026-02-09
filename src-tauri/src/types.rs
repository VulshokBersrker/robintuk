// ---------------------------------------- SQLITE DATABASE Public Structs ----------------------------------------

use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use serde_with::{serde_as, DisplayFromStr};

// This struct is just for uploading data to the database
#[derive(sqlx::FromRow, Default, Debug, Clone, Serialize)]
pub struct SongTableUpload {
    pub name: Option<String>,
    pub path: String,
    pub cover: Option<String>,
    pub release: Option<String>,
    pub track: Option<i32>,
    pub album: Option<String>,
    pub artist: Option<String>,
    pub genre: Option<String>,
    pub album_artist: Option<String>,
    pub disc: Option<i32>,
    pub duration: String,
    pub song_section: Option<i32>,
    pub album_section: Option<i32>,
    pub artist_section: Option<i32>,
    pub genre_section: Option<i32>
}

// This struct is for data retreived from the database
#[derive(sqlx::FromRow, Default, Debug, Clone, Serialize, Deserialize)]
pub struct SongTable {
    pub name: String,
    pub path: String,
    pub cover: String,
    pub release: String,
    pub track: i32,
    pub album: String,
    pub artist: String,
    pub genre: String,
    pub album_artist: String,
    pub disc_number: i32,
    pub duration: u64,
    pub song_section: u64
}

#[derive(sqlx::FromRow, Default, Debug, Clone, Serialize)]
pub struct PlaylistTable {
    pub id: i64,
    pub name: String,
    pub image: String
}

#[derive(sqlx::FromRow, Default, Serialize)]
pub struct PlaylistFull {
    pub id: i64,
    pub name: String,
    pub image: String,
    pub songs: Vec<SongTable>
}

#[derive(sqlx::FromRow, Default, Serialize, Clone)]
pub struct DirsTable {
    pub dir_path: String,
}

#[derive(sqlx::FromRow, Default, Clone, Serialize)]
pub struct AllAlbumResults {
    pub album: String,
    pub album_artist: String,
    pub cover: String,
    pub album_section: i32
}

#[derive(sqlx::FromRow, Default, Clone, Serialize)]
pub struct AllArtistResults {
    pub album_artist: String,
    pub artist_section: i32
}

#[derive(sqlx::FromRow, Default, Clone, Serialize)]
pub struct AllGenreResults {
    pub genre: String,
    pub genre_section: i32
}

#[derive(sqlx::FromRow, Default, Clone, Serialize)]
pub struct ArtistDetailsResults {
    pub num_tracks: usize,
    pub total_duration: u64,
    pub album_artist: String,
    pub albums: Vec<AllAlbumResults>
}

#[derive(sqlx::FromRow, Default, Clone, Serialize)]
pub struct GenreDetailsResults {
    pub num_tracks: usize,
    pub total_duration: u64,
    pub genre: String,
    pub albums: Vec<AllAlbumResults>
}

#[serde_as]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct History {
    pub id: String,
    #[serde_as(as = "DisplayFromStr")]
    pub date_played: DateTime<Utc>,
    pub song_id: String,
}

#[serde_as]
#[derive(sqlx::FromRow, Debug, Serialize, Deserialize, Clone)]
pub struct SongHistory {
    pub id: String,
    pub name: String,
    pub path: String,
    pub cover: String,
    pub release: String,
    pub track: i32,
    pub album: String,
    pub artist: String,
    pub genre: String,
    pub album_artist: String,
    pub disc_number: i32,
    pub duration: u64,
    pub song_section: u64
}

#[derive(sqlx::FromRow, Default, Debug, Clone, serde::Serialize)]
pub struct DoesExist {
    pub does_exist: bool
}

// ---------------------------------------- Event Tracker Structs ----------------------------------------

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetCurrentSong {
  pub q: SongTable
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetPlaylistList {
  pub playlist: Vec<PlaylistTable>
}



#[derive(sqlx::FromRow, Default, Debug, serde::Serialize, serde::Deserialize)]
pub struct LrclibLyrics {
    pub lyrics_id: i64,
    pub plain_lyrics: String,
    pub synced_lyrics: Option<String>
}