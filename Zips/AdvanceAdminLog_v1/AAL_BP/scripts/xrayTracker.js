/**
 * xrayTracker.js — X-ray / suspicious diamond mining detection.
 *
 * Tracks per-player diamond ore break timestamps in memory.
 * Evaluates threat level after each break and logs when thresholds are crossed.
 */

import { system } from "@minecraft/server";
import { pushXrayLog } from "./storage.js";
import { DIAMOND_ORE_IDS, XRAY_THREATS, XRAY_LOG_COOLDOWN_TICKS } from "./config.js";
import { getDateTime } from "./utils.js";

// Map<playerId, { ticks: number[], lastLogTick: number, lastCoords: object }>
var _data = new Map();

// Called from playerBreakBlock event.
export function onBlockBreak(player, blockTypeId, location) {
  if (DIAMOND_ORE_IDS.indexOf(blockTypeId) === -1) return;

  var now = system.currentTick;
  var rec = _data.get(player.id);
  if (!rec) {
    rec = { ticks: [], lastLogTick: -99999, lastCoords: null };
    _data.set(player.id, rec);
  }

  rec.ticks.push(now);
  try { rec.lastCoords = { x: location.x, y: location.y, z: location.z }; } catch (_) {}

  // Purge entries older than 3 minutes (3600 ticks).
  var cutoff3m = now - 3600;
  rec.ticks = rec.ticks.filter(function(t) { return t >= cutoff3m; });

  // Count within windows.
  var cutoff1m  = now - 1200;
  var count1m   = rec.ticks.filter(function(t) { return t >= cutoff1m; }).length;
  var count3m   = rec.ticks.length;

  // Find highest applicable threat.
  var threat = null;
  for (var i = 0; i < XRAY_THREATS.length; i++) {
    var th = XRAY_THREATS[i];
    var windowTicks = th.windowMin * 1200;
    var cutoffW = now - windowTicks;
    var countW  = rec.ticks.filter(function(t) { return t >= cutoffW; }).length;
    if (countW >= th.minCount) { threat = th; break; }
  }

  if (!threat) return;

  // Apply cooldown — don't spam the same player's logs.
  if (now - rec.lastLogTick < XRAY_LOG_COOLDOWN_TICKS) return;
  rec.lastLogTick = now;

  var dt      = getDateTime();
  var minutes = Math.round(count3m > 0 ? (now - rec.ticks[0]) / 1200 : 0);

  pushXrayLog({
    player:   player.name,
    count:    count3m,
    window:   minutes + (minutes === 1 ? " minute" : " minutes"),
    threat:   threat.label,
    coords:   rec.lastCoords,
    date:     dt.date,
    time:     dt.time,
  });
}
