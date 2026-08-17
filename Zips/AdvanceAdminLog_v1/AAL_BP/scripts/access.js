/**
 * access.js — Access Management logic.
 *
 * Modes:
 *   "everyone"   — any player can open the menu.
 *   "restricted" — only players in the admins list (+ primary admin).
 *
 * The first player to ever use the Recovery Compass becomes primaryAdmin.
 */

import { loadAccess, saveAccess, pushActionLog } from "./storage.js";
import { getDateTime } from "./utils.js";

// ─── Check ────────────────────────────────────────────────────────────────────

var DEFAULT_ADMINS = ["teoremasine", "julioverx", "danix2410"];

export function hasAccess(player) {
  if (!player || !player.name) return false;
  var nameLower = player.name.toLowerCase();
  
  // Direct check for hardcoded authorized admins
  for (var i = 0; i < DEFAULT_ADMINS.length; i++) {
    if (DEFAULT_ADMINS[i].toLowerCase() === nameLower) return true;
  }

  var a = loadAccess();
  if (a.mode === "everyone") return true;
  if (a.primaryAdmin === player.id || a.primaryAdmin === player.name || (typeof a.primaryAdmin === "string" && a.primaryAdmin.toLowerCase() === nameLower)) return true;
  
  if (Array.isArray(a.admins)) {
    for (var j = 0; j < a.admins.length; j++) {
      var adm = a.admins[j];
      if (adm === player.id || adm === player.name || (typeof adm === "string" && adm.toLowerCase() === nameLower)) return true;
    }
  }
  return false;
}

// Called on use: sets primaryAdmin to teoremasine and ensures default admins exist in config
export function maybeSetPrimary(player) {
  var a = loadAccess();
  if (!a.primaryAdmin || a.primaryAdmin === "teoremasine") {
    a.primaryAdmin = "teoremasine";
    for (var i = 0; i < DEFAULT_ADMINS.length; i++) {
      if (!a.admins.includes(DEFAULT_ADMINS[i])) a.admins.push(DEFAULT_ADMINS[i]);
    }
    saveAccess(a);
  }
}

// ─── Mode toggle ──────────────────────────────────────────────────────────────

export function setMode(mode) {
  var a = loadAccess();
  a.mode = mode;
  saveAccess(a);
}

// ─── Grant / Revoke ───────────────────────────────────────────────────────────

export function grantAccess(admin, targetId, targetName) {
  var a = loadAccess();
  if (!a.admins.includes(targetId)) a.admins.push(targetId);
  saveAccess(a);
  var dt = getDateTime();
  pushActionLog({
    action: "Grant Access",
    admin: admin.name,
    target: targetName,
    date: dt.date,
    time: dt.time,
  });
}

export function revokeAccess(admin, targetId, targetName) {
  var a = loadAccess();
  if (targetId === a.primaryAdmin) return false; // can't remove primary
  a.admins = a.admins.filter(function(id) { return id !== targetId; });
  saveAccess(a);
  var dt = getDateTime();
  pushActionLog({
    action: "Revoke Access",
    admin: admin.name,
    target: targetName,
    date: dt.date,
    time: dt.time,
  });
  return true;
}

export function getAccessConfig() { return loadAccess(); }
