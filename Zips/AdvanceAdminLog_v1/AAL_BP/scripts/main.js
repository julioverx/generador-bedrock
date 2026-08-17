/**
 * main.js — Advance Admin Log entry point.
 *
 * 100% Achievement Friendly — stable @minecraft/server 1.13.0,
 * no experimental features required.
 */

import { world, system } from "@minecraft/server";
import { TRIGGER_ITEM, INVENTORY_SCAN_TICKS }     from "./config.js";
import { hasAccess, maybeSetPrimary }              from "./access.js";
import { onPlayerJoin, onPlayerLeave,
         onPlayerDie, tickUpdatePlayer }           from "./playerTracker.js";
import { checkBlockPlace, scanInventoryForDanger } from "./dangerTracker.js";
import { onBlockBreak }                            from "./xrayTracker.js";
import { checkProtectedBlockBreak }                from "./blockTracker.js";
import { onBlockInteract }                         from "./containerTracker.js";
import { enforceBannedItems }                      from "./bannedEnforcer.js";
import { showMainMenu }                            from "./menus/mainMenu.js";

var pendingJoins = new Set();

// ─── Player Join ──────────────────────────────────────────────────────────────

try {
  world.afterEvents.playerJoin.subscribe(function(ev) {
    try { pendingJoins.add(ev.playerName); } catch (_) {}
  });
} catch (_) {}

// ─── Player Leave ─────────────────────────────────────────────────────────────

try {
  world.afterEvents.playerLeave.subscribe(function(ev) {
    try { onPlayerLeave(ev.player); } catch (_) {}
  });
} catch (_) {}

// ─── Player Death ─────────────────────────────────────────────────────────────

try {
  world.afterEvents.entityDie.subscribe(function(ev) {
    try {
      if (ev.deadEntity && ev.deadEntity.typeId === "minecraft:player") {
        onPlayerDie(ev.deadEntity);
      }
    } catch (_) {}
  });
} catch (_) {}

// ─── Block Place ──────────────────────────────────────────────────────────────

try {
  world.afterEvents.playerPlaceBlock.subscribe(function(ev) {
    try { checkBlockPlace(ev.player, ev.block.typeId); } catch (_) {}
  });
} catch (_) {}

// ─── Block Break (X-Ray detection & Protected Area Tracking) ──────────────────

try {
  world.afterEvents.playerBreakBlock.subscribe(function(ev) {
    try {
      var typeId = ev.brokenBlockPermutation.type.id;
      onBlockBreak(ev.player, typeId, ev.block.location);
      checkProtectedBlockBreak(ev.player, typeId, ev.block.location, ev.block.dimension);
    } catch (_) {}
  });
} catch (_) {}

// ─── Container Interaction ────────────────────────────────────────────────────

try {
  world.afterEvents.playerInteractWithBlock.subscribe(function(ev) {
    try { onBlockInteract(ev.player, ev.block); } catch (_) {}
  });
} catch (_) {}

// ─── Recovery Compass — Open Admin Menu ──────────────────────────────────────

try {
  world.afterEvents.itemUse.subscribe(function(ev) {
    try {
      if (!ev.itemStack || ev.itemStack.typeId !== TRIGGER_ITEM) return;
      var player = ev.source;
      maybeSetPrimary(player);
      if (!hasAccess(player)) return;
      showMainMenu(player);
    } catch (_) {}
  });
} catch (_) {}

// ─── Main Tick Loop ───────────────────────────────────────────────────────────

system.runInterval(function() {
  var tick    = system.currentTick;
  var players = world.getPlayers();

  // Resolve pending joins
  for (var i = 0; i < players.length; i++) {
    var pl = players[i];
    if (!_valid(pl)) continue;
    if (pendingJoins.has(pl.name)) {
      try { onPlayerJoin(pl); } catch (_) {}
      pendingJoins.delete(pl.name);
    }
  }

  // Every second: update player coords
  if (tick % 20 === 0) {
    for (var j = 0; j < players.length; j++) {
      var p = players[j];
      if (!_valid(p)) continue;
      try { tickUpdatePlayer(p); } catch (_) {}
    }
  }

  // Every INVENTORY_SCAN_TICKS: scan for dangerous items + enforce banned items
  if (tick % INVENTORY_SCAN_TICKS === 0) {
    for (var k = 0; k < players.length; k++) {
      var p2 = players[k];
      if (!_valid(p2)) continue;
      try { scanInventoryForDanger(p2); } catch (_) {}
      try { enforceBannedItems(p2);     } catch (_) {}
    }
  }

}, 1);

// ─── Utility ──────────────────────────────────────────────────────────────────

function _valid(player) {
  try {
    return typeof player.isValid === "function" ? player.isValid() : !!player;
  } catch (_) { return false; }
}
