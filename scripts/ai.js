// Mindustry JS mod: base builder + unit commander (skeleton)

var Log = Packages.arc.util.Log;
var IntSeq = Packages.arc.struct.IntSeq;
var InputHandler = Packages.mindustry.input.InputHandler;
var UnitCommand = Packages.mindustry.ai.UnitCommand;
var Vec2 = Packages.arc.math.geom.Vec2;
var Socket = Packages.java.net.Socket;
var InetSocketAddress = Packages.java.net.InetSocketAddress;
var OutputStreamWriter = Packages.java.io.OutputStreamWriter;
var BufferedWriter = Packages.java.io.BufferedWriter;
var PrintWriter = Packages.java.io.PrintWriter;
var Fi = Packages.arc.files.Fi;

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
  rallyDistance: 7,
  maxTurrets: 6,
  maxPowerClusters: 2,
  memorySize: 3,
  repeatPenalty: 25,
  actionCooldown: 180,
  modName: "ia-base-ataque",
  rlLogEnabled: true,
  rlSocketEnabled: false,
  rlSocketHost: "127.0.0.1",
  rlSocketPort: 4567,
  rlSocketReconnectTicks: 300,
  rlSocketTimeoutMs: 200,
  rlSocketQueueMax: 200,
  rlPolicyMode: "heuristic",
  rlQTableFile: "q_table.json",
  rlQTablePath: "",
  rlQTableReloadTicks: 0,
  rlQTableBlend: 0.7,
  aiEnabledDefault: true,
  aiChatToggle: true
};

var state = {
  built: false,
  lastMode: "",
  tick: 0,
  lastWaveTick: -9999,
  waveIndex: 0,
  drillCount: 0,
  turretCount: 0,
  powerClusters: 0,
  actionHistory: [],
  lastActionTicks: {},
  aiEnabled: true
};

// --- RL logging helpers (offline training via logs) ---
var rlSocket = {
  sock: null,
  out: null,
  lastConnectTick: -9999,
  queue: []
};

var rlQTable = null;
var rlQMeta = {
  actions: ["attackWave", "rally", "mine", "defend", "power", "noop"],
  features: [
    { name: "copper", bins: [0, 50, 100, 200, 400, 800] },
    { name: "lead", bins: [0, 50, 100, 200, 400, 800] },
    { name: "drills", bins: [0, 1, 2, 3, 4, 5] },
    { name: "turrets", bins: [0, 2, 4, 6, 8] },
    { name: "power", bins: [0, 1, 2, 3] },
    { name: "enemies", bins: [0, 1, 3, 6, 10, 20] },
    { name: "unitsTotal", bins: [0, 3, 6, 10, 20, 40] },
    { name: "coreHealthFrac", bins: [0.1, 0.25, 0.5, 0.75, 0.9] },
    { name: "corePresent", bins: [0.5] },
    { name: "enemyCore", bins: [0.5] },
    { name: "distEnemy", bins: [5, 10, 20, 40, 80] }
  ]
};
var rlQTableLastLoadTick = -9999;
var rlQTableLastErrorTick = -9999;

function rlSocketConnected() {
  return rlSocket.sock != null && rlSocket.out != null;
}

function rlSocketClose() {
  try {
    if (rlSocket.out != null) rlSocket.out.close();
  } catch (e) {
    // ignore
  }
  try {
    if (rlSocket.sock != null) rlSocket.sock.close();
  } catch (e2) {
    // ignore
  }
  rlSocket.sock = null;
  rlSocket.out = null;
}

function rlSocketConnect() {
  if (!config.rlSocketEnabled) return false;
  if (rlSocketConnected()) return true;
  if ((state.tick - rlSocket.lastConnectTick) < config.rlSocketReconnectTicks) return false;
  rlSocket.lastConnectTick = state.tick;
  try {
    var s = new Socket();
    s.connect(new InetSocketAddress(config.rlSocketHost, config.rlSocketPort), config.rlSocketTimeoutMs);
    s.setTcpNoDelay(true);
    var out = new PrintWriter(new BufferedWriter(new OutputStreamWriter(s.getOutputStream(), "UTF-8")), true);
    rlSocket.sock = s;
    rlSocket.out = out;
    Log.info("[RL] Socket conectado: " + config.rlSocketHost + ":" + config.rlSocketPort);
    return true;
  } catch (e) {
    rlSocketClose();
    return false;
  }
}

