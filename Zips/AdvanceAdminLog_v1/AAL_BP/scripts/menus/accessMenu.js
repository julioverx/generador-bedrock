/**
 * menus/accessMenu.js — Feature 8: Access Management.
 */

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { world } from "@minecraft/server";
import { hasAccess, setMode, grantAccess, revokeAccess, getAccessConfig } from "../access.js";
import { loadPlayers } from "../storage.js";
import { showMainMenu } from "./mainMenu.js";

export function showAccessMenu(admin) {
  var cfg  = getAccessConfig();
  var mode = cfg.mode === "everyone" ? "§aON §7(Everyone)" : "§cOFF §7(Restricted)";

  new ActionFormData()
    .title("§a§l Access Management")
    .body("§6Admin Log Access: " + mode + "\n§7Primary Admin: §e" + (cfg.primaryAdmin || "Not set"))
    .button("§6🔄 Toggle Access Mode")
    .button("§a✔ Grant Access")
    .button("§c✘ Revoke Access")
    .button("§b📋 View Current Admins")
    .button("§e← Back")
    .show(admin)
    .then(function(res) {
      if (res.canceled) return;
      if (res.selection === 0) toggleMode(admin);
      if (res.selection === 1) showGrantMenu(admin);
      if (res.selection === 2) showRevokeMenu(admin);
      if (res.selection === 3) showAdminList(admin);
      if (res.selection === 4) showMainMenu(admin);
    })
    .catch(function() {});
}

// ─── Toggle mode ──────────────────────────────────────────────────────────────

function toggleMode(admin) {
  var cfg     = getAccessConfig();
  var newMode = cfg.mode === "everyone" ? "restricted" : "everyone";
  setMode(newMode);
  admin.sendMessage("§6[§eAAL§6] §eAccess mode changed to: §b" + (newMode === "everyone" ? "Everyone (ON)" : "Restricted (OFF)"));
  showAccessMenu(admin);
}

// ─── Grant ────────────────────────────────────────────────────────────────────

function showGrantMenu(admin) {
  var online = world.getPlayers().filter(function(p) { return p.id !== admin.id; });

  var form = new ActionFormData()
    .title("§a Grant Access")
    .body("§eSelect an online player to grant access:");

  form.button("§e← Back");
  if (online.length === 0) {
    form.button("§7No other players online.");
    form.show(admin).then(function(res) {
      if (res.selection === 0) showAccessMenu(admin);
    }).catch(function() {});
    return;
  }
  for (var i = 0; i < online.length; i++) form.button("§a" + online[i].name);

  form.show(admin).then(function(res) {
    if (res.canceled) return;
    if (res.selection === 0) { showAccessMenu(admin); return; }
    var target = online[res.selection - 1];
    if (!target) return;
    grantAccess(admin, target.id, target.name);
    admin.sendMessage("§6[§eAAL§6] §aAccess granted to §e" + target.name + "§a.");
    try { target.sendMessage("§6[§eAAL§6] §aYou have been granted access to the Admin Log."); } catch (_) {}
    showAccessMenu(admin);
  }).catch(function() {});
}

// ─── Revoke ───────────────────────────────────────────────────────────────────

function showRevokeMenu(admin) {
  var cfg    = getAccessConfig();
  var admins = cfg.admins || [];

  var form = new ActionFormData()
    .title("§c Revoke Access")
    .body("§eSelect an admin to revoke access from:\n§7(Primary admin is protected and cannot be removed)");

  form.button("§e← Back");
  if (admins.length === 0) {
    form.button("§7No admins in the access list.");
    form.show(admin).then(function(res) {
      if (res.selection === 0) showAccessMenu(admin);
    }).catch(function() {});
    return;
  }

  var players = loadPlayers();
  var revokeTargets = admins.filter(function(id) { return id !== cfg.primaryAdmin; });

  if (revokeTargets.length === 0) {
    form.button("§7Only the primary admin is listed — cannot revoke.");
    form.show(admin).then(function(res) {
      if (res.selection === 0) showAccessMenu(admin);
    }).catch(function() {});
    return;
  }

  for (var i = 0; i < revokeTargets.length; i++) {
    var name = players[revokeTargets[i]] ? players[revokeTargets[i]].name : revokeTargets[i];
    form.button("§c" + name);
  }

  form.show(admin).then(function(res) {
    if (res.canceled) return;
    if (res.selection === 0) { showAccessMenu(admin); return; }
    var targetId = revokeTargets[res.selection - 1];
    var name = players[targetId] ? players[targetId].name : targetId;
    var ok = revokeAccess(admin, targetId, name);
    if (ok) {
      admin.sendMessage("§6[§eAAL§6] §cAccess revoked from §e" + name + "§c.");
    } else {
      admin.sendMessage("§c[AAL] Cannot revoke the Primary Administrator's access.");
    }
    showAccessMenu(admin);
  }).catch(function() {});
}

// ─── Admin list ───────────────────────────────────────────────────────────────

function showAdminList(admin) {
  var cfg     = getAccessConfig();
  var admins  = cfg.admins || [];
  var players = loadPlayers();

  var body = "§6Access Mode: §e" + (cfg.mode === "everyone" ? "Everyone (ON)" : "Restricted (OFF)") + "\n\n";
  body += "§6§lAuthorized Admins:\n";
  if (admins.length === 0) {
    body += "§7None listed.\n";
  } else {
    for (var i = 0; i < admins.length; i++) {
      var id   = admins[i];
      var name = players[id] ? players[id].name : id;
      var tag  = id === cfg.primaryAdmin ? " §6★Primary" : "";
      body += "§a• §e" + name + tag + "\n";
    }
  }

  new ActionFormData()
    .title("§b Admin Access List")
    .body(body)
    .button("§e← Back")
    .show(admin)
    .then(function() { showAccessMenu(admin); })
    .catch(function() {});
}
