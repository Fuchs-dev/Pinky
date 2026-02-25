import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { fetchMyMicroTasks, MicroTaskSummary, completeTask } from "../../../lib/api";

const MyTasksPage: NextPage = () => {
    const router = useRouter();
    const [tasks, setTasks] = useState<{
        assigned: MicroTaskSummary[];
        done: MicroTaskSummary[];
    }>({ assigned: [], done: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const token = useMemo(() => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("accessToken");
    }, []);

    const orgId = useMemo(() => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("activeOrgId");
    }, []);

    const loadMyTasks = async () => {
        if (!token || !orgId) {
            router.replace("/login");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const allMyTasks = await fetchMyMicroTasks(token, orgId);
            setTasks({
                assigned: allMyTasks.filter((t: any) => t.status === "ASSIGNED"),
                done: allMyTasks.filter((t: any) => t.status === "DONE"),
            });
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMyTasks();
    }, [token, orgId]);

    const handleCompleteTask = async (microTaskId: string) => {
        if (!token || !orgId) return;
        try {
            await completeTask(token, orgId, microTaskId);
            loadMyTasks();
        } catch (err) {
            alert((err as Error).message);
        }
    };

    return (
        <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
            <header style={{ marginBottom: "1rem" }}>
                <h1>Meine Aufgaben</h1>
                <Link href="/microtasks">← Zurück zum Feed</Link>
            </header>
            {loading ? <p>Lade Aufgaben…</p> : null}
            {error ? (
                <div>
                    <p style={{ color: "crimson" }}>Fehler beim Laden</p>
                    <button onClick={loadMyTasks}>Erneut versuchen</button>
                </div>
            ) : null}

            {!loading && !error && tasks.assigned.length === 0 && tasks.done.length === 0 ? (
                <p>Du hast keine Aufgaben übernommen.</p>
            ) : null}

            {!loading && !error && tasks.assigned.length > 0 ? (
                <section style={{ marginBottom: "2rem" }}>
                    <h2 style={{ borderBottom: "2px solid #005f73", paddingBottom: "0.5rem" }}>Aktuell zu tun</h2>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                        {tasks.assigned.map((microTask) => (
                            <li
                                key={microTask.id}
                                style={{
                                    border: "2px solid #0a9396",
                                    backgroundColor: "#e0fbfc",
                                    borderRadius: "8px",
                                    padding: "1rem",
                                    marginBottom: "1rem"
                                }}
                            >
                                <h3 style={{ marginTop: 0, color: "#005f73" }}>{microTask.title}</h3>
                                <p style={{ margin: "0.25rem 0" }}>
                                    <strong>Task:</strong> {microTask.task ? microTask.task.title : "Unbekannt"}
                                </p>
                                <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}>
                                    <button onClick={() => handleCompleteTask(microTask.id)} style={{ padding: "0.5rem 1rem", backgroundColor: "#0a9396", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
                                        Erledigt
                                    </button>
                                    <Link href={`/microtasks/${microTask.id}`} style={{ display: "inline-block", fontWeight: "bold" }}>
                                        Details ansehen →
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {!loading && !error && tasks.done.length > 0 ? (
                <section>
                    <h2 style={{ borderBottom: "1px solid #ccc", paddingBottom: "0.5rem", color: "#666" }}>Abgeschlossen</h2>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                        {tasks.done.map((microTask) => (
                            <li
                                key={microTask.id}
                                style={{
                                    border: "1px solid #ddd",
                                    backgroundColor: "#f9f9f9",
                                    borderRadius: "8px",
                                    padding: "1rem",
                                    marginBottom: "1rem",
                                    color: "#666"
                                }}
                            >
                                <h3 style={{ marginTop: 0 }}>{microTask.title} (Erledigt)</h3>
                                <p style={{ margin: "0.25rem 0" }}>
                                    <strong>Task:</strong> {microTask.task ? microTask.task.title : "Unbekannt"}
                                </p>
                                <Link href={`/microtasks/${microTask.id}`} style={{ display: "inline-block", marginTop: "0.5rem" }}>
                                    Details ansehen →
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
        </main>
    );
};

export default MyTasksPage;
