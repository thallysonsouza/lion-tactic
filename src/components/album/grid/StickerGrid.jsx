import { useEffect, useState } from "react";

import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabaseClient";

import StickerCard from "../card/StickerCard";

import "./StickerGrid.css";

function StickerGrid({ collection, userStickers = {}, onQuantityChange }) {
  const { user, isAuthenticated } = useAuth();

  const [stickerRecords, setStickerRecords] = useState([]);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  /* =========================================================
     LOAD CURRENT COLLECTION
  ========================================================= */

  useEffect(() => {
    if (!isAuthenticated || !user || !collection) {
      return;
    }

    async function loadStickers() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("stickers")
        .select(
          `
              id,
              collection_id,
              sticker_number,
              name,
              display_order
            `,
        )
        .gte("sticker_number", collection.startNumber)
        .lte("sticker_number", collection.endNumber)
        .order("sticker_number", {
          ascending: true,
        });

      if (error) {
        console.error("Error loading sticker collection:", error);

        setErrorMessage("Não foi possível carregar a coleção.");

        setLoading(false);

        return;
      }

      setStickerRecords(data || []);

      setLoading(false);
    }

    loadStickers();
  }, [isAuthenticated, user, collection]);

  /* =========================================================
     CHANGE QUANTITY
  ========================================================= */

  async function handleChangeQuantity(stickerId, nextQuantity) {
    if (!user) {
      return;
    }

    if (nextQuantity < 0) {
      return;
    }

    const previousQuantity = userStickers[stickerId] || 0;

    /* =====================================================
       UPDATE UI IMMEDIATELY
    ===================================================== */

    if (onQuantityChange) {
      onQuantityChange(stickerId, nextQuantity);
    }

    /* =====================================================
       REMOVE
    ===================================================== */

    if (nextQuantity === 0) {
      const { error } = await supabase
        .from("user_stickers")
        .delete()
        .eq("user_id", user.id)
        .eq("sticker_id", stickerId);

      if (error) {
        console.error("Error removing sticker:", error);

        if (onQuantityChange) {
          onQuantityChange(stickerId, previousQuantity);
        }
      }

      return;
    }

    /* =====================================================
       SAVE
    ===================================================== */

    const { error } = await supabase.from("user_stickers").upsert(
      {
        user_id: user.id,
        sticker_id: stickerId,
        quantity: nextQuantity,
      },
      {
        onConflict: "user_id,sticker_id",
      },
    );

    if (error) {
      console.error("Error saving sticker quantity:", error);

      if (onQuantityChange) {
        onQuantityChange(stickerId, previousQuantity);
      }
    }
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return <div className="sticker-grid-loading">LOADING COLLECTION...</div>;
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (errorMessage) {
    return <div className="sticker-grid-error">{errorMessage}</div>;
  }

  /* =========================================================
     EMPTY
  ========================================================= */

  if (stickerRecords.length === 0) {
    return <div className="sticker-grid-empty">NO STICKERS AVAILABLE</div>;
  }

  /* =========================================================
     CONTENT
  ========================================================= */

  return (
    <div className="sticker-grid">
      {stickerRecords.map((sticker) => (
        <StickerCard
          key={sticker.id}
          sticker={sticker}
          quantity={userStickers[sticker.id] || 0}
          onChange={handleChangeQuantity}
        />
      ))}
    </div>
  );
}

export default StickerGrid;
