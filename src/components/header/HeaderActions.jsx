import { Bell, Moon, Settings } from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";

import NotificationPanel from "../notifications/NotificationPanel";

import "./HeaderActions.css";

function HeaderActions() {
  const { user, isAuthenticated } = useAuth();

  const [notificationOpen, setNotificationOpen] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);

  const notificationButtonRef = useRef(null);

  /* =========================================================
     LOAD UNREAD COUNT
  ========================================================= */

  async function loadUnreadCount() {
    if (!isAuthenticated || !user) {
      setUnreadCount(0);

      return;
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      console.error("Error loading unread notifications:", error);

      return;
    }

    setUnreadCount(count || 0);
  }

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadUnreadCount();
  }, [isAuthenticated, user]);

  /* =========================================================
     ESCAPE
  ========================================================= */

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setNotificationOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  /* =========================================================
     TOGGLE
  ========================================================= */

  function handleNotificationClick() {
    setNotificationOpen((current) => !current);
  }

  /* =========================================================
     CLOSE
  ========================================================= */

  function handleCloseNotifications() {
    setNotificationOpen(false);

    loadUnreadCount();
  }

  return (
    <div className="header-actions">
      {/* =====================================================
          NOTIFICATIONS
      ===================================================== */}

      <div className="header-notification-wrapper">
        <button
          ref={notificationButtonRef}
          type="button"
          className="header-notification-button"
          onClick={handleNotificationClick}
          aria-label="Notifications"
        >
          <Bell size={18} />

          {unreadCount > 0 && (
            <span className="header-notification-badge">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {notificationOpen && (
          <NotificationPanel
            onClose={handleCloseNotifications}
            anchorRef={notificationButtonRef}
          />
        )}
      </div>

      {/* =====================================================
          THEME
      ===================================================== */}

      <button type="button" aria-label="Theme">
        <Moon size={18} />
      </button>

      {/* =====================================================
          SETTINGS
      ===================================================== */}

      <button type="button" aria-label="Settings">
        <Settings size={18} />
      </button>
    </div>
  );
}

export default HeaderActions;
