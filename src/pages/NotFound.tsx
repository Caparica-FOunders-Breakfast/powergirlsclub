import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", background: "#FBF9FB", color: "#2B1736", fontFamily: "Nunito, system-ui, sans-serif" }}>
      <p style={{ margin: 0, fontFamily: "Bangers, cursive", fontSize: "clamp(72px, 16vw, 112px)", letterSpacing: 2, color: "#C21C70", lineHeight: 1 }}>404</p>
      <h1 style={{ margin: "12px 0 0", fontFamily: "Bangers, cursive", fontWeight: 400, fontSize: 32, letterSpacing: 1 }}>This page took a rest day 💜</h1>
      <p style={{ margin: "8px 0 0", maxWidth: 360, fontWeight: 600, color: "#5E4E66" }}>We couldn't find the page you were looking for.</p>
      <Link to="/" style={{ marginTop: 28, display: "inline-flex", alignItems: "center", height: 52, padding: "0 28px", background: "#C21C70", color: "#FFFFFF", border: "2px solid #2B1736", borderRadius: 14, boxShadow: "4px 4px 0 #2B1736", fontWeight: 800, fontSize: 17, textDecoration: "none" }}>Back home</Link>
    </div>
  );
};

export default NotFound;
