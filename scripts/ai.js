// Mindustry JS mod: base builder + unit commander (skeleton)

var Log = Packages.arc.util.Log;
var IntSeq = Packages.arc.struct.IntSeq;
var InputHandler = Packages.mindustry.input.InputHandler;
var UnitCommand = Packages.mindustry.ai.UnitCommand;
var Vec2 = Packages.arc.math.geom.Vec2;

var config = {
  buildDelay: 30,
  commandInterval: 120,
  waveCooldown: 600,
  waveMinTotal: 10,
  waveMinGround: 6,
  waveMinAir: 4,
  waveSupportMax: 2,
  oreSearchRadius: 12,
  maxDrills: 5,
  maxConveyorSteps: 60,
  rallyDistance: 7
};

var state = {
  built: false,
  lastMode: "",
  tick: 0,
  lastWaveTick: -9999,
  waveIndex: 0
};

function getTeam() {
  if (Vars.player != null) return Vars.player.team();
  return Vars.state.rules.defaultTeam;
}

function getCore(team) {
  if (Vars.player != null && Vars.player.core() != null) return Vars.player.core();
  try {
    var data = Vars.state.teams.get(team);
    if (data != null) return data.core();
  } catch (e) {
    // ignore
  }
  return null;
}

function worldWidth() {
  return Vars.world.width();
}

function worldHeight() {
  return Vars.world.height();
}

function tileAt(x, y) {
  if (x < 0 || y < 0 || x >= worldWidth() || y >= worldHeight()) return null;
  return Vars.world.tile(x, y);
}

function clampToBounds(x, y) {
  var nx = Math.max(1, Math.min(worldWidth() - 2, x));
  var ny = Math.max(1, Math.min(worldHeight() - 2, y));
  return { x: nx, y: ny };
}

function placeBlock(block, x, y, rotation, team) {
  var tile = tileAt(x, y);
  if (tile == null) return false;
  if (tile.block() != Blocks.air) return false;
  if (Vars.player == null) return false;
  Call.constructFinish(Vars.player, block, x, y, rotation || 0, team, false);
  return true;
}

function clampOffset(cx, cy, dx, dy) {
  var x = cx + dx;
  var y = cy + dy;
  if (x < 2 || x >= worldWidth() - 2) dx = -dx;
  if (y < 2 || y >= worldHeight() - 2) dy = -dy;
  return { x: cx + dx, y: cy + dy };
}

function rotationForStep(dx, dy) {
  if (dx > 0) return 0; // right
  if (dy > 0) return 1; // up
  if (dx < 0) return 2; // left
  if (dy < 0) return 3; // down
  return 0;
}

function stepToward(x, y, tx, ty) {
  var dx = tx - x;
  var dy = ty - y;
  var sx = dx == 0 ? 0 : (dx > 0 ? 1 : -1);
  var sy = 0;
  if (sx == 0) sy = dy == 0 ? 0 : (dy > 0 ? 1 : -1);
  return { dx: sx, dy: sy };
}

function placeConveyorPath(team, sx, sy, tx, ty, maxSteps) {
  var x = sx;
  var y = sy;
  var steps = 0;
  while ((x != tx || y != ty) && steps < maxSteps) {
    var step = stepToward(x, y, tx, ty);
    if (step.dx == 0 && step.dy == 0) break;
    var nx = x + step.dx;
    var ny = y + step.dy;
    var ntile = tileAt(nx, ny);
    if (ntile == null) break;
    var rot = rotationForStep(step.dx, step.dy);
    placeBlock(Blocks.conveyor, x, y, rot, team);
    if (ntile.block() != Blocks.air) {
      if (ntile.block().isCore != null && ntile.block().isCore()) break;
      break;
    }
    x = nx;
    y = ny;
    steps++;
  }
}

function findOreTiles(cx, cy, radius, maxCount) {
  var found = [];
  for (var dx = -radius; dx <= radius; dx++) {
    for (var dy = -radius; dy <= radius; dy++) {
      var tile = tileAt(cx + dx, cy + dy);
      if (tile == null) continue;
      if (tile.drop() != null) {
        var dist2 = dx * dx + dy * dy;
        found.push({ x: tile.x, y: tile.y, dist2: dist2 });
      }
    }
  }
  found.sort(function(a, b){ return a.dist2 - b.dist2; });
  if (found.length > maxCount) found.length = maxCount;
  return found;
}

