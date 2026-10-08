import { duration, validateBooking } from "./model.mjs";

// Search only explicitly requested availability. Never infer willingness from revenue.
export function recoveryPlans(state, lost) {
  if (!lost || lost.status !== "annullato") return [];
  const end = lost.start + duration(lost, state.services);
  const base = state.appointments.filter((a) => a.id !== lost.id);
  const results = [];
  function search(items, cursor) {
    if (items.length)
      results.push({
        items,
        minutes: items.reduce((n, a) => n + duration(a, state.services), 0),
        value: items.reduce(
          (n, a) =>
            n + (state.services.find((s) => s.id === a.service)?.price || 0),
          0,
        ),
      });
    if (items.length >= 3) return;
    for (const request of state.waitlist || []) {
      if (
        items.some(
          (a) => a.request === request.id || a.client === request.client,
        ) ||
        lost.date < request.from ||
        lost.date > request.to ||
        (request.staff !== "any" && request.staff !== lost.staff)
      )
        continue;
      const minutes = state.services.find(
        (s) => s.id === request.service,
      )?.minutes;
      if (!minutes) continue;
      for (
        let start = Math.max(cursor, request.start);
        start + minutes <= Math.min(end, request.end);
        start += 15
      ) {
        const item = {
          id: "",
          request: request.id,
          client: request.client,
          service: request.service,
          staff: lost.staff,
          date: lost.date,
          start,
          status: "prenotato",
          confirmation: "confirmed",
          note: "Recupero cancellazione · conferma registrata dal salone",
        };
        const active = [...base, ...items];
        if (validateBooking(item, { ...state, appointments: active })) continue;
        if (
          active.some(
            (a) =>
              a.status !== "annullato" &&
              a.date === item.date &&
              a.client === item.client &&
              start < a.start + duration(a, state.services) &&
              start + minutes > a.start,
          )
        )
          continue;
        search([...items, item], start + minutes);
        break; // Earliest compatible placement dominates later starts for the same sequence.
      }
    }
  }
  search([], lost.start);
  const unique = new Map();
  for (const plan of results) {
    const key = plan.items
      .map((a) => a.request)
      .sort()
      .join("|");
    const prior = unique.get(key);
    if (!prior || plan.items[0].start < prior.items[0].start)
      unique.set(key, plan);
  }
  return [...unique.values()]
    .sort(
      (a, b) =>
        b.minutes - a.minutes ||
        b.value - a.value ||
        a.items.length - b.items.length,
    )
    .slice(0, 4);
}
export function applyRecovery(state, lostId, items, idFactory) {
  const lost = state.appointments.find((a) => a.id === lostId);
  if (!lost || lost.status !== "annullato" || !items.length)
    return { error: "La cancellazione non è più disponibile." };
  let next = state;
  for (const item of items) {
    const request = next.waitlist.find((w) => w.id === item.request);
    const end = item.start + duration(item, next.services);
    const valid =
      request &&
      item.client === request.client &&
      item.service === request.service &&
      item.date === lost.date &&
      item.date >= request.from &&
      item.date <= request.to &&
      item.staff === lost.staff &&
      (request.staff === "any" || request.staff === item.staff) &&
      item.start >= Math.max(lost.start, request.start) &&
      end <=
        Math.min(lost.start + duration(lost, next.services), request.end) &&
      item.status === "prenotato" &&
      !validateBooking(item, next) &&
      !next.appointments.some(
        (a) =>
          a.status !== "annullato" &&
          a.date === item.date &&
          a.client === item.client &&
          item.start < a.start + duration(a, next.services) &&
          end > a.start,
      );
    if (!valid)
      return {
        error:
          "Una disponibilità è cambiata. Ricalcola le proposte prima di confermare.",
      };
    const { request: requestId, ...booking } = item;
    next = {
      ...next,
      appointments: [...next.appointments, { ...booking, id: idFactory() }],
      waitlist: next.waitlist.filter((w) => w.id !== requestId),
    };
  }
  return { state: next };
}
