import "./AlbumCollectionNavigation.css";

import { ChevronLeft, ChevronRight } from "lucide-react";

import IconButton from "../../ui/Button/IconButton";

function AlbumCollectionNavigation({
  collection,
  currentIndex,
  totalCollections,
  onPrevious,
  onNext,
}) {
  const canGoPrevious = currentIndex > 0;

  const canGoNext = currentIndex >= 0 && currentIndex < totalCollections - 1;

  if (!collection) {
    return null;
  }

  return (
    <section className="album-collection-navigation">
      <div className="album-collection-navigation-info">
        <div className="album-collection-name">
          <h2>{collection.name}</h2>
        </div>

        <div className="album-collection-range">
          <span>#{String(collection.startNumber).padStart(3, "0")}</span>

          <span>–</span>

          <span>#{String(collection.endNumber).padStart(3, "0")}</span>
        </div>
      </div>

      <div className="album-collection-navigation-buttons">
        <IconButton
          variant="secondary"
          title="Previous collection"
          onClick={onPrevious}
          disabled={!canGoPrevious}
        >
          <ChevronLeft size={18} />
        </IconButton>

        <IconButton
          variant="secondary"
          title="Next collection"
          onClick={onNext}
          disabled={!canGoNext}
        >
          <ChevronRight size={18} />
        </IconButton>
      </div>
    </section>
  );
}

export default AlbumCollectionNavigation;