function placePowerCluster(team, baseX, baseY) {
  var node = clampToBounds(baseX - 2, baseY + 1);
  placeBlock(Blocks.powerNode, node.x, node.y, 0, team);

  var panels = [
    { dx: -1, dy: 0 },
    { dx: 0, dy: 0 },
    { dx: -1, dy: 1 },
    { dx: 0, dy: 1 }
  ];
  for (var i = 0; i < panels.length; i++) {
    var p = clampToBounds(node.x + panels[i].dx, node.y + panels[i].dy);
    placeBlock(Blocks.solarPanel, p.x, p.y, 0, team);
  }

  var batt = clampToBounds(node.x + 1, node.y + 1);
  placeBlock(Blocks.battery, batt.x, batt.y, 0, team);
}

function placeFactoryAndFeeder(core) {
  var team = getTeam();
  var cx = core.tile.x;
  var cy = core.tile.y;
  var foff = clampOffset(cx, cy, 8, 3);
  var factoryPlaced = placeBlock(Blocks.groundFactory, foff.x, foff.y, 0, team);

  if (factoryPlaced) {
    var step = stepToward(cx, cy, foff.x, foff.y);
    var ux = cx + step.dx;
    var uy = cy + step.dy;
    placeBlock(Blocks.unloader, ux, uy, 0, team);

    var sx = ux + step.dx;
    var sy = uy + step.dy;
    placeConveyorPath(team, sx, sy, foff.x, foff.y, config.maxConveyorSteps);

    placePowerCluster(team, foff.x, foff.y);
  } else {
    placePowerCluster(team, cx + 4, cy + 2);
  }
}

function buildPlan(core) {
  var team = getTeam();
  var cx = core.tile.x;
  var cy = core.tile.y;

  // 1) Fabrica + energia basica.
  placeFactoryAndFeeder(core);

  // 2) Mineradores em mineros proximos (adapta ao mapa).
  var ores = findOreTiles(cx, cy, config.oreSearchRadius, config.maxDrills);
  for (var i = 0; i < ores.length; i++) {
    placeBlock(Blocks.mechanicalDrill, ores[i].x, ores[i].y, 0, team);
    var step = stepToward(ores[i].x, ores[i].y, cx, cy);
    var sx = ores[i].x + step.dx;
    var sy = ores[i].y + step.dy;
    placeConveyorPath(team, sx, sy, cx, cy, config.maxConveyorSteps);
  }

  // 3) Defesas basicas (duo) em cruz ao redor do core.
  var defenseOffsets = [
    { dx: 6, dy: 0 },
    { dx: -6, dy: 0 },
    { dx: 0, dy: 6 },
    { dx: 0, dy: -6 }
  ];
  for (var d = 0; d < defenseOffsets.length; d++) {
    var off = clampOffset(cx, cy, defenseOffsets[d].dx, defenseOffsets[d].dy);
    placeBlock(Blocks.duo, off.x, off.y, 0, team);
  }

  // 4) Muros diagonais para nao travar esteiras.
  var wallOffsets = [
    { dx: 2, dy: 2 }, { dx: -2, dy: 2 },
    { dx: 2, dy: -2 }, { dx: -2, dy: -2 }
  ];
  for (var w = 0; w < wallOffsets.length; w++) {
    var woff = clampOffset(cx, cy, wallOffsets[w].dx, wallOffsets[w].dy);
    placeBlock(Blocks.copperWall, woff.x, woff.y, 0, team);
  }
}

function shouldAttack(core) {
  if (core == null || core.items == null) return false;
  var copper = core.items.get(Items.copper);
  var lead = core.items.get(Items.lead);
  return copper >= 400 && lead >= 300;
}

function findEnemyCore(team) {
  try {
    var cores = Vars.state.teams.enemyCores(team);
    if (cores != null && cores.size > 0) return cores.first();
  } catch (e) {
    // ignore
  }
  try {
    var cores2 = Vars.state.teams.enemyCores();
    if (cores2 != null && cores2.size > 0) return cores2.first();
  } catch (e2) {
    // ignore
  }
  var found = null;
  Groups.build.each(function(b){
    if (b.block != null && b.block.isCore != null && b.block.isCore() && b.team != team) {
      found = b;
    }
  });
  return found;
}

function collectUnitIds(team) {
  var ids = new IntSeq();
  Groups.unit.each(function(u){
    if (u.team == team) ids.add(u.id);
  });
  return ids;
}

function containsType(list, type) {
  for (var i = 0; i < list.length; i++) {
    if (list[i] == type) return true;
  }
  return false;
}

var supportTypes = [
  UnitTypes.nova,
  UnitTypes.pulsar,
  UnitTypes.quasar,
  UnitTypes.vela,
  UnitTypes.corvus
];

