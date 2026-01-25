import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { fetchMicroTasks, MicroTaskSummary } from "../../lib/api";

const MicroTaskFeedPage: NextPage = () => {
  const router = useRouter();
  const [microTasks, setMicroTasks] = useState<MicroTaskSummary[]>([]);
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

  useEffect(() => {
    loadMicroTasks();
  }, [token, orgId]);

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <header style={{ marginBottom: "1rem" }}>
        <h1>MicroTasks</h1>
        <Link href="/workspace">← Back to workspace</Link>
      </header>
      {loading ? <p>Lade Aufgaben…</p> : null}
      {error ? (
        <div>
          <p style={{ color: "crimson" }}>Fehler beim Laden</p>
          <button onClick={loadMicroTasks}>Erneut versuchen</button>
        </div>
      ) : null}
      {!loading && !error && microTasks.length === 0 ? (
        <p>Keine offenen Aufgaben</p>
      ) : null}
      {!loading && !error && microTasks.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {microTasks.map((microTask) => (
            <li
              key={microTask.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "1rem",
                marginBottom: "1rem"
              }}
            >
              <h3 style={{ marginTop: 0 }}>{microTask.title}</h3>
              <p style={{ margin: "0.25rem 0" }}>
                Task: {microTask.task ? microTask.task.title : "Unbekannt"}
              </p>
              <p style={{ margin: "0.25rem 0" }}>
                Status: <strong>{microTask.status}</strong>
              </p>
              {microTask.dueAt ? (
                <p style={{ margin: "0.25rem 0" }}>
                  Fällig: {new Date(microTask.dueAt).toLocaleDateString()}
                </p>
              ) : null}
              <Link href={`/microtasks/${microTask.id}`}>
                Details ansehen →
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
};

export default MicroTaskFeedPage;
