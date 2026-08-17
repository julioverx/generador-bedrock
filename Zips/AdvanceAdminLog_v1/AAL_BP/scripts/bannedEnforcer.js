/**
 * bannedEnforcer.js — Enforces banned items by scanning player inventories.
 *
 * Runs every INVENTORY_SCAN_TICKS.
 * Removes any banned item found and logs the deletion.
 */

import { world } from "@minecraft/server";
import { loadBannedItems } from "./storage.js";
import { pushActionLog } from "./storage.js";
import { BANNED_ITEM_DEFS } from "./config.js";
import { getDateTime, isBundle } from "./utils.js";

export function enforceBannedItems(player) {
  try {
    var config    = loadBannedItems();
    var inv       = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return;
    var container = inv.container;

    for (var i = 0; i < container.size; i++) {
      try {
        var item = container.getItem(i);
        if (!item) continue;
        var tid = item.typeId;

        for (var j = 0; j < BANNED_ITEM_DEFS.length; j++) {
          var def     = BANNED_ITEM_DEFS[j];
          var enabled = !!config[def.key];
          if (!enabled) continue;

          var matches = def.key === "bundle"
            ? isBundle(tid)
            : tid === def.key;

          if (matches) {
            container.setItem(i); // clear the slot
            player.sendMessage("§c⚠ This item is restricted.\n§eItem: §c" + def.label);
            var dt = getDateTime();
            pushActionLog({
              action:  "Banned Item Removed",
              admin:   "System",
              target:  player.name,
              detail:  def.label + " (x" + item.amount + ")",
              date:    dt.date,
              time:    dt.time,
            });
          }
        }
      } catch (_) {}
    }
  } catch (_) {}
}
