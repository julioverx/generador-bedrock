/**
 * menus/playersMenu.js — Feature 1: Player List & Stats.
 */

import { ActionFormData } from "@minecraft/server-ui";
import { world } from "@minecraft/server";
import { getAllPlayers } from "../playerTracker.js";
import { fmtCoords, fmtDim, fmtInventory } from "../utils.js";
import { showMainMenu } from "./mainMenu.js";

export function showPlayersMenu(admin) {
  var records = getAllPlayers();
  var ids     = Object.keys(records);

  var form = new ActionFormData()
    .title("§6§l Player List")
    .body("§eAll players who have joined this world. §b(" + ids.length + " total)\n§aGreen = Online  §cRed = Offline");

  form.button("§e← Back to Main Menu");

  if (ids.length === 0) {
    form.button("§eNo players recorded yet.");
  } else {
    for (var i = 0; i < ids.length; i++) {
      var r      = records[ids[i]];
      var status = r.online ? "§a● §e" : "§c● §e";
      form.button(status + (r.name || ids[i]));
    }
  }

  form.show(admin).then(function(res) {
    if (res.canceled) return;
    if (res.selection === 0) { showMainMenu(admin); return; }
    if (ids.length === 0) return;
    var idx = res.selection - 1;
    if (idx < 0 || idx >= ids.length) return;
    showPlayerStats(admin, ids[idx], records[ids[idx]]);
  }).catch(function() {});
}

function showPlayerStats(admin, id, rec) {
  // Re-fetch live player reference at display time.
  var live = null;
  try {
    var online = world.getPlayers();
    for (var i = 0; i < online.length; i++) {
      if (online[i].id === id) { live = online[i]; break; }
    }
  } catch (_) {}

  var body = "";
  body += "§6Player: §e"  + (rec.name || id) + "\n";
  body += "§6Status: "    + (rec.online ? "§aOnline" : "§cOffline") + "\n";

  if (live) {
    body += "§6Dimension: §b"   + fmtDim(live.dimension.id) + "\n";
    body += "§6Coordinates: "   + fmtCoords(live.location)  + "\n";
  } else {
    body += "§6Last Dimension: §b" + fmtDim(rec.lastDimension)  + "\n";
    body += "§6Last Coords: "      + fmtCoords(rec.lastCoords)   + "\n";
  }

  body += "§6Last Seen: §e"       + (rec.lastSeen || "Unknown")   + "\n";
  body += "§6Last Death: "        + fmtCoords(rec.lastDeathCoords) + "\n";
  if (rec.lastDeathTime) body += "§6Death Time: §e" + rec.lastDeathTime + "\n";

  body += "\n§6§lInventory:\n";
  if (live) {
    try {
      var inv = live.getComponent("minecraft:inventory");
      body += inv ? fmtInventory(inv.container) : "§cCould not read.";
    } catch (_) { body += "§cCould not read inventory."; }
  } else {
    body += "§ePlayer is offline — inventory unavailable.";
  }

  new ActionFormData()
    .title("§b📋 Stats: " + (rec.name || id))
    .body(body)
    .button("§e← Back to Player List")
    .show(admin)
    .then(function() { showPlayersMenu(admin); })
    .catch(function() {});
}
