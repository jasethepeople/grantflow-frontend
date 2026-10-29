import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function NavBar() {
  const { user, currentOrganization, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <nav style={styles.nav}>
      <div style={styles.left}>
        <Link to="/" style={styles.brand}>GrantFlow</Link>
        <Link to="/" style={styles.link}>Grants</Link>
        <Link to="/funders" style={styles.link}>Funders</Link>
        <Link to="/billing" style={styles.link}>Billing</Link>
      </div>
      <div style={styles.right}>
        {currentOrganization && (
          <span style={styles.org}>
            {currentOrganization.name} · <span style={styles.plan}>{currentOrganization.plan}</span>
          </span>
        )}
        <span style={styles.user}>{user.email}</span>
        <button
          style={styles.logoutButton}
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          Log out
        </button>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 20px",
    borderBottom: "1px solid #eee",
    fontFamily: "system-ui, sans-serif",
    fontSize: 14,
  },
  left: { display: "flex", alignItems: "center", gap: 18 },
  right: { display: "flex", alignItems: "center", gap: 14 },
  brand: { fontWeight: 700, textDecoration: "none", color: "#111", marginRight: 6 },
  link: { textDecoration: "none", color: "#444" },
  org: { color: "#666" },
  plan: { textTransform: "uppercase", fontSize: 11, fontWeight: 600, color: "#8a5a00" },
  user: { color: "#888" },
  logoutButton: {
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
};
