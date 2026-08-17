/**
 * storage.js — Persistent storage via world dynamic properties.
 *
 * All data is JSON-serialised into string properties.
 * Keys:
 *   "aal:players"        — { [id]: PlayerRecord }
 *   "aal:bans"           — { [id]: BanRecord }
 *   "aal:banned_items"   — { [key]: boolean }
 *   "aal:danger_logs"    — DangerLog[]
 *   "aal:xray_logs"      — XrayLog[]
 *   "aal:container_logs" — ContainerLog[]
 *   "aal:action_logs"    — ActionLog[]
 *   "aal:access"         — AccessConfig
 */

import { world } from "@minecraft/server";

function _load(key, def) {
  try {
    var v = world.getDynamicProperty(key);
    return typeof v === "string" ? JSON.parse(v) : def;
  } catch (_) { return def; }
}

function _save(key, data) {
  try { world.setDynamicProperty(key, JSON.stringify(data)); } catch (_) {}
}

// ─── Players ──────────────────────────────────────────────────────────────────

export function loadPlayers() { return _load("aal:players", {}); }
export function savePlayers(d) { _save("aal:players", d); }

export function upsertPlayer(id, fields) {
  var p = loadPlayers();
  p[id] = Object.assign(p[id] || {}, fields);
  savePlayers(p);
}

// ─── Bans ─────────────────────────────────────────────────────────────────────

export function loadBans() { return _load("aal:bans", {}); }
export function saveBans(d) { _save("aal:bans", d); }

// ─── Banned items config ──────────────────────────────────────────────────────

export function loadBannedItems() { return _load("aal:banned_items", {}); }
export function saveBannedItems(d) { _save("aal:banned_items", d); }

// ─── Logs ─────────────────────────────────────────────────────────────────────

function loadLog(key) { return _load(key, []); }
function pushLog(key, entry, max) {
  var arr = loadLog(key);
  arr.unshift(entry);
  if (arr.length > max) arr.length = max;
  _save(key, arr);
}

import { MAX_DANGER_LOGS, MAX_XRAY_LOGS, MAX_CONTAINER_LOGS, MAX_ACTION_LOGS, MAX_BLOCK_LOGS } from "./config.js";

export function loadDangerLogs()    { return loadLog("aal:danger_logs"); }
export function pushDangerLog(e)    { pushLog("aal:danger_logs",    e, MAX_DANGER_LOGS); }
export function clearDangerLogs()   { _save("aal:danger_logs", []); }

export function loadXrayLogs()      { return loadLog("aal:xray_logs"); }
export function pushXrayLog(e)      { pushLog("aal:xray_logs",     e, MAX_XRAY_LOGS); }
export function clearXrayLogs()     { _save("aal:xray_logs", []); }

export function loadContainerLogs() { return loadLog("aal:container_logs"); }
export function pushContainerLog(e) { pushLog("aal:container_logs", e, MAX_CONTAINER_LOGS); }
export function clearContainerLogs(){ _save("aal:container_logs", []); }

export function loadBlockLogs()     { return loadLog("aal:block_logs"); }
export function pushBlockLog(e)     { pushLog("aal:block_logs",     e, MAX_BLOCK_LOGS); }
export function clearBlockLogs()    { _save("aal:block_logs", []); }

export function loadActionLogs()    { return loadLog("aal:action_logs"); }
export function pushActionLog(e)    { pushLog("aal:action_logs",   e, MAX_ACTION_LOGS); }

// ─── Access config ────────────────────────────────────────────────────────────

export function loadAccess() {
  return _load("aal:access", { mode: "restricted", primaryAdmin: "teoremasine", admins: ["teoremasine", "julioverx", "danix2410"] });
}
export function saveAccess(d) { _save("aal:access", d); }
