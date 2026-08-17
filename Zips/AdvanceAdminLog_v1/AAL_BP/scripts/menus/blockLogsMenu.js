/**
 * menus/blockLogsMenu.js — Protected Area Block Break Logs UI.
 */

import { ActionFormData } from "@minecraft/server-ui";
import { loadBlockLogs, clearBlockLogs } from "../storage.js";
import { fmtCoords } from "../utils.js";
import { showMainMenu } from "./mainMenu.js";

export function showBlockLogsMenu(admin) {
  var logs = loadBlockLogs();

  var form = new ActionFormData()
    .title("§e§l Protected Block Break Logs");

  if (logs.length === 0) {
    form.body("§aNo block break events recorded in protected areas.");
    form.button("§e← Back");
    form.show(admin).then(function() { showMainMenu(admin); }).catch(function() {});
    return;
  }

  form.body("§e" + logs.length + " §6block break event(s) logged in protected areas. Select for details.");
  form.button("§e← Back to Main");
  form.button("§c🗑 Clear All Block Logs");

  for (var i = 0; i < logs.length; i++) {
    var l = logs[i];
    var blockName = l.block.replace("minecraft:", "");
    form.button("§e🧱 " + blockName + " §6— §b" + l.player);
  }

  form.show(admin).then(function(res) {
    if (res.canceled) return;
    if (res.selection === 0) { showMainMenu(admin); return; }
    if (res.selection === 1) {
      clearBlockLogs();
      admin.sendMessage("§6[§eAAL§6] §aProtected block break logs cleared.");
      showBlockLogsMenu(admin);
      return;
    }
    var log = logs[res.selection - 2];
    if (!log) return;
    showBlockDetail(admin, log);
  }).catch(function() {});
}

function showBlockDetail(admin, log) {
  var body = "";
  body += "§e§l🧱 Protected Block Destroyed\n\n";
  body += "§6Player: §e"    + log.player  + "\n";
  body += "§6Block: §b"     + log.block   + "\n";
  if (log.coords) {
    body += "§6Coords: §eX:§b" + log.coords.x + " §eY:§b" + log.coords.y + " §eZ:§b" + log.coords.z + "\n";
    body += "§6Dimension: §b" + (log.coords.dim || "Unknown") + "\n";
  }
  body += "§6Date: §e"      + log.date    + "\n";
  body += "§6Time: §e"      + log.time    + "\n";

  new ActionFormData()
    .title("§e🧱 Block Break Detail")
    .body(body)
    .button("§e← Back")
    .show(admin)
    .then(function() { showBlockLogsMenu(admin); })
    .catch(function() {});
}