function rlSocketQueue(line) {
  rlSocket.queue.push(line);
  while (rlSocket.queue.length > config.rlSocketQueueMax) {
    rlSocket.queue.shift();
  }
}

function rlSocketFlush() {
  if (!rlSocketConnect()) return false;
  if (!rlSocketConnected()) return false;
  try {
    while (rlSocket.queue.length > 0) {
      rlSocket.out.println(rlSocket.queue.shift());
    }
    return true;
  } catch (e) {
    rlSocketClose();
    return false;
  }
}

function rlSocketSend(line) {
  if (!config.rlSocketEnabled) return;
  rlSocketQueue(line);
  rlSocketFlush();
}

function snapshotState(core, enemyCore, enemies, team) {
  var corePresent = core != null;
  var copper = 0;
  var lead = 0;
  var coreItems = 0;
  var coreHealth = 0;
  var coreMax = 1;
  if (corePresent && core.items != null) {
    copper = core.items.get(Items.copper);
    lead = core.items.get(Items.lead);
    try {
      coreItems = core.items.total();
    } catch (e0) {
      coreItems = 0;
    }
  }
  if (corePresent) {
    try {
      coreHealth = core.health;
      coreMax = core.maxHealth;
    } catch (e1) {
      coreHealth = 0;
      coreMax = 1;
    }
    if (coreMax == null || coreMax <= 0) coreMax = coreHealth > 0 ? coreHealth : 1;
  }
  var coreHealthFrac = coreMax > 0 ? Math.round((coreHealth / coreMax) * 100) / 100 : 0;

  var unitsGround = 0;
  var unitsAir = 0;
  var unitsSupport = 0;
  if (team != null) {
    var buckets = collectUnitBuckets(team);
    unitsGround = buckets.ground.size;
    unitsAir = buckets.air.size;
    unitsSupport = buckets.support.size;
  }
  var unitsTotal = unitsGround + unitsAir + unitsSupport;

  var baseX = corePresent ? core.tile.x : 0;
  var baseY = corePresent ? core.tile.y : 0;
  var dx = enemyCore != null ? (enemyCore.x - baseX) : 0;
  var dy = enemyCore != null ? (enemyCore.y - baseY) : 0;
  var dist = enemyCore != null ? Math.round(Math.sqrt(dx * dx + dy * dy)) : -1;
  return {
    tick: state.tick,
    copper: copper,
    lead: lead,
    drills: state.drillCount,
    turrets: state.turretCount,
    power: state.powerClusters,
    enemies: enemies,
    wave: state.waveIndex,
    enemyCore: enemyCore != null ? 1 : 0,
    distEnemy: dist,
    corePresent: corePresent ? 1 : 0,
    coreItems: coreItems,
    coreHealth: Math.round(coreHealth),
    coreHealthFrac: coreHealthFrac,
    unitsGround: unitsGround,
    unitsAir: unitsAir,
    unitsSupport: unitsSupport,
    unitsTotal: unitsTotal
  };
}

function emitTransition(prevState, actionName, nextState, info) {
  var payload = { s: prevState, a: actionName, s2: nextState, info: info, t: state.tick };
  var line = JSON.stringify(payload);
  if (config.rlLogEnabled) Log.info("[RL]" + line);
  rlSocketSend(line);
}

function setAiEnabled(enabled, player) {
  state.aiEnabled = enabled;
  var msg = enabled ? "IA ligada." : "IA desligada.";
  Log.info("[IA] " + msg);
  try {
    if (player != null) player.sendMessage(msg);
  } catch (e) {
    // ignore
  }
}

function resolveQTableFi() {
  if (config.rlQTablePath != null && config.rlQTablePath != "") {
    try {
      return new Fi(config.rlQTablePath);
    } catch (e) {
      return null;
    }
  }
  try {
    var mod = Vars.mods.getMod(config.modName);
    if (mod != null && mod.root != null) {
      return mod.root.child(config.rlQTableFile);
    }
  } catch (e2) {
    // ignore
  }
  try {
    return new Fi(config.rlQTableFile);
  } catch (e3) {
    return null;
  }
}

