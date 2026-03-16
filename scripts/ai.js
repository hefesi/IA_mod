// Mindustry JS mod: base builder + unit commander (skeleton)

var Log = Packages.arc.util.Log;
var IntSeq = Packages.arc.struct.IntSeq;
var InputHandler = Packages.mindustry.input.InputHandler;
var UnitCommand = Packages.mindustry.ai.UnitCommand;
var Vec2 = Packages.arc.math.geom.Vec2;
var Build = Packages.mindustry.world.Build;
var BlockGroup = Packages.mindustry.world.meta.BlockGroup;
var BlockFlag = Packages.mindustry.world.meta.BlockFlag;
var Table = Packages.arc.scene.ui.layout.Table;
var Touchable = Packages.arc.scene.Touchable;
var Styles = Packages.mindustry.ui.Styles;
var Icon = Packages.mindustry.gen.Icon;
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
  maxPumps: 2,
  maxLiquidHubs: 1,
  maxThermals: 2,
  maxCoolantTargets: 2,
  thermalSearchRadius: 12,
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
  aiChatToggle: true,
  aiTapToggle: true,
  tapToggleWindow: 30,
  aiHudButton: true,
  aiDebugHud: true,
  debugUpdateInterval: 30,
  campaignSafeMode: true,
  warnInterval: 300,
  liquidSearchRadius: 10,
  maxConduitSteps: 80,
  liquidHubSearchRadius: 8,
  preferLiquidTank: false,
  preferCryofluid: true,
  mobileSafeMode: true,
  mobileLogicInterval: 60,
  mobileCommandInterval: 180,
  mobileFactoryConfigInterval: 1200,
  mobileLiquidSearchRadius: 8,
  safeModeLogInterval: 600,
  factoryConfigInterval: 600,
  preferredGroundUnit: "dagger",
  preferredAirUnit: "mono",
  preferredNavalUnit: "risso"
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
  pumpCount: 0,
  liquidHubCount: 0,
  thermalCount: 0,
  actionHistory: [],
  lastActionTicks: {},
  aiEnabled: true,
  lastFactoryConfigTick: -9999,
  lastErrorTick: -9999,
  lastTapTick: -9999,
  lastTapX: -1,
  lastTapY: -1,
  lastAiTick: -9999,
  lastAction: "",
  lastActionOk: false,
  lastPlaceFail: "",
  lastWarnTick: -9999
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
var aiHud = {
  table: null,
  button: null,
  debugLabel: null,
  useIcon: false
};

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
    pumps: state.pumpCount,
    liquidHubs: state.liquidHubCount,
    thermals: state.thermalCount,
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
  notify(msg, player);
  updateHudButton();
}

function isMobileSafe() {
  return config.mobileSafeMode && (Vars.mobile || Vars.android);
}

function applyMobileSafeMode() {
  if (!isMobileSafe()) return;
  config.rlSocketEnabled = false;
  config.rlLogEnabled = false;
  config.rlPolicyMode = "heuristic";
  if (config.commandInterval < config.mobileCommandInterval) config.commandInterval = config.mobileCommandInterval;
  if (config.factoryConfigInterval < config.mobileFactoryConfigInterval) config.factoryConfigInterval = config.mobileFactoryConfigInterval;
  if (config.liquidSearchRadius > config.mobileLiquidSearchRadius) config.liquidSearchRadius = config.mobileLiquidSearchRadius;
}

function notify(msg, player) {
  try {
    if (player != null) player.sendMessage(msg);
  } catch (e) {
    // ignore
  }
  try {
    if (Vars.ui != null && Vars.ui.announce != null) Vars.ui.announce(msg);
  } catch (e2) {
    // ignore
  }
  Log.info("[IA] " + msg);
}

function warnBuildFail(msg) {
  if ((state.tick - state.lastWarnTick) < config.warnInterval) return;
  state.lastWarnTick = state.tick;
  try {
    if (Vars.ui != null && Vars.ui.hudfrag != null && Vars.ui.hudfrag.showToast != null) {
      Vars.ui.hudfrag.showToast(Icon.warning, msg);
      return;
    }
  } catch (e) {
    // ignore
  }
  notify(msg, getLocalPlayer());
}

