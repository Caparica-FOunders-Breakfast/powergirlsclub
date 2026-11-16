import { Fragment, useMemo, useState } from "react";
import { useAdminMembers, formatSupabaseError, type AdminMember } from "@/hooks/useAdminMembers";
import { useIsMobile } from "@/hooks/use-mobile";

const C = { ink: "#2B1736", sub: "#77677E", body: "#5E4E66", pink: "#C21C70", magenta: "#E8308C", seg: "#EFE6F1", row: "#EFE6F1", border: "#E4DAE7" };
const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const formatRelative = (iso: string | null) => {
  if (!iso) return "Never";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return day < 30 ? `${day}d ago` : formatDate(iso);
};

const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

const planChip = (u: AdminMember) => {
  if (!u.planned_per_week) return { text: "No plan", bg: "#F6F1F7", fg: C.body };
  const kind = u.plan_type === "custom" ? "Custom" : "Default";
  return { text: `${kind} · ${u.planned_per_week} days`, bg: u.plan_type === "custom" ? "#FFF0F7" : "#F1E9FE", fg: u.plan_type === "custom" ? "#A3165E" : "#5B21B6" };
};

/** "This week" mini progress: one segment per planned day. */
export const WeekProgress = ({ u }: { u: AdminMember }) => {
  const total = Math.max(u.planned_per_week ?? 0, u.week_workouts);
  if (!total) return <span style={{ fontSize: 12, fontWeight: 800, color: C.sub }}>—</span>;
  return (
    <div>
      <div style={{ display: "flex", gap: 3, width: 72 }} aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} style={{ flex: 1, height: 8, borderRadius: 999, background: i < u.week_workouts ? C.magenta : C.seg }} />
        ))}
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, color: C.body }}>{u.week_workouts} of {u.planned_per_week ?? 0}</span>
    </div>
  );
};

export const Avatar = ({ u, size = 36 }: { u: AdminMember; size?: number }) => (
  <span style={{ flex: "none", width: size, height: size, borderRadius: 999, background: u.avatar_color, color: "#FFFFFF", fontWeight: 800, fontSize: size < 40 ? 13 : 15, display: "flex", alignItems: "center", justifyContent: "center" }}>{initialsOf(u.display_name)}</span>
);

const th: React.CSSProperties = { padding: "10px 8px", fontWeight: 800, fontSize: 13, color: C.sub, textAlign: "left", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "14px 8px", verticalAlign: "middle" };

