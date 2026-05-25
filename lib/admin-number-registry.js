const fs = require("fs");
const path = require("path");
const { resolveRuntimePath } = require("./runtime-paths");

const ALLOWED_ROLES = new Set(["admin", "ignorado"]);

class AdminNumberRegistryError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "AdminNumberRegistryError";
    this.statusCode = statusCode;
  }
}

function createAdminNumberRegistry(options = {}) {
  const agentConfig = options.agentConfig || {};
  const env = options.env || process.env;
  const now = options.now || (() => new Date().toISOString());
  const explicitAdminNumbersPath = options.adminNumbersPath
    ? resolveRuntimePath(options.adminNumbersPath)
    : null;
  const dataPath = options.dataPath
    ? resolveRuntimePath(options.dataPath)
    : explicitAdminNumbersPath
      ? path.dirname(explicitAdminNumbersPath)
      : resolveRuntimePath(agentConfig.paths?.data);
  if (!dataPath) {
    throw new Error("Admin number registry requires dataPath or agentConfig.paths.data");
  }
  const adminNumbersPath = explicitAdminNumbersPath || path.join(dataPath, "admin-numbers.json");
  const phoneMapPath = options.phoneMapPath
    ? resolveRuntimePath(options.phoneMapPath)
    : resolveRuntimePath(env.PHONE_MAP_PATH || path.join("config", "phone-map.json"));

  let cachedEntries = null;

  function buildAdminNumberEntry(id, nombre) {
    return {
      id,
      nombre,
      rol: "admin",
      agregadoPor: "runtime-config",
      fechaAgregado: now()
    };
  }

  function getAdminNumbersFromEnv() {
    return (env.ADMIN_NUMBERS || "")
      .split(",")
      .map(id => id.trim())
      .filter(Boolean)
      .map(id => buildAdminNumberEntry(id, "Migrado desde .env"));
  }

  function getAdminNumbersFromAgentConfig() {
    if (!agentConfig.adminNumbers || agentConfig.adminNumbers.length === 0) return [];

    return agentConfig.adminNumbers
      .map(id => String(id).trim())
      .filter(Boolean)
      .map(id => buildAdminNumberEntry(id, "Default agents.json"));
  }

  function loadDataWithSource() {
    try {
      if (fs.existsSync(adminNumbersPath)) {
        const data = JSON.parse(fs.readFileSync(adminNumbersPath, "utf8"));
        return { data: { admins: Array.isArray(data.admins) ? data.admins : [] }, source: "file" };
      }
    } catch (error) {
      const fallback = fallbackDataWithSource();
      return { data: fallback.data, source: fallback.source, error };
    }

    return fallbackDataWithSource();
  }

  function fallbackDataWithSource() {
    const envAdmins = getAdminNumbersFromEnv();
    if (envAdmins.length > 0) return { data: { admins: envAdmins }, source: "env" };

    const configAdmins = getAdminNumbersFromAgentConfig();
    if (configAdmins.length > 0) return { data: { admins: configAdmins }, source: "config" };

    return { data: { admins: [] }, source: "empty" };
  }

  function loadData() {
    return loadDataWithSource().data;
  }

  function list() {
    return loadData().admins;
  }

  function saveData(data) {
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }
    fs.writeFileSync(adminNumbersPath, JSON.stringify({ admins: data.admins || [] }, null, 2), "utf8");
  }

  function isValidRole(role) {
    return ALLOWED_ROLES.has(role);
  }

  function assertValidRole(role) {
    if (role && !isValidRole(role)) {
      throw new AdminNumberRegistryError("Rol inválido. Use admin o ignorado.", 400);
    }
  }

  function assertValidId(id) {
    if (!id || !/^\d+$/.test(id)) {
      throw new AdminNumberRegistryError("Número inválido. Solo dígitos.", 400);
    }
  }

  function addEntry({ id, nombre, rol, agregadoPor }) {
    assertValidId(id);
    assertValidRole(rol);

    const data = loadData();
    if (data.admins.some(entry => entry.id === id)) {
      throw new AdminNumberRegistryError("El número ya existe", 409);
    }

    data.admins.push({
      id,
      nombre: nombre || "Sin nombre",
      rol: rol || "ignorado",
      agregadoPor,
      fechaAgregado: now()
    });

    saveData(data);
    cachedEntries = data.admins;
    return data.admins[data.admins.length - 1];
  }

  function updateEntry(id, changes = {}) {
    assertValidRole(changes.rol);

    const data = loadData();
    const index = data.admins.findIndex(entry => entry.id === id);
    if (index === -1) {
      throw new AdminNumberRegistryError("Número no encontrado", 404);
    }

    if (changes.nombre) data.admins[index].nombre = changes.nombre;
    if (changes.rol) data.admins[index].rol = changes.rol;

    saveData(data);
    cachedEntries = data.admins;
    return data.admins[index];
  }

  function deleteEntry(id) {
    const data = loadData();
    const index = data.admins.findIndex(entry => entry.id === id);
    if (index === -1) {
      throw new AdminNumberRegistryError("Número no encontrado", 404);
    }

    const [deleted] = data.admins.splice(index, 1);
    saveData(data);
    cachedEntries = data.admins;
    return deleted;
  }

  function resolveIds(number) {
    const clean = String(number || "").replace(/@(c\.us|lid)$/, "");
    if (!clean) return [];

    try {
      if (fs.existsSync(phoneMapPath)) {
        const phoneMap = JSON.parse(fs.readFileSync(phoneMapPath, "utf8"));
        if (phoneMap[clean]) return [clean, phoneMap[clean]];

        const lidEntry = Object.entries(phoneMap).find(([, phone]) => phone === clean);
        if (lidEntry) return [clean, lidEntry[0]];
      }
    } catch (error) {
      // Invalid phone maps should not block admin checks.
    }

    return [clean];
  }

  function reload() {
    const result = loadDataWithSource();
    cachedEntries = result.data.admins;
    return result;
  }

  function getEntriesForLookup() {
    return cachedEntries || list();
  }

  function isAdmin(number) {
    const ids = resolveIds(number);
    return getEntriesForLookup().some(entry => ids.includes(entry.id));
  }

  function getRole(number) {
    const ids = resolveIds(number);
    const entry = getEntriesForLookup().find(item => ids.includes(item.id));
    return entry ? entry.rol : null;
  }

  function watch(onChange, interval = 1000) {
    fs.watchFile(adminNumbersPath, { interval }, (curr, prev) => {
      if (curr.mtime.getTime() !== prev.mtime.getTime()) {
        const result = reload();
        if (onChange) onChange(result);
      }
    });

    return () => fs.unwatchFile(adminNumbersPath);
  }

  return {
    adminNumbersPath,
    phoneMapPath,
    loadData,
    loadDataWithSource,
    list,
    addEntry,
    updateEntry,
    deleteEntry,
    isValidRole,
    resolveIds,
    reload,
    isAdmin,
    getRole,
    watch
  };
}

module.exports = {
  AdminNumberRegistryError,
  createAdminNumberRegistry
};
