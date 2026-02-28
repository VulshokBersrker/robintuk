// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};
use rodio::{OutputStream, Sink, OutputStreamBuilder};
use tauri_plugin_prevent_default::Flags;
use tauri::{Builder, Manager, Emitter};
use std::{path::Path, sync::{Arc, Mutex}};
use tokio::runtime::Runtime;
use sqlx::{Pool, Sqlite, prelude::FromRow};
use tauri::{State};

// Import files
mod commands;
mod helper;
mod types;
mod music;
mod db;

use crate::{
    db::establish_connection,
    helper::get_song_data, music::MusicPlayer,  
    types::{SongTableUpload, GetCurrentSong}
};

pub struct AppState {
    player:  Arc<Mutex<MusicPlayer>>,
    pool: Pool<Sqlite>,
    is_scan_ongoing: Mutex<bool>,
    is_back_restore_ongoing: Mutex<i64>,
    is_lyric_scan_ongoing: Mutex<bool>
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
        // .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
        //     println!("{}, {argv:?}, {cwd}", app.package_info().name);
        //     app.emit("single-instance", Payload { args: argv, cwd }).unwrap();
        // }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_prevent_default::Builder::new().with_flags(Flags::all().difference(Flags::CONTEXT_MENU)).build())
        .setup(|app: &mut tauri::App| {
            
            app.manage(AppState { player,
                pool,
                is_scan_ongoing: Mutex::new(false),
                is_back_restore_ongoing: Mutex::new(0),
                is_lyric_scan_ongoing: Mutex::new(false)
            });

            #[cfg(windows)]
            {
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new().with_shortcuts(["MediaPlayPause", "MediaTrackNext", "MediaTrackPrevious"])?
                    .with_handler(move |_app, shortcut, event| {

                        if event.state == ShortcutState::Pressed {
                            let app_clone = _app.state::<AppState>().clone();
                            let mut player = app_clone.player.lock().unwrap();
                            
                            if shortcut.matches(Modifiers::FN, Code::MediaPlayPause) {
                                if player.check_is_paused() {
                                    player.play_song();
                                    let _ = _app.emit("controls-play-pause", true);
                                }
                                else {
                                    player.pause_song();
                                    let _ = _app.emit("controls-play-pause", false);
                                }                                
                            }
                            if shortcut.matches(Modifiers::FN, Code::MediaTrackNext) {
                                if player.check_is_loaded() {
                                    player.next_song();
                                    let q = player.get_current_song();
                                    if q.is_ok() {
                                        let _ = _app.emit("get-current-song", GetCurrentSong { q: q.unwrap() });
                                    }
                                    
                                }                                
                            }
                            if shortcut.matches(Modifiers::FN, Code::MediaTrackPrevious) {
                                if player.check_is_loaded() {
                                    player.previous_song();
                                    let q = player.get_current_song();
                                    if q.is_ok() {
                                        let _ = _app.emit("get-current-song", GetCurrentSong { q: q.unwrap() });
                                    }
                                }
                            }
                        }
                    })
                    .build(),
                )?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::check_for_new_version,
            // Song Functions - SQLite
            db::get_songs_with_limit,
            db::get_all_songs,
            db::get_song,
            // Album Functions - SQLite
            db::get_albums_with_limit,
            db::get_all_albums,
            db::get_album,
            // Artist Functions - SQLite
            db::get_albums_by_artist,
            db::get_all_artists,
            db::get_artist,
            // Genre Function - SQLite
            db::get_albums_by_genre,
            db::get_all_genres,
            db::get_genre,
            // Playlist Functions - SQLite
            db::get_playlists_with_limit,
            db::get_all_playlists,
            db::add_to_playlist,
            db::get_playlist,
            db::rename_playlist,
            db::reorder_playlist,
            db::create_playlist,
            db::delete_playlist,
            db::remove_song_from_playlist,
            db::remove_multiple_songs_from_playlist,
            db::add_playlist_cover, // Custom Playlist artwork
            // History Functions
            db::add_song_to_history,
            db::get_play_history,
            // -- Media Player Functions
            commands::play_song,
            commands::play_album,
            commands::play_playlist,
            commands::play_artist,
            commands::play_genre,
            commands::play_selection,
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
            commands::player_clear_queue,
            commands::shuffle_queue,
            commands::player_update_pos,
            db::get_queue,
            db::add_to_queue,
            db::clear_queue,
            // Other Media Player Functions
            commands::player_get_song_pos,
            commands::player_check_repeat,
            commands::player_get_current_song,
            commands::player_set_repeat_mode,
            commands::player_stop,
            commands::player_get_sink_length,
            // Event Caller Functions
            commands::update_current_song_played,
            commands::new_playlist_added,
            commands::set_shuffle_mode,
            // Lyrics Functions
            db::get_lyrics,
            commands::scan_for_lyrics,
            commands::check_for_single_lyrics,
            commands::cancel_lyrics_scan,
            // Settings Functions
            scan_directory,
            db::get_directory,
            db::add_directory,
            db::remove_directory,   
            db::get_settings,
            db::set_theme,
            commands::create_backup,
            commands::check_for_backup,
            commands::check_for_backup_restore,
            commands::use_restore,
            commands::check_for_ongoing_scan,
            commands::import_playlist,
            commands::export_playlist,
            db::reset_database,
            scan_for_deleted
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
    pub updated: i64,
    pub error: i64,
    pub error_dets: Vec<ErrorInfo>,
}

#[derive(serde::Serialize)]
struct ErrorInfo {
    file_name: String,
    error_type: String
}

#[derive(Debug)]
pub struct SongDataResults {
    pub song_data: SongTableUpload,
    pub error_details: String,
}

#[derive(Clone, serde::Serialize)]
struct ScanProgress {
    length: usize,
    current: i32
}

#[derive(Clone, serde::Serialize)]
pub struct GetScanStatus {
  pub res: bool
}

// use the path value to check, since that is a unique value in each entry (files cannot share paths)
#[tauri::command]
async fn scan_directory(state: State<AppState, '_>, app: tauri::AppHandle) -> Result<ScanResults, String> {
    let mut error_details: Vec<ErrorInfo> = Vec::new();
    // Keep track of how many entires pass or fail
    let mut num_added = 0;
    let mut num_error = 0;
    let mut num_updated = 0;

    let mut scan_length = 0;
    let mut num_scanned = 0;

    let directories = db::get_directory().await.unwrap();
    let second_state  = state.clone();
    
    app.emit("scan-started", GetScanStatus { res: *second_state.is_scan_ongoing.lock().unwrap()}).unwrap();
    println!("Scan has started");

    if *second_state.is_scan_ongoing.lock().unwrap() {
        num_error += 1;
        error_details.push(ErrorInfo {
            file_name: "".to_string(),
            error_type: "Scan is ongoing".to_string(),
        });
    }
    else {
        *second_state.is_scan_ongoing.lock().unwrap() = true;
        let _ = db::set_keep(&state.pool).await;
        
        for p in &directories {
            let t = jwalk::WalkDir::new(p.dir_path.clone()).into_iter().filter_map(|e| e.ok()).filter(|x|
                x.path().display().to_string().contains(".mp3")
                || x.path().display().to_string().contains(".flac")
                || x.path().display().to_string().contains(".m4a")
                || x.path().display().to_string().contains(".aiff")
                || x.path().display().to_string().contains(".ogg")
            ).count();
            scan_length += t;
        }

        app.emit("scan-length", ScanProgress {length: scan_length, current: 0}).unwrap();

        let (tx, rx) = flume::unbounded();        
        let pool = threadpool::ThreadPool::new(10);
       
        for path in directories {
            let tx1 = tx.clone();
            pool.execute(move || {
                // walk through the entire directory, sub folders and all
                for entry in jwalk::WalkDir::new(path.dir_path).into_iter().filter_map(|e| e.ok()).filter(|x| x.file_type().is_file())  {
                    // if the files are music files (For now only grab mp3 and wav files \ flac to be added later)
                    if entry.path().display().to_string().contains(".mp3") || entry.path().display().to_string().contains(".flac") || entry.path().display().to_string().contains(".m4a")
                        || entry.path().display().to_string().contains(".aiff") || entry.path().display().to_string().contains(".ogg")
                    {
                        tx1.send(entry.path().display().to_string()).unwrap();
                    }
                }
            });
        }
       
        for received in rx.iter() {
            let does_exist = db::does_entry_exist(&state.pool, &received).await.unwrap();

            let song_res = get_song_data(received).await;

            if song_res.is_ok() {
                if does_exist {
                    let _ = db::update_song(song_res.unwrap().song_data, &state.pool).await;
                    num_updated += 1;
                }
                else {
                    let res = song_res.unwrap();
                    if res.error_details.contains(" ") {
                        let _ = db::add_song(res.song_data, &state.pool).await;
                        num_added += 1;
                    }
                }
            }
            else {
                let _ = song_res.inspect_err(|e| println!("Error reading metadata: {:?}", e));
                num_error += 1;
            }

            num_scanned += 1;
            if num_scanned % 25 == 0 {
                app.emit("scan-length", ScanProgress {length: scan_length, current: num_scanned}).unwrap();
            }

            if rx.is_empty() {
                break;
            }
        }
    }

    *second_state.is_scan_ongoing.lock().unwrap() = false;
    app.emit("scan-length", ScanProgress {length: scan_length, current: num_scanned}).unwrap();
     
    // Remove all songs that are no longer in the directories - When there were no errors
    if num_error == 0 {
        let _ = db::remove_songs(&state.pool).await.unwrap();
    }

    app.emit("scan-finished", GetScanStatus { res: false}).unwrap(); 

    println!("Scan has finished = {:?} added - {:?} updated - {:?} errors", &num_added, &num_updated, &num_error);
    
    // At the end, will return the number of successes and failures
    Ok(ScanResults {
        success: num_added,
        updated: num_updated,
        error: num_error,
        error_dets: error_details,
    })
}


#[derive(serde::Serialize, FromRow)]
struct SongPath {
    path: String
}

#[tauri::command]
async fn scan_for_deleted(state: State<AppState, '_>, app: tauri::AppHandle) -> Result<(), String> {

    let songs: Vec<SongPath> = sqlx::query_as::<_, SongPath>("SELECT path FROM songs")
        .fetch_all(&state.pool)
        .await.unwrap();

    for entry in songs {
        // Check if path exists
        if Path::new(&entry.path).exists() == false {
            let _ = sqlx::query("DELETE FROM songs WHERE path = $1")
                .bind(&entry.path)
                .execute(&state.pool)
                .await;
        }

    }    
    app.emit("remove-song", false).unwrap();
    Ok(())
}