function loadQTable() {
  var fi = resolveQTableFi();
  if (fi == null || !fi.exists()) {
    if ((state.tick - rlQTableLastErrorTick) > 600) {
      Log.info("[RL] Q-table nao encontrada: " + config.rlQTableFile);
      rlQTableLastErrorTick = state.tick;
    }
    rlQTable = null;
    return false;
  }
  try {
    var text = fi.readString();
    var data = JSON.parse(String(text));
    rlQTable = data.q != null ? data.q : null;
    if (data.actions != null && data.actions.length != null) rlQMeta.actions = data.actions;
    if (data.features != null && data.features.length != null) rlQMeta.features = data.features;
    if (rlQTable == null) {
      Log.info("[RL] Q-table invalida (sem chave 'q').");
      return false;
    }
    rlQTableLastLoadTick = state.tick;
    Log.info("[RL] Q-table carregada: " + fi.absolutePath());
    return true;
  } catch (e) {
    if ((state.tick - rlQTableLastErrorTick) > 600) {
      Log.info("[RL] Erro ao carregar Q-table.");
      rlQTableLastErrorTick = state.tick;
    }
    rlQTable = null;
    return false;
  }
}

function bucketize(value, bins) {
  var idx = 0;
  for (var i = 0; i < bins.length; i++) {
    if (value >= bins[i]) idx++;
  }
  return idx;
}

function encodeStateKey(stateObj, features) {
  var key = [];
  for (var i = 0; i < features.length; i++) {
    var f = features[i];
    var name = f.name;
    var bins = f.bins;
    var val = stateObj[name];
    if (val == null) val = 0;
    key.push(bucketize(val, bins));
  }
  return key.join(",");
}

function qScoresForState(stateObj) {
  if (rlQTable == null || rlQMeta == null) return null;
  var features = rlQMeta.features != null ? rlQMeta.features : [];
  if (features.length == 0) return null;
  var key = encodeStateKey(stateObj, features);
  var values = rlQTable[key];
  if (values == null) return null;
  var scores = {};
  var actions = rlQMeta.actions != null ? rlQMeta.actions : [];
  for (var i = 0; i < actions.length && i < values.length; i++) {
    scores[actions[i]] = values[i];
  }
  return scores;
}

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
  var nodePlaced = placeBlock(Blocks.powerNode, node.x, node.y, 0, team);

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

  if (nodePlaced) state.powerClusters++;
  return nodePlaced;
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
    if (placeBlock(Blocks.mechanicalDrill, ores[i].x, ores[i].y, 0, team)) {
      state.drillCount++;
    }
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
    if (placeBlock(Blocks.duo, off.x, off.y, 0, team)) {
      state.turretCount++;
    }
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

