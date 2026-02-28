import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export interface PushNotification {
    id: string;
    event: string;
    payload: any;
}

export const usePushNotifications = (token: string | null) => {
    const [notifications, setNotifications] = useState<PushNotification[]>([]);

    useEffect(() => {
        if (!token) return;

        const eventSource = new EventSource(`${API_BASE_URL}/notifications/stream?token=${token}`);

        const handleCustomEvent = (e: MessageEvent) => {
            const payload = JSON.parse(e.data);
            setNotifications(prev => [...prev, { id: Math.random().toString(), event: e.type, payload }]);

            // Auto-dismiss after 6 seconds
            setTimeout(() => {
                setNotifications(prev => prev.slice(1));
            }, 6000);
        };

        eventSource.addEventListener("TASK_ASSIGNED_FROM_QUEUE", handleCustomEvent);
        eventSource.addEventListener("TASK_QUEUE_EMPTY", handleCustomEvent);

        return () => {
            eventSource.close();
        };
    }, [token]);

    const dismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return { notifications, dismissNotification };
};
