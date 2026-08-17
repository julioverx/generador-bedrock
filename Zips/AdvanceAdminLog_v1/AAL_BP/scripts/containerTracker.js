/**
 * containerTracker.js — Logs chest and barrel interactions.
 *
 * Fires on playerInteractWithBlock; filters for loggable container types.
 * Debounced: same player + same block location logged at most once per second.
 */

import { pushContainerLog } from "./storage.js";
import { LOGGABLE_CONTAINERS } from "./config.js";
import { getDateTime, fmtDim } from "./utils.js";

// "playerId:x:y:z" → last log timestamp (ms).
var _recent = new Map();

export function onBlockInteract(player, block) {
  try {
    var label = LOGGABLE_CONTAINERS[block.typeId];
    if (!label) return;

    var key = player.id + ":" + Math.floor(block.location.x) + ":" + Math.floor(block.location.y) + ":" + Math.floor(block.location.z);
    var now = Date.now();
    if (_recent.has(key) && now - _recent.get(key) < 1000) return;
    _recent.set(key, now);

    var dt = getDateTime();
    pushContainerLog({
      player:        player.name,
      containerType: label,
      coords: {
        x:   Math.floor(block.location.x),
        y:   Math.floor(block.location.y),
        z:   Math.floor(block.location.z),
        dim: fmtDim(player.dimension.id),
      },
      date: dt.date,
      time: dt.time,
    });
  } catch (_) {}
}
