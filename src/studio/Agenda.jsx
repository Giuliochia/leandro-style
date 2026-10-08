import { useState, useSyncExternalStore } from "react";
import {
  STAFF,
  clock,
  dayKey,
  duration,
  freeWindows,
  validateBooking,
  waitMatches,
} from "./model.mjs";
const query = "(max-width: 720px)";
const subscribe = (callback) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const snapshot = () => window.matchMedia(query).matches;
const money = (n) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
export default function Agenda({
  state,
  date,
  staff,
  setStaff,
  setDate,
  shiftDay,
  onOpen,
  onNew,
  onMove,
  onWaitlist,
}) {
  const mobile = useSyncExternalStore(subscribe, snapshot, () => false),
    [mode, setMode] = useState("timeline"),
    [dragged, setDragged] = useState(null),
    [dragError, setDragError] = useState("");
  const effective = mobile && staff === "all" ? STAFF[0].id : staff;
  const team = STAFF.filter((s) => effective === "all" || s.id === effective);
  const active = state.appointments.filter(
    (a) => a.date === date && a.status !== "annullato",
  );
  const selected = active
    .filter((a) => effective === "all" || a.staff === effective)
    .sort((a, b) => a.start - b.start);
  const now = new Date(),
    minute = now.getHours() * 60 + now.getMinutes();
  const next =
    date < dayKey()
      ? null
      : selected.find(
          (a) =>
            a.status === "prenotato" &&
            (date !== dayKey() ||
              a.start + duration(a, state.services) > minute),
        );
  const compatible = (state.waitlist || []).filter((w) =>
    waitMatches(state, w, date).some(
      (m) => effective === "all" || m.staff === effective,
    ),
  ).length;
  function drop(event, staffId) {
    event.preventDefault();
    if (!dragged) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const start = 540 + Math.round((event.clientY - rect.top) / 30) * 15;
    const item = { ...dragged, staff: staffId, start };
    const error = validateBooking(item, state);
    setDragged(null);
    if (error) {
      setDragError(error);
      return;
    }
    setDragError("");
    onMove(item);
  }
  function card(a, compact = false) {
    const service = state.services.find((s) => s.id === a.service),
      client = state.clients.find((c) => c.id === a.client),
      member = STAFF.find((s) => s.id === a.staff);
    return (
      <button
        key={a.id}
        draggable={!mobile && !compact && a.status === "prenotato"}
        onDragStart={(e) => {
          setDragged(a);
          e.dataTransfer.setData("text/plain", a.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => setDragged(null)}
        className={`${compact ? "ls-list-appointment" : "ls-appointment"} ${a.status === "completato" ? "is-complete" : ""} ${next?.id === a.id ? "is-next" : ""}`}
        style={
          compact
            ? { "--event-color": member.color }
            : {
                top: (a.start - 540) * 2,
                height: service.minutes * 2 - 4,
                "--event-color": member.color,
              }
        }
        onClick={() => onOpen(a)}
        aria-label={`${clock(a.start)} ${client.name}, ${service.name}, ${member.name}`}
      >
        <span className="ls-event-time">
          {clock(a.start)} — {clock(a.start + service.minutes)}
          {a.status === "completato" ? (
            <b>✓</b>
          ) : a.confirmation === "confirmed" ? (
            <b>Confermato</b>
          ) : null}
        </span>
        <strong>{client.name}</strong>
        <span>
          {service.name}
          {compact && ` · ${member.name}`}
        </span>
        {service.minutes >= 60 || compact ? (
          <small>
            <span>
              {next?.id === a.id
                ? "Prossimo"
                : a.status === "completato"
                  ? "Completato"
                  : "Prenotato"}
            </span>
            <span>{money(service.price)}</span>
          </small>
        ) : null}
      </button>
    );
  }
  return (
    <div className="ls-agenda-v2">
      <div className="ls-agenda-toolbar">
        <div className="ls-day-controls">
          <button aria-label="Giorno precedente" onClick={() => shiftDay(-1)}>
            ‹
          </button>
          <input
            aria-label="Data agenda"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || dayKey())}
          />
          <button aria-label="Giorno successivo" onClick={() => shiftDay(1)}>
            ›
          </button>
          <button onClick={() => setDate(dayKey())}>Oggi</button>
        </div>
        <div className="ls-agenda-view-switch" aria-label="Vista agenda">
          <button
            aria-pressed={mode === "timeline"}
            onClick={() => setMode("timeline")}
          >
            Agenda
          </button>
          <button
            aria-pressed={mode === "list"}
            onClick={() => setMode("list")}
          >
            Lista
          </button>
        </div>
      </div>
      <div
        className="ls-team-tabs"
        role="group"
        aria-label="Filtra per professionista"
      >
        {!mobile && (
          <button
            aria-pressed={effective === "all"}
            onClick={() => setStaff("all")}
          >
            Tutto il team
          </button>
        )}
        {STAFF.map((s) => (
          <button
            key={s.id}
            aria-pressed={effective === s.id}
            onClick={() => setStaff(s.id)}
          >
            <i style={{ background: s.color }} />
            {s.name}
            <small>{active.filter((a) => a.staff === s.id).length}</small>
          </button>
        ))}
      </div>
      <div className="ls-agenda-secondary">
        <button className="ls-wait-shortcut" onClick={onWaitlist}>
          Lista d’attesa
          {compatible > 0 && <span>{compatible} richieste disponibili</span>} →
        </button>
      </div>
      {dragError && (
        <p className="ls-error" role="alert">
          {dragError}
        </p>
      )}
      {mode === "list" ? (
        <div className="ls-day-list">
          {selected.length ? (
            selected.map((a) => card(a, true))
          ) : (
            <div className="ls-empty-state">
              <h2>La giornata è ancora libera.</h2>
              <p>
                Inserisci il primo appuntamento oppure consulta la lista
                d’attesa.
              </p>
              <button
                className="ls-secondary"
                onClick={() => onNew(team[0].id, 540)}
              >
                + Prenota alle 09:00
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="ls-calendar-wrap">
          <div className="ls-calendar" style={{ "--staff-count": team.length }}>
            <div className="ls-hours-head">ORA</div>
            {team.map((s) => (
              <div className="ls-staff-head" key={s.id}>
                <span
                  className="ls-avatar"
                  style={{ background: s.color + "18", color: s.color }}
                >
                  {s.name[0]}
                </span>
                <div>
                  {s.name}
                  <small>{s.role}</small>
                </div>
                <span className="ls-staff-count">
                  {active.filter((a) => a.staff === s.id).length}
                </span>
              </div>
            ))}
            <div className="ls-hours">
              {Array.from({ length: 11 }, (_, i) => (
                <span key={i} style={{ top: i * 120 }}>
                  {clock(540 + i * 60)}
                </span>
              ))}
            </div>
            {team.map((s) => (
              <div
                key={s.id}
                className={`ls-track ${dragged ? "is-dropping" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => drop(e, s.id)}
              >
                <div className="ls-lunch">
                  <span>Pausa / 13:00–14:00</span>
                </div>
                {freeWindows(state, s.id, date).map((gap) => (
                  <button
                    key={gap.start}
                    className="ls-free-slot"
                    disabled={
                      !state.services.some(
                        (service) => service.minutes <= gap.end - gap.start,
                      )
                    }
                    style={{
                      top: (gap.start - 540) * 2,
                      height: (gap.end - gap.start) * 2 - 4,
                    }}
                    onClick={() => onNew(s.id, gap.start, gap.end - gap.start)}
                    aria-label={`Prenota spazio libero ${s.name} ${clock(gap.start)}`}
                  >
                    <span>
                      + {clock(gap.start)} — {clock(gap.end)}
                    </span>
                    {gap.end - gap.start >= 45 && (
                      <small>{gap.end - gap.start} minuti liberi</small>
                    )}
                  </button>
                ))}
                {active.filter((a) => a.staff === s.id).map((a) => card(a))}
                {date === dayKey() && minute >= 540 && minute <= 1140 && (
                  <div
                    className="ls-now-line"
                    style={{ top: (minute - 540) * 2 }}
                  >
                    <i />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="ls-agenda-footer">
        <span>
          {new Date(date + "T12:00:00").toLocaleDateString("it-IT", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </span>
        <span>
          {mode === "list"
            ? "Seleziona un appuntamento per gestirlo."
            : mobile
              ? "Tocca uno spazio libero per prenotare."
              : "Trascina per spostare · clicca per gestire."}
        </span>
      </div>
    </div>
  );
}
