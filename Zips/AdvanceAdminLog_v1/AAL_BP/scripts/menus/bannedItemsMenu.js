/**
 * menus/bannedItemsMenu.js — Feature 3: Toggle banned items on/off.
 */

import { ModalFormData } from "@minecraft/server-ui";
import { loadBannedItems, saveBannedItems, pushActionLog } from "../storage.js";
import { BANNED_ITEM_DEFS } from "../config.js";
import { getDateTime } from "../utils.js";
import { showMainMenu } from "./mainMenu.js";

export function showBannedItemsMenu(admin) {
  var config = loadBannedItems();

  var form = new ModalFormData()
    .title("§4§l Banned Items");

  for (var i = 0; i < BANNED_ITEM_DEFS.length; i++) {
    var def     = BANNED_ITEM_DEFS[i];
    var enabled = !!config[def.key];
    form.toggle("§e" + def.label + (enabled ? "  §c(RESTRICTED)" : "  §a(Allowed)"), enabled);
  }

  form.show(admin).then(function(res) {
    if (res.canceled) { showMainMenu(admin); return; }
    var values = res.formValues;
    var changed = [];

    for (var i = 0; i < BANNED_ITEM_DEFS.length; i++) {
      var def     = BANNED_ITEM_DEFS[i];
      var wasOn   = !!config[def.key];
      var nowOn   = !!values[i];
      config[def.key] = nowOn;
      if (wasOn !== nowOn) {
        changed.push(def.label + " → " + (nowOn ? "RESTRICTED" : "Allowed"));
      }
    }

    saveBannedItems(config);

    if (changed.length > 0) {
      var dt = getDateTime();
      for (var j = 0; j < changed.length; j++) {
        pushActionLog({
          action: "Banned Items Toggle",
          admin:  admin.name,
          detail: changed[j],
          date:   dt.date,
          time:   dt.time,
        });
      }
      admin.sendMessage("§6[§eAAL§6] §aBanned items updated: §e" + changed.join(", "));
    }

    showMainMenu(admin);
  }).catch(function() { showMainMenu(admin); });
}
