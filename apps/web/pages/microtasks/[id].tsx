import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { fetchMicroTaskDetail, MicroTaskDetail } from "../../lib/api";

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

  useEffect(() => {
    if (typeof id === "string") {
      loadDetail(id);
    }
  }, [id, token, orgId]);

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <header style={{ marginBottom: "1rem" }}>
        <h1>MicroTask Detail</h1>
        <Link href="/microtasks">← Back to feed</Link>
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
        <section style={{ border: "1px solid #ddd", padding: "1rem" }}>
          <h2 style={{ marginTop: 0 }}>{microTask.title}</h2>
          <p>
            Task:{" "}
            {microTask.task ? microTask.task.title : "Unbekannt"}
          </p>
          <p>Status: {microTask.status}</p>
          {microTask.description ? (
            <p>Beschreibung: {microTask.description}</p>
          ) : null}
          {microTask.dueAt ? (
            <p>
              Fällig: {new Date(microTask.dueAt).toLocaleDateString()}
            </p>
          ) : null}
          <p>Erstellt: {new Date(microTask.createdAt).toLocaleString()}</p>
        </section>
      ) : null}
    </main>
  );
};

export default MicroTaskDetailPage;
