import { useEffect, useState } from "react";
import {
  STAFF,
  dayKey,
  clock,
  minuteOf,
  seed,
  duration,
  validateBooking,
  availableSlots,
  isState,
  download,
  calendarEvent,
  upgradeState,
  waitMatches,
} from "./model.mjs";
import "./studio.css";
import "./studio-v2.css";
import Dialog from "./Dialog.jsx";
import Agenda from "./Agenda.jsx";
import Waitlist from "./Waitlist.jsx";
import ClientProfile from "./ClientProfile.jsx";
const money = (n) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
const labels = {
  prenotato: "Prenotato",
  completato: "Completato",
  annullato: "Annullato",
};
const views = [
  ["agenda", "Agenda", "calendar"],
  ["clients", "Clienti", "people"],
  ["waitlist", "Attesa", "calendar"],
  ["services", "Servizi", "scissors"],
  ["insights", "Andamento", "chart"],
];
function Icon({ name }) {
  const paths = {
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 11h18M7 15h2m4 0h2" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-2a6 6 0 0112 0v2M16 5a3 3 0 010 6M21 21v-2a6 6 0 00-4-5" />
      </>
    ),
    scissors: (
      <>
        <circle cx="5" cy="6" r="3" />
        <circle cx="5" cy="18" r="3" />
        <path d="M8 8l13 13M8 16L21 3" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18M7 16l5-6 4 3 5-7" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6l6 6-6 6" />,
    plus: <path d="M12 4v16M4 12h16" />,
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="M15 15l6 6" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] || paths.calendar}
    </svg>
  );
}
function initialState() {
  try {
    const saved = JSON.parse(localStorage.getItem("leandro-studio-v1"));
    if (isState(saved)) return upgradeState(saved);
  } catch {
    /* Demo starts fresh if storage is unavailable */
  }
  return upgradeState(seed());
}
export default function StudioDemo() {
  const [state, setState] = useState(initialState),
    [view, setView] = useState("agenda"),
    [date, setDate] = useState(dayKey),
    [staff, setStaff] = useState("all"),
    [query, setQuery] = useState(""),
    [panel, setPanel] = useState(null),
    [toast, setToast] = useState(""),
    [storageError, setStorageError] = useState(false),
    [booking, setBooking] = useState(false),
    [undo, setUndo] = useState(null);
  useEffect(() => {
    try {
      localStorage.setItem("leandro-studio-v1", JSON.stringify(state));
    } catch {
      const timer = setTimeout(() => setStorageError(true), 0);
      return () => clearTimeout(timer);
    }
  }, [state]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const active = state.appointments.filter(
    (a) => a.date === date && a.status !== "annullato",
  );
  const total = active.reduce(
    (n, a) => n + (state.services.find((s) => s.id === a.service)?.price || 0),
    0,
  );
  const minutes = active.reduce((n, a) => n + duration(a, state.services), 0);

  const update = (item) => {
    const error = validateBooking(item, state);
    if (error) return error;
    setUndo({
      appointments: state.appointments,
      waitlist: state.waitlist,
      date,
    });
    setState((prev) => ({
      ...prev,
      appointments: prev.appointments.some((a) => a.id === item.id)
        ? prev.appointments.map((a) => (a.id === item.id ? item : a))
        : [...prev.appointments, { ...item, id: crypto.randomUUID() }],
    }));
    setPanel(null);
    setDate(item.date);
    setToast("Appuntamento salvato nella demo");
    return "";
  };
  const newItem = () => ({
    id: "",
    client: state.clients[0].id,
    staff: staff === "all" ? "leandro" : staff,
    service: state.services[0].id,
    start: 540,
    date,
    status: "prenotato",
    note: "",
  });
  const shiftDay = (n) => {
    const next = new Date(date + "T12:00:00");
    next.setDate(next.getDate() + n);
    setDate(dayKey(next));
  };
  const importData = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 20000000) throw Error();
      const next = JSON.parse(await file.text());
      if (!isState(next)) throw Error();
      setState(upgradeState(next));
      setUndo(null);
      setToast("Backup demo importato");
    } catch {
      setToast("Backup non valido: nessun dato modificato");
    }
    event.target.value = "";
  };
  return (
    <div className="ls-studio">
      <aside className="ls-sidebar">
        <div className="ls-brand">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Logo Leandro Style"
          />
          <span>
            LEANDRO
            <br />
            <b>STYLE</b>
          </span>
        </div>
        <div className="ls-workspace">
          SALON WORKSPACE<span>Il tuo salone, sotto controllo.</span>
        </div>
        <nav aria-label="Navigazione principale">
          {views.map(([id, label, icon]) => (
            <button
              key={id}
              className={view === id ? "is-active" : ""}
              onClick={() => {
                setView(id);
                setQuery("");
              }}
            >
              <Icon name={icon} />
              {label}
              {view === id && <i />}
            </button>
          ))}
        </nav>
        <div className="ls-side-bottom">
          <button className="ls-booking-link" onClick={() => setBooking(true)}>
            Prova la prenotazione cliente <Icon name="arrow" />
          </button>
          <div className="ls-account">
            <span className="ls-avatar">L</span>
            <div>
              Leandro Style<small>Ambiente dimostrativo</small>
            </div>
          </div>
        </div>
      </aside>
      <main className="ls-main">
        <header className="ls-topbar">
          <span>
            Workspace <span className="ls-slash">/</span>{" "}
            {views.find((v) => v[0] === view)[1]}
          </span>
          <span className="ls-demo">
            <i /> DEMO · dati locali
          </span>
        </header>
        <section className="ls-page" key={view}>
          <div className="ls-heading">
            <div>
              <p className="ls-eyebrow">LEANDRO STYLE / STUDIO</p>
              <h1>
                {view === "agenda"
                  ? "Ogni appuntamento, al suo posto."
                  : view === "waitlist"
                    ? "Ogni spazio, una possibilità."
                    : view === "clients"
                      ? "Le persone, prima di tutto."
                      : view === "services"
                        ? "Il valore del tuo lavoro."
                        : "Una giornata in numeri."}
              </h1>
              <p>
                {view === "agenda"
                  ? "Tempo ben organizzato. Più spazio per il tuo mestiere."
                  : view === "waitlist"
                    ? "Trova le richieste compatibili con gli spazi liberi."
                    : view === "clients"
                      ? "Preferenze e storico, sempre a portata di mano."
                      : view === "services"
                        ? "Durate e prezzi guidano agenda e prenotazioni."
                        : "Dati calcolati dagli appuntamenti della demo."}
              </p>
            </div>
            <button
              className="ls-primary"
              onClick={() => setPanel({ type: "appointment", item: newItem() })}
            >
              <Icon name="plus" /> Nuovo appuntamento
            </button>
          </div>
          {storageError && (
            <p className="ls-error" role="alert">
              Il salvataggio nel browser non è riuscito. Esporta un backup dalla
              sezione Andamento prima di chiudere questa pagina.
            </p>
          )}
          <div className="ls-metrics">
            <div>
              <span>Appuntamenti del giorno</span>
              <strong>{active.length.toString().padStart(2, "0")}</strong>
              <small>
                {active.filter((a) => a.status === "completato").length}{" "}
                completati
              </small>
            </div>
            <div>
              <span>Valore in agenda</span>
              <strong>{money(total)}</strong>
              <small>Listino demo · non incasso</small>
            </div>
            <div>
              <span>Tempo prenotato</span>
              <strong>
                {Math.floor(minutes / 60)}
                <em>h</em> {minutes % 60}
                <em>m</em>
              </strong>
              <small>Su {STAFF.length * 9} ore di disponibilità</small>
            </div>
            <div className="ls-occupancy">
              <span>Occupazione giornaliera</span>
              <strong>
                {Math.round((minutes / (STAFF.length * 540)) * 100)}
                <em>%</em>
              </strong>
              <div className="ls-meter">
                <i
                  style={{ width: `${Math.min((minutes / 1620) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
          {view === "agenda" && (
            <Agenda
              state={state}
              date={date}
              staff={staff}
              setStaff={setStaff}
              setDate={setDate}
              shiftDay={shiftDay}
              onOpen={(item) => setPanel({ type: "appointment", item })}
              onNew={(staff, start, maxDuration) =>
                setPanel({
                  type: "appointment",
                  item: {
                    ...newItem(),
                    staff,
                    start,
                    service:
                      state.services.find(
                        (s) => !maxDuration || s.minutes <= maxDuration,
                      )?.id || state.services[0].id,
                  },
                })
              }
              onMove={(item) => {
                const error = update(item);
                if (error) setToast(error);
              }}
              onWaitlist={() => setView("waitlist")}
            />
          )}
          {view === "waitlist" && (
            <Waitlist
              state={state}
              date={date}
              setDate={setDate}
              onAdd={(item) => {
                setUndo(null);
                setState((prev) => ({
                  ...prev,
                  waitlist: [
                    ...prev.waitlist,
                    { ...item, id: crypto.randomUUID() },
                  ],
                }));
              }}
              onRemove={(id) => {
                setUndo(null);
                setState((prev) => ({
                  ...prev,
                  waitlist: prev.waitlist.filter((w) => w.id !== id),
                }));
              }}
              onPlace={(request, item) => {
                if (
                  !waitMatches(state, request, item.date).some(
                    (m) => m.staff === item.staff && m.start === item.start,
                  )
                ) {
                  setToast("Lo spazio non è più disponibile.");
                  return false;
                }
                setUndo({
                  appointments: state.appointments,
                  waitlist: state.waitlist,
                  date,
                });
                setState((prev) => ({
                  ...prev,
                  appointments: [
                    ...prev.appointments,
                    { ...item, id: crypto.randomUUID() },
                  ],
                  waitlist: prev.waitlist.filter((w) => w.id !== request.id),
                }));
                setToast("Appuntamento inserito dalla lista d’attesa");
                return true;
              }}
            />
          )}
          {view === "clients" && (
            <>
              <div className="ls-list-tools">
                <label className="ls-search">
                  <Icon name="search" />
                  <input
                    aria-label="Cerca cliente"
                    placeholder="Cerca una persona…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <button
                  className="ls-secondary"
                  onClick={() =>
                    setPanel({
                      type: "client",
                      item: { id: "", name: "", note: "" },
                    })
                  }
                >
                  + Aggiungi cliente
                </button>
              </div>
              <div className="ls-client-list">
                {state.clients
                  .filter((c) =>
                    c.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((c) => {
                    const history = state.appointments.filter(
                      (a) => a.client === c.id && a.status === "completato",
                    );
                    return (
                      <button
                        key={c.id}
                        onClick={() => setPanel({ type: "client", item: c })}
                      >
                        <span className="ls-avatar">
                          {c.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div>
                          <strong>{c.name}</strong>
                          <small>
                            {c.note || "Nessuna preferenza annotata"}
                          </small>
                        </div>
                        <span>{history.length} visite completate</span>
                        <Icon name="arrow" />
                      </button>
                    );
                  })}
              </div>
            </>
          )}
          {view === "services" && (
            <div className="ls-service-list">
              {state.services.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setPanel({ type: "service", item: s })}
                >
                  <span className="ls-service-number">0{i + 1}</span>
                  <div>
                    <h2>{s.name}</h2>
                    <p>
                      {s.minutes} minuti · Durata utilizzata per verificare
                      disponibilità
                    </p>
                  </div>
                  <strong>{money(s.price)}</strong>
                  <span>Modifica ↗</span>
                </button>
              ))}
            </div>
          )}
          {view === "insights" && (
            <div className="ls-insights">
              <div>
                <p className="ls-eyebrow">DISTRIBUZIONE DEL LAVORO</p>
                <h2>Il ritmo del team.</h2>
                {STAFF.map((s) => {
                  const amount = active
                    .filter((a) => a.staff === s.id)
                    .reduce((n, a) => n + duration(a, state.services), 0);
                  return (
                    <div className="ls-team-bar" key={s.id}>
                      <span>{s.name}</span>
                      <div>
                        <i
                          style={{
                            width: `${Math.min((amount / 540) * 100, 100)}%`,
                            background: s.color,
                          }}
                        />
                      </div>
                      <strong>{Math.round((amount / 540) * 100)}%</strong>
                    </div>
                  );
                })}
                <p className="ls-small">
                  Disponibilità demo: 09–13 e 14–19. Le cancellazioni non
                  occupano tempo.
                </p>
              </div>
              <div className="ls-backup">
                <p className="ls-eyebrow">I DATI DELLA DEMO</p>
                <h2>Un lavoro che puoi conservare.</h2>
                <p>
                  Le modifiche restano in questo browser. Esporta un backup per
                  spostarle su un altro dispositivo.
                </p>
                <button
                  className="ls-primary"
                  onClick={() =>
                    download(
                      "leandro-studio-backup.json",
                      JSON.stringify(state, null, 2),
                    )
                  }
                >
                  Esporta backup JSON
                </button>
                <label className="ls-secondary">
                  Importa backup
                  <input type="file" accept=".json" onChange={importData} />
                </label>
                <p className="ls-small">
                  Questa anteprima non invia messaggi, non incassa pagamenti e
                  non modifica il gestionale collegato ad Appwrite.
                </p>
              </div>
            </div>
          )}
          <footer className="ls-page-footer">
            <span>
              LEANDRO STYLE <b>STUDIO</b>
            </span>
            <span>
              Anteprima interattiva · nominativi e prezzi di esempio
              {storageError ? " · Salvataggio locale non disponibile" : ""}
            </span>
          </footer>
        </section>
      </main>
      {panel?.type === "client" && (
        <ClientProfile
          key={panel.item.id || "new"}
          item={panel.item}
          state={state}
          onClose={() => setPanel(panel.back || null)}
          onSave={(item) => {
            setState((prev) => ({
              ...prev,
              clients: item.id
                ? prev.clients.map((c) => (c.id === item.id ? item : c))
                : [...prev.clients, { ...item, id: crypto.randomUUID() }],
            }));
            setPanel(panel.back || null);
            setToast("Scheda cliente salvata");
          }}
          onNext={(client) => {
            setPanel({ type: "appointment", item: { ...newItem(), client } });
            setView("agenda");
          }}
        />
      )}
      {panel && panel.type !== "client" && (
        <Editor
          key={panel.type + (panel.item.id || "new")}
          panel={panel}
          state={state}
          onClose={() => setPanel(null)}
          onClient={(item) =>
            setPanel({
              type: "client",
              item: state.clients.find((c) => c.id === item.client),
              back: { type: "appointment", item },
            })
          }
          onNext={(item) => {
            const next = new Date(item.date + "T12:00:00");
            next.setDate(next.getDate() + 28);
            setPanel({
              type: "appointment",
              item: {
                ...item,
                id: "",
                date: dayKey(next),
                status: "prenotato",
                confirmation: "pending",
                note: "",
              },
            });
          }}
          onSave={(item) => {
            if (panel.type === "appointment") return update(item);
            if (panel.type === "client") {
              setState((prev) => ({
                ...prev,
                clients: item.id
                  ? prev.clients.map((c) => (c.id === item.id ? item : c))
                  : [...prev.clients, { ...item, id: crypto.randomUUID() }],
              }));
            } else {
              const candidate = {
                ...state,
                services: state.services.map((s) =>
                  s.id === item.id ? item : s,
                ),
              };
              if (
                candidate.appointments.some(
                  (a) =>
                    a.status !== "annullato" && validateBooking(a, candidate),
                )
              )
                return "Questa durata genera conflitti o supera gli orari. Sposta prima gli appuntamenti.";
              setUndo(null);
              setState(candidate);
            }
            setPanel(null);
            setToast("Modifiche salvate nella demo");
            return "";
          }}
        />
      )}
      {booking && (
        <Booking
          state={state}
          onClose={() => setBooking(false)}
          onBook={(item, name) => {
            if (name.length < 2) return "Inserisci il tuo nome.";
            const client = { id: crypto.randomUUID(), name, note: "" };
            const candidate = { ...state, clients: [...state.clients, client] };
            const appointment = {
              ...item,
              client: client.id,
              id: crypto.randomUUID(),
              status: "prenotato",
              note: "",
            };
            const error = validateBooking(appointment, candidate);
            if (error) return error;
            setState({
              ...candidate,
              appointments: [...candidate.appointments, appointment],
            });
            setUndo(null);
            setDate(item.date);
            setToast("Prenotazione demo aggiunta in agenda");
            return "";
          }}
        />
      )}
      {undo && (
        <div className="ls-undo" role="status">
          <span>Ultima modifica all’agenda</span>
          <button
            onClick={() => {
              setState((prev) => ({
                ...prev,
                appointments: undo.appointments,
                waitlist: undo.waitlist,
              }));
              setDate(undo.date);
              setUndo(null);
              setToast("Modifica annullata");
            }}
          >
            Annulla modifica
          </button>
          <button
            aria-label="Chiudi annullamento"
            onClick={() => setUndo(null)}
          >
            ×
          </button>
        </div>
      )}
      {toast && (
        <div className="ls-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
function Editor({ panel, state, onClose, onSave, onClient, onNext }) {
  const [item, setItem] = useState({ ...panel.item }),
    [error, setError] = useState("");
  const isApp = panel.type === "appointment",
    isClient = panel.type === "client";
  const change = (key, value) => setItem((prev) => ({ ...prev, [key]: value }));
  const submit = (e) => {
    e.preventDefault();
    if (!isApp && !item.name.trim()) {
      setError("Inserisci un nome.");
      return;
    }
    setError(onSave(isApp ? item : { ...item, name: item.name.trim() }) || "");
  };
  return (
    <Dialog
      onClose={onClose}
      title={isApp ? "APPUNTAMENTO" : isClient ? "CLIENTE" : "SERVIZIO"}
    >
      <form onSubmit={submit}>
        <h2>
          {isApp
            ? item.id
              ? "Dettaglio appuntamento"
              : "Un nuovo appuntamento"
            : isClient
              ? item.id
                ? item.name
                : "Una nuova persona"
              : item.name}
        </h2>
        <p className="ls-dialog-intro">
          {isApp
            ? "Disponibilità verificata prima del salvataggio."
            : isClient
              ? "Una scheda semplice, per un servizio più personale."
              : "Il prezzo e la durata aggiornano questa demo."}
        </p>
        {isApp ? (
          <>
            <label>
              Cliente
              <select
                value={item.client}
                onChange={(e) => change("client", e.target.value)}
              >
                {state.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="ls-profile-link"
              onClick={() => onClient(item)}
            >
              Apri scheda cliente <Icon name="arrow" />
            </button>
            <label>
              Servizio
              <select
                value={item.service}
                onChange={(e) => change("service", e.target.value)}
              >
                {state.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.minutes} min · {money(s.price)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Professionista
              <select
                aria-label="Professionista"
                value={item.staff}
                onChange={(e) => change("staff", e.target.value)}
              >
                {STAFF.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="ls-form-row">
              <label>
                Data
                <input
                  required
                  type="date"
                  value={item.date}
                  onChange={(e) => change("date", e.target.value)}
                />
              </label>
              <label>
                Ora
                <input
                  required
                  type="time"
                  step="900"
                  value={clock(item.start)}
                  onChange={(e) => change("start", minuteOf(e.target.value))}
                />
              </label>
            </div>
            <label>
              Stato
              <select
                value={item.status}
                onChange={(e) => change("status", e.target.value)}
              >
                {Object.entries(labels).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Conferma cliente (registrata dal salone)
              <select
                value={item.confirmation || "pending"}
                onChange={(e) => change("confirmation", e.target.value)}
              >
                <option value="pending">Da confermare</option>
                <option value="confirmed">Confermato</option>
              </select>
            </label>
            {item.id && (
              <button
                type="button"
                className="ls-secondary"
                onClick={() => onNext(item)}
              >
                Prenota il prossimo · tra 4 settimane
              </button>
            )}
            <label>
              Nota interna
              <textarea
                aria-label="Nota interna"
                value={item.note || ""}
                maxLength={1000}
                onChange={(e) => change("note", e.target.value)}
              />
            </label>
            {item.id && (
              <button
                type="button"
                className="ls-secondary"
                onClick={() =>
                  download(
                    "appuntamento.ics",
                    calendarEvent(item, state),
                    "text/calendar",
                  )
                }
              >
                Aggiungi al calendario (.ics)
              </button>
            )}
          </>
        ) : (
          <>
            <label>
              Nome
              <input
                required
                maxLength={100}
                value={item.name}
                onChange={(e) => change("name", e.target.value)}
              />
            </label>
            {isClient ? (
              <>
                <label>
                  Preferenze / note
                  <textarea
                    maxLength={1000}
                    value={item.note}
                    onChange={(e) => change("note", e.target.value)}
                  />
                </label>
                <div className="ls-history">
                  <p className="ls-eyebrow">STORICO APPUNTAMENTI</p>
                  {state.appointments
                    .filter((a) => a.client === item.id)
                    .sort(
                      (a, b) =>
                        b.date.localeCompare(a.date) || b.start - a.start,
                    )
                    .map((a) => (
                      <p key={a.id}>
                        {a.date} ·{" "}
                        {state.services.find((s) => s.id === a.service).name}
                        <small>{labels[a.status]}</small>
                      </p>
                    ))}
                  {!state.appointments.some((a) => a.client === item.id) && (
                    <p>Nessun appuntamento registrato.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="ls-form-row">
                <label>
                  Durata (min)
                  <input
                    required
                    type="number"
                    min="15"
                    max="240"
                    step="15"
                    value={item.minutes}
                    onChange={(e) => change("minutes", Number(e.target.value))}
                  />
                </label>
                <label>
                  Prezzo (€)
                  <input
                    required
                    type="number"
                    min="0"
                    max="2000"
                    step="0.5"
                    value={item.price}
                    onChange={(e) => change("price", Number(e.target.value))}
                  />
                </label>
              </div>
            )}
          </>
        )}
        {error && (
          <p className="ls-error" role="alert">
            {error}
          </p>
        )}
        <div className="ls-dialog-actions">
          <button type="button" className="ls-secondary" onClick={onClose}>
            Annulla
          </button>
          <button className="ls-primary" type="submit">
            Salva {isApp ? "appuntamento" : "modifiche"} <Icon name="arrow" />
          </button>
        </div>
      </form>
    </Dialog>
  );
}
function Booking({ state, onClose, onBook }) {
  const [service, setService] = useState(state.services[0].id),
    [staff, setStaff] = useState("leandro"),
    [date, setDate] = useState(dayKey()),
    [time, setTime] = useState(null),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const slots = availableSlots(state, service, staff, date);
  return (
    <Dialog title="PRENOTAZIONE CLIENTE" onClose={onClose} wide>
      <div className="ls-booking-split">
        <div className="ls-booking-story">
          <p className="ls-eyebrow">IL TUO MOMENTO</p>
          <h2>
            Un buon taglio.
            <br />
            Un nuovo inizio.
          </h2>
          <div className="ls-motion-art" aria-hidden="true">
            <div />
            <div />
            <div />
            <span>LS</span>
          </div>
          <p>
            Leandro Style
            <br />
            <small>Esperienza di prenotazione dimostrativa</small>
          </p>
        </div>
        <div className="ls-booking-form">
          {done ? (
            <>
              <span className="ls-success-mark">✓</span>
              <h2>Il tuo momento è riservato.</h2>
              <p>
                {date} · {clock(time)} ·{" "}
                {STAFF.find((s) => s.id === staff).name}
              </p>
              <p className="ls-small">
                Prenotazione salvata solo nella demo. Nessun messaggio è stato
                inviato.
              </p>
              <button className="ls-primary" onClick={onClose}>
                Torna all’agenda
              </button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (time === null || !slots.includes(time)) {
                  setError("Seleziona un orario disponibile.");
                  return;
                }
                const issue = onBook(
                  { service, staff, date, start: time },
                  name.trim(),
                );
                if (issue) setError(issue);
                else setDone(true);
              }}
            >
              <p className="ls-eyebrow">PRENOTA IL TUO APPUNTAMENTO</p>
              <h2>Fai spazio a te.</h2>
              <label>
                Il servizio
                <select
                  value={service}
                  onChange={(e) => {
                    setService(e.target.value);
                    setTime(null);
                  }}
                >
                  {state.services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {money(s.price)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="ls-form-row">
                <label>
                  Con chi
                  <select
                    value={staff}
                    onChange={(e) => {
                      setStaff(e.target.value);
                      setTime(null);
                    }}
                  >
                    {STAFF.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Quando
                  <input
                    required
                    type="date"
                    min={dayKey()}
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setTime(null);
                    }}
                  />
                </label>
              </div>
              <fieldset>
                <legend>Gli orari disponibili</legend>
                <div className="ls-slots">
                  {slots.map((t) => (
                    <button
                      type="button"
                      key={t}
                      aria-pressed={time === t}
                      className={time === t ? "selected" : ""}
                      onClick={() => setTime(t)}
                    >
                      {clock(t)}
                    </button>
                  ))}
                </div>
                {slots.length === 0 && (
                  <p>
                    Nessuna disponibilità. Prova un’altra data o professionista.
                  </p>
                )}
              </fieldset>
              <label>
                Il tuo nome
                <input
                  required
                  maxLength={100}
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome e cognome"
                />
              </label>
              {error && (
                <p className="ls-error" role="alert">
                  {error}
                </p>
              )}
              <button className="ls-primary" type="submit">
                Conferma prenotazione demo <Icon name="arrow" />
              </button>
            </form>
          )}
        </div>
      </div>
    </Dialog>
  );
}
