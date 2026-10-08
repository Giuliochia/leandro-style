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
  assert.equal(
    validateBooking({ ...item, start: 600, service: "blow" }, state),
    "",
  );
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

import {
  freeWindows,
  waitMatches,
  validateWaitRequest,
  upgradeState,
} from "./model.mjs";
test("free windows exclude appointments and lunch, cancellation restores capacity", () => {
  const state = seed("2026-10-09");
  assert.deepEqual(freeWindows(state, "leandro", "2026-10-09"), [
    { start: 600, end: 630 },
    { start: 840, end: 870 },
    { start: 960, end: 1140 },
  ]);
  state.appointments.find((a) => a.id === "a3").status = "annullato";
  assert.deepEqual(freeWindows(state, "leandro", "2026-10-09")[0], {
    start: 600,
    end: 780,
  });
});
test("waitlist matching respects date, staff, duration and entire preferred time window", () => {
  const state = seed("2026-10-09");
  const request = {
    id: "test",
    client: "c2",
    service: "men",
    staff: "leandro",
    from: "2026-10-09",
    to: "2026-10-10",
    start: 600,
    end: 630,
  };
  assert.equal(waitMatches(state, request, "2026-10-09").length, 1);
  assert.equal(waitMatches(state, request, "2026-10-09")[0].start, 600);
  assert.deepEqual(waitMatches(state, request, "2026-10-11"), []);
  assert.deepEqual(
    waitMatches(state, { ...request, service: "balayage" }, "2026-10-09"),
    [],
  );
  assert.match(
    validateWaitRequest({ ...request, from: "2026-02-30" }, state),
    /date/,
  );
});
test("placing a waitlist candidate removes that slot from subsequent matches", () => {
  const state = seed("2026-10-09");
  const request = state.waitlist[0];
  const chosen = waitMatches(state, request, "2026-10-09")[0];
  assert.equal(validateBooking(chosen, state), "");
  state.appointments.push({ ...chosen, id: "placed" });
  assert.ok(
    !waitMatches(state, request, "2026-10-09").some(
      (m) => m.start === chosen.start && m.staff === chosen.staff,
    ),
  );
});
test("old v1 backups migrate without losing data; extended backup rejects bad photo data or wait references", () => {
  const old = seed();
  delete old.waitlist;
  assert.ok(isState(old));
  assert.deepEqual(upgradeState(old).waitlist, []);
  assert.equal(upgradeState(old).clients[0].name, old.clients[0].name);
  const state = upgradeState(seed());
  state.clients[0].photos = [{ id: "bad", src: "javascript:alert(1)" }];
  assert.ok(!isState(state));
  const bad = seed();
  bad.waitlist[0].client = "missing";
  assert.ok(!isState(bad));
  assert.match(
    validateBooking({ ...bad.appointments[0], date: "2026-02-30" }, bad),
    /valido/,
  );
});
