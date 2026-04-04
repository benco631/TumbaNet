"use client";

import { useSession } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import {
  BirthdayIcon,
  PartyIcon,
  DinnerIcon,
  TripIcon,
  WeddingIcon,
  SportsIcon,
  HangoutIcon,
  CalendarIcon,
  GoingIcon,
  MaybeIcon,
  NotGoingIcon,
  LocationIcon,
  EventsIcon,
} from "@/lib/icons";
import EmptyState from "@/components/EmptyState";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

interface PollVote {
  id: string;
  userId: string;
  user: { id: string; name: string };
}

interface PollOption {
  id: string;
  text: string;
  votes: PollVote[];
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
}

interface Rsvp {
  id: string;
  userId: string;
  status: string;
  user: { id: string; name: string };
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string | null;
  category: string;
  createdAt: string;
  user: { id: string; name: string };
  polls: Poll[];
  rsvps: Rsvp[];
}

interface PollDraft {
  question: string;
  options: string[];
}

const EVENT_CATEGORIES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "birthday", label: "Birthday", icon: BirthdayIcon },
  { value: "party",    label: "Party",    icon: PartyIcon    },
  { value: "dinner",   label: "Dinner",   icon: DinnerIcon   },
  { value: "trip",     label: "Trip",     icon: TripIcon     },
  { value: "wedding",  label: "Wedding",  icon: WeddingIcon  },
  { value: "sports",   label: "Sports",   icon: SportsIcon   },
  { value: "hangout",  label: "Hangout",  icon: HangoutIcon  },
  { value: "other",    label: "Other",    icon: CalendarIcon },
];