const AdminUsersTable = ({ title = "Members" }: { title?: string }) => {
  const { data, isLoading, error } = useAdminMembers();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const users = data?.users ?? [];
    const q = query.trim().toLowerCase();
    return q ? users.filter((u) => `${u.display_name} ${u.email ?? ""}`.toLowerCase().includes(q)) : users;
  }, [data, query]);

  return (
    <section style={{ background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 22, padding: isMobile ? 18 : 24, color: C.ink, fontFamily: "Nunito, system-ui, sans-serif" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0, ...bangers, fontSize: isMobile ? 26 : 30, letterSpacing: 1 }}>
          {title} {data && <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 15, fontWeight: 800, color: C.sub }}>{query ? `${filtered.length} of ${data.users.length}` : data.users.length}</span>}
        </h2>
        <label style={{ display: "flex", alignItems: "center", gap: 8, height: 44, padding: "0 14px", border: `2px solid ${C.ink}`, borderRadius: 12, background: "#FFFFFF", minWidth: 0, flex: isMobile ? "1 1 100%" : "0 1 280px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Search members</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" style={{ flex: 1, minWidth: 0, border: 0, height: "100%", fontSize: 15, color: C.ink, background: "transparent", outline: "none" }} />
        </label>
      </div>

      {data?.warnings?.length ? (
        <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", fontSize: 13, fontWeight: 700, color: C.body }}>
          {data.warnings.map((w, i) => <li key={i}>Some data couldn't load. {w}</li>)}
        </ul>
      ) : null}

      {error ? (
        <p style={{ margin: "16px 0 0", fontWeight: 800, color: "#A3165E" }}>Couldn't load members: {formatSupabaseError(error)}</p>
      ) : isLoading ? (
        <p style={{ margin: "16px 0 0", color: C.sub }}>Loading members...</p>
      ) : filtered.length === 0 ? (
        <p style={{ margin: "16px 0 0", color: C.sub }}>{query ? "No members match that search." : "No members yet."}</p>
      ) : isMobile ? (
        /* Phones: one card per member (mobile-dashboard mockup) instead of a wide table. */
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((u) => {
            const open = expanded === u.user_id;
            const chip = planChip(u);
            return (
              <div key={u.user_id} style={{ border: `2px solid ${C.border}`, borderRadius: 14 }}>
                <button type="button" aria-expanded={open} onClick={() => setExpanded(open ? null : u.user_id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 12, background: "transparent", border: 0, textAlign: "left", cursor: "pointer", color: C.ink, fontFamily: "inherit" }}>
                  <Avatar u={u} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 800 }}>{u.display_name}</p>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.body }}>{u.workout_days} workouts · active {formatRelative(u.last_active_at).toLowerCase()}</p>
                    {u.planned_per_week ? (
                      <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ display: "flex", gap: 2, width: 56 }} aria-hidden="true">
                          {Array.from({ length: Math.max(u.planned_per_week, u.week_workouts) }).map((_, i) => (
                            <span key={i} style={{ flex: 1, height: 6, borderRadius: 999, background: i < u.week_workouts ? C.magenta : C.seg }} />
                          ))}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: C.body }}>{u.week_workouts} of {u.planned_per_week} this week</span>
                      </div>
                    ) : (
                      <span style={{ display: "inline-block", marginTop: 4, padding: "1px 8px", borderRadius: 999, background: chip.bg, color: chip.fg, fontSize: 11, fontWeight: 800 }}>{chip.text}</span>
                    )}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}><path d="M9 6l6 6-6 6" /></svg>
                </button>
                {open && (
                  <dl style={{ margin: 0, padding: "0 12px 12px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px 12px", fontSize: 13 }}>
                    {[
                      ["Plan", chip.text],
                      ["Joined", formatDate(u.joined_at)],
                      ["Email", u.email ?? "Not available"],
                      ["Body weight", u.body_weight ? `${u.body_weight} kg` : "—"],
                    ].map(([k, v]) => (
                      <div key={k} style={{ minWidth: 0 }}>
                        <dt style={{ fontSize: 11, fontWeight: 800, color: C.sub }}>{k}</dt>
                        <dd style={{ margin: 0, fontWeight: 800, overflowWrap: "anywhere" }}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ marginTop: 16, overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontSize: 15 }}>
            <thead>
              <tr>
                <th style={th}>Member</th>
                <th style={th}>Joined</th>
                <th style={th}>Last active</th>
                <th style={th}>This week</th>
                <th style={{ ...th, textAlign: "right" }}>Workouts</th>
                <th style={th}>Plan</th>
                <th style={th}><span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Details</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const open = expanded === u.user_id;
                const chip = planChip(u);
                return (
                  <Fragment key={u.user_id}>
                    <tr style={{ borderTop: `1px solid ${C.row}`, cursor: "pointer" }} onClick={() => setExpanded(open ? null : u.user_id)}>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <Avatar u={u} />
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 800 }}>{u.display_name}</p>
                            {u.email && <p style={{ margin: 0, fontSize: 13, color: C.sub }}>{u.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...td, color: C.body, fontWeight: 600, whiteSpace: "nowrap" }}>{formatDate(u.joined_at)}</td>
                      <td style={{ ...td, color: C.body, fontWeight: 600, whiteSpace: "nowrap" }}>{formatRelative(u.last_active_at)}</td>
                      <td style={td}><WeekProgress u={u} /></td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{u.workout_days}</td>
                      <td style={td}><span style={{ padding: "3px 10px", borderRadius: 999, background: chip.bg, color: chip.fg, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>{chip.text}</span></td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <button type="button" aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} details for ${u.display_name}`} onClick={(e) => { e.stopPropagation(); setExpanded(open ? null : u.user_id); }} style={{ width: 36, height: 36, border: 0, background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}><path d="M9 6l6 6-6 6" /></svg>
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr style={{ background: "#FBF9FB" }}>
                        <td colSpan={7} style={{ padding: "12px 8px 16px" }}>
                          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px 16px", fontSize: 14 }}>
                            {[
                              ["Email", u.email ?? "Not available"],
                              ["Program start", formatDate(u.start_date)],
                              ["Progress goal", u.progress_goal ?? "—"],
                              ["Body weight", u.body_weight ? `${u.body_weight} kg` : "—"],
                              ["Team", u.team_id ? "In a team" : "No team"],
                            ].map(([k, v]) => (
                              <div key={k}>
                                <dt style={{ fontSize: 12, fontWeight: 800, color: C.sub }}>{k}</dt>
                                <dd style={{ margin: 0, fontWeight: 800, textTransform: k === "Progress goal" ? "capitalize" : undefined }}>{v}</dd>
                              </div>
                            ))}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default AdminUsersTable;
