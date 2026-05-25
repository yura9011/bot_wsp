const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createMessageIntake } = require("./message-intake");

function createMessage(overrides = {}) {
  const replies = [];
  return {
    from: "user@c.us",
    type: "chat",
    body: "Hola",
    isStatus: false,
    author: undefined,
    replies,
    reply: async text => {
      replies.push(text);
    },
    getContact: async () => ({ number: "5493510000000" }),
    ...overrides
  };
}

test("ignores group and status messages", async () => {
  const intake = createMessageIntake({ agentId: "demo-local" });

  assert.equal((await intake.process(createMessage({ from: "123@g.us" }))).shouldProcess, false);
  assert.equal((await intake.process(createMessage({ from: "status@broadcast" }))).shouldProcess, false);
  assert.equal((await intake.process(createMessage({ isStatus: true }))).shouldProcess, false);
});

test("ignores invalid WhatsApp message types", async () => {
  const intake = createMessageIntake({ agentId: "demo-local" });

  assert.equal((await intake.process(createMessage({ type: "revoked" }))).shouldProcess, false);
  assert.equal((await intake.process(createMessage({ type: "e2e_notification" }))).shouldProcess, false);
  assert.equal((await intake.process(createMessage({ type: "notification_template" }))).shouldProcess, false);
});

test("replies correctly to unsupported media types", async () => {
  const intake = createMessageIntake({
    agentId: "demo-local",
    configInfo: { direccion: "Demo address" }
  });

  const cases = [
    ["image", "📷 Por ahora no proceso imágenes. Por favor, escribí tu consulta por mensaje de texto."],
    ["video", "📹 Por ahora no proceso videos. Por favor, escribime tu consulta por mensaje de texto."],
    ["document", "📄 Por ahora no proceso archivos. Por favor, escribime tu consulta por mensaje de texto."],
    ["location", "📍 Por ahora no proceso ubicaciones. Nuestra dirección es: Demo address. Escribime si necesitás más información."],
    ["sticker", "No puedo interpretar stickers. Escribime tu consulta en texto para poder ayudarte."]
  ];

  for (const [type, expectedReply] of cases) {
    const message = createMessage({ type });
    const result = await intake.process(message);

    assert.equal(result.shouldProcess, false);
    assert.deepEqual(message.replies, [expectedReply]);
  }
});

test("debounce blocks rapid messages", async () => {
  let currentTime = 1000;
  const logs = [];
  const intake = createMessageIntake({
    agentId: "demo-local",
    lastMessageTime: {},
    now: () => currentTime,
    logger: message => logs.push(message)
  });

  const first = await intake.process(createMessage({ from: "user@c.us", body: "Uno" }));
  const second = await intake.process(createMessage({ from: "user@c.us", body: "Dos" }));

  assert.equal(first.shouldProcess, true);
  assert.equal(second.shouldProcess, false);
  assert.equal(logs[0], "[demo-local] ⏭️ Mensaje ignorado (debounce): user@c.us");
});

test("text rejection hook runs before phone-map and debounce", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "message-intake-hook-"));
  try {
    const phoneMapPath = path.join(tmpDir, "phone-map.json");
    const lastMessageTime = {};
    const intake = createMessageIntake({
      agentId: "demo-local",
      phoneMapPath,
      lastMessageTime,
      now: () => 1000
    });

    const result = await intake.process(createMessage({
      from: "lid-1@lid",
      body: "🙂",
      getContact: async () => ({ number: "5493510000000" })
    }), {
      shouldRejectText: async () => true
    });

    assert.equal(result.shouldProcess, false);
    assert.equal(fs.existsSync(phoneMapPath), false);
    assert.deepEqual(lastMessageTime, {});
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("maps @lid contact number into phone-map", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "message-intake-"));
  try {
    const phoneMapPath = path.join(tmpDir, "phone-map.json");
    const logs = [];
    const intake = createMessageIntake({
      agentId: "demo-local",
      phoneMapPath,
      logger: message => logs.push(message)
    });

    const result = await intake.process(createMessage({
      from: "lid-1@lid",
      body: "Hola",
      getContact: async () => ({ number: "5493510000000" })
    }));

    assert.equal(result.shouldProcess, true);
    assert.deepEqual(JSON.parse(fs.readFileSync(phoneMapPath, "utf8")), {
      "lid-1": "5493510000000"
    });
    assert.equal(logs[0], "[demo-local] 📱 Mapeado: lid-1 → 5493510000000");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
