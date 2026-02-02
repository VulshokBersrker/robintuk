// Libraries
use std::{
    fs::{self}, hash::{BuildHasher, DefaultHasher, Hash, Hasher, RandomState}, os::windows::fs::MetadataExt, path::{Path, PathBuf}
};

// Song Metadata Libraries
use lofty::{config::{ParseOptions, ParsingMode}, file::TaggedFileExt, tag::ItemKey};
use lofty::prelude::*;

// How you import in files that aren't lib or main
use crate::{SongDataResults, types::{ SongTable, SongTableUpload }};

// import keys from https://docs.rs/lofty/latest/lofty/tag/enum.ItemKey.html

pub fn generate_cover_hash(value: u64) -> String {
    let mut s = DefaultHasher::new();
    value.hash(&mut s);
    return s.finish().to_string();
}

fn remove_special_characters(string: String) -> String {
    return string.replace(
        &[
            '(', ')', ',', '\"', '\'', '/', '\\', '.', ';', ':', '?', '!', '`', '>', '<', '*', '|',
            '=', '+', '@', '#', '&', '$', '^', '{', '}',
        ][..],
        "",
    );
}

pub fn shuffle(vec: &mut Vec<SongTable>) {

    let n: usize = vec.len();
    for i in 0..(n - 1) {
        // Generate random index j, such that: i <= j < n
        // The remainder (`%`) after division is always less than the divisor.
        let j = (rand() as usize) % (n - i) + i;
        vec.swap(i, j);
    }    
}

fn rand() -> u64 {
    RandomState::new().build_hasher().finish()
}

fn get_section_marker(first_char: char) -> Option<i32> {    
    // Special Characters
    if first_char == '#' || first_char == '!' || first_char == '[' || first_char == ']' || first_char == '\\' || first_char == '-'
        || first_char == '_' || first_char == '\"' || first_char == '\'' || first_char == '&' || first_char == '$'
        || first_char == '+' || first_char == '%' || first_char == '*' || first_char == '.'
    {
        return Some(0);
    }
    // 0 - 9
    else if first_char.is_ascii_digit() {
        return Some(1);
    }
    //  A - Z
    else if first_char.is_ascii_alphabetic() {
        let section = first_char as i32;
        return Some(section);
    }
    // Non-ascii values
    else {
        return Some(300);
    }
}