function collectUnitBuckets(team) {
  var buckets = {
    ground: new IntSeq(),
    air: new IntSeq(),
    support: new IntSeq()
  };
  Groups.unit.each(function(u){
    if (u.team != team) return;
    if (containsType(supportTypes, u.type)) {
      buckets.support.add(u.id);
    } else if (u.type.flying) {
      buckets.air.add(u.id);
    } else {
      buckets.ground.add(u.id);
    }
  });
  return buckets;
}

function toIntArray(intSeq) {
  var arr = java.lang.reflect.Array.newInstance(java.lang.Integer.TYPE, intSeq.size);
  for (var i = 0; i < intSeq.size; i++) {
    java.lang.reflect.Array.setInt(arr, i, intSeq.get(i));
  }
  return arr;
}

function appendSeq(dst, src, limit) {
  var n = limit == null ? src.size : Math.min(src.size, limit);
  for (var i = 0; i < n; i++) dst.add(src.get(i));
}

function commandUnitIds(team, ids, buildTarget, pos) {
  if (Vars.player == null) return;
  if (ids == null || ids.size == 0) return;
  var arr = toIntArray(ids);

  // Move command works as a generic rally/attack order.
  try {
    InputHandler.setUnitCommand(Vars.player, arr, UnitCommand.moveCommand);
  } catch (e) {
    // ignore
  }

  try {
    InputHandler.commandUnits(Vars.player, arr, buildTarget, null, pos, false, true);
  } catch (e2) {
    // ignore
  }
}

function waveReady(buckets) {
  var total = buckets.ground.size + buckets.air.size + buckets.support.size;
  if (total < config.waveMinTotal) return false;
  if (buckets.ground.size >= config.waveMinGround) return true;
  if (buckets.air.size >= config.waveMinAir) return true;
  return false;
}

function collectWaveIds(buckets) {
  var ids = new IntSeq();
  appendSeq(ids, buckets.ground);
  appendSeq(ids, buckets.air);
  appendSeq(ids, buckets.support, config.waveSupportMax);
  return ids;
}

function collectRallyIds(buckets) {
  var ids = new IntSeq();
  appendSeq(ids, buckets.ground);
  appendSeq(ids, buckets.air);
  return ids;
}

function getRallyPoint(core, enemyCore, dist) {
  var dx = enemyCore.x - core.x;
  var dy = enemyCore.y - core.y;
  var len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  var rx = Math.round(core.x + (dx / len) * dist);
  var ry = Math.round(core.y + (dy / len) * dist);
  var clamped = clampToBounds(rx, ry);
  return new Vec2(clamped.x, clamped.y);
}

Events.on(WorldLoadEvent, function(){
  state.built = false;
  state.lastMode = "";
  state.tick = 0;
  state.lastWaveTick = -9999;
  state.waveIndex = 0;
  Log.info("[IA] Mundo carregado. Preparando plano de base.");
});

Events.run(Trigger.update, function(){
  state.tick++;

  // Build once, after a small delay to ensure world is ready.
  if (!state.built && state.tick > config.buildDelay) {
    var team = getTeam();
    var core = getCore(team);
    if (core != null) {
      buildPlan(core);
      state.built = true;
      Log.info("[IA] Base inicial montada.");
    }
  }

  // Decide orders every 120 ticks (~2s at 60fps).
  if (state.tick % config.commandInterval != 0) return;

  var team2 = getTeam();
  var core2 = getCore(team2);
  if (core2 == null) return;

  var attack = shouldAttack(core2);
  var mode = attack ? "attack" : "defend";
  if (mode != state.lastMode) {
    Log.info("[IA] Modo: " + mode);
    state.lastMode = mode;
  }

  if (attack) {
    var enemyCore = findEnemyCore(team2);
    if (enemyCore != null) {
      var buckets = collectUnitBuckets(team2);
      var canWave = waveReady(buckets);
      var cooled = (state.tick - state.lastWaveTick) >= config.waveCooldown;
      var rally = getRallyPoint(core2, enemyCore, config.rallyDistance);

      if (canWave && cooled) {
        var waveIds = collectWaveIds(buckets);
        commandUnitIds(team2, waveIds, enemyCore, new Vec2(enemyCore.x, enemyCore.y));
        state.lastWaveTick = state.tick;
        state.waveIndex++;
        Log.info("[IA] Onda " + state.waveIndex + " lançada: " + waveIds.size + " unidades.");
      } else {
        var rallyIds = collectRallyIds(buckets);
        commandUnitIds(team2, rallyIds, null, rally);
      }
    }
  } else {
    var defendIds = collectUnitIds(team2);
    commandUnitIds(team2, defendIds, null, new Vec2(core2.x, core2.y));
  }
});
