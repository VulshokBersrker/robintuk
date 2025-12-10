import { Routes, Route, BrowserRouter } from "react-router-dom";

import "./App.css";

// Components
import CustomWindowsBar from "./components/fileSystem/customWindowsBar";
import MusicControls from "./components/musicControls";
import RightSideBar from "./components/rightSideBar";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import SimpleBar from "simplebar-react";

// Custom Components
import { AlbumDetails, AlbumRes, AllArtistResults, ArtistRes, SongRes, Songs } from "./globalValues";

// Pages
import PlaylistOverviewPage from "./pages/details/playlistDetails";
import ArtistOverviewPage from "./pages/details/artistDetails";
import AlbumOverviewPage from "./pages/details/albumDetails";
import QueueOverviewPage from "./pages/queue";
import PlaylistPage from "./pages/playlist";
import ArtistsPage from "./pages/artists";
import Settings from "./pages/settings";
import AlbumPage from "./pages/albums";
import SongPage from "./pages/songs";
import Home from "./pages/home";

// https://www.dhiwise.com/blog/design-converter/mastering-react-scrollrestoration-for-better-navigation

function App() {

  const [songList, setSongList] = useState<any[]>([]);
  const [homeSongs, setHomeSongs] = useState<Songs[]>([]);

  const [albumList, setAlbumList] = useState<AlbumDetails[]>([]);
  const [homeAlbums, setHomeAlbums] = useState<AlbumDetails[]>([]);

  const [artistList, setArtistList] = useState<AllArtistResults[]>([]);

  const [loading, setLoading] = useState<boolean>(true);


  useEffect(() => {
    const selectedTheme = localStorage.getItem('theme');

    if(selectedTheme) {
      document.querySelector("body")?.setAttribute("data-theme", selectedTheme);
    }
    

    getValues();


  }, []);

  async function getValues() {
    try {
      console.log("Loading Start");
      setLoading(true);
      getSongs();
      getAlbums();
      getArtists();

    }
    catch(e) {
      alert(`Failed to scan folder: ${e}`);
    }
    finally {
      console.log("Loading End");
      setLoading(false);
    }
  }

  async function getSongs() {
    try {
      // const list: SongRes[] = await invoke<SongRes[]>('get_all_songs');
      // let testV: any[] = [];
      // for(let i = 0; i < list.length; i++) {
      //   testV.push(list[i].name);
      //   for(let j = 0; j < list[i].song_list.length; j++) {
      //     testV.push(list[i].song_list[j]);
      //   }
      // }
      // console.log(testV)
      // setSongList(testV);

      const list = await invoke<Songs[]>('get_songs_with_limit', { limit: 30 } );
      // console.log(list);
      setHomeSongs(list);
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

      const list_limited: AlbumDetails[] = await invoke<AlbumDetails[]>('get_albums_with_limit', { limit: 30 } );
      setHomeAlbums(list_limited);
        
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
        {/* <SimpleBar forceVisible="y" autoHide={false} className="content"> */}
        <div className="content">
          <Routes>
            <Route path="/" element={ <Home /> }/>
            <Route path="/songs" element={ <SongPage  /> }/>
            <Route path="/albums" element={ <AlbumPage albums={albumList}/> }/>
            <Route path="/artists" element={ <ArtistsPage artists={artistList}/> }/>
            <Route path="/queue" element={ <QueueOverviewPage /> }/>
            <Route path="/playlists" element={ <PlaylistPage /> }/>
            <Route path="/settings" element={ <Settings /> }/>
            <Route path="/albums/overview" element={ <AlbumOverviewPage />} />
            <Route path="/artists/overview" element={ <ArtistOverviewPage />} />
            <Route path="/playlists/overview" element={ <PlaylistOverviewPage />} />
          </Routes>
        </div>
          {/* <div className="empty-space"></div> */}
        {/* </SimpleBar> */}
      </BrowserRouter>
    </div>
  );
}

export default App;

