use std::{ fs::File, io::BufReader, time };
use rodio::{ Decoder, Sink };

use crate::{ types::SongTable };

pub struct MusicPlayer {
    pub sink: Sink,
    pub position: usize,
    pub repeat_mode: i64,
    pub queue: Vec<SongTable>
}

impl MusicPlayer {
    pub fn new(sink: Sink) -> Result<Self, String> {
        sink.pause();

        Ok(Self{
            sink,
            position: 0,
            repeat_mode: 1,
            queue: vec![]
        })
    }
    
    // Play the song in the seek
    pub fn play_song(&self) {
        self.sink.play();
    }

    // Pause the song in the sink
    pub fn pause_song(&self) {
        self.sink.pause();
    }
    // Pause the song in the sink
    pub fn stop_song(&self) {
        self.sink.stop();
    }

    // Get current spot in the song
    pub fn get_song_pos(&self) {
        self.sink.get_pos();
    }

    // Change the time of the song
    pub fn seek(&self, position: u64) {
        // println!("position: {:?}", time::Duration::from_secs(position));
        let _ = self.sink.try_seek(time::Duration::from_secs(position)).map_err(|op| println!("{:?}", op));
    }

    // Called when a user clicks play on a song, album, or playlist
    pub fn set_queue(&mut self, q: Vec<SongTable>) {
        self.queue = q;
        self.position = 0;
    }
    // Called when a user clicks play on a song, album, or playlist
    pub fn clear_queue(&mut self) {
        self.queue.clear();
        self.position = 0;
    }
    // Called when a user adds a song to the queue
    pub fn add_to_queue(&mut self, q: Vec<SongTable>) {
        for song in q {
            self.queue.push(song);
        }
    }

    pub fn get_current_queue(&self) -> &Vec<SongTable> {
        return &self.queue;
    }

    pub fn get_queue_length(&self) -> usize {
        return self.queue.len();
    }
    
    pub fn get_current_position(&self) -> usize {
        return self.position;
    }
    
    pub fn get_current_song(&self) -> SongTable {
        return self.queue[self.position].clone();
    }
    
    pub fn update_current_index(&mut self, pos: usize) -> Result<(), String> {
        if pos > self.queue.len() {
            Err("position is larger than queue length".to_string())
        }
        else if pos == self.position {
            Ok(())
        }
        else {
            self.position = pos;
            Ok(())
        }
    }
    
    pub fn load_song(&mut self, pos: usize) -> Result<(), String>{
        let _ = self.update_current_index(pos);
        // Clear the sink to get ready to load new song
        self.sink.stop();

        // Get the path of the song from the queue
        let path = &self.queue[self.position].path;

        let file = File::open(path).expect("Failed to open file");
        
        // Makes it a little faster if we are guessing with only mp3 files
        // Length is needed for backwards seeking
        let len = file.metadata().unwrap().len();
        match Decoder::builder().with_data(BufReader::new(file)).with_hint("mp3").with_byte_len(len).with_seekable(true).build() {
            Ok(source) => {
                // On Success, load song into the sink
                self.sink.append(source);
                // println!("Song is loaded");
            },
            Err(e) => { eprintln!("Error decoding audio file: {}", e); }
        };

        Ok(())
    }

    pub fn check_is_paused(&self) -> bool {
        return self.sink.is_paused();
    }
    
    pub fn check_repeat_mode(&self) -> i64 {
        return self.repeat_mode;
    }

    pub fn set_repeat_mode(&mut self, mode: i64) {
        self.repeat_mode = mode;
    }

    pub fn set_volume(&self, vol: f32) {
        self.sink.set_volume(vol);
    }

    pub fn next_song(&mut self)  {
        // no repeat
        if self.repeat_mode == 0 {
            if self.position + 1 == self.queue.len() - 1 {
                self.position = 0;
                self.stop_song();
            }
            else {
                let new_pos = self.position + 1;
                println!("{:?}", new_pos);
                
                // Update the current position in the player
                let _ = self.update_current_index(new_pos);
                // Load the new song
                let _ = self.load_song(new_pos);
                self.play_song();
            }
        }
        // repeat the queue
        else if self.repeat_mode == 1 {
            let mut new_pos = self.position + 1;
            // If the new position will be larger than the length of the queue, reset to 0
            if new_pos >= self.queue.len() {
                new_pos = 0;
            }
            // Update the current position in the player
            let _ = self.update_current_index(new_pos);
            // Load the new song
            let _ = self.load_song(new_pos);
            self.play_song();
        }
        // Repeat one song
        else {
            self.seek(0);
            self.play_song();
        }
    }

    pub fn previous_song(&mut self) {

        let new_pos;
        // If the new position will be smaller than the starting song, set the pos to the last song in the queue
        if self.position == 0 {
            new_pos = self.queue.len() - 1;
        }
        else {
            new_pos = self.position - 1;
        }

        let _ = self.update_current_index(new_pos);
        // Load the new song
        let _ = self.load_song(new_pos);
        self.play_song();
    }
}
