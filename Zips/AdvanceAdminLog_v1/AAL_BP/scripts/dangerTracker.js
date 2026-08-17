/**
 * dangerTracker.js — Dangerous activity detection.
 *
 * Detected events:
 *   • TNT placed               (playerPlaceBlock)
 *   • TNT Minecart placed      (playerPlaceBlock / entity spawn)
 *   • TNT / TNT Minecart / Bundle in inventory  (inventory scan)
 */

import { pushDangerLog } from "./storage.js";
import { DANGER_ITEMS } from "./config.js";
import { getDateTime, fmtCoords, isBundle } from "./utils.js";

// Deduplicate: don't log the same (player+activity) more than once per 60s.
var _cooldowns = new Map(); // "playerId:activity" → last log tick

export function logDangerActivity(player, activity, threat, coords) {
  var key    = player.id + ":" + activity;
  var now    = Date.now();
  var last   = _cooldowns.get(key) || 0;
  if (now - last < 60000) return; // 60-second cooldown
  _cooldowns.set(key, now);

  var dt = getDateTime();
  var loc = coords || null;
  try {
    if (!loc) loc = { x: player.location.x, y: player.location.y, z: player.location.z };
  } catch (_) {}

  pushDangerLog({
    player:   player.name,
    activity: activity,
    threat:   threat,
    coords:   loc,
    date:     dt.date,
    time:     dt.time,
  });
}

// Called from the playerPlaceBlock event.
export function checkBlockPlace(player, blockTypeId) {
  if (blockTypeId === "minecraft:tnt") {
    logDangerActivity(player, "Placed TNT", "§cHigh", null);
  }
  if (blockTypeId === "minecraft:tnt_minecart") {
    logDangerActivity(player, "Placed TNT Minecart", "§cHigh", null);
  }
}

// Called every INVENTORY_SCAN_TICKS from the tick loop.
export function scanInventoryForDanger(player) {
  try {
    var inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return;
    var container = inv.container;
    for (var i = 0; i < container.size; i++) {
      try {
        var item = container.getItem(i);
        if (!item) continue;
        var tid = item.typeId;
        for (var j = 0; j < DANGER_ITEMS.length; j++) {
          var def = DANGER_ITEMS[j];
          var matches = def.fragment === "bundle"
            ? isBundle(tid)
            : tid === def.fragment || tid.indexOf(def.fragment) !== -1;
          if (matches) {
            logDangerActivity(player, "Has §e" + def.label + "§r in inventory", def.threat, null);
          }
        }
      } catch (_) {}
    }
  } catch (_) {}
}
