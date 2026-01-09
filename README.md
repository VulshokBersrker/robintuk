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
- Custom playlist artwork (including animated artwork)
- Customize the look with multiple color themes
- View last 100 played songs
- Filters to find music faster

## [Screenshots](./assets/screenshots/index.md)


![](./assets/screenshots/1.jpg)
![](./assets/screenshots/3.jpg)
![](./assets/screenshots/6.jpg)


More: [See all screenshots](./assets/screenshots/index.md)

---

## Development

Discovered a bug? Please open an [ISSUE](https://github.com/VulshokBersrker/robintuk_player/issues) to get it fixed.
Made with Tauri (React and Rust).

## To Do Features

- [ ] Smoother music progress bar
- [ ] Second Shuffle mode (Reshuffled at the end of current queue)
- [ ] Gapless playback
- [ ] Add support for wav
- [ ] Drag and Drop playlist order
- [ ] Get artist data from online service for artist page (Not great options once you have more than 100 songs)
- [ ] Playlist Import/Export as m3u file
- [ ] Notification of version update
- [ ] Place sink into another thread to prevent stutters when there is heavy system load
- [ ] Open with (in file explorer)
- [ ] CSS Optimization
- [ ] Create placeholder templates while pages are loading
- [ ] Linux support
- [x] History section should update everytime new songs are played
- [x] Update to color themes
- [x] Improved Context Menu
- [x] Auto-Remove album/playlist artwork when respective songs are removed
- [x] Display song details through context menu
- [x] Custom icon for installer
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


## Known Issues

- [ ] Songs have hiccups randomly (maybe due to heavy system load from other programs)
- [ ] Application Optimizations (streamlining, data caching, etc.)
- [ ] Better error handling
- [ ] Sections on songs/albums/artists pages not hiding certain parts ( Z, ... sections appear sometimes when nothing has those values)
- [ ] Remember scroll position on page change (not possible with dynamically loaded content to my knowledge)
- [x] If scan breaks or user closes app while scanning, scan buttons will be disabled because it thinks a scan is still ongoing
- [x] Blank pages on route change while it grabs the data from the backend (fixed?)
- [x] Selecting songs/albums and using the search bar will break the selection
- [x] Cancelling changing playlist cover art will remove any current artwork until the page is reloaded
- [x] Doubles on some songs in history
- [x] Add music to playlist not working on home, album overview, ,songs, or artist overview pages with "Add To" or context menu
- [x] Fix songs page search results formatting
- [x] Albums displaying Disc 0 when metadata has no disc value
- [x] Protections on adding child directories to scan music
- [x] Songs end one second early sometimes
- [x] Wrong icon shown when resizing window with double click or drag