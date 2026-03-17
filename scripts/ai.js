// Mindustry JS mod: base builder + unit commander (skeleton)

var Log = Packages.arc.util.Log;
var IntSeq = Packages.arc.struct.IntSeq;
var InputHandler = Packages.mindustry.input.InputHandler;
var UnitCommand = Packages.mindustry.ai.UnitCommand;
var Vec2 = Packages.arc.math.geom.Vec2;
var Core = Packages.arc.Core;
var Build = Packages.mindustry.world.Build;
var BlockGroup = Packages.mindustry.world.meta.BlockGroup;
var BlockFlag = Packages.mindustry.world.meta.BlockFlag;
var Table = Packages.arc.scene.ui.layout.Table;
var Touchable = Packages.arc.scene.Touchable;
var Styles = Packages.mindustry.ui.Styles;
var Icon = Packages.mindustry.gen.Icon;
var CommandAI = Packages.mindustry.ai.types.CommandAI;
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
  rlSocketEnabled: true,
  rlSocketHost: "127.0.0.1",
  rlSocketPort: 4567,
  rlSocketReconnectTicks: 300,
  rlSocketTimeoutMs: 200,
  rlSocketQueueMax: 200,
  rlPolicyMode: "hybrid",
  rlQTableFile: "q_table.json",
  rlQTablePath: "",
  rlQTableReloadTicks: 0,
  rlQTableBlend: 0.7,
  rlNNEnabled: true,
  rlNNFile: "nn_model.json",
  rlNNPath: "",
  rlNNHidden: 16,
  rlNNReloadTicks: 0,
  rlNNSaveInterval: 1800,
  rlNNAlpha: 0.01,
  rlNNGamma: 0.9,
  rlOnlineEnabled: true,
  rlAlpha: 0.12,
  rlGamma: 0.9,
  rlRewardClamp: 120,
  rlRewardFail: -2,
  rlRewardCoreLost: -500,
  rlRewardWin: 500,
  rlRewardCoreDamageScale: 200,
  rlRewardCopper: 0.02,
  rlRewardLead: 0.02,
  rlRewardDrill: 4,
  rlRewardTurret: 6,
  rlRewardPower: 3,
  rlRewardPump: 2,
  rlRewardLiquidHub: 3,
  rlRewardThermal: 5,
  rlRewardUnit: 0.2,
  rlSaveInterval: 1800,
  aiEnabledDefault: true,
  aiChatToggle: true,
  aiTapToggle: true,
  tapToggleWindow: 30,
  aiHudButton: true,
  aiDebugHud: true,
  debugUpdateInterval: 30,
  autoDisableHudOnMobile: true,
  campaignSafeMode: true,
  warnInterval: 300,
  aiControlPlayerUnit: true,
  // When true, the local player unit is excluded from AI commands and the player retains direct control.
  // Set to false so the AI can fully control the player's unit automatically.
  observerMode: false,
  // Penalty applied (negative) when the AI reassigns controller (resets player control).
  controllerResetPenalty: -1,
  resourceReserve: {
    "copper": 120,
    "lead": 100,
    "graphite": 40,
    "metaglass": 40,
    "silicon": 40,
    "titanium": 60,
    "thorium": 30,
    "phase-fabric": 10,
    "surge-alloy": 10
  },
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
  preferredNavalUnit: "risso",
  logicEnabled: true,
  logicBuildInterval: 600,
  logicSearchRadius: 8,
  logicControlRadius: 12,
  logicMaxProcessors: 3,
  logicUseGround: true,
  logicUseAir: true,
  logicUseNaval: false,
  logicAttackRadius: 8,
  // When true, the AI will move the camera to follow the controlled unit.
  aiControlCamera: true,
  // How fast the camera interpolates to the unit position (0 = instant, 1 = no move).
  aiCameraLerp: 0.3
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
  lastWarnTick: -9999,
  lastReward: 0,
  lastQSaveTick: -9999,
  lastLogicTick: -9999,
  playerControlledUnitId: -1,
  playerControllerSet: false,
  // Tick when we last attempted to change the player unit controller.
  lastControllerAttemptTick: -9999,
  controllerResetPenalty: 0,
  nnModel: null,
  nnLastLoadTick: -9999,
  nnLastSaveTick: -9999,
  nnLastErrorTick: -9999,
  logicControllers: {
    ground: null,
    air: null,
    naval: null
  }
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
  Log.info("[RL] Socket connect attempt to " + config.rlSocketHost + ":" + config.rlSocketPort);
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
    Log.info("[RL] Socket connect error: " + e);
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
  setLogicProcessorsEnabled(enabled);
}

function isMobileSafe() {
  return config.mobileSafeMode && (Vars.mobile || Vars.android);
}

