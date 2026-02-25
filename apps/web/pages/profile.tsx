import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { fetchMyProfile, updateMyProfile, UserProfile } from "../lib/api";

const ProfilePage: NextPage = () => {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        if (!token) {
            router.replace("/login");
            return;
        }
        fetchMyProfile(token)
            .then((data) => {
                setProfile(data);
                setLoading(false);
            })
            .catch((err) => {
                setFeedback({ type: "error", message: (err as Error).message });
                setLoading(false);
            });
    }, [router]);

    const handleChange = (field: keyof UserProfile, value: any) => {
        if (profile) {
            setProfile({ ...profile, [field]: value });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem("accessToken");
        if (!token || !profile) return;

        setSaving(true);
        setFeedback(null);
        try {
            const { id, email, ...updateData } = profile;
            const updated = await updateMyProfile(token, updateData);
            setProfile(updated);
            setFeedback({ type: "success", message: "Profil erfolgreich gespeichert!" });
        } catch (err) {
            setFeedback({ type: "error", message: (err as Error).message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p style={{ padding: "2rem" }}>Lade Profil...</p>;
    if (!profile) return <p style={{ padding: "2rem" }}>Fehler beim Laden des Profils.</p>;

    return (
        <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
            <button onClick={() => router.back()} style={{ marginBottom: "1rem", cursor: "pointer" }}>
                &larr; Zurück
            </button>

            <h1>Mein Profil</h1>
            <p style={{ color: "#555" }}>{profile.email}</p>

            {feedback && (
                <div style={{
                    padding: "1rem",
                    marginBottom: "1rem",
                    backgroundColor: feedback.type === "success" ? "#d4edda" : "#f8d7da",
                    color: feedback.type === "success" ? "#155724" : "#721c24",
                    borderRadius: "4px"
                }}>
                    {feedback.message}
                </div>
            )}

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>

                <label>
                    <strong>Anzeigename</strong><br />
                    <input
                        type="text"
                        value={profile.displayName || ""}
                        onChange={(e) => handleChange("displayName", e.target.value)}
                        style={{ width: "100%", padding: "0.5rem" }}
                    />
                </label>

                <label>
                    <strong>Alter</strong><br />
                    <input
                        type="number"
                        value={profile.age || ""}
                        onChange={(e) => handleChange("age", parseInt(e.target.value, 10) || undefined)}
                        style={{ width: "100%", padding: "0.5rem" }}
                        min={0}
                    />
                </label>

                <label>
                    <strong>Geschlecht</strong><br />
                    <select
                        value={profile.gender || ""}
                        onChange={(e) => handleChange("gender", e.target.value || undefined)}
                        style={{ width: "100%", padding: "0.5rem" }}
                    >
                        <option value="">Keine Angabe</option>
                        <option value="female">Weiblich</option>
                        <option value="male">Männlich</option>
                        <option value="diverse">Divers</option>
                        <option value="preferNotToSay">Möchte ich nicht sagen</option>
                    </select>
                </label>

                <label>
                    <strong>Sparte / Abteilung</strong><br />
                    <input
                        type="text"
                        value={profile.department || ""}
                        onChange={(e) => handleChange("department", e.target.value)}
                        style={{ width: "100%", padding: "0.5rem" }}
                    />
                </label>

                <label>
                    <strong>Interessen</strong><br />
                    <input
                        type="text"
                        value={profile.interests || ""}
                        onChange={(e) => handleChange("interests", e.target.value)}
                        style={{ width: "100%", padding: "0.5rem" }}
                        placeholder="z.B. IT, Handwerk, Social Media"
                    />
                </label>

                <label>
                    <strong>Qualifikationen</strong><br />
                    <textarea
                        value={profile.qualifications || ""}
                        onChange={(e) => handleChange("qualifications", e.target.value)}
                        style={{ width: "100%", padding: "0.5rem", minHeight: "80px" }}
                        placeholder="z.B. Erste Hilfe Schein, Staplerführerschein"
                    />
                </label>

                <label>
                    <strong>Hilfs-Kontext</strong><br />
                    <textarea
                        value={profile.helpContext || ""}
                        onChange={(e) => handleChange("helpContext", e.target.value)}
                        style={{ width: "100%", padding: "0.5rem", minHeight: "80px" }}
                        placeholder="Wann und wie kannst du am besten helfen?"
                    />
                </label>

                <label style={{ backgroundColor: "#f0f8ff", padding: "1rem", borderRadius: "8px", border: "1px solid #b6d4fe" }}>
                    <strong>⏳ Wöchentliches Zeit-Budget (Minuten)</strong><br />
                    <p style={{ fontSize: "0.85rem", margin: "0.5rem 0", color: "#555" }}>
                        Wie viel Zeit hast du pro Woche prinzipiell für Aufgaben zur Verfügung? Diese Angabe hilft der KI, Aufgaben fair zu verteilen.
                    </p>
                    <input
                        type="number"
                        value={profile.weeklyTimeBudgetMinutes || 0}
                        onChange={(e) => handleChange("weeklyTimeBudgetMinutes", parseInt(e.target.value, 10) || 0)}
                        style={{ width: "100%", padding: "0.5rem" }}
                        min={0}
                        step={15}
                    />
                </label>

                {/* Bedingungsprüfung für Führerschein: Nur ab 18 Jahren */}
                {(profile.age && profile.age >= 18) ? (
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "1rem", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
                        <input
                            type="checkbox"
                            checked={profile.hasDriversLicense || false}
                            onChange={(e) => handleChange("hasDriversLicense", e.target.checked)}
                            style={{ width: "20px", height: "20px" }}
                        />
                        <strong>Führerschein vorhanden</strong>
                    </label>
                ) : null}

                <button
                    type="submit"
                    disabled={saving}
                    style={{
                        marginTop: "1rem",
                        padding: "1rem",
                        backgroundColor: "#0070f3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "1.1rem",
                        cursor: saving ? "not-allowed" : "pointer"
                    }}
                >
                    {saving ? "Wird gespeichert..." : "Profil Speichern"}
                </button>
            </form>
        </main>
    );
};

export default ProfilePage;
