/**
 * menus/xrayMenu.js — Feature 4: X-Ray Risk Detection logs.
 */

import { ActionFormData } from "@minecraft/server-ui";
import { loadXrayLogs, clearXrayLogs } from "../storage.js";
import { fmtCoords } from "../utils.js";
import { showMainMenu } from "./mainMenu.js";

export function showXrayMenu(admin) {
  var logs = loadXrayLogs();

  var form = new ActionFormData()
    .title("§b§l X-Ray Risk Detection");

  if (logs.length === 0) {
    form.body("§aNo suspicious mining activity detected.");
    form.button("§e← Back");
    form.show(admin).then(function() { showMainMenu(admin); }).catch(function() {});
    return;
  }

  form.body("§e" + logs.length + " §bsuspicious event(s). Select to view details.");
  form.button("§e← Back to Main");
  form.button("§c🗑 Clear All X-Ray Logs");

  for (var i = 0; i < logs.length; i++) {
    var l = logs[i];
    form.button(l.threat + " §e" + l.player + " §6— §b" + l.count + " diamonds");
  }

  form.show(admin).then(function(res) {
    if (res.canceled) return;
    if (res.selection === 0) { showMainMenu(admin); return; }
    if (res.selection === 1) {
      clearXrayLogs();
      admin.sendMessage("§6[§eAAL§6] §aX-Ray logs cleared.");
      showXrayMenu(admin);
      return;
    }
    var log = logs[res.selection - 2];
    if (!log) return;
    showXrayDetail(admin, log);
  }).catch(function() {});
}

function showXrayDetail(admin, log) {
  var body = "";
  body += "§b§lX-Ray Detection Report\n\n";
  body += "§6Player: §e"  + log.player + "\n";
  body += "§6Status: §bMined §e" + log.count + " §bdiamond ore within §e" + log.window + "\n";
  body += "§6Threat: "    + log.threat + "\n";
  body += "§6Coords: "    + fmtCoords(log.coords) + "\n";
  body += "§6Date: §e"    + log.date   + "\n";
  body += "§6Time: §e"    + log.time   + "\n";

  new ActionFormData()
    .title("§b X-Ray Detail")
    .body(body)
    .button("§e← Back")
    .show(admin)
    .then(function() { showXrayMenu(admin); })
    .catch(function() {});
}
