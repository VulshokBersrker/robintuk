import { Routes, Route, BrowserRouter } from "react-router-dom";
import "./App.css";

// Components
import MusicControls from "./components/musicControls";
import RightSideBar from "./components/rightSideBar";

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


// Need to add Artist hub
// Need to add content to the home page (if I'm going to keep it)
// Need to populate playlists

function App() {

  const selectedTheme = localStorage.getItem('theme');

  if(selectedTheme) {
    document.querySelector("body")?.setAttribute("data-theme", selectedTheme);
  }

  return(
    <BrowserRouter>
      <RightSideBar />
      <MusicControls />
      <div className="content">
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
        <div className="empty-space" />
      </div>
        
    </BrowserRouter>
  );
}

export default App;

