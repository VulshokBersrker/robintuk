use crate::{ AppState, db, helper, types::{GetCurrentSong, GetPlaylistList, SongTable} };
use zip::{ZipArchive, ZipWriter, write::SimpleFileOptions};
use std::{fs::{self, File}, io::Read, path::Path};
use tauri::{Emitter, State};
use std::path::{PathBuf};
use walkdir::WalkDir;
use std::io::Write;
use std::{io};

// -------------------------- Media Player Commands --------------------------


// ----------------- Queue Commands

#[tauri::command]
pub fn player_set_queue(state: State<AppState, '_>, queue: Vec<SongTable>) -> Result<(), String> {
    state.player.lock().unwrap().set_queue(queue);
    Ok(())
}

#[tauri::command]
pub fn player_get_queue(state: State<AppState, '_>) -> Result<Vec<SongTable>, String> {
    let q: Vec<SongTable> = state.player.lock().unwrap().get_current_queue().to_vec();
    Ok(q)
}

#[tauri::command]
pub fn player_add_to_queue(state: State<AppState, '_>, queue: Vec<SongTable>) -> Result<(), String> {
    state.player.lock().unwrap().add_to_queue(queue);
    Ok(())
}

#[tauri::command]
pub fn player_setup_queue_and_song(state: State<AppState, '_>, queue: Vec<SongTable>, index: usize) -> Result<(), String> {
    state.player.lock().unwrap().set_queue(queue);
    let _ = state.player.lock().unwrap().load_song(index);

    Ok(())
}

#[tauri::command]
pub fn player_get_queue_length(state: State<AppState, '_>) -> Result<usize, String> {
    let q_length = state.player.lock().unwrap().get_queue_length();    
    Ok(q_length)
}

#[tauri::command]
pub fn player_update_queue_and_pos(state: State<AppState, '_>, queue: Vec<SongTable>, index: usize) -> Result<(), String>  {
    state.player.lock().unwrap().set_queue(queue);
    let _ = state.player.lock().unwrap().update_current_index(index);

    Ok(())
}

#[tauri::command]
pub fn player_clear_queue(app: tauri::AppHandle, state: State<AppState, '_>) -> Result<(), String>  {
    state.player.lock().unwrap().clear_queue();

    let _ = app.emit("queue-cleared", true);

    Ok(())
}

#[tauri::command]
pub fn player_load_album(state: State<AppState, '_>, queue: Vec<SongTable>, index: usize) -> Result<(), String> {
    state.player.lock().unwrap().set_queue(queue);
    let _ = state.player.lock().unwrap().load_song(index);
    state.player.lock().unwrap().play_song();

    Ok(())
}

#[tauri::command]
pub fn player_load_song(state: State<AppState, '_>, index: usize) -> Result<(), String> {
    state.player.lock().unwrap().load_song(index)?;
    Ok(())
}

#[tauri::command]
pub fn player_get_current_song(state: State<AppState, '_>) -> Result<SongTable, String> {
    let current_song = state.player.lock().unwrap().get_current_song();    
    Ok(current_song)
}

#[tauri::command]
pub fn player_get_current_position(state: State<AppState, '_>) -> Result<usize, String> {
    let current_position = state.player.lock().unwrap().get_current_position();    
    Ok(current_position)
}


// ----------------- Play Commands

