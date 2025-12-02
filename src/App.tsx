import { Routes, Route, BrowserRouter } from "react-router-dom";

import "./App.css";

// Components
import CustomWindowsBar from "./components/fileSystem/customWindowsBar";
import MusicControls from "./components/musicControls";
import RightSideBar from "./components/rightSideBar";
import SimpleBar from "simplebar-react";

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

function App() {

  const selectedTheme = localStorage.getItem('theme');

  if(selectedTheme) {
    document.querySelector("body")?.setAttribute("data-theme", selectedTheme);
  }

  return(
    <div 
      // onContextMenu={(e) => { e.preventDefault(); }}
    >
      <BrowserRouter>
        <CustomWindowsBar />
        <RightSideBar />
        <MusicControls />
        <SimpleBar forceVisible="y" autoHide={false} className="content">
          <Routes>
            <Route path="/" element={ <Home /> }/>
            <Route path="/songs" element={ <SongPage /> }/>
            <Route path="/albums" element={ <AlbumPage /> }/>
            <Route path="/artists" element={ <ArtistsPage /> }/>
            <Route path="/queue" element={ <QueueOverviewPage /> }/>
            <Route path="/playlists" element={ <PlaylistPage /> }/>
            <Route path="/settings" element={ <Settings /> }/>

            <Route path="/albums/overview" element={ <AlbumOverviewPage />} />
            <Route path="/artists/overview" element={ <ArtistOverviewPage />} />
            <Route path="/playlists/overview" element={ <PlaylistOverviewPage />} />
          </Routes>
          <div className="empty-space"></div>
        </SimpleBar>
          
      </BrowserRouter>
    </div>
  );
}

export default App;

