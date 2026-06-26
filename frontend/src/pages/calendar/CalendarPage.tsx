import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  format,
} from "date-fns";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { EventForm } from "./EventForm";
import { api, getErrorMessage } from "../../lib/api";
import type { CalendarEvent, EventType } from "../../types";

const TYPE_TONE: Record<EventType, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  EVENT: "accent",
  DEADLINE: "danger",
  EXAM: "warning",
  INTERVIEW: "success",
  MEETING: "neutral",
};

export default function CalendarPage() {
  const [month, setMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));

  const days = useMemo(() => {
    const result: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      result.push(d);
      d = addDays(d, 1);
    }
    return result;
  }, [gridStart, gridEnd]);

  async function load() {
    try {
      const res = await api.get<CalendarEvent[]>("/calendar", {
        params: { from: gridStart.toISOString(), to: gridEnd.toISOString() },
      });
      setEvents(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  function eventsOn(day: Date) {
    return events.filter((e) => isSameDay(new Date(e.startsAt), day));
  }

  function openCreate(day?: Date) {
    setEditing(null);
    setSelectedDay(day || selectedDay);
    setModalOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditing(event);
    setModalOpen(true);
  }

  async function handleSubmit(data: { title: string; description: string; type: EventType; startsAt: string; endsAt: string; location: string; allDay: boolean }) {
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        ...data,
        startsAt: new Date(data.startsAt).toISOString(),
        endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : null,
      };
      if (editing) {
        await api.put(`/calendar/${editing.id}`, payload);
      } else {
        await api.post("/calendar", payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(event: CalendarEvent) {
    if (!confirm("Delete this event?")) return;
    try {
      await api.delete(`/calendar/${event.id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const dayEvents = eventsOn(selectedDay);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Calendar</h1>
          <p className="text-sm text-muted">{format(month, "MMMM yyyy")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setMonth(new Date())}>
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight size={16} />
          </Button>
          <Button onClick={() => openCreate()}>
            <Plus size={16} /> Add event
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-4">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayEvts = eventsOn(day);
              const inMonth = isSameMonth(day, month);
              const isSelected = isSameDay(day, selectedDay);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  onDoubleClick={() => openCreate(day)}
                  className={`flex min-h-[72px] flex-col items-start gap-1 rounded-lg border p-1.5 text-left text-xs transition-colors ${
                    isSelected ? "border-accent bg-accent-soft" : "border-border hover:bg-surface"
                  } ${inMonth ? "" : "opacity-40"}`}
                >
                  <span className={`font-medium ${isSameDay(day, new Date()) ? "text-accent" : "text-text"}`}>
                    {format(day, "d")}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {dayEvts.slice(0, 2).map((e) => (
                      <span key={e.id} className="truncate rounded bg-accent/10 px-1 text-[10px] text-accent">
                        {e.title}
                      </span>
                    ))}
                    {dayEvts.length > 2 && <span className="text-[10px] text-muted">+{dayEvts.length - 2} more</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">{format(selectedDay, "EEEE, MMM d")}</h3>
            <Button size="sm" variant="secondary" onClick={() => openCreate(selectedDay)}>
              <Plus size={14} />
            </Button>
          </div>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-muted">No events on this day.</p>
          ) : (
            dayEvents.map((event) => (
              <div key={event.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-text">{event.title}</p>
                    <p className="text-xs text-muted">
                      {event.allDay ? "All day" : format(new Date(event.startsAt), "h:mm a")}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </div>
                  <Badge tone={TYPE_TONE[event.type]}>{event.type}</Badge>
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => openEdit(event)} className="rounded-md p-1 text-muted hover:bg-surface hover:text-accent">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(event)} className="rounded-md p-1 text-muted hover:bg-surface hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit event" : "Add event"}>
        <EventForm
          initial={editing}
          defaultDate={selectedDay}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={submitting}
        />
      </Modal>
    </div>
  );
}
