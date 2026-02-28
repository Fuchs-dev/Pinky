import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import { usePushNotifications } from "../lib/usePushNotifications";

const GlobalToasts = () => {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        setToken(localStorage.getItem("token"));
    }, []);

    const { notifications, dismissNotification } = usePushNotifications(token);

    if (notifications.length === 0) return null;

    return (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
            {notifications.map(n => (
                <div key={n.id} style={{
                    background: n.event === "TASK_QUEUE_EMPTY" ? "#e74c3c" : "#2ecc71",
                    color: "white",
                    padding: 16,
                    borderRadius: 8,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    minWidth: 300,
                    fontFamily: "system-ui, sans-serif"
                }}>
                    <div style={{ flex: 1 }}>
                        <strong style={{ display: "block", marginBottom: 4 }}>{n.payload.title || "Neue Benachrichtigung"}</strong>
                        <span style={{ fontSize: "0.9rem" }}>{n.payload.message}</span>
                    </div>
                    <button
                        onClick={() => dismissNotification(n.id)}
                        style={{ background: "transparent", border: "none", color: "white", fontSize: 24, cursor: "pointer", marginLeft: 10, padding: 0 }}
                    >
                        &times;
                    </button>
                </div>
            ))}
        </div>
    );
};

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <>
            <Component {...pageProps} />
            <GlobalToasts />
        </>
    );
}