function buildHudButton() {
  if (!config.aiHudButton) return;
  if (Vars.ui == null || Vars.ui.hudGroup == null) return;
  if (Core.scene == null) return;

  try {
    var table = new Table();
    table.setFillParent(true);
    table.touchable = Touchable.childrenOnly;
    table.top().left().margin(6);

    var useIcon = (Icon != null && Icon.play != null && Icon.pause != null);
    var cell;
    if (useIcon) {
      cell = table.button(Icon.pause, Styles.clearTogglei, function(){
        setAiEnabled(!state.aiEnabled, getLocalPlayer());
      });
      cell.size(46, 46);
    } else {
      cell = table.button("IA", Styles.flatBordert, function(){
        setAiEnabled(!state.aiEnabled, getLocalPlayer());
      });
      cell.size(72, 38);
    }
    var btn = cell.get();

    var labelCell = table.row().label("IA debug").left();
    labelCell.padTop(4);
    var label = labelCell.get();
    try {
      label.setStyle(Styles.outlineLabel);
    } catch (e0) {
      // ignore
    }

    aiHud.table = table;
    aiHud.button = btn;
    aiHud.debugLabel = label;
    aiHud.useIcon = useIcon;
    Vars.ui.hudGroup.addChild(table);
    updateHudButton();
  } catch (e) {
    aiHud.table = null;
    aiHud.button = null;
    aiHud.debugLabel = null;
    aiHud.useIcon = false;
  }
}

function updateHudButton() {
  if (aiHud.button == null) return;
  try {
    aiHud.button.setChecked(state.aiEnabled);
  } catch (e) {
    // ignore
  }
  if (aiHud.useIcon) {
    try {
      var style = aiHud.button.getStyle();
      if (style != null && style.imageUp != null) {
        style.imageUp = state.aiEnabled ? Icon.pause : Icon.play;
      }
    } catch (e2) {
      // ignore
    }
  }
}

function updateHudDebug() {
  if (!config.aiDebugHud || aiHud.debugLabel == null) return;
  if (config.debugUpdateInterval > 1 && (state.tick % config.debugUpdateInterval) != 0) return;
  var player = getLocalPlayer();
  var team = getTeam();
  var core = getCore(team);
  var pOk = player != null ? "ok" : "null";
  var cOk = core != null ? "ok" : "null";
  var text = "IA " + (state.aiEnabled ? "ON" : "OFF") +
    " | p:" + pOk +
    " c:" + cOk +
    " built:" + (state.built ? "1" : "0") +
    " tick:" + state.tick +
    " last:" + (state.lastAction == "" ? "-" : state.lastAction) +
    (state.lastPlaceFail != "" ? (" fail:" + state.lastPlaceFail) : "");
  try {
    aiHud.debugLabel.setText(text);
    aiHud.debugLabel.visible = true;
  } catch (e) {
    // ignore
  }
}

function ensureHudButton() {
  if (!config.aiHudButton) return;
  if (aiHud.table != null) {
    try {
      if (aiHud.table.parent != null) return;
    } catch (e) {
      // ignore
    }
    aiHud.table = null;
    aiHud.button = null;
    aiHud.debugLabel = null;
    aiHud.useIcon = false;
  }
  buildHudButton();
}

function unitTypeByName(name) {
  if (name == null) return null;
  try {
    var unit = UnitTypes[name];
    if (unit != null) return unit;
  } catch (e) {
    // ignore
  }
  return null;
}

function configureBuild(build, value) {
  if (build == null) return false;
  var player = getLocalPlayer();
  try {
    if (player != null) {
      build.configure(value);
      return true;
    }
  } catch (e) {
    // ignore
  }
  try {
    build.configureAny(value);
    return true;
  } catch (e2) {
    // ignore
  }
  try {
    Call.tileConfig(player, build, value);
    return true;
  } catch (e3) {
    // ignore
  }
  return false;
}

function configureFactories(team) {
  if ((state.tick - state.lastFactoryConfigTick) < config.factoryConfigInterval) return false;
  var ground = unitTypeByName(config.preferredGroundUnit);
  var air = unitTypeByName(config.preferredAirUnit);
  var naval = unitTypeByName(config.preferredNavalUnit);
  var changed = false;
  Groups.build.each(function(b){
    if (b == null || b.team != team) return;
    if (b.block == Blocks.groundFactory && ground != null && (!config.campaignSafeMode || ground.unlockedNow())) {
      changed = configureBuild(b, ground) || changed;
    } else if (b.block == Blocks.airFactory && air != null && (!config.campaignSafeMode || air.unlockedNow())) {
      changed = configureBuild(b, air) || changed;
    } else if (b.block == Blocks.navalFactory && naval != null && (!config.campaignSafeMode || naval.unlockedNow())) {
      changed = configureBuild(b, naval) || changed;
    }
  });
  state.lastFactoryConfigTick = state.tick;
  return changed;
}

