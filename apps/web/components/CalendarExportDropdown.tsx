import React, { useState, useRef, useEffect } from "react";
import { MicroTaskDetail } from "../lib/api";

interface CalendarExportDropdownProps {
    microTask: MicroTaskDetail;
    onDownloadIcs: () => void;
}

const parseDurationStr = (dur?: string | null) => {
    if (!dur) return 60;
    const match = dur.match(/(\d+)/);
    if (!match) return 60;
    const val = parseInt(match[1], 10);
    if (dur.toLowerCase().includes("stunde")) return val * 60;
    return val;
};

const formatGoogleCalendarDate = (dateString: string, durationMinutes: number) => {
    const start = new Date(dateString);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    const formatObj = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    return `${formatObj(start)}/${formatObj(end)}`;
};

export const CalendarExportDropdown: React.FC<CalendarExportDropdownProps> = ({ microTask, onDownloadIcs }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!microTask.dueAt) return null;

    const dateObj = new Date(microTask.dueAt);
    const formattedDate = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const handleGoogleCalendar = () => {
        const duration = parseDurationStr(microTask.estimatedDuration);
        const dates = formatGoogleCalendarDate(microTask.dueAt!, duration);
        const details = microTask.description_how || "";

        const params = new URLSearchParams({
            action: "TEMPLATE",
            text: microTask.title,
            dates: dates,
            details: details,
            location: microTask.location || ""
        });

        window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, "_blank");
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} style={{ position: "relative", display: "inline-block", margin: 0 }}>
            <p
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    margin: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    transition: "background-color 0.2s",
                    backgroundColor: isOpen ? "#e0fbfc" : "transparent"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e0fbfc"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isOpen ? "#e0fbfc" : "transparent"}
            >
                <strong>Wann?</strong>
                <span style={{ borderBottom: "1px dashed #005f73", color: "#005f73" }}>📅 {formattedDate}</span>
            </p>

            {isOpen && (
                <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: "8px",
                    backgroundColor: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    zIndex: 10,
                    minWidth: "220px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column"
                }}>
                    <button
                        onClick={handleGoogleCalendar}
                        style={{
                            padding: "12px 16px",
                            border: "none",
                            borderBottom: "1px solid #eee",
                            backgroundColor: "transparent",
                            textAlign: "left",
                            cursor: "pointer",
                            fontSize: "0.95rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                        🗓️ Zu Google Kalender
                    </button>
                    <button
                        onClick={() => { onDownloadIcs(); setIsOpen(false); }}
                        style={{
                            padding: "12px 16px",
                            border: "none",
                            backgroundColor: "transparent",
                            textAlign: "left",
                            cursor: "pointer",
                            fontSize: "0.95rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                        📥 Als .ics speichern
                    </button>
                </div>
            )}
        </div>
    );
};
