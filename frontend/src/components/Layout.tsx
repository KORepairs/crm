import React, { useEffect, useRef } from "react";

export type Page =
  | "dashboard"
  | "leads"
  | "follow-up"
  | "campaigns"
  | "import"
  | "settings";

export function Layout({
  userName,
  userRole,
  onLogout,
  children,
  page,
  onNavigate,
  title,
}: {
  userName: string;
  userRole: string;
  onLogout: () => void;
  children: React.ReactNode;
  page: Page;
  onNavigate: (p: Page) => void;
  title: string;
}) {

  const contentRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  contentRef.current?.scrollTo({
    top: 0,
    behavior: "auto",
  });
}, [page]);
  const navItemStyle = (active: boolean): React.CSSProperties => ({
    ...styles.navItem,
    ...(active ? styles.navItemActive : {}),
    cursor: "pointer",
  });

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>CRM</div>

        <nav style={styles.nav}>
          <div style={navItemStyle(page === "dashboard")} onClick={() => onNavigate("dashboard")}>
            Dashboard
          </div>
          <div style={navItemStyle(page === "leads")} onClick={() => onNavigate("leads")}>
            Leads
          </div>
          <div style={navItemStyle(page === "follow-up")} onClick={() => onNavigate("follow-up")}>
            Follow-Up
          </div>
          <div style={navItemStyle(page === "campaigns")} onClick={() => onNavigate("campaigns")}>
            Campaigns
          </div>
          <div style={navItemStyle(page === "import")} onClick={() => onNavigate("import")}>
            Import
          </div>

          <div style={{ height: 10 }} />

          <div style={navItemStyle(page === "settings")} onClick={() => onNavigate("settings")}>
            Settings
          </div>
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={{ fontWeight: 700 }}>{userName}</div>
          <div style={{ opacity: 0.8, fontSize: 13 }}>{userRole}</div>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.topbar}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>

          <button onClick={onLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>

        <div ref={contentRef} style={styles.content}>
  {children}
</div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    height: "100vh",
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    background: "#f6f7fb",
    color: "#0f172a",
    fontFamily: "system-ui",
    overflow: "hidden",
  },
  sidebar: {
    borderRight: "1px solid #e5e7eb",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 18,
    background: "#ffffff",
    height: "100vh",
    overflowY: "auto",
    boxSizing: "border-box",
  },
  brand: {
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: 0.5,
  },
  nav: { display: "grid", gap: 8 },
  navItem: {
    padding: "10px 12px",
    borderRadius: 10,
    background: "transparent",
    border: "1px solid transparent",
    opacity: 0.9,
    userSelect: "none",
  },
  navItemActive: {
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    opacity: 1,
    fontWeight: 800,
  },
  sidebarFooter: {
    marginTop: "auto",
    paddingTop: 14,
    borderTop: "1px solid #e5e7eb",
  },
  main: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    height: "100vh",
    overflow: "hidden",
  },
  topbar: {
    height: 64,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 18px",
    borderBottom: "1px solid #e5e7eb",
    background: "#ffffff",
    flexShrink: 0,
  },
  logoutBtn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#0f172a",
    cursor: "pointer",
    fontWeight: 700,
  },
  content: {
    padding: 18,
    maxWidth: 1400,
    width: "100%",
    margin: "0 auto",
    overflowY: "auto",
    flex: 1,
    boxSizing: "border-box",
  },
};