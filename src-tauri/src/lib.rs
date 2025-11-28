// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};

use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};
use rodio::{OutputStream, Sink, OutputStreamBuilder};
use sqlx::{Pool, Sqlite};
use tokio::runtime::Runtime;
use walkdir::WalkDir;
use tauri::{Builder, Manager, Emitter};

// Import files
mod commands;
mod helper;
mod types;
mod music;
mod db;

use crate::{
    db::establish_connection,
    helper::get_song_data, music::MusicPlayer,  
    types::{SongTableUpload}
};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet() -> String {
    format!("Thank you for using my music player! =D")
}


// #[derive(Clone, serde::Serialize)]
// struct Payload {
//     args: Vec<String>,
//     cwd: String,
// }

pub struct AppState {
    player:  Arc<Mutex<MusicPlayer>>,
    pool: Pool<Sqlite>,
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), String> {
    db::init();

    let stream_handle: OutputStream = OutputStreamBuilder::open_default_stream().expect("open default audio stream");
    let sink = Sink::connect_new(&stream_handle.mixer());
    let player = Arc::new(Mutex::new(MusicPlayer::new(sink)?));
    // Generate the pool for the database, so it can be reused
    let pool: Pool<Sqlite> = Runtime::new().unwrap().block_on(establish_connection())?;

    Builder::default()
        // .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_cache::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app: &mut tauri::App| {
            
            app.manage(AppState { player, pool });

            #[cfg(desktop)]
            {
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new().with_shortcuts(["MediaPlayPause", "MediaTrackNext", "MediaTrackPrevious"])?
                    .with_handler(move |_app, shortcut, event| {
                        // println!("{:?}", shortcut);
                        if event.state == ShortcutState::Pressed {
                            if shortcut.matches(Modifiers::FN, Code::MediaPlayPause) {
                                let _ = _app.emit("controls-play-pause", "test");
                            }
                            if shortcut.matches(Modifiers::FN, Code::MediaTrackNext) {
                                let _ = _app.emit("controls-next-song", "test");
                            }
                            if shortcut.matches(Modifiers::FN, Code::MediaTrackPrevious) {
                                let _ = _app.emit("controls-prev-song", "test");
                            }
                        }
                    })
                    .build(),
                )?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            scan_directory,
            // Music Directory Functions - SQLITE
            db::get_directory,
            db::add_directory,
            db::remove_directory,
            // Song Functions - SQLITE
            db::get_songs_with_limit,
            db::get_all_songs,
            db::get_song_by_path,
            db::get_song,
            // Album Functions - SQLITE
            db::get_albums_with_limit,
            db::get_all_albums,
            db::get_album,
            // Genre Functions - SQLITE
            db::get_all_genres,
            db::get_genre,
            // Artist Functions - SQLITE
            db::get_albums_by_artist,
            db::get_all_artists,
            db::get_artist,
            // Playlist Functions - SQLITE
            db::get_playlists_with_limit,
            db::get_all_playlists,
            db::add_to_playlist,
            db::get_playlist,
            db::rename_playlist,
            db::reorder_playlist,
            db::create_playlist,
            db::delete_playlist,
            db::add_playlist_cover, // Custom Playlist artwork
            // Media Player Functions
            // Standard Media Functions
            commands::player_play,
            commands::player_pause,
            commands::player_set_seek,
            commands::player_set_current,
            commands::player_is_paused,
            commands::player_load_song,
            commands::player_next_song,
            commands::player_previous_song,
            commands::player_set_volume,
            // Queue Functions
            commands::player_setup_queue_and_song,
            commands::player_add_to_queue,
            commands::player_set_queue,
            commands::player_get_queue,
            commands::player_load_album,
            commands::player_get_queue_length,
            commands::player_get_current_position,
            commands::player_update_queue_and_pos,
            // Other Media Player Functions
            commands::player_get_song_pos,
            commands::player_check_repeat,
            commands::player_get_current_song,
            commands::player_set_repeat_mode,
            commands::player_stop,
            // Event Caller Functions
            commands::update_current_song_played,
            commands::new_playlist_added,
            commands::set_shuffle_mode
        ])        
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    Ok(())
}

// ---------------------------------------- SCAN DIRECTORY AND SONG METADATA FUNCTIONS ----------------------------------------

// this derive changes the format to JSON for React
#[derive(serde::Serialize)]
struct ScanResults {
    pub success: i64,
    pub error: i64,
    pub error_dets: Vec<ErrorInfo>,
}

#[derive(serde::Serialize)]
struct ErrorInfo {
    file_name: String,
    error_type: String,
}

#[derive(Debug)]
pub struct SongDataResults {
    pub song_data: SongTableUpload,
    pub error_details: String,
}

// This function needs to be expanded to include a skipping a file if it already exists in the database
// use the path value to check, since that is a unique value in each entry (files cannot share paths)

#[tauri::command]
async fn scan_directory() -> Result<ScanResults, String> {
    let mut error_details: Vec<ErrorInfo> = Vec::new();
    // Keep track of how many entires pass or fail
    let mut num_added = 0;
    let mut num_error = 0;

    let pool = establish_connection().await?;

    let directories = db::get_directory().await.unwrap();

    // Run the loop for every directory selected in the dirs table
    for path in directories {
        // walk through the entire directory, sub folders and all
        for entry in WalkDir::new(path.dir_path).into_iter().filter_map(|e| e.ok())  {
            // Grab the metadata for each folder/file in the directory
            let metadata: std::fs::Metadata = entry.metadata().map_err(|e| e.to_string())?;

            // If this entry is a file
            if metadata.is_file() {
                //  ---------- Here we will check if the value already exists inside the database (if exists, check for differences, if no difs: skip)

                // Use the size of the file for hashing the album artwork (if the song has no album name)
                let size: u64 = metadata.len();

                // if the files are music files (For now only grab mp3 and wav files \ flac to be added later)
                if entry.path().display().to_string().contains(".mp3")
                    || entry.path().display().to_string().contains(".wav")
                    || entry.path().display().to_string().contains(".flac")
                {
                    let song_res = get_song_data(entry.path().display().to_string(), size).await;

                    // If the was no error getting the song metadata
                    if song_res.is_ok() {
                        let res = db::add_song(song_res.unwrap().song_data, &pool).await;
                        // If the song was added with no errors
                        if res.is_ok() {
                            num_added += 1;
                        }
                        // If there was an error adding the song to the db
                        else {
                            num_error += 1;
                            error_details.push(ErrorInfo {
                                file_name: entry.path().display().to_string(),
                                error_type: res.unwrap().last_insert_rowid().to_string(),
                            });
                        }
                    }
                    // If there was an error getting the song metadata
                    else {
                        let res = song_res.unwrap();
                        num_error += 1;
                        error_details.push(ErrorInfo {
                            file_name: entry.path().display().to_string(),
                            error_type: res.error_details,
                        });
                        continue;
                    }
                }
            }
        }
    }

    // println!("\n Added {} song(s) - Errors on {} song(s)", num_added, num_error );

    // At the end, will return the number of successes and failures
    Ok(ScanResults {
        success: num_added,
        error: num_error,
        error_dets: error_details,
    })
}
