import { Routes, Route, BrowserRouter } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

import "./App.css";

// Custom Components
import { AlbumDetails, AllArtistResults, AllGenreResults, SongsFull } from "./globalValues";
import CustomWindowsBar from "./components/fileSystem/customWindowsBar";
import MusicControls from "./components/musicControls";
import RightSideBar from "./components/rightSideBar";

// Pages
import PlaylistOverviewPage from "./pages/details/playlistDetails";
import ArtistOverviewPage from "./pages/details/artistDetails";
import AlbumOverviewPage from "./pages/details/albumDetails";
import GenreOverviewPage from "./pages/details/genreDetails";
import QueueOverviewPage from "./pages/queue";
import PlayHistoryPage from "./pages/history";
import PlaylistPage from "./pages/playlist";
import ArtistsPage from "./pages/artists";
import GenresPage from "./pages/genres";
import Settings from "./pages/settings";
import AlbumPage from "./pages/albums";
import SongPage from "./pages/songs";
import Home from "./pages/home";
import Popup from "./components/popups";


function App() {

  const [songList, setSongList] = useState<any[]>([]);
  const [albumList, setAlbumList] = useState<AlbumDetails[]>([]);
  const [artistList, setArtistList] = useState<AllArtistResults[]>([]);
  const [genreList, setGenreList] = useState<AllGenreResults[]>([]);

  const [newVersionAvailable, setNewVersionAvailable] = useState<boolean>(false);

  useEffect(() => {
    getTheme();
    getValues();    
    checkForDeleted();
    checkVersion();
  }, []);

  // Listeners
  useEffect(() => {
    const unlisten_scan_finished = listen("scan-finished", () => { getValues(); });
    const unlisten_restore_finished = listen("ending-restore", () => { getTheme(); getValues(); });
    const unlisten_reset_finished = listen("ending-reset", () => { getTheme(); getValues(); });
    const unlisten_reload_albums = listen("remove-song", () => { getValues(); });

    
    return () => {
      unlisten_scan_finished.then(f => f()),
      unlisten_reload_albums.then(f => f()),
      unlisten_reset_finished.then(f => f()),
      unlisten_restore_finished.then(f => f());
    }
  }, []);

  async function getTheme() {
    try {
      const res: string | null = await invoke("get_settings");
      if(res === null) {
        const selectedTheme = localStorage.getItem('theme');
        if(selectedTheme) {
          document.querySelector("body")?.setAttribute("data-theme", selectedTheme);
        }
        else {
          document.querySelector("body")?.setAttribute("data-theme", "red");
        }        
      }
      else {
        document.querySelector("body")?.setAttribute("data-theme", res);
      }
    }
    catch(e) {
      console.error("Error getting settings", e)
    }
  }

  async function getValues() {
    try {
      getSongs();
      getAlbums();
      getArtists();
      getGenres();
    }
    catch(e) {
      console.log(`Failed to get data: ${e}`);
    }
  }

  async function getSongs() {
    try {
      const song_list: SongsFull[] = await invoke<SongsFull[]>('get_all_songs');
      // const list = await invoke<Songs[]>('get_songs_with_limit', { limit: 30 } );

      setSongList(song_list);
      // setHomeSongs(list);
    }
    catch(err) {
      alert(`Failed to scan folder: ${err}`);
    }
  }

  async function checkForDeleted() {
    try {
      await invoke("scan_for_deleted");
    }
    catch(e) {
      console.log(e);
    }
  }

  async function checkVersion() {
    try {
      const res: boolean = await invoke("check_for_new_version");
      if(res) {
        setNewVersionAvailable(true);
      }
      else {
        setNewVersionAvailable(false);
      }
    }
    catch(e) {
      console.log(e);
    }
  }

  // get all data for the media player's main pages
  async function getAlbums() {
    try {
      const list = await invoke<AlbumDetails[]>('get_all_albums');
      setAlbumList(list);  
    }
    catch (err) {
      console.log(`Failed to get album data: ${err}`);
    }
  }

  // get all data for the media player's main pages
  async function getArtists() {
    try {
      const list = await invoke<AllArtistResults[]>('get_all_artists');
      setArtistList(list);
    }
    catch(err) {
      console.log(`Failed to scan folder: ${err}`);
    }
  }

  // get all data for the media player's main pages
  async function getGenres() {
    try {
      const list = await invoke<AllGenreResults[]>('get_all_genres');
      setGenreList(list);        
    }
    catch(err) {
      console.log(`Failed to get genre data: ${err}`);
    }
  }

  return(
    <div 
      // onContextMenu={(e) => { e.preventDefault(); }}
    >
      <BrowserRouter>
        <CustomWindowsBar />
        <RightSideBar />
        <MusicControls />
        <div className="content">
          {newVersionAvailable && <Popup isToggled={newVersionAvailable} popupType={0}/>}
          <Routes>
            <Route path="/" element={ <Home /> }/>
            <Route path="/songs" element={ <SongPage songs={songList} /> }/>
            <Route path="/albums" element={ <AlbumPage albums={albumList} /> }/>
            <Route path="/artists" element={ <ArtistsPage artists={artistList} /> }/>
            <Route path="/genres" element={ <GenresPage genres={genreList} /> }/>
            <Route path="/queue" element={ <QueueOverviewPage /> }/>
            <Route path="/history" element={ <PlayHistoryPage /> }/>
            <Route path="/playlists" element={ <PlaylistPage /> }/>
            <Route path="/settings" element={ <Settings /> }/>
            <Route path="/albums/overview" element={ <AlbumOverviewPage />} />
            <Route path="/artists/overview" element={ <ArtistOverviewPage />} />
            <Route path="/genres/overview" element={ <GenreOverviewPage />} />
            <Route path="/playlists/overview" element={ <PlaylistOverviewPage />} />
          </Routes>
        </div>
      </BrowserRouter>      
    </div>
  );
}

export default App;