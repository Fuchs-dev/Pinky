import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { fetchMicroTasks, MicroTaskSummary, acceptOffer, rejectOffer, assignTask, joinQueue } from "../../lib/api";

const MicroTaskFeedPage: NextPage = () => {
  const router = useRouter();
  const [microTasks, setMicroTasks] = useState<{
    offered: MicroTaskSummary[];
    open: MicroTaskSummary[];
  }>({ offered: [], open: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return localStorage.getItem("accessToken");
  }, []);

  const orgId = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return localStorage.getItem("activeOrgId");
  }, []);

  const loadMicroTasks = async () => {
    if (!token || !orgId) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMicroTasks(token, orgId);
      setMicroTasks(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async (microTaskId: string) => {
    if (!token || !orgId) return;
    try {
      await acceptOffer(token, orgId, microTaskId);
      loadMicroTasks();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleRejectOffer = async (microTaskId: string) => {
    if (!token || !orgId) return;
    try {
      await rejectOffer(token, orgId, microTaskId);
      loadMicroTasks();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleAssignTask = async (microTaskId: string) => {
    if (!token || !orgId) return;
    try {
      await assignTask(token, orgId, microTaskId);
      loadMicroTasks();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleJoinQueue = async (microTaskId: string) => {
    if (!token || !orgId) return;
    try {
      await joinQueue(token, orgId, microTaskId);
      alert("Erfolgreich in die Warteschlange eingetragen!");
      loadMicroTasks();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  useEffect(() => {
    loadMicroTasks();
  }, [token, orgId]);

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <header style={{ marginBottom: "1rem" }}>
        <h1>MicroTasks</h1>
        <Link href="/workspace" style={{ marginRight: "1rem" }}>← Back to workspace</Link>
        <Link href="/feed/my-tasks" style={{ fontWeight: "bold", color: "#005f73" }}>Meine Aufgaben ansehen →</Link>
      </header>
      {loading ? <p>Lade Aufgaben…</p> : null}
      {error ? (
        <div>
          <p style={{ color: "crimson" }}>Fehler beim Laden</p>
          <button onClick={loadMicroTasks}>Erneut versuchen</button>
        </div>
      ) : null}
      {!loading && !error && microTasks.offered.length === 0 && microTasks.open.length === 0 ? (
        <p>Keine offenen Aufgaben</p>
      ) : null}

      {!loading && !error && microTasks.offered.length > 0 ? (
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ borderBottom: "2px solid #333", paddingBottom: "0.5rem" }}>Angebote für mich</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {microTasks.offered.map((microTask) => (
              <li
                key={microTask.id}
                style={{
                  border: "2px solid #005f73",
                  backgroundColor: "#e0fbfc",
                  borderRadius: "8px",
                  padding: "1rem",
                  marginBottom: "1rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ marginTop: 0, color: "#005f73" }}>{microTask.title}</h3>
                  <span style={{ fontWeight: "bold", fontSize: "1.2rem", padding: "4px 8px", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #005f73" }}>
                    {microTask.rewardPoints} 🪙
                  </span>
                </div>
                <p style={{ margin: "0.25rem 0" }}>
                  <strong>Task:</strong> {microTask.task ? microTask.task.title : "Unbekannt"}
                </p>
                {microTask.location ? (
                  <p style={{ margin: "0.25rem 0" }}>
                    <strong>Wo:</strong> {microTask.location}
                  </p>
                ) : null}
                {microTask.timeframe ? (
                  <p style={{ margin: "0.25rem 0" }}>
                    <strong>Wann:</strong> {new Date(microTask.timeframe).toLocaleDateString()}
                  </p>
                ) : null}
                <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}>
                  <button onClick={() => handleAcceptOffer(microTask.id)} style={{ padding: "0.5rem 1rem", backgroundColor: "#0a9396", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
                    Annehmen
                  </button>
                  <button onClick={() => handleRejectOffer(microTask.id)} style={{ padding: "0.5rem 1rem", backgroundColor: "#e9d8a6", color: "#333", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
                    Ablehnen
                  </button>
                  <Link href={`/feed/${microTask.id}`} style={{ display: "inline-block", fontWeight: "bold" }}>
                    Details ansehen →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(() => {
        if (loading || error || microTasks.open.length === 0) return null;
        const actualOpen = microTasks.open.filter(t => t.status === "OPEN");
        const waitlist = microTasks.open.filter(t => t.status === "ASSIGNED");

        return (
          <>
            {actualOpen.length > 0 && (
              <section style={{ marginBottom: "2rem" }}>
                <h2 style={{ borderBottom: "1px solid #ccc", paddingBottom: "0.5rem" }}>Weitere offene Aufgaben</h2>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {actualOpen.map((microTask) => (
                    <li
                      key={microTask.id}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        padding: "1rem",
                        marginBottom: "1rem"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ marginTop: 0 }}>{microTask.title}</h3>
                        <span style={{ fontWeight: "bold", fontSize: "1.2rem", padding: "4px 8px", backgroundColor: "#f0f0f0", borderRadius: "12px" }}>
                          {microTask.rewardPoints} 🪙
                        </span>
                      </div>
                      <p style={{ margin: "0.25rem 0" }}>
                        <strong>Task:</strong> {microTask.task ? microTask.task.title : "Unbekannt"}
                      </p>
                      {microTask.location && (
                        <p style={{ margin: "0.25rem 0" }}>
                          <strong>Wo:</strong> {microTask.location}
                        </p>
                      )}
                      {microTask.timeframe && (
                        <p style={{ margin: "0.25rem 0" }}>
                          <strong>Wann:</strong> {new Date(microTask.timeframe).toLocaleDateString()}
                        </p>
                      )}
                      <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}>
                        <button onClick={() => handleAssignTask(microTask.id)} style={{ padding: "0.5rem 1rem", backgroundColor: "#005f73", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
                          Übernehmen
                        </button>
                        <Link href={`/feed/${microTask.id}`} style={{ display: "inline-block" }}>
                          Details ansehen →
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {waitlist.length > 0 && (
              <section>
                <h2 style={{ borderBottom: "1px solid #ccc", paddingBottom: "0.5rem", color: "#666" }}>Letzte Chance (Warteliste)</h2>
                <p style={{ fontSize: "0.9rem", color: "#666" }}>Diese Aufgaben sind bereits vergeben. Trage dich ein, falls jemand abspringt!</p>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {waitlist.map((microTask) => (
                    <li
                      key={microTask.id}
                      style={{
                        border: "1px dashed #ccc",
                        borderRadius: "8px",
                        padding: "1rem",
                        marginBottom: "1rem",
                        backgroundColor: "#f9f9f9"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.8 }}>
                        <h3 style={{ marginTop: 0 }}>{microTask.title}</h3>
                        <span style={{ fontWeight: "bold", fontSize: "1.2rem", padding: "4px 8px", border: "1px solid #ccc", borderRadius: "12px" }}>
                          {microTask.rewardPoints} 🪙
                        </span>
                      </div>
                      <p style={{ margin: "0.25rem 0", color: "#666" }}>
                        <strong>Task:</strong> {microTask.task ? microTask.task.title : "Unbekannt"}
                      </p>
                      <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}>
                        <button onClick={() => handleJoinQueue(microTask.id)} style={{ padding: "0.5rem 1rem", backgroundColor: "#e9d8a6", color: "#333", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
                          Warteschlange beitreten
                        </button>
                        <Link href={`/feed/${microTask.id}`} style={{ display: "inline-block" }}>
                          Details ansehen →
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        );
      })()}
    </main>
  );
};

export default MicroTaskFeedPage;
