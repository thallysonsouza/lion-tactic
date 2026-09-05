import { useEffect, useMemo, useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabaseClient";

import "./AlbumMatchPanel.css";

const MATCHES_PER_PAGE = 6;

function AlbumMatchPanel() {
  const { user, isAuthenticated } = useAuth();

  const [matches, setMatches] = useState([]);
  const [proposals, setProposals] = useState({});

  const [exchangeIndexes, setExchangeIndexes] = useState({});

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [negotiatingKey, setNegotiatingKey] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  /* =========================================================
     LOAD MATCHES
  ========================================================= */

  async function loadMatches() {
    if (!isAuthenticated || !user) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc("find_perfect_sticker_matches");

    if (error) {
      console.error("Error loading sticker matches:", error);

      setErrorMessage("Não foi possível carregar seus matches.");

      setMatches([]);
      setLoading(false);

      return;
    }

    setMatches(data || []);
    setCurrentPage(1);

    setLoading(false);
  }

  /* =========================================================
     LOAD PROPOSALS
  ========================================================= */

  async function loadProposals() {
    if (!isAuthenticated || !user) {
      return;
    }

    const { data, error } = await supabase
      .from("sticker_trade_proposals")
      .select(
        `
          id,
          album_id,
          proposer_user_id,
          receiver_user_id,
          offered_sticker_id,
          requested_sticker_id,
          status,
          created_at
        `,
      )
      .or(`proposer_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`);

    if (error) {
      console.error("Error loading trade proposals:", error);

      return;
    }

    const proposalMap = {};

    for (const proposal of data || []) {
      const key = [
        proposal.album_id,
        proposal.proposer_user_id,
        proposal.receiver_user_id,
        proposal.offered_sticker_id,
        proposal.requested_sticker_id,
      ].join("-");

      proposalMap[key] = proposal;
    }

    setProposals(proposalMap);
  }

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadMatches();
    loadProposals();
  }, [isAuthenticated, user]);

  /* =========================================================
     GROUP MATCHES
  ========================================================= */

  const groupedMatches = useMemo(() => {
    const groups = new Map();

    for (const match of matches) {
      const key = `${match.album_id}-${match.other_game_player_id}`;

      if (!groups.has(key)) {
        groups.set(key, {
          albumId: match.album_id,
          albumName: match.album_name,
          otherGamePlayerId: match.other_game_player_id,
          exchanges: [],
        });
      }

      groups.get(key).exchanges.push({
        myStickerNumber: Number(match.my_sticker_number),

        theirStickerNumber: Number(match.their_sticker_number),
      });
    }

    return Array.from(groups.values());
  }, [matches]);

  /* =========================================================
     PAGINATION
  ========================================================= */

  const totalPages = useMemo(() => {
    return Math.max(Math.ceil(groupedMatches.length / MATCHES_PER_PAGE), 1);
  }, [groupedMatches.length]);

  const paginatedMatches = useMemo(() => {
    const start = (currentPage - 1) * MATCHES_PER_PAGE;

    return groupedMatches.slice(start, start + MATCHES_PER_PAGE);
  }, [groupedMatches, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  /* =========================================================
     EXCHANGE INDEX
  ========================================================= */

  function getExchangeIndex(matchKey) {
    return exchangeIndexes[matchKey] || 0;
  }

  function handlePreviousExchange(match, event) {
    event.stopPropagation();

    const matchKey = `${match.albumId}-${match.otherGamePlayerId}`;

    setExchangeIndexes((current) => {
      const currentIndex = current[matchKey] || 0;

      return {
        ...current,
        [matchKey]: Math.max(currentIndex - 1, 0),
      };
    });
  }

  function handleNextExchange(match, event) {
    event.stopPropagation();

    const matchKey = `${match.albumId}-${match.otherGamePlayerId}`;

    setExchangeIndexes((current) => {
      const currentIndex = current[matchKey] || 0;

      return {
        ...current,
        [matchKey]: Math.min(currentIndex + 1, match.exchanges.length - 1),
      };
    });
  }

  /* =========================================================
     PROPOSAL KEY
  ========================================================= */

  function buildProposalKey({
    albumId,
    otherGamePlayerId,
    myStickerNumber,
    theirStickerNumber,
  }) {
    return [
      albumId,
      otherGamePlayerId,
      myStickerNumber,
      theirStickerNumber,
    ].join("-");
  }

  /* =========================================================
     GET PROPOSAL STATUS
  ========================================================= */

  function getProposalStatus(match, exchange) {
    const relevantProposal = Object.values(proposals).find((proposal) => {
      if (proposal.album_id !== match.albumId) {
        return false;
      }

      const isReceiver = proposal.receiver_user_id === user?.id;

      const isProposer = proposal.proposer_user_id === user?.id;

      if (!isReceiver && !isProposer) {
        return false;
      }

      if (isProposer) {
        return (
          proposal.offered_sticker_id === match.offeredStickerId &&
          proposal.requested_sticker_id === match.requestedStickerId
        );
      }

      return false;
    });

    return relevantProposal || null;
  }

  /* =========================================================
     NEGOTIATE
  ========================================================= */

  async function handleNegotiate(match, exchange) {
    const proposalKey = buildProposalKey({
      albumId: match.albumId,

      otherGamePlayerId: match.otherGamePlayerId,

      myStickerNumber: exchange.myStickerNumber,

      theirStickerNumber: exchange.theirStickerNumber,
    });

    setNegotiatingKey(proposalKey);

    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "create_sticker_trade_proposal",
      {
        p_album_id: match.albumId,

        p_receiver_game_player_id: match.otherGamePlayerId,

        p_offered_sticker_number: exchange.myStickerNumber,

        p_requested_sticker_number: exchange.theirStickerNumber,
      },
    );

    if (error) {
      console.error("Error creating trade proposal:", error);

      setErrorMessage(
        error.message || "Não foi possível enviar a proposta de troca.",
      );

      setNegotiatingKey(null);

      return;
    }

    await loadProposals();

    setNegotiatingKey(null);

    return data;
  }

  /* =========================================================
     RENDER NEGOTIATE BUTTON
  ========================================================= */

  function renderNegotiationButton(match, exchange) {
    const proposalKey = buildProposalKey({
      albumId: match.albumId,

      otherGamePlayerId: match.otherGamePlayerId,

      myStickerNumber: exchange.myStickerNumber,

      theirStickerNumber: exchange.theirStickerNumber,
    });

    const isNegotiating = negotiatingKey === proposalKey;

    return (
      <button
        type="button"
        className="album-match-action"
        onClick={() => handleNegotiate(match, exchange)}
        disabled={isNegotiating}
      >
        {isNegotiating ? "SENDING..." : "NEGOTIATE"}
      </button>
    );
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
    return (
      <section className="album-match-panel">
        <div className="album-match-loading">SEARCHING FOR MATCHES...</div>
      </section>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (errorMessage && groupedMatches.length === 0) {
    return (
      <section className="album-match-panel">
        <div className="album-match-error">{errorMessage}</div>
      </section>
    );
  }

  /* =========================================================
     EMPTY
  ========================================================= */

  if (groupedMatches.length === 0) {
    return (
      <section className="album-match-panel">
        <div className="album-match-header">
          <div>
            <span>MATCH</span>

            <h2>No perfect matches</h2>
          </div>
        </div>

        <div className="album-match-empty">
          We could not find a perfect sticker exchange for your album yet.
        </div>
      </section>
    );
  }

  /* =========================================================
     CONTENT
  ========================================================= */

  return (
    <section className="album-match-panel">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="album-match-header">
        <div>
          <span>MATCH</span>

          <h2>Perfect exchanges found</h2>
        </div>

        <strong>{groupedMatches.length}</strong>
      </div>

      {/* =====================================================
          INLINE ERROR
      ===================================================== */}

      {errorMessage && (
        <div className="album-match-inline-error">{errorMessage}</div>
      )}

      {/* =====================================================
          MATCH GRID
      ===================================================== */}

      <div className="album-match-list">
        {paginatedMatches.map((match) => {
          const matchKey = `${match.albumId}-${match.otherGamePlayerId}`;

          const exchangeIndex = getExchangeIndex(matchKey);

          const exchange = match.exchanges[exchangeIndex];

          const totalExchanges = match.exchanges.length;

          return (
            <article key={matchKey} className="album-match-card">
              {/* =============================================
                    CARD HEADER
                ============================================= */}

              <div className="album-match-card-top">
                <div>
                  <span>PLAYER ID</span>

                  <strong>{match.otherGamePlayerId}</strong>
                </div>

                <div className="album-match-exchange-count">
                  <span>EXCHANGES</span>

                  <strong>
                    {exchangeIndex + 1} / {totalExchanges}
                  </strong>
                </div>
              </div>

              {/* =============================================
                    SINGLE EXCHANGE
                ============================================= */}

              <div className="album-match-featured">
                <button
                  type="button"
                  className="album-match-exchange-arrow"
                  onClick={(event) => handlePreviousExchange(match, event)}
                  disabled={exchangeIndex === 0}
                  aria-label="Previous exchange"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="album-match-side">
                  <span>YOU GIVE</span>

                  <strong>
                    #{String(exchange.myStickerNumber).padStart(3, "0")}
                  </strong>
                </div>

                <span className="album-match-arrow">→</span>

                <div className="album-match-side">
                  <span>YOU RECEIVE</span>

                  <strong>
                    #{String(exchange.theirStickerNumber).padStart(3, "0")}
                  </strong>
                </div>

                <button
                  type="button"
                  className="album-match-exchange-arrow"
                  onClick={(event) => handleNextExchange(match, event)}
                  disabled={exchangeIndex === totalExchanges - 1}
                  aria-label="Next exchange"
                >
                  <ChevronRight size={16} />
                </button>

                {renderNegotiationButton(match, exchange)}
              </div>
            </article>
          );
        })}
      </div>

      {/* =====================================================
          PAGINATION
      ===================================================== */}

      {totalPages > 1 && (
        <div className="album-match-pagination">
          <button
            type="button"
            className="album-match-page-arrow"
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={15} />
          </button>

          <div className="album-match-page-numbers">
            {Array.from(
              {
                length: totalPages,
              },
              (_, index) => index + 1,
            ).map((page) => (
              <button
                key={page}
                type="button"
                className={
                  page === currentPage
                    ? "album-match-page-number active"
                    : "album-match-page-number"
                }
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="album-match-page-arrow"
            onClick={() =>
              setCurrentPage((page) => Math.min(page + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </section>
  );
}

export default AlbumMatchPanel;
