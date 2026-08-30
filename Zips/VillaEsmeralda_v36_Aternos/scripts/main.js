import { world, system, ItemStack, EnchantmentType, BlockPermutation } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

// ============================================================
// VILLA ESMERALDA - ESCRIBANO REAL (Behavior Pack v3.0)
// Kill Streaks, Milestones, Dynamic Nametags, Rankings, K/D
// ============================================================

const DISCORD_RULES_LINK = "https://discord.gg/aYm58cDb8";
const playersInOffice = new Set();
let sidebarTimer = null;

// Strictly Hostile Mobs Filter (Excludes passive farm animals)
const HOSTILE_MOBS = new Set([
  "minecraft:zombie", "minecraft:zombie_villager", "minecraft:husk", "minecraft:drowned", "minecraft:zombified_piglin",
  "minecraft:skeleton", "minecraft:stray", "minecraft:wither_skeleton",
  "minecraft:creeper", "minecraft:spider", "minecraft:cave_spider",
  "minecraft:phantom", "minecraft:enderman", "minecraft:witch",
  "minecraft:slime", "minecraft:magma_cube", "minecraft:blaze", "minecraft:ghast",
  "minecraft:silverfish", "minecraft:endermite", "minecraft:guardian", "minecraft:elder_guardian",
  "minecraft:piglin", "minecraft:piglin_brute", "minecraft:hoglin", "minecraft:zoglin",
  "minecraft:pillager", "minecraft:vindicator", "minecraft:evoker", "minecraft:ravager", "minecraft:vex",
  "minecraft:shulker", "minecraft:warden", "minecraft:wither", "minecraft:ender_dragon", "minecraft:breeze"
]);

function isHostileMob(entity) {
  if (!entity || !entity.typeId) return false;
  return HOSTILE_MOBS.has(entity.typeId);
}

// Kill Streak tracking (resets on death)
const killStreaks = new Map();

const VILLA_TIPS = [
  "Respeta siempre las construcciones ajenas y las zonas comunes.",
  "Comercia de forma justa en el Spawn y evita las estafas.",
  "Visita la Oficina del Escribano Real para ver tus titulos.",
  "El respeto entre ciudadanos es la ley suprema de Villa Esmeralda.",
  "Demuestra tu valor derrotando a los Jefes Supremos del reino."
];

// Milestone thresholds
const MILESTONES = {
  MobsKilled: [
    { at: 50, label: "[LOGRO]", msg: "ha asesinado 50 mobs hostiles", color: "§e" },
    { at: 100, label: "[LOGRO RARO]", msg: "alcanzo los 100 mobs eliminados", color: "§6" },
    { at: 250, label: "[LOGRO EPICO]", msg: "ha destruido 250 criaturas hostiles", color: "§5" },
    { at: 500, label: "[LOGRO LEGENDARIO]", msg: "supero las 500 bajas de mobs", color: "§d" },
    { at: 1000, label: "[LOGRO MITICO]", msg: "alcanzo las 1000 bajas de mobs", color: "§4" }
  ],
  BloquesPicados: [
    { at: 100, label: "[LOGRO]", msg: "ha picado 100 bloques", color: "§e" },
    { at: 500, label: "[LOGRO RARO]", msg: "alcanzo los 500 bloques picados", color: "§6" },
    { at: 1000, label: "[LOGRO EPICO]", msg: "supero los 1000 bloques picados", color: "§5" },
    { at: 5000, label: "[LOGRO LEGENDARIO]", msg: "alcanzo los 5000 bloques picados", color: "§d" }
  ],
  PvPKills: [
    { at: 1, label: "[PRIMERA SANGRE]", msg: "cobro su primera victima en PvP", color: "§4" },
    { at: 10, label: "[LOGRO RARO]", msg: "alcanzo 10 bajas en PvP", color: "§6" },
    { at: 25, label: "[LOGRO EPICO]", msg: "supero las 25 bajas en PvP", color: "§5" },
    { at: 50, label: "[LOGRO LEGENDARIO]", msg: "alcanzo 50 bajas en PvP", color: "§d" }
  ],
  BossesKilled: [
    { at: 1, label: "[LOGRO EPICO]", msg: "derroto a su primer Jefe Supremo", color: "§5" },
    { at: 5, label: "[LOGRO LEGENDARIO]", msg: "ha derrotado 5 Jefes Supremos", color: "§d" },
    { at: 10, label: "[LOGRO MITICO]", msg: "ha destruido 10 Jefes Supremos", color: "§4" }
  ]
};

// Kill Streak thresholds
const STREAK_THRESHOLDS = [
  { at: 3, label: "RACHA", color: "§c", msg: "lleva 3 bajas seguidas" },
  { at: 5, label: "MASACRE", color: "§4", msg: "esta imparable con 5 bajas" },
  { at: 10, label: "LEYENDA", color: "§5", msg: "ha alcanzado 10 bajas sin caer" },
  { at: 15, label: "DIOS DE LA GUERRA", color: "§d", msg: "tiene 15 bajas consecutivas" },
  { at: 20, label: "INMORTAL", color: "§6", msg: "20 bajas sin morir, es indetenible" },
  { at: 25, label: "MITICO", color: "§e", msg: "ha logrado 25 bajas consecutivas" },
  { at: 30, label: "SEÑOR DE LA DESTRUCCION", color: "§4", msg: "ha aniquilado a 30 sin ser tocado" },
  { at: 40, label: "TITAN", color: "§5", msg: "alcanzo 40 bajas seguidas... ¡Una locura!" },
  { at: 50, label: "SEMI-DIOS", color: "§b", msg: "¡MEDIO CENTENAR DE BAJAS! 50 kills sin morir" },
  { at: 100, label: "DIOS SUPREMO", color: "§3", msg: "¡100 BAJAS! Una deidad camina entre nosotros" },
  { at: 200, label: "HERALDO DE LA MUERTE", color: "§4", msg: "ha alcanzado las 200 bajas. ¡Corran por sus vidas!" },
  { at: 300, label: "EXTERMINADOR", color: "§c", msg: "lleva 300 bajas. No tiene piedad." },
  { at: 400, label: "VERDUGO IMPLACABLE", color: "§5", msg: "ya sumo 400 bajas a su cuenta." },
  { at: 500, label: "PESADILLA VIVIENTE", color: "§d", msg: "¡500 BAJAS! Medio millar de almas devoradas." },
  { at: 600, label: "APOCALIPSIS", color: "§6", msg: "¡600 BAJAS! El fin del mundo tiene nombre." },
  { at: 700, label: "DEMONIO PRIMORDIAL", color: "§e", msg: "¡700 BAJAS! Un ser de pura maldad." },
  { at: 800, label: "COLOSO", color: "§b", msg: "¡800 BAJAS! Imparable. Inmortal. Invencible." },
  { at: 900, label: "DESTRUCTOR DE MUNDOS", color: "§4", msg: "¡900 BAJAS! Solo cenizas quedan a su paso." },
  { at: 1000, label: "ASESINO EN SERIE", color: "§3", msg: "ha alcanzado 1000 Mobs Kills y es el Asesino en Serie oficial!" }
];

// ============================================================
// SCOREBOARDS INITIALIZATION
// ============================================================

function initializeScoreboards() {
  try {
    const sb = world.scoreboard;
    const list = [
      { id: "MobsKilled", name: "§c§lMobs Asesinados" },
      { id: "PvPKills", name: "§4§lBajas en Duelos" },
      { id: "BloquesPicados", name: "§e§lBloques Picados" },
      { id: "GranjaTotal", name: "§a§lGranja y Cosecha" },
      { id: "BossesKilled", name: "§5§lJefes Derrotados" },
      { id: "MuertesTotal", name: "§8§lMuertes Totales" }
    ];
    for (const o of list) {
      if (!sb.getObjective(o.id)) sb.addObjective(o.id, o.name);
    }
  } catch (e) {}
}

initializeScoreboards();
world.afterEvents.worldInitialize.subscribe(() => initializeScoreboards());

function isPlayerIgnored(player) {
  try {
    if (!player || !player.isValid()) return true;
    if (player.hasTag("ignorar_escribano") || player.hasTag("ignorar_sistema") || player.hasTag("ignorar_escribano_temp")) return true;
  } catch (e) {}
  return false;
}

function incrementScore(player, objId) {
  try {
    if (isPlayerIgnored(player)) return;
    let obj = world.scoreboard.getObjective(objId);
    if (!obj) obj = world.scoreboard.addObjective(objId, objId);
    if (player) {
      player.runCommandAsync("scoreboard players add @s " + objId + " 1");
    }
  } catch (e) {}
}

function givePreEnchantedItem(player, itemTypeId, enchantments, customName = null) {
  try {
    if (!player || !player.isValid()) return;
    const item = new ItemStack(itemTypeId, 1);
    if (customName) item.nameTag = customName;
    const enchantComp = item.getComponent("minecraft:enchantable");
    if (enchantComp) {
      for (const enc of enchantments) {
        try {
          enchantComp.addEnchantment({
            type: new EnchantmentType(enc.id),
            level: enc.level
          });
        } catch (err) {}
      }
    }
    const inv = player.getComponent("inventory")?.container;
    if (inv) {
      inv.addItem(item);
    }
  } catch (e) {}
}

function giveEnchantedBookItem(player, enchantments) {
  try {
    if (!player || !player.isValid()) return;
    const book = new ItemStack("minecraft:enchanted_book", 1);
    const enchantComp = book.getComponent("minecraft:enchantable");
    if (enchantComp) {
      for (const enc of enchantments) {
        try {
          enchantComp.addEnchantment({
            type: new EnchantmentType(enc.id),
            level: enc.level
          });
        } catch (err) {}
      }
    }
    const inv = player.getComponent("inventory")?.container;
    if (inv) {
      inv.addItem(book);
    }
  } catch (e) {}
}

function getCitizenRank(player) {
  try {
    let specialBadges = 0;
    if (player.hasTag("tag_rey_guerra")) specialBadges++;
    if (player.hasTag("tag_leyenda_minera")) specialBadges++;
    if (player.hasTag("tag_lider_granjero")) specialBadges++;
    if (player.hasTag("tag_contratista_real")) specialBadges++;
    if (player.hasTag("tag_asesino_serie")) specialBadges++;
    if (player.hasTag("leyenda_500")) specialBadges++;
    if (player.getDynamicProperty("custom_ach_matadrakos") || player.hasTag("tag_matadrakos")) specialBadges++;
    if (player.getDynamicProperty("custom_ach_dios_wither") || player.hasTag("tag_dios_wither")) specialBadges++;
    if (player.getDynamicProperty("custom_ach_rey_poseidon") || player.hasTag("tag_rey_poseidon")) specialBadges++;

    if (specialBadges >= 3) return "§6[Leyenda de la Villa]§r ";
    if (specialBadges >= 1) return "§5[Veterano]§r ";

    const bloques = getScore(player, "BloquesPicados");
    const questsDone = player.getDynamicProperty("total_quests_completed") ?? 0;
    if (bloques >= 1000 || questsDone >= 1) return "§e[Residente]§r ";

    return "§7[Novato]§r ";
  } catch (e) {
    return "§7[Novato]§r ";
  }
}

const QUEST_POOLS = {
  mining: [
    { id: 0, title: "Picar 150 Bloques", target: 150, desc: "150 bloques", em: 10, xp: 10 },
    { id: 1, title: "Picar 300 Bloques", target: 300, desc: "300 bloques", em: 10, xp: 10 },
    { id: 2, title: "Picar 250 Bloques de Piedra", target: 250, desc: "250 bloques", em: 10, xp: 10, typeCheck: "stone_strict" },
    { id: 3, title: "Picar 50 Minerales (Menas)", target: 50, desc: "50 minerales", em: 10, xp: 10, typeCheck: "ore_strict" },
    { id: 4, title: "Picar 1,000 Bloques (Difícil)", target: 1000, desc: "1,000 bloques", em: 30, xp: 25 },
    { id: 5, title: "Picar 100 Minerales (Difícil)", target: 100, desc: "100 minerales", em: 30, xp: 25, typeCheck: "ore_strict" },
    { id: 6, title: "Picar 600 Bloques Profundos (Difícil)", target: 600, desc: "600 bloques de pizarra", em: 30, xp: 25, typeCheck: "deepslate_strict" },
    { id: 7, title: "Picar 2,500 Bloques (Extrema)", target: 2500, desc: "2,500 bloques", em: 70, xp: 50 },
    { id: 8, title: "Picar 4,000 Bloques (Extrema)", target: 4000, desc: "4,000 bloques", em: 70, xp: 50 },
    { id: 9, title: "Gran Minería del Reino (ULTRA EXTREMA)", target: 7500, desc: "7,500 bloques (Eficiencia V + Faro)", em: 250, xp: 100 }
  ],
  hunting: [
    { id: 0, title: "Cazar 25 Monstruos Hostiles", target: 25, desc: "25 monstruos", em: 10, xp: 10 },
    { id: 1, title: "Cazar 40 Mobs Hostiles", target: 40, desc: "40 mobs hostiles", em: 10, xp: 10 },
    { id: 2, title: "Cazar 20 Creepers o Arañas", target: 20, desc: "20 creepers o arañas", em: 10, xp: 10, typeCheck: "creeper_spider" },
    { id: 3, title: "Cazar 30 Monstruos Nocturnos", target: 30, desc: "30 monstruos", em: 10, xp: 10 },
    { id: 4, title: "Cazar 40 Esqueletos o Zombis (Difícil)", target: 40, desc: "40 monstruos", em: 30, xp: 25, typeCheck: "skeleton_zombie" },
    { id: 5, title: "Cazar 50 Criaturas de Sombras (Difícil)", target: 50, desc: "50 criaturas de sombras", em: 30, xp: 25, typeCheck: "shadow_creatures" },
    { id: 6, title: "Cazar 80 Mobs Hostiles (Difícil)", target: 80, desc: "80 mobs hostiles", em: 30, xp: 25 },
    { id: 7, title: "Cazar 120 Mobs Hostiles (Extrema)", target: 120, desc: "120 mobs hostiles", em: 70, xp: 50 },
    { id: 8, title: "Cazar 160 Mobs Hostiles (Extrema)", target: 160, desc: "160 mobs hostiles", em: 70, xp: 50 },
    { id: 9, title: "Cacería Mítica del Reino (ULTRA EXTREMA)", target: 350, desc: "350 mobs hostiles (Filo V)", em: 250, xp: 100 }
  ],
  exploration: [
    { id: 0, title: "Recorrer 3,000 Bloques", target: 3000, desc: "3,000 bloques", em: 10, xp: 10 },
    { id: 1, title: "Recorrer 4,500 Bloques", target: 4500, desc: "4,500 bloques", em: 10, xp: 10 },
    { id: 2, title: "Recorrer 5,000 Bloques", target: 5000, desc: "5,000 bloques", em: 10, xp: 10 },
    { id: 3, title: "Recorrer 6,000 Bloques (Difícil)", target: 6000, desc: "6,000 bloques", em: 30, xp: 25 },
    { id: 4, title: "Recorrer 8,000 Bloques (Difícil)", target: 8000, desc: "8,000 bloques", em: 30, xp: 25 },
    { id: 5, title: "Recorrer 10,000 Bloques (Difícil)", target: 10000, desc: "10,000 bloques", em: 30, xp: 25 },
    { id: 6, title: "Recorrer 12,000 Bloques (Difícil)", target: 12000, desc: "12,000 bloques", em: 30, xp: 25 },
    { id: 7, title: "Recorrer 15,000 Bloques (Extrema)", target: 15000, desc: "15,000 bloques", em: 70, xp: 50 },
    { id: 8, title: "Recorrer 20,000 Bloques (Extrema)", target: 20000, desc: "20,000 bloques", em: 70, xp: 50 },
    { id: 9, title: "Gran Travesía del Reino (ULTRA EXTREMA)", target: 35000, desc: "35,000 bloques (Elytra/Caballo)", em: 250, xp: 100 }
  ],
  farming: [
    { id: 0, title: "Cosechar 50 Cultivos", target: 50, desc: "50 cultivos", em: 10, xp: 10, typeCheck: "crop_harvest" },
    { id: 1, title: "Plantar 25 Retoños de Árboles", target: 25, desc: "25 retoños", em: 10, xp: 10, typeCheck: "sapling_plant" },
    { id: 2, title: "Talar 50 Troncos de Madera", target: 50, desc: "50 troncos", em: 10, xp: 10, typeCheck: "log_chop" },
    { id: 3, title: "Cosechar 150 Cultivos (Difícil)", target: 150, desc: "150 cultivos", em: 30, xp: 25, typeCheck: "crop_harvest" },
    { id: 4, title: "Talar 200 Troncos de Madera (Difícil)", target: 200, desc: "200 troncos", em: 30, xp: 25, typeCheck: "log_chop" },
    { id: 5, title: "Plantar 60 Retoños de Árboles (Difícil)", target: 60, desc: "60 retoños", em: 30, xp: 25, typeCheck: "sapling_plant" },
    { id: 6, title: "Cosechar 400 Cultivos (Extrema)", target: 400, desc: "400 cultivos", em: 70, xp: 50, typeCheck: "crop_harvest" },
    { id: 7, title: "Talar 500 Troncos de Madera (Extrema)", target: 500, desc: "500 troncos", em: 70, xp: 50, typeCheck: "log_chop" },
    { id: 8, title: "Gran Cosecha y Tala (ULTRA EXTREMA)", target: 700, desc: "700 cultivos/troncos (Eficiencia V)", em: 250, xp: 100, typeCheck: "farm_ultra" }
  ]
};

