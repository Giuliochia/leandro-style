export const STAFF = [
  { id: "leandro", name: "Leandro", role: "Hair director", color: "#b36e4f" },
  { id: "giulia", name: "Giulia", role: "Color specialist", color: "#738779" },
  { id: "marco", name: "Marco", role: "Stylist", color: "#747ba5" },
];
export const SERVICES = [
  { id: "cut", name: "Taglio & styling", minutes: 60, price: 45 },
  { id: "color", name: "Colore & finish", minutes: 90, price: 85 },
  { id: "balayage", name: "Balayage signature", minutes: 150, price: 160 },
  { id: "blow", name: "Piega", minutes: 30, price: 25 },
  { id: "men", name: "Taglio uomo", minutes: 30, price: 28 },
  { id: "care", name: "Rituale trattamento", minutes: 45, price: 40 },
];
export const CLIENTS = [
  {
    id: "c1",
    name: "Sofia Bianchi",
    note: "Preferisce toni caldi. Consulenza colore al prossimo appuntamento.",
  },
  {
    id: "c2",
    name: "Alessandro Rossi",
    note: "Taglio a forbice, sfumatura morbida.",
  },
  {
    id: "c3",
    name: "Elena Ferri",
    note: "Piega naturale, poco volume alla radice.",
  },
  {
    id: "c4",
    name: "Giulia Conti",
    note: "Balayage miele. Ultima consulenza positiva.",
  },
  {
    id: "c5",
    name: "Martina Romano",
    note: "Preferisce appuntamenti nel pomeriggio.",
  },
  {
    id: "c6",
    name: "Luca Moretti",
    note: "Cliente abituale, ogni quattro settimane.",
  },
  {
    id: "c7",
    name: "Chiara De Luca",
    note: "Taglio lungo, mantenere la lunghezza.",
  },
  { id: "c8", name: "Alice Ricci", note: "Styling mosso." },
];
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function clock(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
export function minuteOf(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export function seed(date = dayKey()) {
  return {
    version: 1,
    services: SERVICES,
    clients: CLIENTS,
    appointments: [
      ["c1", "leandro", "cut", 540],
      ["c2", "marco", "men", 540],
      ["c3", "giulia", "color", 570],
      ["c4", "leandro", "balayage", 630],
      ["c5", "marco", "blow", 630],
      ["c6", "marco", "men", 690],
      ["c7", "giulia", "cut", 690],
      ["c8", "giulia", "care", 840],
      ["c1", "marco", "blow", 900],
      ["c5", "leandro", "color", 870],
    ].map(([client, staff, service, start], i) => ({
      id: `a${i}`,
      client,
      staff,
      service,
      start,
      date,
      status: i < 3 ? "completato" : "prenotato",
      note: "",
    })),
  };
}
export function duration(item, services) {
  return services.find((s) => s.id === item.service)?.minutes || 30;
}
export function validateBooking(item, state) {
  if (
    !state.clients.some((c) => c.id === item.client) ||
    !STAFF.some((s) => s.id === item.staff) ||
    !state.services.some((s) => s.id === item.service)
  )
    return "Seleziona cliente, servizio e professionista.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isInteger(item.start))
    return "Data o orario non valido.";
  const end = item.start + duration(item, state.services);
  if (item.start < 540 || end > 1140 || (item.start < 840 && end > 780))
    return "Il servizio deve rientrare in 09:00–13:00 o 14:00–19:00.";
  if (
    item.status !== "annullato" &&
    state.appointments.some(
      (a) =>
        a.id !== item.id &&
        a.status !== "annullato" &&
        a.date === item.date &&
        a.staff === item.staff &&
        item.start < a.start + duration(a, state.services) &&
        end > a.start,
    )
  )
    return "Questo professionista è già occupato. Scegli un altro orario.";
  return "";
}
export function availableSlots(state, service, staff, date) {
  return Array.from({ length: 40 }, (_, i) => 540 + i * 15).filter(
    (start) =>
      !validateBooking(
        { client: state.clients[0]?.id, service, staff, date, start },
        state,
      ),
  );
}
function unique(items) {
  return new Set(items.map((item) => item.id)).size === items.length;
}
export function isState(value) {
  return (
    value?.version === 1 &&
    Array.isArray(value.services) &&
    value.services.length > 0 &&
    value.services.every(
      (s) =>
        typeof s.id === "string" &&
        typeof s.name === "string" &&
        s.name.length <= 100 &&
        Number.isInteger(s.minutes) &&
        s.minutes >= 15 &&
        s.minutes <= 240 &&
        Number.isFinite(s.price) &&
        s.price >= 0,
    ) &&
    Array.isArray(value.clients) &&
    value.clients.length > 0 &&
    value.clients.every(
      (c) =>
        typeof c.id === "string" &&
        typeof c.name === "string" &&
        typeof c.note === "string",
    ) &&
    Array.isArray(value.appointments) &&
    value.appointments.every(
      (a) =>
        typeof a.id === "string" &&
        value.clients.some((c) => c.id === a.client) &&
        value.services.some((s) => s.id === a.service) &&
        STAFF.some((s) => s.id === a.staff) &&
        /^\d{4}-\d{2}-\d{2}$/.test(a.date) &&
        Number.isInteger(a.start) &&
        ["prenotato", "completato", "annullato"].includes(a.status),
    ) &&
    unique(value.clients) &&
    unique(value.services) &&
    unique(value.appointments) &&
    value.appointments.every((a) => !validateBooking(a, value))
  );
}
export function download(filename, body, type = "application/json") {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function calendarEvent(item, state) {
  const escape = (v) =>
    v
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const localTime = (m) =>
    item.date.replaceAll("-", "") + "T" + clock(m).replace(":", "") + "00";
  const service = state.services.find((s) => s.id === item.service);
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Leandro Style//Studio Demo//IT\r\nBEGIN:VEVENT\r\nUID:${item.id}@leandro-style-demo\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z\r\nDTSTART:${localTime(item.start)}\r\nDTEND:${localTime(item.start + service.minutes)}\r\nSUMMARY:${escape(service.name + " — " + state.clients.find((c) => c.id === item.client).name)}\r\nDESCRIPTION:${escape("Demo Leandro Style. Orario locale del salone.")}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
}
