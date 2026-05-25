const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  AdminNumberRegistryError,
  createAdminNumberRegistry
} = require("./admin-number-registry");

function withTempRegistry(options, fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "admin-number-registry-"));
  const registry = createAdminNumberRegistry({
    agentConfig: options.agentConfig || { paths: { data: tmpDir }, adminNumbers: [] },
    dataPath: tmpDir,
    phoneMapPath: path.join(tmpDir, "phone-map.json"),
    env: options.env || {},
    now: options.now || (() => "2026-05-25T00:00:00.000Z")
  });

  try {
    fn({ tmpDir, registry });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

test("list returns empty admins when no source exists", () => {
  withTempRegistry({}, ({ registry }) => {
    assert.deepEqual(registry.list(), []);
  });
});

test("list falls back to ADMIN_NUMBERS", () => {
  withTempRegistry({ env: { ADMIN_NUMBERS: "111, 222" } }, ({ registry }) => {
    assert.deepEqual(registry.list(), [
      {
        id: "111",
        nombre: "Migrado desde .env",
        rol: "admin",
        agregadoPor: "runtime-config",
        fechaAgregado: "2026-05-25T00:00:00.000Z"
      },
      {
        id: "222",
        nombre: "Migrado desde .env",
        rol: "admin",
        agregadoPor: "runtime-config",
        fechaAgregado: "2026-05-25T00:00:00.000Z"
      }
    ]);
  });
});

test("list falls back to agent config when env is empty", () => {
  withTempRegistry({
    agentConfig: { paths: {}, adminNumbers: ["333"] },
    env: {}
  }, ({ registry }) => {
    assert.deepEqual(registry.list(), [
      {
        id: "333",
        nombre: "Default agents.json",
        rol: "admin",
        agregadoPor: "runtime-config",
        fechaAgregado: "2026-05-25T00:00:00.000Z"
      }
    ]);
  });
});

test("addEntry rejects duplicates", () => {
  withTempRegistry({}, ({ registry }) => {
    registry.addEntry({ id: "111", nombre: "Uno", rol: "admin", agregadoPor: "test" });

    assert.throws(
      () => registry.addEntry({ id: "111", nombre: "Uno", rol: "admin", agregadoPor: "test" }),
      error => error instanceof AdminNumberRegistryError
        && error.statusCode === 409
        && error.message === "El número ya existe"
    );
  });
});

test("addEntry rejects invalid role", () => {
  withTempRegistry({}, ({ registry }) => {
    assert.throws(
      () => registry.addEntry({ id: "111", nombre: "Uno", rol: "owner", agregadoPor: "test" }),
      error => error instanceof AdminNumberRegistryError
        && error.statusCode === 400
        && error.message === "Rol inválido. Use admin o ignorado."
    );
  });
});

test("updateEntry and deleteEntry persist changes", () => {
  withTempRegistry({}, ({ registry }) => {
    registry.addEntry({ id: "111", nombre: "Uno", rol: "ignorado", agregadoPor: "test" });
    registry.updateEntry("111", { nombre: "Admin Uno", rol: "admin" });

    assert.deepEqual(registry.list(), [
      {
        id: "111",
        nombre: "Admin Uno",
        rol: "admin",
        agregadoPor: "test",
        fechaAgregado: "2026-05-25T00:00:00.000Z"
      }
    ]);

    registry.deleteEntry("111");
    assert.deepEqual(registry.list(), []);
  });
});

test("resolveIds uses phone map in both directions", () => {
  withTempRegistry({}, ({ tmpDir, registry }) => {
    fs.writeFileSync(
      path.join(tmpDir, "phone-map.json"),
      JSON.stringify({ "abc123": "5493510000000" })
    );

    assert.deepEqual(registry.resolveIds("abc123@lid"), ["abc123", "5493510000000"]);
    assert.deepEqual(registry.resolveIds("5493510000000@c.us"), ["5493510000000", "abc123"]);
  });
});

test("getRole resolves admins through phone map", () => {
  withTempRegistry({}, ({ tmpDir, registry }) => {
    fs.writeFileSync(
      path.join(tmpDir, "admin-numbers.json"),
      JSON.stringify({ admins: [{ id: "5493510000000", rol: "admin", nombre: "Admin" }] })
    );
    fs.writeFileSync(
      path.join(tmpDir, "phone-map.json"),
      JSON.stringify({ "lid-1": "5493510000000" })
    );

    assert.equal(registry.isAdmin("lid-1@lid"), true);
    assert.equal(registry.getRole("lid-1@lid"), "admin");
  });
});
