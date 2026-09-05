import albumCollections from "../../constants/albumCollections";

/* =========================================================
   BUILD ALBUM CATALOG
   Gera automaticamente:
   - índice da coleção
   - número inicial
   - número final
   - figurinhas da coleção
========================================================= */

function buildAlbumCatalog() {
  let currentStickerNumber = 1;

  return albumCollections.map((collection, collectionIndex) => {
    const startNumber = currentStickerNumber;

    const stickers = Array.from(
      { length: collection.stickerCount },
      (_, index) => ({
        stickerNumber: startNumber + index,
        displayOrder: index + 1,
      }),
    );

    const endNumber = startNumber + collection.stickerCount - 1;

    currentStickerNumber = endNumber + 1;

    return {
      id: collectionIndex + 1,
      name: collection.name,
      stickerCount: collection.stickerCount,
      startNumber,
      endNumber,
      displayOrder: collectionIndex + 1,
      stickers,
    };
  });
}

export default buildAlbumCatalog;
