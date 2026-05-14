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
} from "@/lib/icons";
import { Clock, BarChart2, X, Send } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
interface PollVote { id: string; userId: string; user: { id: string; name: string; avatar?: string | null } }
interface PollOption { id: string; text: string; votes: PollVote[]; }
interface Poll { id: string; question: string; options: PollOption[]; }
interface Rsvp { id: string; userId: string; status: string; user: { id: string; name: string; avatar?: string | null } }
interface Event {
  id: string; title: string; description: string; date: string; location: string | null;
  category: string; createdAt: string; user: { id: string; name: string; avatar?: string | null };
  polls: Poll[]; rsvps: Rsvp[];
}
interface PollDraft { question: string; options: string[]; }

// --- Helpers & Constants ---
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

const CATEGORY_COLORS: Record<string, string> = {
  birthday: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  party: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  dinner: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  trip: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  wedding: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  sports: "text-red-400 bg-red-500/10 border-red-500/20",
  hangout: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  other: "text-tumba-400 bg-tumba-500/10 border-tumba-500/20",
};

function getTimeRemaining(dateStr: string) {
  const eventDate = new Date(dateStr);
  const now = new Date();
  const diffMs = eventDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 1) return `in ${diffDays} days`;
  if (diffDays === 1) return `Tomorrow!`;
  if (diffHours > 0) return `in ${diffHours} hours`;
  if (diffHours === 0 && diffMs > 0) return `Any minute now...`;
  return `Happening now!`;
}

