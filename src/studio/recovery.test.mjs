import test from "node:test";
import assert from "node:assert/strict";
import { seed, isState } from "./model.mjs";
import { recoveryPlans, applyRecovery } from "./recovery.mjs";
function fixture() {
  const s = seed("2026-10-12");
  const lost = s.appointments.find((a) => a.id === "a9");
  lost.status = "annullato";
  s.waitlist = [
    {
      id: "color",
      client: "c3",
      service: "color",
      staff: "leandro",
      from: lost.date,
      to: lost.date,
      start: 870,
      end: 960,
    },
    {
      id: "cut",
      client: "c7",
      service: "cut",
      staff: "leandro",
      from: lost.date,
      to: lost.date,
      start: 870,
      end: 960,
    },
    {
      id: "blow",
      client: "c8",
      service: "blow",
      staff: "leandro",
      from: lost.date,
      to: lost.date,
      start: 870,
      end: 960,
    },
  ];
  return { s, lost };
}
test("compares a full color with two shorter services within the cancelled window", () => {
  const { s, lost } = fixture();
  const plans = recoveryPlans(s, lost);
  assert.equal(plans[0].value, 85);
  assert.equal(plans[0].minutes, 90);
  const duo = plans.find((p) => p.items.length === 2);
  assert.equal(duo.minutes, 90);
  assert.equal(duo.value, 70);
  assert.deepEqual(
    duo.items.map((a) => a.start),
    [870, 930],
  );
});
test("respects date, requested staff, whole availability and existing client commitments", () => {
  const { s, lost } = fixture();
  s.waitlist[0].staff = "giulia";
  s.waitlist[1].to = "2026-10-11";
  s.waitlist[2].end = 885;
  assert.deepEqual(recoveryPlans(s, lost), []);
  const f = fixture();
  f.s.appointments.push({
    id: "occupied-client",
    client: "c3",
    staff: "marco",
    service: "color",
    date: f.lost.date,
    start: 870,
    status: "prenotato",
  });
  assert.ok(
    recoveryPlans(f.s, f.lost).every((p) =>
      p.items.every((a) => a.client !== "c3"),
    ),
  );
});
test("commits only confirmed clients, removes their requests and preserves the cancelled record", () => {
  const { s, lost } = fixture();
  const duo = recoveryPlans(s, lost).find((p) => p.items.length === 2);
  const result = applyRecovery(s, lost.id, [duo.items[1]], () => "new");
  assert.ok(isState(result.state));
  assert.equal(result.state.waitlist.length, 2);
  assert.ok(result.state.waitlist.some((w) => w.id === "cut"));
  assert.equal(result.state.appointments.at(-1).start, 930);
  assert.equal(
    result.state.appointments.find((a) => a.id === lost.id).status,
    "annullato",
  );
  assert.equal(s.appointments.length, 10);
});
test("stale conflicts reject the whole plan atomically; replay and changed request are rejected", () => {
  const { s, lost } = fixture();
  const duo = recoveryPlans(s, lost).find((p) => p.items.length === 2);
  s.appointments.push({
    id: "raced",
    client: "c2",
    staff: "leandro",
    service: "men",
    date: lost.date,
    start: 930,
    status: "prenotato",
  });
  assert.ok(applyRecovery(s, lost.id, duo.items, () => "new").error);
  assert.equal(s.waitlist.length, 3);
  assert.equal(s.appointments.length, 11);
  const f = fixture();
  const item = recoveryPlans(f.s, f.lost)[0].items[0];
  const booked = applyRecovery(f.s, f.lost.id, [item], () => "new").state;
  assert.ok(applyRecovery(booked, f.lost.id, [item], () => "replay").error);
  f.s.waitlist[0].end = 900;
  assert.ok(applyRecovery(f.s, f.lost.id, [item], () => "changed").error);
});
