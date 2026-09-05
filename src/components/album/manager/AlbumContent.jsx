import "./AlbumContent.css";

import AlbumHeader from "../header/AlbumHeader";
import AlbumManager from "./AlbumManager";

function AlbumContent() {
  return (
    <main className="album-content">
      <AlbumHeader />

      <AlbumManager />
    </main>
  );
}

export default AlbumContent;
