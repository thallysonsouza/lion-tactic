import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabaseClient";

import buildAlbumCatalog from "../../../util/album/buildAlbumCatalog";

import AlbumCollectionNavigation from "../navigation/AlbumCollectionNavigation";
import AlbumMatchPanel from "../match/AlbumMatchPanel";
import AlbumResetButton from "../reset/AlbumResetButton";
import StickerGrid from "../grid/StickerGrid";

import "./AlbumManager.css";

const albumCatalog = buildAlbumCatalog();

function formatMatchCountdown(milliseconds) {
  const totalSeconds = Math.max(Math.floor(milliseconds / 1000), 0);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

function AlbumManager() {
  const { user, isAuthenticated } = useAuth();

  const [gamePlayerId, setGamePlayerId] = useState("");
  const [allowMatches, setAllowMatches] = useState(false);
  const [matchesExpiresAt, setMatchesExpiresAt] = useState(null);

  const [userStickers, setUserStickers] = useState({});

  const [currentCollectionIndex, setCurrentCollectionIndex] = useState(0);

  const [activeSection, setActiveSection] = useState("album");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  /* =========================================================
     CURRENT TIME
  ========================================================= */

  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!matchesExpiresAt) {
      return undefined;
    }

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [matchesExpiresAt]);

  /* =========================================================
     TOTAL STICKERS
  ========================================================= */

  const totalStickers = useMemo(() => {
    return albumCatalog.reduce(
      (total, collection) => total + collection.stickerCount,
      0,
    );
  }, []);

  /* =========================================================
     MATCH TIME REMAINING
  ========================================================= */

  const matchTimeRemaining = useMemo(() => {
    if (!matchesExpiresAt) {
      return 0;
    }

    const expirationTime = new Date(matchesExpiresAt).getTime();

    if (!Number.isFinite(expirationTime)) {
      return 0;
    }

    return Math.max(expirationTime - currentTime, 0);
  }, [matchesExpiresAt, currentTime]);

  /* =========================================================
     MATCH STATUS
  ========================================================= */

  const matchIsActive = useMemo(() => {
    return allowMatches && matchTimeRemaining > 0;
  }, [allowMatches, matchTimeRemaining]);

  /* =========================================================
     LOAD USER DATA
  ========================================================= */

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    async function loadAlbumData() {
      setLoading(true);
      setMessage("");

      try {
        /* =====================================================
           PROFILE
        ===================================================== */

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("game_player_id, allow_matches, matches_expires_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        /* =====================================================
           USER STICKERS
        ===================================================== */

        const { data: stickerData, error: stickerError } = await supabase
          .from("user_stickers")
          .select("sticker_id, quantity")
          .eq("user_id", user.id);

        if (stickerError) {
          throw stickerError;
        }

        /* =====================================================
           PROFILE STATE
        ===================================================== */

        if (profile) {
          const expiration = profile.matches_expires_at || null;

          setGamePlayerId(profile.game_player_id || "");
          setMatchesExpiresAt(expiration);

          const active =
            Boolean(profile.allow_matches) &&
            Boolean(expiration) &&
            new Date(expiration).getTime() > Date.now();

          setAllowMatches(active);
        } else {
          setGamePlayerId("");
          setAllowMatches(false);
          setMatchesExpiresAt(null);
        }

        /* =====================================================
           STICKER QUANTITY MAP
        ===================================================== */

        const quantityMap = {};

        for (const sticker of stickerData || []) {
          quantityMap[sticker.sticker_id] = sticker.quantity;
        }

        setUserStickers(quantityMap);
      } catch (error) {
        console.error("Error loading album data:", error);

        setMessage("Não foi possível carregar os dados do álbum.");
      } finally {
        setLoading(false);
      }
    }

    loadAlbumData();
  }, [isAuthenticated, user]);

  /* =========================================================
     CURRENT COLLECTION
  ========================================================= */

  const currentCollection = useMemo(() => {
    return albumCatalog[currentCollectionIndex] || null;
  }, [currentCollectionIndex]);

  /* =========================================================
     ALBUM STATISTICS
  ========================================================= */

  const albumStats = useMemo(() => {
    let obtained = 0;
    let duplicates = 0;

    for (const quantity of Object.values(userStickers)) {
      const numericQuantity = Number(quantity);

      if (!Number.isFinite(numericQuantity)) {
        continue;
      }

      if (numericQuantity > 0) {
        obtained += 1;
      }

      if (numericQuantity > 1) {
        duplicates += numericQuantity - 1;
      }
    }

    const missing = Math.max(totalStickers - obtained, 0);

    return {
      obtained,
      missing,
      duplicates,
    };
  }, [userStickers, totalStickers]);

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function handlePreviousCollection() {
    setCurrentCollectionIndex((current) => Math.max(current - 1, 0));
  }

  function handleNextCollection() {
    setCurrentCollectionIndex((current) =>
      Math.min(current + 1, albumCatalog.length - 1),
    );
  }

  /* =========================================================
     UPDATE STICKER QUANTITY
  ========================================================= */

  function handleStickerQuantityChange(stickerId, quantity) {
    setUserStickers((current) => {
      const next = {
        ...current,
      };

      if (quantity <= 0) {
        delete next[stickerId];
      } else {
        next[stickerId] = quantity;
      }

      return next;
    });
  }

  /* =========================================================
     RESET ALBUM
  ========================================================= */

  function handleAlbumReset() {
    setUserStickers({});
    setMessage("Álbum resetado com sucesso.");
  }

  /* =========================================================
     SAVE PROFILE + MATCH
  ========================================================= */

  async function handleSave() {
    if (!user) {
      return;
    }

    setSaving(true);
    setMessage("");

    const now = new Date();

    const nextExpiration = allowMatches
      ? new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        game_player_id: gamePlayerId.trim(),
        allow_matches: allowMatches,
        matches_expires_at: nextExpiration,
        updated_at: now.toISOString(),
      },
      {
        onConflict: "user_id",
      },
    );

    if (error) {
      console.error("Error saving album profile:", error);

      setMessage("Não foi possível salvar suas informações.");

      setSaving(false);

      return;
    }

    setMatchesExpiresAt(nextExpiration);

    setCurrentTime(Date.now());

    setMessage(
      allowMatches
        ? "Match renovado por 24 horas."
        : "Participação em Match desativada.",
    );

    setSaving(false);
  }

  /* =========================================================
     AUTH
  ========================================================= */

  if (!isAuthenticated) {
    return null;
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return <div className="album-manager-loading">LOADING...</div>;
  }

  /* =========================================================
     CONTENT
  ========================================================= */

  return (
    <section className="album-manager">
      {/* =====================================================
          TABS
      ===================================================== */}

      <div className="album-manager-tabs">
        <button
          type="button"
          className={
            activeSection === "album"
              ? "album-manager-tab active"
              : "album-manager-tab"
          }
          onClick={() => setActiveSection("album")}
        >
          MY ALBUM
        </button>

        <button
          type="button"
          className={
            activeSection === "matches"
              ? "album-manager-tab active"
              : "album-manager-tab"
          }
          onClick={() => setActiveSection("matches")}
        >
          MATCHES
        </button>
      </div>

      {/* =====================================================
          MY ALBUM
      ===================================================== */}

      {activeSection === "album" && (
        <>
          {/* =================================================
              TOP AREA
          ================================================= */}

          <div className="album-manager-top">
            {/* ===============================================
                OVERVIEW
            =============================================== */}

            <div className="album-manager-overview">
              <div className="album-manager-overview-header">
                <div>
                  <span className="album-manager-overview-label">
                    COLLECTION PROGRESS
                  </span>

                  <h2>My Album</h2>
                </div>

                <strong>
                  {albumStats.obtained} / {totalStickers}
                </strong>
              </div>

              <progress
                className="album-progress"
                value={albumStats.obtained}
                max={totalStickers}
              />

              <div className="album-manager-stats">
                <div>
                  <span>OBTAINED</span>

                  <strong>{albumStats.obtained}</strong>
                </div>

                <div>
                  <span>MISSING</span>

                  <strong>{albumStats.missing}</strong>
                </div>

                <div>
                  <span>DUPLICATES</span>

                  <strong>{albumStats.duplicates}</strong>
                </div>
              </div>
            </div>

            {/* ===============================================
                TRADE SETTINGS
            =============================================== */}

            <div className="album-manager-settings">
              <div className="album-manager-settings-header">
                <span>TRADE SETTINGS</span>

                {message && <small>{message}</small>}
              </div>

              <div className="album-manager-settings-row">
                <div className="album-manager-field">
                  <label htmlFor="game-player-id">GAME PLAYER ID</label>

                  <input
                    id="game-player-id"
                    type="text"
                    value={gamePlayerId}
                    onChange={(event) => setGamePlayerId(event.target.value)}
                    placeholder="Enter your game ID"
                  />
                </div>

                <label className="album-manager-match">
                  <input
                    type="checkbox"
                    checked={matchIsActive}
                    onChange={(event) => setAllowMatches(event.target.checked)}
                  />

                  <span>Participate in matches</span>
                </label>

                <div className="album-manager-actions">
                  <button
                    type="button"
                    className="album-manager-save"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "SAVING..." : "SAVE"}
                  </button>

                  <AlbumResetButton onReset={handleAlbumReset} />
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              MATCH STATUS
          ================================================= */}

          <div className="album-manager-match-status">
            {matchIsActive ? (
              <>
                <span className="album-match-status-dot active" />

                <span>MATCH ACTIVE</span>

                <strong className="album-match-countdown">
                  {formatMatchCountdown(matchTimeRemaining)}
                </strong>
              </>
            ) : (
              <>
                <span className="album-match-status-dot" />

                <span>MATCH EXPIRED</span>
              </>
            )}
          </div>

          {/* =================================================
              COLLECTION NAVIGATION
          ================================================= */}

          <AlbumCollectionNavigation
            collection={currentCollection}
            currentIndex={currentCollectionIndex}
            totalCollections={albumCatalog.length}
            onPrevious={handlePreviousCollection}
            onNext={handleNextCollection}
          />

          {/* =================================================
              STICKERS
          ================================================= */}

          <div className="album-manager-stickers">
            <StickerGrid
              collection={currentCollection}
              userStickers={userStickers}
              onQuantityChange={handleStickerQuantityChange}
            />
          </div>
        </>
      )}

      {/* =====================================================
          MATCHES
      ===================================================== */}

      {activeSection === "matches" && (
        <div className="album-manager-match-view">
          <AlbumMatchPanel />
        </div>
      )}
    </section>
  );
}

export default AlbumManager;