#[tauri::command(rename_all = "snake_case")]
pub async fn shuffle_queue(state: State<AppState, '_>, song: String, shuffled: bool) -> Result<(), String> {
    let mut q = db::get_queue(state.clone(), false).await.unwrap();

    if shuffled {
        helper::shuffle(&mut q);
        let index = q.iter().position(|r| r.path == song).unwrap();
        let _ = player_update_queue_and_pos(state.clone(), q.clone(), index);
        let _ = db::create_queue_shuffled(state.clone(), &q).await;   
    }
    else {
        let index = q.iter().position(|r| r.path == song).unwrap();
        let _ = player_update_queue_and_pos(state.clone(), q, index);
    }
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn play_playlist(state: State<AppState, '_>, app: tauri::AppHandle, playlist_id: i64, index: usize, shuffled: bool) -> Result<(), String> {

    let mut playlist = db::get_playlist(state.clone(), playlist_id).await.unwrap().songs;
    let q = playlist.clone();

    if shuffled {
        helper::shuffle(&mut playlist);
        let _ = player_load_album(state.clone(), playlist.clone(), index);
        update_current_song_played(state.clone(), app);
        let _ = db::create_queue_shuffled(state.clone(), &playlist).await;      
        let _ = db::create_queue(state.clone(), &q).await;
    }
    else {
        let _ = player_load_album(state.clone(), q.clone(), index);
        update_current_song_played(state.clone(), app);
        let _ = db::create_queue(state.clone(), &q).await;
    }    

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn play_album(state: State<AppState, '_>, app: tauri::AppHandle, album_name: String, index: usize, shuffled: bool) -> Result<(), String> {

    let mut album: Vec<SongTable> = sqlx::query_as::<_, SongTable>("SELECT * FROM songs WHERE album=$1 ORDER BY disc_number ASC, track ASC;")
        .bind(album_name)
        .fetch_all(&state.pool)
        .await
        .unwrap();

    let q = album.clone();

    if shuffled {
        helper::shuffle(&mut album);
        let _ = player_load_album(state.clone(), album.clone(), index);
        update_current_song_played(state.clone(), app);
        let _ = db::create_queue_shuffled(state.clone(), &album).await;  
        let _ = db::create_queue(state.clone(), &q).await;      
    }
    else {
        let _ = player_load_album(state.clone(), q.clone(), index);
        update_current_song_played(state.clone(), app);
        let _ = db::create_queue(state.clone(), &q).await;
    }    

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn play_song(state: State<AppState, '_>, app: tauri::AppHandle, song: SongTable) -> Result<(), String> {

    let arr = vec![song];
    
    let _ = player_load_album(state.clone(), arr.clone(), 0);
    update_current_song_played(state.clone(), app);
    let _ = db::create_queue(state.clone(), &arr).await;
    
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn play_artist(state: State<AppState, '_>, app: tauri::AppHandle, album_artist: String, shuffled: bool) -> Result<(), String> {

    let mut songs: Vec<SongTable> = db::get_artist_songs(state.clone(), album_artist).await.unwrap();
    let q = songs.clone();

    if shuffled {
        helper::shuffle(&mut songs);
        let _ = player_load_album(state.clone(), songs.clone(), 0);
        update_current_song_played(state.clone(), app);
        let _ = db::create_queue_shuffled(state.clone(), &songs).await;    
        let _ = db::create_queue(state.clone(), &q).await;    
    }
    else {
        let _ = player_load_album(state.clone(), q.clone(), 0);
        update_current_song_played(state.clone(), app);
        let _ = db::create_queue(state.clone(), &q).await;
    }
    
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn play_selection(state: State<AppState, '_>, app: tauri::AppHandle, songs: Vec<SongTable>, shuffled: bool) -> Result<(), String> {

    let mut arr = songs;
    let q = arr.clone();    

    if shuffled {
        helper::shuffle(&mut arr);
        let _ = player_load_album(state.clone(), arr.clone(), 0);
        update_current_song_played(state.clone(), app);
        let _ = db::create_queue_shuffled(state.clone(), &arr).await;   
        let _ = db::create_queue(state.clone(), &q).await;    
    }
    else {
        let _ = player_load_album(state.clone(), q.clone(), 0);
        update_current_song_played(state.clone(), app);
        let _ = db::create_queue(state.clone(), &q).await;
    }
    
    Ok(())
}


// ----------------- Media Control Commands

#[tauri::command]
pub fn player_play(state: State<AppState, '_>) -> Result<(), String> {
    state.player.lock().unwrap().play_song();
    Ok(())
}

#[tauri::command]
pub fn player_pause(state: State<AppState, '_>) -> Result<(), String> {
    state.player.lock().unwrap().pause_song();
    Ok(())
}

#[tauri::command]
pub fn player_stop(state: State<AppState, '_>) -> Result<(), String> {
    state.player.lock().unwrap().stop_song();
    Ok(())
}

#[tauri::command]
pub fn player_set_current(state: State<AppState, '_>, index: usize) -> Result<(), String> {
    state.player.lock().unwrap().update_current_index(index)?;

    Ok(())
}

#[tauri::command]
pub fn player_is_paused(state: State<AppState, '_>) -> Result<bool, String> {
    let res = state.player.lock().unwrap().check_is_paused();
    Ok(res)
}

#[tauri::command]
pub fn player_check_repeat(state: State<AppState, '_>) -> Result<i64, String> {
    let res = state.player.lock().unwrap().check_repeat_mode();
    Ok(res)
}

#[tauri::command]
pub fn player_set_repeat_mode(state: State<AppState, '_>, mode: i64) -> Result<(), String> {
    state.player.lock().unwrap().set_repeat_mode(mode);
    Ok(())
}

#[tauri::command]
pub fn player_set_volume(state: State<AppState, '_>, volume: f32) -> Result<(), String> {
    state.player.lock().unwrap().set_volume(volume);
    Ok(())
}

#[tauri::command]
pub fn player_set_seek(state: State<AppState, '_>, pos: u64) -> Result<(), String> {
    state.player.lock().unwrap().seek(pos);
    Ok(())
}

#[tauri::command]
pub fn player_next_song(state: State<AppState, '_>) -> Result<(), String> {
    state.player.lock().unwrap().next_song();
    Ok(())
}

#[tauri::command]
pub fn player_previous_song(state: State<AppState, '_>) -> Result<(), String> {
    state.player.lock().unwrap().previous_song();
    Ok(())
}

#[tauri::command]
pub fn player_get_song_pos(state: State<AppState, '_>) -> Result<(), String> {
    state.player.lock().unwrap().get_song_pos();
    Ok(())
}


// ----------------- Event Listener Commands
#[tauri::command]
pub fn update_current_song_played(state: State<AppState, '_>, app: tauri::AppHandle) {
    // Tell the music controls that there is a new song to look at
    let q =  state.player.lock().unwrap().get_current_song();

    app.emit("get-current-song", GetCurrentSong { q }).unwrap();
}

#[tauri::command]
pub async fn new_playlist_added(state: State<AppState, '_>, app: tauri::AppHandle) -> Result<(), String> {
    // Tell the music controls that there is a new song to look at
    let q =  db::get_all_playlists(state).await.unwrap();

    app.emit("new-playlist-created", GetPlaylistList { playlist: q }).unwrap();
    Ok(())
}

#[tauri::command]
pub fn set_shuffle_mode(app: tauri::AppHandle, mode: bool) {
    app.emit("player-shuffle-mode", mode).unwrap();
}


#[tauri::command]
pub async fn check_for_ongoing_scan(state: State<AppState, '_>) -> Result<bool, String> {
    Ok(*state.is_scan_ongoing.lock().unwrap())
}

// 0 - No Backup or Restore, 1 - Backup ongoing, 2 - Restore ongoing
#[tauri::command]
pub async fn check_for_backup_restore(state: State<AppState, '_>) -> Result<i64, String> {
    Ok(*state.is_back_restore_ongoing.lock().unwrap())
}

// ----------------- Backup and Restore Functions for the DB and images
#[tauri::command]
pub async fn create_backup(state: State<AppState, '_>, app: tauri::AppHandle) -> Result<(), String> {
    let test  = state.clone();
    // Make sure there is no scan going on, to prevent breaks in the DB
    let scan = check_for_ongoing_scan(state).await.unwrap();

    if scan == false {
        println!("Creating backup file...");
        
        *test.is_back_restore_ongoing.lock().unwrap() = 1;

        let backup_path = dirs::home_dir().unwrap().to_str().unwrap().to_string() + "/.config/robintuk_backup.zip"; 
        let zip_file_path = File::create(&backup_path).unwrap();

        let mut zip = ZipWriter::new(zip_file_path);

        let test_string = dirs::home_dir().unwrap().to_str().unwrap().to_string() + "/.config/";
        let prefix = Path::new(&test_string);
        let mut buffer = Vec::new();

        for entry in WalkDir::new(dirs::home_dir().unwrap().to_str().unwrap().to_string() + "/.config/robintuk_player/").into_iter().filter_map(|e| e.ok()) {

            let item = entry.path().display().to_string();
            let path = Path::new(&item);
            let name = path.strip_prefix(prefix).unwrap();
            let path_as_string = name.to_str().map(str::to_owned).unwrap();

            if entry.metadata().unwrap().is_file() {
                // println!("adding file {path:?} as {name:?} ...");
                zip.start_file(path_as_string, SimpleFileOptions::default()).unwrap();
                let mut f = File::open(path).unwrap();

                f.read_to_end(&mut buffer).unwrap();
                zip.write_all(&buffer).unwrap();
                buffer.clear();
            }
            // Is a folder
            else {
                // println!("adding dir {path_as_string:?} as {name:?} ...");
                zip.add_directory(path_as_string, SimpleFileOptions::default()).unwrap();
            }        
        }
        zip.finish().unwrap();
    }
    
    println!("...Files successfully zipped");
    *test.is_back_restore_ongoing.lock().unwrap() = 0;
    app.emit("ending-backup", false).unwrap();
    Ok(())
}

#[tauri::command]
pub async fn check_for_backup() -> Result<bool, String> {
    let backup_path = dirs::home_dir().unwrap().to_str().unwrap().to_string() + "/.config/robintuk_backup.zip";
    Ok(Path::new(&backup_path).try_exists().unwrap())
}

#[tauri::command]
pub async fn use_restore(state: State<AppState, '_>, app: tauri::AppHandle) -> Result<(), String> {
    let test  = state.clone();
    // Make sure there is no scan going on, to prevent breaks in the DB
    let scan = check_for_ongoing_scan(state).await.unwrap();    

    if scan == false {
        println!("Restoring from backup...");        
        *test.is_back_restore_ongoing.lock().unwrap() = 2;

        let backup_path = dirs::home_dir().unwrap().to_str().unwrap().to_string() + "/.config/robintuk_backup.zip";

        if PathBuf::from(&backup_path).exists() {
            let fname = Path::new(&backup_path);
            let reader: File = fs::File::open(fname).unwrap();
            let mut archive = ZipArchive::new(reader).unwrap();

            for i in 0..archive.len() {
                let mut file = archive.by_index(i).unwrap();

                let outpath = match file.enclosed_name() {
                    Some(path) => path,
                    None => continue,
                };

                if file.is_dir() {
                    let outpath_full = dirs::home_dir().unwrap().to_str().unwrap().to_string() + "/.config/" + outpath.display().to_string().as_str();
                    // println!("File {:?} extracted to {:?}", i, outpath_full);
                    fs::create_dir_all(&outpath_full).unwrap();
                }
                else {
                    let outpath_full = dirs::home_dir().unwrap().to_str().unwrap().to_string() + "/.config/" + outpath.display().to_string().as_str();
                    // println!("File {:?} extracted to {:?} - {:?} bytes", i, outpath_full, file.size());
                    
                    if let Some(p) = outpath.parent() {
                        if !p.exists() {
                            fs::create_dir_all(p).unwrap();
                        }
                    }
                    let mut outfile = File::create(&outpath_full).unwrap();
                    io::copy(&mut file, &mut outfile).unwrap();
                }
            }

            app.emit("ending-restore", false).unwrap();
        }
        else {
            println!("There is no backup file");
        }
    }
    *test.is_back_restore_ongoing.lock().unwrap() = 0;

    Ok(())
}