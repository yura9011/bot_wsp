const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createConversationState } = require("./conversation-state");

function withTempState(fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "conversation-state-"));
  try {
    fn({ tmpDir, state: createConversationState(tmpDir) });
  } finally {
    if (tmpDir.startsWith(os.tmpdir())) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

test("loadHistory returns empty object when no file exists", () => {
  withTempState(({ state }) => {
    const history = state.loadHistory();
    assert.deepEqual(history, {});
  });
});

test("addMessage creates a conversation entry", () => {
  withTempState(({ tmpDir, state }) => {
    state.addMessage("user1@c.us", "user", "Hello");
    state.addMessage("user1@c.us", "assistant", "Hi there");

    const history = state.loadHistory();
    assert.ok(history["user1@c.us"]);
    assert.equal(history["user1@c.us"].length, 2);
    assert.equal(history["user1@c.us"][0].role, "user");
    assert.equal(history["user1@c.us"][0].text, "Hello");
    assert.equal(history["user1@c.us"][1].role, "assistant");
    assert.equal(history["user1@c.us"][1].text, "Hi there");
  });
});

test("pauseUser with handoff_solicitado produces waiting_human state", () => {
  withTempState(({ state }) => {
    state.addMessage("user1@c.us", "user", "Hello");
    state.pauseUser("user1@c.us", "handoff_solicitado");

    const chats = state.listChats();
    const chat = chats.find(c => c.userId === "user1@c.us");
    assert.equal(chat.estado, "waiting_human");
  });
});

test("pauseUser exposes handoff metadata in chat list", () => {
  withTempState(({ state }) => {
    state.addMessage("user1@c.us", "user", "Hello");
    state.pauseUser("user1@c.us", "handoff_solicitado", {
      handoffReason: "precio",
      handoffReasonLabel: "Precio",
      handoffRequestedAt: 1234
    });

    const chat = state.listChats().find(c => c.userId === "user1@c.us");
    assert.equal(chat.handoffReason, "precio");
    assert.equal(chat.handoffReasonLabel, "Precio");
    assert.equal(chat.handoffRequestedAt, 1234);
  });
});

test("pauseUser preserves handoff metadata when human takes conversation", () => {
  withTempState(({ state }) => {
    state.addMessage("user1.us", "user", "Hello");
    state.pauseUser("user1.us", "handoff_solicitado", {
      handoffReason: "reclamo",
      handoffReasonLabel: "Reclamo"
    });
    state.pauseUser("user1.us", "atendido_desde_dashboard");

    const chat = state.listChats().find(c => c.userId === "user1.us");
    assert.equal(chat.estado, "active_human");
    assert.equal(chat.handoffReason, "reclamo");
    assert.equal(chat.handoffReasonLabel, "Reclamo");
  });
});

test("pauseUser with atendido_desde_dashboard produces active_human state", () => {
  withTempState(({ state }) => {
    state.addMessage("user1@c.us", "user", "Hello");
    state.pauseUser("user1@c.us", "atendido_desde_dashboard");

    const chats = state.listChats();
    const chat = chats.find(c => c.userId === "user1@c.us");
    assert.equal(chat.estado, "active_human");
  });
});

test("listChats returns chats sorted by latest timestamp", () => {
  withTempState(({ tmpDir, state }) => {
    state.addMessage("older@c.us", "user", "First");
    const history = state.loadHistory();
    history["older@c.us"][0].timestamp = 1000;
    fs.writeFileSync(path.join(tmpDir, "historial.json"), JSON.stringify(history));

    state.addMessage("newer@c.us", "user", "Second");

    const chats = state.listChats();
    assert.equal(chats.length, 2);
    assert.equal(chats[0].userId, "newer@c.us");
    assert.equal(chats[1].userId, "older@c.us");
  });
});