// Get the song metadata for the database
pub async fn get_song_data(path: String) -> std::io::Result<SongDataResults> {

    let file_name: String = Path::new(&path)
        .file_name()
        .and_then(|x| x.to_str())
        .map(|x| x.to_string())
        .unwrap();

    let file_size = fs::metadata(&path).unwrap().file_size();

    let mut song_data: SongTableUpload = SongTableUpload {
        path: path.to_string(),
        ..SongTableUpload::default()
    };

    let errors: String;

    // Prevents an error where a file might have a bad Timestamp
    let parsing_options = ParseOptions::new().parsing_mode(ParsingMode::BestAttempt);

    let tagged_file = lofty::probe::Probe::open(&path)
        .expect("Error: bad path")
        .options(parsing_options)
        .read();

    if tagged_file.is_ok() {
        let tagged = tagged_file.unwrap();

        if tagged.contains_tag() {
            let tag = match tagged.primary_tag() {
                Some(primary_tag) => primary_tag,
                None => tagged.first_tag().expect("Error no tags found")
            };

            //  Get title tag
            if let Some(value) = tag.title().as_deref() {
                // println!("Title: {:?}", value);
                if Some(value) == None {
                    if Some(tag.get_string(&ItemKey::TrackTitle).unwrap().to_string()) != None {
                        song_data.name = Some(tag.get_string(&ItemKey::TrackTitle).unwrap().to_string());
                    }
                    else {
                        song_data.name = None;
                    }
                    let name: String = file_name.clone().replace(".mp3", "").replace(".flac", "").replace(".wav", "");
                    let char_array: Vec<char> = name.chars().collect();
                    let first_char: char = char_array[0].to_ascii_uppercase();
                    song_data.song_section = get_section_marker(first_char);
                    
                }
                else {
                    song_data.name = Some(value.to_string());

                    let name: String = value.to_string();
                    let char_array: Vec<char> = name.chars().collect();
                    let first_char: char = char_array[0].to_ascii_uppercase();
                    song_data.song_section = get_section_marker(first_char);
                }
            }

            // Get album tag
            if let Some(value) = tag.album().as_deref() {
                // println!("Album: {:?}", value);
                if Some(value) == None {
                    if Some(tag.get_string(&ItemKey::AlbumTitle).unwrap().to_string()) != None {
                        song_data.album = Some(tag.get_string(&ItemKey::AlbumTitle).unwrap().to_string());

                        let name: String = tag.get_string(&ItemKey::AlbumTitle).unwrap().to_string();
                        let char_array: Vec<char> = name.chars().collect();
                        let first_char: char = char_array[0].to_ascii_uppercase();
                        song_data.album_section = get_section_marker(first_char);
                    }
                    else {
                        song_data.album = None;
                        song_data.album_section = None;
                    }
                }
                else {
                    song_data.album = Some(value.to_string());

                    let name: String = value.to_string();
                    let char_array: Vec<char> = name.chars().collect();
                    let first_char: char = char_array[0].to_ascii_uppercase();
                    song_data.album_section = get_section_marker(first_char);
                }
            }

            // Get album artist tag
            if let Some(value) = tag.get_string(&ItemKey::AlbumArtist) {
                // println!("Album Artist: {:?}", value);
                if Some(value) == None {
                    if Some(tag.get_string(&ItemKey::AlbumArtist).unwrap().to_string()) != None {
                        song_data.album_artist = Some(tag.get_string(&ItemKey::AlbumArtist).unwrap().to_string());

                        let artist: String = tag.get_string(&ItemKey::TrackArtist).unwrap().to_string();
                        let char_array: Vec<char> = artist.chars().collect();
                        let first_char: char = char_array[0].to_ascii_uppercase();
                        song_data.artist_section = get_section_marker(first_char);
                    }
                    else {
                        song_data.album_artist = None;
                        song_data.artist_section = None;
                    }            
                }
                else {
                    if value.to_string() == "" {
                        song_data.album_artist = None;
                        song_data.artist_section = None;
                    }
                    else {
                        song_data.album_artist = Some(value.to_string());

                        let artist: String = value.to_string();
                        let char_array: Vec<char> = artist.chars().collect();
                        let first_char: char = char_array[0].to_ascii_uppercase();
                        song_data.artist_section = get_section_marker(first_char);
                    }                
                }
            }

            // Get artist tag
            if let Some(value) = tag.artist().as_deref() {
                // println!("Artist: {:?}", value);
                if Some(value) == None {
                    if Some(tag.get_string(&ItemKey::TrackArtist).unwrap().to_string()) != None {
                        song_data.artist = Some(tag.get_string(&ItemKey::TrackArtist).unwrap().to_string());
                    }
                    else {
                        song_data.artist = None;
                    }            
                }
                else {
                    song_data.artist = Some(value.to_string());
                }
            }

            // Get genre tag
            if let Some(value) = tag.genre().as_deref() {
                // println!("Genre: {:?}", value);
                if Some(value) == None {
                    if Some(tag.get_string(&ItemKey::Genre).unwrap().to_string()) != None {
                        song_data.genre = Some(tag.get_string(&ItemKey::Genre).unwrap().to_string());
                    }
                    else {
                        song_data.genre = None;
                    }            
                }
                else {
                    song_data.genre = Some(value.to_string());
                }
            }

            // Get year tag
            if let Some(value) = tag.year() {
                // println!("Year: {:?}", value);
                if Some(&value) == None {
                    if tag.get_string(&ItemKey::Year) != None {
                        song_data.release = Some(tag.get_string(&ItemKey::Year).unwrap().to_string());
                    }
                    else {
                        song_data.release = None;
                    }            
                }
                else {
                    song_data.release = Some(value.to_string());
                }
            }

            // Get track tag
            if let Some(value) = tag.track() {
                // println!("Track: {:?}", tag.track());
                if Some(value) == None {
                    if Some(tag.get_string(&ItemKey::TrackNumber).unwrap().parse::<i32>().unwrap()) != None {
                        song_data.track = Some(tag.get_string(&ItemKey::TrackNumber).unwrap().parse::<i32>().unwrap());
                    }
                    else {
                        song_data.track = None;
                    }            
                }
                else {
                    song_data.track = Some(value as i32);
                }
            }

            // Get disc tag
            if let Some(value) = tag.disk() {
                // println!("Disc: {:?}", value);
                if Some(value) == None {
                    if Some(tag.get_string(&ItemKey::DiscNumber).unwrap().parse::<i32>().unwrap()) != None {
                        song_data.disc = Some(tag.get_string(&ItemKey::DiscNumber).unwrap().parse::<i32>().unwrap());
                    }
                    else {
                        song_data.disc = None;
                    }            
                }
                else {
                    song_data.disc = Some(value as i32);
                }
            }

            // Get duration tag
            let properties = tagged.properties();
            let duration = properties.duration();
            song_data.duration = duration.as_secs().to_string();


            // Get the directory where all the data is stored
            let image_dir = dirs::home_dir().unwrap().to_str().unwrap().to_string() + "/.config/robintuk_player/covers/";
            let mut covers_path = PathBuf::new();

            // Get Album artwork
            if tag.pictures().len() != 0 {

                let image_type = tag.pictures()[0].mime_type().unwrap().to_string();
                let (_, ext) = image_type.split_once("/").unwrap_or(("image", "jpg"));

                let f_name: String;
                if song_data.album == None {
                    f_name = generate_cover_hash(file_size);
                }
                else {
                    f_name = remove_special_characters(song_data.album.clone().unwrap());
                }

                let song_cover_path: String;
                if tag.get_string(&ItemKey::AlbumArtist) != None {
                    let tt = remove_special_characters(tag.get_string(&ItemKey::AlbumArtist).unwrap().to_string());
                    song_cover_path = format!("{image_dir}{f_name}-{tt}.{ext}");
                }
                else if let Some(art) = tag.artist().as_deref()  {
                    let new_art = remove_special_characters(art.to_string());
                    song_cover_path = format!("{image_dir}{f_name}-{new_art}.{ext}");
                }
                else {
                    song_cover_path = format!("{image_dir}{f_name}.{ext}");
                }
                covers_path.push(&song_cover_path);

                fs::write(&covers_path, &tag.pictures()[0].data())?;
                // Save the cover for the database
                song_data.cover = Some(song_cover_path);
            }

            errors = " ".to_string();
        }
        else {
            println!("File contains not tags: {:?}", &path);
            errors = "No-Tags".to_string();
        }
    }
    else {
        // let _ = tagged_file.inspect_err(|f| println!("Lofty Error: {:?} - {:?}", f, &path));
        errors = "Lofty-Error".to_string();
    }
    
    // println!("{:?}\nName: {:?}\nAlbum: {:?}\nTrack: {:?}\nArtist: {:?}\nRelease: {:?}\nDisc: {:?}\n",
    //     &song_data.path, &song_data.name, &song_data.album,
    //     &song_data.track, &song_data.artist,
    //     &song_data.release, &song_data.disc
    // );

    return Ok(SongDataResults {
        song_data,
        error_details: errors,
    });
}


// --------- Lofty Errors: 
// BadTimestamp("Timestamp segments contains non-digit characters")
// FileDecoding(Mpeg: "File contains an invalid frame")
// TextDecode("Expected a UTF-8 string")