export default function EventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("other");
  const [polls, setPolls] = useState<PollDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const userId = (session?.user as { id?: string })?.id;
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;

  const fetchEvents = useCallback(async () => {
    const res = await fetch("/api/events");
    if (res.ok) {
      const data = await res.json();
      setEvents(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchEvents();
  }, [status, router, fetchEvents]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const validPolls = polls
      .filter((p) => p.question.trim() && p.options.filter((o) => o.trim()).length >= 2)
      .map((p) => ({
        question: p.question.trim(),
        options: p.options.filter((o) => o.trim()),
      }));

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        date,
        location: location.trim() || null,
        category,
        polls: validPolls,
      }),
    });

    if (res.ok) {
      setTitle("");
      setDescription("");
      setDate("");
      setLocation("");
      setCategory("other");
      setPolls([]);
      setShowForm(false);
      fetchEvents();
    }
    setSubmitting(false);
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Delete this event?")) return;
    const res = await fetch(`/api/events?id=${eventId}`, { method: "DELETE" });
    if (res.ok) fetchEvents();
  }

  async function handleVote(pollId: string, optionId: string) {
    const res = await fetch("/api/events/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollId, optionId }),
    });
    if (res.ok) fetchEvents();
  }

  async function handleUnvote(pollId: string) {
    const res = await fetch("/api/events/vote", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollId }),
    });
    if (res.ok) fetchEvents();
  }

  async function handleRsvp(eventId: string, rsvpStatus: string) {
    const event = events.find((e) => e.id === eventId);
    const currentRsvp = event?.rsvps.find((r) => r.userId === userId);

    if (currentRsvp?.status === rsvpStatus) {
      // Remove RSVP
      await fetch("/api/events/rsvp", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
    } else {
      await fetch("/api/events/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, status: rsvpStatus }),
      });
    }
    fetchEvents();
  }

  function addPoll() {
    setPolls([...polls, { question: "", options: ["", ""] }]);
  }

  function removePoll(index: number) {
    setPolls(polls.filter((_, i) => i !== index));
  }

  function updatePollQuestion(index: number, question: string) {
    const updated = [...polls];
    updated[index].question = question;
    setPolls(updated);
  }

  function updatePollOption(pollIndex: number, optionIndex: number, value: string) {
    const updated = [...polls];
    updated[pollIndex].options[optionIndex] = value;
    setPolls(updated);
  }

  function addPollOption(pollIndex: number) {
    const updated = [...polls];
    updated[pollIndex].options.push("");
    setPolls(updated);
  }

  function removePollOption(pollIndex: number, optionIndex: number) {
    const updated = [...polls];
    updated[pollIndex].options = updated[pollIndex].options.filter((_, i) => i !== optionIndex);
    setPolls(updated);
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-tumba-500 border-t-transparent" />
      </div>
    );
  }

  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.date) >= now);
  const pastEvents = events.filter((e) => new Date(e.date) < now);

  // Calendar data
  const calendarMonth = now.getMonth();
  const calendarYear = now.getFullYear();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const eventsByDay: Record<number, Event[]> = {};
  events.forEach((e) => {
    const d = new Date(e.date);
    if (d.getMonth() === calendarMonth && d.getFullYear() === calendarYear) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(e);
    }
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            <span className="bg-gradient-to-r from-tumba-300 to-tumba-500 bg-clip-text text-transparent">
              TumbaEvents
            </span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Plan events, RSVP, and let the Tumbas vote
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-tumba-500 text-white font-semibold hover:bg-tumba-400 transition-colors text-sm"
        >
          {showForm ? "Cancel" : "+ New Event"}
        </button>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setViewMode("list")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            viewMode === "list"
              ? "bg-tumba-500 text-white shadow-lg shadow-tumba-500/25"
              : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
          }`}
        >
          List View
        </button>
        <button
          onClick={() => setViewMode("calendar")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            viewMode === "calendar"
              ? "bg-tumba-500 text-white shadow-lg shadow-tumba-500/25"
              : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
          }`}
        >
          Calendar
        </button>
      </div>

      {/* Create Event Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]"
        >
          <h2 className="text-lg font-semibold mb-4">Create Event</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500/50"
                placeholder="e.g. BBQ at the park"
              />
            </div>

            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500/50 resize-none"
                placeholder="What's the plan?"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500/50"
                >
                  {EVENT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Location (optional)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500/50"
                placeholder="e.g. Central Park, Tel Aviv"
              />
            </div>

            {/* Polls */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-[var(--text-secondary)]">Polls (optional)</label>
                <button
                  type="button"
                  onClick={addPoll}
                  className="text-xs text-tumba-400 hover:text-tumba-300 transition-colors"
                >
                  + Add Poll
                </button>
              </div>

              {polls.map((poll, pi) => (
                <div
                  key={pi}
                  className="mb-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[var(--text-secondary)]">Poll {pi + 1}</span>
                    <button type="button" onClick={() => removePoll(pi)} className="text-xs text-red-400 hover:text-red-300">
                      Remove
                    </button>
                  </div>

                  <input
                    type="text"
                    value={poll.question}
                    onChange={(e) => updatePollQuestion(pi, e.target.value)}
                    placeholder="Question (e.g. Where should we meet?)"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500/50 mb-2"
                  />

                  {poll.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2 mb-1.5">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updatePollOption(pi, oi, e.target.value)}
                        placeholder={`Option ${oi + 1}`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500/50"
                      />
                      {poll.options.length > 2 && (
                        <button type="button" onClick={() => removePollOption(pi, oi)} className="text-red-400 hover:text-red-300 text-sm px-1">x</button>
                      )}
                    </div>
                  ))}

                  <button type="button" onClick={() => addPollOption(pi)} className="text-xs text-tumba-400 hover:text-tumba-300 mt-1">
                    + Add Option
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 w-full py-2.5 rounded-xl bg-tumba-500 text-white font-semibold hover:bg-tumba-400 transition-colors disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Event"}
          </button>
        </form>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div className="mb-8 p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <h3 className="text-lg font-semibold mb-4 text-center">
            {new Date(calendarYear, calendarMonth).toLocaleString("en-US", { month: "long", year: "numeric" })}
          </h3>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--text-secondary)] mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-1 font-medium">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {calendarDays.map((day) => {
              const dayEvents = eventsByDay[day] || [];
              const isToday = day === now.getDate();
              return (
                <div
                  key={day}
                  className={`aspect-square p-1 rounded-lg text-xs flex flex-col items-center justify-start ${
                    isToday ? "bg-tumba-500/10 border border-tumba-500/30" : "hover:bg-[var(--bg-card-hover)]"
                  }`}
                >
                  <span className={`text-[11px] ${isToday ? "text-tumba-400 font-bold" : "text-[var(--text-secondary)]"}`}>{day}</span>
                  {dayEvents.map((e) => {
                    const cat = EVENT_CATEGORIES.find((c) => c.value === e.category);
                    return (
                      <div key={e.id} className="flex justify-center text-tumba-400" title={e.title}>
                        {cat && <cat.icon size={10} strokeWidth={2} />}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View - Upcoming Events */}
      {viewMode === "list" && (
        <>
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-tumba-400">Upcoming</span>
              <span className="text-xs bg-tumba-500/20 text-tumba-400 px-2 py-0.5 rounded-full">
                {upcomingEvents.length}
              </span>
            </h2>

            {upcomingEvents.length === 0 ? (
              <EmptyState
                icon={<EventsIcon size={26} strokeWidth={1.5} className="text-tumba-400/60" />}
                title="No upcoming events"
                description="Create one to get the Tumbas together."
                className="py-8"
              />
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    userId={userId}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    onVote={handleVote}
                    onUnvote={handleUnvote}
                    onRsvp={handleRsvp}
                  />
                ))}
              </div>
            )}
          </div>

          {pastEvents.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-[var(--text-secondary)]">Past Events</h2>
              <div className="space-y-4 opacity-70">
                {pastEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    userId={userId}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    onVote={handleVote}
                    onUnvote={handleUnvote}
                    onRsvp={handleRsvp}
                    past
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventCard({
  event,
  userId,
  isAdmin,
  onDelete,
  onVote,
  onUnvote,
  onRsvp,
  past,
}: {
  event: Event;
  userId?: string;
  isAdmin?: boolean;
  onDelete: (id: string) => void;
  onVote: (pollId: string, optionId: string) => void;
  onUnvote: (pollId: string) => void;
  onRsvp: (eventId: string, status: string) => void;
  past?: boolean;
}) {
  const eventDate = new Date(event.date);
  const canDelete = event.user.id === userId || isAdmin;
  const catInfo = EVENT_CATEGORIES.find((c) => c.value === event.category);
  const myRsvp = event.rsvps.find((r) => r.userId === userId);

  const goingCount = event.rsvps.filter((r) => r.status === "GOING").length;
  const maybeCount = event.rsvps.filter((r) => r.status === "MAYBE").length;
  const notGoingCount = event.rsvps.filter((r) => r.status === "NOT_GOING").length;

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            {catInfo && <catInfo.icon size={18} strokeWidth={1.75} className="text-tumba-400 shrink-0" />}
            <h3 className="text-lg font-semibold">{event.title}</h3>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-tumba-400 font-medium">
              {eventDate.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {" at "}
              {eventDate.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              by {event.user.name}
            </span>
            {event.location && (
              <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                <LocationIcon size={12} strokeWidth={1.75} className="shrink-0" /> {event.location}
              </span>
            )}
          </div>
        </div>
        {canDelete && (
          <button
            onClick={() => onDelete(event.id)}
            className="text-xs text-[var(--text-secondary)] hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
          >
            Delete
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--text-secondary)] mb-4 whitespace-pre-wrap">
        {event.description}
      </p>

      {/* RSVP Buttons */}
      {!past && (
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            { status: "GOING",     label: "Going",     Icon: GoingIcon,     count: goingCount     },
            { status: "MAYBE",     label: "Maybe",     Icon: MaybeIcon,     count: maybeCount     },
            { status: "NOT_GOING", label: "Not Going", Icon: NotGoingIcon,  count: notGoingCount  },
          ] as const).map(({ status, label, Icon, count }) => (
            <button
              key={status}
              onClick={() => onRsvp(event.id, status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                myRsvp?.status === status
                  ? status === "GOING"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : status === "MAYBE"
                      ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-tumba-500/30"
              }`}
            >
              <Icon size={13} strokeWidth={2} /> {label} {count > 0 && <span className="opacity-70">({count})</span>}
            </button>
          ))}
        </div>
      )}

      {/* RSVP details */}
      {event.rsvps.length > 0 && (
        <div className="text-xs text-[var(--text-secondary)] mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {goingCount > 0 && (
            <span>Going: {event.rsvps.filter((r) => r.status === "GOING").map((r) => r.user.name).join(", ")}</span>
          )}
          {maybeCount > 0 && (
            <span>Maybe: {event.rsvps.filter((r) => r.status === "MAYBE").map((r) => r.user.name).join(", ")}</span>
          )}
        </div>
      )}

      {/* Polls */}
      {event.polls.map((poll) => {
        const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
        const userVotedOption = poll.options.find((o) =>
          o.votes.some((v) => v.userId === userId)
        );

        return (
          <div
            key={poll.id}
            className="mt-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]"
          >
            <p className="text-sm font-medium mb-3">{poll.question}</p>

            <div className="space-y-2">
              {poll.options.map((option) => {
                const isSelected = userVotedOption?.id === option.id;
                const voteCount = option.votes.length;
                const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                const voterNames = option.votes.map((v) => v.user.name).join(", ");

                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      if (past) return;
                      if (isSelected) {
                        onUnvote(poll.id);
                      } else {
                        onVote(poll.id, option.id);
                      }
                    }}
                    disabled={past}
                    className={`relative w-full text-left px-4 py-2.5 rounded-lg border transition-all overflow-hidden ${
                      isSelected
                        ? "border-tumba-500/50 bg-tumba-500/10"
                        : "border-[var(--border)] hover:border-tumba-500/30"
                    } ${past ? "cursor-default" : "cursor-pointer"}`}
                    title={voterNames || "No votes yet"}
                  >
                    {totalVotes > 0 && (
                      <div
                        className={`absolute inset-y-0 left-0 transition-all ${
                          isSelected ? "bg-tumba-500/15" : "bg-[var(--border)]/30"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    )}

                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? "border-tumba-400 bg-tumba-500"
                              : "border-[var(--text-secondary)]/30"
                          }`}
                        >
                          {isSelected && (
                            <div className="h-1.5 w-1.5 rounded-full bg-black" />
                          )}
                        </div>
                        <span className="text-sm">{option.text}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-secondary)]">
                          {voteCount} {voteCount === 1 ? "vote" : "votes"}
                        </span>
                        {totalVotes > 0 && (
                          <span className="text-xs text-tumba-400 font-medium w-8 text-right">
                            {percentage}%
                          </span>
                        )}
                      </div>
                    </div>

                    {voterNames && (
                      <p className="relative text-[11px] text-[var(--text-secondary)]/70 mt-1 ml-6">
                        {voterNames}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
