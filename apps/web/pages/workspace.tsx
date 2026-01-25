import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { fetchMemberships, Membership, pingOrganization } from "../lib/api";

const WorkspacePage: NextPage = () => {
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return localStorage.getItem("accessToken");
  }, []);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    const storedOrgId = localStorage.getItem("activeOrgId");
    if (storedOrgId) {
      setActiveOrgId(storedOrgId);
    }
    fetchMemberships(token)
      .then((data) => {
        setMemberships(data);
        if (!storedOrgId && data.length > 0) {
          setActiveOrgId(data[0].organization.id);
          localStorage.setItem("activeOrgId", data[0].organization.id);
        }
      })
      .catch((err) => setError((err as Error).message));
  }, [router, token]);

  const activeOrg = memberships.find(
    (membership) => membership.organization.id === activeOrgId
  );

  const handleOrgChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const orgId = event.target.value;
    setActiveOrgId(orgId);
    localStorage.setItem("activeOrgId", orgId);
  };

  const handlePing = async () => {
    if (!token || !activeOrgId) {
      return;
    }
    setPingResult(null);
    try {
      const result = await pingOrganization(token, activeOrgId);
      setPingResult(
        `Ping OK for ${result.organizationId} (role: ${result.role})`
      );
    } catch (err) {
      setPingResult((err as Error).message);
    }
  };

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Pinky Workspace</h1>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      <section style={{ marginTop: "1rem" }}>
        <label htmlFor="workspace-select">Workspace</label>
        <select
          id="workspace-select"
          value={activeOrgId ?? ""}
          onChange={handleOrgChange}
          style={{ display: "block", marginTop: "0.5rem" }}
        >
          {memberships.map((membership) => (
            <option
              key={membership.organization.id}
              value={membership.organization.id}
            >
              {membership.organization.name} ({membership.role})
            </option>
          ))}
        </select>
      </section>
      <section style={{ marginTop: "1rem" }}>
        <strong>Active Organization:</strong>{" "}
        {activeOrg
          ? `${activeOrg.organization.name} (${activeOrg.organization.id})`
          : "None"}
      </section>
      <section style={{ marginTop: "1rem" }}>
        <button onClick={handlePing} disabled={!activeOrgId}>
          Ping Active Org
        </button>
        {pingResult ? <p>{pingResult}</p> : null}
      </section>
      <section style={{ marginTop: "1.5rem" }}>
        <button
          onClick={() => router.push("/microtasks")}
          disabled={!activeOrgId}
        >
          Open MicroTask Feed
        </button>
      </section>
    </main>
  );
};

export default WorkspacePage;
