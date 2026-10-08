import { useState } from "react";
import {
  STAFF,
  clock,
  dayKey,
  minuteOf,
  waitMatches,
  validateWaitRequest,
} from "./model.mjs";
import Dialog from "./Dialog.jsx";
export default function Waitlist({
  state,
  date,
  setDate,
  onAdd,
  onRemove,
  onPlace,
}) {
  const [adding, setAdding] = useState(false),
    [choices, setChoices] = useState({});
  const requests = state.waitlist || [];
  return (
    <div className="ls-waitlist">
      <div className="ls-wait-toolbar">
        <label>
          Disponibilità del giorno
          <input
            aria-label="Data lista d’attesa"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value || dayKey());
              setChoices({});
            }}
          />
        </label>
        <button className="ls-primary" onClick={() => setAdding(true)}>
          + Nuova richiesta
        </button>
      </div>
      <div className="ls-wait-explainer">
        <span className="ls-wait-symbol">↗</span>
        <p>
          <strong>
            Una cancellazione può diventare un nuovo appuntamento.
          </strong>
          <br />
          Gli orari proposti rispettano preferenze, durata e disponibilità.
          L’inserimento è manuale: nessun messaggio viene inviato.
        </p>
      </div>
      {requests.length === 0 && (
        <div className="ls-empty-state">
          <h2>Nessuna richiesta in attesa.</h2>
          <p>
            Aggiungi chi desidera un orario diverso o il primo posto
            disponibile.
          </p>
        </div>
      )}
      {requests.map((request) => {
        const client = state.clients.find((c) => c.id === request.client),
          service = state.services.find((s) => s.id === request.service),
          matches = waitMatches(state, request, date),
          choice = choices[request.id] || "",
          picked = matches.find((m) => `${m.staff}:${m.start}` === choice);
        return (
          <article className="ls-wait-card" key={request.id}>
            <div className="ls-wait-person">
              <span className="ls-avatar">
                {client.name
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <h2>{client.name}</h2>
                <p>
                  {service.name} · {service.minutes} min
                </p>
              </div>
              <button
                aria-label={`Rimuovi richiesta ${client.name}`}
                onClick={() => onRemove(request.id)}
              >
                ×
              </button>
            </div>
            <div className="ls-wait-preferences">
              <span>
                {request.from} → {request.to}
              </span>
              <span>
                {clock(request.start)}–{clock(request.end)}
              </span>
              <span>
                {request.staff === "any"
                  ? "Qualsiasi professionista"
                  : STAFF.find((s) => s.id === request.staff).name}
              </span>
            </div>
            <div className="ls-wait-match">
              {matches.length ? (
                <>
                  <label>
                    Orari compatibili
                    <select
                      aria-label={`Orario per ${client.name}`}
                      value={picked ? choice : ""}
                      onChange={(e) =>
                        setChoices((prev) => ({
                          ...prev,
                          [request.id]: e.target.value,
                        }))
                      }
                    >
                      <option value="">
                        Scegli tra {matches.length} disponibilità
                      </option>
                      {matches.map((m) => (
                        <option
                          key={`${m.staff}:${m.start}`}
                          value={`${m.staff}:${m.start}`}
                        >
                          {clock(m.start)} ·{" "}
                          {STAFF.find((s) => s.id === m.staff).name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="ls-primary"
                    disabled={!picked}
                    onClick={() => picked && onPlace(request, picked)}
                  >
                    Inserisci in agenda →
                  </button>
                </>
              ) : (
                <p>
                  Nessun orario compatibile per questa data. Prova un altro
                  giorno.
                </p>
              )}
            </div>
          </article>
        );
      })}
      {adding && (
        <RequestForm
          state={state}
          date={date}
          onClose={() => setAdding(false)}
          onSave={(item) => {
            onAdd(item);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}
function RequestForm({ state, date, onClose, onSave }) {
  const [item, setItem] = useState({
      client: state.clients[0].id,
      service: state.services[0].id,
      staff: "any",
      from: date,
      to: date,
      start: 540,
      end: 1140,
    }),
    [error, setError] = useState("");
  const change = (key, value) => setItem((prev) => ({ ...prev, [key]: value }));
  return (
    <Dialog title="LISTA D’ATTESA" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const issue = validateWaitRequest(item, state);
          if (issue) setError(issue);
          else onSave(item);
        }}
      >
        <h2>Troviamo il momento giusto.</h2>
        <p className="ls-dialog-intro">
          Registra la richiesta e le preferenze del cliente.
        </p>
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
        <label>
          Servizio
          <select
            value={item.service}
            onChange={(e) => change("service", e.target.value)}
          >
            {state.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.minutes} min
              </option>
            ))}
          </select>
        </label>
        <label>
          Professionista
          <select
            value={item.staff}
            onChange={(e) => change("staff", e.target.value)}
          >
            <option value="any">Qualsiasi professionista</option>
            {STAFF.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="ls-form-row">
          <label>
            Dal
            <input
              required
              type="date"
              value={item.from}
              onChange={(e) => change("from", e.target.value)}
            />
          </label>
          <label>
            Al
            <input
              required
              type="date"
              value={item.to}
              onChange={(e) => change("to", e.target.value)}
            />
          </label>
        </div>
        <div className="ls-form-row">
          <label>
            Dalle
            <input
              required
              type="time"
              value={clock(item.start)}
              onChange={(e) => change("start", minuteOf(e.target.value))}
            />
          </label>
          <label>
            Alle
            <input
              required
              type="time"
              value={clock(item.end)}
              onChange={(e) => change("end", minuteOf(e.target.value))}
            />
          </label>
        </div>
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
            Salva richiesta
          </button>
        </div>
      </form>
    </Dialog>
  );
}
