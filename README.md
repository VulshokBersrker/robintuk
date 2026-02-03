<div align="center">
    <img src="./assets/logo_full.png" height="130px" alt="Robintuk Logo" title="Robintuk" />
    <br>

### A beautiful and colorful music player for **Windows**.

</div>

[![Tauri](https://img.shields.io/badge/build_in-tauri_v2-blue)](https://tauri.app/) [![Release](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FVulshokBersrker%2Frobintuk%2Frefs%2Fheads%2Fmain%2Fpackage.json&query=version&label=version&color=green)](https://github.com/VulshokBersrker/robintuk_player/releases/latest)


## Download

- **Recommended:** Download and install the latest installer from [Github Releases](https://github.com/VulshokBersrker/robintuk_player/releases/latest).
- Old versions may have crashes/issues that have been fixed in the latest release.

## Main Features

- Play most music formats (mp3, flac, ogg, aiff, m4a)
- Great performance with 10,000+ songs loaded
- Custom playlist artwork (including animated images)
- Customize the look with multiple color themes
- View last 100 played songs
- Search to find your music faster
- Fast scans to add your music quickly (~5000 songs scanned per minute)
- Backup, Restore, or Reset your music database and images
- Use m3u/m3u8 files to import playlists from other apps or export your playlists for save keepings

## [Screenshots](./assets/screenshots/index.md)

![](./assets/screenshots/1.jpg)
![](./assets/screenshots/3.jpg)
![](./assets/screenshots/6.jpg)


More: [See all screenshots](./assets/screenshots/index.md)

---

## Development

Discovered a bug? Please open an [ISSUE](https://github.com/VulshokBersrker/robintuk_player/issues) to get it fixed.
Made with Tauri (React and Rust).

If you'd like to contribute to the project, please let me know in [DISCUSSIONS](https://github.com/VulshokBersrker/robintuk/discussions).

## To Do Features

- [ ] Equalizer?
- [ ] Create Genre tab and features
- [ ] Linux support
- [ ] Gapless playback
- [ ] Add support for wav
- [ ] Update queue page when queue is changed
- [ ] Drag and Drop playlist order
- [ ] Get artist data from online service for artist page (No great options once you have more than 100 songs)
- [ ] Notification of version updates
- [ ] Place sink into another thread? to prevent stutters when there is heavy system load
- [ ] Open with (in file explorer)
- [ ] CSS Updates when window size changes
- [ ] Create placeholder templates while pages are loading


## Known Issues

- [ ] Remember scroll position on page change (not possible with dynamically loaded content to my knowledge)
- [ ] When changing audio device, it will continue to play sound to the old device (only fix is to restart the app, current limitation of cpal)
- [ ] Songs have hiccups randomly (maybe due to heavy system load from other programs)
- [ ] Application Optimizations (streamlining, data caching, etc.)
- [ ] Better error handling
- [ ] Some album artwork is not deleted when songs are removed
- [ ] Some albums with multiple discs are disorganized
