/**
 * config.js — Advance Admin Log static configuration.
 */

// Item that opens the admin menu (right-click / use).
export var TRIGGER_ITEM = "minecraft:recovery_compass";

// Max log entries kept per log type before oldest are trimmed.
export var MAX_DANGER_LOGS    = 50;
export var MAX_XRAY_LOGS      = 50;
export var MAX_CONTAINER_LOGS = 100;
export var MAX_ACTION_LOGS    = 100;
export var MAX_BLOCK_LOGS     = 100;

export var CLAIM_MARKER_BLOCK = "aal:claim_marker";

// Admin spectator mode duration (seconds).
export var ADMIN_MODE_SECONDS = 30;

// How often (ticks) to scan inventories for banned items / danger items.
export var INVENTORY_SCAN_TICKS = 100;

// Banned items configuration keys and display labels.
// The enforcer checks each player's inventory every INVENTORY_SCAN_TICKS.
export var BANNED_ITEM_DEFS = [
  { key: "minecraft:tnt",          label: "TNT"           },
  { key: "minecraft:end_crystal",  label: "End Crystal"   },
  { key: "bundle",                 label: "Bundle (All)"  }, // special: matches any *bundle*
  { key: "minecraft:crafter",      label: "Crafter"       },
  { key: "minecraft:slime_block",  label: "Slime Block"   },
  { key: "minecraft:honey_block",  label: "Honey Block"   },
  { key: "minecraft:elytra",       label: "Elytra"        },
  { key: "minecraft:trident",      label: "Trident"       },
  { key: "minecraft:mace",         label: "Mace"          },
];

// Items considered dangerous for detection logs (by typeId fragment).
export var DANGER_ITEMS = [
  { fragment: "minecraft:tnt",            label: "TNT",               threat: "§cHigh"   },
  { fragment: "minecraft:tnt_minecart",   label: "TNT Minecart",      threat: "§cHigh"   },
  { fragment: "bundle",                   label: "Bundle",            threat: "§eMedium" },
];

// X-ray detection: diamond ore block IDs.
export var DIAMOND_ORE_IDS = [
  "minecraft:diamond_ore",
  "minecraft:deepslate_diamond_ore",
];

// X-ray threat thresholds (count within window in minutes).
export var XRAY_THREATS = [
  { label: "§c§lExtreme", minCount: 20, windowMin: 3 },
  { label: "§cHigh",      minCount: 15, windowMin: 3 },
  { label: "§eMedium",    minCount: 10, windowMin: 1 },
  { label: "§aLow",       minCount: 3,  windowMin: 1 },
];

// Container block IDs to log when interacted with.
export var LOGGABLE_CONTAINERS = {
  "minecraft:chest":        "Chest",
  "minecraft:trapped_chest":"Trapped Chest",
  "minecraft:barrel":       "Barrel",
};

// X-ray cooldown: don't re-log the same player within N ticks (5 min = 6000).
export var XRAY_LOG_COOLDOWN_TICKS = 6000;
