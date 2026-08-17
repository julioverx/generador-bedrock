/**
 * playerTracker.js — Tracks player join, leave, death, location, and dimension.
 *
 * Persists to storage so data survives restarts.
 */

import { world } from "@minecraft/server";
import { loadPlayers, savePlayers, upsertPlayer } from "./storage.js";
import { getDateTime, fmtCoords } from "./utils.js";

// In-memory: mark all current online players on load.
var _onlineSince = new Map(); // playerId -> tick when they joined

// ─── Events (called from main.js) ─────────────────────────────────────────────

export function onPlayerJoin(player) {
  _onlineSince.set(player.id, Date.now());
  var dt = getDateTime();
  upsertPlayer(player.id, {
    name:      player.name,
    online:    true,
    lastSeen:  dt.date + " " + dt.time,
  });
}

export function onPlayerLeave(player) {
  _onlineSince.delete(player.id);
  var dt = getDateTime();
  var loc = null;
  try { loc = { x: player.location.x, y: player.location.y, z: player.location.z, dim: player.dimension.id }; } catch (_) {}
  upsertPlayer(player.id, {
    online:       false,
    lastSeen:     dt.date + " " + dt.time,
    lastCoords:   loc,
    lastDimension: loc ? loc.dim : null,
  });
}

export function onPlayerDie(player) {
  var dt  = getDateTime();
  var loc = null;
  try { loc = { x: player.location.x, y: player.location.y, z: player.location.z, dim: player.dimension.id }; } catch (_) {}
  upsertPlayer(player.id, {
    lastDeathCoords: loc,
    lastDeathTime:   dt.date + " " + dt.time,
  });
}

// Called every second from tick loop to refresh online status + coords.
export function tickUpdatePlayer(player) {
  try {
    var loc = { x: player.location.x, y: player.location.y, z: player.location.z, dim: player.dimension.id };
    upsertPlayer(player.id, {
      name:          player.name,
      online:        true,
      currentCoords: loc,
      currentDim:    player.dimension.id,
    });
  } catch (_) {}
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function getAllPlayers() { return loadPlayers(); }

export function getPlayerRecord(id) {
  var p = loadPlayers();
  return p[id] || null;
}
