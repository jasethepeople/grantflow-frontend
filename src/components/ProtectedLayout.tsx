import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NavBar } from "./NavBar";

export function ProtectedLayout() {
  const { token, loading } = useAuth();

  if (loading) return <div style={{ padding: 40, fontFamily: "system-ui, sans-serif" }}>Loading…</div>;
  if (!token) return <Navigate to="/login" replace />;

  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
}
