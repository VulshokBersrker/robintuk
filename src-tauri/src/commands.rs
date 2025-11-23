use crate::{ AppState, db, types::{GetCurrentSong, GetPlaylistList, SongTable} };
use tauri::{Emitter, State};

// -------------------------- Media Player Commands --------------------------

// Queue Commands

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

#[tauri::command]
pub fn player_get_queue_length(state: State<AppState, '_>) -> Result<usize, String> {
    let q_length = state.player.lock().unwrap().get_queue_length();    
    Ok(q_length)
}

// Media Control Commands

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

// Event Listener Commands
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
