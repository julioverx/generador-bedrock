/**
 * blockTracker.js — Protected Area Block Break Tracker.
 *
 * Monitors block destruction when positioned above aal:claim_marker.
 */

import { pushBlockLog } from "./storage.js";
import { CLAIM_MARKER_BLOCK } from "./config.js";
import { getDateTime } from "./utils.js";

export function checkProtectedBlockBreak(player, brokenBlockTypeId, blockLocation, dimension) {
  if (!player || !brokenBlockTypeId || !blockLocation || !dimension) return;
  if (brokenBlockTypeId === CLAIM_MARKER_BLOCK) return; // Ignore breaking marker block itself

  var x = Math.floor(blockLocation.x);
  var y = Math.floor(blockLocation.y);
  var z = Math.floor(blockLocation.z);

  // Check downward vertical column (up to 30 blocks below) for CLAIM_MARKER_BLOCK
  var isProtectedArea = false;
  var minY = Math.max(-64, y - 30);

  for (var checkY = y - 1; checkY >= minY; checkY--) {
    try {
      var blockBelow = dimension.getBlock({ x: x, y: checkY, z: z });
      if (blockBelow && (blockBelow.typeId === CLAIM_MARKER_BLOCK || blockBelow.typeId === "minecraft:deny" || blockBelow.typeId === "minecraft:allow")) {
        isProtectedArea = true;
        break;
      }
    } catch (_) {}
  }

  if (isProtectedArea) {
    var dt = getDateTime();
    pushBlockLog({
      player: player.name || "Unknown",
      block: brokenBlockTypeId,
      coords: { x: x, y: y, z: z, dim: dimension.id },
      date: dt.date,
      time: dt.time
    });
  }
}
