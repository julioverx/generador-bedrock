/**
 * menus/dangerMenu.js — Feature 2: Dangerous Activity Logs.
 */

import { ActionFormData } from "@minecraft/server-ui";
import { loadDangerLogs, clearDangerLogs } from "../storage.js";
import { fmtCoords } from "../utils.js";
import { showMainMenu } from "./mainMenu.js";

export function showDangerMenu(admin) {
  var logs = loadDangerLogs();

  var form = new ActionFormData()
    .title("§c§l Dangerous Activity Logs");

  if (logs.length === 0) {
    form.body("§aNo dangerous activity detected.");
    form.button("§e← Back");
    form.show(admin).then(function() { showMainMenu(admin); }).catch(function() {});
    return;
  }

  form.body("§e" + logs.length + " §cdangerous event(s) recorded. Select to view details.");
  form.button("§e← Back to Main");
  form.button("§c🗑 Clear All Logs");

  for (var i = 0; i < logs.length; i++) {
    var l = logs[i];
    form.button("§c⚠ §e" + l.player + " §6— §c" + l.activity);
  }

  form.show(admin).then(function(res) {
    if (res.canceled) return;
    if (res.selection === 0) { showMainMenu(admin); return; }
    if (res.selection === 1) {
      clearDangerLogs();
      admin.sendMessage("§6[§eAAL§6] §aDangerous activity logs cleared.");
      showDangerMenu(admin);
      return;
    }
    var log = logs[res.selection - 2];
    if (!log) return;
    showDangerDetail(admin, log);
  }).catch(function() {});
}

function showDangerDetail(admin, log) {
  var body = "";
  body += "§c§l⚠ Dangerous Activity\n\n";
  body += "§6Player: §e"     + log.player   + "\n";
  body += "§6Activity: §c"   + log.activity + "\n";
  body += "§6Threat Level: " + log.threat   + "\n";
  body += "§6Coords: "       + fmtCoords(log.coords) + "\n";
  body += "§6Date: §e"       + log.date     + "\n";
  body += "§6Time: §e"       + log.time     + "\n";

  new ActionFormData()
    .title("§c⚠ Danger Detail")
    .body(body)
    .button("§e← Back")
    .show(admin)
    .then(function() { showDangerMenu(admin); })
    .catch(function() {});
}
