import React, { useEffect, useRef } from "react";
import {
  Home,
  Library,
  Layers,
  ClipboardCheck,
  ChartNoAxesCombined,
  Compass,
  Target,
  Users,
  Settings,
  X,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { ActiveNavTab } from "../types";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  flashcardsCount?: number;
  weakTopicsCount?: number;
}
export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
  flashcardsCount = 0,
  weakTopicsCount = 0,
}) => {
  const { user } = useAuth();
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() =>
      panel.current
        ?.querySelector<HTMLButtonElement>(".aven-menu-close")
        ?.focus(),
    );
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseMobile();
      if (event.key === "Tab") {
        const nodes = Array.from(
          panel.current?.querySelectorAll<HTMLElement>("button,a[href]") || [],
        ).filter((el) => el.getClientRects().length > 0);
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [mobileOpen, onCloseMobile]);
  const groups: Array<{
    title: string;
    items: Array<{
      id: ActiveNavTab;
      label: string;
      icon: LucideIcon;
      count?: number;
    }>;
  }> = [
    {
      title: "YOUR STUDY SPACE",
      items: [
        { id: "home", label: "Overview", icon: Home },
        { id: "study-kits", label: "My library", icon: Library },
        {
          id: "flashcards",
          label: "Flashcards",
          icon: Layers,
          count: flashcardsCount,
        },
        { id: "quizzes", label: "Practice quizzes", icon: ClipboardCheck },
      ],
    },
    {
      title: "KEEP GROWING",
      items: [
        { id: "my-progress", label: "My progress", icon: ChartNoAxesCombined },
        {
          id: "weak-topics",
          label: "Topics to revisit",
          icon: Target,
          count: weakTopicsCount,
        },
        { id: "adaptive-model", label: "Learning insights", icon: Compass },
        { id: "peer-comparison", label: "Peer comparison", icon: Users },
      ],
    },
  ];
  const select = (tab: ActiveNavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };
  return (
    <>
      {mobileOpen && (
        <button
          className="aven-menu-backdrop"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          tabIndex={-1}
        />
      )}
      <aside
        ref={panel}
        id="app-sidebar"
        onTransitionEnd={(event) => {
          if (
            mobileOpen &&
            event.target === event.currentTarget &&
            !event.currentTarget.contains(document.activeElement)
          )
            event.currentTarget
              .querySelector<HTMLButtonElement>(".aven-menu-close")
              ?.focus();
        }}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen || undefined}
        className={`aven-sidebar ${mobileOpen ? "is-open" : ""}`}
        aria-label="Workspace navigation"
      >
        <div className="aven-sidebar-brand">
          <a href="#" aria-label="Aven public home">
            AVEN
          </a>
          <button
            className="aven-menu-close"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <p className="aven-sidebar-tagline">A little more understood.</p>
        <nav aria-label="Main navigation">
          {groups.map((group) => (
            <div className="aven-nav-group" key={group.title}>
              <p>{group.title}</p>
              {group.items.map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  id={`nav-${id}`}
                  onClick={() => select(id)}
                  aria-current={activeTab === id ? "page" : undefined}
                  className={activeTab === id ? "is-active" : ""}
                >
                  <Icon size={18} strokeWidth={1.6} />
                  <span>{label}</span>
                  {!!count && <small>{count}</small>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="aven-sidebar-bottom">
          <a href="#" className="aven-public-link">
            Explore Aven
            <ArrowUpRight size={15} />
          </a>
          <button
            id="nav-settings"
            onClick={() => select("settings")}
            aria-current={activeTab === "settings" ? "page" : undefined}
          >
            <Settings size={17} />
            Settings
          </button>
          <button className="aven-profile" onClick={() => select("settings")}>
            <span className="aven-avatar">
              {(user?.profile?.full_name || "S").slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{user?.profile?.full_name || "Student"}</strong>
              <small>
                {user?.profile?.department || "Your personal study space"}
              </small>
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};
