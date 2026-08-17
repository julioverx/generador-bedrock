/**
 * menus/containerMenu.js — Feature 5: Container interaction logs.
 */

import { ActionFormData } from "@minecraft/server-ui";
import { loadContainerLogs, clearContainerLogs } from "../storage.js";
import { showMainMenu } from "./mainMenu.js";

export function showContainerMenu(admin) {
  var logs = loadContainerLogs();

  var form = new ActionFormData()
    .title("§d§l Container Logs");

  if (logs.length === 0) {
    form.body("§aNo container interactions recorded.");
    form.button("§e← Back");
    form.show(admin).then(function() { showMainMenu(admin); }).catch(function() {});
    return;
  }

  form.body("§e" + logs.length + " §dinteraction(s) logged. Select to view details.");
  form.button("§e← Back to Main");
  form.button("§c🗑 Clear All Container Logs");

  for (var i = 0; i < logs.length; i++) {
    var l = logs[i];
    form.button("§d" + l.containerType + " §e" + l.player + " §6" + l.date);
  }

  form.show(admin).then(function(res) {
    if (res.canceled) return;
    if (res.selection === 0) { showMainMenu(admin); return; }
    if (res.selection === 1) {
      clearContainerLogs();
      admin.sendMessage("§6[§eAAL§6] §aContainer logs cleared.");
      showContainerMenu(admin);
      return;
    }
    var log = logs[res.selection - 2];
    if (!log) return;
    showContainerDetail(admin, log);
  }).catch(function() {});
}

function showContainerDetail(admin, log) {
  var body = "";
  body += "§d§lContainer Interaction\n\n";
  body += "§6Player: §e"    + log.player        + "\n";
  body += "§6Container: §d" + log.containerType  + "\n";
  if (log.coords) {
    body += "§6Coords: §eX:§b" + log.coords.x + " §eY:§b" + log.coords.y + " §eZ:§b" + log.coords.z + "\n";
    body += "§6Dimension: §b" + (log.coords.dim || "Unknown") + "\n";
  }
  body += "§6Date: §e"      + log.date          + "\n";
  body += "§6Time: §e"      + log.time          + "\n";

  new ActionFormData()
    .title("§d Container Detail")
    .body(body)
    .button("§e← Back")
    .show(admin)
    .then(function() { showContainerMenu(admin); })
    .catch(function() {});
}