export default function EventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  
  // Calendar Modal State
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ day: number, events: Event[] } | null>(null);

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
    const validPolls = polls.filter((p) => p.question.trim() && p.options.filter((o) => o.trim()).length >= 2).map((p) => ({ question: p.question.trim(), options: p.options.filter((o) => o.trim()) }));
    const res = await fetch("/api/events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), description: description.trim(), date, location: location.trim() || null, category, polls: validPolls }),
    });
    if (res.ok) { setTitle(""); setDescription(""); setDate(""); setLocation(""); setCategory("other"); setPolls([]); setShowForm(false); fetchEvents(); }
    setSubmitting(false);
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/events?id=${eventId}`, { method: "DELETE" });
    fetchEvents();
    if (selectedDayEvents) {
      const remaining = selectedDayEvents.events.filter(e => e.id !== eventId);
      if (remaining.length === 0) setSelectedDayEvents(null);
      else setSelectedDayEvents({ ...selectedDayEvents, events: remaining });
    }
  }

  async function handleVote(pollId: string, optionId: string) {
    await fetch("/api/events/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pollId, optionId }) });
    fetchEvents();
  }

  async function handleUnvote(pollId: string) {
    await fetch("/api/events/vote", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pollId }) });
    fetchEvents();
  }

  async function handleRsvp(eventId: string, rsvpStatus: string) {
    const event = events.find((e) => e.id === eventId);
    const currentRsvp = event?.rsvps.find((r) => r.userId === userId);
    if (currentRsvp?.status === rsvpStatus) {
      await fetch("/api/events/rsvp", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId }) });
    } else {
      await fetch("/api/events/rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, status: rsvpStatus }) });
    }
    fetchEvents();
  }

  function addPoll() { setPolls([...polls, { question: "", options: ["", ""] }]); }
  function removePoll(index: number) { setPolls(polls.filter((_, i) => i !== index)); }
  function updatePollQuestion(index: number, question: string) { const updated = [...polls]; updated[index].question = question; setPolls(updated); }
  function updatePollOption(pollIndex: number, optionIndex: number, value: string) { const updated = [...polls]; updated[pollIndex].options[optionIndex] = value; setPolls(updated); }
  function addPollOption(pollIndex: number) { const updated = [...polls]; updated[pollIndex].options.push(""); setPolls(updated); }
  function removePollOption(pollIndex: number, optionIndex: number) { const updated = [...polls]; updated[pollIndex].options = updated[pollIndex].options.filter((_, i) => i !== optionIndex); setPolls(updated); }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-tumba-500 border-t-transparent" />
      </div>
    );
  }

  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.date) >= now).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pastEvents = events.filter((e) => new Date(e.date) < now).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const heroEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;
  const otherUpcomingEvents = upcomingEvents.slice(1);

  // Calendar logic
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
    <div className="mx-auto max-w-3xl px-4 py-8 relative">
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
          className="px-4 py-2 rounded-xl bg-tumba-500 text-white font-semibold hover:bg-tumba-400 shadow-lg shadow-tumba-500/20 transition-all text-sm"
        >
          {showForm ? "Cancel" : "+ New Event"}
        </button>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6 p-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] w-fit">
        <button
          onClick={() => setViewMode("list")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            viewMode === "list" ? "bg-tumba-500 text-white shadow" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Feed
        </button>
        <button
          onClick={() => setViewMode("calendar")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            viewMode === "calendar" ? "bg-tumba-500 text-white shadow" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Calendar
        </button>
      </div>

      {/* Create Event Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="mb-8 p-5 sm:p-6 rounded-2xl border border-tumba-500/30 bg-tumba-500/5 overflow-hidden"
          >
            <h2 className="text-lg font-bold mb-4 gradient-text">Host something epic</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500" placeholder="e.g. BBQ at the park" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500 resize-none" placeholder="What's the plan?" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date & Time</label>
                  <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Category (Vibe)</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500">
                    {EVENT_CATEGORIES.map((c) => ( <option key={c.value} value={c.value}>{c.label}</option> ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Location (optional)</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500" placeholder="e.g. Central Park, Tel Aviv" />
              </div>

              {/* Polls */}
              <div className="pt-2 border-t border-[var(--border)]">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                    <BarChart2 size={16} /> Polls (optional)
                  </label>
                  <button type="button" onClick={addPoll} className="text-xs font-bold text-tumba-400 hover:text-tumba-300 transition-colors"> + Add Poll </button>
                </div>
                {polls.map((poll, pi) => (
                  <div key={pi} className="mb-4 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-[var(--text-secondary)]">Poll {pi + 1}</span>
                      <button type="button" onClick={() => removePoll(pi)} className="text-xs font-bold text-red-400 hover:text-red-300"> Remove </button>
                    </div>
                    <input type="text" value={poll.question} onChange={(e) => updatePollQuestion(pi, e.target.value)} placeholder="Question (e.g. Where should we meet?)" className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-tumba-500 mb-2" />
                    {poll.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2 mb-1.5">
                        <input type="text" value={opt} onChange={(e) => updatePollOption(pi, oi, e.target.value)} placeholder={`Option ${oi + 1}`} className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-tumba-500" />
                        {poll.options.length > 2 && ( <button type="button" onClick={() => removePollOption(pi, oi)} className="text-red-400 font-bold hover:text-red-300 px-2"><X size={14}/></button> )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addPollOption(pi)} className="text-xs font-bold text-tumba-400 hover:text-tumba-300 mt-2"> + Add Option </button>
                  </div>
                ))}
              </div>
            </div>
            <button type="submit" disabled={submitting} className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-tumba-600 to-tumba-400 text-white font-extrabold hover:to-tumba-300 shadow-lg shadow-tumba-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {submitting ? "Creating..." : <><Send size={18} /> Launch Event</>}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-8 p-4 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <h3 className="text-xl font-bold mb-6 text-center gradient-text">
            {new Date(calendarYear, calendarMonth).toLocaleString("en-US", { month: "long", year: "numeric" })}
          </h3>
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-[var(--text-secondary)] mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => ( <div key={d} className="py-1">{d}</div> ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => ( <div key={`empty-${i}`} /> ))}
            {calendarDays.map((day) => {
              const dayEvents = eventsByDay[day] || [];
              const isToday = day === now.getDate();
              const hasEvents = dayEvents.length > 0;
              
              return (
                <div 
                  key={day} 
                  onClick={() => hasEvents && setSelectedDayEvents({ day, events: dayEvents })}
                  className={`aspect-square p-1 rounded-xl text-xs flex flex-col items-center justify-start transition-all ${
                    hasEvents ? "cursor-pointer hover:border-tumba-500/50 hover:bg-tumba-500/5" : "hover:bg-[var(--bg-secondary)]"
                  } ${isToday ? "bg-tumba-500/20 border border-tumba-500/50" : hasEvents ? "bg-[var(--bg-secondary)] border border-[var(--border)]" : ""}`}
                >
                  <span className={`text-xs mt-1 ${isToday ? "text-tumba-400 font-extrabold" : "text-[var(--text-secondary)] font-medium"}`}>{day}</span>
                  <div className="flex gap-1 mt-auto mb-1 flex-wrap justify-center">
                    {dayEvents.map((e) => (
                      <div key={e.id} className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-tumba-400" title={e.title} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* List View - Upcoming Events */}
      {viewMode === "list" && (
        <div className="space-y-8">
          {upcomingEvents.length === 0 ? (
            <EmptyState
              icon={<PartyIcon size={40} strokeWidth={1.5} className="text-tumba-400" />}
              title="No upcoming events"
              description="Be the hero and host something epic!"
              className="py-12 border border-dashed border-[var(--border)] rounded-3xl"
            />
          ) : (
            <>
              {heroEvent && (
                <div className="relative">
                  <div className="absolute -top-3 left-4 bg-gradient-to-r from-neon-pink to-tumba-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg z-10">
                    Next Up
                  </div>
                  <EventCard
                    event={heroEvent}
                    userId={userId}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    onVote={handleVote}
                    onUnvote={handleUnvote}
                    onRsvp={handleRsvp}
                    isHero={true} 
                  />
                </div>
              )}

              {otherUpcomingEvents.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-2">Later On</h3>
                  {otherUpcomingEvents.map((event) => (
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
            </>
          )}

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div className="mt-12 pt-8 border-t border-[var(--border)]">
              <h2 className="text-lg font-bold mb-4 text-[var(--text-secondary)]">Memories (Past Events)</h2>
              <div className="space-y-4 opacity-60 grayscale-[30%] hover:grayscale-0 transition-all">
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
        </div>
      )}

      {/* --- Calendar Day Detail Modal --- */}
      <AnimatePresence>
        {selectedDayEvents && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedDayEvents(null)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-2xl bg-[var(--bg-primary)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[var(--border)] bg-[var(--bg-card)]">
                <div>
                  <h2 className="text-xl font-bold">
                    Events for {new Date(calendarYear, calendarMonth, selectedDayEvents.day).toLocaleDateString("en-GB", { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h2>
                </div>
                <button 
                  onClick={() => setSelectedDayEvents(null)} 
                  className="p-2 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Modal Content - Render full EventCards! */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
                {selectedDayEvents.events.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    userId={userId}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    onVote={handleVote}
                    onUnvote={handleUnvote}
                    onRsvp={handleRsvp}
                    past={new Date(event.date) < now}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// קומפוננטת עזר לאווטארים
function AvatarStack({ rsvps }: { rsvps: Rsvp[] }) {
  const going = rsvps.filter((r) => r.status === "GOING").slice(0, 5);
  const extra = rsvps.filter((r) => r.status === "GOING").length - 5;
  
  if (going.length === 0) return null;
  
  return (
    <div className="flex -space-x-2 overflow-hidden items-center">
      {going.map((r) => (
        <div key={r.userId} className="inline-flex h-7 w-7 sm:h-8 sm:w-8 rounded-full ring-2 ring-[var(--bg-card)] bg-[var(--bg-secondary)] overflow-hidden items-center justify-center relative z-10" title={r.user.name}>
          {r.user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.user.avatar} alt={r.user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] sm:text-xs font-extrabold text-[var(--text-primary)]">
              {r.user.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="inline-flex h-7 w-7 sm:h-8 sm:w-8 rounded-full ring-2 ring-[var(--bg-card)] bg-[var(--bg-secondary)] border border-[var(--border)] items-center justify-center text-[10px] font-bold text-[var(--text-primary)] relative z-0">
          +{extra}
        </div>
      )}
    </div>
  );
}

function EventCard({
  event, userId, isAdmin, onDelete, onVote, onUnvote, onRsvp, past, isHero = false
}: {
  event: Event; userId?: string; isAdmin?: boolean; onDelete: (id: string) => void;
  onVote: (pollId: string, optionId: string) => void; onUnvote: (pollId: string) => void; onRsvp: (eventId: string, status: string) => void;
  past?: boolean; isHero?: boolean;
}) {
  const eventDate = new Date(event.date);
  const canDelete = event.user.id === userId || isAdmin;
  const catInfo = EVENT_CATEGORIES.find((c) => c.value === event.category);
  const myRsvp = event.rsvps.find((r) => r.userId === userId);

  const goingCount = event.rsvps.filter((r) => r.status === "GOING").length;
 

  const vibeColorClass = CATEGORY_COLORS[event.category] || CATEGORY_COLORS["other"];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`relative p-5 sm:p-6 rounded-[2rem] transition-all overflow-hidden ${
        isHero 
          ? "bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-card)] border-2 border-tumba-500/30 shadow-xl shadow-tumba-500/10" 
          : "border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]"
      }`}
    >
      {isHero && <div className="absolute -top-24 -right-24 w-48 h-48 bg-tumba-500/10 blur-3xl rounded-full pointer-events-none" />}

      <div className="flex items-start justify-between mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 border ${vibeColorClass}`}>
              {catInfo && <catInfo.icon size={12} strokeWidth={2.5} />}
              {catInfo?.label || "Event"}
            </span>
            {isHero && (
              <span className="text-xs font-bold text-tumba-400 bg-tumba-500/10 px-2.5 py-1 rounded-lg border border-tumba-500/20 flex items-center gap-1.5">
                <Clock size={12} strokeWidth={2.5} /> {getTimeRemaining(event.date)}
              </span>
            )}
          </div>
          
          <h3 className={`${isHero ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"} font-extrabold mb-1`}>{event.title}</h3>
          
          <div className="flex items-center gap-3 flex-wrap mt-2">
            <span className={`text-sm font-semibold ${isHero ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
              {eventDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
              {" • "}
              {eventDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {event.location && (
              <span className="text-sm text-[var(--text-secondary)] flex items-center gap-1 font-medium bg-[var(--bg-secondary)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                <LocationIcon size={14} strokeWidth={2} /> {event.location}
              </span>
            )}
          </div>
        </div>
        
        {canDelete && (
          <button onClick={() => onDelete(event.id)} className="text-xs font-bold text-[var(--text-secondary)] hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-500/10">
            <X size={16} />
          </button>
        )}
      </div>

      <p className="text-sm text-[var(--text-secondary)] mb-6 whitespace-pre-wrap leading-relaxed relative z-10">
        {event.description}
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[var(--border)] relative z-10">
        <div className="flex items-center gap-3">
          <AvatarStack rsvps={event.rsvps} />
          {goingCount > 0 && <span className="text-xs font-semibold text-[var(--text-secondary)]">{goingCount} Going</span>}
          {goingCount === 0 && !past && <span className="text-xs font-semibold text-[var(--text-secondary)]">First to join?</span>}
        </div>

        {!past && (
          <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border)]">
            {([
              { status: "GOING",     label: "Going", Icon: GoingIcon },
              { status: "MAYBE",     label: "Maybe", Icon: MaybeIcon },
              { status: "NOT_GOING", label: "No",    Icon: NotGoingIcon },
            ] as const).map(({ status, label, Icon }) => (
              <button
                key={status}
                onClick={() => onRsvp(event.id, status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  myRsvp?.status === status
                    ? status === "GOING"
                      ? "bg-tumba-500 text-white shadow-md shadow-tumba-500/30"
                      : status === "MAYBE"
                        ? "bg-yellow-500 text-black shadow-md shadow-yellow-500/30"
                        : "bg-red-500 text-white shadow-md shadow-red-500/30"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                }`}
              >
                <Icon size={14} strokeWidth={2.5} /> <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {event.polls.length > 0 && (
        <div className="mt-4 space-y-3 relative z-10">
          {event.polls.map((poll) => {
            const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
            const userVotedOption = poll.options.find((o) => o.votes.some((v) => v.userId === userId));

            return (
              <div key={poll.id} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <p className="text-sm font-bold mb-3 text-[var(--text-primary)] flex items-center gap-2">
                  <BarChart2 size={16} className="text-tumba-400" /> {poll.question}
                </p>
                <div className="space-y-2">
                  {poll.options.map((option) => {
                    const isSelected = userVotedOption?.id === option.id;
                    const voteCount = option.votes.length;
                    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                    return (
                      <button
                        key={option.id}
                        onClick={() => { if (past) return; if (isSelected) { onUnvote(poll.id); } else { onVote(poll.id, option.id); } }}
                        disabled={past}
                        className={`relative w-full text-left px-4 py-3 rounded-xl border transition-all overflow-hidden ${
                          isSelected ? "border-tumba-500 bg-tumba-500/10 shadow-sm" : "border-[var(--border)] hover:border-tumba-500/30 bg-[var(--bg-card)]"
                        } ${past ? "cursor-default" : "cursor-pointer"}`}
                      >
                        {totalVotes > 0 && (
                          <div className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out ${isSelected ? "bg-tumba-500/20" : "bg-[var(--border)]/40"}`} style={{ width: `${percentage}%` }} />
                        )}
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "border-tumba-500 bg-tumba-500" : "border-[var(--text-secondary)]/30"}`}>
                              {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                            <span className={`text-sm ${isSelected ? "font-bold text-tumba-400" : "font-medium"}`}>{option.text}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-[var(--text-secondary)]">
                              {voteCount} {voteCount === 1 ? "vote" : "votes"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}