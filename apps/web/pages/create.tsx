import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { createTask, createMicroTask, generateTaskSuggestions } from "../lib/api";

const CreateTaskPage: NextPage = () => {
    const router = useRouter();

    const token = useMemo(() => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("accessToken");
    }, []);

    const orgId = useMemo(() => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("activeOrgId");
    }, []);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // AI State
    const [aiPrompt, setAiPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    // Step 1: Task State
    const [taskTitle, setTaskTitle] = useState("");
    const [taskCategory, setTaskCategory] = useState("CLEANUP");

    // Step 2: MicroTasks State
    const [microTasks, setMicroTasks] = useState<Array<{
        title: string;
        description_how: string;
        location: string;
        dueAt: string;
        estimatedDuration: string;
        impactReason: string;
        rewardPoints: number;
        suggestedAssigneeId?: string | null;
        selected?: boolean;
    }>>([]);

    const handleGenerateTasks = async () => {
        if (!token || !orgId) {
            alert("Nicht angemeldet oder keine Organisation ausgewählt");
            return;
        }
        if (!aiPrompt.trim()) {
            alert("Bitte geben Sie einen Prompt ein.");
            return;
        }
        setIsGenerating(true);
        setError(null);
        try {
            const data = await generateTaskSuggestions(token, orgId, aiPrompt);
            if (data.microTasks && Array.isArray(data.microTasks)) {
                const newTasks = data.microTasks.map((t: any) => ({
                    title: t.title || "",
                    description_how: t.description_how || "",
                    location: t.location || "",
                    dueAt: "",
                    estimatedDuration: t.estimatedDuration || "",
                    impactReason: t.impactReason || "",
                    rewardPoints: t.rewardPoints || 10,
                    suggestedAssigneeId: t.suggestedAssigneeId,
                    selected: true
                }));
                // Set the main task title based on prompt if not set
                if (!taskTitle) setTaskTitle(aiPrompt.substring(0, 50));
                setMicroTasks(newTasks);
                setStep(2); // Auto advance to step 2
            }
        } catch (err: any) {
            console.error("AI Generation Error:", err);
            setError(err.message || "Fehler beim Generieren der Vorschläge");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddMicroTask = () => {
        setMicroTasks([
            ...microTasks,
            {
                title: "",
                description_how: "",
                location: "",
                dueAt: "",
                estimatedDuration: "",
                impactReason: "",
                rewardPoints: 10,
            }
        ]);
    };

    const handleUpdateMicroTask = (index: number, field: string, value: any) => {
        const updated = [...microTasks];
        updated[index] = { ...updated[index], [field]: value };
        setMicroTasks(updated);
    };

    const handleRemoveMicroTask = (index: number) => {
        const updated = [...microTasks];
        updated.splice(index, 1);
        setMicroTasks(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !orgId) {
            alert("Nicht angemeldet oder keine Organisation ausgewählt");
            router.replace("/login");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            // 1. Create Main Task
            const taskResult = await createTask(token, orgId, {
                title: taskTitle,
                category: taskCategory,
                description: `Erstellt via Web-UI für ${taskCategory}`
            });

            // 2. Iterate and Create MicroTasks
            for (const mt of microTasks) {
                if (!mt.title || mt.selected === false) continue; // Skip empty or unselected
                await createMicroTask(token, orgId, taskResult.id, {
                    title: mt.title,
                    description_how: mt.description_how,
                    location: mt.location,
                    dueAt: mt.dueAt ? new Date(mt.dueAt).toISOString() : undefined,
                    estimatedDuration: mt.estimatedDuration,
                    impactReason: mt.impactReason,
                    rewardPoints: mt.rewardPoints,
                    assignedUserId: mt.suggestedAssigneeId || undefined
                });
            }

            alert("Erfolgreich angelegt!");
            router.push("/admin");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Unbekannter Fehler beim Speichern");
        } finally {
            setLoading(false);
        }
    };

    if (!token || !orgId) {
        return <main style={{ padding: "2rem" }}>Bitte zuerst einloggen und in einen Workspace wechseln.</main>;
    }

    return (
        <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
            <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1 style={{ margin: 0 }}>Neue Aufgabe erstellen</h1>
                <Link href="/admin" style={{ color: "#005f73", fontWeight: "bold" }}>Abbrechen</Link>
            </header>

            {error && <p style={{ color: "crimson", padding: "1rem", backgroundColor: "#ffebee", borderRadius: "8px" }}>{error}</p>}

            <form onSubmit={handleSubmit}>
                {/* STEP 1: Main Project */}
                {step >= 1 && (
                    <section style={{ border: "1px solid #ddd", padding: "1.5rem", borderRadius: "8px", marginBottom: "2rem", backgroundColor: "#fff" }}>
                        <h2 style={{ marginTop: 0, color: "#005f73" }}>Schritt 1: Projekt anlegen</h2>

                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Projekttitel</label>
                            <input
                                required
                                type="text"
                                placeholder="z.B. Sommerfest 2026"
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                            />
                        </div>

                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Kategorie</label>
                            <select
                                value={taskCategory}
                                onChange={(e) => setTaskCategory(e.target.value)}
                                style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                            >
                                <option value="CLEANUP">Aufräumarbeiten (Cleanup)</option>
                                <option value="EVENT">Veranstaltung (Event)</option>
                                <option value="MAINTENANCE">Instandhaltung (Maintenance)</option>
                            </select>
                        </div>

                        {step === 1 && (
                            <div style={{ display: "flex", gap: "1rem" }}>
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    style={{ padding: "0.75rem 1.5rem", backgroundColor: "#005f73", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                                >
                                    Weiter zu Schritt 2
                                </button>
                            </div>
                        )}

                        <hr style={{ margin: "2rem 0", border: "none", borderTop: "1px solid #ddd" }} />

                        {step === 1 && (
                            <div style={{ padding: "1.5rem", backgroundColor: "#fdf8f5", border: "1px dashed #e76f51", borderRadius: "8px" }}>
                                <h3 style={{ marginTop: 0, color: "#e76f51" }}>✨ Projekt durch KI generieren</h3>
                                <p style={{ fontSize: "0.9rem", color: "#555", marginBottom: "1rem" }}>
                                    Beschreiben Sie das Projekt oder Vorhaben in wenigen Sätzen oder nennen Sie einfach einen Begriff.
                                    Die KI erstellt automatisch einen passenden Projektplan und schlägt direkt geeignete Helfer vor!
                                </p>
                                <textarea
                                    placeholder="z.B. Wir planen ein Sommerfest für 100 Personen am See. Wir brauchen Aufbau, Catering und Musik..."
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #ccc", minHeight: "80px", marginBottom: "1rem" }}
                                />
                                <button
                                    type="button"
                                    onClick={handleGenerateTasks}
                                    disabled={isGenerating || !aiPrompt.trim()}
                                    style={{ padding: "0.75rem 1.5rem", backgroundColor: isGenerating ? "#ccc" : "#e76f51", color: "white", border: "none", borderRadius: "4px", cursor: isGenerating ? "not-allowed" : "pointer", fontWeight: "bold" }}
                                >
                                    {isGenerating ? "Generiere Vorschläge..." : "🪄 KI Vorschläge generieren"}
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {/* STEP 2: MicroTasks */}
                {step >= 2 && (
                    <section style={{ border: "1px solid #ddd", padding: "1.5rem", borderRadius: "8px", marginBottom: "2rem", backgroundColor: "#fafafa" }}>
                        <h2 style={{ marginTop: 0, color: "#0a9396" }}>Schritt 2: Aufgaben (MicroTasks) aufteilen</h2>
                        <p>Unterteilen Sie das Projekt in mundgerechte "MicroTasks" für Ihre Helfer.</p>

                        {microTasks.map((mt, index) => (
                            <div key={index} style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", backgroundColor: "#fff" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <input
                                            type="checkbox"
                                            checked={mt.selected !== false}
                                            onChange={(e) => handleUpdateMicroTask(index, "selected", e.target.checked)}
                                            style={{ width: "1.2rem", height: "1.2rem", cursor: "pointer" }}
                                        />
                                        <h3 style={{ margin: 0 }}>Aufgabe #{index + 1}</h3>
                                    </div>
                                    <button type="button" onClick={() => handleRemoveMicroTask(index)} style={{ color: "crimson", border: "none", background: "none", cursor: "pointer", fontWeight: "bold" }}>Entfernen</button>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                    <div style={{ gridColumn: "1 / -1" }}>
                                        <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Was ist zu tun?</label>
                                        <input required type="text" placeholder="Titel der Microtask" value={mt.title} onChange={(e) => handleUpdateMicroTask(index, "title", e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }} />
                                    </div>

                                    <div style={{ gridColumn: "1 / -1" }}>
                                        <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Wie? (Anleitung)</label>
                                        <textarea placeholder="Konkrete Hinweise..." value={mt.description_how} onChange={(e) => handleUpdateMicroTask(index, "description_how", e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", minHeight: "80px" }} />
                                    </div>

                                    <div>
                                        <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Wo? (Ort)</label>
                                        <input type="text" value={mt.location} onChange={(e) => handleUpdateMicroTask(index, "location", e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }} />
                                    </div>

                                    <div>
                                        <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Wann? (Datum/Zeit)</label>
                                        <input type="datetime-local" value={mt.dueAt} onChange={(e) => handleUpdateMicroTask(index, "dueAt", e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }} />
                                    </div>

                                    <div>
                                        <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Dauer? (Schätzung)</label>
                                        <input type="text" placeholder="z.B. 2 Stunden" value={mt.estimatedDuration} onChange={(e) => handleUpdateMicroTask(index, "estimatedDuration", e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }} />
                                    </div>

                                    <div>
                                        <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold", color: "#ca6702" }}>Punkte (Strike-Belohnung) 🪙</label>
                                        <input type="number" min="1" value={mt.rewardPoints} onChange={(e) => handleUpdateMicroTask(index, "rewardPoints", parseInt(e.target.value))} style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ca6702", backgroundColor: "#fffcf2" }} />
                                    </div>

                                    <div style={{ gridColumn: "1 / -1" }}>
                                        <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold", color: "#ca6702" }}>Impact (Warum ist das wichtig?)</label>
                                        <textarea placeholder="Dieses Tun hilft uns, weil..." value={mt.impactReason} onChange={(e) => handleUpdateMicroTask(index, "impactReason", e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ca6702", minHeight: "60px", backgroundColor: "#fffcf2" }} />
                                    </div>

                                    {mt.suggestedAssigneeId && (
                                        <div style={{ gridColumn: "1 / -1", padding: "0.75rem", backgroundColor: "#e9ecef", borderRadius: "4px", border: "1px solid #ddd" }}>
                                            <span style={{ fontWeight: "bold", color: "#495057" }}>💡 KI Zuweisungs-Vorschlag:</span>
                                            <span style={{ marginLeft: "0.5rem", fontSize: "0.9rem", color: "#6c757d" }}>(User ID: {mt.suggestedAssigneeId})</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={handleAddMicroTask}
                            style={{ width: "100%", padding: "1rem", border: "2px dashed #0a9396", borderRadius: "8px", background: "none", color: "#0a9396", fontWeight: "bold", cursor: "pointer" }}
                        >
                            + MicroTask hinzufügen
                        </button>
                    </section>
                )}

                {/* STEP 3: Submission */}
                {step >= 2 && (
                    <div style={{ textAlign: "right", marginTop: "2rem", padding: "1.5rem", borderTop: "2px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <span style={{ color: "#666" }}>Schließt nur angehakte (ausgewählte) Aufgaben ein.</span>
                        </div>
                        <button
                            type="submit"
                            disabled={loading || microTasks.length === 0}
                            style={{ padding: "1rem 2rem", fontSize: "1.1rem", backgroundColor: loading ? "#ccc" : "#94d2bd", color: loading ? "#666" : "#001219", border: "none", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer", fontWeight: "bold" }}
                        >
                            {loading ? "Speichern läuft..." : (microTasks.length > 0 ? "✓ Alle gewählten Aufgaben übernehmen" : "Projekt & Aufgaben hochladen")}
                        </button>
                    </div>
                )}
            </form>
        </main>
    );
};

export default CreateTaskPage;