const WEEKLY_CONTRACTS = [
  { id: 0, title: "Devorador de Titanes", desc: "Eliminar 1,000 Mobs Hostiles", target: 1000, relicType: "guerrero", relicName: "Espada Mítica Divina (Fuerza II Pasiva)", typeCheck: "contract_mobs" },
  { id: 1, title: "El Infierno de Netherite", desc: "Picar 100 Ancient Debris", target: 100, relicType: "herrero", relicName: "Pico Mítico Divino (Prisa II Pasiva)", typeCheck: "contract_debris" },
  { id: 2, title: "El Granero Imperial", desc: "Cosechar 3,000 Cultivos y 2,000 Troncos", target: 5000, relicType: "agricola", relicName: "Azada Mítica Divina + Hacha Mítica Divina (Prisa II Pasiva)", typeCheck: "contract_farm" },
  { id: 3, title: "La Odisea Dimensional", desc: "Recorrer 75,000 Bloques en el mundo", target: 75000, relicType: "armadura", relicName: "Botas Míticas Divinas (Velocidad II + Regeneración I) + 8 Notch Apples", typeCheck: "contract_explore" },
  { id: 4, title: "Señor de la Guerra Total", desc: "Lograr 1,800 Mobs Hostiles / PvP en la semana", target: 1800, relicType: "guerrero", relicName: "Pechera Mítica Divina (Resistencia II) + Espada Mítica Divina", typeCheck: "contract_war" },
  { id: 5, title: "Buscador de Mitos Submarinos", desc: "Extraer / Cepillar 25 Arenas o Gravas Sospechosas", target: 25, relicType: "armadura", relicName: "Casco Mítico Divino (Visión Nocturna + Gracia de Delfín) + Tridente Mítico Divino", typeCheck: "contract_ocean" },
  { id: 6, title: "Fiebre de Pizarra Profunda", desc: "Picar 8,000 Bloques Profundos (Deepslate)", target: 8000, relicType: "herrero", relicName: "Pico Mítico Divino (Prisa II Pasiva)", typeCheck: "contract_deepslate" },
  { id: 7, title: "La Prueba del Rey (La Cumbre)", desc: "2 Withers + 1 Ender Dragon + 50 Ancient Debris", target: 53, relicType: "trilogia", relicName: "Set Mítico Divino (Espada + Pico + Polainas)", typeCheck: "contract_king" }
];

function getWeeklyContractConfig(dayNumber) {
  const currentWeek = Math.floor(Math.max(0, dayNumber || 0) / 7);
  const idx = currentWeek % WEEKLY_CONTRACTS.length;
  return WEEKLY_CONTRACTS[idx];
}

function checkAndUpdateWeeklyContract(player) {
  try {
    if (!player || !player.isValid()) return;
    const currentWeek = Math.floor(Math.max(0, world.getDay() || 0) / 7);
    const lastWeek = player.getDynamicProperty("last_contract_week") ?? -1;

    if (lastWeek !== currentWeek) {
      player.setDynamicProperty("last_contract_week", currentWeek);
      player.setDynamicProperty("q_weekly_cnt", 0);
      player.setDynamicProperty("q_farm_crops_cnt", 0);
      player.setDynamicProperty("q_farm_logs_cnt", 0);
      player.setDynamicProperty("q_weekly_done", false);

      // Title Screen Alert & Chat Announcement on start of new Weekly Contract!
      const contract = getWeeklyContractConfig(world.getDay());
      try {
        player.onScreenDisplay.setTitle("§6§l[CONTRATO SEMANAL MÍTICO]§r");
        player.onScreenDisplay.setSubtitle(`§e${contract.title} §7- Ve a donde el Ministro`);
        player.playSound("random.levelup", { volume: 1.0, pitch: 0.8 });
      } catch (e) {}

      try {
        world.sendMessage(
          `\n§6§l===========================================§r\n` +
          `§e§l[NUEVO CONTRATO SEMANAL MÍTICO DISPONIBLE]§r\n` +
          `§f¡Ha comenzado una nueva Semana Mítica! Ve a donde el §a§lMinistro§r §7a revisar el nuevo desafío:\n` +
          `§6Desafío: §e"${contract.title}"\n` +
          `§7Objetivo: §f${contract.desc}\n` +
          `§7Recompensas: §a${contract.relicName} + 256 Bloques Esmeralda + 8 Netherite + 500L XP\n` +
          `§6===========================================§r\n`
        );
      } catch (e) {}
    }
  } catch (e) {}
}

