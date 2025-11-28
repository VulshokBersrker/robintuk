use std::ffi::OsStr;
use std::{fs};
use std::path::Path;

use chrono::Utc;
// SQLITE Libraries
use sqlx::{sqlite::SqliteQueryResult, Executor, Pool, Row, Sqlite, SqlitePool};
use tauri::{State};

use crate::types::{
    AlbumRes, AllAlbumResults, AllArtistResults, ArtistDetailsResults,
    DirsTable, History, PlaylistDetailTable, PlaylistFull, PlaylistTable,
    SongRes, SongTable, SongTableUpload, ArtistRes
};
use crate::{AppState, helper::ALPHABETICALLY_ORDERED};

// ---------------------------------------- Initilize Database and Check if Database exists ----------------------------------------

// Check if a database file exists, and create one if it does not.
pub fn init() {
    if !db_file_exists() {
        create_db_file();

        // Allows you to run async commands in sync methods
        let tr = tokio::runtime::Runtime::new().unwrap();
        let _ = tr.block_on(apply_initial_migrations());
    }

    // Create the cover folder
    let covers_dir = dirs::home_dir().unwrap().to_str().unwrap().to_string() + "/.config/robintuk_player/covers";
    let home_dir = Path::new(&covers_dir);
    fs::create_dir_all(home_dir).unwrap();

    let playlist_cover_dir = dirs::home_dir().unwrap().to_str().unwrap().to_string() + "/.config/robintuk_player/playlist_covers";
    let playlist_dir = Path::new(&playlist_cover_dir);
    fs::create_dir_all(playlist_dir).unwrap();
}

// Create the database file.
fn create_db_file() {
    let db_path = get_db_path();
    let db_dir = Path::new(&db_path).parent().unwrap();

    // If the parent directory does not exist, create it.
    if !db_dir.exists() {
        println!("Creating Database file...");
        fs::create_dir_all(db_dir).unwrap();
    }

    // Create the database file.
    fs::File::create(db_path).unwrap();
}

// Check whether the database file exists.
fn db_file_exists() -> bool {
    let db_path = get_db_path();
    Path::new(&db_path).exists()
}

// Get the path where the database file should be located.
pub fn get_db_path() -> String {
    let home_dir = dirs::home_dir().unwrap();
    home_dir.to_str().unwrap().to_string() + "/.config/robintuk_player/robintuk.db"
}

async fn apply_initial_migrations() -> Result<(), String> {
    let pool = establish_connection().await?;

    let _ = pool.execute(include_str!("../migrations/0001_init.sql")).await;

    Ok(())
}

// ---------------------------------------- SQLITE DATABASE FUNCTIONS ----------------------------------------

pub async fn establish_connection() -> Result<Pool<sqlx::Sqlite>, std::string::String> {
    let binding = get_db_path();
    let dir_path = binding.as_str();
    // println!("Connection Established to Database File {:?}", dir_path);
    println!("Connection Established to Database");

    return SqlitePool::connect(dir_path)
        .await
        .map_err(|e| format!("Failed to connect to database {}", e));
}

// ----------------------------------------------------- Edit SQLITE Database -----------------------------------------------------

