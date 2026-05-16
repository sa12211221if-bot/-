// Designer OS — IndexedDB layer (no external deps)
// Stores: clients, projects, tasks, invoices, subscriptions, timeLogs,
//         goals, ideas, focusSessions, settings, inbox

const DB_NAME = 'designer-os';
const DB_VERSION = 2;

const STORES = [
  { name: 'clients',       key: 'id', indexes: [['name', 'name']] },
  { name: 'projects',      key: 'id', indexes: [['clientId', 'clientId'], ['status', 'status'], ['dueDate', 'dueDate']] },
  { name: 'tasks',         key: 'id', indexes: [['projectId', 'projectId'], ['status', 'status'], ['dueDate', 'dueDate'], ['priority', 'priority']] },
  { name: 'invoices',      key: 'id', indexes: [['clientId', 'clientId'], ['status', 'status'], ['issueDate', 'issueDate']] },
  { name: 'subscriptions', key: 'id', indexes: [['nextBillingDate', 'nextBillingDate']] },
  { name: 'timeLogs',      key: 'id', indexes: [['projectId', 'projectId'], ['date', 'date']] },
  { name: 'goals',         key: 'id', indexes: [['period', 'period'], ['status', 'status']] },
  { name: 'ideas',         key: 'id', indexes: [['createdAt', 'createdAt']] },
  { name: 'focusSessions', key: 'id', indexes: [['date', 'date'], ['projectId', 'projectId']] },
  { name: 'inbox',         key: 'id', indexes: [['createdAt', 'createdAt']] },
  { name: 'settings',      key: 'key' },
  { name: 'expenses',      key: 'id', indexes: [['date', 'date'], ['category', 'category']] },

  // Personal Command Center additions (v2)
  { name: 'habits',        key: 'id', indexes: [['category', 'category'], ['createdAt', 'createdAt']] },
  { name: 'habitLogs',     key: 'id', indexes: [['habitId', 'habitId'], ['date', 'date']] },
  { name: 'reviews',       key: 'id', indexes: [['type', 'type'], ['date', 'date']] },
  { name: 'knowledge',     key: 'id', indexes: [['category', 'category'], ['createdAt', 'createdAt']] }, // PARA: inbox|projects|areas|resources|archive
  { name: 'areas',         key: 'id', indexes: [['name', 'name']] },
  { name: 'resources',     key: 'id', indexes: [['type', 'type'], ['createdAt', 'createdAt']] },
  { name: 'vitals',        key: 'id', indexes: [['date', 'date']] }, // mental state logs
  { name: 'aiSuggestions', key: 'id', indexes: [['createdAt', 'createdAt'], ['dismissed', 'dismissed']] }
];

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      for (const def of STORES) {
        let store;
        if (!db.objectStoreNames.contains(def.name)) {
          store = db.createObjectStore(def.name, { keyPath: def.key });
        } else {
          store = e.target.transaction.objectStore(def.name);
        }
        for (const [idxName, keyPath] of (def.indexes || [])) {
          if (!store.indexNames.contains(idxName)) {
            store.createIndex(idxName, keyPath, { unique: false });
          }
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode = 'readonly') {
  return openDB().then((db) => db.transaction(store, mode).objectStore(store));
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const db = {
  async getAll(store) {
    const s = await tx(store);
    return reqToPromise(s.getAll());
  },
  async get(store, key) {
    const s = await tx(store);
    return reqToPromise(s.get(key));
  },
  async put(store, value) {
    const s = await tx(store, 'readwrite');
    if (!value.id && !value.key) value.id = uid();
    if (!value.createdAt) value.createdAt = Date.now();
    value.updatedAt = Date.now();
    await reqToPromise(s.put(value));
    return value;
  },
  async putMany(store, values) {
    const s = await tx(store, 'readwrite');
    for (const v of values) {
      if (!v.id && !v.key) v.id = uid();
      if (!v.createdAt) v.createdAt = Date.now();
      v.updatedAt = Date.now();
      s.put(v);
    }
    return new Promise((resolve, reject) => {
      s.transaction.oncomplete = () => resolve(values);
      s.transaction.onerror = () => reject(s.transaction.error);
    });
  },
  async delete(store, key) {
    const s = await tx(store, 'readwrite');
    return reqToPromise(s.delete(key));
  },
  async clear(store) {
    const s = await tx(store, 'readwrite');
    return reqToPromise(s.clear());
  },
  async query(store, indexName, range) {
    const s = await tx(store);
    const idx = s.index(indexName);
    return reqToPromise(idx.getAll(range));
  },
  async exportAll() {
    const out = { version: DB_VERSION, exportedAt: Date.now(), data: {} };
    for (const def of STORES) {
      out.data[def.name] = await this.getAll(def.name);
    }
    return out;
  },
  async importAll(payload) {
    if (!payload || !payload.data) throw new Error('invalid payload');
    for (const def of STORES) {
      const items = payload.data[def.name];
      if (!Array.isArray(items)) continue;
      const s = await tx(def.name, 'readwrite');
      await reqToPromise(s.clear());
      for (const item of items) s.put(item);
      await new Promise((r) => (s.transaction.oncomplete = r));
    }
  },
  async stats() {
    const result = {};
    for (const def of STORES) {
      const s = await tx(def.name);
      result[def.name] = await reqToPromise(s.count());
    }
    return result;
  }
};

export const STORE_NAMES = STORES.map((s) => s.name);
