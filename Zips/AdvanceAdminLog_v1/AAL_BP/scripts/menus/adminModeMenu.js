/**
 * menus/adminModeMenu.js — Feature 6: Admin Mode (spectator observation).
 */

import { ActionFormData } from "@minecraft/server-ui";
import { world } from "@minecraft/server";
import { startAdminMode } from "../adminMode.js";
import { showMainMenu } from "./mainMenu.js";

export function showAdminModeMenu(admin) {
  var onlinePlayers = world.getPlayers().filter(function(p) { return p.id !== admin.id; });

  var form = new ActionFormData()
    .title("§3§l Admin Mode");

  if (onlinePlayers.length === 0) {
    form.body("§eNo other players are currently online.");
    form.button("§e← Back");
    form.show(admin).then(function() { showMainMenu(admin); }).catch(function() {});
    return;
  }

  form.body(
    "§eSelect a player to observe silently.\n" +
    "§bYou will be placed in §eSpectator Mode §bfor §e30 seconds§b,\n" +
    "§bthen automatically returned to your original location."
  );

  form.button("§e← Back to Main");
  for (var i = 0; i < onlinePlayers.length; i++) {
    form.button("§3👁 §e" + onlinePlayers[i].name);
  }

  form.show(admin).then(function(res) {
    if (res.canceled) return;
    if (res.selection === 0) { showMainMenu(admin); return; }
    var target = onlinePlayers[res.selection - 1];
    if (!target) return;
    try { startAdminMode(admin, target); } catch (e) {
      admin.sendMessage("§cFailed to start Admin Mode: " + e);
    }
  }).catch(function() {});
}