function processWeeklyContractReward(player, contract) {
  try {
    if (isPlayerIgnored(player)) return;

    const rewardKey = `reward_contract_${contract.id}`;
    const alreadyRewarded = player.getDynamicProperty(rewardKey) ?? false;

    if (alreadyRewarded) {
      // Repeatable "Loop" Veteran Contract Reward: 1 Netherite Ingot + 500L XP
      player.runCommandAsync("xp 500L @s");
      player.runCommandAsync("give @s netherite_ingot 1");
      player.setDynamicProperty("q_weekly_done", true);
      world.sendMessage(
        `\n§6§l===========================================§r\n` +
        `§c§l[RECOMPENSA VETERANA DE CONTRATO]§r\n` +
        `§f¡${player.name} §7ha vuelto a completar el Contrato Semanal: §e"${contract.title}"!§r\n` +
        `§7Como Héroe Veterano recibe §e1 Lingote de Netherite §7y §b500L XP!\n` +
        `§6===========================================§r\n`
      );
      for (const p of world.getAllPlayers()) {
        try { p.playSound("ui.toast.challenge_complete", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
      }
      return;
    }

    player.setDynamicProperty(rewardKey, true);
    player.setDynamicProperty("q_weekly_done", true);
    player.addTag("tag_contratista_real");
    grantCustomAchievement(player, "contratista_real", "Contratista Real");

    // Full Screen Title Broadcast to ALL players on the server!
    for (const p of world.getAllPlayers()) {
      try {
        p.onScreenDisplay.setTitle("§c§l[CONTRATISTA REAL]§r");
        p.onScreenDisplay.setSubtitle(`§f¡${player.name} §7ha completado: §e"${contract.title}"!§r`);
        p.playSound("ui.toast.challenge_complete", { volume: 1.0, pitch: 1.0 });
        p.playSound("ambient.weather.thunder", { volume: 0.8, pitch: 1.0 });
      } catch (e) {}
    }

    world.sendMessage(
      `\n§6§l===========================================§r\n` +
      `§c§l[CONTRATO MÍTICO COMPLETADO POR UN HÉROE]§r\n` +
      `§f¡${player.name} §7ha logrado lo imposible completando el Contrato Semanal: §e"${contract.title}"!§r\n` +
      `§7Ha sido coronado como §c[Contratista Real] §7y recibe sus Reliquias Míticas Supremas!\n` +
      `§6===========================================§r\n`
    );

    // Give Relic Rewards (Common base rewards: Emerald Blocks, Netherite Ingots, XP - NO ANVILS!)
    if (contract.id === 7) {
      player.runCommandAsync("xp 1000L @s");
      player.runCommandAsync("give @s emerald_block 512");
      player.runCommandAsync("give @s netherite_ingot 16");
    } else {
      player.runCommandAsync("xp 500L @s");
      player.runCommandAsync("give @s emerald_block 256");
      player.runCommandAsync("give @s netherite_ingot 8");
    }

    if (contract.id === 0) { // Devorador de Titanes
      givePreEnchantedItem(player, "minecraft:netherite_sword", [{id:"sharpness",level:5},{id:"fire_aspect",level:2},{id:"looting",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§cEspada Mítica Divina§r");
    } else if (contract.id === 1) { // El Infierno de Netherite
      givePreEnchantedItem(player, "minecraft:netherite_pickaxe", [{id:"efficiency",level:5},{id:"fortune",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§cPico Mítico Divino§r");
    } else if (contract.id === 2) { // El Granero Imperial
      givePreEnchantedItem(player, "minecraft:netherite_hoe", [{id:"efficiency",level:5},{id:"fortune",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§cAzada Mítica Divina§r");
      givePreEnchantedItem(player, "minecraft:netherite_axe", [{id:"efficiency",level:5},{id:"sharpness",level:5},{id:"unbreaking",level:3},{id:"mending",level:1}], "§cHacha Mítica Divina§r");
    } else if (contract.id === 3) { // La Odisea Dimensional
      givePreEnchantedItem(player, "minecraft:netherite_boots", [{id:"protection",level:4},{id:"feather_falling",level:4},{id:"depth_strider",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§cBotas Míticas Divinas§r");
      player.runCommandAsync("give @s enchanted_golden_apple 8");
    } else if (contract.id === 4) { // Señor de la Guerra Total
      givePreEnchantedItem(player, "minecraft:netherite_chestplate", [{id:"protection",level:4},{id:"thorns",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§cPechera Mítica Divina§r");
      givePreEnchantedItem(player, "minecraft:netherite_sword", [{id:"sharpness",level:5},{id:"fire_aspect",level:2},{id:"looting",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§cEspada Mítica Divina§r");
    } else if (contract.id === 5) { // Buscador de Mitos Submarinos
      givePreEnchantedItem(player, "minecraft:netherite_helmet", [{id:"protection",level:4},{id:"respiration",level:3},{id:"aqua_affinity",level:1},{id:"thorns",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§cCasco Mítico Divino§r");
      givePreEnchantedItem(player, "minecraft:trident", [{id:"channeling",level:1},{id:"loyalty",level:3},{id:"impaling",level:5},{id:"unbreaking",level:3},{id:"mending",level:1}], "§cTridente Mítico Divino§r");
    } else if (contract.id === 6) { // Fiebre de Esmeraldas Intactas
      givePreEnchantedItem(player, "minecraft:netherite_pickaxe", [{id:"efficiency",level:5},{id:"fortune",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§cPico Mítico Divino§r");
    } else if (contract.id === 7) { // La Prueba del Rey
      givePreEnchantedItem(player, "minecraft:netherite_leggings", [{id:"protection",level:4},{id:"thorns",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§cPolainas Míticas Divinas§r");
      givePreEnchantedItem(player, "minecraft:netherite_sword", [{id:"sharpness",level:5},{id:"fire_aspect",level:2},{id:"looting",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§cEspada Mítica Divina§r");
      givePreEnchantedItem(player, "minecraft:netherite_pickaxe", [{id:"efficiency",level:5},{id:"fortune",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§cPico Mítico Divino§r");
    }
  } catch (e) {}
}

function getDailyQuestConfig(dayNumber) {
  const safeDay = Math.max(0, dayNumber || 0);
  const hash1 = Math.floor(Math.abs(Math.sin(safeDay * 12.9898 + 78.233)) * 43758.5453);
  const hash2 = Math.floor(Math.abs(Math.sin(safeDay * 43.1415 + 12.871)) * 23421.6312);
  const hash3 = Math.floor(Math.abs(Math.sin(safeDay * 93.3142 + 45.123)) * 65432.1234);
  const hash4 = Math.floor(Math.abs(Math.sin(safeDay * 57.1932 + 31.984)) * 87654.3210);

  const mineIdx = hash1 % QUEST_POOLS.mining.length;
  const huntIdx = hash2 % QUEST_POOLS.hunting.length;
  const expIdx = hash3 % QUEST_POOLS.exploration.length;
  const farmIdx = hash4 % QUEST_POOLS.farming.length;

  return {
    mine: QUEST_POOLS.mining[mineIdx],
    hunt: QUEST_POOLS.hunting[huntIdx],
    explore: QUEST_POOLS.exploration[expIdx],
    farm: QUEST_POOLS.farming[farmIdx]
  };
}

function checkAndUpdateDailyQuests(player) {
  try {
    if (!player || !player.isValid()) return;
    const currentDay = world.getDay();
    const lastDay = player.getDynamicProperty("last_quest_day") ?? -1;

    if (lastDay !== currentDay) {
      player.setDynamicProperty("last_quest_day", currentDay);
      player.setDynamicProperty("q_mine_cnt", 0);
      player.setDynamicProperty("q_hunt_cnt", 0);
      player.setDynamicProperty("q_explore_cnt", 0);
      player.setDynamicProperty("q_farm_cnt", 0);
      player.setDynamicProperty("q_mine_done", false);
      player.setDynamicProperty("q_hunt_done", false);
      player.setDynamicProperty("q_explore_done", false);
      player.setDynamicProperty("q_farm_done", false);
      player.setDynamicProperty("last_loc_x", Math.floor(player.location.x));
      player.setDynamicProperty("last_loc_z", Math.floor(player.location.z));
    }
  } catch (e) {}
}

function isDoubleEventActive() {
  try {
    const currentDay = world.getDay();
    if (currentDay > 0 && currentDay % 100 === 0) return true;
    if (world.getDynamicProperty("evento_doble_xp") === true) return true;
  } catch (e) {}
  return false;
}

function isRedMoonEclipseActive() {
  try {
    if (world.getDynamicProperty("evento_luna_roja") === true) return true;
    const currentDay = world.getDay();
    if (currentDay > 0 && currentDay % 30 === 0) {
      const timeOfDay = world.getTimeOfDay();
      if (timeOfDay >= 13000 && timeOfDay <= 23000) return true;
    }
  } catch (e) {}
  return false;
}

function isRedMoonPhase2Active() {
  try {
    const timeOfDay = world.getTimeOfDay();
    return timeOfDay >= 18000 || world.getDynamicProperty("evento_luna_roja_furia") === true;
  } catch (e) {
    return false;
  }
}

function processQuestReward(player, questName, emeralds = 10, xpLevel = 10) {
  try {
    const mult = isDoubleEventActive() ? 2 : 1;
    const finalEm = emeralds * mult;
    const finalXp = xpLevel * mult;

    player.runCommandAsync(`give @s emerald ${finalEm}`);
    player.runCommandAsync(`xp ${finalXp}L @s`);
    const totalQuests = (player.getDynamicProperty("total_quests_completed") ?? 0) + 1;
    player.setDynamicProperty("total_quests_completed", totalQuests);

    const eventTag = isDoubleEventActive() ? " §6🔥 [¡FESTIVAL DOBLE ACTIVADO!]" : "";

    world.sendMessage(`\n§a§l[MISIÓN COMPLETADA]§r${eventTag}\n§f${player.name} §7completó la Misión Diaria §e${questName} §7y recibió §a${finalEm} Esmeraldas §7y §b${finalXp} Niveles de XP!\n`);

    for (const p of world.getAllPlayers()) {
      try { p.playSound("random.levelup", { volume: 0.8, pitch: 1.2 }); } catch (e) {}
    }
  } catch (e) {}
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getScore(player, objId) {
  try {
    const obj = world.scoreboard.getObjective(objId);
    if (!obj) return 0;
    return obj.getScore(player) ?? 0;
  } catch (e) { return 0; }
}

function getRank(player, objId) {
  try {
    const obj = world.scoreboard.getObjective(objId);
    if (!obj) return "-";
    const scores = obj.getScores();
    scores.sort((a, b) => b.score - a.score);
    const idx = scores.findIndex(s => s.participant.displayName === player.name);
    return idx === -1 ? "Sin Rango" : `#${idx + 1}`;
  } catch (e) { return "-"; }
}

function getTopPlayer(objId) {
  try {
    const obj = world.scoreboard.getObjective(objId);
    if (!obj) return null;
    const scores = obj.getScores();
    if (scores.length === 0) return null;
    scores.sort((a, b) => b.score - a.score);

    const topScore = scores[0].score;

    // Check if any online player matching top score has a valid Gamertag
    for (const s of scores) {
      if (s.score === topScore) {
        const dName = s.participant.displayName;
        if (dName && !dName.includes("commands.scoreboard.players")) {
          try { world.setDynamicProperty("top_name_" + objId, dName); } catch (e) {}
          return { name: dName, score: topScore };
        }
      }
    }

    // Fallback to cached Gamertag if player is offline
    const cachedName = world.getDynamicProperty("top_name_" + objId);
    if (cachedName) {
      return { name: `${cachedName} (Offline)`, score: topScore };
    }

    return { name: "Lider Leyenda", score: topScore };
  } catch (e) { return null; }
}

function showSidebarWithTimer(objectiveId) {
  try {
    const dim = world.getDimension("overworld");
    dim.runCommandAsync(`scoreboard objectives setdisplay sidebar ${objectiveId}`);
    if (sidebarTimer) system.clearRun(sidebarTimer);
    sidebarTimer = system.runTimeout(() => {
      try {
        dim.runCommandAsync("scoreboard objectives setdisplay sidebar");
        sidebarTimer = null;
      } catch (e) {}
    }, 300);
  } catch (e) {}
}

/**
 * Check and announce milestones for a player in a given objective.
 * Uses dynamic properties to avoid re-announcing.
 */
function checkMilestones(player, objId) {
  try {
    if (isPlayerIgnored(player)) return;
    const milestones = MILESTONES[objId];
    if (!milestones) return;

    const score = getScore(player, objId);

    for (const m of milestones) {
      if (score >= m.at) {
        const propKey = `milestone_${objId}_${m.at}`;
        const alreadyAnnounced = player.getDynamicProperty(propKey);
        if (!alreadyAnnounced) {
          player.setDynamicProperty(propKey, true);
          // Announce to entire server
          world.sendMessage(`\n${m.color}${m.label} §f${player.name} §7${m.msg}\n`);
          // Play achievement sound for everyone
          for (const p of world.getAllPlayers()) {
            try {
              p.playSound("random.levelup", { volume: 0.6, pitch: 1.2 });
            } catch (e) {}
          }
        }
      }
    }
  } catch (e) {}
}

/**
 * Process a kill for streak tracking and announce thresholds.
 */
function processKillStreak(player) {
  try {
    if (isPlayerIgnored(player)) return;
    const mobs = getScore(player, "MobsKilled");
    const savedCurrent = player.getDynamicProperty("current_streak") ?? 0;
    const memoryCurrent = killStreaks.get(player.id) ?? 0;
    let base = Math.max(savedCurrent, memoryCurrent);

    // Sanity check: if streak exceeds mobs killed due to farm or score edit, reset base
    if (base > mobs + 5) {
      base = 0;
    }

    const current = base + 1;

    killStreaks.set(player.id, current);
    try { player.setDynamicProperty("current_streak", current); } catch (e) {}

    const savedHighest = player.getDynamicProperty("highest_streak") ?? 0;
    const highest = Math.max(savedHighest, current);
    try { player.setDynamicProperty("highest_streak", highest); } catch (e) {}

    // Reward for 1000 kills streak (Asesino en Serie)
    if (current === 1000) {
      if (!player.getDynamicProperty("reward_1000mobs")) {
        player.setDynamicProperty("reward_1000mobs", true);
        player.addTag("tag_asesino_serie");
        grantCustomAchievement(player, "asesino_serie", "Asesino en Serie");
        player.runCommandAsync("xp 200L @s");
        player.runCommandAsync("give @s netherite_ingot 10");
        player.runCommandAsync("give @s emerald_block 640");
        player.runCommandAsync("give @s iron_block 640");
        player.runCommandAsync("give @s lapis_block 256");
        givePreEnchantedItem(player, "minecraft:netherite_chestplate", [{id:"protection",level:4},{id:"thorns",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§6Pechera del Asesino en Serie§r");
        world.sendMessage(`\n§6§l[RECOMPENSA DE RACHA LEGENDARIA]§r\n§f${player.name} §7ha conseguido una racha legendaria de §e1,000 BAJAS CONSECUTIVAS §7y recibe la Pechera del Asesino en Serie, 10 Lingotes de Netherite, 10 Stacks de Esmeralda, 10 Stacks de Hierro, 4 Stacks de Lapislázuli y 200L XP!\n`);
      } else {
        // Subsequent 1000 Mob Streak in new life: Veteran Reward (1 Netherite Ingot + 200L XP)
        player.runCommandAsync("xp 200L @s");
        player.runCommandAsync("give @s netherite_ingot 1");
        world.sendMessage(`\n§6§l[RECOMPENSA DE RACHA VETERANA]§r\n§f${player.name} §7ha vuelto a lograr una racha imparable de §e1,000 BAJAS CONSECUTIVAS §7y recibe §e1 Lingote de Netherite §7y §b200L XP!\n`);
      }
      for (const p of world.getAllPlayers()) {
        try { p.playSound("ui.toast.challenge_complete", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
      }
    }

    for (const t of STREAK_THRESHOLDS) {
      if (current === t.at) {
        world.sendMessage(`\n${t.color}[${t.label}] §f${player.name} §7${t.msg}\n`);
        // Play dramatic sound for everyone
        for (const p of world.getAllPlayers()) {
          try {
            p.playSound("mob.wither.spawn", { volume: 0.3, pitch: 1.5 });
          } catch (e) {}
        }
        break;
      }
    }
  } catch (e) {}
}

/**
 * Reset kill streak on death and announce if it was significant.
 */
function resetKillStreak(player, killerName) {
  try {
    const savedCurrent = player.getDynamicProperty("current_streak") ?? 0;
    const memoryCurrent = killStreaks.get(player.id) ?? 0;
    const streak = Math.max(savedCurrent, memoryCurrent);

    killStreaks.set(player.id, 0);
    try { player.setDynamicProperty("current_streak", 0); } catch (e) {}

    if (streak >= 3 && killerName) {
      world.sendMessage(`\n§8[FIN DE RACHA] §f${killerName} §7detuvo la racha de ${streak} bajas de §f${player.name}\n`);
    }
  } catch (e) {}
}

/**
 * Generic function to grant a custom achievement.
 * Keeps track of total achievements and gives rewards at milestones.
 */
function grantCustomAchievement(player, id, title) {
  try {
    if (isPlayerIgnored(player)) return;
    const propKey = `custom_ach_${id}`;
    if (player.getDynamicProperty(propKey)) return;
    
    player.setDynamicProperty(propKey, true);
    
    world.sendMessage(`\n§6§l[LOGRO DESBLOQUEADO]§r\n§f${player.name} §7ha conseguido: §e${title}\n`);
    
    for (const p of world.getAllPlayers()) {
      try {
        p.playSound("random.toast", { volume: 1.0, pitch: 1.0 });
      } catch (e) {}
    }

    // Track total custom achievements for rewards
    const totalAch = (player.getDynamicProperty("total_custom_ach_count") ?? 0) + 1;
    player.setDynamicProperty("total_custom_ach_count", totalAch);

    // Give reward if they reach 500 achievements
    if (totalAch === 500) {
      player.runCommandAsync("give @s diamond_block 128");
      player.runCommandAsync("give @s emerald_block 128");
      player.addTag("leyenda_500");
      world.sendMessage(`\n§b§l[RECOMPENSA MAYOR]§r\n§f${player.name} §7ha completado §e500 LOGROS §7y ha recibido 2 stacks de bloques de diamante y esmeralda!\n`);
    }

  } catch (e) {}
}

// ============================================================
// ENTITY DEATH EVENTS (with Streaks + Milestones)
// ============================================================

world.afterEvents.entityDie.subscribe((event) => {
  try {
    const { deadEntity, damageSource } = event;
    if (!deadEntity) return;

    const attacker = damageSource?.damagingEntity;

    if (attacker && attacker.typeId === "minecraft:player" && isPlayerIgnored(attacker)) return;
    if (deadEntity.typeId === "minecraft:player" && isPlayerIgnored(deadEntity)) return;

    // --- PLAYER DIED ---
    if (deadEntity.typeId === "minecraft:player") {
      // Remove temporary death status tags
      try {
        deadEntity.removeTag("tag_lechero");
        deadEntity.removeTag("tag_pajizo");
      } catch (e) {}

      // Track death
      try {
        incrementScore(deadEntity, "MuertesTotal");
      } catch (e) {}

      // Reset mob streak & pvp streak of dead player
      const killerName = (attacker && attacker.typeId === "minecraft:player") ? attacker.name : null;
      resetKillStreak(deadEntity, killerName);
      try { deadEntity.setDynamicProperty("pvp_streak", 0); } catch (e) {}

      // PvP Kill for attacker (Strict 50 PvP Kill Streak)
      if (attacker && attacker.typeId === "minecraft:player") {
        try {
          incrementScore(attacker, "PvPKills");
        } catch (e) {}
        checkMilestones(attacker, "PvPKills");

        const pvpStreak = (attacker.getDynamicProperty("pvp_streak") ?? 0) + 1;
        try { attacker.setDynamicProperty("pvp_streak", pvpStreak); } catch (e) {}

        if (pvpStreak === 50) {
          if (!attacker.getDynamicProperty("reward_50pvp")) {
            attacker.setDynamicProperty("reward_50pvp", true);
            attacker.addTag("tag_rey_guerra");
            world.sendMessage(`\n§6§l[RACHA PVP LEGENDARIA]§r\n§f${attacker.name} §7ha logrado una racha sangrienta de §e50 BAJAS PVP CONSECUTIVAS §7y recibe el Kit de Netherite del Rey de la Guerra, Bloques de Diamante, Esmeralda y Lapis!\n`);
            for (const p of world.getAllPlayers()) {
              try { p.playSound("ui.toast.challenge_complete", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
            }
            attacker.runCommandAsync("xp 200L @s");
            attacker.runCommandAsync("give @s diamond_block 128");
            attacker.runCommandAsync("give @s emerald_block 64");
            attacker.runCommandAsync("give @s lapis_block 128");
            attacker.runCommandAsync("give @s netherite_ingot 1");
            givePreEnchantedItem(attacker, "minecraft:netherite_sword", [{id:"sharpness",level:5},{id:"fire_aspect",level:2},{id:"looting",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§4Espada Rey de la Guerra§r");
            givePreEnchantedItem(attacker, "minecraft:netherite_helmet", [{id:"protection",level:4},{id:"thorns",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§4Casco Rey de la Guerra§r");
          } else {
            // Subsequent 50 PvP Streak in new life: Veteran Reward (1 Netherite Ingot + 200L XP)
            world.sendMessage(`\n§6§l[RACHA PVP VETERANA]§r\n§f${attacker.name} §7ha vuelto a lograr §e50 BAJAS PVP CONSECUTIVAS §7y recibe §e1 Lingote de Netherite §7y §b200L XP!\n`);
            for (const p of world.getAllPlayers()) {
              try { p.playSound("ui.toast.challenge_complete", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
            }
            attacker.runCommandAsync("xp 200L @s");
            attacker.runCommandAsync("give @s netherite_ingot 1");
          }
        }
      }
      return;
    }

    // Only count kills by players from here
    if (!attacker || attacker.typeId !== "minecraft:player") return;

    // --- BOSS KILLED ---
    const bosses = ["minecraft:wither", "minecraft:ender_dragon", "minecraft:elder_guardian"];
    if (bosses.includes(deadEntity.typeId)) {
      try {
        incrementScore(attacker, "BossesKilled");
      } catch (e) {}
      checkMilestones(attacker, "BossesKilled");

      if (deadEntity.typeId === "minecraft:ender_dragon") {
        if (!attacker.getDynamicProperty("reward_matadrakos")) {
          attacker.setDynamicProperty("reward_matadrakos", true);
          grantCustomAchievement(attacker, "matadrakos", "Matadrakos");
          attacker.addTag("tag_matadrakos");
          attacker.runCommandAsync("xp 200L @s");
          attacker.runCommandAsync("give @s elytra 1");
          attacker.runCommandAsync("give @s firework_rocket 64");
          attacker.runCommandAsync("give @s emerald_block 64");
          attacker.runCommandAsync("give @s netherite_ingot 1");
          givePreEnchantedItem(attacker, "minecraft:netherite_boots", [{id:"protection",level:4},{id:"feather_falling",level:4},{id:"depth_strider",level:3},{id:"thorns",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§5Botas del Matadrakos§r");
          world.sendMessage(`\n§5§l[LOGRO DESBLOQUEADO]§r\n§f${attacker.name} §7ha derrotado al Ender Dragon y recibe las §5Botas del Matadrakos §7+ §eElytra §7+ §a64 Bloques de Esmeralda!\n`);
        } else {
          // Repeatable Boss Loop: 1 Netherite Ingot + 200L XP
          attacker.runCommandAsync("xp 200L @s");
          attacker.runCommandAsync("give @s netherite_ingot 1");
          world.sendMessage(`\n§5§l[RECOMPENSA DE JEFE VETERANO]§r\n§f${attacker.name} §7ha vuelto a derrotar al Ender Dragon y recibe §e1 Lingote de Netherite §7y §b200L XP!\n`);
          for (const p of world.getAllPlayers()) {
            try { p.playSound("ui.toast.challenge_complete", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
          }
        }
      }
      if (deadEntity.typeId === "minecraft:wither") {
        if (!attacker.getDynamicProperty("reward_dios_wither")) {
          attacker.setDynamicProperty("reward_dios_wither", true);
          grantCustomAchievement(attacker, "dios_wither", "Dios Wither");
          attacker.addTag("tag_dios_wither");
          attacker.runCommandAsync("xp 200L @s");
          attacker.runCommandAsync("give @s nether_star 1");
          attacker.runCommandAsync("give @s emerald_block 64");
          attacker.runCommandAsync("give @s netherite_ingot 1");
          givePreEnchantedItem(attacker, "minecraft:netherite_leggings", [{id:"protection",level:4},{id:"thorns",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§5Pantalones del Dios Wither§r");
          world.sendMessage(`\n§5§l[LOGRO DESBLOQUEADO]§r\n§f${attacker.name} §7ha derrotado al Wither Boss y recibe los §5Pantalones del Dios Wither §7+ §e1 Estrella del Nether Extra §7+ §a64 Bloques de Esmeralda!\n`);
        } else {
          // Repeatable Boss Loop: 1 Netherite Ingot + 200L XP
          attacker.runCommandAsync("xp 200L @s");
          attacker.runCommandAsync("give @s netherite_ingot 1");
          world.sendMessage(`\n§5§l[RECOMPENSA DE JEFE VETERANO]§r\n§f${attacker.name} §7ha vuelto a derrotar al Wither Boss y recibe §e1 Lingote de Netherite §7y §b200L XP!\n`);
          for (const p of world.getAllPlayers()) {
            try { p.playSound("ui.toast.challenge_complete", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
          }
        }
      }
      if (deadEntity.typeId === "minecraft:elder_guardian") {
        if (!attacker.getDynamicProperty("reward_rey_poseidon")) {
          attacker.setDynamicProperty("reward_rey_poseidon", true);
          grantCustomAchievement(attacker, "rey_poseidon", "Rey Poseidon");
          attacker.addTag("tag_rey_poseidon");
          attacker.runCommandAsync("xp 200L @s");
          attacker.runCommandAsync("give @s emerald_block 64");
          attacker.runCommandAsync("give @s netherite_ingot 1");
          givePreEnchantedItem(attacker, "minecraft:trident", [{id:"channeling",level:1},{id:"loyalty",level:3},{id:"impaling",level:5},{id:"unbreaking",level:3},{id:"mending",level:1}], "§bTridente de Poseidón§r");
          givePreEnchantedItem(attacker, "minecraft:netherite_helmet", [{id:"protection",level:4},{id:"respiration",level:3},{id:"aqua_affinity",level:1},{id:"thorns",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§bCasco del Rey Poseidón§r");
          world.sendMessage(`\n§b§l[LOGRO DESBLOQUEADO]§r\n§f${attacker.name} §7ha derrotado al Guardián Anciano y recibe el §bTridente de Poseidón §7+ §bCasco del Rey Poseidón §7+ §a64 Bloques de Esmeralda!\n`);
        } else {
          // Repeatable Boss Loop: 1 Netherite Ingot + 200L XP
          attacker.runCommandAsync("xp 200L @s");
          attacker.runCommandAsync("give @s netherite_ingot 1");
          world.sendMessage(`\n§b§l[RECOMPENSA DE JEFE VETERANO]§r\n§f${attacker.name} §7ha vuelto a derrotar al Guardián Anciano y recibe §e1 Lingote de Netherite §7y §b200L XP!\n`);
          for (const p of world.getAllPlayers()) {
            try { p.playSound("ui.toast.challenge_complete", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
          }
        }
      }
    }

    // --- HOSTILE MOB KILLED ---
    try {
      if (isHostileMob(deadEntity)) {
        // Daily Quest Check (with strict mob type filter)
        checkAndUpdateDailyQuests(attacker);
        const cfgH = getDailyQuestConfig(world.getDay()).hunt;
        
        let countsForQuest = true;
        if (cfgH.typeCheck === "skeleton_zombie") {
          const valid = ["minecraft:zombie", "minecraft:zombie_villager", "minecraft:husk", "minecraft:drowned", "minecraft:skeleton", "minecraft:wither_skeleton", "minecraft:stray", "minecraft:bogged"];
          if (!valid.includes(deadEntity.typeId)) countsForQuest = false;
        } else if (cfgH.typeCheck === "creeper_spider") {
          const valid = ["minecraft:creeper", "minecraft:spider", "minecraft:cave_spider"];
          if (!valid.includes(deadEntity.typeId)) countsForQuest = false;
        } else if (cfgH.typeCheck === "shadow_creatures") {
          const valid = ["minecraft:enderman", "minecraft:phantom", "minecraft:cave_spider", "minecraft:witch", "minecraft:stray", "minecraft:bogged", "minecraft:vex", "minecraft:endermite", "minecraft:shulker", "minecraft:warden"];
          if (!valid.includes(deadEntity.typeId)) countsForQuest = false;
        }

        if (countsForQuest && !attacker.getDynamicProperty("q_hunt_done")) {
          const currentHunt = (attacker.getDynamicProperty("q_hunt_cnt") ?? 0) + 1;
          attacker.setDynamicProperty("q_hunt_cnt", currentHunt);
          if (currentHunt >= cfgH.target) {
            attacker.setDynamicProperty("q_hunt_done", true);
            processQuestReward(attacker, `${cfgH.title} (${cfgH.desc})`, cfgH.em, cfgH.xp);
          }
        }

        // Weekly Contract Check (Hostile Mobs & Bosses)
        checkAndUpdateWeeklyContract(attacker);
        const contractW = getWeeklyContractConfig(world.getDay());
        if (!attacker.getDynamicProperty("q_weekly_done")) {
          let points = 0;
          if (contractW.typeCheck === "contract_mobs" || contractW.typeCheck === "contract_war") {
            points = 1;
          } else if (contractW.typeCheck === "contract_king") {
            if (deadEntity.typeId === "minecraft:wither" || deadEntity.typeId === "minecraft:ender_dragon" || deadEntity.typeId === "minecraft:elder_guardian") {
              points = 10;
            }
          } else if (contractW.typeCheck === "contract_ocean") {
            if (deadEntity.typeId === "minecraft:elder_guardian" || deadEntity.typeId === "minecraft:drowned" || deadEntity.typeId === "minecraft:guardian") {
              points = 1;
            }
          }

          if (points > 0) {
            const curW = (attacker.getDynamicProperty("q_weekly_cnt") ?? 0) + points;
            attacker.setDynamicProperty("q_weekly_cnt", curW);
            if (curW >= contractW.target) {
              processWeeklyContractReward(attacker, contractW);
            }
          }
        }

        // Red Moon Eclipse Bonus Loot
        if (isRedMoonEclipseActive()) {
          const timeOfDay = world.getTimeOfDay();
          const isPhase2 = timeOfDay >= 18000;
          const bonusEmeralds = isPhase2 ? 3 : 1;
          const bonusXP = isPhase2 ? 20 : 10;
          attacker.runCommandAsync(`give @s emerald ${bonusEmeralds}`);
          attacker.runCommandAsync(`xp ${bonusXP} @s`);
          try { attacker.playSound("random.orb", { volume: 0.6, pitch: 1.5 }); } catch (e) {}
        }

        incrementScore(attacker, "MobsKilled");
        processKillStreak(attacker);
        checkMilestones(attacker, "MobsKilled");

        // Baby Zombie Achievement
        if (deadEntity.typeId === "minecraft:zombie" && deadEntity.getComponent("minecraft:is_baby")) {
          grantCustomAchievement(attacker, "nooo_chiquito", "¡NOOO! el chiquito");
        }
      }
    } catch (e) {}
  } catch (e) {}
});

// ============================================================
// BLOCK BREAK EVENT (with Milestones + Protected Zone Alarm)
// 9x9x9 protection zone centered at NPC (X: 1453, Y: 73, Z: -1021)
// X: 1449 to 1457 | Y: 69 to 77 | Z: -1025 to -1017
// ============================================================

world.afterEvents.playerBreakBlock.subscribe((event) => {
  try {
    if (!event.player) return;

    const brokenId = event.brokenBlockPermutation?.type?.id ?? event.block.typeId;

    // Daily Quest Check (Mining)
    checkAndUpdateDailyQuests(event.player);
    const cfgM = getDailyQuestConfig(world.getDay()).mine;

    let countsForMine = true;
    if (cfgM.typeCheck === "stone_strict") {
      const isStoneBlock = brokenId.includes("stone") || brokenId.includes("andesite") || brokenId.includes("diorite") || brokenId.includes("granite") || brokenId.includes("tuff") || brokenId.includes("calcite") || brokenId.includes("basalt") || brokenId.includes("blackstone") || brokenId.includes("deepslate");
      if (!isStoneBlock) countsForMine = false;
    } else if (cfgM.typeCheck === "deepslate_strict") {
      if (!brokenId.includes("deepslate")) countsForMine = false;
    } else if (cfgM.typeCheck === "ore_strict") {
      if (!brokenId.endsWith("_ore") && brokenId !== "minecraft:ancient_debris" && !brokenId.includes("_ore")) countsForMine = false;
    }

    if (countsForMine && !event.player.getDynamicProperty("q_mine_done")) {
      const currentMine = (event.player.getDynamicProperty("q_mine_cnt") ?? 0) + 1;
      event.player.setDynamicProperty("q_mine_cnt", currentMine);
      if (currentMine >= cfgM.target) {
        event.player.setDynamicProperty("q_mine_done", true);
        processQuestReward(event.player, `${cfgM.title} (${cfgM.desc})`, cfgM.em, cfgM.xp);
      }
    }

    // Daily Quest Check (Farming & Log/Crop Tracking)
    const cfgF = getDailyQuestConfig(world.getDay()).farm;
    const isCrop = brokenId.includes("wheat") || brokenId.includes("carrot") || brokenId.includes("potato") || brokenId.includes("beetroot") || brokenId.includes("melon") || brokenId.includes("pumpkin") || brokenId.includes("cocoa") || brokenId.includes("berry") || brokenId.includes("pitcher") || brokenId.includes("torchflower");
    const isLog = brokenId.endsWith("_log") || brokenId.endsWith("_wood") || brokenId.includes("stem") || brokenId.includes("bamboo_block");

    if (isCrop) {
      incrementScore(event.player, "GranjaTotal");
      const totCrops = (event.player.getDynamicProperty("total_crops_harvested") ?? 0) + 1;
      event.player.setDynamicProperty("total_crops_harvested", totCrops);

      if (!event.player.getDynamicProperty("q_farm_done")) {
        if (cfgF.typeCheck === "crop_harvest" || cfgF.typeCheck === "farm_ultra") {
          const currentFarm = (event.player.getDynamicProperty("q_farm_cnt") ?? 0) + 1;
          event.player.setDynamicProperty("q_farm_cnt", currentFarm);
          if (currentFarm >= cfgF.target) {
            event.player.setDynamicProperty("q_farm_done", true);
            processQuestReward(event.player, `${cfgF.title} (${cfgF.desc})`, cfgF.em, cfgF.xp);
          }
        }
      }
    }

    if (isLog) {
      incrementScore(event.player, "GranjaTotal");
      const totLogs = (event.player.getDynamicProperty("total_logs_felled") ?? 0) + 1;
      event.player.setDynamicProperty("total_logs_felled", totLogs);

      if (!event.player.getDynamicProperty("q_farm_done")) {
        if (cfgF.typeCheck === "log_chop" || cfgF.typeCheck === "farm_ultra") {
          const currentFarm = (event.player.getDynamicProperty("q_farm_cnt") ?? 0) + 1;
          event.player.setDynamicProperty("q_farm_cnt", currentFarm);
          if (currentFarm >= cfgF.target) {
            event.player.setDynamicProperty("q_farm_done", true);
            processQuestReward(event.player, `${cfgF.title} (${cfgF.desc})`, cfgF.em, cfgF.xp);
          }
        }
      }
    }

    // Weekly Contract Check (Debris, Deepslate, Crops, Logs)
    checkAndUpdateWeeklyContract(event.player);
    const contractW = getWeeklyContractConfig(world.getDay());
    if (!event.player.getDynamicProperty("q_weekly_done")) {
      let countsWeekly = false;
      if (contractW.typeCheck === "contract_debris" || contractW.typeCheck === "contract_king") {
        if (brokenId === "minecraft:ancient_debris") countsWeekly = true;
      } else if (contractW.typeCheck === "contract_deepslate") {
        if (brokenId.includes("deepslate")) countsWeekly = true;
      } else if (contractW.typeCheck === "contract_farm") {
        if (isCrop) {
          const curCrops = Math.min(3000, (event.player.getDynamicProperty("q_farm_crops_cnt") ?? 0) + 1);
          event.player.setDynamicProperty("q_farm_crops_cnt", curCrops);
        }
        if (isLog) {
          const curLogs = Math.min(2000, (event.player.getDynamicProperty("q_farm_logs_cnt") ?? 0) + 1);
          event.player.setDynamicProperty("q_farm_logs_cnt", curLogs);
        }
        const cDone = (event.player.getDynamicProperty("q_farm_crops_cnt") ?? 0) >= 3000;
        const lDone = (event.player.getDynamicProperty("q_farm_logs_cnt") ?? 0) >= 2000;
        event.player.setDynamicProperty("q_weekly_cnt", (event.player.getDynamicProperty("q_farm_crops_cnt") ?? 0) + (event.player.getDynamicProperty("q_farm_logs_cnt") ?? 0));
        if (cDone && lDone) {
          processWeeklyContractReward(event.player, contractW);
        }
      } else if (contractW.typeCheck === "contract_ocean") {
        if (brokenId === "minecraft:suspicious_sand" || brokenId === "minecraft:suspicious_gravel") countsWeekly = true;
      }

      if (countsWeekly) {
        const curW = (event.player.getDynamicProperty("q_weekly_cnt") ?? 0) + 1;
        event.player.setDynamicProperty("q_weekly_cnt", curW);
        if (curW >= contractW.target) {
          processWeeklyContractReward(event.player, contractW);
        }
      }
    }

    // Count block for BloquesPicados
    incrementScore(event.player, "BloquesPicados");
    checkMilestones(event.player, "BloquesPicados");

    const blockCount = getScore(event.player, "BloquesPicados");
    if (blockCount >= 5000 && !event.player.getDynamicProperty("reward_5000bloques")) {
      event.player.setDynamicProperty("reward_5000bloques", true);
      event.player.addTag("tag_leyenda_minera");
      world.sendMessage(`\n§6§l[LOGRO DESBLOQUEADO]§r\n§f${event.player.name} §7ha conseguido: §eLeyenda Minera §7(5,000 Bloques Picados) y recibe el Kit Supremo de Minería!\n`);
      for (const p of world.getAllPlayers()) {
        try { p.playSound("ui.toast.challenge_complete", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
      }
      event.player.runCommandAsync("xp 200L @s");
      event.player.runCommandAsync("give @s iron_block 64");
      event.player.runCommandAsync("give @s netherite_ingot 1");
      givePreEnchantedItem(event.player, "minecraft:netherite_pickaxe", [{id:"efficiency",level:5},{id:"fortune",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§ePico de Leyenda Minera§r");
      givePreEnchantedItem(event.player, "minecraft:netherite_shovel", [{id:"efficiency",level:5},{id:"unbreaking",level:3},{id:"mending",level:1}], "§ePala de Leyenda Minera§r");
    }

    // CUSTOM ACHIEVEMENTS (Blocks)
    if (brokenId === "minecraft:dirt") {
      const currentDirt = (event.player.getDynamicProperty("ach_dirt_count") ?? 0) + 1;
      event.player.setDynamicProperty("ach_dirt_count", currentDirt);
      if (currentDirt === 67) {
        grantCustomAchievement(event.player, "sixseven", "SIXSEVEN BRO");
      }
    } else if (brokenId === "minecraft:quartz_ore" || brokenId === "minecraft:nether_quartz_ore") {
      grantCustomAchievement(event.player, "warzone", "¡WARZONE!");
    }

    // DYNAMIC PROTECTION ZONE: Check if block was broken near ANY NPC or in original Escribano perimeter
    const block = event.block;
    const bx = block.location.x;
    const by = block.location.y;
    const bz = block.location.z;

    const inOriginalZone = (bx >= 1449 && bx <= 1457 && by >= 69 && by <= 77 && bz >= -1025 && bz <= -1017);

    // Search for nearby NPCs within 6 blocks of the broken block
    let nearbyNpcName = null;
    try {
      const nearbyNpcs = event.dimension.getEntities({ type: "npc", location: block.location, maxDistance: 6 });
      if (nearbyNpcs.length > 0) {
        nearbyNpcName = nearbyNpcs[0].nameTag || "un NPC Protegido";
      }
    } catch (e) {}

    if (inOriginalZone || nearbyNpcName) {
      const npcTagText = nearbyNpcName ? `cerca de ${nearbyNpcName}` : "en la Casa del Escribano";
      // Alert all players with alarm
      world.sendMessage(
        `\n§4§l[ALERTA DE SEGURIDAD - ZONA PROTEGIDA]§r\n` +
        `§c${event.player.name} §7rompio un bloque ${npcTagText}\n` +
        `§8Coordenadas: X:${bx} Y:${by} Z:${bz}\n`
      );

      // Play alarm sound to all players
      for (const p of world.getAllPlayers()) {
        try {
          p.playSound("note.bass", { volume: 1.0, pitch: 0.5 });
        } catch (e) {}
      }

      // Also play alarm sound to offender specifically
      try {
        event.player.playSound("mob.ghast.scream", { volume: 0.8, pitch: 1.0 });
      } catch (e) {}
    }
  } catch (e) {}
});

// ============================================================
// WELCOME SYSTEM (Every login)
// ============================================================

world.afterEvents.playerSpawn.subscribe((event) => {
  try {
    const { player, initialSpawn } = event;
    if (!player || !initialSpawn) return;

    // Restore saved streak on join
    const savedStreak = player.getDynamicProperty("current_streak") ?? 0;
    killStreaks.set(player.id, savedStreak);

    system.runTimeout(() => {
      try {
        if (!player.isValid()) return;

        player.runCommandAsync(`title @s actionbar §l§aVILLA ESMERALDA §r§8- §e¡Bienvenido §f${player.name}§e!`);

        player.playSound("random.orb", { volume: 0.8, pitch: 1.0 });

        const tip = VILLA_TIPS[Math.floor(Math.random() * VILLA_TIPS.length)];

        player.sendMessage(
          `§r\n§l§6[ESCRIBANO REAL - VILLA ESMERALDA]§r\n` +
          `§eBienvenido de vuelta a la Villa, §f${player.name}§e.\n` +
          `§aSigue las reglas del reino siempre: §b${DISCORD_RULES_LINK}\n\n` +
          `§l§bTUS MARCAS ACTUALES:§r\n` +
          `§f  Bajas PvP:§r ${getScore(player, "PvPKills")} §8(${getRank(player, "PvPKills")})\n` +
          `§f  Mobs Asesinados:§r ${getScore(player, "MobsKilled")} §8(${getRank(player, "MobsKilled")})\n` +
          `§f  Bloques Picados:§r ${getScore(player, "BloquesPicados")} §8(${getRank(player, "BloquesPicados")})\n\n` +
          `§7Consejo: ${tip}\n`
        );
      } catch (e) {}
    }, 60);
  } catch (e) {}
});

// ============================================================
// NPC TAG DETECTION LOOP (Every 4 ticks)
// ============================================================

system.runInterval(() => {
  try {
    for (const player of world.getAllPlayers()) {
      try {
        // --- SIDEBAR BUTTONS ---
        if (player.hasTag("ver_mobs")) {
          player.removeTag("ver_mobs");
          showSidebarWithTimer("MobsKilled");
        }
        if (player.hasTag("ver_pvp")) {
          player.removeTag("ver_pvp");
          showSidebarWithTimer("PvPKills");
        }
        if (player.hasTag("ver_bloques")) {
          player.removeTag("ver_bloques");
          showSidebarWithTimer("BloquesPicados");
        }
        if (player.hasTag("ver_granja")) {
          player.removeTag("ver_granja");
          showSidebarWithTimer("GranjaTotal");
        }
        if (player.hasTag("ver_jefes")) {
          player.removeTag("ver_jefes");
          showSidebarWithTimer("BossesKilled");
        }

        // --- PROFILE (with Full Unlocked Achievements & Badges List) ---
        if (player.hasTag("ver_perfil")) {
          player.removeTag("ver_perfil");
          player.playSound("item.book.page_turn", { volume: 1.0, pitch: 1.0 });

          const pvp = getScore(player, "PvPKills");
          const mobs = getScore(player, "MobsKilled");
          const bloques = getScore(player, "BloquesPicados");
          const bosses = getScore(player, "BossesKilled");
          const muertes = getScore(player, "MuertesTotal");
          const streak = killStreaks.get(player.id) ?? 0;

          // K/D Ratio
          const totalKills = pvp + mobs;
          const kd = muertes > 0 ? (totalKills / muertes).toFixed(1) : totalKills > 0 ? "Perfecto" : "0.0";

          // 1. Leaderboard Top #1 Badges
          let leaderBadges = [];
          if (getRank(player, "PvPKills") === "#1" && pvp > 0) leaderBadges.push("§4[Caballero Negro]§r (#1 PvP)");
          if (getRank(player, "MobsKilled") === "#1" && mobs > 0) leaderBadges.push("§c[Cazador Leyenda]§r (#1 Mobs)");
          if (getRank(player, "BloquesPicados") === "#1" && bloques > 0) leaderBadges.push("§e[Maestro Minero]§r (#1 Minero)");
          if (getRank(player, "BossesKilled") === "#1" && bosses > 0) leaderBadges.push("§5[Matadrakos]§r (#1 Jefes)");

          // 2. Elite Badges Unlocked
          let eliteBadges = [];
          if (player.getDynamicProperty("custom_ach_matadrakos") || player.hasTag("tag_matadrakos")) eliteBadges.push("Matadrakos (Ender Dragon)");
          if (player.getDynamicProperty("custom_ach_dios_wither") || player.hasTag("tag_dios_wither")) eliteBadges.push("Dios Wither (Wither Boss)");
          if (player.getDynamicProperty("custom_ach_rey_poseidon") || player.hasTag("tag_rey_poseidon")) eliteBadges.push("Rey Poseidon (Elder Guardian)");
          if (player.getDynamicProperty("reward_lider_granjero") || player.hasTag("tag_lider_granjero")) eliteBadges.push("Lider Granjero (Cultivos y Tala)");
          if (player.getDynamicProperty("reward_50pvp") || player.hasTag("tag_rey_guerra")) eliteBadges.push("Rey de la Guerra (50 PvP)");
          if (player.getDynamicProperty("reward_5000bloques") || player.hasTag("tag_leyenda_minera")) eliteBadges.push("Leyenda Minera (5,000 Bloques)");
          if (player.getDynamicProperty("reward_1000mobs") || player.hasTag("tag_asesino_serie")) eliteBadges.push("Asesino en Serie (1,000 Mobs Racha)");

          // 3. Secondary Achievements Unlocked
          let subBadges = [];
          if (player.getDynamicProperty("custom_ach_nooo_chiquito")) subBadges.push("¡NOOO! el chiquito");
          if (player.getDynamicProperty("custom_ach_lechero") || player.hasTag("tag_lechero")) subBadges.push("Lechero");
          if (player.getDynamicProperty("custom_ach_rey_paja") || player.hasTag("tag_pajizo")) subBadges.push("El rey de la paja");
          if (player.getDynamicProperty("custom_ach_coporero")) subBadges.push("Coporero");
          if (player.getDynamicProperty("custom_ach_canoero")) subBadges.push("Canoero");
          if (player.getDynamicProperty("custom_ach_pecho_duro")) subBadges.push("Pecho duro");
          if (player.getDynamicProperty("custom_ach_dios_palos")) subBadges.push("Dios de los palos");
          if (player.getDynamicProperty("custom_ach_aventurero")) subBadges.push("Aventurero");
          if (player.getDynamicProperty("custom_ach_sixseven")) subBadges.push("SIXSEVEN BRO");
          if (player.getDynamicProperty("custom_ach_warzone")) subBadges.push("¡WARZONE!");

          const textLeader = leaderBadges.length > 0 ? leaderBadges.map(b => "  §6- " + b).join("\n") + "\n" : "  §7- Ninguno actualmente\n";
          const textElite = eliteBadges.length > 0 ? eliteBadges.map(b => "  §a[x] §f" + b).join("\n") + "\n" : "  §7- Ninguna todavía\n";
          const textSub = subBadges.length > 0 ? subBadges.map(b => "  §b[x] §f" + b).join("\n") + "\n" : "  §7- Ninguno todavía\n";

          player.sendMessage(
            `§r\n§l§6=== PERFIL COMPLETO: §f${player.name} §6===§r\n` +
            `§fRango Actual: ${getCitizenRank(player)}\n\n` +
            `§l§e[+] LIDERES DE CLASIFICACION (#1):§r\n${textLeader}\n` +
            `§l§a[+] INSIGNIAS DE ELITE CONSEGUIDAS:§r\n${textElite}\n` +
            `§l§b[+] LOGROS SECUNDARIOS DESBLOQUEADOS:§r\n${textSub}\n` +
            `§l§e[+] ESTADISTICAS GENERALES:§r\n` +
            `  §fBajas PvP:§r ${pvp} §8(${getRank(player, "PvPKills")})\n` +
            `  §fMobs Asesinados:§r ${mobs} §8(${getRank(player, "MobsKilled")})\n` +
            `  §fBloques Picados:§r ${bloques} §8(${getRank(player, "BloquesPicados")})\n` +
            `  §fJefes Derrotados:§r ${bosses} §8(${getRank(player, "BossesKilled")})\n` +
            `  §fMuertes Totales:§r ${muertes}\n\n` +
            `§l§c[+] COMBATE Y RACHAS:§r\n` +
            `  §fK/D Ratio:§r ${kd} §8(${totalKills} kills / ${muertes} muertes)\n` +
            `  §fRacha Actual:§r ${streak} bajas seguidas\n` +
            `§6===========================================§r\n`
          );
        }

        // --- ACTIVAR / DESACTIVAR ESCRIBANO VIA TAGS (Ideal para botones de NPC) ---
        if (player.hasTag("activar_escribano")) {
          player.removeTag("activar_escribano");
          player.removeTag("ignorar_escribano");
          player.removeTag("ignorar_sistema");
          player.removeTag("ignorar_escribano_temp");
          player.sendMessage("§a[ESCRIBANO] ¡Has ACTIVADO el sistema de misiones y estadísticas!");
          try { player.playSound("random.orb", { volume: 1.0, pitch: 1.2 }); } catch (e) {}
        }

        if (player.hasTag("desactivar_escribano")) {
          player.removeTag("desactivar_escribano");
          player.addTag("ignorar_escribano");
          player.sendMessage("§c[ESCRIBANO] ¡Has PAUSADO el sistema de misiones y estadísticas!");
          try { player.playSound("random.fizz", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
        }

        if (player.hasTag("toggle_escribano") || player.hasTag("cambiar_escribano") || player.hasTag("abrir_menu")) {
          player.removeTag("toggle_escribano");
          player.removeTag("cambiar_escribano");
          player.removeTag("abrir_menu");
          const isIgnored = player.hasTag("ignorar_escribano") || player.hasTag("ignorar_sistema");
          if (isIgnored) {
            player.removeTag("ignorar_escribano");
            player.removeTag("ignorar_sistema");
            player.removeTag("ignorar_escribano_temp");
            player.sendMessage("§a[ESCRIBANO] ¡Has ACTIVADO el sistema de misiones y estadísticas!");
            try { player.playSound("random.orb", { volume: 1.0, pitch: 1.2 }); } catch (e) {}
          } else {
            player.addTag("ignorar_escribano");
            player.sendMessage("§c[ESCRIBANO] ¡Has PAUSADO el sistema de misiones y estadísticas!");
            try { player.playSound("random.fizz", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
          }
        }

        // --- EVENTO GRAN FESTIVAL (DOBLE XP Y ESMERALDAS) ---
        if (player.hasTag("activar_hora_doble") || player.hasTag("activar_doble_xp")) {
          player.removeTag("activar_hora_doble");
          player.removeTag("activar_doble_xp");
          world.setDynamicProperty("evento_doble_xp", true);
          world.sendMessage(`\n§6§l===========================================§r\n§e§l[¡GRAN FESTIVAL DE LA VILLA ACTIVADO!]§r\n§f¡Se ha activado el evento de §eDOBLE ESMERALDAS Y DOBLE XP §fen todas las misiones y contratos!\n§6===========================================§r\n`);
          for (const p of world.getAllPlayers()) {
            try {
              p.onScreenDisplay.setTitle("§6§l[DOBLE XP & ESMERALDAS]§r");
              p.onScreenDisplay.setSubtitle("§e¡Gran Festival Activado!");
              p.playSound("ui.toast.challenge_complete", { volume: 1.0, pitch: 1.0 });
            } catch (e) {}
          }
        }

        // --- SELECTOR DE TÍTULO SOBRE LA CABEZA VIA TAGS ---
        if (player.hasTag("equipar_titulo_matadrakos")) {
          player.removeTag("equipar_titulo_matadrakos");
          if (player.hasTag("tag_matadrakos") || player.getDynamicProperty("custom_ach_matadrakos")) {
            player.setDynamicProperty("active_equipped_title", "matadrakos");
            player.sendMessage("§a[ESCRIBANO] ¡Has equipado el título: §d[Matadrakos]§a!");
            try { player.playSound("random.orb", { volume: 1.0, pitch: 1.2 }); } catch (e) {}
          } else {
            player.sendMessage("§c[ESCRIBANO] Aún no has derrotado al Ender Dragon para desbloquear este título.");
            try { player.playSound("random.fizz", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
          }
        }

        if (player.hasTag("equipar_titulo_wither")) {
          player.removeTag("equipar_titulo_wither");
          if (player.hasTag("tag_dios_wither") || player.getDynamicProperty("custom_ach_dios_wither")) {
            player.setDynamicProperty("active_equipped_title", "dios_wither");
            player.sendMessage("§a[ESCRIBANO] ¡Has equipado el título: §5[Dios Wither]§a!");
            try { player.playSound("random.orb", { volume: 1.0, pitch: 1.2 }); } catch (e) {}
          } else {
            player.sendMessage("§c[ESCRIBANO] Aún no has derrotado al Wither Boss para desbloquear este título.");
            try { player.playSound("random.fizz", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
          }
        }

        if (player.hasTag("equipar_titulo_poseidon")) {
          player.removeTag("equipar_titulo_poseidon");
          if (player.hasTag("tag_rey_poseidon") || player.getDynamicProperty("custom_ach_rey_poseidon")) {
            player.setDynamicProperty("active_equipped_title", "rey_poseidon");
            player.sendMessage("§a[ESCRIBANO] ¡Has equipado el título: §b[Rey Poseidon]§a!");
            try { player.playSound("random.orb", { volume: 1.0, pitch: 1.2 }); } catch (e) {}
          } else {
            player.sendMessage("§c[ESCRIBANO] Aún no has derrotado al Guardián Anciano para desbloquear este título.");
            try { player.playSound("random.fizz", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
          }
        }

        if (player.hasTag("equipar_titulo_contratista")) {
          player.removeTag("equipar_titulo_contratista");
          if (player.hasTag("tag_contratista_real") || player.getDynamicProperty("custom_ach_contratista_real")) {
            player.setDynamicProperty("active_equipped_title", "contratista_real");
            player.sendMessage("§a[ESCRIBANO] ¡Has equipado el título: §c[Contratista Real]§a!");
            try { player.playSound("random.orb", { volume: 1.0, pitch: 1.2 }); } catch (e) {}
          } else {
            player.sendMessage("§c[ESCRIBANO] Aún no has completado un Contrato Semanal Mítico para desbloquear este título.");
            try { player.playSound("random.fizz", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
          }
        }

        if (player.hasTag("equipar_titulo_minero")) {
          player.removeTag("equipar_titulo_minero");
          if (player.hasTag("tag_leyenda_minera")) {
            player.setDynamicProperty("active_equipped_title", "leyenda_minera");
            player.sendMessage("§a[ESCRIBANO] ¡Has equipado el título: §e[Leyenda Minera]§a!");
            try { player.playSound("random.orb", { volume: 1.0, pitch: 1.2 }); } catch (e) {}
          } else {
            player.sendMessage("§c[ESCRIBANO] Aún no has picado 5,000 bloques para desbloquear este título.");
            try { player.playSound("random.fizz", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
          }
        }

        if (player.hasTag("equipar_titulo_granjero")) {
          player.removeTag("equipar_titulo_granjero");
          if (player.hasTag("tag_lider_granjero")) {
            player.setDynamicProperty("active_equipped_title", "lider_granjero");
            player.sendMessage("§a[ESCRIBANO] ¡Has equipado el título: §a[Líder Granjero]§a!");
            try { player.playSound("random.orb", { volume: 1.0, pitch: 1.2 }); } catch (e) {}
          } else {
            player.sendMessage("§c[ESCRIBANO] Aún no has alcanzado 5,000 cosechas/talas para desbloquear este título.");
            try { player.playSound("random.fizz", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
          }
        }

        if (player.hasTag("equipar_titulo_guerra")) {
          player.removeTag("equipar_titulo_guerra");
          if (player.hasTag("tag_rey_guerra")) {
            player.setDynamicProperty("active_equipped_title", "rey_guerra");
            player.sendMessage("§a[ESCRIBANO] ¡Has equipado el título: §c[Rey de la Guerra]§a!");
            try { player.playSound("random.orb", { volume: 1.0, pitch: 1.2 }); } catch (e) {}
          } else {
            player.sendMessage("§c[ESCRIBANO] Aún no has alcanzado la racha de 50 bajas PvP para desbloquear este título.");
            try { player.playSound("random.fizz", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
          }
        }

        if (player.hasTag("equipar_titulo_asesino")) {
          player.removeTag("equipar_titulo_asesino");
          if (player.hasTag("tag_asesino_serie") || player.getDynamicProperty("custom_ach_asesino_serie")) {
            player.setDynamicProperty("active_equipped_title", "asesino_serie");
            player.sendMessage("§a[ESCRIBANO] ¡Has equipado el título: §6[Asesino en Serie]§a!");
            try { player.playSound("random.orb", { volume: 1.0, pitch: 1.2 }); } catch (e) {}
          } else {
            player.sendMessage("§c[ESCRIBANO] Aún no has alcanzado la racha de 1,000 mobs para desbloquear este título.");
            try { player.playSound("random.fizz", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
          }
        }

        if (player.hasTag("equipar_titulo_ninguno") || player.hasTag("quitar_titulo")) {
          player.removeTag("equipar_titulo_ninguno");
          player.removeTag("quitar_titulo");
          player.setDynamicProperty("active_equipped_title", null);
          player.sendMessage("§a[ESCRIBANO] Has quitado tu título personalizado.");
          try { player.playSound("random.orb", { volume: 1.0, pitch: 1.2 }); } catch (e) {}
        }

        if (player.hasTag("ver_titulos") || player.hasTag("abrir_titulos") || player.hasTag("abrir_menu_titulos")) {
          player.removeTag("ver_titulos");
          player.removeTag("abrir_titulos");
          player.removeTag("abrir_menu_titulos");
          openTitleMenu(player);
        }

        // --- EVENTO ECLIPSE DE LUNA ROJA ---
        if (player.hasTag("activar_luna_roja") || player.hasTag("activar_eclipse")) {
          player.removeTag("activar_luna_roja");
          player.removeTag("activar_eclipse");
          world.setDynamicProperty("evento_luna_roja", true);
          world.sendMessage(`\n§c§l===========================================§r\n§4§l[¡ECLIPSE DE LUNA ROJA ACTIVADO!]§r\n§f¡Un Administrador ha invocado el Eclipse Nocturno! Las criaturas obtienen Fuerza y Velocidad, otorgando Doble XP y Esmeraldas.\n§c===========================================§r\n`);
          for (const p of world.getAllPlayers()) {
            try {
              p.onScreenDisplay.setTitle("§c§l[LUNA ROJA EN CURSO]§r");
              p.onScreenDisplay.setSubtitle("§4¡Furia de las Sombras!");
              p.playSound("ambient.weather.thunder", { volume: 1.0, pitch: 0.8 });
            } catch (e) {}
          }
        }

        if (player.hasTag("desactivar_luna_roja") || player.hasTag("desactivar_eclipse")) {
          player.removeTag("desactivar_luna_roja");
          player.removeTag("desactivar_eclipse");
          world.setDynamicProperty("evento_luna_roja", false);
          world.sendMessage(`\n§a§l[ECLIPSE FINALIZADO]§r §7El sol vuelve a brillar y la Luna Roja se ha disipado.\n`);
        }

        // --- RULES ---
        if (player.hasTag("ver_reglas")) {
          player.removeTag("ver_reglas");
          player.playSound("item.book.page_turn", { volume: 1.0, pitch: 1.0 });

          player.sendMessage(
            `§r\n§l§6CONSTITUCION DE VILLA ESMERALDA§r\n\n` +
            `§a1.§f No griefing ni destruccion de propiedades ajenas.\n` +
            `§a2.§f Respetar los pactos de comercio y no estafar.\n` +
            `§a3.§f Respetar las zonas protegidas del Spawn.\n` +
            `§a4.§f El PvP solo esta permitido si ambas partes lo acuerdan.\n\n` +
            `§eReglamento completo en Discord:\n§b${DISCORD_RULES_LINK}\n`
          );
        }

        // --- MISIONES DIARIAS ---
        if (player.hasTag("ver_misiones")) {
          player.removeTag("ver_misiones");
          player.playSound("item.book.page_turn", { volume: 1.0, pitch: 1.0 });

          checkAndUpdateDailyQuests(player);

          const dailyCfg = getDailyQuestConfig(world.getDay());

          const qM = player.getDynamicProperty("q_mine_cnt") ?? 0;
          const qMDone = player.getDynamicProperty("q_mine_done") ?? false;
          const qH = player.getDynamicProperty("q_hunt_cnt") ?? 0;
          const qHDone = player.getDynamicProperty("q_hunt_done") ?? false;
          const qE = player.getDynamicProperty("q_explore_cnt") ?? 0;
          const qEDone = player.getDynamicProperty("q_explore_done") ?? false;
          const qF = player.getDynamicProperty("q_farm_cnt") ?? 0;
          const qFDone = player.getDynamicProperty("q_farm_done") ?? false;

          const pctM = Math.min(Math.floor((qM / dailyCfg.mine.target) * 100), 100);
          const pctH = Math.min(Math.floor((qH / dailyCfg.hunt.target) * 100), 100);
          const pctE = Math.min(Math.floor((qE / dailyCfg.explore.target) * 100), 100);
          const pctF = Math.min(Math.floor((qF / dailyCfg.farm.target) * 100), 100);

          const textM = qMDone ? "§a[COMPLETADA 100%]" : `§e${pctM}% §8(${qM}/${dailyCfg.mine.target}) §a[+${dailyCfg.mine.em} Em / ${dailyCfg.mine.xp}L XP]`;
          const textH = qHDone ? "§a[COMPLETADA 100%]" : `§e${pctH}% §8(${qH}/${dailyCfg.hunt.target}) §a[+${dailyCfg.hunt.em} Em / ${dailyCfg.hunt.xp}L XP]`;
          const textE = qEDone ? "§a[COMPLETADA 100%]" : `§e${pctE}% §8(${Math.floor(qE)}/${dailyCfg.explore.target}) §a[+${dailyCfg.explore.em} Em / ${dailyCfg.explore.xp}L XP]`;
          const textF = qFDone ? "§a[COMPLETADA 100%]" : `§e${pctF}% §8(${qF}/${dailyCfg.farm.target}) §a[+${dailyCfg.farm.em} Em / ${dailyCfg.farm.xp}L XP]`;

          player.sendMessage(
            `§r\n§l§6=== MISIONES DIARIAS DE LA VILLA ===§r\n` +
            `§7Recompensas por Dificultad (Estándar: 10, Difícil: 30, Extrema: 70, Ultra: 250)\n\n` +
            `§e[MINA] §f${dailyCfg.mine.title}:§r ${textM}\n` +
            `§c[CAZA] §f${dailyCfg.hunt.title}:§r ${textH}\n` +
            `§b[RUTA] §f${dailyCfg.explore.title}:§r ${textE}\n` +
            `§a[GRANJA] §f${dailyCfg.farm.title}:§r ${textF}\n\n` +
            `§8Misiones rotadas automáticamente cada día in-game.\n`
          );
        }

        // --- CONTRATO SEMANAL MÍTICO ---
        if (player.hasTag("ver_contrato")) {
          player.removeTag("ver_contrato");
          player.playSound("item.book.page_turn", { volume: 1.0, pitch: 1.0 });

          checkAndUpdateWeeklyContract(player);

          const currentDay = world.getDay();
          const contract = getWeeklyContractConfig(currentDay);
          const qW = player.getDynamicProperty("q_weekly_cnt") ?? 0;
          const qWDone = player.getDynamicProperty("q_weekly_done") ?? false;
          const dayInWeek = (currentDay % 7) + 1;
          const daysLeft = 7 - dayInWeek;

          const pctW = Math.min(Math.floor((qW / contract.target) * 100), 100);
          const textW = qWDone ? "§a[CONTRATO COMPLETADO 100%]" : `§e${pctW}% §8(${Math.floor(qW)}/${contract.target}) §c[Quedan ${daysLeft} días de plazo]`;

          player.sendMessage(
            `§r\n§l§6=== CONTRATO SEMANAL MÍTICO DE LA VILLA ===§r\n` +
            `§7Semana actual: Día ${dayInWeek}/7 (Quedan ${daysLeft} días)\n\n` +
            `§e[DESAFÍO MÍTICO] §f${contract.title}:§r\n` +
            `  §7Objetivo: §f${contract.desc}\n` +
            `  §7Progreso: ${textW}\n` +
            `  §7Reliquia en Juego: §e${contract.relicName} + 256 Bloques Esmeralda + 8 Netherite + 500L XP\n\n` +
            `§8Sanción por retraso: Si empiezas 2 días tarde, será matemáticamente imposible completar a tiempo.\n`
          );
        }

        // --- SUITE ADMIN DE PRUEBAS INSTANTÁNEAS (/tag @s add test_...) ---
        try {
          if (player.hasTag("test_completar_diaria")) {
            player.removeTag("test_completar_diaria");
            player.setDynamicProperty("q_mine_done", true);
            player.setDynamicProperty("q_hunt_done", true);
            player.setDynamicProperty("q_explore_done", true);
            player.setDynamicProperty("q_farm_done", true);
            processQuestReward(player, "Prueba Admin Diaria", 250, 100);
            player.sendMessage("§a[TEST ADMIN] ¡Las 4 Misiones Diarias han sido completadas al instante!");
          }
          if (player.hasTag("test_siguiente_dia")) {
            player.removeTag("test_siguiente_dia");
            world.getDimension("overworld").runCommandAsync("time add 24000");
            player.setDynamicProperty("last_quest_day", -1);
            player.sendMessage("§a[TEST ADMIN] ¡Avanzado 24 horas (1 día in-game)! Se renovaron las misiones diarias.");
          }
          if (player.hasTag("test_completar_contrato")) {
            player.removeTag("test_completar_contrato");
            player.setDynamicProperty("last_contract_week", -1);
            checkAndUpdateWeeklyContract(player);
            const contract = getWeeklyContractConfig(world.getDay());
            processWeeklyContractReward(player, contract);
            player.sendMessage(`§a[TEST ADMIN] ¡Contrato Semanal Mítico "${contract.title}" completado al instante!`);
          }
          if (player.hasTag("test_siguiente_contrato")) {
            player.removeTag("test_siguiente_contrato");
            world.getDimension("overworld").runCommandAsync("time add 168000");
            player.setDynamicProperty("last_contract_week", -1);
            player.setDynamicProperty("q_weekly_cnt", 0);
            player.setDynamicProperty("q_weekly_done", false);
            const contract = getWeeklyContractConfig(world.getDay() + 7);
            player.sendMessage(`§a[TEST ADMIN] ¡Avanzado 7 días in-game! Siguiente Contrato Mítico: "${contract.title}"`);
          }
          if (player.hasTag("test_dar_logro_poseidon")) {
            player.removeTag("test_dar_logro_poseidon");
            player.setDynamicProperty("custom_ach_rey_poseidon", false);
            player.setDynamicProperty("reward_rey_poseidon", false);
            player.addTag("tag_rey_poseidon");
            grantCustomAchievement(player, "rey_poseidon", "Rey Poseidon");
            player.runCommandAsync("xp 200L @s");
            player.runCommandAsync("give @s emerald_block 64");
            player.runCommandAsync("give @s netherite_ingot 1");
            givePreEnchantedItem(player, "minecraft:trident", [{id:"channeling",level:1},{id:"loyalty",level:3},{id:"impaling",level:5},{id:"unbreaking",level:3},{id:"mending",level:1}], "§bTridente de Poseidón§r");
            givePreEnchantedItem(player, "minecraft:netherite_helmet", [{id:"protection",level:4},{id:"respiration",level:3},{id:"aqua_affinity",level:1},{id:"thorns",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§bCasco del Rey Poseidón§r");
            player.sendMessage("§a[TEST ADMIN] ¡Logro Rey Poseidón otorgado con éxito!");
          }
          if (player.hasTag("test_dar_logro_wither")) {
            player.removeTag("test_dar_logro_wither");
            player.setDynamicProperty("custom_ach_dios_wither", false);
            player.setDynamicProperty("reward_dios_wither", false);
            player.addTag("tag_dios_wither");
            grantCustomAchievement(player, "dios_wither", "Dios Wither");
            player.runCommandAsync("xp 200L @s");
            player.runCommandAsync("give @s nether_star 1");
            player.runCommandAsync("give @s emerald_block 64");
            player.runCommandAsync("give @s netherite_ingot 1");
            givePreEnchantedItem(player, "minecraft:netherite_leggings", [{id:"protection",level:4},{id:"thorns",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§5Pantalones del Dios Wither§r");
            player.sendMessage("§a[TEST ADMIN] ¡Logro Dios Wither otorgado con éxito!");
          }
          if (player.hasTag("test_dar_logro_matadrakos")) {
            player.removeTag("test_dar_logro_matadrakos");
            player.setDynamicProperty("custom_ach_matadrakos", false);
            player.setDynamicProperty("reward_matadrakos", false);
            player.addTag("tag_matadrakos");
            grantCustomAchievement(player, "matadrakos", "Matadrakos");
            player.runCommandAsync("xp 200L @s");
            player.runCommandAsync("give @s elytra 1");
            player.runCommandAsync("give @s firework_rocket 64");
            player.runCommandAsync("give @s emerald_block 64");
            player.runCommandAsync("give @s netherite_ingot 1");
            givePreEnchantedItem(player, "minecraft:netherite_boots", [{id:"protection",level:4},{id:"feather_falling",level:4},{id:"depth_strider",level:3},{id:"thorns",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§5Botas del Matadrakos§r");
            player.sendMessage("§a[TEST ADMIN] ¡Logro Matadrakos otorgado con éxito!");
          }
          if (player.hasTag("test_dar_logro_granjero")) {
            player.removeTag("test_dar_logro_granjero");
            player.setDynamicProperty("custom_ach_lider_granjero", false);
            player.setDynamicProperty("reward_lider_granjero", false);
            player.addTag("tag_lider_granjero");
            grantCustomAchievement(player, "lider_granjero", "Líder Granjero");
            player.runCommandAsync("xp 200L @s");
            player.runCommandAsync("give @s emerald_block 64");
            player.runCommandAsync("give @s netherite_ingot 1");
            givePreEnchantedItem(player, "minecraft:netherite_hoe", [{id:"efficiency",level:5},{id:"fortune",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§aAzada del Líder Granjero§r");
            givePreEnchantedItem(player, "minecraft:netherite_axe", [{id:"efficiency",level:5},{id:"sharpness",level:5},{id:"unbreaking",level:3},{id:"mending",level:1}], "§aHacha del Líder Granjero§r");
            player.sendMessage("§a[TEST ADMIN] ¡Logro Líder Granjero otorgado con éxito!");
          }
          if (player.hasTag("test_dar_logro_mineria")) {
            player.removeTag("test_dar_logro_mineria");
            player.setDynamicProperty("reward_5000bloques", false);
            player.addTag("tag_leyenda_minera");
            grantCustomAchievement(player, "leyenda_minera", "Leyenda Minera");
            player.runCommandAsync("xp 200L @s");
            player.runCommandAsync("give @s iron_block 64");
            givePreEnchantedItem(player, "minecraft:netherite_pickaxe", [{id:"efficiency",level:5},{id:"fortune",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§ePico de Leyenda Minera§r");
            givePreEnchantedItem(player, "minecraft:netherite_shovel", [{id:"efficiency",level:5},{id:"unbreaking",level:3},{id:"mending",level:1}], "§ePala de Leyenda Minera§r");
            player.sendMessage("§a[TEST ADMIN] ¡Logro Leyenda Minera (5,000 Bloques) otorgado con éxito!");
          }
          if (player.hasTag("test_dar_logro_pvp")) {
            player.removeTag("test_dar_logro_pvp");
            player.setDynamicProperty("reward_50pvpkills", false);
            player.addTag("tag_rey_guerra");
            grantCustomAchievement(player, "rey_guerra", "Rey de la Guerra");
            player.runCommandAsync("xp 200L @s");
            player.runCommandAsync("give @s diamond_block 128");
            player.runCommandAsync("give @s emerald_block 64");
            player.runCommandAsync("give @s lapis_block 128");
            givePreEnchantedItem(player, "minecraft:netherite_sword", [{id:"sharpness",level:5},{id:"fire_aspect",level:2},{id:"looting",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§4Espada Rey de la Guerra§r");
            givePreEnchantedItem(player, "minecraft:netherite_helmet", [{id:"protection",level:4},{id:"thorns",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§4Casco Rey de la Guerra§r");
            player.sendMessage("§a[TEST ADMIN] ¡Logro Rey de la Guerra (50 Bajas PvP) otorgado con éxito!");
          }
          if (player.hasTag("test_dar_logro_asesino")) {
            player.removeTag("test_dar_logro_asesino");
            player.setDynamicProperty("custom_ach_asesino_serie", false);
            player.setDynamicProperty("reward_1000mobs", false);
            player.addTag("tag_asesino_serie");
            grantCustomAchievement(player, "asesino_serie", "Asesino en Serie");
            player.runCommandAsync("xp 200L @s");
            player.runCommandAsync("give @s netherite_ingot 10");
            player.runCommandAsync("give @s emerald_block 640");
            player.runCommandAsync("give @s iron_block 640");
            player.runCommandAsync("give @s lapis_block 256");
            givePreEnchantedItem(player, "minecraft:netherite_chestplate", [{id:"protection",level:4},{id:"thorns",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§6Pechera del Asesino en Serie§r");
            player.sendMessage("§a[TEST ADMIN] ¡Logro Asesino en Serie otorgado con éxito!");
          }
          if (player.hasTag("test_reset_todo")) {
            player.removeTag("test_reset_todo");
            player.setDynamicProperty("q_mine_cnt", 0);
            player.setDynamicProperty("q_hunt_cnt", 0);
            player.setDynamicProperty("q_explore_cnt", 0);
            player.setDynamicProperty("q_farm_cnt", 0);
            player.setDynamicProperty("q_mine_done", false);
            player.setDynamicProperty("q_hunt_done", false);
            player.setDynamicProperty("q_explore_done", false);
            player.setDynamicProperty("q_farm_done", false);
            player.setDynamicProperty("q_weekly_cnt", 0);
            player.setDynamicProperty("q_farm_crops_cnt", 0);
            player.setDynamicProperty("q_farm_logs_cnt", 0);
            player.setDynamicProperty("q_weekly_done", false);
            player.setDynamicProperty("custom_ach_rey_poseidon", false);
            player.setDynamicProperty("custom_ach_dios_wither", false);
            player.setDynamicProperty("custom_ach_matadrakos", false);
            player.setDynamicProperty("custom_ach_lider_granjero", false);
            player.setDynamicProperty("custom_ach_asesino_serie", false);
            player.sendMessage("§c[TEST ADMIN] Todos los contadores y estados de prueba han sido REINICIADOS.");
          }
        } catch (e) {}
      } catch (e) {}
    }
  } catch (e) {}
}, 4);

// ============================================================
// MYTHIC RELIC PASSIVE POWERS (Every 1 second / 20 ticks)
// Applies Strength II, Resistance II, Haste II, Speed II, Night Vision, Dolphin's Grace
// when holding or equipping Mythic Relic items from Weekly Contracts & Boss Achievements!
// ============================================================
system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    try {
      if (!player || !player.isValid()) continue;

      const equippable = player.getComponent("equippable");
      const mainHand = equippable?.getEquipment("Mainhand");
      const mainHandName = mainHand?.nameTag ?? "";

      const head = equippable?.getEquipment("Head");
      const chest = equippable?.getEquipment("Chest");
      const feet = equippable?.getEquipment("Feet");

      const headName = head?.nameTag ?? "";
      const chestName = chest?.nameTag ?? "";
      const feetName = feet?.nameTag ?? "";

      // --- WEAPONS / TOOLS PASSIVE BUFFS (WEEKLY CONTRACT RELICS ONLY!) ---
      // Matches "Mítico", "Mítica", "Divino" or "Divina"
      if (mainHandName.includes("Mítico") || mainHandName.includes("Mítica")) {
        if (mainHand?.typeId === "minecraft:netherite_sword") {
          player.addEffect("strength", 40, { amplifier: 1, showParticles: false });
        }
        if (mainHand?.typeId === "minecraft:netherite_pickaxe" || mainHand?.typeId === "minecraft:netherite_hoe" || mainHand?.typeId === "minecraft:netherite_axe") {
          player.addEffect("haste", 40, { amplifier: 1, showParticles: false });
        }
      }

      // --- ARMOR PASSIVE BUFFS (WEEKLY CONTRACT RELICS ONLY!) ---
      // Pechera Mítica Divina -> Resistencia II
      if (chestName.includes("Mítica") && (chestName.includes("Pechera") || chestName.includes("Guerra"))) {
        player.addEffect("resistance", 40, { amplifier: 1, showParticles: false });
      }

      // Botas Míticas Divinas -> Velocidad II + Regeneración I
      if (feetName.includes("Míticas") && (feetName.includes("Botas") || feetName.includes("Dimensionales"))) {
        player.addEffect("speed", 40, { amplifier: 1, showParticles: false });
        player.addEffect("regeneration", 40, { amplifier: 0, showParticles: false });
      }

      // Casco Mítico Divino -> Visión Nocturna + Gracia de Delfín
      if (headName.includes("Mítico") && (headName.includes("Casco") || headName.includes("Submarino"))) {
        player.addEffect("night_vision", 300, { amplifier: 0, showParticles: false });
        player.addEffect("dolphins_grace", 40, { amplifier: 1, showParticles: false });
      }

      // --- RED MOON ECLIPSE MOB BUFFS & VISUAL ATMOSPHERE ---
      if (isRedMoonEclipseActive()) {
        const isPhase2 = isRedMoonPhase2Active();
        const speedAmp = isPhase2 ? 4 : 2;     // Speed V vs Speed III (Súper veloz)
        const strengthAmp = isPhase2 ? 3 : 1;  // Strength IV vs Strength II

        // Command Native Execution forces Minecraft C++ pathfinding engine to accelerate mobs!
        player.runCommandAsync(`effect @e[family=monster,r=40] speed 3 ${speedAmp} true`);
        player.runCommandAsync(`effect @e[family=monster,r=40] strength 3 ${strengthAmp} true`);
        if (isPhase2) {
          player.runCommandAsync(`effect @e[family=monster,r=40] resistance 3 1 true`);
        }

        // Red Actionbar Status Banner right above hotbar
        try {
          const actionText = isPhase2 ? "§4§l[ZENIT DE LUNA ROJA] §c¡Furia Máxima Activa! §e(+3 Em + Doble XP)" : "§c§l[ECLIPSE DE LUNA ROJA] §4¡Criaturas Veloces! §a(+1 Em Extra)";
          player.onScreenDisplay.setActionBar(actionText);
        } catch (e) {}

        // Vibrant Red Particle Ring & Flame Aura around player
        try {
          const loc = player.location;
          const dim = player.dimension;
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const px = loc.x + Math.cos(angle) * 1.5;
            const pz = loc.z + Math.sin(angle) * 1.5;
            dim.spawnParticle("minecraft:redstone_ore_dust_particle", { x: px, y: loc.y + 0.2, z: pz });
            dim.spawnParticle("minecraft:basic_flame_particle", { x: px, y: loc.y + 1.0, z: pz });
          }
        } catch (e) {}
      }

    } catch (e) {}
  }
}, 20);

// Mob Surge Spawner during Red Moon Eclipse (Balanced every 45 seconds / 900 ticks)
system.runInterval(() => {
  try {
    if (isRedMoonEclipseActive()) {
      const isPhase2 = isRedMoonPhase2Active();
      const mobTypes = ["minecraft:zombie", "minecraft:skeleton", "minecraft:creeper", "minecraft:spider"];
      const numToSpawn = isPhase2 ? 2 : 1;

      for (const player of world.getAllPlayers()) {
        try {
          if (isPlayerIgnored(player)) continue;
          const pos = player.location;
          const dim = player.dimension;

          for (let i = 0; i < numToSpawn; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 14 + Math.random() * 6; // 14 to 20 blocks away
            const sx = Math.floor(pos.x + Math.cos(angle) * dist);
            const sz = Math.floor(pos.z + Math.sin(angle) * dist);
            const sy = pos.y;

            const chosenMob = mobTypes[Math.floor(Math.random() * mobTypes.length)];
            const spawned = dim.spawnEntity(chosenMob, { x: sx, y: sy + 1, z: sz });
            spawned.addEffect("speed", 200, { amplifier: 3, showParticles: true });
          }
          player.sendMessage("§c[LUNA ROJA] §4¡Una oleada de criaturas agresivas ha emergido cerca de ti!");
        } catch (e) {}
      }
    }
  } catch (e) {}
}, 900);

// Periodic Chat Status Reminder (Every 2.5 minutes / 3000 ticks)
system.runInterval(() => {
  try {
    if (isRedMoonEclipseActive()) {
      const isPhase2 = isRedMoonPhase2Active();
      const statusText = isPhase2 ? "§4[ZENIT DEL ECLIPSE] ¡Furia máxima activa! Mobs con Velocidad V, Fuerza IV y Resistencia. (+3 Esmeraldas + 2x XP por baja)" : "§c[LUNA ROJA EN CURSO] ¡Mobs con Velocidad III y Fuerza II activos! (+1 Esmeralda extra por baja)";
      world.sendMessage(`\n§c§l===========================================§r\n${statusText}\n§c===========================================§r\n`);
    }
  } catch (e) {}
}, 3000);

// ============================================================
// DYNAMIC NAMETAGS SYSTEM (Every 5 seconds / 100 ticks)
// Updates the nametag of #1 players with their highest title.
// ============================================================

const titleMap = new Map(); // playerId -> current title applied

system.runInterval(() => {
  try {
    const categories = [
      { objId: "PvPKills", title: "§4[Caballero Negro]§r ", priority: 5 },
      { objId: "MobsKilled", title: "§c[Cazador Leyenda]§r ", priority: 4 },
      { objId: "BloquesPicados", title: "§e[Maestro Minero]§r ", priority: 3 },
      { objId: "GranjaTotal", title: "§a[Maestro Granjero]§r ", priority: 2 },
      { objId: "BossesKilled", title: "§5[Matadrakos]§r ", priority: 1 }
    ];

    // Determine what title each player should have (highest priority wins)
    const playerTitles = new Map();

    for (const cat of categories) {
      const top = getTopPlayer(cat.objId);
      if (top && top.score > 0) {
        const existing = playerTitles.get(top.name);
        if (!existing || cat.priority > existing.priority) {
          playerTitles.set(top.name, { title: cat.title, priority: cat.priority });
        }
      }
    }

    // Apply or remove titles & track exploration
    for (const player of world.getAllPlayers()) {
      try {
        checkAndUpdateDailyQuests(player);

        // Track exploration distance (Daily Quest & Weekly Contract)
        const cfgE = getDailyQuestConfig(world.getDay()).explore;
        const px = Math.floor(player.location.x);
        const pz = Math.floor(player.location.z);
        const lastX = player.getDynamicProperty("last_loc_x") ?? px;
        const lastZ = player.getDynamicProperty("last_loc_z") ?? pz;

        const dist = Math.sqrt((px - lastX) * (px - lastX) + (pz - lastZ) * (pz - lastZ));
        if (dist > 1 && dist < 100) {
          // 1. Daily Quest Exploration
          if (!player.getDynamicProperty("q_explore_done")) {
            const currentExp = (player.getDynamicProperty("q_explore_cnt") ?? 0) + dist;
            player.setDynamicProperty("q_explore_cnt", currentExp);
            if (currentExp >= cfgE.target) {
              player.setDynamicProperty("q_explore_done", true);
              processQuestReward(player, `${cfgE.title} (${cfgE.desc})`, cfgE.em, cfgE.xp);
            }
          }

          // 2. Weekly Contract Exploration ("La Odisea Dimensional")
          checkAndUpdateWeeklyContract(player);
          const contractW = getWeeklyContractConfig(world.getDay());
          if (!player.getDynamicProperty("q_weekly_done") && contractW.typeCheck === "contract_explore") {
            const curW = (player.getDynamicProperty("q_weekly_cnt") ?? 0) + dist;
            player.setDynamicProperty("q_weekly_cnt", curW);
            if (curW >= contractW.target) {
              processWeeklyContractReward(player, contractW);
            }
          }
        }
        player.setDynamicProperty("last_loc_x", px);
        player.setDynamicProperty("last_loc_z", pz);

        const titleInfo = playerTitles.get(player.name);
        const mobs = getScore(player, "MobsKilled");
        const bloques = getScore(player, "BloquesPicados");
        const pvp = getScore(player, "PvPKills");

        if (mobs < 1000 && player.hasTag("tag_asesino_serie")) {
          player.removeTag("tag_asesino_serie");
          try { player.setDynamicProperty("reward_1000mobs", false); } catch (e) {}
        }
        if (bloques < 5000 && player.hasTag("tag_leyenda_minera")) {
          player.removeTag("tag_leyenda_minera");
          try { player.setDynamicProperty("reward_5000bloques", false); } catch (e) {}
        }
        if (pvp < 50 && player.hasTag("tag_rey_guerra")) {
          player.removeTag("tag_rey_guerra");
          try { player.setDynamicProperty("reward_50pvp", false); } catch (e) {}
        }

        const citizenRank = getCitizenRank(player);
        const equippedTitle = player.getDynamicProperty("active_equipped_title");
        let rankingTitle = "";

        if (equippedTitle === "matadrakos" && (player.hasTag("tag_matadrakos") || player.getDynamicProperty("custom_ach_matadrakos"))) {
          rankingTitle = "§d[Matadrakos]§r ";
        } else if (equippedTitle === "dios_wither" && (player.hasTag("tag_dios_wither") || player.getDynamicProperty("custom_ach_dios_wither"))) {
          rankingTitle = "§5[Dios Wither]§r ";
        } else if (equippedTitle === "rey_poseidon" && (player.hasTag("tag_rey_poseidon") || player.getDynamicProperty("custom_ach_rey_poseidon"))) {
          rankingTitle = "§b[Rey Poseidon]§r ";
        } else if (equippedTitle === "contratista_real" && (player.hasTag("tag_contratista_real") || player.getDynamicProperty("custom_ach_contratista_real"))) {
          rankingTitle = "§c[Contratista Real]§r ";
        } else if (equippedTitle === "leyenda_minera" && player.hasTag("tag_leyenda_minera")) {
          rankingTitle = "§e[Leyenda Minera]§r ";
        } else if (equippedTitle === "lider_granjero" && player.hasTag("tag_lider_granjero")) {
          rankingTitle = "§a[Líder Granjero]§r ";
        } else if (equippedTitle === "rey_guerra" && player.hasTag("tag_rey_guerra")) {
          rankingTitle = "§c[Rey de la Guerra]§r ";
        } else if (equippedTitle === "asesino_serie" && (player.hasTag("tag_asesino_serie") || mobs >= 1000)) {
          rankingTitle = "§6[Asesino en Serie]§r ";
        } else if (!equippedTitle) {
          // Fallback to highest unlocked title hierarchy
          if (player.hasTag("tag_asesino_serie") && mobs >= 1000) rankingTitle = "§6[Asesino en Serie]§r ";
          else if (titleInfo) rankingTitle = titleInfo.title;
          else if (player.hasTag("tag_contratista_real")) rankingTitle = "§c[Contratista Real]§r ";
          else if (player.hasTag("tag_lider_granjero")) rankingTitle = "§a[Líder Granjero]§r ";
          else if (player.hasTag("tag_rey_poseidon")) rankingTitle = "§b[Rey Poseidon]§r ";
          else if (player.hasTag("tag_dios_wither")) rankingTitle = "§5[Dios Wither]§r ";
          else if (player.hasTag("tag_matadrakos")) rankingTitle = "§d[Matadrakos]§r ";
          else if (player.hasTag("tag_rey_guerra")) rankingTitle = "§c[Rey de la Guerra]§r ";
          else if (player.hasTag("tag_leyenda_minera")) rankingTitle = "§e[Leyenda Minera]§r ";
          else if (player.hasTag("leyenda_500")) rankingTitle = "§b[Leyenda]§r ";
        }

        let tempTitle = "";
        if (player.hasTag("tag_lechero")) {
          tempTitle = "§a[Lechero]§r ";
        } else if (player.hasTag("tag_pajizo")) {
          tempTitle = "§e[Pajizo]§r ";
        }

        const newTag = `${citizenRank}${tempTitle}${rankingTitle}${player.name}`;
        
        if (player.nameTag !== newTag) {
          player.nameTag = newTag;
        }
      } catch (e) {}
    }
  } catch (e) {}
}, 100);

// ============================================================
// PERIODIC RANKINGS BROADCAST (Every 15 minutes / 18000 ticks)
// ============================================================

system.runInterval(() => {
  try {
    const pvpTop = getTopPlayer("PvPKills");
    const mobsTop = getTopPlayer("MobsKilled");
    const blocksTop = getTopPlayer("BloquesPicados");

    let lines = `§r\n§l§6[RANKING OFICIAL DE VILLA ESMERALDA]§r\n`;

    if (pvpTop && pvpTop.score > 0) {
      lines += `  §fLider PvP:§r ${pvpTop.name} §8(${pvpTop.score} bajas)\n`;
    }
    if (mobsTop && mobsTop.score > 0) {
      lines += `  §fLider Mobs:§r ${mobsTop.name} §8(${mobsTop.score} eliminados)\n`;
    }
    if (blocksTop && blocksTop.score > 0) {
      lines += `  §fLider Mineria:§r ${blocksTop.name} §8(${blocksTop.score} bloques)\n`;
    }

    lines += `§7Consulta tus marcas completas con el Escribano Real.\n`;

    world.sendMessage(lines);
  } catch (e) {}
}, 18000);

// ============================================================
// ACOUSTIC ENTRANCE + WAIT MUSIC (LOOPING)
// 5x5x5 radius around NPC (X: 1453, Y: 73, Z: -1021)
// Replays "Wait" automatically while the player stays inside.
// Uses /music command to override ambient game music.
// ============================================================

system.runInterval(() => {
  try {
    for (const player of world.getAllPlayers()) {
      try {
        const { x, y, z } = player.location;
        const inside = (x >= 1448 && x <= 1458 && y >= 70 && y <= 78 && z >= -1026 && z <= -1016);

        if (inside && !playersInOffice.has(player.id)) {
          // ENTERED
          playersInOffice.add(player.id);

          // Entrance sounds
          system.runTimeout(() => {
            try {
              if (!player.isValid()) return;
              player.playSound("item.book.page_turn", { volume: 1.0, pitch: 0.9 });
              player.playSound("beacon.activate", { volume: 0.6, pitch: 1.5 });
            } catch (e) {}
          }, 5);

          // Play Wait immediately via /music to override game ambient music and loop
          system.runTimeout(() => {
            try {
              if (!player.isValid()) return;
              player.runCommandAsync("music play record.wait 0.5 1.0 loop");
            } catch (e) {}
          }, 30);

        } else if (!inside && playersInOffice.has(player.id)) {
          // EXITED: stop music
          playersInOffice.delete(player.id);
          try {
            player.runCommandAsync("music stop 2.0");
          } catch (e) {}
        }
      } catch (e) {}
    }
  } catch (e) {}
}, 10);

// ============================================================
// CUSTOM ACHIEVEMENTS (Items & Inventory)
// ============================================================

// Drinking Milk ("Lechero")
world.afterEvents.itemCompleteUse.subscribe((event) => {
  try {
    if (event.itemStack?.typeId === "minecraft:milk_bucket") {
      grantCustomAchievement(event.source, "lechero", "Lechero");
      event.source.addTag("tag_lechero");
    }
  } catch (e) {}
});

// Fishing ("Coporero")
world.afterEvents.itemUse.subscribe((event) => {
  try {
    if (event.itemStack?.typeId === "minecraft:fishing_rod") {
      grantCustomAchievement(event.source, "coporero", "Coporero");
    }
  } catch (e) {}
});

// Periodic Inventory & Position Check (Every 2 seconds / 40 ticks)
system.runInterval(() => {
  try {
    for (const player of world.getAllPlayers()) {
      try {
        // --- 1. Position Check (Aventurero: 20k blocks from spawn) ---
        const { x, z } = player.location;
        const distance = Math.sqrt(x * x + z * z);
        if (distance >= 20000) {
          grantCustomAchievement(player, "aventurero", "Aventurero");
        }

        // --- 2. Inventory Check ---
        const invComp = player.getComponent("inventory");
        if (!invComp || !invComp.container) continue;
        
        const inv = invComp.container;
        const boatTypes = [
          "minecraft:oak_boat", "minecraft:spruce_boat", "minecraft:birch_boat", "minecraft:jungle_boat", 
          "minecraft:acacia_boat", "minecraft:dark_oak_boat", "minecraft:mangrove_boat", "minecraft:cherry_boat", 
          "minecraft:bamboo_raft", "minecraft:oak_chest_boat", "minecraft:spruce_chest_boat", "minecraft:birch_chest_boat", 
          "minecraft:jungle_chest_boat", "minecraft:acacia_chest_boat", "minecraft:dark_oak_chest_boat", 
          "minecraft:mangrove_chest_boat", "minecraft:cherry_chest_boat", "minecraft:bamboo_chest_raft"
        ];
        
        let stickCount = 0;
        let hasHay = false;
        let hasNetheriteChest = false;
        let hasBoat = false;
        let hasNetheriteHoe = false;
        let hasAxe = false;

        for (let i = 0; i < inv.size; i++) {
          const item = inv.getItem(i);
          if (item) {
            if (item.typeId === "minecraft:stick") stickCount += item.amount;
            else if (item.typeId === "minecraft:hay_block") hasHay = true;
            else if (item.typeId === "minecraft:netherite_chestplate") hasNetheriteChest = true;
            else if (boatTypes.includes(item.typeId)) hasBoat = true;
            else if (item.typeId === "minecraft:netherite_hoe") hasNetheriteHoe = true;
            else if (item.typeId.endsWith("_axe")) hasAxe = true;
          }
        }

        if (stickCount >= 64) grantCustomAchievement(player, "dios_palos", "Dios de los palos");
        if (hasHay) {
          grantCustomAchievement(player, "rey_paja", "El rey de la paja");
          if (!player.hasTag("tag_pajizo")) {
            player.addTag("tag_pajizo");
            player.runCommandAsync("give @s milk_bucket 1");
          }
        }
        if (hasNetheriteChest) grantCustomAchievement(player, "pecho_duro", "Pecho duro");
        if (hasBoat) grantCustomAchievement(player, "canoero", "Canoero");

        // Líder Granjero Élite Achievement (5,000 Cultivos o 5,000 Troncos)
        const totCrops = player.getDynamicProperty("total_crops_harvested") ?? 0;
        const totLogs = player.getDynamicProperty("total_logs_felled") ?? 0;
        if ((totCrops >= 5000 || totLogs >= 5000) && !player.getDynamicProperty("reward_lider_granjero")) {
          player.setDynamicProperty("reward_lider_granjero", true);
          player.addTag("tag_lider_granjero");
          grantCustomAchievement(player, "lider_granjero", "Líder Granjero");
          world.sendMessage(`\n§a§l[LOGRO DESBLOQUEADO]§r\n§f${player.name} §7ha conseguido: §eLíder Granjero §7(5,000 Cultivos o 5,000 Troncos) y recibe el Kit Supremo Granjero de Netherite y 4 Libros Encantados!\n`);
          for (const p of world.getAllPlayers()) {
            try { p.playSound("ui.toast.challenge_complete", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
          }
          player.runCommandAsync("xp 200L @s");
          player.runCommandAsync("give @s emerald_block 64");
          player.runCommandAsync("give @s netherite_ingot 1");
          givePreEnchantedItem(player, "minecraft:netherite_hoe", [{id:"efficiency",level:5},{id:"fortune",level:3},{id:"unbreaking",level:3},{id:"mending",level:1}], "§aAzada del Líder Granjero§r");
          givePreEnchantedItem(player, "minecraft:netherite_axe", [{id:"efficiency",level:5},{id:"sharpness",level:5},{id:"unbreaking",level:3},{id:"mending",level:1}], "§aHacha del Líder Granjero§r");
        }
      } catch (e) {}
    }
  } catch (e) {}
}, 100);

// ============================================================
// AUTOMATED DROWNED SPAWNER (Island Cell: X: 1553, Y: 49, Z: -995)
// Spawns Drowned underwater around the island when a player is near.
// Maintains a cap of 8 Drowned to ensure zero server lag.
// ============================================================

system.runInterval(() => {
  try {
    const dim = world.getDimension("overworld");
    const islandLoc = { x: 1553, y: 49, z: -995 };
    
    // Check if any player is within 35 blocks of the island
    let playerNear = false;
    for (const player of world.getAllPlayers()) {
      if (player.isValid()) {
        const dx = player.location.x - islandLoc.x;
        const dy = player.location.y - islandLoc.y;
        const dz = player.location.z - islandLoc.z;
        if (dx * dx + dy * dy + dz * dz <= 1225) { // 35 blocks radius
          playerNear = true;
          break;
        }
      }
    }

    if (!playerNear) return;

    // Count existing drowned around the island (25 block radius)
    const drownedEntities = dim.getEntities({
      type: "minecraft:drowned",
      location: islandLoc,
      maxDistance: 25
    });

    if (drownedEntities.length < 8) {
      // Spawn a new Drowned at random position around underwater floor (Y: 49)
      const offsetX = Math.floor((Math.random() - 0.5) * 16);
      const offsetZ = Math.floor((Math.random() - 0.5) * 16);
      const spawnX = islandLoc.x + offsetX;
      const spawnY = islandLoc.y;
      const spawnZ = islandLoc.z + offsetZ;

      try {
        dim.spawnEntity("minecraft:drowned", { x: spawnX, y: spawnY, z: spawnZ });
      } catch (e) {}
    }
  } catch (e) {}
}, 100);

// ============================================================
// AUTOMATED PRISON & ANTI-SABOTAGE SYSTEM (v36.4.0)
// Cell: X: 1553, Y: 69, Z: -992 | Stone: X: 1551, Y: 67, Z: -992
// Spawn Exit: X: 1593, Y: 64, Z: -1164
// ============================================================

const PRISON_CONFIG = {
  cellLoc: { x: 1553, y: 69, z: -992 },
  stoneLoc: { x: 1551, y: 67, z: -992 },
  releaseLoc: { x: 1593, y: 64, z: -1164 },
  levels: {
    preso_nivel1: { item: "minecraft:iron_pickaxe", name: "Hierro (250 usos)", enchants: [{ id: "silk_touch", level: 1 }] },
    preso_nivel2: { item: "minecraft:iron_pickaxe", name: "Hierro Irrompible (750 usos)", enchants: [{ id: "silk_touch", level: 1 }, { id: "unbreaking", level: 3 }] },
    preso_nivel3: { item: "minecraft:diamond_pickaxe", name: "Diamante (1,561 usos)", enchants: [{ id: "silk_touch", level: 1 }] },
    preso_nivel4: { item: "minecraft:diamond_pickaxe", name: "Diamante Irrompible (4,683 usos)", enchants: [{ id: "silk_touch", level: 1 }, { id: "unbreaking", level: 3 }] },
    preso_nivel5: { item: "minecraft:netherite_pickaxe", name: "Netherite (2,031 usos)", enchants: [{ id: "silk_touch", level: 1 }] },
    preso_nivel6: { item: "minecraft:netherite_pickaxe", name: "Netherite Irrompible (6,093 usos)", enchants: [{ id: "silk_touch", level: 1 }, { id: "unbreaking", level: 3 }] }
  }
};

// Protect Lava Generator Column at X: 1551, Z: -992 (Y: 67..72):
// If a prisoner attempts to place a block into the generator column (including Y: 71), restore lava & regenerate pickaxe!
world.afterEvents.playerPlaceBlock.subscribe((event) => {
  try {
    const { player, block } = event;
    if (!player || !block) return;

    // Daily Quest Check (Farming - Planting Saplings)
    const placedId = block.typeId;
    if (placedId.includes("sapling") || placedId.includes("propagule")) {
      checkAndUpdateDailyQuests(player);
      const cfgF = getDailyQuestConfig(world.getDay()).farm;
      if (!player.getDynamicProperty("q_farm_done")) {
        if (cfgF.typeCheck === "sapling_plant") {
          const currentFarm = (player.getDynamicProperty("q_farm_cnt") ?? 0) + 1;
          player.setDynamicProperty("q_farm_cnt", currentFarm);
          if (currentFarm >= cfgF.target) {
            player.setDynamicProperty("q_farm_done", true);
            processQuestReward(player, `${cfgF.title} (${cfgF.desc})`, cfgF.em, cfgF.xp);
          }
        }
      }
    }
    
    let activeLevelTag = null;
    for (const tag of Object.keys(PRISON_CONFIG.levels)) {
      if (player.hasTag(tag)) {
        activeLevelTag = tag;
        break;
      }
    }

    if (activeLevelTag) {
      const bx = block.location.x;
      const by = block.location.y;
      const bz = block.location.z;

      // Check if block was placed in the generator column at X: 1551, Z: -992 (Y: 67 to 72)
      if (bx === 1551 && bz === -992 && by >= 67 && by <= 72) {
        // Restore Lava stream
        try {
          block.setPermutation(BlockPermutation.resolve("minecraft:lava"));
        } catch (e) {}

        // Regenerate pickaxe as penalty for attempting to sabotage lava!
        const inv = player.getComponent("inventory")?.container;
        if (inv) {
          inv.clearAll();
          const lvlCfg = PRISON_CONFIG.levels[activeLevelTag];
          const item = new ItemStack(lvlCfg.item, 1);
          const enchantComp = item.getComponent("minecraft:enchantable");
          if (enchantComp) {
            for (const enc of lvlCfg.enchants) {
              try {
                enchantComp.addEnchantment({ type: new EnchantmentType(enc.id), level: enc.level });
              } catch (err) {}
            }
          }
          inv.addItem(item);
        }

        player.sendMessage(`\n§c§l[SANCION POR SABOTAJE]§r\n§f¡Has intentado tapar la lava del generador! Tu pico ha sido regenerado a nuevo como castigo.\n`);
        try { player.playSound("ambient.weather.thunder", { volume: 0.8, pitch: 1.0 }); } catch (e) {}
      }
    }
  } catch (e) {}
});

const pendingArrests = new Set();

// 3. Prisoner Automation Loop (Runs every 1 second / 20 ticks)
system.runInterval(() => {
  try {
    const dim = world.getDimension("overworld");

    for (const player of world.getAllPlayers()) {
      try {
        if (!player || !player.isValid()) continue;

        let activeLevelTag = null;
        for (const tag of Object.keys(PRISON_CONFIG.levels)) {
          if (player.hasTag(tag)) {
            activeLevelTag = tag;
            break;
          }
        }

        if (activeLevelTag) {
          const isJailed = player.getDynamicProperty("jailed_active");

          // A. INITIATE ARREST (10s Warning)
          if (!isJailed && !pendingArrests.has(player.id)) {
            pendingArrests.add(player.id);

            try {
              player.onScreenDisplay.setTitle("§c§lARRESTO INMINENTE");
              player.onScreenDisplay.updateSubtitle("§fGuarda tus cosas. En 10s iras a la Celda.");
            } catch (e) {}

            player.sendMessage(`\n§c§l[ADVERTENCIA DE PRISION]§r\n§fTienes 10 segundos para guardar tus objetos en un cofre. Seras trasladado a la Celda de la Isla y tu inventario sera limpiado.\n`);
            try { player.playSound("ambient.weather.thunder", { volume: 0.8, pitch: 1.0 }); } catch (e) {}

            system.runTimeout(() => {
              try {
                if (!player || !player.isValid()) return;
                pendingArrests.delete(player.id);

                player.setDynamicProperty("jailed_active", true);
                player.addTag("ignorar_escribano");

                // Native Inventory Clear
                const inv = player.getComponent("inventory")?.container;
                if (inv) {
                  inv.clearAll();
                }

                // Native SpawnPoint & Teleport
                try {
                  player.setSpawnPoint({ dimension: dim, location: PRISON_CONFIG.cellLoc });
                } catch (e) {}

                try {
                  player.teleport(PRISON_CONFIG.cellLoc);
                } catch (e) {}

                // Give assigned Silk Touch Pickaxe
                const lvlCfg = PRISON_CONFIG.levels[activeLevelTag];
                if (inv) {
                  const item = new ItemStack(lvlCfg.item, 1);
                  const enchantComp = item.getComponent("minecraft:enchantable");
                  if (enchantComp) {
                    for (const enc of lvlCfg.enchants) {
                      try {
                        enchantComp.addEnchantment({ type: new EnchantmentType(enc.id), level: enc.level });
                      } catch (err) {}
                    }
                  }
                  inv.addItem(item);
                }

                world.sendMessage(`\n§c§l[PRISIONERO ENTRANDO A CELDA]§r\n§f${player.name} §7ha sido ingresado a la Celda de la Isla con condena §e${lvlCfg.name}§7!\n`);
              } catch (e) {
                pendingArrests.delete(player.id);
              }
            }, 200); // 10 seconds delay
          }

          // B. ACTIVE PRISONER MAINTENANCE
          if (isJailed && !pendingArrests.has(player.id)) {
            // Anti-Escape Position Tether (Keep inside cell)
            const dx = player.location.x - PRISON_CONFIG.cellLoc.x;
            const dz = player.location.z - PRISON_CONFIG.cellLoc.z;
            if (dx * dx + dz * dz > 225) {
              try { player.teleport(PRISON_CONFIG.cellLoc); } catch (e) {}
            }

            // Floor Item Cleaner (Destroys loose items lying around cell floor)
            try {
              dim.runCommandAsync(`kill @e[type=item,x=1553,y=69,z=-992,r=10]`);
            } catch (e) {}

            // Check if Pickaxe is Broken
            const inv = player.getComponent("inventory")?.container;
            let hasPick = false;
            if (inv) {
              for (let i = 0; i < inv.size; i++) {
                const item = inv.getItem(i);
                if (item && item.typeId.includes("pickaxe")) {
                  hasPick = true;
                  break;
                }
              }
            }

            // C. AUTOMATIC RELEASE UPON PICKAXE BREAK
            if (!hasPick && !player.getDynamicProperty("jail_rewarding")) {
              player.setDynamicProperty("jail_rewarding", true);

              // Restore Spawn Point to Spawn Plaza
              try {
                player.setSpawnPoint({ dimension: dim, location: PRISON_CONFIG.releaseLoc });
              } catch (e) {}

              // Remove Prison Tags & States
              for (const tag of Object.keys(PRISON_CONFIG.levels)) {
                player.removeTag(tag);
              }
              player.removeTag("ignorar_escribano");
              player.setDynamicProperty("jailed_active", false);
              player.setDynamicProperty("jail_rewarding", false);

              // Native Teleport to Spawn Exit
              try {
                player.teleport(PRISON_CONFIG.releaseLoc);
              } catch (e) {}

              world.sendMessage(`\n§a§l[CONDENA CUMPLIDA]§r\n§f${player.name} §7ha terminado de romper su pico en la Celda de la Isla y ha sido liberado en el Spawn!\n`);
              for (const p of world.getAllPlayers()) {
                try { p.playSound("ui.toast.challenge_complete", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
              }
            }
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}, 20);

// ============================================================
// INTERACTIVE TITLE SELECTION MENU (CLOCK / RELOJ ITEM USE)
// Opens a personalized HUD menu listing ONLY unlocked titles
// ============================================================

function openTitleMenu(player) {
  try {
    if (!player || !player.isValid()) return;

    const availableTitles = [];

    if (player.hasTag("tag_matadrakos") || player.getDynamicProperty("custom_ach_matadrakos")) {
      availableTitles.push({ id: "matadrakos", name: "§d[Matadrakos]§r" });
    }
    if (player.hasTag("tag_dios_wither") || player.getDynamicProperty("custom_ach_dios_wither")) {
      availableTitles.push({ id: "dios_wither", name: "§5[Dios Wither]§r" });
    }
    if (player.hasTag("tag_rey_poseidon") || player.getDynamicProperty("custom_ach_rey_poseidon")) {
      availableTitles.push({ id: "rey_poseidon", name: "§b[Rey Poseidon]§r" });
    }
    if (player.hasTag("tag_contratista_real") || player.getDynamicProperty("custom_ach_contratista_real")) {
      availableTitles.push({ id: "contratista_real", name: "§c[Contratista Real]§r" });
    }
    if (player.hasTag("tag_leyenda_minera")) {
      availableTitles.push({ id: "leyenda_minera", name: "§e[Leyenda Minera]§r" });
    }
    if (player.hasTag("tag_lider_granjero")) {
      availableTitles.push({ id: "lider_granjero", name: "§a[Líder Granjero]§r" });
    }
    if (player.hasTag("tag_rey_guerra")) {
      availableTitles.push({ id: "rey_guerra", name: "§c[Rey de la Guerra]§r" });
    }
    if (player.hasTag("tag_asesino_serie") || player.getDynamicProperty("custom_ach_asesino_serie")) {
      availableTitles.push({ id: "asesino_serie", name: "§6[Asesino en Serie]§r" });
    }

    const form = new ActionFormData();
    form.title("§6[SELECTOR DE TITULOS]§r");

    if (availableTitles.length === 0) {
      form.body("§cNo has desbloqueado ningun titulo especial todavia.\n\n§7¡Derrota Jefes o completa Contratos Semanales para conseguir titulos!");
      form.button("§c[Cerrar]§r");
      form.show(player);
      return;
    }

    form.body("§fSelecciona el titulo que deseas lucir sobre tu cabeza:");

    for (const t of availableTitles) {
      form.button(`Equipar ${t.name}`);
    }
    form.button("§c[Quitar Titulo Actual]§r");

    form.show(player).then((res) => {
      if (res.canceled || res.selection === undefined) return;

      if (res.selection < availableTitles.length) {
        const selected = availableTitles[res.selection];
        player.setDynamicProperty("active_equipped_title", selected.id);
        player.sendMessage(`§a[ESCRIBANO] ¡Has equipado el titulo ${selected.name}!`);
        try { player.playSound("random.orb", { volume: 1.0, pitch: 1.2 }); } catch (e) {}
      } else {
        player.setDynamicProperty("active_equipped_title", null);
        player.sendMessage("§a[ESCRIBANO] Has quitado tu titulo personalizado.");
        try { player.playSound("random.orb", { volume: 1.0, pitch: 1.2 }); } catch (e) {}
      }
    }).catch(() => {});
  } catch (e) {}
}

world.beforeEvents.itemUse.subscribe((event) => {
  try {
    const { itemStack, source } = event;
    if (!source || source.typeId !== "minecraft:player") return;

    if (itemStack.typeId === "minecraft:clock") {
      system.run(() => {
        openClockMainMenu(source);
      });
    }
  } catch (e) {}
});

// ============================================================
// UNIFIED CLOCK HUD MENU (RELOJ / MINECRAFT:CLOCK)
// Opens Main Menu -> Titles Selector or Land Claims Manager
// ============================================================

function openClockMainMenu(player) {
  try {
    if (!player || !player.isValid()) return;

    const form = new ActionFormData();
    form.title("§6[MENU PRINCIPAL DE LA VILLA]§r");
    form.body(`§f¡Hola, §e${player.name}§f!\n§7Usa este menú para personalizar tu título o gestionar tus parcelas protegidas.`);

    form.button("§e[Titulos] §fSelector de Titulos");
    form.button("§a[Parcelas] §fGestion de Parcelas Protegidas");
    form.button("§b[Perfil] §fVer Estadisticas");
    form.button("§c[Cerrar]§r");

    form.show(player).then((res) => {
      if (res.canceled || res.selection === undefined) return;

      if (res.selection === 0) {
        openTitleMenu(player);
      } else if (res.selection === 1) {
        openMyClaimsMenu(player);
      } else if (res.selection === 2) {
        player.addTag("ver_perfil");
      }
    }).catch(() => {});
  } catch (e) {}
}

function openMyClaimsMenu(player) {
  try {
    if (!player || !player.isValid()) return;

    const claims = getClaims();
    const myClaims = claims.filter(c => c.ownerName === player.name);

    const form = new ActionFormData();
    form.title("§6[MIS PARCELAS PROTEGIDAS]§r");

    if (myClaims.length === 0) {
      form.body("§cNo tienes ninguna parcela protegida actualmente.\n\n§7¡Coloca una Farola de Alma (soul_lantern) en el suelo para proteger un area de 16x16!");
      form.button("§c[Cerrar]§r");
      form.show(player);
      return;
    }

    form.body(`§fTienes §a${myClaims.length}/12§f parcelas protegidas.\nSelecciona una para administrar sus amigos o eliminarla:`);

    for (let i = 0; i < myClaims.length; i++) {
      const c = myClaims[i];
      form.button(`§e[Parcela #${i + 1}] §f(X: ${Math.floor(c.x)}, Z: ${Math.floor(c.z)})`);
    }
    form.button("§7[Volver]§r");

    form.show(player).then((res) => {
      if (res.canceled || res.selection === undefined) return;

      if (res.selection < myClaims.length) {
        const selectedClaim = myClaims[res.selection];
        openSingleClaimMenu(player, selectedClaim);
      } else if (res.selection === myClaims.length) {
        openClockMainMenu(player);
      }
    }).catch(() => {});
  } catch (e) {}
}

function openSingleClaimMenu(player, claim) {
  try {
    if (!player || !player.isValid()) return;

    const membersList = (claim.members || [claim.ownerName]).join(", ");

    const form = new ActionFormData();
    form.title(`§6[PARCELA (X: ${Math.floor(claim.x)}, Z: ${Math.floor(claim.z)})]§r`);
    form.body(`§fPropietario: §e${claim.ownerName}\n§fUbicacion: §7X: ${Math.floor(claim.x)}, Y: ${Math.floor(claim.y)}, Z: ${Math.floor(claim.z)}\n§fMiembros Autorizados: §a${membersList}`);

    form.button("§a[+] Agregar Amigo");
    form.button("§c[-] Remover Amigo");
    form.button("§4[Eliminar Proteccion]");
    form.button("§7[Volver a Parcelas]");

    form.show(player).then((res) => {
      if (res.canceled || res.selection === undefined) return;

      if (res.selection === 0) {
        const currentMembers = claim.members || [claim.ownerName];
        const onlinePlayers = world.getAllPlayers().filter(p => !currentMembers.includes(p.name));

        if (onlinePlayers.length === 0) {
          player.sendMessage("§c[PROTECCION] No hay otros jugadores conectados para agregar.");
          return;
        }
        const addForm = new ActionFormData();
        addForm.title("§6[AGREGAR AMIGO]§r");
        addForm.body("Selecciona el jugador al que deseas darle permisos:");
        for (const p of onlinePlayers) {
          addForm.button(`§a[+] §f${p.name}`);
        }
        addForm.show(player).then((addRes) => {
          if (addRes.canceled || addRes.selection === undefined) return;
          const chosen = onlinePlayers[addRes.selection];
          const claims = getClaims();
          const targetClaim = claims.find(c => c.id === claim.id);
          if (targetClaim) {
            if (!targetClaim.members) targetClaim.members = [targetClaim.ownerName];
            if (!targetClaim.members.includes(chosen.name)) {
              targetClaim.members.push(chosen.name);
              saveClaims(claims);
              player.sendMessage(`§a[PROTECCION] ¡Has agregado a ${chosen.name} a tu parcela!`);
              chosen.sendMessage(`§a[PROTECCION] ¡${player.name} te ha otorgado permisos en su parcela!`);
              try { player.playSound("random.orb", { volume: 1.0, pitch: 1.2 }); } catch (e) {}
            }
          }
        });
      } else if (res.selection === 1) {
        const currentMembers = claim.members || [claim.ownerName];
        const membersToRemove = currentMembers.filter(m => m !== claim.ownerName);
        if (membersToRemove.length === 0) {
          player.sendMessage("§c[PROTECCION] No tienes amigos agregados en esta parcela.");
          return;
        }
        const remForm = new ActionFormData();
        remForm.title("§6[REMOVER AMIGO]§r");
        remForm.body("Selecciona el amigo al que deseas quitarle permisos:");
        for (const m of membersToRemove) {
          remForm.button(`§c[-] §f${m}`);
        }
        remForm.show(player).then((remRes) => {
          if (remRes.canceled || remRes.selection === undefined) return;
          const chosenName = membersToRemove[remRes.selection];
          const claims = getClaims();
          const targetClaim = claims.find(c => c.id === claim.id);
          if (targetClaim) {
            targetClaim.members = targetClaim.members.filter(m => m !== chosenName);
            saveClaims(claims);
            player.sendMessage(`§e[PROTECCIÓN] Has removido a ${chosenName} de tu parcela.`);
            try { player.playSound("random.fizz", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
          }
        });
      } else if (res.selection === 2) {
        const claims = getClaims().filter(c => c.id !== claim.id);
        saveClaims(claims);
        player.sendMessage("§e[PROTECCIÓN] La protección de esta parcela ha sido eliminada.");
        try { player.playSound("random.fizz", { volume: 1.0, pitch: 1.0 }); } catch (e) {}
      } else if (res.selection === 3) {
        openMyClaimsMenu(player);
      }
    }).catch(() => {});
  } catch (e) {}
}

// ============================================================
// PARCEL LAND CLAIMING SYSTEM (SOUL LANTERN / FAROLA DE ALMA)
// Claims a 16x16 chunk area centered at placed Soul Lanterns.
// Protects blocks, chests, doors & interactables against non-members.
// ============================================================

function getClaims() {
  try {
    const raw = world.getDynamicProperty("claimed_lands") ?? "[]";
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveClaims(claimsArr) {
  try {
    world.setDynamicProperty("claimed_lands", JSON.stringify(claimsArr));
  } catch (e) {}
}

function getClaimAt(dimId, x, z) {
  const claims = getClaims();
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  for (const c of claims) {
    if (c.dimId === dimId) {
      if (Math.abs(bx - Math.floor(c.x)) <= 8 && Math.abs(bz - Math.floor(c.z)) <= 8) {
        return c;
      }
    }
  }
  return null;
}

world.afterEvents.playerPlaceBlock.subscribe((event) => {
  try {
    const { block, player } = event;
    if (block.typeId === "minecraft:soul_lantern") {
      const dimId = player.dimension.id;
      const bx = Math.floor(block.location.x);
      const by = Math.floor(block.location.y);
      const bz = Math.floor(block.location.z);

      const existing = getClaimAt(dimId, bx, bz);
      if (existing) {
        player.sendMessage(`§c[PROTECCIÓN] Este área ya está dentro de la parcela de ${existing.ownerName}.`);
        return;
      }

      const claims = getClaims();
      const playerClaims = claims.filter(c => c.ownerName === player.name);
      if (playerClaims.length >= 12 && !player.hasTag("admin")) {
        player.sendMessage("§c[PROTECCION] Has alcanzado el limite maximo de 12 parcelas protegidas por jugador.");
        return;
      }

      const newClaim = {
        id: `${dimId}_${bx}_${by}_${bz}`,
        ownerName: player.name,
        dimId: dimId,
        x: bx,
        y: by,
        z: bz,
        members: [player.name]
      };

      claims.push(newClaim);
      saveClaims(claims);

      player.sendMessage(`\n§a§l[PARCELA RECLAMADA]§r\n§f¡Has colocado tu Farola de Alma y reclamado esta parcela (16x16)!§r\n§7Usa tu Reloj (clic derecho) para agregar amigos o gestionar tus parcelas.\n`);
      try { player.playSound("random.levelup", { volume: 0.8, pitch: 1.2 }); } catch (e) {}
    }
  } catch (e) {}
});

world.beforeEvents.playerBreakBlock.subscribe((event) => {
  try {
    const { block, player } = event;
    const dimId = player.dimension.id;
    const bx = Math.floor(block.location.x);
    const by = Math.floor(block.location.y);
    const bz = Math.floor(block.location.z);

    const claim = getClaimAt(dimId, bx, bz);
    if (!claim) return;

    const isAdmin = player.hasTag("admin") || player.hasTag("op") || player.hasTag("admin_logged");
    if (isAdmin) return; // Admins can break anything inside any claim!

    const isOwner = claim.ownerName === player.name;
    const isMember = claim.members && claim.members.includes(player.name);

    if (block.typeId === "minecraft:soul_lantern" &&
        bx === Math.floor(claim.x) &&
        by === Math.floor(claim.y) &&
        bz === Math.floor(claim.z)) {
      if (isOwner || isAdmin) {
        system.run(() => {
          const claims = getClaims().filter(c => c.id !== claim.id);
          saveClaims(claims);
          if (isAdmin && !isOwner) {
            player.sendMessage(`§e[ADMIN] Has retirado la Farola de Alma y eliminado la parcela de ${claim.ownerName}.`);
          } else {
            player.sendMessage("§e[PROTECCIÓN] Has retirado tu Farola de Alma. La parcela ha sido desprotegida.");
          }
        });
        return;
      } else {
        event.cancel = true;
        system.run(() => {
          player.sendMessage(`§c[PROTECCIÓN] Solo ${claim.ownerName} (o un Administrador OP) puede retirar esta Farola de Alma.`);
        });
        return;
      }
    }

    if (!isOwner && !isMember) {
      event.cancel = true;
      system.run(() => {
        player.sendMessage(`§c[TERRENO PROTEGIDO] Esta propiedad pertenece a ${claim.ownerName}. No tienes permiso.`);
      });
    }
  } catch (e) {}
});

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  try {
    const { block, player } = event;
    const dimId = player.dimension.id;
    const bx = Math.floor(block.location.x);
    const by = Math.floor(block.location.y);
    const bz = Math.floor(block.location.z);

    const claim = getClaimAt(dimId, bx, bz);
    if (!claim) return;

    const isAdmin = player.hasTag("admin") || player.hasTag("op") || player.hasTag("admin_logged");
    if (isAdmin) return; // Admins can interact with anything inside any claim!

    const isOwner = claim.ownerName === player.name;
    const isMember = claim.members && claim.members.includes(player.name);

    const protectedBlocks = [
      "chest", "trapped_chest", "barrel", "shulker_box", "undyed_shulker_box",
      "furnace", "blast_furnace", "smoker", "hopper", "dispenser", "dropper",
      "door", "trapdoor", "fence_gate", "anvil", "enchanting_table", "lectern", "brewing_stand"
    ];

    const blockType = block.typeId.replace("minecraft:", "");
    const isProtectedType = protectedBlocks.some(p => blockType.includes(p));

    if (isProtectedType && !isOwner && !isMember) {
      event.cancel = true;
      system.run(() => {
        player.sendMessage(`§c[TERRENO PROTEGIDO] Esta propiedad pertenece a ${claim.ownerName}.`);
      });
    }
  } catch (e) {}
});