function applyMobileSafeMode() {
  if (!isMobileSafe()) return;
  config.rlSocketEnabled = false;
  Log.info("[RL] Mobile safe mode active: rlSocketEnabled=false");
  config.rlLogEnabled = false;
  config.rlPolicyMode = "heuristic";
  config.rlSaveInterval = 0;
  if (config.commandInterval < config.mobileCommandInterval) config.commandInterval = config.mobileCommandInterval;
  if (config.factoryConfigInterval < config.mobileFactoryConfigInterval) config.factoryConfigInterval = config.mobileFactoryConfigInterval;
  if (config.liquidSearchRadius > config.mobileLiquidSearchRadius) config.liquidSearchRadius = config.mobileLiquidSearchRadius;
  if (config.autoDisableHudOnMobile) {
    config.aiHudButton = false;
    config.aiDebugHud = false;
  }
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
    " obs:" + (config.observerMode ? "1" : "0") +
    " built:" + (state.built ? "1" : "0") +
    " r:" + Math.round(state.lastReward * 100) / 100 +
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

function updateCameraToUnit(unit) {
  if (!config.aiControlCamera) return;
  if (unit == null) return;
  try {
    var camera = Core.camera;
    if (camera != null) {
      var tx = unit.x;
      var ty = unit.y;
      var lerp = Math.max(0, Math.min(1, config.aiCameraLerp));
      camera.position.x += (tx - camera.position.x) * (1 - lerp);
      camera.position.y += (ty - camera.position.y) * (1 - lerp);
      camera.update();
    }
  } catch (e) {
    // ignore
  }
}

function ensurePlayerControlled() {
  if (!config.aiControlPlayerUnit) return;
  var player = getLocalPlayer();
  if (player == null || player.unit() == null) return;
  var unit = player.unit();
  var unitId = unit.id;

  // If the player switched unit (respawn, etc), force reassignment.
  if (state.playerControlledUnitId !== unitId) {
    state.playerControllerMode = null;
  }

  var desiredMode = (!state.aiEnabled || config.observerMode) ? "player" : "ai";

  // Prevent spamming controller assignments when the game re-assigns control at spawn.
  var controller = null;
  try {
    controller = unit.controller();
  } catch (e) {
    // ignore
  }

  // Avoid repeatedly reassigning controller every tick when it is already correct.
  if (state.playerControllerMode === desiredMode && state.playerControlledUnitId === unitId) {
    if (desiredMode === "ai") {
      if (controller instanceof CommandAI) {
        updateCameraToUnit(unit);
        return;
      }
      // If the controller isn't actually CommandAI, allow a retry but throttle it.
      if ((state.tick - state.lastControllerAttemptTick) < 60) return;
    } else {
      // When player control is desired, avoid forcing it too often.
      if (controller === player) return;
      if ((state.tick - state.lastControllerAttemptTick) < 60) return;
    }
  }

  // If we got here, we need to attempt switching the controller.
  state.lastControllerAttemptTick = state.tick;

  if (desiredMode === "player") {
    try {
      unit.controller(player);
      Log.info("[IA] player control restored");
    } catch (e) {
      // ignore
    }
    state.playerControllerMode = "player";
    state.playerControlledUnitId = unitId;
    state.controllerResetPenalty = config.controllerResetPenalty;
    return;
  }

  // desiredMode == "ai"
  try {
    unit.controller(new CommandAI());
    Log.info("[IA] ai control assigned");
  } catch (e2) {
    // ignore
  }
  state.playerControllerMode = "ai";
  state.playerControlledUnitId = unitId;
  state.controllerResetPenalty = config.controllerResetPenalty;
  updateCameraToUnit(unit);
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

function resolveNNFi() {
  if (config.rlNNPath != null && config.rlNNPath != "") {
    try {
      return new Fi(config.rlNNPath);
    } catch (e) {
      return null;
    }
  }
  try {
    var mod = Vars.mods.getMod(config.modName);
    if (mod != null && mod.root != null) {
      return mod.root.child(config.rlNNFile);
    }
  } catch (e2) {
    // ignore
  }
  try {
    return new Fi(config.rlNNFile);
  } catch (e3) {
    return null;
  }
}

function initializeNNModel(features, actions) {
  var inputSize = features != null ? features.length : 0;
  var hiddenSize = config.rlNNHidden || 16;
  var outputSize = actions != null ? actions.length : 0;
  var model = {
    inputSize: inputSize,
    hiddenSize: hiddenSize,
    outputSize: outputSize,
    features: features,
    actions: actions,
    w1: [],
    b1: [],
    w2: [],
    b2: []
  };
  var scale = 0.1;
  // w1: hiddenSize x inputSize
  for (var i = 0; i < hiddenSize * inputSize; i++) {
    model.w1.push((Math.random() * 2 - 1) * scale);
  }
  // b1: hiddenSize
  for (var i = 0; i < hiddenSize; i++) {
    model.b1.push(0);
  }
  // w2: outputSize x hiddenSize
  for (var i = 0; i < outputSize * hiddenSize; i++) {
    model.w2.push((Math.random() * 2 - 1) * scale);
  }
  // b2: outputSize
  for (var i = 0; i < outputSize; i++) {
    model.b2.push(0);
  }
  return model;
}

function loadNNModel() {
  if (!config.rlNNEnabled) return false;
  if (config.rlPolicyMode != "nn") return false;
  if (state.nnModel != null && config.rlNNReloadTicks > 0 && (state.tick - state.nnLastLoadTick) < config.rlNNReloadTicks) return true;
  var fi = resolveNNFi();
  if (fi == null || !fi.exists()) {
    if ((state.tick - state.nnLastErrorTick) > 600) {
      Log.info("[RL] NN model nao encontrado: " + config.rlNNFile);
      state.nnLastErrorTick = state.tick;
    }
    // Initialize a new model if we have features/actions.
    if (rlQMeta && rlQMeta.features && rlQMeta.actions) {
      state.nnModel = initializeNNModel(rlQMeta.features, rlQMeta.actions);
      state.nnLastLoadTick = state.tick;
      return true;
    }
    state.nnModel = null;
    return false;
  }
  try {
    var text = fi.readString();
    var data = JSON.parse(String(text));
    if (data == null) throw "invalid";
    if (data.features != null) rlQMeta.features = data.features;
    if (data.actions != null) rlQMeta.actions = data.actions;
    state.nnModel = data;
    state.nnLastLoadTick = state.tick;
    Log.info("[RL] NN model carregado: " + fi.absolutePath());
    return true;
  } catch (e) {
    if ((state.tick - state.nnLastErrorTick) > 600) {
      Log.info("[RL] Erro ao carregar NN model.");
      state.nnLastErrorTick = state.tick;
    }
    state.nnModel = null;
    return false;
  }
}

function nnForward(stateObj) {
  if (state.nnModel == null) return null;
  var model = state.nnModel;
  if (model.features == null || model.actions == null) return null;
  var input = [];
  for (var i = 0; i < model.features.length; i++) {
    var name = model.features[i].name;
    var val = stateObj[name];
    if (val == null) val = 0;
    input.push(val);
  }
  // hidden = tanh(W1 * input + b1)
  var hidden = [];
  for (var h = 0; h < model.hiddenSize; h++) {
    var sum = model.b1[h] || 0;
    for (var j = 0; j < model.inputSize; j++) {
      sum += (model.w1[h * model.inputSize + j] || 0) * input[j];
    }
    hidden.push(Math.tanh(sum));
  }
  // output = W2 * hidden + b2
  var out = [];
  for (var o = 0; o < model.outputSize; o++) {
    var sum = model.b2[o] || 0;
    for (var h = 0; h < model.hiddenSize; h++) {
      sum += (model.w2[o * model.hiddenSize + h] || 0) * hidden[h];
    }
    out.push(sum);
  }
  return { input: input, hidden: hidden, output: out };
}

function nnScoresForState(stateObj) {
  if (state.nnModel == null) return null;
  var fwd = nnForward(stateObj);
  if (fwd == null) return null;
  var scores = {};
  for (var i = 0; i < state.nnModel.actions.length; i++) {
    scores[state.nnModel.actions[i]] = fwd.output[i];
  }
  return scores;
}

function updateNNModel(prevState, actionName, nextState, reward) {
  if (!config.rlNNEnabled) return false;
  if (state.nnModel == null) return false;
  if (state.nnModel.actions == null || state.nnModel.features == null) return false;
  var model = state.nnModel;
  var actionIndex = -1;
  for (var i = 0; i < model.actions.length; i++) {
    if (model.actions[i] == actionName) { actionIndex = i; break; }
  }
  if (actionIndex < 0) return false;

  var fwd1 = nnForward(prevState);
  var fwd2 = nnForward(nextState);
  if (fwd1 == null || fwd2 == null) return false;

  var maxNext = -999999;
  for (var i = 0; i < fwd2.output.length; i++) {
    if (fwd2.output[i] > maxNext) maxNext = fwd2.output[i];
  }
  var gamma = config.rlNNGamma != null ? config.rlNNGamma : 0.9;
  var target = reward + gamma * maxNext;

  var pred = fwd1.output[actionIndex];
  var delta = pred - target;
  var alpha = config.rlNNAlpha != null ? config.rlNNAlpha : 0.01;

  // Update w2, b2 for the chosen output only.
  for (var h = 0; h < model.hiddenSize; h++) {
    var idx = actionIndex * model.hiddenSize + h;
    var grad = delta * fwd1.hidden[h];
    model.w2[idx] = (model.w2[idx] || 0) - alpha * grad;
  }
  model.b2[actionIndex] = (model.b2[actionIndex] || 0) - alpha * delta;

  // Backprop into hidden layer
  for (var h = 0; h < model.hiddenSize; h++) {
    var w2val = model.w2[actionIndex * model.hiddenSize + h] || 0;
    var dh = (1 - fwd1.hidden[h] * fwd1.hidden[h]) * (delta * w2val);
    var b1idx = h;
    model.b1[b1idx] = (model.b1[b1idx] || 0) - alpha * dh;
    for (var j = 0; j < model.inputSize; j++) {
      var w1idx = h * model.inputSize + j;
      model.w1[w1idx] = (model.w1[w1idx] || 0) - alpha * dh * fwd1.input[j];
    }
  }

  return true;
}

function saveNNModelIfNeeded() {
  if (!config.rlNNEnabled) return;
  if (config.rlNNSaveInterval == null || config.rlNNSaveInterval <= 0) return;
  if ((state.tick - state.nnLastSaveTick) < config.rlNNSaveInterval) return;
  if (isMobileSafe()) return;
  saveNNModel();
}

function saveNNModel() {
  if (state.nnModel == null) return false;
  var fi = resolveNNFi();
  if (fi == null) return false;
  try {
    var text = JSON.stringify(state.nnModel);
    fi.parent().mkdirs();
    fi.writeString(text, false);
    state.nnLastSaveTick = state.tick;
    return true;
  } catch (e) {
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

function qActionIndex(name) {
  if (rlQMeta == null || rlQMeta.actions == null) return -1;
  for (var i = 0; i < rlQMeta.actions.length; i++) {
    if (rlQMeta.actions[i] == name) return i;
  }
  return -1;
}

function ensureQRow(key) {
  if (rlQTable == null) rlQTable = {};
  var actions = rlQMeta.actions != null ? rlQMeta.actions : [];
  var size = actions.length;
  var row = rlQTable[key];
  if (row == null) {
    row = [];
    for (var i = 0; i < size; i++) row.push(0);
    rlQTable[key] = row;
    return row;
  }
  if (row.length < size) {
    for (var j = row.length; j < size; j++) row.push(0);
  }
  return row;
}

function maxArray(arr) {
  if (arr == null || arr.length == 0) return 0;
  var max = arr[0];
  for (var i = 1; i < arr.length; i++) {
    if (arr[i] > max) max = arr[i];
  }
  return max;
}

function computeReward(prevState, actionName, nextState, info) {
  if (prevState == null || nextState == null) return 0;
  var reward = 0;
  reward += (nextState.copper - prevState.copper) * config.rlRewardCopper;
  reward += (nextState.lead - prevState.lead) * config.rlRewardLead;
  reward += (nextState.drills - prevState.drills) * config.rlRewardDrill;
  reward += (nextState.turrets - prevState.turrets) * config.rlRewardTurret;
  reward += (nextState.power - prevState.power) * config.rlRewardPower;
  reward += (nextState.pumps - prevState.pumps) * config.rlRewardPump;
  reward += (nextState.liquidHubs - prevState.liquidHubs) * config.rlRewardLiquidHub;
  reward += (nextState.thermals - prevState.thermals) * config.rlRewardThermal;
  reward += (nextState.unitsTotal - prevState.unitsTotal) * config.rlRewardUnit;

  var dCore = nextState.coreHealthFrac - prevState.coreHealthFrac;
  reward += dCore * config.rlRewardCoreDamageScale;

  if (prevState.corePresent == 1 && nextState.corePresent == 0) reward += config.rlRewardCoreLost;
  if (prevState.enemyCore == 1 && nextState.enemyCore == 0) reward += config.rlRewardWin;

  if (info != null && info.ok === false) reward += config.rlRewardFail;

  // Penalize controller resets (AI switching control mid-game).
  if (state.controllerResetPenalty != null && state.controllerResetPenalty != 0) {
    reward += state.controllerResetPenalty;
    state.controllerResetPenalty = 0;
  }

  var clamp = config.rlRewardClamp;
  if (clamp != null && clamp > 0) {
    if (reward > clamp) reward = clamp;
    if (reward < -clamp) reward = -clamp;
  }
  return reward;
}

function updateOnlineQTable(prevState, actionName, nextState, reward) {
  if (!config.rlOnlineEnabled) return false;
  if (rlQMeta == null || rlQMeta.actions == null || rlQMeta.features == null) return false;
  if (rlQMeta.features.length == 0) return false;
  var aIndex = qActionIndex(actionName);
  if (aIndex < 0) return false;

  var sKey = encodeStateKey(prevState, rlQMeta.features);
  var s2Key = encodeStateKey(nextState, rlQMeta.features);
  var qRow = ensureQRow(sKey);
  var qNext = ensureQRow(s2Key);
  var maxNext = maxArray(qNext);
  var oldQ = qRow[aIndex] != null ? qRow[aIndex] : 0;
  var alpha = config.rlAlpha != null ? config.rlAlpha : 0.1;
  var gamma = config.rlGamma != null ? config.rlGamma : 0.9;
  var updated = oldQ + alpha * (reward + gamma * maxNext - oldQ);
  qRow[aIndex] = updated;
  return true;
}

function saveQTableIfNeeded() {
  if (!config.rlOnlineEnabled) return;
  if (config.rlSaveInterval == null || config.rlSaveInterval <= 0) return;
  if ((state.tick - state.lastQSaveTick) < config.rlSaveInterval) return;
  if (isMobileSafe()) return;
  saveQTable();
}

function saveQTable() {
  if (rlQTable == null) return false;
  var fi = resolveQTableFi();
  if (fi == null) return false;
  try {
    var payload = {
      q: rlQTable,
      actions: rlQMeta.actions,
      features: rlQMeta.features
    };
    var text = JSON.stringify(payload);
    fi.parent().mkdirs();
    fi.writeString(text, false);
    state.lastQSaveTick = state.tick;
    return true;
  } catch (e) {
    return false;
  }
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
  if (!coreHasItemsFor(block, team)) return false;
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

function reserveFor(item) {
  if (config.resourceReserve == null || item == null) return 0;
  var key = null;
  try {
    key = item.name;
  } catch (e) {
    key = null;
  }
  if (key == null) return 0;
  var val = config.resourceReserve[key];
  if (val == null) return 0;
  return Math.max(0, val);
}

function availableCoreItems(core, item) {
  if (core == null || core.items == null || item == null) return 0;
  var total = core.items.get(item);
  var reserve = reserveFor(item);
  var avail = total - reserve;
  return avail < 0 ? 0 : avail;
}

function coreHasItemsFor(block, team) {
  if (block == null) return false;
  if (Vars.state != null && Vars.state.rules != null && Vars.state.rules.infiniteResources) return true;
  var t = team != null ? team : getTeam();
  var core = getCore(t);
  if (core == null || core.items == null) return false;
  var reqs = block.requirements;
  if (reqs == null || reqs.length == 0) return true;
  var mult = (Vars.state != null && Vars.state.rules != null) ? Vars.state.rules.buildCostMultiplier : 1;
  for (var i = 0; i < reqs.length; i++) {
    var stack = reqs[i];
    var need = Math.ceil(stack.amount * mult);
    if (availableCoreItems(core, stack.item) < need) return false;
  }
  return true;
}

function consumeCoreItems(block, team) {
  if (block == null) return false;
  if (Vars.state != null && Vars.state.rules != null && Vars.state.rules.infiniteResources) return true;
  var t = team != null ? team : getTeam();
  var core = getCore(t);
  if (core == null || core.items == null) return false;
  var reqs = block.requirements;
  if (reqs == null || reqs.length == 0) return true;
  var mult = (Vars.state != null && Vars.state.rules != null) ? Vars.state.rules.buildCostMultiplier : 1;
  for (var i = 0; i < reqs.length; i++) {
    var stack = reqs[i];
    var need = Math.ceil(stack.amount * mult);
    if (availableCoreItems(core, stack.item) < need) return false;
  }
  for (var i2 = 0; i2 < reqs.length; i2++) {
    var stack2 = reqs[i2];
    var need2 = Math.ceil(stack2.amount * mult);
    core.items.remove(stack2.item, need2);
  }
  return true;
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
  if (!coreHasItemsFor(block, team)) {
    if (config.aiDebugHud) state.lastPlaceFail = "no-items:" + block.name;
    warnBuildFail("Sem recursos: " + block.localizedName);
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
  if (!consumeCoreItems(block, team)) {
    if (config.aiDebugHud) state.lastPlaceFail = "no-items:" + block.name;
    warnBuildFail("Sem recursos: " + block.localizedName);
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
  var copper = availableCoreItems(core, Items.copper);
  var lead = availableCoreItems(core, Items.lead);
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
  var playerId = -1;
  if (config.observerMode) {
    var player = getLocalPlayer();
    if (player != null && player.unit() != null) playerId = player.unit().id;
  }
  Groups.unit.each(function(u){
    if (u.team != team) return;
    if (playerId != -1 && u.id == playerId) return;
    ids.add(u.id);
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

function countBlocks(team, block) {
  if (team == null || block == null) return 0;
  var count = 0;
  Groups.build.each(function(b){
    if (b == null || b.team != team) return;
    if (b.block == block) count++;
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
  var playerId = -1;
  if (config.observerMode) {
    var player = getLocalPlayer();
    if (player != null && player.unit() != null) playerId = player.unit().id;
  }
  Groups.unit.each(function(u){
    if (u.team != team) return;
    if (playerId != -1 && u.id == playerId) return;
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

function isLogicBlock(block) {
  return block == Blocks.microProcessor || block == Blocks.logicProcessor || block == Blocks.hyperProcessor || block == Blocks.worldProcessor;
}

function pickLogicBlock(team) {
  var order = [Blocks.microProcessor, Blocks.logicProcessor, Blocks.hyperProcessor];
  for (var i = 0; i < order.length; i++) {
    var b = order[i];
    if (b == null) continue;
    if (!blockUnlocked(b)) continue;
    if (!coreHasItemsFor(b, team)) continue;
    return b;
  }
  return null;
}

function unitTypeForRole(role) {
  var name = null;
  if (role == "ground") name = config.preferredGroundUnit;
  if (role == "air") name = config.preferredAirUnit;
  if (role == "naval") name = config.preferredNavalUnit;
  if (name == null || name == "") return null;
  var type = unitTypeByName(name);
  if (type == null) return null;
  try {
    if (config.campaignSafeMode && type.unlockedNow != null && !type.unlockedNow()) return null;
  } catch (e) {
    // ignore
  }
  try {
    if (type.logicControllable != null && !type.logicControllable) return null;
  } catch (e2) {
    // ignore
  }
  return type;
}

function buildLogicProgram(unitType, rallyX, rallyY) {
  if (unitType == null) return null;
  var uname = unitType.name != null ? unitType.name : String(unitType);
  var lines = [];
  lines.push("set rallyX " + Math.round(rallyX));
  lines.push("set rallyY " + Math.round(rallyY));
  lines.push("ubind @" + uname);
  lines.push("jump __REBIND__ equal @unit null");
  lines.push("uradar enemy any any distance 1 target");
  lines.push("jump __RALLY__ equal target null");
  lines.push("sensor tx target @x");
  lines.push("sensor ty target @y");
  lines.push("ucontrol approach tx ty " + config.logicAttackRadius);
  lines.push("ucontrol target tx ty 1");
  lines.push("jump 2 always");
  var rallyIndex = lines.length;
  lines.push("ucontrol move rallyX rallyY");
  lines.push("jump 2 always");
  lines[3] = "jump 2 equal @unit null";
  lines[5] = "jump " + rallyIndex + " equal target null";
  return lines.join("\n");
}

function validateLogicController(ctrl, team) {
  if (ctrl == null) return null;
  var tile = tileAt(ctrl.x, ctrl.y);
  if (tile == null || tile.build == null) return null;
  if (tile.build.team != team) return null;
  if (!isLogicBlock(tile.build.block)) return null;
  return tile.build;
}

function countLogicProcessors(team, core) {
  var count = 0;
  var cx = core != null ? core.tile.x : 0;
  var cy = core != null ? core.tile.y : 0;
  var radius = config.logicControlRadius;
  var maxDist2 = radius * radius;
  Groups.build.each(function(b){
    if (b == null || b.team != team || b.block == null) return;
    if (!isLogicBlock(b.block)) return;
    var dx = b.tile.x - cx;
    var dy = b.tile.y - cy;
    if (dx * dx + dy * dy > maxDist2) return;
    count++;
  });
  return count;
}

function placeLogicController(team, core) {
  var block = pickLogicBlock(team);
  if (block == null) return null;
  var pos = findPlaceForBlock(block, core.tile.x, core.tile.y, config.logicSearchRadius, team);
  if (pos == null) return null;
  if (!placeBlock(block, pos.x, pos.y, 0, team)) return null;
  var tile = tileAt(pos.x, pos.y);
  if (tile == null) return null;
  return tile.build;
}

function programLogic(build, role, core) {
  if (build == null || core == null) return false;
  var unitType = unitTypeForRole(role);
  if (unitType == null) return false;
  var rallyX = core.x;
  var rallyY = core.y;
  var code = buildLogicProgram(unitType, rallyX, rallyY);
  if (code == null) return false;
  try {
    if (build.code == null || build.code != code) {
      build.updateCode(code);
    }
  } catch (e) {
    try {
      build.updateCode(code, true, null);
    } catch (e2) {
      // ignore
    }
  }
  try {
    build.enabled = state.aiEnabled;
  } catch (e3) {
    // ignore
  }
  return true;
}

function setLogicProcessorsEnabled(enabled) {
  if (!config.logicEnabled) return;
  var team = getTeam();
  var core = getCore(team);
  if (core == null) return;
  var cx = core.tile.x;
  var cy = core.tile.y;
  var radius = config.logicControlRadius;
  var maxDist2 = radius * radius;
  Groups.build.each(function(b){
    if (b == null || b.team != team || b.block == null) return;
    if (!isLogicBlock(b.block)) return;
    var dx = b.tile.x - cx;
    var dy = b.tile.y - cy;
    if (dx * dx + dy * dy > maxDist2) return;
    try {
      b.enabled = enabled;
    } catch (e) {
      // ignore
    }
  });
}

function ensureLogicControllers(core, team) {
  if (!config.logicEnabled) return;
  if (core == null) return;
  if ((state.tick - state.lastLogicTick) < config.logicBuildInterval) return;
  state.lastLogicTick = state.tick;

  var roles = [];
  if (config.logicUseGround) roles.push("ground");
  if (config.logicUseAir) roles.push("air");
  if (config.logicUseNaval) roles.push("naval");

  for (var i = 0; i < roles.length; i++) {
    var role = roles[i];
    var build = validateLogicController(state.logicControllers[role], team);
    if (build == null) {
      state.logicControllers[role] = null;
      var total = countLogicProcessors(team, core);
      if (total >= config.logicMaxProcessors) continue;
      var placed = placeLogicController(team, core);
      if (placed != null) {
        state.logicControllers[role] = { x: placed.tile.x, y: placed.tile.y };
        build = placed;
      }
    }
    if (build != null) {
      programLogic(build, role, core);
    }
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
  if (!coreHasItemsFor(Blocks.mechanicalDrill, team)) return false;
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
  if (!coreHasItemsFor(Blocks.mechanicalPump, team)) return false;
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
  if (!coreHasItemsFor(Blocks.duo, team)) return false;
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
  if (!coreHasItemsFor(Blocks.powerNode, getTeam())) return false;
  return placePowerCluster(getTeam(), core.tile.x + 4, core.tile.y + 2);
}

function actionThermal(core) {
  if (state.thermalCount >= config.maxThermals) return false;
  var team = getTeam();
  if (!coreHasItemsFor(Blocks.thermalGenerator, team)) return false;
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
  state.lastReward = 0;
  state.lastQSaveTick = -9999;
  state.lastLogicTick = -9999;
  state.playerControlledUnitId = -1;
  state.playerControllerSet = false;
  state.controllerResetPenalty = 0;
  state.nnModel = null;
  state.nnLastLoadTick = -9999;
  state.nnLastSaveTick = -9999;
  state.nnLastErrorTick = -9999;
  state.logicControllers = { ground: null, air: null, naval: null };
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

  // Keep counts in sync with the current world state (e.g., in case buildings were lost).
  state.drillCount = countBlocks(team2, Blocks.mechanicalDrill);
  state.turretCount = countBlocks(team2, Blocks.duo);
  state.powerClusters = countBlocks(team2, Blocks.powerNode);
  state.pumpCount = countBlocks(team2, Blocks.mechanicalPump);
  state.thermalCount = countBlocks(team2, Blocks.thermalGenerator);

  configureFactories(team2);
  ensureLogicControllers(core2, team2);

  // Loop principal: snapshot -> escolhe acao -> executa -> recompensa -> Q-table/NN -> salvar.
  runAiStep(core2, team2);
}

function runAiStep(core, team) {
  var enemyCore = findEnemyCore(team);
  var enemies = countEnemyUnits(team);
  var availCopper = availableCoreItems(core, Items.copper);
  var availLead = availableCoreItems(core, Items.lead);
  var wantsAttack = enemyCore != null && shouldAttack(core);
  var canDrill = coreHasItemsFor(Blocks.mechanicalDrill, team);
  var canDuo = coreHasItemsFor(Blocks.duo, team);
  var canPowerNode = coreHasItemsFor(Blocks.powerNode, team);
  var canThermal = coreHasItemsFor(Blocks.thermalGenerator, team);
  var hubBlock = pickLiquidHubBlock(core);
  var canPump = coreHasItemsFor(Blocks.mechanicalPump, team);
  var canLiquidHub = hubBlock != null && coreHasItemsFor(hubBlock, team);
  var canLiquid = canPump || findLiquidHub(team) != null || canLiquidHub;
  var powerStats = computePowerStatus(team);
  var powerNeedScore =
    powerStats.count == 0 ? 40 :
    (powerStats.avg < 0.4 || powerStats.min < 0.25) ? 45 :
    powerStats.avg < 0.7 ? 25 :
    powerStats.avg < 0.85 ? 10 : 0;

  var beforeState = snapshotState(core, enemyCore, enemies, team);

  if (config.rlPolicyMode != "heuristic") {
    if (config.rlPolicyMode == "qtable" || config.rlPolicyMode == "hybrid") {
      if (rlQTable == null || (config.rlQTableReloadTicks > 0 && (state.tick - rlQTableLastLoadTick) >= config.rlQTableReloadTicks)) {
        loadQTable();
      }
    }
    if (config.rlPolicyMode == "nn") {
      loadNNModel();
    }
  }

  var runCore = function(fn){ return function(){ return fn(core); }; };
  var runEnemy = function(fn){ return function(){ return enemyCore != null && fn(core, enemyCore); }; };

  var actionHandlers = {
    attackWave: runEnemy(actionAttackWave),
    rally: runEnemy(actionRally),
    mine: runCore(actionMine),
    defend: runCore(actionDefend),
    power: runCore(actionPower),
    noop: function(){ return true; }
  };

  var actions = [];
  var addAction = function(name, score, run){ actions.push({ name: name, score: score, run: run }); };
  addAction("thermal", (state.thermalCount < config.maxThermals && canThermal ? (powerNeedScore + 35) : 0), runCore(actionThermal));
  addAction("attackWave", wantsAttack ? 100 : 0, actionHandlers.attackWave);
  addAction("rally", wantsAttack ? 55 : 0, actionHandlers.rally);
  addAction("mine", (canDrill ? (availCopper < 200 ? 120 : availCopper < 400 ? 90 : 50) + (state.drillCount < config.maxDrills ? 30 : 0) : 0), actionHandlers.mine);
  addAction("defend", (canDuo ? (enemies > 0 ? 90 : 30) + (state.turretCount < config.maxTurrets ? 20 : 0) : 0), actionHandlers.defend);
  addAction("power", (canPowerNode && state.powerClusters < config.maxPowerClusters && availCopper > 200 && availLead > 150 ? 20 : 0) + powerNeedScore + (state.pumpCount > state.powerClusters ? 15 : 0), actionHandlers.power);
  addAction("liquid", (canLiquid ? (state.pumpCount < config.maxPumps ? 45 : 0) + (state.liquidHubCount < config.maxLiquidHubs ? 15 : 0) : 0), runCore(actionLiquid));
  addAction("noop", 0, actionHandlers.noop);

  if (config.rlPolicyMode != "heuristic") {
    if (config.rlPolicyMode == "qtable" || config.rlPolicyMode == "hybrid") {
      var qScores = qScoresForState(beforeState);
      var isQTable = config.rlPolicyMode == "qtable";
      var isHybrid = config.rlPolicyMode == "hybrid";
      var blend = config.rlQTableBlend;
      for (var qi = 0; qi < actions.length; qi++) {
        var act = actions[qi];
        var qv = qScores != null ? qScores[act.name] : null;
        if (qv == null) {
          if (isQTable) act.score = 0;
          continue;
        }
        if (isQTable) act.score = qv;
        else if (isHybrid) act.score = act.score * (1 - blend) + qv * blend;
      }
    }

    if (config.rlPolicyMode == "nn" && state.nnModel != null) {
      var nnScores = nnScoresForState(beforeState);
      if (nnScores != null) {
        for (var qi2 = 0; qi2 < actions.length; qi2++) {
          var act2 = actions[qi2];
          var nnv = nnScores[act2.name];
          if (nnv == null) {
            act2.score = 0;
            continue;
          }
          act2.score = nnv;
        }
      }
    }
  }

  var ranked = rankActions(actions);
  var pickedName = "noop";
  state.lastAction = "none";
  state.lastActionOk = false;
  for (var r = 0; r < ranked.length; r++) {
    var picked = ranked[r];
    var ok = false;
    try {
      ok = picked.run();
    } catch (e) {
      ok = false;
    }
    if (!ok) continue;
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
  var did = state.lastActionOk === true;

  var core2 = getCore(team);
  var enemyCore2 = findEnemyCore(team);
  var enemies2 = countEnemyUnits(team);
  var afterState = snapshotState(core2, enemyCore2, enemies2, team);
  var reward = computeReward(beforeState, pickedName, afterState, { ok: did });
  state.lastReward = reward;
  updateOnlineQTable(beforeState, pickedName, afterState, reward);
  updateNNModel(beforeState, pickedName, afterState, reward);
  saveQTableIfNeeded();
  saveNNModelIfNeeded();
  emitTransition(beforeState, pickedName, afterState, { ok: did, reward: reward });
}



Events.run(Trigger.update, function(){
  state.tick++;

  ensureHudButton();
  ensurePlayerControlled();

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
