import React, { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  HelpCircle,
  LogOut,
  Menu,
  Plus,
  X,
} from "lucide-react";
import { NotificationItem, ActiveNavTab } from "../types";
import { useAuth } from "../context/AuthContext";

interface HeaderProps {
  activeTab: ActiveNavTab;
  onOpenMobileMenu: () => void;
  notifications: NotificationItem[];
  onMarkAllNotificationsRead: () => void;
  onMarkOneNotificationRead?: (id: string) => void;
  onOpenUpload: () => void;
  onOpenOnboarding?: () => void;
}
const names: Record<ActiveNavTab, string> = {
  home: "Overview",
  "study-kits": "My library",
  flashcards: "Flashcards",
  quizzes: "Practice quizzes",
  "my-progress": "My progress",
  "adaptive-model": "Learning insights",
  "weak-topics": "Topics to revisit",
  "peer-comparison": "Peer comparison",
  settings: "Settings",
};
export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  notifications,
  onMarkAllNotificationsRead,
  onMarkOneNotificationRead,
  onOpenUpload,
  onOpenOnboarding,
}) => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState<"notifications" | "profile" | null>(null);
  const root = useRef<HTMLElement>(null);
  const bell = useRef<HTMLButtonElement>(null),
    profile = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        (open === "profile" ? profile : bell).current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const unread = notifications.filter((n) => !n.read && !n.isRead).length;
  return (
    <header ref={root} className="aven-workspace-header">
      <div className="aven-header-location">
        <button
          onClick={onOpenMobileMenu}
          className="aven-hamburger"
          aria-label="Open sidebar menu"
        >
          <Menu size={21} />
        </button>
        <span>My workspace</span>
        <i>/</i>
        <strong>{names[activeTab]}</strong>
      </div>
      <div className="aven-header-actions">
        <button className="aven-upload-action" onClick={onOpenUpload}>
          <Plus size={17} />
          <span>Add material</span>
        </button>
        {onOpenOnboarding && (
          <button
            className="aven-guide-action"
            onClick={onOpenOnboarding}
            aria-label="Open study guide"
          >
            <HelpCircle size={19} />
          </button>
        )}
        <button
          ref={bell}
          onClick={() =>
            setOpen(open === "notifications" ? null : "notifications")
          }
          aria-expanded={open === "notifications"}
          aria-controls="aven-notifications"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          className="aven-icon-button"
        >
          <Bell size={19} />
          {unread > 0 && <span className="aven-unread-dot" />}
        </button>
        <button
          ref={profile}
          className="aven-account-button"
          aria-label="User menu"
          aria-expanded={open === "profile"}
          aria-controls="aven-user-menu"
          onClick={() => setOpen(open === "profile" ? null : "profile")}
        >
          <span className="aven-avatar">
            {(user?.profile?.full_name || "S").slice(0, 1).toUpperCase()}
          </span>
          <ChevronDown size={14} />
        </button>
      </div>
      {open === "notifications" && (
        <section
          id="aven-notifications"
          aria-label="Notifications"
          className="aven-header-popover"
        >
          <div className="aven-popover-heading">
            <h2>Notifications</h2>
            <button
              aria-label="Close notifications"
              onClick={() => {
                setOpen(null);
                bell.current?.focus();
              }}
            >
              <X size={17} />
            </button>
          </div>
          {unread > 0 && (
            <button
              className="aven-read-all"
              onClick={onMarkAllNotificationsRead}
            >
              Mark all as read
            </button>
          )}
          {notifications.length === 0 ? (
            <p className="aven-popover-empty">
              You’re all caught up. Your study updates will appear here.
            </p>
          ) : (
            <div className="aven-notification-list">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read && !n.isRead) onMarkOneNotificationRead?.(n.id);
                  }}
                  className={!n.read && !n.isRead ? "is-unread" : ""}
                >
                  <strong>{n.title}</strong>
                  <p>{n.message || n.description}</p>
                  <small>{n.timeAgo}</small>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      {open === "profile" && (
        <section
          id="aven-user-menu"
          aria-label="Your account"
          className="aven-header-popover aven-account-popover"
        >
          <strong>{user?.profile?.full_name || "Student"}</strong>
          <p>{user?.email}</p>
          {user?.profile?.institution && (
            <small>{user.profile.institution}</small>
          )}
          <a href="#">Visit Aven’s home page</a>
          <button
            onClick={() => {
              setOpen(null);
              void logout();
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </section>
      )}
    </header>
  );
};
