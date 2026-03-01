use std::{ fs::File, io::BufReader, time };
use rodio::{ Decoder, Sink };

use crate::{ types::SongTable };

pub struct MusicPlayer {
    pub sink: Sink,
    pub position: usize,
    pub repeat_mode: i64,
    pub queue: Vec<SongTable>
}

/*
    Gapless Rework

    When a song/album/playlist is set to play, it needs to:
    1. Setup the first song, by appending it to the Sink
    2. Let the frontend know the song is ready
    3. Add one more song to the Sink for gapless to work
    4. Let there be a flag to cancel this loop if the user clicks on a new set of songs/ablum/playlist

    Issues:
    When turning off shuffle while playing, it will still hold the two loaded songs. This will cause a display and play error,
        where the displayed song will be the next one in line for the unshuffled queue, but the actual song is still from the shuffled queue

*/

// Rework Parts
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
    
    // ------------------- Simple Media Functions -------------------
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
    // Set the repeat mode for the player
    pub fn set_repeat_mode(&mut self, mode: i64) {
        self.repeat_mode = mode;
    }
    // Change the volume of the sink
    pub fn set_volume(&self, vol: f32) {
        self.sink.set_volume(vol);
    }
    // Move and play the next song in the queue
    pub fn next_song(&mut self)  {
        // no repeat
        if self.repeat_mode == 0 {
            if self.position + 1 == self.queue.len() - 1 {
                self.position = 0;
                self.sink.stop();
            }
            else {
                let new_pos = self.position + 1;
                
                // Update the current position in the player
                let _ = self.update_current_index(new_pos);
                // Play the next song - Create case for last song in queue
                println!("Before Skip Length - {:?}", self.sink.len());
                let _ = self.sink.skip_one();
                println!("After Skip Length - {:?}", self.sink.len());
                self.play_song();
            }
        }
        // repeat the queue
        else if self.repeat_mode == 1 {
            self.sink.clear();
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
    // Move and play the previous song in the queue
    pub fn previous_song(&mut self) {
        // Drop all the songs in the sink, then load new songs
        self.sink.clear();

        let new_pos;
        // If the new position will be smaller than the starting song, set the pos to the last song in the queue
        if self.position == 0 {
            new_pos = self.queue.len() - 1;
        }
        else {
            new_pos = self.position - 1;
        }

        let _ = self.update_current_index(new_pos);
        // Load the first song
        let _ = self.load_song(new_pos);
        self.play_song();
        
        // If the new position plus 1 is less than the queue length, load next song
        if (1 + new_pos) < self.queue.len() {
           let _ = self.load_song(new_pos + 1);
        }
    }

    // ------------------- Queue Functions -------------------
    // Called when a user clicks play on a song, album, or playlist
    pub fn set_queue(&mut self, q: Vec<SongTable>) {
        self.queue = q;
        // self.sink.stop();
        self.position = 0;
    }
    // Clear the queue and empty the sink
    pub fn clear_queue(&mut self) {
        self.sink.stop();
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
    
    pub fn update_current_index(&mut self, pos: usize) -> Result<(), String> {
        if pos > self.queue.len() {
            println!("position is larger than queue length - setting to zero");
            self.position = 0;
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
    
    // ------------------- Checker Functions -------------------
    pub fn get_current_song(&self) -> Result<SongTable, bool>  {
        if self.queue.len() > 0 {
            return Ok(self.queue[self.position].clone());
        }
        else {
            return Err(false);
        }
    }
    
    pub fn check_is_paused(&self) -> bool {
        return self.sink.is_paused();
    }

    pub fn check_is_loaded(&self) -> bool {
        return !self.sink.empty();
    }
    
    pub fn check_repeat_mode(&self) -> i64 {
        return self.repeat_mode;
    }


    // ------------------- Media Loading / Setup Functions -------------------
    
    pub fn load_song(&mut self, pos: usize) -> Result<(), String> {
        // Get the path of the song from the queue
        if self.queue.len() > 0 {
            let path = &self.queue[pos].path;
            let file = File::open(&path);

            // No error reading the file path
            if file.is_ok() {
                let good_file = file.unwrap();
                // Makes it a little faster if we are guessing with only mp3 files
                // Length is needed for backwards seeking
                let len = good_file.metadata().unwrap().len();
                match Decoder::builder().with_data(BufReader::new(good_file)).with_hint("mp3").with_byte_len(len).with_seekable(true).with_gapless(true).build() {
                    Ok(source) => {
                        // On Success, load song into the sink
                        self.sink.append(source);
                        // println!("Song is loaded");
                    },
                    Err(e) => { eprintln!("Error decoding audio file: {}", e); }
                };
                return Ok(())
            }
            // If there is an error reading in the file (ex. File has been moved an doesn't exist in that location)
            else {
                return Err("Song does not exist".to_string())
            }
        }
        
        Ok(())
    }

    // Just for debugging new gapless features
    pub fn get_sink_length(&self) -> usize {
        return self.sink.len();
    }
}


// Old - Non-gapless music player

// impl MusicPlayer {
//     pub fn new(sink: Sink) -> Result<Self, String> {
//         sink.pause();

//         Ok(Self{
//             sink,
//             position: 0,
//             repeat_mode: 1,
//             queue: vec![]
//         })
//     }
    
//     // Play the song in the seek
//     pub fn play_song(&self) {
//         self.sink.play();
//     }

//     // Pause the song in the sink
//     pub fn pause_song(&self) {
//         self.sink.pause();
//     }
//     // Pause the song in the sink
//     pub fn stop_song(&self) {
//         self.sink.stop();
//     }

//     // Get current spot in the song
//     pub fn get_song_pos(&self) {
//         self.sink.get_pos();
//     }

//     // Change the time of the song
//     pub fn seek(&self, position: u64) {
//         // println!("position: {:?}", time::Duration::from_secs(position));
//         let _ = self.sink.try_seek(time::Duration::from_secs(position)).map_err(|op| println!("{:?}", op));
//     }

//     // Called when a user clicks play on a song, album, or playlist
//     pub fn set_queue(&mut self, q: Vec<SongTable>) {
//         self.queue = q;
//         self.position = 0;              
//     }
//     // Called when a user clicks play on a song, album, or playlist
//     pub fn clear_queue(&mut self) {
//         self.sink.stop();
//         self.queue.clear();
//         self.position = 0;
//     }
//     // Called when a user adds a song to the queue
//     pub fn add_to_queue(&mut self, q: Vec<SongTable>) {
//         for song in q {
//             self.queue.push(song);
//         }
//     }

//     pub fn get_current_queue(&self) -> &Vec<SongTable> {
//         return &self.queue;
//     }

//     pub fn get_queue_length(&self) -> usize {
//         return self.queue.len();
//     }
    
//     pub fn get_current_position(&self) -> usize {
//         return self.position;
//     }
    
//     pub fn get_current_song(&self) -> Result<SongTable, bool>  {
//         if self.queue.len() > 0 {
//             return Ok(self.queue[self.position].clone());
//         }
//         else {
//             return Err(false);
//         }
//     }
    
//     pub fn update_current_index(&mut self, pos: usize) -> Result<(), String> {
//         if pos > self.queue.len() {
//             Err("position is larger than queue length".to_string())
//         }
//         else if pos == self.position {
//             Ok(())
//         }
//         else {
//             self.position = pos;
//             Ok(())
//         }
//     }
    
//     pub fn load_song(&mut self, pos: usize) -> Result<(), String>{
//         let _ = self.update_current_index(pos);
//         // Clear the sink to get ready to load new song
//         self.sink.stop();

//         // Get the path of the song from the queue
//         if self.queue.len() > 0 {
//             let path = &self.queue[self.position].path;
//             let file = File::open(&path);

//             // No error reading the file path
//             if file.is_ok() {
//                 let good_file = file.unwrap();
//                 // Makes it a little faster if we are guessing with only mp3 files
//                 // Length is needed for backwards seeking
//                 let len = good_file.metadata().unwrap().len();
//                 match Decoder::builder().with_data(BufReader::new(good_file)).with_hint("mp3").with_byte_len(len).with_seekable(true).with_gapless(true).build() {
//                     Ok(source) => {
//                         // On Success, load song into the sink
//                         self.sink.append(source);
//                         // println!("Song is loaded");
//                     },
//                     Err(e) => { eprintln!("Error decoding audio file: {}", e); }
//                 };
//                 return Ok(())
//             }
//             // If there is an error reading in the file (ex. File has been moved an doesn't exist in that location)
//             else {
//                 return Err("Song does not exist".to_string())
//             }
//         }
        
//         Ok(())
//     }

//     pub fn check_is_paused(&self) -> bool {
//         return self.sink.is_paused();
//     }

//     pub fn check_is_loaded(&self) -> bool {
//         return !self.sink.empty();
//     }
    
//     pub fn check_repeat_mode(&self) -> i64 {
//         return self.repeat_mode;
//     }

//     pub fn set_repeat_mode(&mut self, mode: i64) {
//         self.repeat_mode = mode;
//     }

//     pub fn set_volume(&self, vol: f32) {
//         self.sink.set_volume(vol);
//     }

//     pub fn next_song(&mut self)  {
//         // no repeat
//         if self.repeat_mode == 0 {
//             if self.position + 1 == self.queue.len() - 1 {
//                 self.position = 0;
//                 self.stop_song();
//             }
//             else {
//                 let new_pos = self.position + 1;
//                 println!("{:?}", new_pos);
                
//                 // Update the current position in the player
//                 let _ = self.update_current_index(new_pos);
//                 // Load the new song
//                 let _ = self.load_song(new_pos);
//                 self.play_song();
//             }
//         }
//         // repeat the queue
//         else if self.repeat_mode == 1 {
//             let mut new_pos = self.position + 1;
//             // If the new position will be larger than the length of the queue, reset to 0
//             if new_pos >= self.queue.len() {
//                 new_pos = 0;
//             }
//             // Update the current position in the player
//             let _ = self.update_current_index(new_pos);
//             // Load the new song
//             let _ = self.load_song(new_pos);
//             self.play_song();
//         }
//         // Repeat one song
//         else {
//             self.seek(0);
//             self.play_song();
//         }
//     }

//     pub fn previous_song(&mut self) {

//         let new_pos;
//         // If the new position will be smaller than the starting song, set the pos to the last song in the queue
//         if self.position == 0 {
//             new_pos = self.queue.len() - 1;
//         }
//         else {
//             new_pos = self.position - 1;
//         }

//         let _ = self.update_current_index(new_pos);
//         // Load the new song
//         let _ = self.load_song(new_pos);
//         self.play_song();
//     }
// }

