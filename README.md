<div align="center">
<img src="./assets/logo_full.png" height="130px" alt="Robintuk Logo" title="Robintuk" />
<br>

### A beautiful and colorful music player for **Windows**.

</div>


## Download

- **Recommended:** Download and install the latest installer from [Github Releases](https://github.com/VulshokBersrker/robintuk_player/releases/latest).

## Main Features

- Play most music formats (mp3, flac)
- Good performance even with 11,000 songs loaded
- Custom playlist artwork
- Customize the look with multiple theme colors

## [Screenshots](./assets/screenshots/index.md)


![](./assets/screenshots/1.jpg)
![](./assets/screenshots/3.jpg)
![](./assets/screenshots/6.jpg)


More: [See all screenshots](./assets/screenshots/index.md)

---

## Development

Discovered a bug? Please open an [ISSUE](https://github.com/VulshokBersrker/robintuk_player/issues) to get it fixed.
Made with Tauri (React and Rust).

## Features to Be Added for V1.0

- [ ] Custom icon for installer
- [ ] Create a Genre section
- [ ] Song details modal
- [ ] Smoother music progress bar
- [ ] New default playlist icons
- [ ] Improved Context Menu
- [x] Installer Wizard
- [x] Custom context menu when right clicking on songs/albums
- [x] Playlist functions (create, add, delete, rename, reorder)
- [x] Queue page functions (clear, add to)
- [x] Lock scan even when you leave the settings page
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

### Future Version Features Planned
- [ ] Auto-Remove album/playlist artwork when respective things are removed from app
- [ ] Gapless playback
- [ ] Add support for wav
- [ ] Drag and Drop playlist order
- [ ] Get artist data from online service for artist page
- [ ] Mini Player?
- [ ] Playlist Import/Export as m3u file
- [ ] Notification of version update
- [ ] Open with (in file explorer)
- [ ] CSS Optimization
- [ ] Create placeholder templates while pages are loading


## Known Issues

- [ ] Songs have hiccups randomly (maybe due to refreshes in dev mode)
- [ ] Application Optimizations (streamlining, data caching, etc.)
- [ ] Playback errors
- [ ] Better error handling
- [ ] Blank pages on route change while it grabs the data from the backend
- [ ] Sections on songs/albums/artists pages not hiding certain parts ( Z, ... sections appear sometimes when nothing has those values)
- [ ] Cancelling changing playlist cover art will remove any current artwork until the page is reloaded
- [ ] Remember scroll position on page change (not possible with dynamically loaded content to my knowledge)
- [ ] If scan breaks or user closes app while scanning, scan buttons will be disabled because it thinks a scan is still ongoing
- [x] Doubles on some songs in history
- [x] Add music to playlist not working on home, album overview, ,songs, or artist overview pages with "Add To" or context menu
- [x] Fix songs page search results formatting
- [x] Albums displaying Disc 0 when metadata has no disc value
- [x] Protections on adding child directories to scan music
- [x] Songs end one second early sometimes
- [x] Wrong icon shown when resizing window with double click or drag