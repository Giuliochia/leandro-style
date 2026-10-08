import { useState } from "react";
import Dialog from "./Dialog.jsx";
import { STAFF, dayKey } from "./model.mjs";
const labels = {
  prenotato: "Prenotato",
  completato: "Completato",
  annullato: "Annullato",
};
async function photoData(file) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 8000000
  )
    throw Error("Scegli una foto JPG, PNG o WebP fino a 8 MB.");
  const source = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = source;
    });
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.72);
    if (data.length > 650000)
      throw Error(
        "Questa foto resta troppo grande. Scegli un’immagine più piccola.",
      );
    return data;
  } finally {
    URL.revokeObjectURL(source);
  }
}
export default function ClientProfile({
  item,
  state,
  onClose,
  onSave,
  onNext,
}) {
  const [draft, setDraft] = useState({
      ...item,
      formula: item.formula || "",
      phone: item.phone || "",
      photos: item.photos || [],
    }),
    [tab, setTab] = useState("profile"),
    [error, setError] = useState(""),
    [consent, setConsent] = useState(false),
    [processing, setProcessing] = useState(false);
  const change = (key, value) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const history = state.appointments
    .filter((a) => a.client === item.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.start - a.start);
  async function addPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!consent) {
      setError("Conferma di avere l’autorizzazione prima di caricare la foto.");
      return;
    }
    if (draft.photos.length >= 3) {
      setError("Puoi conservare fino a tre foto per cliente nella demo.");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      const src = await photoData(file);
      setDraft((prev) => ({
        ...prev,
        photos: [
          ...prev.photos,
          {
            id: crypto.randomUUID(),
            src,
            date: dayKey(),
          },
        ],
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  }
  return (
    <Dialog title="SCHEDA CLIENTE" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.name.trim()) {
            setError("Inserisci il nome del cliente.");
            return;
          }
          onSave({ ...draft, name: draft.name.trim() });
        }}
      >
        <div className="ls-client-hero">
          <span className="ls-avatar">
            {draft.name
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("") || "+"}
          </span>
          <div>
            <h2>{draft.name || "Nuovo cliente"}</h2>
            <p>
              {history.filter((a) => a.status === "completato").length} visite
              completate · {history.length} appuntamenti
            </p>
          </div>
        </div>
        <div className="ls-profile-tabs">
          {[
            ["profile", "Scheda"],
            ["history", "Storico"],
            ["photos", "Risultati"],
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "profile" && (
          <div className="ls-profile-section">
            <label>
              Nome
              <input
                required
                maxLength={100}
                value={draft.name}
                onChange={(e) => change("name", e.target.value)}
              />
            </label>
            <label>
              Telefono
              <input
                type="tel"
                maxLength={30}
                value={draft.phone}
                onChange={(e) => change("phone", e.target.value)}
                placeholder="Facoltativo"
              />
            </label>
            <label>
              Preferenze / note
              <textarea
                aria-label="Preferenze / note"
                maxLength={1000}
                value={draft.note}
                onChange={(e) => change("note", e.target.value)}
              />
            </label>
            <label>
              Formula colore / note tecniche
              <textarea
                aria-label="Formula colore / note tecniche"
                maxLength={1500}
                value={draft.formula}
                onChange={(e) => change("formula", e.target.value)}
                placeholder="Tonalità, miscela, tempi di posa…"
              />
            </label>
            <p className="ls-small">
              Dati locali della demo. Nessun contatto viene effettuato.
            </p>
          </div>
        )}
        {tab === "history" && (
          <div className="ls-profile-history">
            {history.length ? (
              history.map((a) => (
                <article key={a.id}>
                  <time>
                    {new Date(a.date + "T12:00:00").toLocaleDateString(
                      "it-IT",
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                  </time>
                  <h3>{state.services.find((s) => s.id === a.service).name}</h3>
                  <p>
                    {STAFF.find((s) => s.id === a.staff).name} ·{" "}
                    {labels[a.status]}
                  </p>
                  {a.note && <p>{a.note}</p>}
                </article>
              ))
            ) : (
              <p>Nessun appuntamento registrato.</p>
            )}
          </div>
        )}
        {tab === "photos" && (
          <div className="ls-profile-photos">
            <p>
              Foto dei risultati, per ritrovare il lavoro e il look precedente.
            </p>
            <div className="ls-photo-grid">
              {draft.photos.map((p) => (
                <figure key={p.id}>
                  <img src={p.src} alt={`Risultato per ${draft.name}`} />
                  <figcaption>
                    {p.date}
                    <button
                      type="button"
                      aria-label="Rimuovi foto"
                      onClick={() =>
                        change(
                          "photos",
                          draft.photos.filter((photo) => photo.id !== p.id),
                        )
                      }
                    >
                      ×
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
            <label className="ls-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />{" "}
              Ho l’autorizzazione del cliente a conservare questa foto.
            </label>
            <label
              className={`ls-photo-upload ${processing ? "is-processing" : ""}`}
            >
              {processing ? "Ottimizzazione della foto…" : "+ Carica una foto"}
              <input
                aria-label="Carica foto risultato"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={!consent || processing || draft.photos.length >= 3}
                onChange={addPhoto}
              />
            </label>
            <p className="ls-small">
              Massimo 3 foto, ottimizzate e salvate in questo browser. Premi
              Salva modifiche per conservarle.
            </p>
          </div>
        )}
        {error && (
          <p className="ls-error" role="alert">
            {error}
          </p>
        )}
        {item.id && (
          <button
            type="button"
            className="ls-profile-link"
            onClick={() => {
              if (!draft.name.trim()) {
                setError("Inserisci il nome del cliente.");
                setTab("profile");
                return;
              }
              onSave({ ...draft, name: draft.name.trim() });
              onNext(item.id);
            }}
          >
            Prenota un nuovo appuntamento →
          </button>
        )}
        <div className="ls-dialog-actions">
          <button type="button" className="ls-secondary" onClick={onClose}>
            Torna
          </button>
          <button type="submit" disabled={processing} className="ls-primary">
            Salva modifiche
          </button>
        </div>
      </form>
    </Dialog>
  );
}
