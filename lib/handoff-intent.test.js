const assert = require("node:assert/strict");
const test = require("node:test");
const { detectHandoffIntent, isHumanHandoffEnabled } = require("./handoff-intent");

test("detects human handoff request", () => {
  assert.deepEqual(detectHandoffIntent("quiero hablar con una persona"), {
    reason: "quiere_humano",
    label: "Quiere hablar con una persona"
  });
});

test("detects pricing handoff request", () => {
  assert.deepEqual(detectHandoffIntent("Necesito precio y presupuesto"), {
    reason: "precio",
    label: "Precio"
  });
});

test("detects complaint handoff request", () => {
  assert.deepEqual(detectHandoffIntent("Tengo un reclamo porque no llegó"), {
    reason: "reclamo",
    label: "Reclamo"
  });
});

test("detects misunderstanding handoff request", () => {
  assert.deepEqual(detectHandoffIntent("No me entendiste, no es lo que pregunté"), {
    reason: "no_entendio",
    label: "No entendió"
  });
});

test("returns null when there is no handoff intent", () => {
  assert.equal(detectHandoffIntent("Que puede automatizar la plataforma?"), null);
});

test("human handoff feature supports snake_case and camelCase", () => {
  assert.equal(isHumanHandoffEnabled({ features: { human_handoff: true } }), true);
  assert.equal(isHumanHandoffEnabled({ features: { humanHandoff: true } }), true);
  assert.equal(isHumanHandoffEnabled({ features: {} }), false);
});