function countEnemyUnits(team) {
  var count = 0;
  Groups.unit.each(function(u){
    if (u.team != team) count++;
  });
  return count;
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

function pushHistory(name) {
  state.actionHistory.push(name);
  while (state.actionHistory.length > config.memorySize) {
    state.actionHistory.shift();
  }
}

function recentPenalty(name) {
  var hits = 0;
  for (var i = 0; i < state.actionHistory.length; i++) {
    if (state.actionHistory[i] == name) hits++;
  }
  return hits * config.repeatPenalty;
}

function actionReady(name) {
  var last = state.lastActionTicks[name];
  if (last == null) return true;
  return (state.tick - last) >= config.actionCooldown;
}

function recordAction(name) {
  state.lastActionTicks[name] = state.tick;
  pushHistory(name);
}

function findBestOreNearCore(core) {
  var cx = core.tile.x;
  var cy = core.tile.y;
  var ores = findOreTiles(cx, cy, config.oreSearchRadius, config.maxDrills);
  for (var i = 0; i < ores.length; i++) {
    var tile = tileAt(ores[i].x, ores[i].y);
    if (tile != null && tile.block() == Blocks.air) return ores[i];
  }
  return null;
}

function actionMine(core) {
  var team = getTeam();
  var ore = findBestOreNearCore(core);
  if (ore == null) return false;
  if (!placeBlock(Blocks.mechanicalDrill, ore.x, ore.y, 0, team)) return false;
  state.drillCount++;
  var cx = core.tile.x;
  var cy = core.tile.y;
  var step = stepToward(ore.x, ore.y, cx, cy);
  var sx = ore.x + step.dx;
  var sy = ore.y + step.dy;
  placeConveyorPath(team, sx, sy, cx, cy, config.maxConveyorSteps);
  return true;
}

function actionDefend(core) {
  var team = getTeam();
  if (state.turretCount >= config.maxTurrets) return false;
  var offsets = [
    { dx: 6, dy: 0 },
    { dx: -6, dy: 0 },
    { dx: 0, dy: 6 },
    { dx: 0, dy: -6 },
    { dx: 8, dy: 3 },
    { dx: -8, dy: 3 },
    { dx: 8, dy: -3 },
    { dx: -8, dy: -3 }
  ];
  for (var i = 0; i < offsets.length; i++) {
    var pick = offsets[(state.turretCount + i) % offsets.length];
    var off = clampOffset(core.tile.x, core.tile.y, pick.dx, pick.dy);
    if (placeBlock(Blocks.duo, off.x, off.y, 0, team)) {
      state.turretCount++;
      return true;
    }
  }
  return false;
}

function actionPower(core) {
  if (state.powerClusters >= config.maxPowerClusters) return false;
  return placePowerCluster(getTeam(), core.tile.x + 4, core.tile.y + 2);
}

function actionRally(core, enemyCore) {
  var team = getTeam();
  var buckets = collectUnitBuckets(team);
  var rally = getRallyPoint(core, enemyCore, config.rallyDistance);
  var rallyIds = collectRallyIds(buckets);
  commandUnitIds(team, rallyIds, null, rally);
  return rallyIds.size > 0;
}

function actionAttackWave(core, enemyCore) {
  var team = getTeam();
  var buckets = collectUnitBuckets(team);
  var canWave = waveReady(buckets);
  var cooled = (state.tick - state.lastWaveTick) >= config.waveCooldown;
  if (!(canWave && cooled)) return false;
  var waveIds = collectWaveIds(buckets);
  commandUnitIds(team, waveIds, enemyCore, new Vec2(enemyCore.x, enemyCore.y));
  state.lastWaveTick = state.tick;
  state.waveIndex++;
  Log.info("[IA] Onda " + state.waveIndex + " lançada: " + waveIds.size + " unidades.");
  return waveIds.size > 0;
}

function rankActions(actions) {
  var ranked = [];
  for (var i = 0; i < actions.length; i++) {
    var a = actions[i];
    if (!actionReady(a.name)) continue;
    var score = a.score - recentPenalty(a.name);
    if (score < 0) score = 0;
    if (score <= 0) continue;
    ranked.push({ name: a.name, score: score, run: a.run });
  }
  ranked.sort(function(a, b){ return b.score - a.score; });
  return ranked;
}

Events.on(WorldLoadEvent, function(){
  state.built = false;
  state.lastMode = "";
  state.tick = 0;
  state.lastWaveTick = -9999;
  state.waveIndex = 0;
  state.drillCount = 0;
  state.turretCount = 0;
  state.powerClusters = 0;
  state.actionHistory = [];
  state.lastActionTicks = {};
  state.aiEnabled = config.aiEnabledDefault;
  rlSocketClose();
  rlSocket.queue = [];
  rlQTable = null;
  rlQTableLastLoadTick = -9999;
  rlQTableLastErrorTick = -9999;
  if (config.rlPolicyMode != "heuristic") loadQTable();
  Log.info("[IA] Mundo carregado. Preparando plano de base.");
});

Events.on(PlayerChatEvent, function(e){
  if (!config.aiChatToggle) return;
  if (e == null || e.message == null) return;
  var msg = String(e.message).trim().toLowerCase();
  if (msg.length == 0) return;
  var parts = msg.split(/\s+/);
  if (parts[0] != "/ia") return;

  var cmd = parts.length > 1 ? parts[1] : "toggle";
  var enabled = state.aiEnabled;
  if (cmd == "on" || cmd == "ligar" || cmd == "start" || cmd == "true" || cmd == "1") {
    enabled = true;
  } else if (cmd == "off" || cmd == "desligar" || cmd == "stop" || cmd == "false" || cmd == "0") {
    enabled = false;
  } else if (cmd == "status" || cmd == "estado") {
    try {
      if (e.player != null) e.player.sendMessage("IA: " + (state.aiEnabled ? "ligada" : "desligada"));
    } catch (e2) {
      // ignore
    }
    e.cancelled = true;
    return;
  } else {
    enabled = !state.aiEnabled;
  }

  setAiEnabled(enabled, e.player);
  e.cancelled = true;
});

Events.run(Trigger.update, function(){
  state.tick++;

  if (!state.aiEnabled) return;

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

  var enemyCore = findEnemyCore(team2);
  var enemies = countEnemyUnits(team2);
  var copper = core2.items.get(Items.copper);
  var lead = core2.items.get(Items.lead);
  var wantsAttack = enemyCore != null && shouldAttack(core2);
  var beforeState = snapshotState(core2, enemyCore, enemies, team2);

  if (config.rlPolicyMode != "heuristic") {
    if (config.rlQTableReloadTicks > 0 && (state.tick - rlQTableLastLoadTick) >= config.rlQTableReloadTicks) {
      loadQTable();
    } else if (rlQTable == null) {
      loadQTable();
    }
  }

  var actions = [
    {
      name: "attackWave",
      score: wantsAttack ? 100 : 0,
      run: function(){ return enemyCore != null && actionAttackWave(core2, enemyCore); }
    },
    {
      name: "rally",
      score: wantsAttack ? 55 : 0,
      run: function(){ return enemyCore != null && actionRally(core2, enemyCore); }
    },
    {
      name: "mine",
      score: (copper < 200 ? 85 : copper < 400 ? 60 : 25) + (state.drillCount < config.maxDrills ? 20 : 0),
      run: function(){ return actionMine(core2); }
    },
    {
      name: "defend",
      score: (enemies > 0 ? 90 : 30) + (state.turretCount < config.maxTurrets ? 20 : 0),
      run: function(){ return actionDefend(core2); }
    },
    {
      name: "power",
      score: (state.powerClusters < config.maxPowerClusters && copper > 200 && lead > 150) ? 35 : 0,
      run: function(){ return actionPower(core2); }
    },
    {
      name: "noop",
      score: 0,
      run: function(){ return true; }
    }
  ];

  if (config.rlPolicyMode != "heuristic" && rlQTable != null) {
    var qScores = qScoresForState(beforeState);
    if (qScores != null) {
      for (var qi = 0; qi < actions.length; qi++) {
        var act = actions[qi];
        var qv = qScores[act.name];
        if (qv == null) {
          if (config.rlPolicyMode == "qtable") act.score = 0;
          continue;
        }
        if (config.rlPolicyMode == "qtable") {
          act.score = qv;
        } else if (config.rlPolicyMode == "hybrid") {
          act.score = act.score * (1 - config.rlQTableBlend) + qv * config.rlQTableBlend;
        }
      }
    } else if (config.rlPolicyMode == "qtable") {
      for (var qi2 = 0; qi2 < actions.length; qi2++) actions[qi2].score = 0;
    }
  }

  var ranked = rankActions(actions);
  var did = false;
  var pickedName = "noop";
  for (var r = 0; r < ranked.length; r++) {
    var picked = ranked[r];
    var ok = false;
    try {
      ok = picked.run();
    } catch (e) {
      ok = false;
    }
    if (ok) {
      did = true;
      pickedName = picked.name;
      recordAction(picked.name);
      if (picked.name != state.lastMode) {
        Log.info("[IA] Ação: " + picked.name);
        state.lastMode = picked.name;
      }
      break;
    }
  }

  var core3 = getCore(team2);
  var enemyCore2 = findEnemyCore(team2);
  var enemies2 = countEnemyUnits(team2);
  var afterState = snapshotState(core3, enemyCore2, enemies2, team2);
  emitTransition(beforeState, pickedName, afterState, { ok: did });
});
