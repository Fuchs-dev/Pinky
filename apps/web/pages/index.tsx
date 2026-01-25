import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";

const HomePage: NextPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/workspace");
  }, [router]);

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Pinky Web</h1>
      <p>Loading workspace…</p>
    </main>
  );
};

export default HomePage;
