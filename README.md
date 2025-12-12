<div align="center">
    <img src="./assets/logo_full.png" height="130px" alt="Robintuk Logo" title="Robintuk" />
<br>


# Robintuk

A beautiful and colorful music player for **Windows**.

</div>


## Download

- **Recommended:** Download and install the latest installer from [Github Releases](https://github.com/VulshokBersrker/robintuk_player/releases/latest).

## Main Features

- Play most music formats (mp3, flac)
- Good performance even with 11,000 songs loaded
- Custom playlist artwork
- Customize the look with multiple theme colors

## [Screenshots](./assets/screenshots/index.md)


![](./assets/screenshots/1.png)
![](./assets/screenshots/2.png)
![](./assets/screenshots/6.png)


More: [See all screenshots](./assets/screenshots/index.md)

---

## Development

Discovered a bug? Please open an [ISSUE](https://github.com/VulshokBersrker/robintuk_player/issues) to get it fixed.
Made with Tauri (React and Rust).

## Features to Be Added

- [ ] Get artist data from online service for artist page (maybe)
- [ ] Playlist Import/Export as m3u file
- [ ] Remove a song from the queue
- [ ] Notification of version update
- [ ] Song details screen
- [ ] Smoother music progress bar
- [ ] Custom context menu when hovering on songs/albums (In progress)
- [ ] Installer Wizard
- [ ] Open with (in file explorer)
- [ ] Mini Player?
- [ ] New default playlist icons
- [ ] Remember scroll position on page back
- [ ] Add support for wav
- [ ] Create a Genre section
- [ ] Lock navigation when scanning for new music from settings?
- [x] Add support for flac
- [x] Force scrollbar to stop before music control section
- [x] Remember last 100 played songs/albums
- [x] Home/Welcome screen
- [x] Search (on songs, albums, and artists pages)
- [x] Shuffle Controls
- [x] Display the queue
- [x] Update Play/Pause icon design
- [x] Improve sidebar active navigation styles
- [x] Remove HTML selection ability
- [x] Reorganize Albums page
- [x] Repeat Controls
- [x] Volume Controls
- [x] Keyboard Media Controls
- [x] Organize albums by track number and disc number


## Known Issues

- [ ] Songs have hiccups randomly (maybe due to refreshes in dev mode)
- [ ] CSS Optimization
- [ ] Application Optimizations (streamlining, data caching, etc.)
- [ ] Playback errors
- [ ] Better error handling
- [ ] Blank pages on route change while it grabs the data from the backend
- [ ] Fix songs page search results formatting
- [x] Albums displaying Disc 0 when metadata has no disc value
- [x] Protections on adding child directories to scan music
- [x] Songs end one second early sometimes
- [x] Wrong icon shown when resizing window with double click or drag