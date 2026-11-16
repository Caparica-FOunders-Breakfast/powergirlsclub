import AdminUsersTable from "@/components/AdminUsersTable";
import { useIsMobile } from "@/hooks/use-mobile";

const Users = () => {
  const isMobile = useIsMobile();
  return (
    <div style={{ background: "#FBF9FB", minHeight: "100%", color: "#2B1736", fontFamily: "Nunito, system-ui, sans-serif", padding: isMobile ? "20px 16px 28px" : "32px 24px 64px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24 }}>
        <div>
          <p style={{ margin: 0, fontSize: isMobile ? 12 : 13, fontWeight: 800, letterSpacing: 1, color: "#77677E" }}>ADMIN</p>
          <h1 style={{ margin: "2px 0 0", fontFamily: "Bangers, cursive", fontWeight: 400, fontSize: isMobile ? 40 : 52, letterSpacing: 1, lineHeight: 1 }}>Users</h1>
        </div>
        <AdminUsersTable title="All members" />
      </div>
    </div>
  );
};

export default Users;