function computePowerStatus(team) {
  var sum = 0;
  var count = 0;
  var min = 1;
  Groups.build.each(function(b){
    if (b == null || b.team != team) return;
    if (b.power == null || b.block == null) return;
    var isPowerBlock = b.block.group == BlockGroup.power || b.block.outputsPower || b.block.hasPower;
    if (!isPowerBlock) return;
    var st = b.power.status;
    if (st == null) return;
    sum += st;
    count++;
    if (st < min) min = st;
  });
  return {
    avg: count > 0 ? sum / count : 1,
    min: count > 0 ? min : 1,
    count: count
  };
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
  var player = getLocalPlayer();
  if (player != null) return player.team();
  return Vars.state.rules.defaultTeam;
}

function getCore(team) {
  var player = getLocalPlayer();
  if (player != null && player.core() != null) return player.core();
  try {
    var data = Vars.state.teams.get(team);
    if (data != null) return data.core();
  } catch (e) {
    // ignore
  }
  return null;
}

function getLocalPlayer() {
  if (Vars.player != null) return Vars.player;
  var found = null;
  try {
    Groups.player.each(function(p){
      if (found == null && p != null && p.isLocal != null && p.isLocal()) found = p;
    });
    if (found == null) {
      Groups.player.each(function(p){
        if (found == null && p != null) found = p;
      });
    }
  } catch (e) {
    // ignore
  }
  return found;
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

function canPlaceBlock(block, x, y, rotation, team) {
  if (block == null) return false;
  if (!blockUnlocked(block)) return false;
  var tile = tileAt(x, y);
  if (tile == null) return false;
  var t = team != null ? team : getTeam();
  try {
    return Build.validPlace(block, t, x, y, rotation || 0);
  } catch (e) {
    return false;
  }
}

function blockUnlocked(block) {
  if (!config.campaignSafeMode) return true;
  if (block == null) return false;
  try {
    return block.unlockedNow();
  } catch (e) {
    return true;
  }
}

function findPlaceForBlock(block, cx, cy, radius, team) {
  for (var dx = -radius; dx <= radius; dx++) {
    for (var dy = -radius; dy <= radius; dy++) {
      var x = cx + dx;
      var y = cy + dy;
      if (canPlaceBlock(block, x, y, 0, team)) {
        return { x: x, y: y };
      }
    }
  }
  return null;
}

function findOpenTileAround(cx, cy, radius) {
  for (var dx = -radius; dx <= radius; dx++) {
    for (var dy = -radius; dy <= radius; dy++) {
      var tile = tileAt(cx + dx, cy + dy);
      if (tile == null) continue;
      if (tile.block() == Blocks.air) return { x: tile.x, y: tile.y };
    }
  }
  return null;
}

function clampToBounds(x, y) {
  var nx = Math.max(1, Math.min(worldWidth() - 2, x));
  var ny = Math.max(1, Math.min(worldHeight() - 2, y));
  return { x: nx, y: ny };
}

function placeBlock(block, x, y, rotation, team) {
  var tile = tileAt(x, y);
  if (tile == null) {
    if (config.aiDebugHud) state.lastPlaceFail = "no-tile";
    return false;
  }
  if (!blockUnlocked(block)) {
    if (config.aiDebugHud) state.lastPlaceFail = "locked:" + block.name;
    warnBuildFail("Bloqueado: " + block.localizedName);
    return false;
  }
  if (!canPlaceBlock(block, x, y, rotation || 0, team)) {
    if (config.aiDebugHud) state.lastPlaceFail = "invalid:" + block.name;
    warnBuildFail("Nao foi possivel construir: " + block.localizedName);
    return false;
  }
  var player = getLocalPlayer();
  if (player == null) {
    if (config.aiDebugHud) state.lastPlaceFail = "no-player";
    warnBuildFail("Aguardando jogador local...");
    return false;
  }
  Call.constructFinish(player, block, x, y, rotation || 0, team, false);
  if (config.aiDebugHud) state.lastPlaceFail = "";
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

function placeConduitPath(team, sx, sy, tx, ty, maxSteps) {
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
    placeBlock(Blocks.conduit, x, y, rot, team);
    if (ntile.block() != Blocks.air) {
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

function findLiquidTiles(cx, cy, radius, maxCount) {
  var found = [];
  for (var dx = -radius; dx <= radius; dx++) {
    for (var dy = -radius; dy <= radius; dy++) {
      var tile = tileAt(cx + dx, cy + dy);
      if (tile == null) continue;
      if (tile.floor() != null && tile.floor().isLiquid && tile.block() == Blocks.air) {
        var dist2 = dx * dx + dy * dy;
        var liq = tile.floor().liquidDrop;
        var score = 0;
        if (liq != null) {
          score += liq.heatCapacity;
          if (liq.coolant) score += 2;
          if (liq.temperature != null) score -= liq.temperature * 0.3;
          if (liq.flammability != null) score -= liq.flammability * 0.2;
          if (config.preferCryofluid && liq == Liquids.cryofluid) score += 5;
        }
        found.push({ x: tile.x, y: tile.y, dist2: dist2, liquid: liq, score: score });
      }
    }
  }
  found.sort(function(a, b){
    if (b.score != a.score) return b.score - a.score;
    return a.dist2 - b.dist2;
  });
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
  var player = getLocalPlayer();
  if (player == null) return;
  if (ids == null || ids.size == 0) return;
  var arr = toIntArray(ids);

  // Move command works as a generic rally/attack order.
  try {
    InputHandler.setUnitCommand(player, arr, UnitCommand.moveCommand);
  } catch (e) {
    // ignore
  }

  try {
    InputHandler.commandUnits(player, arr, buildTarget, null, pos, false, true);
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

function findLiquidHub(team) {
  var found = null;
  Groups.build.each(function(b){
    if (b == null || b.team != team) return;
    if (b.block == Blocks.liquidContainer || b.block == Blocks.liquidTank) {
      found = b;
    }
  });
  return found;
}

function pickLiquidHubBlock(core) {
  if (config.preferLiquidTank && blockUnlocked(Blocks.liquidTank)) return Blocks.liquidTank;
  if (core != null && core.items != null) {
    var titanium = core.items.get(Items.titanium);
    var metaglass = core.items.get(Items.metaglass);
    if (titanium >= 30 && metaglass >= 40 && blockUnlocked(Blocks.liquidTank)) return Blocks.liquidTank;
  }
  return blockUnlocked(Blocks.liquidContainer) ? Blocks.liquidContainer : Blocks.liquidRouter;
}

function findCoolantTarget(team, liquid, fromX, fromY) {
  if (liquid == null) return null;
  var best = null;
  var bestDist = 9999999;
  Groups.build.each(function(b){
    if (b == null || b.team != team || b.block == null) return;
    if (b.block.group != BlockGroup.turrets) return;
    if (!b.block.hasLiquids || b.liquids == null) return;
    try {
      if (!b.block.consumesLiquid(liquid)) return;
    } catch (e) {
      return;
    }
    var dx = b.tile.x - fromX;
    var dy = b.tile.y - fromY;
    var dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = b;
    }
  });
  return best;
}

function findCoolantTargets(team, liquid, fromX, fromY, limit) {
  var targets = [];
  if (liquid == null) return targets;
  Groups.build.each(function(b){
    if (b == null || b.team != team || b.block == null) return;
    if (b.block.group != BlockGroup.turrets) return;
    if (!b.block.hasLiquids || b.liquids == null) return;
    try {
      if (!b.block.consumesLiquid(liquid)) return;
    } catch (e) {
      return;
    }
    var dx = b.tile.x - fromX;
    var dy = b.tile.y - fromY;
    var dist = dx * dx + dy * dy;
    targets.push({ build: b, dist: dist });
  });
  targets.sort(function(a, b){ return a.dist - b.dist; });
  if (limit != null && targets.length > limit) targets.length = limit;
  var out = [];
  for (var i = 0; i < targets.length; i++) out.push(targets[i].build);
  return out;
}

function findHeatSpot(core, team) {
  var cx = core.tile.x;
  var cy = core.tile.y;
  return findPlaceForBlock(Blocks.thermalGenerator, cx, cy, config.thermalSearchRadius, team);
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

function actionLiquid(core) {
  var team = getTeam();
  if (state.pumpCount >= config.maxPumps && state.liquidHubCount >= config.maxLiquidHubs) return false;
  var cx = core.tile.x;
  var cy = core.tile.y;

  var hub = findLiquidHub(team);
  var hubPos = null;
  if (hub != null) {
    hubPos = { x: hub.tile.x, y: hub.tile.y };
    if (state.liquidHubCount < 1) state.liquidHubCount = 1;
  }
  if (hubPos == null && state.liquidHubCount < config.maxLiquidHubs) {
    var hubBlock = pickLiquidHubBlock(core);
    var candidate = findPlaceForBlock(hubBlock, cx, cy, config.liquidHubSearchRadius, team);
    if (candidate != null && placeBlock(hubBlock, candidate.x, candidate.y, 0, team)) {
      hubPos = candidate;
      state.liquidHubCount++;
    }
  }

  var liquids = findLiquidTiles(cx, cy, config.liquidSearchRadius, config.maxPumps);
  if (liquids.length == 0) return false;
  var pump = null;
  var pumpLiquid = null;
  for (var i = 0; i < liquids.length; i++) {
    if (placeBlock(Blocks.mechanicalPump, liquids[i].x, liquids[i].y, 0, team)) {
      pump = liquids[i];
      pumpLiquid = liquids[i].liquid;
      state.pumpCount++;
      break;
    }
  }
  if (pump == null) return false;

  var coolantLiquid = pumpLiquid;
  if (config.preferCryofluid && hub != null && hub.liquids != null) {
    try {
      if (hub.liquids.get(Liquids.cryofluid) > 0) coolantLiquid = Liquids.cryofluid;
    } catch (e0) {
      // ignore
    }
  }

  var coolantTargets = findCoolantTargets(team, coolantLiquid, pump.x, pump.y, config.maxCoolantTargets);
  if (hubPos != null) {
    var stepHub = stepToward(pump.x, pump.y, hubPos.x, hubPos.y);
    var sxHub = pump.x + stepHub.dx;
    var syHub = pump.y + stepHub.dy;
    placeConduitPath(team, sxHub, syHub, hubPos.x, hubPos.y, config.maxConduitSteps);

    for (var ct = 0; ct < coolantTargets.length; ct++) {
      var t = coolantTargets[ct];
      placeConduitPath(team, hubPos.x, hubPos.y, t.tile.x, t.tile.y, config.maxConduitSteps);
    }
  } else if (coolantTargets.length > 0) {
    var last = { x: pump.x, y: pump.y };
    for (var ct2 = 0; ct2 < coolantTargets.length; ct2++) {
      var t2 = coolantTargets[ct2];
      var step = stepToward(last.x, last.y, t2.tile.x, t2.tile.y);
      var sx = last.x + step.dx;
      var sy = last.y + step.dy;
      placeConduitPath(team, sx, sy, t2.tile.x, t2.tile.y, config.maxConduitSteps);
      last = { x: t2.tile.x, y: t2.tile.y };
    }
  } else {
    var target = { x: cx, y: cy };
    var step2 = stepToward(pump.x, pump.y, target.x, target.y);
    var sx2 = pump.x + step2.dx;
    var sy2 = pump.y + step2.dy;
    placeConduitPath(team, sx2, sy2, target.x, target.y, config.maxConduitSteps);
  }

  var node = clampToBounds(pump.x + 1, pump.y);
  placeBlock(Blocks.powerNode, node.x, node.y, 0, team);
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

function actionThermal(core) {
  if (state.thermalCount >= config.maxThermals) return false;
  var team = getTeam();
  var spot = findHeatSpot(core, team);
  if (spot == null) return false;
  if (!placeBlock(Blocks.thermalGenerator, spot.x, spot.y, 0, team)) return false;
  state.thermalCount++;
  return true;
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
  state.pumpCount = 0;
  state.liquidHubCount = 0;
  state.thermalCount = 0;
  state.actionHistory = [];
  state.lastActionTicks = {};
  state.aiEnabled = config.aiEnabledDefault;
  state.lastFactoryConfigTick = -9999;
  state.lastErrorTick = -9999;
  state.lastTapTick = -9999;
  state.lastTapX = -1;
  state.lastTapY = -1;
  state.lastWarnTick = -9999;
  rlSocketClose();
  rlSocket.queue = [];
  rlQTable = null;
  rlQTableLastLoadTick = -9999;
  rlQTableLastErrorTick = -9999;
  applyMobileSafeMode();
  aiHud.table = null;
  aiHud.button = null;
  aiHud.debugLabel = null;
  aiHud.useIcon = false;
  ensureHudButton();
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

Events.on(TapEvent, function(e){
  if (!config.aiTapToggle) return;
  if (e == null || e.tile == null) return;
  if (e.player != null && e.player.isLocal != null && !e.player.isLocal()) return;
  var build = e.tile.build;
  if (build == null || build.block == null) return;
  try {
    if (build.block.flags == null || !build.block.flags.contains(BlockFlag.core)) return;
  } catch (e2) {
    return;
  }

  var sameTile = (state.lastTapX == e.tile.x && state.lastTapY == e.tile.y);
  var within = (state.tick - state.lastTapTick) <= config.tapToggleWindow;
  if (sameTile && within) {
    setAiEnabled(!state.aiEnabled, e.player);
    state.lastTapTick = -9999;
    state.lastTapX = -1;
    state.lastTapY = -1;
  } else {
    state.lastTapTick = state.tick;
    state.lastTapX = e.tile.x;
    state.lastTapY = e.tile.y;
  }
});

function runAiLogic() {
  state.lastAiTick = state.tick;
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

  // Decide orders every N ticks.
  if (state.tick % config.commandInterval != 0) return;

  var team2 = getTeam();
  var core2 = getCore(team2);
  if (core2 == null) return;

  configureFactories(team2);

  var enemyCore = findEnemyCore(team2);
  var enemies = countEnemyUnits(team2);
  var copper = core2.items.get(Items.copper);
  var lead = core2.items.get(Items.lead);
  var wantsAttack = enemyCore != null && shouldAttack(core2);
  var powerStats = computePowerStatus(team2);
  var powerNeedScore = 0;
  if (powerStats.count == 0) {
    powerNeedScore = 40;
  } else if (powerStats.avg < 0.4 || powerStats.min < 0.25) {
    powerNeedScore = 45;
  } else if (powerStats.avg < 0.7) {
    powerNeedScore = 25;
  } else if (powerStats.avg < 0.85) {
    powerNeedScore = 10;
  }
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
      name: "thermal",
      score: (state.thermalCount < config.maxThermals ? (powerNeedScore + 35) : 0),
      run: function(){ return actionThermal(core2); }
    },
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
      score: (state.powerClusters < config.maxPowerClusters && copper > 200 && lead > 150 ? 20 : 0) + powerNeedScore + (state.pumpCount > state.powerClusters ? 15 : 0),
      run: function(){ return actionPower(core2); }
    },
    {
      name: "liquid",
      score: (state.pumpCount < config.maxPumps ? 45 : 0) + (state.liquidHubCount < config.maxLiquidHubs ? 15 : 0),
      run: function(){ return actionLiquid(core2); }
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
      state.lastAction = picked.name;
      state.lastActionOk = true;
      recordAction(picked.name);
      if (picked.name != state.lastMode) {
        Log.info("[IA] Ação: " + picked.name);
        state.lastMode = picked.name;
      }
      break;
    }
  }
  if (!did) {
    state.lastAction = "none";
    state.lastActionOk = false;
  }

  var core3 = getCore(team2);
  var enemyCore2 = findEnemyCore(team2);
  var enemies2 = countEnemyUnits(team2);
  var afterState = snapshotState(core3, enemyCore2, enemies2, team2);
  emitTransition(beforeState, pickedName, afterState, { ok: did });
}

Events.run(Trigger.update, function(){
  state.tick++;

  ensureHudButton();

  if (!state.aiEnabled) return;

  var localPlayer = getLocalPlayer();
  var team = localPlayer != null ? localPlayer.team() : Vars.state.rules.defaultTeam;
  var core = getCore(team);
  if (localPlayer == null || core == null) {
    warnBuildFail("Aguardando player/core...");
    return;
  }

  var interval = isMobileSafe() ? config.mobileLogicInterval : 1;
  if (interval > 1 && (state.tick % interval) != 0) return;

  if (isMobileSafe()) {
    try {
      runAiLogic();
    } catch (e) {
      if ((state.tick - state.lastErrorTick) > config.safeModeLogInterval) {
        Log.info("[IA] Erro em safe mode. Continuando.");
        state.lastErrorTick = state.tick;
      }
    }
  } else {
    runAiLogic();
  }
  updateHudDebug();
});
