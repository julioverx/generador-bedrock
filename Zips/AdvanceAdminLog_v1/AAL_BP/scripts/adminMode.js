/**
 * adminMode.js — Silent spectator observation feature.
 *
 * Admin selects an online player → switches to spectator, teleports there,
 * observes for 30 seconds, then returns and switches back to survival.
 */

import { GameMode, system } from "@minecraft/server";
import { ADMIN_MODE_SECONDS } from "./config.js";
import { pushActionLog } from "./storage.js";
import { getDateTime } from "./utils.js";

export function startAdminMode(admin, target) {
  var dt = getDateTime();

  // Save admin's current state.
  var origLoc = { x: admin.location.x, y: admin.location.y, z: admin.location.z };
  var origDim = admin.dimension;

  // Switch admin to spectator and teleport.
  try { admin.setGameMode(GameMode.spectator); } catch (_) {
    try { admin.runCommand("gamemode spectator"); } catch (_) {}
  }
  try { admin.teleport(target.location, { dimension: target.dimension }); } catch (_) {}

  admin.sendMessage("§6[§eAAL§6] §bObserving §e" + target.name + "§b. Returning in §e" + ADMIN_MODE_SECONDS + "§b seconds...");

  pushActionLog({
    action:  "Admin Mode",
    admin:   admin.name,
    target:  target.name,
    date:    dt.date,
    time:    dt.time,
  });

  // Return after ADMIN_MODE_SECONDS.
  system.runTimeout(function() {
    try {
      admin.setGameMode(GameMode.survival);
    } catch (_) {
      try { admin.runCommand("gamemode survival"); } catch (_) {}
    }
    try { admin.teleport(origLoc, { dimension: origDim }); } catch (_) {}
    try { admin.sendMessage("§6[§eAAL§6] §aAdmin mode ended. Returned to your original position."); } catch (_) {}
  }, ADMIN_MODE_SECONDS * 20);
}
