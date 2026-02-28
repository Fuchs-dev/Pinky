import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { fetchMicroTaskDetail, MicroTaskDetail, joinQueue, leaveQueue } from "../../lib/api";
import { CalendarExportDropdown } from "../../components/CalendarExportDropdown";

const MicroTaskDetailPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [microTask, setMicroTask] = useState<MicroTaskDetail | null>(null);
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

  const loadDetail = async (microTaskId: string) => {
    if (!token || !orgId) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMicroTaskDetail(token, orgId, microTaskId);
      setMicroTask(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinQueue = async () => {
    if (!token || !orgId || typeof id !== "string") return;
    try {
      await joinQueue(token, orgId, id);
      alert("Erfolgreich in die Warteschlange eingetragen!");
      loadDetail(id);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleLeaveQueue = async () => {
    if (!token || !orgId || typeof id !== "string") return;
    try {
      if (confirm("Möchtest du die Warteschlange wirklich verlassen?")) {
        await leaveQueue(token, orgId, id);
        alert("Warteschlange verlassen.");
        loadDetail(id);
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDownloadIcs = async () => {
    if (!token || !orgId || typeof id !== "string") return;
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
      const response = await fetch(`${API_BASE_URL}/microtasks/${id}/download.ics`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Org-Id": orgId
        }
      });
      if (!response.ok) throw new Error("Fehler beim Herunterladen der Kalenderdatei");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `task-${id}.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  useEffect(() => {
    if (typeof id === "string") {
      loadDetail(id);
    }
  }, [id, token, orgId]);

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <header style={{ marginBottom: "1rem" }}>
        <h1>MicroTask Detail</h1>
        <Link href="/feed">← Back to feed</Link>
      </header>
      {loading ? <p>Lade Aufgaben…</p> : null}
      {error ? (
        <div>
          <p style={{ color: "crimson" }}>Fehler beim Laden</p>
          <button
            onClick={() => {
              if (typeof id === "string") {
                loadDetail(id);
              }
            }}
          >
            Erneut versuchen
          </button>
        </div>
      ) : null}
      {!loading && !error && !microTask ? <p>Keine Aufgabe gefunden.</p> : null}
      {!loading && !error && microTask ? (
        <section style={{ border: "1px solid #ddd", padding: "1.5rem", borderRadius: "8px", backgroundColor: "#fafafa" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <h2 style={{ marginTop: 0 }}>{microTask.title}</h2>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <span style={{ fontWeight: "bold", fontSize: "1.2rem", padding: "4px 12px", backgroundColor: "#005f73", color: "white", borderRadius: "16px" }}>
                {microTask.rewardPoints} 🪙 Belohnung
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gap: "0.5rem", marginTop: "1rem" }}>
            <p style={{ margin: 0 }}>
              <strong>Task:</strong> {microTask.task ? microTask.task.title : "Unbekannt"}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Status:</strong> {microTask.status}
            </p>
            {microTask.dueAt ? (
              <CalendarExportDropdown microTask={microTask} onDownloadIcs={handleDownloadIcs} />
            ) : null}
            {microTask.location ? (
              <p style={{ margin: 0 }}>
                <strong>Wo:</strong> {microTask.location}
              </p>
            ) : null}
            {microTask.estimatedDuration ? (
              <p style={{ margin: 0 }}>
                <strong>Dauer:</strong> {microTask.estimatedDuration}
              </p>
            ) : null}
            {microTask.contactPerson ? (
              <p style={{ margin: 0 }}>
                <strong>Wer (Ansprechpartner):</strong> {microTask.contactPerson}
              </p>
            ) : null}
            {microTask.attachments ? (
              <p style={{ margin: 0 }}>
                <strong>Unterlagen:</strong> <a href={microTask.attachments} target="_blank" rel="noopener noreferrer" style={{ color: "#005f73", textDecoration: "underline" }}>{microTask.attachments}</a>
              </p>
            ) : null}
          </div>

          {microTask.description_how ? (
            <div style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "#e0fbfc", borderRadius: "8px" }}>
              <h3 style={{ marginTop: 0, color: "#005f73" }}>Wie? (Ausführungshinweise)</h3>
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{microTask.description_how}</p>
            </div>
          ) : null}

          {microTask.impactReason ? (
            <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #ee9b00", borderLeft: "4px solid #ee9b00", backgroundColor: "#fffdf0", borderRadius: "4px" }}>
              <h3 style={{ marginTop: 0, color: "#ca6702" }}>Warum ist diese Aufgabe wichtig?</h3>
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{microTask.impactReason}</p>
            </div>
          ) : null}

          {microTask.status === "ASSIGNED" && (
            <div style={{ marginTop: "2rem", padding: "1.5rem", border: "1px dashed #ccc", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
              <h3 style={{ marginTop: 0 }}>Warteschlange</h3>
              <p style={{ fontSize: "0.95rem", color: "#555" }}>
                Diese Aufgabe ist momentan vergeben. Möchtest du einspringen, falls der aktuelle Bearbeiter abspringt?
              </p>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button onClick={handleJoinQueue} style={{ padding: "0.75rem 1.5rem", backgroundColor: "#e9d8a6", color: "#333", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
                  Eintragen
                </button>
                <button onClick={handleLeaveQueue} style={{ padding: "0.75rem 1.5rem", backgroundColor: "transparent", color: "crimson", border: "1px solid crimson", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
                  Warteschlange verlassen
                </button>
              </div>
            </div>
          )}

          <p style={{ marginTop: "2rem", fontSize: "0.85rem", color: "#666" }}>
            Erstellt am: {new Date(microTask.createdAt).toLocaleString()}
          </p>
        </section>
      ) : null}
    </main>
  );
};

export default MicroTaskDetailPage;
