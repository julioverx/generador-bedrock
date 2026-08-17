/**
 * menus/mainMenu.js — Root menu for Advance Admin Log.
 */

import { ActionFormData } from "@minecraft/server-ui";
import { showPlayersMenu }     from "./playersMenu.js";
import { showDangerMenu }      from "./dangerMenu.js";
import { showBannedItemsMenu } from "./bannedItemsMenu.js";
import { showXrayMenu }        from "./xrayMenu.js";
import { showContainerMenu }   from "./containerMenu.js";
import { showAdminModeMenu }   from "./adminModeMenu.js";
import { showAccessMenu }      from "./accessMenu.js";
import { showBlockLogsMenu }   from "./blockLogsMenu.js";

export function showMainMenu(player) {
  new ActionFormData()
    .title("§c§l Advance Admin Log ")
    .body("§eWelcome, §b" + player.name + "§e.\n§6Select a feature to manage.")
    .button("§6① §ePlayer List")
    .button("§c② §eDangerous Activity Logs")
    .button("§4③ §eBanned Items")
    .button("§b④ §eX-Ray Risk Detection")
    .button("§d⑤ §eContainer Logs")
    .button("§3⑥ §eAdmin Mode")
    .button("§a⑦ §eAccess Management")
    .button("§e⑧ §eProtected Block Break Logs")
    .show(player)
    .then(function(res) {
      if (res.canceled) return;
      switch (res.selection) {
        case 0: showPlayersMenu(player);     break;
        case 1: showDangerMenu(player);      break;
        case 2: showBannedItemsMenu(player); break;
        case 3: showXrayMenu(player);        break;
        case 4: showContainerMenu(player);   break;
        case 5: showAdminModeMenu(player);   break;
        case 6: showAccessMenu(player);      break;
        case 7: showBlockLogsMenu(player);   break;
      }
    })
    .catch(function() {});
}
