import { useState } from "react";

import { supabase } from "../../../lib/supabaseClient";

import "./AlbumResetButton.css";

function AlbumResetButton({ onReset }) {
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /* =========================================================
     OPEN CONFIRMATION
  ========================================================= */

  function handleOpenConfirmation() {
    setErrorMessage("");
    setConfirming(true);
  }

  /* =========================================================
     CANCEL
  ========================================================= */

  function handleCancel() {
    if (resetting) {
      return;
    }

    setConfirming(false);
    setErrorMessage("");
  }

  /* =========================================================
     RESET
  ========================================================= */

  async function handleReset() {
    setResetting(true);
    setErrorMessage("");

    const { error } = await supabase.rpc("reset_my_album");

    if (error) {
      console.error("Error resetting album:", error);

      setErrorMessage("Não foi possível resetar o álbum.");

      setResetting(false);

      return;
    }

    setConfirming(false);
    setResetting(false);

    if (onReset) {
      onReset();
    }
  }

  /* =========================================================
     CONTENT
  ========================================================= */

  return (
    <>
      <button
        type="button"
        className="album-reset-button"
        onClick={handleOpenConfirmation}
      >
        RESET ALBUM
      </button>

      {confirming && (
        <div className="album-reset-overlay">
          <div className="album-reset-modal">
            <div className="album-reset-modal-header">
              <span>RESET ALBUM</span>

              <h2>Reset your album?</h2>
            </div>

            <p>All your sticker quantities will be removed from this album.</p>

            <p>This action cannot be undone.</p>

            {errorMessage && (
              <div className="album-reset-error">{errorMessage}</div>
            )}

            <div className="album-reset-actions">
              <button
                type="button"
                className="album-reset-cancel"
                onClick={handleCancel}
                disabled={resetting}
              >
                CANCEL
              </button>

              <button
                type="button"
                className="album-reset-confirm"
                onClick={handleReset}
                disabled={resetting}
              >
                {resetting ? "RESETTING..." : "RESET ALBUM"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AlbumResetButton;
