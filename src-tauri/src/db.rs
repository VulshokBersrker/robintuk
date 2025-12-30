use std::ffi::OsStr;
use std::{fs};
use std::path::{Path};

use chrono::Utc;
// SQLITE Libraries
use sqlx::{sqlite::SqliteQueryResult, Executor, Pool, Sqlite, SqlitePool};
use tauri::{State};

use crate::types::{
    AllAlbumResults, AllArtistResults, ArtistDetailsResults, DirsTable, History, SongHistory,
    PlaylistFull, PlaylistTable, SongTable, SongTableUpload
};
use crate::{AppState};


#[derive(sqlx::FromRow, Default, Debug, Clone, serde::Serialize)]
struct DoesExist {
    does_exist: bool
}

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

pub async fn establish_connection() -> Result<Pool<Sqlite>, std::string::String> {
    let binding = get_db_path();
    let dir_path = binding.as_str();
    // println!("Connection Established to Database File {:?}", dir_path);
    println!("Connection Established to Database");

    return SqlitePool::connect(dir_path)
        .await
        .map_err(|e| format!("Failed to connect to database {}", e));
}

// ----------------------------------------------------- Edit SQLITE Database -----------------------------------------------------

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

pub async fn does_entry_exist(pool: &Pool<Sqlite>, path: &String) -> Result<bool, String>{

    let res: DoesExist = sqlx::query_as::<_, DoesExist>("SELECT EXISTS(SELECT 1 FROM songs WHERE path = ?) AS does_exist")
        .bind(path)
        .fetch_one(pool)
        .await
        .unwrap();

    Ok(res.does_exist)
}

pub async fn set_keep(pool: &Pool<Sqlite>) -> Result<(), String> {

    let _ = sqlx::query("UPDATE songs SET keep = ?1")
        .bind(false)
        .execute(pool)
        .await;

    Ok(())
}

// ------------------------------------ Song Functions ------------------------------------

// Get all songs from the database and all of their data
#[tauri::command]
pub async fn get_all_songs(state: State<AppState, '_>) -> Result<Vec<SongTable>, String> {

    let temp: Vec<SongTable> = sqlx::query_as::<_, SongTable>("SELECT * FROM songs ORDER BY song_section ASC, name COLLATE NOCASE ASC;")
        .fetch_all(&state.pool)
        .await
        .unwrap();

    Ok(temp)
}