// The goal here is check if the song already exists in the database ---------------------- NEEDS WORK
// Used for updating or adding a song
// Outputs a boolean value
pub async fn check_for_value() -> Result<bool, String> {
    let pool = establish_connection().await?;

    let temp = sqlx::query(
        "SELECT COUNT(*) FROM songs 
        WHERE path = ?;",
    )
    .bind("")
    .fetch_all(&pool)
    .await
    .unwrap();

    for t in temp.iter() {
        for x in t.columns() {
            println!("{:?}", x);
        }
    }

    Ok(false)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn add_directory(state: State<AppState, '_>, directory_name: String) -> Result<(), String> {

    let _ = sqlx::query("INSERT INTO dirs (dir_path) VALUES (?1);")
        .bind(directory_name)
        .execute(&state.pool)
        .await
        .map_err(|e| format!("Error saving directory path: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_directory() -> Result<Vec<DirsTable>, String> {
    let pool = establish_connection().await?;

    let temp: Vec<DirsTable> = sqlx::query_as::<_, DirsTable>("SELECT * FROM dirs")
        .fetch_all(&pool)
        .await
        .unwrap();

    Ok(temp)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn remove_directory(state: State<AppState, '_>, directory_name: String) -> Result<(), String> {

    let _ = sqlx::query("DELETE FROM dirs WHERE dir_path = ?")
        .bind(&directory_name)
        .execute(&state.pool)
        .await
        .unwrap();

    Ok(())
}

// ------------------------------------ Song Functions ------------------------------------

// Get all songs from the database and all of their data
#[tauri::command]
pub async fn get_all_songs(state: State<AppState, '_>) -> Result<Vec<SongRes>, String> {

    let temp: Vec<SongTable> = sqlx::query_as::<_, SongTable>("SELECT * FROM songs ORDER BY name ASC;")
        .fetch_all(&state.pool)
        .await
        .unwrap();

    let mut output: Vec<SongRes> = vec![];

    for letter in ALPHABETICALLY_ORDERED {
        let mut t: Vec<SongTable> = vec![];
        for item in temp.clone() {
            // Special Characters
            if letter == '&' &&
                (item.name.as_str().starts_with('#') || item.name.as_str().starts_with('!') || item.name.as_str().starts_with('#')
                || item.name.as_str().starts_with('[') || item.name.as_str().starts_with(']') || item.name.as_str().starts_with('\\')
                || item.name.as_str().starts_with('-') || item.name.as_str().starts_with('_') || item.name.as_str().starts_with('\"')
                || item.name.as_str().starts_with('\'') || item.name.as_str().starts_with('&') || item.name.as_str().starts_with('$') || item.name.as_str().starts_with('?')
                || item.name.as_str().starts_with('+') || item.name.as_str().starts_with('%') || item.name.as_str().starts_with('*') || item.name.as_str().starts_with('.') ) {
                t.push(item);
            }
            // Other Characters outside ascii values
            else if letter == '.' && !item.name.as_bytes()[0].is_ascii() {
                t.push(item);
            }
            // 0 - 9
            else if letter == '#' && item.name.as_str().chars().next().unwrap().is_numeric() {
                t.push(item);
            }
            // A - Z
            else if letter.is_alphabetic() && item.name.starts_with(letter) {
                t.push(item);
            }
        }
        output.push(SongRes{name: letter.to_string(), song_list: t});
    }


    Ok(output)
}

// Get a single song from the database ---------------------- NEEDS WORK (Should use path or id instead of name)
// And all of their data
#[tauri::command(rename_all = "snake_case")]
pub async fn get_song(state: State<AppState, '_>, song_name: String) -> Result<SongTable, String> {

    let temp: SongTable = sqlx::query_as::<_, SongTable>("SELECT * FROM songs WHERE name = ?")
        .bind(&song_name)
        .fetch_one(&state.pool)
        .await
        .unwrap();

    Ok(temp)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_song_by_path(state: State<AppState, '_>, path: String) -> Result<SongTable, String> {

    let temp: SongTable = sqlx::query_as::<_, SongTable>("SELECT * FROM songs WHERE path = ?")
        .bind(&path)
        .fetch_one(&state.pool)
        .await
        .unwrap();

    Ok(temp)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_songs_with_limit(state: State<AppState, '_>, limit: i64) -> Result<Vec<SongTable>, String> {

    let temp: Vec<SongTable> = sqlx::query_as::<_, SongTable>(
        "SELECT * FROM songs ORDER BY name ASC LIMIT $1")
        .bind(limit)
        .fetch_all(&state.pool)
        .await
        .unwrap();

    Ok(temp)
}

// Add a song to the database
// -- Check the song to make sure no duplicate songs are being added?
pub async fn add_song(
    entry: SongTableUpload,
    pool: &Pool<Sqlite>,
) -> Result<SqliteQueryResult, String> {
    // let pool = establish_connection().await?;

    let res: Result<SqliteQueryResult, sqlx::Error> = sqlx::query("INSERT OR IGNORE INTO songs
        (id, name, path, cover, release, track, album, artist, genre, album_artist, disc_number, duration) 
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)")
        .bind(entry.id)
        .bind(entry.name)
        .bind(entry.path)
        .bind(entry.cover)
        .bind(entry.release)
        .bind(entry.track)
        .bind(entry.album)
        .bind(entry.artist)
        .bind(entry.genre)
        .bind(entry.album_artist)
        .bind(entry.disc)
        .bind(entry.duration)
        .execute(pool)
        .await;
    // .map_err(|e| format!("Error saving song: {}", e))?;

    Ok(res.unwrap())
}

// ------------------------------------ Album Functions ------------------------------------

#[tauri::command]
pub async fn get_all_albums(state: State<AppState, '_>) -> Result<Vec<AlbumRes>, String> {

    let temp: Vec<AllAlbumResults> = sqlx::query_as::<_, AllAlbumResults>(
        "
        SELECT DISTINCT album, album_artist, cover FROM songs
        GROUP BY album ORDER BY album ASC;",
    )
    .fetch_all(&state.pool)
    .await
    .unwrap();

    let mut output: Vec<AlbumRes> = vec![];

    for letter in ALPHABETICALLY_ORDERED {
        let mut t: Vec<AllAlbumResults> = vec![];
        for item in temp.clone() {
            // Special Characters
            if letter == '&' &&
                (item.album.as_str().starts_with('#') || item.album.as_str().starts_with('!') || item.album.as_str().starts_with('#')
                || item.album.as_str().starts_with('[') || item.album.as_str().starts_with(']') || item.album.as_str().starts_with('\\')
                || item.album.as_str().starts_with('-') || item.album.as_str().starts_with('_') || item.album.as_str().starts_with('\"')
                || item.album.as_str().starts_with('\'') || item.album.as_str().starts_with('&') || item.album.as_str().starts_with('$')
                || item.album.as_str().starts_with('+') || item.album.as_str().starts_with('%') || item.album.as_str().starts_with('*') || item.album.as_str().starts_with('.') ) {
                t.push(item);
            }
            // Other Characters outside ascii values
            else if letter == '.' && !item.album.as_bytes()[0].is_ascii() {
                t.push(item);
            }
            // 0 - 9
            else if letter == '#' && item.album.as_str().chars().next().unwrap().is_numeric() {
                t.push(item);
            }
            // A - Z
            else if letter.is_alphabetic() && item.album.starts_with(letter) {
                t.push(item);
            }
        }
        output.push(AlbumRes{name: letter.to_string(), section: t});
    }
    

    Ok(output)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_album(state: State<AppState, '_>, name: String) -> Result<Vec<SongTable>, String> {

    let temp: Vec<SongTable> = sqlx::query_as::<_, SongTable>("SELECT * FROM songs WHERE album=$1 ORDER BY track ASC, disc_number ASC;")
        .bind(name)
        .fetch_all(&state.pool)
        .await
        .unwrap();

    Ok(temp)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_albums_with_limit(state: State<AppState, '_>, limit: i64) -> Result<Vec<AllAlbumResults>, String> {

    let temp: Vec<AllAlbumResults> = sqlx::query_as::<_, AllAlbumResults>(
        "SELECT DISTINCT album, album_artist, cover FROM songs
        GROUP BY album ORDER BY album ASC LIMIT $1")
        .bind(limit)
        .fetch_all(&state.pool)
        .await
        .unwrap();

    Ok(temp)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_albums_by_artist(state: State<AppState, '_>, artist: String) -> Result<ArtistDetailsResults, String> {

    let temp: Vec<SongTable> = sqlx::query_as::<_, SongTable>("SELECT * FROM songs WHERE album_artist=$1 ORDER BY album ASC;")
        .bind(&artist)
        .fetch_all(&state.pool)
        .await
        .unwrap();

    let albums: Vec<AllAlbumResults> = sqlx::query_as::<_, AllAlbumResults>(
        "SELECT DISTINCT album, album_artist, cover FROM songs WHERE album_artist=$1
        GROUP BY album ORDER BY album ASC;",
    ).bind(&artist).fetch_all(&state.pool).await.unwrap();

    let mut duration: u64 = 0;
    let album_artist: String = albums[0].album_artist.clone();
    for song in &temp {
        duration += song.duration;
    }

    Ok(ArtistDetailsResults{ num_tracks: temp.len(), total_duration: duration, album_artist, albums })
}

// ------------------------------------ Genre Functions ------------------------------------

#[tauri::command]
pub async fn get_all_genres() -> Result<Vec<SongTable>, String> {
    let pool = establish_connection().await?;

    let temp: Vec<SongTable> = sqlx::query_as::<_, SongTable>(
        "
        SELECT DISTINCT genre, album, artist, cover FROM songs
        GROUP BY genre
        ORDER BY genre ASC;",
    )
    .fetch_all(&pool)
    .await
    .unwrap();

    Ok(temp)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_genre(name: String) -> Result<SongTable, String> {
    let pool = establish_connection().await?;

    let temp: SongTable = sqlx::query_as::<_, SongTable>("SELECT * FROM songs WHERE genre=$1 ORDER BY genre;")
        .bind(name)
        .fetch_one(&pool)
        .await
        .unwrap();

    println!("id={}, album_name={}", temp.name, temp.genre);

    Ok(temp)
}

// ------------------------------------ Artist Functions ------------------------------------

#[tauri::command]
pub async fn get_all_artists(state: State<AppState, '_>) -> Result<Vec<ArtistRes>, String> {

    let temp: Vec<AllArtistResults> = sqlx::query_as::<_, AllArtistResults>(
        "SELECT DISTINCT name, album_artist FROM songs
        GROUP BY album_artist
        ORDER BY album_artist ASC;",
    )
    .fetch_all(&state.pool)
    .await
    .unwrap();

    let mut output: Vec<ArtistRes> = vec![];

    for letter in ALPHABETICALLY_ORDERED {
        let mut t: Vec<AllArtistResults> = vec![];
        for item in temp.clone() {

            // A check for when an artist is null or empty
            if Some(&item.album_artist) == None || item.album_artist == "".to_string() {
                if letter == '.' {
                    t.push(AllArtistResults{ album_artist: "Unknown Artist".to_string(), name: "".to_string() } );
                    continue;
                }
            }
            else if Some(&item.album_artist) != None || item.album_artist != "".to_string() {
                // Special Characters
                if letter == '&' &&
                    (item.album_artist.as_str().starts_with('#') || item.album_artist.as_str().starts_with('!') || item.album_artist.as_str().starts_with('#')
                    || item.album_artist.as_str().starts_with('[') || item.album_artist.as_str().starts_with(']') || item.album_artist.as_str().starts_with('\\')
                    || item.album_artist.as_str().starts_with('-') || item.album_artist.as_str().starts_with('_') || item.album_artist.as_str().starts_with('\"')
                    || item.album_artist.as_str().starts_with('\'') || item.album_artist.as_str().starts_with('&') || item.album_artist.as_str().starts_with('$')
                    || item.album_artist.as_str().starts_with('+') || item.album_artist.as_str().starts_with('%') || item.album_artist.as_str().starts_with('*') || item.album_artist.as_str().starts_with('.') ) {
                    t.push(item);
                }
                // Other Characters outside ascii values
                else if letter == '.' && !item.album_artist.as_bytes()[0].is_ascii() {
                    t.push(item);
                }
                // 0 - 9
                else if letter == '#' && item.album_artist.as_str().chars().next().unwrap().is_numeric() {
                    t.push(item);
                }
                // A - Z
                else if letter.is_alphabetic() && item.album_artist.starts_with(letter) {
                    t.push(item);
                    
                }
            }
            
        }
        output.push(ArtistRes{name: letter.to_string(), section: t});
    }
    

    Ok(output)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_artist(state: State<AppState, '_>, name: String) -> Result<SongTable, String> {

    let temp: SongTable = sqlx::query_as::<_, SongTable>("SELECT * FROM songs WHERE artist=$1 ORDER BY artist;")
        .bind(name)
        .fetch_one(&state.pool)
        .await
        .unwrap();

    println!("id={}, album_name={}", temp.name, temp.artist);

    Ok(temp)
}

// ------------------------------------ Playlist Functions ------------------------------------  ---------------------- NEEDS WORK

#[tauri::command]
pub async fn get_all_playlists(state: State<AppState, '_>) -> Result<Vec<PlaylistTable>, String> {

    let temp = sqlx::query_as::<_, PlaylistTable>("SELECT * FROM playlists;")
        .fetch_all(&state.pool)
        .await
        .unwrap();

    Ok(temp)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_playlist(state: State<AppState, '_>, name: String) -> Result<PlaylistFull, String> {

    // Get the playlist
    let playlist_details: PlaylistTable = sqlx::query_as::<_, PlaylistTable>("SELECT * FROM playlists WHERE name=$1;")
        .bind(&name)
        .fetch_one(&state.pool)
        .await
        .unwrap();

    // Get the playlist tracks
    let temp: Vec<PlaylistDetailTable> = sqlx::query_as::<_, PlaylistDetailTable>("SELECT * FROM playlist_tracks WHERE playlist_name=$1 ORDER BY position;")
        .bind(&name)
        .fetch_all(&state.pool)
        .await
        .unwrap();

    // Get the songs in the playlist
    let mut song_arr: Vec<SongTable> = vec![];
    for item in temp {
        let temp_item: SongTable = sqlx::query_as::<_, SongTable>("SELECT * FROM songs WHERE id = ?")
        .bind(&item.track_id)
        .fetch_one(&state.pool)
        .await
        .unwrap();

        song_arr.push(temp_item);
    }

    Ok(PlaylistFull{ name: playlist_details.name, image: playlist_details.image, songs: song_arr })
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_playlists_with_limit(state: State<AppState, '_>, limit: i64) -> Result<Vec<PlaylistTable>, String> {

    let temp: Vec<PlaylistTable> = sqlx::query_as::<_, PlaylistTable>(
        "SELECT * FROM playlists ORDER BY name ASC LIMIT $1")
        .bind(limit)
        .fetch_all(&state.pool)
        .await
        .unwrap();

    Ok(temp)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn create_playlist(state: State<AppState, '_>, name: String) -> Result<(), String> {

    sqlx::query("INSERT INTO playlists (name) VALUES (?1)")
        .bind(&name)
        .execute(&state.pool)
        .await
        .unwrap();

    Ok(())
}

// Add songs to a playlist  ---------------------- NEEDS WORK
#[tauri::command(rename_all = "snake_case")]
pub async fn add_to_playlist(state: State<AppState, '_>, songs: Vec<SongTable>, playlist_name: String) -> Result<(), String> {

    // Get the last position of the playlist from the list
    let length: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM playlist_tracks WHERE playlist_name=$1;")
        .bind(&playlist_name)
        .fetch_one(&state.pool)
        .await.unwrap();

    // Now add the new songs to the playlist
    let mut i = length.0 + 1;
    for song in songs {
        let _ = sqlx::query("INSERT INTO playlist_tracks
            (playlist_name, track_id, position) 
            VALUES (?1, ?2, ?3)")
            .bind(&playlist_name)
            .bind(&song.id)
            .bind(&i)
            .execute(&state.pool).await;
        i = i + 1;
    }

    Ok(())
}

// Take in the new name of the playlist and update the name value of the playlist
#[tauri::command(rename_all = "snake_case")]
pub async fn rename_playlist(old_name: String, new_name: String) -> Result<(), String> {
    let pool = establish_connection().await?;

    let _: PlaylistTable = sqlx::query_as::<_, PlaylistTable>(
        "UPDATE playlists SET playlist_name=$1 WHERE playlist_name=$2;",
    )
    .bind(new_name)
    .bind(old_name)
    .fetch_one(&pool)
    .await
    .unwrap();
    Ok(())
}

// Take in the new name of the playlist and update the name value of the playlist
#[tauri::command(rename_all = "snake_case")]
pub async fn delete_playlist(state: State<AppState, '_>, name: String) -> Result<(), String> {

    let _ = sqlx::query("DELETE FROM playlists WHERE name=$1;")
    .bind(&name)
    .execute(&state.pool)
    .await;

    let _ = sqlx::query("DELETE FROM playlist_tracks WHERE playlist_name=$1;")
    .bind(&name)
    .execute(&state.pool)
    .await;

    Ok(())
}

// Take in an array of strings (hashes) to update the position values of the playlist  ---------------------- NEEDS WORK
#[tauri::command(rename_all = "snake_case")]
pub async fn reorder_playlist(
    // old_positions: Vec<String>, new_positions: Vec<String>
) {
    println!("Reorder Playlist")
}

#[tauri::command(rename_all = "snake_case")]
pub async fn add_playlist_cover(state: State<AppState, '_>, file_path: String, playlist_name: String) -> Result<(), String> {
    // First get the image file and the playlist cover directory
    let image_dir =  dirs::home_dir().unwrap().to_str().unwrap().to_string() + "/.config/robintuk_player/playlist_covers/";
    let file_type = Path::new(&file_path).extension().and_then(OsStr::to_str).unwrap();
    let new_path = image_dir.clone() + "" + &playlist_name.as_str() + "." + file_type;

    // Copy the file to the image directory
    let _ = fs::copy(&file_path, &new_path);

    let _ = sqlx::query("UPDATE playlists SET image = $1 WHERE name = $2;")
        .bind(&new_path)
        .bind(&playlist_name)
        .execute(&state.pool).await;

    Ok(())
}



// Create a history of songs played -- no idea what for yet
#[tauri::command(rename_all = "snake_case")]
pub async fn add_song_to_history(state: State<AppState, '_>, song: SongTable) -> Result<(), String> {
    let history: History = History {
        id: Utc::now().timestamp_millis().to_string(),
        date_played: Utc::now(),
        song,
    };
    sqlx::query("INSERT INTO history (id, date_played, song_id) VALUES (?, ?, ?)")
        .bind(history.id)
        .bind(history.date_played.to_rfc3339())
        .bind(history.song.id)
        .execute(&state.pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
