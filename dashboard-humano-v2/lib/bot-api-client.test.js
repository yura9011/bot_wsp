const assert = require("node:assert/strict");
const test = require("node:test");
const { createBotApiClient } = require("./bot-api-client");

function createFetchRecorder(response = { ok: true, text: async () => "" }) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return response;
  };

  return { calls, fetchImpl };
}

test("builds bot API URL from agent config", async () => {
  const { calls, fetchImpl } = createFetchRecorder();
  const client = createBotApiClient({
    agentId: "demo-local",
    agentConfig: { ports: { api: 5010 } },
    fetchImpl
  });

  assert.equal(client.getBotApiPort(), 5010);
  await client.callBotApi("/status");
  assert.equal(calls[0].url, "http://127.0.0.1:5010/status");
});

test("sendHumanMessage uses /message/sendMessage/:agentId", async () => {
  const { calls, fetchImpl } = createFetchRecorder();
  const client = createBotApiClient({
    agentId: "demo-local",
    agentConfig: { ports: { api: 5010 } },
    fetchImpl
  });

  await client.sendHumanMessage("user@c.us", "Hola");

  assert.equal(calls[0].url, "http://127.0.0.1:5010/message/sendMessage/demo-local");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    chatId: "user@c.us",
    message: "Hola"
  });
});

test("takeConversation uses /pause/:userId", async () => {
  const { calls, fetchImpl } = createFetchRecorder();
  const client = createBotApiClient({
    agentId: "demo-local",
    agentConfig: { ports: { api: 5010 } },
    fetchImpl
  });

  await client.takeConversation("user@c.us");

  assert.equal(calls[0].url, "http://127.0.0.1:5010/pause/user%40c.us");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    reason: "atendido_desde_dashboard"
  });
});

test("resumeConversation uses /resume/:userId", async () => {
  const { calls, fetchImpl } = createFetchRecorder();
  const client = createBotApiClient({
    agentId: "demo-local",
    agentConfig: { ports: { api: 5010 } },
    fetchImpl
  });

  await client.resumeConversation("user@c.us");

  assert.equal(calls[0].url, "http://127.0.0.1:5010/resume/user%40c.us");
  assert.equal(calls[0].options.method, "POST");
});

test("finishConversation sends MUCHAS GRACIAS and then resumes", async () => {
  const { calls, fetchImpl } = createFetchRecorder();
  const client = createBotApiClient({
    agentId: "demo-local",
    agentConfig: { ports: { api: 5010 } },
    fetchImpl
  });

  await client.finishConversation("user@c.us");

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "http://127.0.0.1:5010/message/sendMessage/demo-local");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    chatId: "user@c.us",
    message: "MUCHAS GRACIAS"
  });
  assert.equal(calls[1].url, "http://127.0.0.1:5010/resume/user%40c.us");
});

test("callBotApi normalizes bot error response", async () => {
  const { fetchImpl } = createFetchRecorder({
    ok: false,
    text: async () => "fallo"
  });
  const client = createBotApiClient({
    agentId: "demo-local",
    agentConfig: { ports: { api: 5010 } },
    fetchImpl
  });

  await assert.rejects(
    () => client.callBotApi("/status"),
    /Bot API error: fallo/
  );
});
