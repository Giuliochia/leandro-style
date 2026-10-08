import test from "node:test";
import assert from "node:assert/strict";
import {
  seed,
  validateBooking,
  availableSlots,
  isState,
  calendarEvent,
} from "./model.mjs";
test("reject overlaps; accept adjacent slots and another operator", () => {
  const state = seed("2026-10-08");
  const item = { ...state.appointments[0], id: "new", status: "prenotato" };
  assert.match(validateBooking(item, state), /occupato/);
  assert.equal(validateBooking({ ...item, start: 600, service: "blow" }, state), "");
  assert.equal(
    validateBooking(
      { ...item, staff: "giulia", start: 540, service: "blow" },
      state,
    ),
    "",
  );
});
test("duration cannot cross lunch or closing; cancellation releases time", () => {
  const state = seed();
  const base = { ...state.appointments[0], id: "new", status: "prenotato" };
  assert.match(validateBooking({ ...base, start: 750 }, state), /rientrare/);
  assert.match(validateBooking({ ...base, start: 1110 }, state), /rientrare/);
  state.appointments[0].status = "annullato";
  assert.equal(validateBooking(base, state), "");
});
test("customer availability uses exactly the same booking guard", () => {
  const state = seed("2026-10-08");
  const slots = availableSlots(state, "cut", "leandro", "2026-10-08");
  assert.ok(!slots.includes(540));
  assert.ok(slots.includes(960));
  for (const start of slots)
    assert.equal(
      validateBooking(
        {
          client: "c1",
          staff: "leandro",
          service: "cut",
          start,
          date: "2026-10-08",
        },
        state,
      ),
      "",
    );
});
test("backup rejects malformed references, duplicate IDs and overlaps", () => {
  const good = seed();
  assert.ok(isState(good));
  assert.ok(!isState({ ...good, services: [] }));
  assert.ok(
    !isState({
      ...good,
      appointments: [{ ...good.appointments[0], client: "missing" }],
    }),
  );
  assert.ok(
    !isState({
      ...good,
      appointments: [...good.appointments, { ...good.appointments[0] }],
    }),
  );
  assert.ok(
    !isState({
      ...good,
      appointments: [
        ...good.appointments,
        { ...good.appointments[0], id: "conflict" },
      ],
    }),
  );
});
test("calendar includes duration and escapes names", () => {
  const state = seed("2026-10-08");
  state.clients[0].name = "Sofia, Bianchi";
  const event = calendarEvent(state.appointments[0], state);
  assert.ok(event.includes("DTSTART:20261008T090000"));
  assert.ok(event.includes("DTEND:20261008T100000"));
  assert.ok(event.includes("Sofia\\, Bianchi"));
});
