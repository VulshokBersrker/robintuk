// Libraries
use std::{
    fs,
    hash::{DefaultHasher, Hash, BuildHasher, Hasher, RandomState},
    path::{Path, PathBuf},
};


// Song Metadata Libraries
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::meta::{StandardTagKey, StandardVisualKey};
use symphonia::core::probe::Hint;
use StandardTagKey::*;

// How you import in files that aren't lib or main
use crate::{SongDataResults, types::{ SongTable, SongTableUpload }};

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

// Get the song metadata for the database
pub async fn get_song_data(path: String, file_size: u64) -> std::io::Result<SongDataResults> {
    let file: fs::File = fs::File::open(&path).expect("Failed to open file");
    // Create the media source stream.
    let mss: MediaSourceStream = MediaSourceStream::new(Box::new(file), Default::default());

    let file_name: String = Path::new(&path)
        .file_name()
        .and_then(|x| x.to_str())
        .map(|x| x.to_string())
        .unwrap();

    // let hash: String = generate_uuid();

    // Create a probe hint using the file's extension. [Optional]
    let mut hint: Hint = Hint::new();
    hint.with_extension("mp3").with_extension("wav").with_extension("flac");

    // Use the default options for metadata and format readers.
    let meta_opts: MetadataOptions = Default::default();
    let fmt_opts: FormatOptions = Default::default(); // Get the instantiated format reader.

    let mut song_data: SongTableUpload = SongTableUpload {
        path: path.to_string(),
        ..SongTableUpload::default()
    };

    // Get the directory where all the data is stored
    let image_dir = dirs::home_dir().unwrap().to_str().unwrap().to_string() + "/.config/robintuk_player/covers/";
    let mut covers_path = PathBuf::new();

    // Probe the media source
    let probed = symphonia::default::get_probe().format(&hint, mss, &fmt_opts, &meta_opts);

    if probed.is_ok() {
        let mut probe = probed.unwrap();

        if let Some(song) = probe.format.default_track() {
            if let Some((frames, sample_rate)) = song
                .codec_params
                .n_frames
                .zip(song.codec_params.sample_rate)
            {
                song_data.duration = (frames / sample_rate as u64).to_string();
            }
        }

        // Get the song metadata
        if let Some(mut meta) = probe
            .metadata
            .get()
            .or_else(|| Some(probe.format.metadata()))
        {
            if let Some(rev) = meta.skip_to_latest() {
                for tag in rev.tags() {
                    // Get the song details
                    if let Some(key) = tag.std_key {

                        match key {
                            TrackTitle => {
                                // If there is no name to the track, give it the name of the filename
                                if Some(tag.value.to_string()) == None {
                                    song_data.name = Some(file_name.clone().replace(".mp3", "").replace(".flac", "").replace(".wav", ""));

                                    let name: String = file_name.clone().replace(".mp3", "").replace(".flac", "").replace(".wav", "");
                                    let char_array: Vec<char> = name.chars().collect();
                                    let first_char: char = char_array[0].to_ascii_uppercase();
                                    
                                    // Special Characters
                                    if first_char == '#' || first_char == '!' || first_char == '[' || first_char == ']' || first_char == '\\' || first_char == '-'
                                        || first_char == '_' || first_char == '\"' || first_char == '\'' || first_char == '&' || first_char == '$'
                                        || first_char == '+' || first_char == '%' || first_char == '*' || first_char == '.'
                                    {
                                        song_data.song_section = Some(0);
                                    }
                                    // 0 - 9
                                    else if first_char.is_ascii_digit() {
                                        song_data.song_section = Some(1);
                                    }
                                    //  A - Z
                                    else if first_char.is_ascii_alphabetic() {
                                        let section = first_char as i32;
                                        song_data.song_section = Some(section);
                                    }
                                    // Non-ascii values
                                    else {
                                        song_data.song_section = Some(300);
                                    }
                                }
                                else {
                                    song_data.name = Some(tag.value.to_string());
                                    
                                    let name: String = tag.value.to_string();
                                    let char_array: Vec<char> = name.chars().collect();
                                    let first_char: char = char_array[0].to_ascii_uppercase();                                    

                                    // Special Characters
                                    if first_char == '#' || first_char == '!' || first_char == '[' || first_char == ']' || first_char == '\\' || first_char == '-'
                                        || first_char == '_' || first_char == '\"' || first_char == '\'' || first_char == '&' || first_char == '$'
                                        || first_char == '+' || first_char == '%' || first_char == '*' || first_char == '.'
                                    {
                                        song_data.song_section = Some(0);
                                    }
                                    // 0 - 9
                                    else if first_char.is_ascii_digit() {
                                        song_data.song_section = Some(1);
                                    }
                                    //  A - Z
                                    else if first_char.is_ascii_alphabetic() {
                                        let section = first_char as i32;
                                        song_data.song_section = Some(section);
                                    }
                                    // Non-ascii values
                                    else {
                                        song_data.song_section = Some(300);
                                    }
                                    
                                }
                            }
                            Artist => song_data.artist = Some(tag.value.to_string()) ,
                            Album => {
                                
                                song_data.album = Some(tag.value.to_string());

                                let name = tag.value.to_string();                                    
                                let char_array: Vec<char> = name.chars().collect();
                                let first_char = char_array[0];

                                // Special Characters
                                if first_char == '#' || first_char == '!' || first_char == '[' || first_char == ']' || first_char == '\\' || first_char == '-'
                                    || first_char == '_' || first_char == '\"' || first_char == '\'' || first_char == '&' || first_char == '$'
                                    || first_char == '+' || first_char == '%' || first_char == '*' || first_char == '.'
                                {
                                    song_data.album_section = Some(0);
                                }
                                // 0 - 9
                                else if first_char.is_ascii_digit() {
                                    song_data.album_section = Some(1);
                                }
                                //  A - Z
                                else if first_char.is_ascii_alphabetic() {
                                    let section = first_char as i32;
                                    song_data.album_section = Some(section);
                                }
                                // Non-ascii values
                                else {
                                    song_data.album_section = Some(300);
                                }
                            },
                            AlbumArtist => {
                                if Some(tag.value.to_string()) == None {
                                    song_data.album_artist = Some(tag.value.to_string());
                                    song_data.artist_section = None;
                                }
                                else {
                                    song_data.album_artist = Some(tag.value.to_string());

                                    let artist: String = tag.value.to_string();
                                    let char_array: Vec<char> = artist.chars().collect();
                                    let first_char: char = char_array[0].to_ascii_uppercase();

                                    // Special Characters
                                    if first_char == '#' || first_char == '!' || first_char == '[' || first_char == ']' || first_char == '\\' || first_char == '-'
                                        || first_char == '_' || first_char == '\"' || first_char == '\'' || first_char == '&' || first_char == '$'
                                        || first_char == '+' || first_char == '%' || first_char == '*' || first_char == '.'
                                    {
                                        song_data.artist_section = Some(0);
                                    }
                                    // 0 - 9
                                    else if first_char.is_ascii_digit() {
                                        song_data.artist_section = Some(1);
                                    }
                                    //  A - Z
                                    else if first_char.is_ascii_alphabetic() {
                                        let section = first_char as i32;
                                        song_data.artist_section = Some(section);
                                    }
                                    // Non-ascii values
                                    else {
                                        song_data.artist_section = Some(300);
                                    }
                                }
                                
                            },
                            Date => song_data.release = Some(tag.value.to_string()),
                            Genre => song_data.genre = Some(tag.value.to_string()),
                            DiscNumber => {
                                // Convert the string into an i32 number
                                if Some(tag.value.to_string()) != None {
                                    let value = Some(tag.value.to_string()).unwrap();
                                    if value.find("/") != None {
                                        let disc_num = value.split('/').next().unwrap();
                                        song_data.disc = Some(disc_num.parse::<i32>().unwrap());
                                    }
                                    else if value.find("/") == None {
                                        let disc_num = value.as_str();
                                        song_data.disc = Some(disc_num.parse::<i32>().unwrap());
                                    }
                                    else {
                                        song_data.disc = None;
                                    }
                                }
                                else {
                                    song_data.disc = None;
                                }
                            }
                            TrackNumber => {
                                // Convert the string into an i32 number
                                if Some(tag.value.to_string()) != None {
                                    let value = Some(tag.value.to_string()).unwrap();
                                    if value.find("/") != None {
                                        let track_num = value.split('/').next().unwrap();
                                        song_data.track = Some(track_num.parse::<i32>().unwrap());
                                    }
                                    else if value.find("/") == None {
                                        if value.find(".") != None {
                                            let track_num = value.split('.').next().unwrap();
                                            song_data.track =  Some(track_num.parse::<i32>().unwrap());
                                        }
                                        else {
                                            let track_num = value.as_str();
                                            song_data.track = Some(track_num.parse::<i32>().unwrap());
                                        }
                                    }
                                    else {
                                        song_data.track = None;
                                    }
                                }
                                else {
                                    song_data.track = None;
                                }
                            }
                            _ => {}
                        }
                    }
                }

                // Get song cover
                let song_covers = rev.visuals();
                let mut priority = [None, None];
                let mut others = Vec::with_capacity(song_covers.len());

                for item in song_covers {
                    match item.usage {
                        Some(StandardVisualKey::FrontCover) => priority[0] = Some(item),
                        Some(StandardVisualKey::BackCover) => priority[1] = Some(item),
                        // Some(StandardVisualKey::Media) => priority[1] = Some(item),
                        _ => others.push(item),
                    }
                }

                for item in priority.into_iter().flatten().chain(others) {
                    if item.data.is_empty() {
                        continue;
                    }

                    let (_, ext) = item.media_type.split_once("/").unwrap_or(("image", "jpg"));
                    // Try out an if to check for the album name, to set that name as the f_name
                    // Should lower the amount of images
                    let f_name: String;
                    if song_data.album == None {
                        f_name = generate_cover_hash(file_size);
                    } else {
                        f_name = remove_special_characters(song_data.album.clone().unwrap());
                    }

                    let song_cover_path = format!("{image_dir}{f_name}.{ext}");
                    covers_path.push(&song_cover_path);

                    fs::write(&covers_path, &item.data)?;
                    // Save the cover for the database
                    song_data.cover = Some(song_cover_path);

                    break;
                }
            }
        }
    }
    else {
        return Ok(SongDataResults {
            song_data,
            error_details: "Mismatched tag types".to_string(),
        });
    }

    // println!("{:?}\nName: {:?}\nAlbum: {:?}\nTrack: {:?}\nArtist: {:?}\nRelease: {:?}\nDisc: {:?}\n",
    // &song_data.path,
    // &song_data.name,
    // &song_data.album,
    // &song_data.track, 
    // &song_data.artist,
    // &song_data.release,
    // &song_data.disc
    // );

    return Ok(SongDataResults {
        song_data,
        error_details: "no error".to_string(),
    });
}

// Errors so far - Oberon
// unsupported format: DecodeError("id3v2: unused flag bits are not cleared")

//  Anicrad
// unsupported format: IoError(Custom { kind: UnexpectedEof, error: "out of bounds" })