// Get a single song from the database
// And all of their data
#[tauri::command(rename_all = "snake_case")]
pub async fn get_song(state: State<AppState, '_>, song_path: String) -> Result<SongTable, String> {

    let temp: SongTable = sqlx::query_as::<_, SongTable>("SELECT * FROM songs WHERE path = ?")
        .bind(&song_path)
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
pub async fn add_song(entry: SongTableUpload, pool: &Pool<Sqlite> ) -> Result<SqliteQueryResult, String> {
    
    let res: Result<SqliteQueryResult, sqlx::Error> = sqlx::query("INSERT OR IGNORE INTO songs
        (name, path, cover, release, track, album, artist, genre, album_artist, disc_number, duration, favorited, song_section, album_section, artist_section, keep) 
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)")
        .bind(&entry.name)
        .bind(&entry.path)
        .bind(&entry.cover)
        .bind(&entry.release)
        .bind(&entry.track)
        .bind(&entry.album)
        .bind(&entry.artist)
        .bind(&entry.genre)
        .bind(&entry.album_artist)
        .bind(&entry.disc)
        .bind(&entry.duration)
        .bind(false)
        .bind(&entry.song_section)
        .bind(&entry.album_section)
        .bind(&entry.artist_section)
        .bind(true)
        .execute(pool)
        .await;


    Ok(res.unwrap())
}

// Gonna be used to update values in the DB
pub async fn update_song(entry: SongTableUpload, pool: &Pool<Sqlite> ) -> Result<SqliteQueryResult, String> {
    
    let res: Result<SqliteQueryResult, sqlx::Error> = sqlx::query("UPDATE songs
        SET name = ?1, cover = ?2, release = ?3, track = ?4, album = ?5, artist = ?6, genre = ?7,
        album_artist = ?8, disc_number = ?9, duration = ?10, song_section = ?11, album_section = ?12, artist_section = ?13, keep = ?14
        WHERE path = ?15
        ")
        .bind(entry.name)
        .bind(entry.cover)
        .bind(entry.release)
        .bind(entry.track)
        .bind(entry.album)
        .bind(entry.artist)
        .bind(entry.genre)
        .bind(entry.album_artist)
        .bind(entry.disc)
        .bind(entry.duration)
        .bind(entry.song_section)
        .bind(entry.album_section)
        .bind(entry.artist_section)
        .bind(true)

        .bind(entry.path)
        .execute(pool)
        .await;

    Ok(res.unwrap())
}

#[derive(sqlx::FromRow, Default, serde::Serialize)]
struct Covers {
    cover: String
}

pub async fn remove_songs(pool: &Pool<Sqlite>) -> Result<(), String> {

    let covers_to_delete: Vec<Covers> = sqlx::query_as::<_, Covers>("SELECT cover FROM songs WHERE keep = false AND cover IS NOT NULL").fetch_all(pool).await.unwrap();

    for covers in covers_to_delete {
        let _ = fs::remove_file(covers.cover);
    }
    
    let res = sqlx::query("DELETE FROM songs WHERE keep = false")
        .execute(pool)
        .await;

    println!("{:?}", &res);

    Ok(())
}

// ------------------------------------ Album Functions ------------------------------------

#[tauri::command]
pub async fn get_all_albums(state: State<AppState, '_>) -> Result<Vec<AllAlbumResults>, String> {

    let temp: Vec<AllAlbumResults> = sqlx::query_as::<_, AllAlbumResults>(
        "SELECT album, album_artist, cover, album_section FROM songs WHERE album IS NOT NULL 
        GROUP BY album ORDER BY album_section ASC, album ASC;",
    )
    .fetch_all(&state.pool)
    .await
    .unwrap();

    Ok(temp)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_album(state: State<AppState, '_>, name: String) -> Result<Vec<SongTable>, String> {

    let temp: Vec<SongTable> = sqlx::query_as::<_, SongTable>("SELECT * FROM songs WHERE album=$1 ORDER BY disc_number ASC, track ASC;")
        .bind(name)
        .fetch_all(&state.pool)
        .await
        .unwrap();

    Ok(temp)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_albums_with_limit(state: State<AppState, '_>, limit: i64) -> Result<Vec<AllAlbumResults>, String> {

    let temp: Vec<AllAlbumResults> = sqlx::query_as::<_, AllAlbumResults>(
        "SELECT album, album_artist, cover, album_section FROM songs
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
        "SELECT DISTINCT album, album_artist, cover, album_section FROM songs WHERE album_artist=$1
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

// #[tauri::command]
// pub async fn get_all_genres() -> Result<Vec<SongTable>, String> {
//     let pool = establish_connection().await?;

//     let temp: Vec<SongTable> = sqlx::query_as::<_, SongTable>(
//         "
//         SELECT DISTINCT genre, album, artist, cover FROM songs
//         GROUP BY genre
//         ORDER BY genre ASC;",
//     )
//     .fetch_all(&pool)
//     .await
//     .unwrap();

//     Ok(temp)
// }

// #[tauri::command(rename_all = "snake_case")]
// pub async fn get_genre(name: String) -> Result<SongTable, String> {
//     let pool = establish_connection().await?;

//     let temp: SongTable = sqlx::query_as::<_, SongTable>("SELECT * FROM songs WHERE genre=$1 ORDER BY genre;")
//         .bind(name)
//         .fetch_one(&pool)
//         .await
//         .unwrap();

//     println!("id={}, album_name={}", temp.name, temp.genre);

//     Ok(temp)
// }

// ------------------------------------ Artist Functions ------------------------------------

#[tauri::command]
pub async fn get_all_artists(state: State<AppState, '_>) -> Result<Vec<AllArtistResults>, String> {

    let temp: Vec<AllArtistResults> = sqlx::query_as::<_, AllArtistResults>(
        "SELECT DISTINCT album_artist, artist_section FROM songs WHERE album_artist IS NOT NULL
        GROUP BY album_artist
        ORDER BY artist_section ASC, album_artist ASC;",
    )
    .fetch_all(&state.pool)
    .await
    .unwrap();    

    Ok(temp)
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

    let temp = sqlx::query_as::<_, PlaylistTable>("SELECT * FROM playlists ORDER BY name")
        .fetch_all(&state.pool)
        .await
        .unwrap();

    Ok(temp)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_playlist(state: State<AppState, '_>, id: i64) -> Result<PlaylistFull, String> {

    // Get the playlist
    let playlist_details: PlaylistTable = sqlx::query_as::<_, PlaylistTable>("SELECT * FROM playlists WHERE id=$1;")
        .bind(&id)
        .fetch_one(&state.pool)
        .await
        .unwrap();

    // Get the playlist tracks
    let song_arr: Vec<SongTable> = sqlx::query_as::<_, SongTable>("    
            SELECT s.name, s.path, s.album, s.artist, s.duration, s.genre, s.cover, s.release, s.album_artist, s.track, s.disc_number, s.song_section
            FROM playlist_tracks p 
            INNER JOIN songs s ON s.path = p.track_id 
            WHERE p.playlist_id = ?1 ORDER BY p.position ASC
        ")
        .bind(&id)
        .fetch_all(&state.pool)
        .await
        .unwrap();

    Ok(PlaylistFull{ id: id, name: playlist_details.name, image: playlist_details.image, songs: song_arr })
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_playlists_with_limit(state: State<AppState, '_>, limit: i64) -> Result<Vec<PlaylistTable>, String> {

    let temp: Vec<PlaylistTable> = sqlx::query_as::<_, PlaylistTable>(
        "SELECT * FROM playlists ORDER BY name ASC LIMIT $1 ORDER BY name")
        .bind(limit)
        .fetch_all(&state.pool)
        .await
        .unwrap();

    Ok(temp)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn create_playlist(state: State<AppState, '_>, name: String, songs: Vec<SongTable>, songs_to_add: bool) -> Result<(), String> {

    if songs_to_add == true {
        sqlx::query("INSERT INTO playlists (name) VALUES (?1)")
            .bind(&name)
            .execute(&state.pool)
            .await
            .unwrap();

        println!("test");

        let id: (i64,) = sqlx::query_as("SELECT id FROM playlists WHERE name=$1;")
            .bind(&name)
            .fetch_one(&state.pool)
            .await.unwrap();

        // Now add the new songs to the playlist
        let mut i = 0;
        for song in songs {
            let _ = sqlx::query("INSERT INTO playlist_tracks
                (playlist_id, track_id, position) 
                VALUES (?1, ?2, ?3)")
                .bind(&id.0)
                .bind(&song.path)
                .bind(&i)
                .execute(&state.pool).await;
            i = i + 1;
        }
    }
    else {
        sqlx::query("INSERT INTO playlists (name) VALUES (?1)")
            .bind(&name)
            .execute(&state.pool)
            .await
            .unwrap();
    } 
    Ok(())
}

// Add songs to a playlist  ---------------------- NEEDS WORK
#[tauri::command(rename_all = "snake_case")]
pub async fn add_to_playlist(state: State<AppState, '_>, songs: Vec<SongTable>, playlist_id: i64) -> Result<(), String> {

    // Get the last position of the playlist from the list
    let length: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id=$1;")
        .bind(&playlist_id)
        .fetch_one(&state.pool)
        .await.unwrap();

    // Now add the new songs to the playlist
    let mut i = length.0 + 1;
    for song in songs {
        let _ = sqlx::query("INSERT INTO playlist_tracks
            (playlist_id, track_id, position) 
            VALUES (?1, ?2, ?3)")
            .bind(&playlist_id)
            .bind(&song.path)
            .bind(&i)
            .execute(&state.pool).await;
        i = i + 1;
    }

    Ok(())
}

// Take in the new name of the playlist and update the name value of the playlist
#[tauri::command(rename_all = "snake_case")]
pub async fn rename_playlist(state: State<AppState, '_>, old_name: String, new_name: String) -> Result<(), String> {

    let _ = sqlx::query("UPDATE playlists SET name = $1 WHERE name = $2;")
    .bind(&new_name)
    .bind(&old_name)
    .execute(&state.pool)
    .await;

    let _ = sqlx::query("UPDATE playlist_tracks SET playlist_name = $1 WHERE playlist_name = $2;")
    .bind(&new_name)
    .bind(&old_name)
    .execute(&state.pool)
    .await;

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
pub async fn reorder_playlist(state: State<AppState, '_>, playlist_id: i64, songs: Vec<SongTable>) -> Result<(), String> {

    let mut i = 1;
    for item in songs {
        let _ = sqlx::query("UPDATE playlist_tracks SET position = $1 WHERE playlist_id = $2 AND track_id = $3")
            .bind(&i)
            .bind(&playlist_id)
            .bind(&item.path)
            .execute(&state.pool)
            .await;
        i += 1;
    }
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn remove_song_from_playlist(state: State<AppState, '_>, playlist_id: i64, song_path: String, songs: Vec<SongTable>) -> Result<(), String> {

    // Remove the song
    let _ = sqlx::query("DELETE FROM playlist_tracks WHERE playlist_id = $1 AND track_id = $2")
        .bind(&playlist_id)
        .bind(&song_path)
        .execute(&state.pool)
        .await;

    let mut i = 1;
    for item in songs {
        let _ = sqlx::query("UPDATE playlist_tracks SET position = $1 WHERE playlist_id = $2 AND track_id = $3")
            .bind(&i)
            .bind(&playlist_id)
            .bind(&item.path)
            .execute(&state.pool)
            .await;
        i += 1;
    }

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn remove_multiple_songs_from_playlist(state: State<AppState, '_>, playlist_id: i64, songs: Vec<SongTable>) -> Result<(), String> {

    let mut test_string: String = "DELETE FROM playlist_tracks WHERE playlist_id = ".to_string();
    
    let mut i = 0;
    test_string.push_str(&playlist_id.to_string().as_str());
    test_string.push_str(" AND track_id IN (");
    for t in &songs {
        test_string.push_str("'");
        test_string.push_str(t.path.as_str());
        test_string.push_str("'");
        
        i += 1;
        if i != songs.len() {
            test_string.push_str(", ");
        }
    }
    test_string.push_str(")");

    // Remove the songs
    let _ = sqlx::query(&test_string.as_str())
        .execute(&state.pool)
        .await;

    let res: Vec<SongTable> = sqlx::query_as::<_, SongTable>("    
            SELECT s.name, s.path, s.album, s.artist, s.duration, s.genre, s.cover, s.release, s.album_artist, s.track, s.disc_number, s.song_section
            FROM playlist_tracks p 
            INNER JOIN songs s ON s.path = p.track_id 
            WHERE p.playlist_id = ?1 ORDER BY p.position ASC
        ")
        .bind(&playlist_id)
        .fetch_all(&state.pool)
        .await
        .unwrap();

    let mut j: i64 = 1;
    for item in res {
        let _ = sqlx::query("UPDATE playlist_tracks SET position = $1 WHERE playlist_id = $2 AND track_id = $3")
            .bind(&j)
            .bind(&playlist_id)
            .bind(&item.path)
            .execute(&state.pool)
            .await;
        j += 1;
    }


    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn add_playlist_cover(state: State<AppState, '_>, file_path: String, playlist_name: String, playlist_id: i64) -> Result<(), String> {
    // First get the image file and the playlist cover directory
    let image_dir =  dirs::home_dir().unwrap().to_str().unwrap().to_string() + "/.config/robintuk_player/playlist_covers/";
    let file_type = Path::new(&file_path).extension().and_then(OsStr::to_str).unwrap();
    let new_path = image_dir.clone() + "" + &playlist_name.as_str() + "." + file_type;

    // Copy the file to the image directory
    let _ = fs::copy(&file_path, &new_path);

    let _ = sqlx::query("UPDATE playlists SET image = $1 WHERE id = $2;")
        .bind(&new_path)
        .bind(&playlist_id)
        .execute(&state.pool).await;

    Ok(())
}

// Queue DB Commands

#[tauri::command(rename_all = "snake_case")]
pub async fn get_queue(state: State<AppState, '_>, shuffled: bool) -> Result<Vec<SongTable>, String> {

    if shuffled == true {
        let list: Vec<SongTable> = sqlx::query_as::<_, SongTable>("
            SELECT q.position, s.name, s.path, s.album, s.artist, s.duration, s.genre, s.cover, s.release, s.album_artist, s.track, s.disc_number, s.song_section
            FROM queue_shuffled q 
            INNER JOIN songs s ON s.path = q.song_id ORDER BY q.position ASC").fetch_all(&state.pool).await.unwrap();
        Ok(list)
    }
    else {
        let list: Vec<SongTable> = sqlx::query_as::<_, SongTable>("
            SELECT q.position, s.name, s.path, s.album, s.artist, s.duration, s.genre, s.cover, s.release, s.album_artist, s.track, s.disc_number, s.song_section
            FROM queue q 
            INNER JOIN songs s ON s.path = q.song_id ORDER BY q.position ASC").fetch_all(&state.pool).await.unwrap();
        Ok(list)
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn create_queue(state: State<AppState, '_>, songs: Vec<SongTable>, shuffled: bool) -> Result<(), String> {
    
    
    // Remove all entries from the table - new adding a new queue
    sqlx::query("DELETE FROM queue").execute(&state.pool).await.map_err(|e| e.to_string())?;

    // Then add the new queue
    // Get the last position of the playlist from the list
    let length: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM queue").fetch_one(&state.pool).await.unwrap();

    // Now add the new songs to the playlist
    let mut i = length.0 + 1;
    for song in &songs {
        let _ = sqlx::query("INSERT INTO queue (position, song_id) VALUES (?1, ?2)")
            .bind(&i)
            .bind(&song.path)
            .execute(&state.pool).await;
        i = i + 1;
    }
    
    if shuffled == true {
        // Remove all entries from the table - new adding a new queue
        sqlx::query("DELETE FROM queue_shuffled").execute(&state.pool).await.map_err(|e| e.to_string())?;

        // Then add the new queue
        // Get the last position of the playlist from the list
        let length: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM queue_shuffled").fetch_one(&state.pool).await.unwrap();

        // Now add the new songs to the playlist
        i = length.0 + 1;
        for song in &songs {
            let _ = sqlx::query("INSERT INTO queue_shuffled (position, song_id) VALUES (?1, ?2)")
                .bind(&i)
                .bind(&song.path)
                .execute(&state.pool).await;
            i = i + 1;
        }
    }
    

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn add_to_queue(state: State<AppState, '_>, songs: Vec<SongTable>) -> Result<(), String> {
    
    // Get the last position of the playlist from the list
    let length: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM queue")
        .fetch_one(&state.pool)
        .await.unwrap();

    // Now add the new songs to the playlist
    let mut i = length.0 + 1;
    for song in &songs {
        let _ = sqlx::query("INSERT INTO queue
            (position, song_id) 
            VALUES (?1, ?2)")
            .bind(&i)
            .bind(&song.path)
            .execute(&state.pool).await;
        i = i + 1;
    }

    // Now update the shuffled queue as well

    // Get the last position of the playlist from the list
    let length_shuff: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM queue_shuffled").fetch_one(&state.pool).await.unwrap();

    // Now add the new songs to the playlist
    i = length_shuff.0 + 1;
    for song in &songs {
        let _ = sqlx::query("INSERT INTO queue_shuffled (position, song_id) VALUES (?1, ?2)")
            .bind(&i)
            .bind(&song.path)
            .execute(&state.pool).await;
        i = i + 1;
    }
    

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn clear_queue(state: State<AppState, '_>) -> Result<(), String> {
    
    sqlx::query("DELETE FROM queue").execute(&state.pool).await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM queue_shuffled").execute(&state.pool).await.map_err(|e| e.to_string())?;

    Ok(())
}



// Create a history of songs played -- no idea what for yet
#[tauri::command(rename_all = "snake_case")]
pub async fn add_song_to_history(state: State<AppState, '_>, path: String) -> Result<(), String> {
    let history: History = History {
        id: Utc::now().timestamp_millis().to_string(),
        date_played: Utc::now(),
        song_id: path,
    };

    // Remove the song from the history if it is in the history, no repeats
    let _ = sqlx::query("DELETE FROM history WHERE song_id = ?")
    .bind(&history.song_id)
    .execute(&state.pool)
    .await;
    
    let _ = sqlx::query("INSERT INTO history (id, created_at, song_id) VALUES (?1, ?2, ?3)")
        .bind(history.id)
        .bind(history.date_played.to_rfc3339())
        .bind(history.song_id)
        .execute(&state.pool)
        .await;

    let _ = sqlx::query("DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY created_at DESC LIMIT 100)")
        .execute(&state.pool)
        .await;

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_play_history(state: State<AppState, '_>, limit: i64) -> Result<Vec<SongHistory>, String> {
    if limit == -1 {
        let history: Vec<SongHistory> = sqlx::query_as::<_, SongHistory>("
            SELECT h.id, s.name, s.path, s.album, s.artist, s.duration, s.genre, s.cover, s.release, s.album_artist, s.track, s.disc_number, s.song_section
            FROM history h 
            INNER JOIN songs s ON s.path = h.song_id ORDER BY h.id DESC")
        .fetch_all(&state.pool)
        .await.unwrap();

        Ok(history)
    }
    else {

        let history: Vec<SongHistory> = sqlx::query_as::<_, SongHistory>("
            SELECT h.id, s.name, s.path, s.album, s.artist, s.duration, s.genre, s.cover, s.release, s.album_artist, s.track, s.disc_number, s.song_section
            FROM history h 
            INNER JOIN songs s ON s.path = h.song_id ORDER BY h.id DESC LIMIT $1")
        .bind(limit)
        .fetch_all(&state.pool)
        .await.unwrap();

        Ok(history)        
    }    
}

