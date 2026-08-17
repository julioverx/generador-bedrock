/**
 * utils.js — Shared utility helpers.
 */

export function getDateTime() {
  var d    = new Date();
  var date = d.getUTCFullYear() + "-" + _p(d.getUTCMonth() + 1) + "-" + _p(d.getUTCDate());
  var time = _p(d.getUTCHours()) + ":" + _p(d.getUTCMinutes()) + ":" + _p(d.getUTCSeconds()) + " UTC";
  return { date: date, time: time };
}

function _p(n) { return n < 10 ? "0" + n : "" + n; }

export function fmtCoords(loc) {
  if (!loc) return "§7Unknown";
  return "§eX:§b" + Math.floor(loc.x) + " §eY:§b" + Math.floor(loc.y) + " §eZ:§b" + Math.floor(loc.z);
}

export function fmtDim(dimId) {
  if (!dimId) return "Unknown";
  var s = dimId.replace("minecraft:", "").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtInventory(container) {
  if (!container) return "§cCould not read inventory.";
  var lines = [];
  for (var i = 0; i < container.size; i++) {
    try {
      var item = container.getItem(i);
      if (item) {
        var id = item.typeId.replace("minecraft:", "");
        lines.push("§e" + id + " §bx" + item.amount);
      }
    } catch (_) {}
  }
  return lines.length > 0 ? lines.join("\n") : "§aInventory is empty.";
}

export function isBundle(typeId) {
  return typeof typeId === "string" && typeId.indexOf("bundle") !== -1;
}
