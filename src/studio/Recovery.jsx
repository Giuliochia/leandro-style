import { useState } from "react";
import { STAFF, clock, duration } from "./model.mjs";
import { recoveryPlans } from "./recovery.mjs";
const euro = (n) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
export default function Recovery({ state, onScenario, onApply, onAgenda }) {
  const [chosen, setChosen] = useState(null),
    [confirmed, setConfirmed] = useState([]),
    [done, setDone] = useState(null),
    [error, setError] = useState(""),
    [selected, setSelected] = useState("");
  const losses = state.appointments.filter((a) => a.status === "annullato");
  const lost = losses.find((a) => a.id === selected) || losses.at(-1);
  const plans = recoveryPlans(state, lost);
  const service = (id) => state.services.find((s) => s.id === id);
  const client = (id) => state.clients.find((c) => c.id === id)?.name;
  const staff = (id) => STAFF.find((s) => s.id === id)?.name;
  const startScenario = () => {
    setDone(null);
    setChosen(null);
    setConfirmed([]);
    setError("");
    const id = onScenario();
    if (id) setSelected(id);
  };
  function commit() {
    const items = chosen.items.filter((a) => confirmed.includes(a.request));
    const result = onApply(lost.id, items);
    if (result) {
      setError(result);
      return;
    }
    setDone({
      items,
      value: items.reduce((n, a) => n + service(a.service).price, 0),
      minutes: items.reduce((n, a) => n + duration(a, state.services), 0),
    });
    setChosen(null);
  }
  return (
    <div className={`lr-root ${lost ? "lr-active" : ""}`}>
      <div className="lr-intro">
        <span className="lr-kicker">
          LEANDRO STYLE / RECUPERO CANCELLAZIONI
        </span>
        <h2>
          Un posto vuoto.
          <br />
          <em>Un piano per riempirlo.</em>
        </h2>
        <p>
          Parti da una cancellazione. Confronta chi può venire, prepara l’invito
          e registra soltanto le conferme ricevute.
        </p>
        <span className="lr-demo">
          Prototipo · disponibilità di esempio · nessun messaggio inviato
        </span>
      </div>
      {done &&
      done.items.every((item) =>
        state.appointments.some(
          (a) =>
            a.status !== "annullato" &&
            a.client === item.client &&
            a.staff === item.staff &&
            a.date === item.date &&
            a.start === item.start &&
            a.service === item.service,
        ),
      ) ? (
        <section className="lr-result" aria-live="polite">
          <span className="lr-kicker">CONFERME REGISTRATE NELLA DEMO</span>
          <h3>{done.minutes} minuti tornano in agenda.</h3>
          <p>
            {euro(done.value)} di servizi prenotati al prezzo di listino. Non è
            un incasso né un margine garantito.
          </p>
          {done.items.map((a) => (
            <div className="lr-result-line" key={a.request}>
              <b>
                {clock(a.start)} — {client(a.client)}
              </b>
              <span>
                {service(a.service).name} · {staff(a.staff)}
              </span>
            </div>
          ))}
          <button className="ls-primary" onClick={onAgenda}>
            Vedi l’agenda aggiornata →
          </button>
          <button
            className="ls-secondary"
            onClick={() => {
              setDone(null);
              setChosen(null);
            }}
          >
            Valuta lo spazio rimasto
          </button>
        </section>
      ) : !lost ? (
        <section className="lr-start">
          <div className="lr-day">
            <span>UN CASO DA PROVARE</span>
            <h3>
              Colore annullato.
              <br />
              90 minuti liberi.
            </h3>
            <p>
              Confronta un servizio lungo con due appuntamenti più brevi. I
              tempi, le preferenze e gli impegni dei clienti vengono controllati
              prima di proporteli.
            </p>
          </div>
          <button className="ls-primary" onClick={startScenario}>
            Prova una cancellazione →
          </button>
          <p className="lr-small">
            Aggiunge tre richieste di esempio e annulla un appuntamento futuro
            della demo. Puoi annullare la modifica.
          </p>
        </section>
      ) : (
        <>
          <section className="lr-loss">
            <div>
              <label htmlFor="recovery-loss">Posto da recuperare</label>
              <select
                id="recovery-loss"
                value={lost.id}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setChosen(null);
                  setConfirmed([]);
                  setError("");
                }}
              >
                {losses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.date} · {clock(a.start)} · {client(a.client)}
                  </option>
                ))}
              </select>
            </div>
            <div className="lr-loss-detail">
              <strong>
                {clock(lost.start)} —{" "}
                {clock(lost.start + duration(lost, state.services))}
              </strong>
              <span>
                {duration(lost, state.services)} min · {staff(lost.staff)}
              </span>
            </div>
            <div className="lr-loss-price">
              <strong>{euro(service(lost.service).price)}</strong>
              <span>valore del servizio annullato</span>
            </div>
          </section>
          {!chosen ? (
            <section>
              <div className="lr-section-title">
                <h3>
                  {plans.length
                    ? "Le possibilità concrete"
                    : "Nessun cliente compatibile"}
                </h3>
                <span>Ordine: minuti coperti, poi valore di listino</span>
              </div>
              <div className="lr-plans">
                {plans.slice(0, 2).map((p, i) => (
                  <button
                    className="lr-plan"
                    key={p.items.map((a) => a.request).join("|")}
                    onClick={() => {
                      setChosen(p);
                      setConfirmed([]);
                      setError("");
                    }}
                  >
                    <div className="lr-plan-head">
                      <span>
                        {i === 0 ? "COPERTURA MAGGIORE" : `ALTERNATIVA ${i}`}
                      </span>
                      <b>{euro(p.value)}</b>
                    </div>
                    <h4>
                      {p.items.length === 1
                        ? "Un appuntamento"
                        : `${p.items.length} appuntamenti`}{" "}
                      · {p.minutes} min
                    </h4>
                    <div className="lr-mini-track">
                      {p.items.map((a) => (
                        <span
                          key={a.request}
                          style={{
                            left: `${((a.start - lost.start) / duration(lost, state.services)) * 100}%`,
                            width: `${(duration(a, state.services) / duration(lost, state.services)) * 100}%`,
                          }}
                        >
                          {clock(a.start)}
                        </span>
                      ))}
                    </div>
                    <div className="lr-plan-people">
                      {p.items.map((a) => (
                        <div key={a.request}>
                          <b>{client(a.client)}</b>
                          <span>
                            {clock(a.start)} · {service(a.service).name}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p>
                      {duration(lost, state.services) - p.minutes} min ancora
                      liberi · disponibilità richiesta e professionista
                      compatibili
                    </p>
                    <span className="lr-plan-action">
                      Esamina e prepara gli inviti →
                    </span>
                  </button>
                ))}
              </div>
              {!plans.length && (
                <p className="lr-small">
                  Serve una richiesta in lista d’attesa che rientri nella data,
                  nel professionista e nell’intero orario del servizio. Non
                  inventiamo disponibilità.
                </p>
              )}
            </section>
          ) : (
            <section className="lr-review">
              <button
                className="lr-back"
                onClick={() => {
                  setChosen(null);
                  setConfirmed([]);
                }}
              >
                ← Confronta le altre possibilità
              </button>
              <h3>Prima l’invito. Poi la conferma.</h3>
              <p>
                Questi testi sono pronti da copiare. La demo non contatta i
                clienti e non blocca il posto: verifica la disponibilità prima
                di inviare.
              </p>
              {chosen.items.map((a) => (
                <article className="lr-invite" key={a.request}>
                  <div>
                    <h4>{client(a.client)}</h4>
                    <span>
                      {clock(a.start)}–
                      {clock(a.start + duration(a, state.services))} ·{" "}
                      {service(a.service).name} ·{" "}
                      {euro(service(a.service).price)}
                    </span>
                  </div>
                  <p>
                    Ha richiesto questo servizio in lista d’attesa. L’orario
                    rientra nella sua disponibilità e non si sovrappone ad altri
                    appuntamenti.
                  </p>
                  <label>
                    Testo dell’invito
                    <textarea
                      readOnly
                      value={`Ciao ${client(a.client)}, si è liberato un posto da Leandro Style il ${new Date(a.date + "T12:00:00").toLocaleDateString("it-IT")} alle ${clock(a.start)} con ${staff(a.staff)} per ${service(a.service).name} (${euro(service(a.service).price)}). Ti interessa? Ti confermiamo il posto dopo la tua risposta.`}
                    />
                  </label>
                  <label className="lr-confirm">
                    <input
                      type="checkbox"
                      checked={confirmed.includes(a.request)}
                      onChange={(e) =>
                        setConfirmed((prev) =>
                          e.target.checked
                            ? [...prev, a.request]
                            : prev.filter((id) => id !== a.request),
                        )
                      }
                    />{" "}
                    Ho ricevuto la conferma di {client(a.client)}
                  </label>
                </article>
              ))}
              {error && (
                <p role="alert" className="ls-error">
                  {error}
                </p>
              )}
              <button
                className="ls-primary"
                disabled={!confirmed.length}
                onClick={commit}
              >
                Inserisci {confirmed.length || "le"}{" "}
                {confirmed.length === 1 ? "conferma" : "conferme"} in agenda →
              </button>
              <p className="lr-small">
                Solo i clienti selezionati vengono prenotati e rimossi dalla
                lista d’attesa. Il controllo dei conflitti viene ripetuto al
                salvataggio.
              </p>
            </section>
          )}
        </>
      )}
      <footer className="lr-foot">
        <span>
          Il recupero riguarda il lavoro del professionista per l’intera durata
          del servizio. Tempi di posa e postazioni non sono ancora modellati.
        </span>
        <button onClick={startScenario}>Carica il caso di esempio</button>
      </footer>
    </div>
  );
}
