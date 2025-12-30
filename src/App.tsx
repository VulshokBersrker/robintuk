import { Routes, Route, BrowserRouter } from "react-router-dom";
import CustomWindowsBar from "./components/fileSystem/customWindowsBar";
import MusicControls from "./components/musicControls";
import RightSideBar from "./components/rightSideBar";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

import "./App.css";

// Custom Components
import { AlbumDetails, AllArtistResults, clearLocalStorage, DirectoryInfo, SongsFull } from "./globalValues";

// Pages
import PlaylistOverviewPage from "./pages/details/playlistDetails";
import ArtistOverviewPage from "./pages/details/artistDetails";
import AlbumOverviewPage from "./pages/details/albumDetails";
import QueueOverviewPage from "./pages/queue";
import PlayHistoryPage from "./pages/history";
import PlaylistPage from "./pages/playlist";
import ArtistsPage from "./pages/artists";
import Settings from "./pages/settings";
import AlbumPage from "./pages/albums";
import SongPage from "./pages/songs";
import Home from "./pages/home";

function App() {

  const [songList, setSongList] = useState<any[]>([]);
  // const [homeSongs, setHomeSongs] = useState<Songs[]>([]);

  const [albumList, setAlbumList] = useState<AlbumDetails[]>([]);
  // const [homeAlbums, setHomeAlbums] = useState<AlbumDetails[]>([]);

  const [artistList, setArtistList] = useState<AllArtistResults[]>([]);

  useEffect(() => {
    const selectedTheme = localStorage.getItem('theme');

    if(selectedTheme) {
      document.querySelector("body")?.setAttribute("data-theme", selectedTheme);
    }
    getValues();

    async function checkForFiles() {
      try {
        const res = await invoke<DirectoryInfo[]>('get_directory');
        if(res.length === 0) {
          clearLocalStorage();
        }
      }
      catch(e) {

      }
    }

    checkForFiles();
  }, []);

  useEffect(() => {
    // Listen for when the current folder scan has finished
    const unlisten_scan_finished = listen<boolean>("scan-finished", () => { getValues(); });
    
    return () => {
      unlisten_scan_finished.then(f => f());
    }

  }, []);

  async function getValues() {
    try {
      getSongs();
      getAlbums();
      getArtists();

    }
    catch(e) {
      alert(`Failed to scan folder: ${e}`);
    }
  }

  async function getSongs() {
    try {
      const song_list: SongsFull[] = await invoke<SongsFull[]>('get_all_songs');

      // const list = await invoke<Songs[]>('get_songs_with_limit', { limit: 30 } );

      setSongList(song_list);
      // setHomeSongs(list);
  }
    catch (err) {
      alert(`Failed to scan folder: ${err}`);
    }
  }

  // get all data for the media player's main pages
  async function getAlbums() {
    try {
      const list = await invoke<AlbumDetails[]>('get_all_albums');
      setAlbumList(list);

      // const list_limited: AlbumDetails[] = await invoke<AlbumDetails[]>('get_albums_with_limit', { limit: 30 } );
      // setHomeAlbums(list_limited);
        
    }
    catch (err) {
      alert(`Failed to scan folder: ${err}`);
    }
  }

  // get all data for the media player's main pages
  async function getArtists() {
    try {
      const list = await invoke<AllArtistResults[]>('get_all_artists');
      // console.log(list);
      setArtistList(list);
    }
    catch (err) {
      alert(`Failed to scan folder: ${err}`);
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
          <Routes>
            <Route path="/" element={ <Home /> }/>
            <Route path="/songs" element={ <SongPage songs={songList} /> }/>
            <Route path="/albums" element={ <AlbumPage albums={albumList} /> }/>
            <Route path="/artists" element={ <ArtistsPage artists={artistList} /> }/>
            <Route path="/queue" element={ <QueueOverviewPage /> }/>
            <Route path="/history" element={ <PlayHistoryPage /> }/>
            <Route path="/playlists" element={ <PlaylistPage /> }/>
            <Route path="/settings" element={ <Settings /> }/>
            <Route path="/albums/overview" element={ <AlbumOverviewPage />} />
            <Route path="/artists/overview" element={ <ArtistOverviewPage />} />
            <Route path="/playlists/overview" element={ <PlaylistOverviewPage />} />
          </Routes>
        </div>
      </BrowserRouter>      
    </div>
  );
}

export default App;