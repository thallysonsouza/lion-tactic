import "./AlbumHeader.css";

import { BookOpen } from "lucide-react";

function AlbumHeader() {
  return (
    <section className="album-header">
      <div className="album-header-title">
        <BookOpen size={26} />

        <h1>Album</h1>
      </div>
    </section>
  );
}

export default AlbumHeader;
