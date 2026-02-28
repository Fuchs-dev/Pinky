import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { fetchLeaderboard, fetchMemberships, Membership } from "../../lib/api";
import Link from "next/link";

const AdminDashboardPage: NextPage = () => {
    const router = useRouter();
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [activeOrg, setActiveOrg] = useState<Membership | null>(null);
    const [error, setError] = useState<string | null>(null);

    const token = useMemo(() => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("accessToken");
    }, []);

    const activeOrgId = useMemo(() => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("activeOrgId");
    }, []);

    useEffect(() => {
        if (!token || !activeOrgId) {
            router.replace("/workspace");
            return;
        }

        fetchMemberships(token)
            .then((memberships) => {
                const membership = memberships.find((m) => m.organization.id === activeOrgId);
                if (!membership || (membership.role !== "ADMIN" && membership.role !== "ORGANIZER")) {
                    // Falls jemand unberechtigt hier landet
                    router.replace("/workspace");
                } else {
                    setActiveOrg(membership);
                }
            })
            .catch((err) => setError((err as Error).message));

        fetchLeaderboard(token, activeOrgId)
            .then(setLeaderboard)
            .catch(console.error);
    }, [router, token, activeOrgId]);

    if (!activeOrg) return <p style={{ padding: "2rem" }}>Lade Dashboard...</p>;

    return (
        <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", borderBottom: "2px solid #eee", paddingBottom: "1rem" }}>
                <div>
                    <h1 style={{ margin: 0, color: "#005f73" }}>Admin Dashboard</h1>
                    <p style={{ margin: "0.25rem 0 0 0", color: "#666" }}>Organisation: {activeOrg.organization.name}</p>
                </div>
                <Link href="/workspace" style={{ fontWeight: "bold", color: "#0a9396" }}>← Workspace wechseln</Link>
            </header>

            {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

            <section style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
                <button
                    onClick={() => router.push("/create")}
                    style={{ backgroundColor: "#0a9396", color: "#fff", border: "none", padding: "1rem 2rem", borderRadius: "8px", fontSize: "1.1rem", fontWeight: "bold", cursor: "pointer" }}
                >
                    + Neue Aufgabe erstellen
                </button>
                {/* Platz für zukünftige Admin Aktionen (Benutzerverwaltung etc) */}
            </section>

            {leaderboard.length > 0 && (
                <section style={{ marginTop: "2rem", padding: "1.5rem", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #ddd" }}>
                    <h2 style={{ marginTop: 0 }}>🏆 Team Leaderboard</h2>
                    <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "2px solid #ccc" }}>
                                <th style={{ padding: "12px 8px" }}>Rang</th>
                                <th style={{ padding: "12px 8px" }}>Mitglied</th>
                                <th style={{ padding: "12px 8px" }}>Punkte (Strike-Score) 🪙</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.map((member, index) => (
                                <tr key={member.id} style={{ borderBottom: "1px solid #eee" }}>
                                    <td style={{ padding: "12px 8px", fontWeight: "bold", color: index === 0 ? "#ca6702" : "inherit" }}>
                                        #{index + 1}
                                    </td>
                                    <td style={{ padding: "12px 8px", fontWeight: index === 0 ? "bold" : "normal" }}>
                                        {member.displayName || "Unknown User"}
                                    </td>
                                    <td style={{ padding: "12px 8px", fontWeight: "bold", color: "#005f73" }}>{member.strikeScore}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}
        </main>
    );
};

export default AdminDashboardPage;
