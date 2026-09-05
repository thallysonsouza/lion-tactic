import { createPortal } from "react-dom";

import { useEffect, useState } from "react";

import { Check, X, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";

import "./NotificationPanel.css";

function NotificationPanel({ onClose, anchorRef }) {
  const { user, isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);

  const [processingProposal, setProcessingProposal] = useState(null);

  const [panelPosition, setPanelPosition] = useState({
    top: 0,
    right: 20,
  });

  /* =========================================================
     POSITION PANEL
  ========================================================= */

  function updatePanelPosition() {
    if (!anchorRef?.current) {
      return;
    }

    const rect = anchorRef.current.getBoundingClientRect();

    const panelWidth = 390;

    const right = Math.max(window.innerWidth - rect.right, 12);

    const top = rect.bottom + 8;

    setPanelPosition({
      top,
      right: Math.min(right, window.innerWidth - panelWidth - 12),
    });
  }

  /* =========================================================
     INITIAL POSITION
  ========================================================= */

  useEffect(() => {
    updatePanelPosition();

    window.addEventListener("resize", updatePanelPosition);

    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);

      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [anchorRef]);

  /* =========================================================
     LOAD NOTIFICATIONS
  ========================================================= */

  async function loadNotifications() {
    if (!isAuthenticated || !user) {
      return;
    }

    setLoading(true);

    /* =======================================================
     NOTIFICATIONS
  ======================================================= */

    const { data, error } = await supabase
      .from("notifications")
      .select(
        `
        id,
        type,
        trade_proposal_id,
        title,
        message,
        read_at,
        created_at
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(50);

    if (error) {
      console.error("Error loading notifications:", error);

      setNotifications([]);
      setLoading(false);

      return;
    }

    const notificationRows = data || [];

    /* =======================================================
     TRADE PROPOSAL DETAILS
  ======================================================= */

    const { data: proposalData, error: proposalError } = await supabase.rpc(
      "get_my_trade_proposal_details",
    );

    if (proposalError) {
      console.error("Error loading trade proposal details:", proposalError);
    }

    /* =======================================================
     CREATE PROPOSAL MAP
  ======================================================= */

    const proposalMap = {};

    for (const proposal of proposalData || []) {
      proposalMap[proposal.proposal_id] = proposal;
    }

    /* =======================================================
     ENRICH NOTIFICATIONS
  ======================================================= */

    const enrichedNotifications = notificationRows.map((notification) => ({
      ...notification,

      proposal: notification.trade_proposal_id
        ? proposalMap[notification.trade_proposal_id] || null
        : null,
    }));

    setNotifications(enrichedNotifications);

    setLoading(false);
  }

  /* =========================================================
   DELETE NOTIFICATION
========================================================= */

  async function handleDeleteNotification(event, notificationId) {
    event.stopPropagation();

    if (!user) {
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting notification:", error);

      return;
    }

    setNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId),
    );
  }

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadNotifications();
  }, [isAuthenticated, user]);

  /* =========================================================
     MARK READ
  ========================================================= */

  async function handleMarkAsRead(notificationId) {
    if (!user) {
      return;
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("notifications")
      .update({
        read_at: now,
      })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error marking notification as read:", error);

      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              read_at: now,
            }
          : notification,
      ),
    );
  }

  /* =========================================================
     RESPOND TO PROPOSAL
  ========================================================= */

  async function handleProposalResponse(notification, decision) {
    const proposalId = notification.trade_proposal_id;

    if (!proposalId) {
      return;
    }

    setProcessingProposal(proposalId);

    const { data, error } = await supabase.rpc(
      "respond_sticker_trade_proposal",
      {
        p_proposal_id: proposalId,

        p_decision: decision,
      },
    );

    if (error) {
      console.error("Error responding to trade proposal:", error);

      setProcessingProposal(null);

      return;
    }

    const nextStatus = data === "accepted" ? "accepted" : "rejected";

    const now = new Date().toISOString();

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              read_at: now,

              proposal: item.proposal
                ? {
                    ...item.proposal,
                    status: nextStatus,
                  }
                : item.proposal,
            }
          : item,
      ),
    );

    setProcessingProposal(null);
  }

  /* =========================================================
     TRADE PROPOSAL
  ========================================================= */

  function renderTradeProposal(notification) {
    const proposal = notification.proposal;

    if (!proposal) {
      return null;
    }

    const proposerGamePlayerId = proposal.proposer_game_player_id || "Unknown";

    const offeredNumber = proposal.offered_sticker_number;

    const requestedNumber = proposal.requested_sticker_number;

    const status = proposal.status;

    const isProcessing = processingProposal === notification.trade_proposal_id;

    return (
      <div className="notification-trade">
        {/* ===================================================
          PLAYER
      =================================================== */}

        <div className="notification-trade-player">
          <span>PLAYER ID</span>

          <strong>{proposerGamePlayerId}</strong>
        </div>

        {/* ===================================================
          EXCHANGE
      =================================================== */}

        <div className="notification-trade-exchange">
          <div>
            <span>THEY OFFER</span>

            <strong>#{String(offeredNumber ?? "").padStart(3, "0")}</strong>
          </div>

          <span className="notification-trade-arrow">→</span>

          <div>
            <span>YOU RECEIVE</span>

            <strong>#{String(requestedNumber ?? "").padStart(3, "0")}</strong>
          </div>
        </div>

        {/* ===================================================
          PENDING
      =================================================== */}

        {status === "pending" && (
          <div className="notification-trade-actions">
            <button
              type="button"
              className="notification-trade-accept"
              onClick={() => handleProposalResponse(notification, "accept")}
              disabled={isProcessing}
            >
              <Check size={12} />

              {isProcessing ? "..." : "ACCEPT"}
            </button>

            <button
              type="button"
              className="notification-trade-reject"
              onClick={() => handleProposalResponse(notification, "reject")}
              disabled={isProcessing}
            >
              <X size={12} />

              {isProcessing ? "..." : "REJECT"}
            </button>
          </div>
        )}

        {/* ===================================================
          ACCEPTED
      =================================================== */}

        {status === "accepted" && (
          <div className="notification-trade-result accepted">
            <strong>TRADE ACCEPTED</strong>

            <p>
              Add this player as a friend in Top Eleven and request the agreed
              exchange.
            </p>
          </div>
        )}

        {/* ===================================================
          REJECTED
      =================================================== */}

        {status === "rejected" && (
          <div className="notification-trade-result rejected">
            <strong>TRADE REJECTED</strong>

            <p>This trade proposal was rejected.</p>
          </div>
        )}
      </div>
    );
  }

  /* =========================================================
     AUTH
  ========================================================= */

  if (!isAuthenticated) {
    return null;
  }

  /* =========================================================
     PANEL
  ========================================================= */

  const panel = (
    <aside
      className="notification-panel"
      style={{
        top: `${panelPosition.top}px`,
        right: `${panelPosition.right}px`,
      }}
    >
      <div className="notification-panel-header">
        <div>
          <span>ACCOUNT</span>

          <h2>Notifications</h2>
        </div>

        <button
          type="button"
          className="notification-panel-close"
          onClick={onClose}
          aria-label="Close notifications"
        >
          ×
        </button>
      </div>

      <div className="notification-list">
        {loading && <div className="notification-state">LOADING...</div>}

        {!loading && notifications.length === 0 && (
          <div className="notification-state">No notifications.</div>
        )}

        {!loading &&
          notifications.map((notification) => (
            <article
              key={notification.id}
              className={
                notification.read_at
                  ? "notification-item"
                  : "notification-item unread"
              }
            >
              <div className="notification-item-header">
                <div className="notification-item-type">
                  <span>
                    {notification.type === "trade_proposal"
                      ? "TRADE PROPOSAL"
                      : "NOTIFICATION"}
                  </span>

                  {!notification.read_at && (
                    <span className="notification-unread-dot" />
                  )}
                </div>

                <button
                  type="button"
                  className="notification-delete-button"
                  onClick={(event) =>
                    handleDeleteNotification(event, notification.id)
                  }
                  aria-label="Delete notification"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              <strong>{notification.title}</strong>

              <p>{notification.message}</p>

              {notification.type === "trade_proposal" &&
                renderTradeProposal(notification)}

              <small>
                {new Date(notification.created_at).toLocaleString()}
              </small>
            </article>
          ))}
      </div>
    </aside>
  );

  return createPortal(panel, document.body);
}

export default NotificationPanel;
