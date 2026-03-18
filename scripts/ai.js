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
var Conveyor = Packages.mindustry.world.blocks.distribution.Conveyor;
var Duct = Packages.mindustry.world.blocks.distribution.Duct;
var Conduit = Packages.mindustry.world.blocks.liquid.Conduit;
var PumpBlock = Packages.mindustry.world.blocks.production.Pump;
var PowerNodeBlock = Packages.mindustry.world.blocks.power.PowerNode;
var SolarGeneratorBlock = Packages.mindustry.world.blocks.power.SolarGenerator;
var ThermalGeneratorBlock = Packages.mindustry.world.blocks.power.ThermalGenerator;
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
  attackMinCopper: 400,
  attackMinLead: 300,
  attackMinForce: 10,
  attackAdvantageRatio: 1.4,
  attackOverwhelmRatio: 1.8,
  attackTurretThreat: 3.0,
  attackMaxEnemyTurrets: 4,
  attackDefenseRadius: 18,
  attackRallyMinUnits: 8,
  attackRallyRadius: 10,
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
  modName: "auto-game",
  rlLogEnabled: true,
  rlSocketEnabled: true,
  rlSocketHost: "127.0.0.1",
  rlSocketPort: 4567,
  rlSocketReconnectTicks: 300,
  rlSocketTimeoutMs: 200,
  rlSocketQueueMax: 200,
  rlEmitGameOverEvent: true,
  rlPolicyMode: "nn",
  rlQTableFile: "q_table.json",
  rlQTablePath: "",
  rlQTableReloadTicks: 0,
  rlQTableBlend: 0.7,
  rlNNEnabled: true,
  rlSchemaFile: "rl_schema.json",
  rlSchemaPath: "",
  rlNNFile: "nn_model.json",
  rlNNPath: "",
  rlNNHidden: 16,
  rlNNReloadTicks: 0,
  rlNNBootstrapMissing: false,
  rlNNFallbackHeuristic: true,
  rlPolicySample: true,
  rlPolicyTemperature: 1.0,
  rlNNSaveInterval: 0,
  rlNNSaveExternal: false,
  rlNNAlpha: 0.01,
  rlNNGamma: 0.9,
  rlEpsilonEnabled: true,
  rlEpsilon: 0.08,
  rlEpsilonMin: 0.02,
  rlEpsilonDecay: 0.999,
  rlEpsilonOnlyWhenRL: true,
  rlOnlineEnabled: false,
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
  aiControlPlayerUnit: false,
  // When true, the local player unit is excluded from AI commands and the player retains direct control.
  // Set to false so the AI can fully control the player's unit automatically.
  observerMode: true,
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
  resourceReserveSoftMargin: 0.5,
  resourceReservePenalty: 0.6,
  resourceReserveBoost: 0.8,
  economicMiningRoadmap: [
    { item: "copper", priority: 1.0, minDrills: 1, critical: false },
    { item: "lead", priority: 1.05, minDrills: 1, critical: false },
    { item: "graphite", priority: 1.1, minDrills: 0, critical: false },
    { item: "metaglass", priority: 1.1, minDrills: 0, critical: false },
    { item: "silicon", priority: 1.2, minDrills: 0, critical: false },
    { item: "titanium", priority: 1.5, minDrills: 1, critical: true, bypassSlots: 2 },
    { item: "thorium", priority: 1.35, minDrills: 1, critical: true, bypassSlots: 1 }
  ],
  mineRoadmapBaseScore: 35,
  mineRoadmapPressureWeight: 120,
  mineRoadmapPriorityWeight: 30,
  mineRoadmapDistanceWeight: 1.5,
  mineRoadmapUnderDrilledBonus: 28,
  mineCriticalBypassSlots: 2,
  mineCriticalPressureGate: 0.2,
  rlNNEconomicGuard: true,
  rlNNEconomicGuardFloor: 1.0,
  rlNNEconomicGuardThreshold: 70,
  strategyMode: "auto",
  strategySwitchCooldown: 600,
  strategyAffectsRL: false,
  strategyAuto: {
    defensiveCoreHealthFrac: 0.5,
    defensiveEnemyCount: 6,
    defensiveWaveMin: 8,
    economicReservePressure: 0.6,
    economicPowerAvg: 0.4,
    economicWaveMax: 3,
    aggressiveUnitsMin: 10,
    aggressiveEnemyMax: 3
  },
  autoBlockSelection: true,
  liquidHubMinCapacity: 100,
  blockPrefs: {
    drills: ["mechanical-drill", "pneumatic-drill", "laser-drill"],
    turrets: ["duo", "scatter", "salvo", "arc"],
    conveyors: ["conveyor", "titanium-conveyor", "plastanium-conveyor", "duct"],
    conduits: ["conduit", "pulse-conduit", "plated-conduit"],
    pumps: ["mechanical-pump", "rotary-pump"],
    liquidHubs: ["liquid-container", "liquid-tank", "liquid-router"],
    powerNodes: ["power-node", "power-node-large"],
    solarPanels: ["solar-panel", "large-solar-panel"],
    thermals: ["thermal-generator"]
  },
  strategyProfiles: {
    balanced: {
      attackWave: 1.0,
      rally: 1.0,
      mine: 1.0,
      defend: 1.0,
      power: 1.0,
      liquid: 1.0,
      thermal: 1.0,
      noop: 1.0
    },
    defensive: {
      attackWave: 0.6,
      rally: 0.8,
      mine: 1.1,
      defend: 1.4,
      power: 1.1,
      liquid: 1.0,
      thermal: 1.1,
      noop: 1.0
    },
    aggressive: {
      attackWave: 1.5,
      rally: 1.3,
      mine: 0.9,
      defend: 0.8,
      power: 1.0,
      liquid: 0.9,
      thermal: 0.9,
      noop: 0.8
    },
    economic: {
      attackWave: 0.7,
      rally: 0.8,
      mine: 1.6,
      defend: 0.8,
      power: 1.2,
      liquid: 1.2,
      thermal: 1.2,
      noop: 1.0
    }
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
  logicTurretControl: true,
  logicTurretMaxLinks: 2,
  logicTurretSearchRadius: 12,
  logicTurretRadarSort: "distance",
  logicTurretExtraScan: true,
  logicTurretRadarSortAlt: "health",
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
  lastRallyTick: -9999,
  waveIndex: 0,
  drillCount: 0,
  turretCount: 0,
  powerClusters: 0,
  pumpCount: 0,
  liquidHubCount: 0,
  thermalCount: 0,
  industryBlocks: 0,
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
  currentStrategy: "balanced",
  lastStrategyTick: -9999,
  playerControlledUnitId: -1,
  playerControllerSet: false,
  // Tick when we last attempted to change the player unit controller.
  lastControllerAttemptTick: -9999,
  controllerResetPenalty: 0,
  nnModel: null,
  nnLastLoadTick: -9999,
  nnLastSaveTick: -9999,
  nnLastErrorTick: -9999,
  rlEpsilon: -1,
  lastRLState: null,
  gameOverEventSent: false,
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

var rlSchemaLastLoadTick = -9999;
var rlSchemaLastErrorTick = -9999;
var rlQTable = null;

function emptyRLMeta() {
  return {
    actions: [],
    features: [],
    norms: {}
  };
}

var rlQMeta = emptyRLMeta();
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

function tilesToWorld(tiles) {
  var scale = 1;
  try {
    if (Vars.tilesize != null && Vars.tilesize > 0) scale = Vars.tilesize;
  } catch (e) {
    // ignore
  }
  return tiles * scale;
}

function tileCenterToWorld(x, y) {
  var size = tilesToWorld(1);
  return {
    x: x * size + size / 2,
    y: y * size + size / 2
  };
}

function shouldExcludePlayerUnit() {
  return config.observerMode || !config.aiControlPlayerUnit;
}

function hasBucketizedFeatures(features) {
  if (features == null || features.length == null || features.length == 0) return false;
  try {
    return features[0] != null && features[0].name != null && features[0].bins != null && features[0].bins.length != null;
  } catch (e) {
    return false;
  }
}

function applyRLMeta(data) {
  if (data == null) return false;
  var changed = false;
  if (data.actions != null && data.actions.length != null) {
    rlQMeta.actions = data.actions;
    changed = true;
  }
  // Keep bucketized state features separate from NN feature-name lists.
  if (hasBucketizedFeatures(data.features)) {
    rlQMeta.features = data.features;
    changed = true;
  }
  if (data.norms != null) {
    rlQMeta.norms = data.norms;
    changed = true;
  }
  return changed;
}

function resolveSchemaFi() {
  if (config.rlSchemaPath != null && config.rlSchemaPath != "") {
    try {
      return new Fi(config.rlSchemaPath);
    } catch (e) {
      return null;
    }
  }
  try {
    var mod = Vars.mods.getMod(config.modName);
    if (mod != null && mod.root != null) {
      return mod.root.child(config.rlSchemaFile);
    }
  } catch (e2) {
    // ignore
  }
  try {
    return new Fi(config.rlSchemaFile);
  } catch (e3) {
    return null;
  }
}

function loadRLSchema(force) {
  if (!force && rlQMeta.actions != null && rlQMeta.actions.length > 0 && rlQMeta.features != null && rlQMeta.features.length > 0) {
    return true;
  }
  var fi = resolveSchemaFi();
  if (fi == null || !fi.exists()) {
    if ((state.tick - rlSchemaLastErrorTick) > 600) {
      Log.info("[RL] Schema nao encontrado: " + config.rlSchemaFile);
      rlSchemaLastErrorTick = state.tick;
    }
    return false;
  }
  try {
    var text = fi.readString();
    var data = JSON.parse(String(text));
    if (!applyRLMeta(data) || rlQMeta.features.length == 0) {
      Log.info("[RL] Schema invalido.");
      return false;
    }
    rlSchemaLastLoadTick = state.tick;
    Log.info("[RL] Schema carregado: " + fi.absolutePath());
    return true;
  } catch (e4) {
    if ((state.tick - rlSchemaLastErrorTick) > 600) {
      Log.info("[RL] Erro ao carregar schema RL.");
      rlSchemaLastErrorTick = state.tick;
    }
    return false;
  }
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
  var titanium = 0;
  var coreItems = 0;
  var coreHealth = 0;
  var coreMax = 1;
  if (corePresent && core.items != null) {
    copper = core.items.get(Items.copper);
    lead = core.items.get(Items.lead);
    titanium = core.items.get(Items.titanium);
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
    titanium: titanium,
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
    unitsTotal: unitsTotal,
    industryBlocks: state.industryBlocks
  };
}

function emitTransition(prevState, actionName, nextState, info) {
  var payload = { s: prevState, a: actionName, s2: nextState, info: info, t: state.tick };
  var line = JSON.stringify(payload);
  if (config.rlLogEnabled) Log.info("[RL]" + line);
  rlSocketSend(line);
}

function emitSocketEvent(eventName, data) {
  var payload = { type: "event", event: eventName, t: state.tick, data: data != null ? data : {} };
  if (config.rlLogEnabled) Log.info("[RL-EVENT]" + JSON.stringify(payload));
  rlSocketSend(JSON.stringify(payload));
}

function safeTeamName(team) {
  if (team == null) return "";
  try {
    if (team.name != null) return String(team.name);
  } catch (e) {
    // ignore
  }
  try {
    return String(team);
  } catch (e2) {
    return "";
  }
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

function isHeadless() {
  try {
    return Vars.headless === true;
  } catch (e) {
    return false;
  }
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
  var epsText = shouldUseEpsilon() ? (" eps:" + Math.round(getEpsilon() * 100) / 100) : "";
  var text = "IA " + (state.aiEnabled ? "ON" : "OFF") +
    " | p:" + pOk +
    " c:" + cOk +
    " obs:" + (config.observerMode ? "1" : "0") +
    " strat:" + (state.currentStrategy != null ? state.currentStrategy : "-") +
    epsText +
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

function itemByName(name) {
  if (name == null) return null;
  try {
    var item = Items[name];
    if (item != null) return item;
  } catch (e) {
    // ignore
  }
  try {
    var seq = Vars.content.items();
    var found = null;
    seq.each(function(it){
      if (found != null) return;
      try {
        if (it != null && it.name == name) found = it;
      } catch (e2) {
        // ignore
      }
    });
    return found;
  } catch (e3) {
    // ignore
  }
  return null;
}

function isInstance(obj, clazz) {
  if (clazz == null || obj == null) return false;
  try {
    return obj instanceof clazz;
  } catch (e) {
    return false;
  }
}

function blockByName(name) {
  if (name == null) return null;
  try {
    var b = Blocks[name];
    if (b != null) return b;
  } catch (e) {
    // ignore
  }
  try {
    var seq = Vars.content.blocks();
    var found = null;
    seq.each(function(bl){
      if (found != null) return;
      try {
        if (bl != null && bl.name == name) found = bl;
      } catch (e2) {
        // ignore
      }
    });
    return found;
  } catch (e3) {
    // ignore
  }
  return null;
}

function blockCost(block) {
  if (block == null) return 999999;
  var reqs = block.requirements;
  if (reqs == null || reqs.length == 0) return 0;
  var mult = (Vars.state != null && Vars.state.rules != null) ? Vars.state.rules.buildCostMultiplier : 1;
  var sum = 0;
  for (var i = 0; i < reqs.length; i++) {
    var stack = reqs[i];
    sum += Math.ceil(stack.amount * mult);
  }
  return sum;
}

function pickBlockFromNames(list, team) {
  if (list == null || list.length == null) return null;
  for (var i = 0; i < list.length; i++) {
    var name = list[i];
    var b = blockByName(name);
    if (b == null) continue;
    if (!blockUnlocked(b)) continue;
    if (!coreHasItemsFor(b, team)) continue;
    return b;
  }
  return null;
}

function autoPickBlock(team, predicate) {
  try {
    var seq = Vars.content.blocks();
    var best = null;
    var bestCost = 999999;
    seq.each(function(b){
      if (b == null) return;
      if (!blockUnlocked(b)) return;
      if (!coreHasItemsFor(b, team)) return;
      var ok = false;
      try {
        ok = predicate(b);
      } catch (e) {
        ok = false;
      }
      if (!ok) return;
      var cost = blockCost(b);
      if (cost < bestCost) {
        bestCost = cost;
        best = b;
      }
    });
    return best;
  } catch (e2) {
    return null;
  }
}

function pickBlock(list, team, predicate, fallback) {
  var b = pickBlockFromNames(list, team);
  if (b != null) return b;
  if (config.autoBlockSelection) {
    b = autoPickBlock(team, predicate);
    if (b != null) return b;
  }
  return fallback;
}

function pickDrillBlock(team) {
  return pickBlock(config.blockPrefs != null ? config.blockPrefs.drills : null, team, function(b){
    return b.group == BlockGroup.drills;
  }, Blocks.mechanicalDrill);
}

function pickTurretBlock(team) {
  return pickBlock(config.blockPrefs != null ? config.blockPrefs.turrets : null, team, function(b){
    return b.group == BlockGroup.turrets;
  }, Blocks.duo);
}

function pickConveyorBlock(team) {
  var names = config.blockPrefs != null ? config.blockPrefs.conveyors : null;
  var picked = pickBlockFromNames(names, team);
  if (picked != null) return picked;
  if (config.autoBlockSelection) {
    picked = autoPickBlock(team, function(b){
      return isInstance(b, Conveyor) || isInstance(b, Duct);
    });
    if (picked != null) return picked;
    picked = autoPickBlock(team, function(b){
      return b.group == BlockGroup.transportation && b.hasItems && b.rotate;
    });
    if (picked != null) return picked;
  }
  return Blocks.conveyor;
}

function pickConduitBlock(team) {
  var names = config.blockPrefs != null ? config.blockPrefs.conduits : null;
  var picked = pickBlockFromNames(names, team);
  if (picked != null) return picked;
  if (config.autoBlockSelection) {
    picked = autoPickBlock(team, function(b){
      return isInstance(b, Conduit);
    });
    if (picked != null) return picked;
    picked = autoPickBlock(team, function(b){
      return b.group == BlockGroup.liquids && b.hasLiquids && b.rotate;
    });
    if (picked != null) return picked;
  }
  return Blocks.conduit;
}

function pickPumpBlock(team) {
  return pickBlock(config.blockPrefs != null ? config.blockPrefs.pumps : null, team, function(b){
    return isInstance(b, PumpBlock);
  }, Blocks.mechanicalPump);
}

function isLiquidHubBlock(block) {
  if (block == null) return false;
  if (!block.hasLiquids) return false;
  if (isInstance(block, PumpBlock)) return false;
  if (isInstance(block, Conduit)) return false;
  var minCap = config.liquidHubMinCapacity != null ? config.liquidHubMinCapacity : 100;
  var cap = block.liquidCapacity != null ? block.liquidCapacity : 0;
  return cap >= minCap;
}

function isPreferredBlock(block, list) {
  if (block == null || list == null || list.length == null) return false;
  for (var i = 0; i < list.length; i++) {
    if (block.name == list[i]) return true;
  }
  return false;
}

function pickLiquidHubBlock(core) {
  var team = getTeam();
  var fromList = pickBlockFromNames(config.blockPrefs != null ? config.blockPrefs.liquidHubs : null, team);
  if (fromList != null) return fromList;
  if (config.autoBlockSelection) {
    var minCap = config.liquidHubMinCapacity != null ? config.liquidHubMinCapacity : 100;
    var best = null;
    var bestCap = -1;
    var bestCost = 999999;
    try {
      Vars.content.blocks().each(function(b){
        if (b == null) return;
        if (!blockUnlocked(b)) return;
        if (!coreHasItemsFor(b, team)) return;
        if (!isLiquidHubBlock(b)) return;
        var cap = b.liquidCapacity != null ? b.liquidCapacity : 0;
        var cost = blockCost(b);
        if (cap > bestCap || (cap == bestCap && cost < bestCost)) {
          best = b;
          bestCap = cap;
          bestCost = cost;
        }
      });
    } catch (e2) {
      // ignore
    }
    if (best != null) return best;
  }
  if (config.preferLiquidTank && blockUnlocked(Blocks.liquidTank)) return Blocks.liquidTank;
  if (core != null && core.items != null) {
    var titanium = core.items.get(Items.titanium);
    var metaglass = core.items.get(Items.metaglass);
    if (titanium >= 30 && metaglass >= 40 && blockUnlocked(Blocks.liquidTank)) return Blocks.liquidTank;
  }
  return blockUnlocked(Blocks.liquidContainer) ? Blocks.liquidContainer : Blocks.liquidRouter;
}

function pickPowerNodeBlock(team) {
  return pickBlock(config.blockPrefs != null ? config.blockPrefs.powerNodes : null, team, function(b){
    return isInstance(b, PowerNodeBlock);
  }, Blocks.powerNode);
}

function pickSolarBlock(team) {
  return pickBlock(config.blockPrefs != null ? config.blockPrefs.solarPanels : null, team, function(b){
    return isInstance(b, SolarGeneratorBlock);
  }, Blocks.solarPanel);
}

function pickThermalBlock(team) {
  return pickBlock(config.blockPrefs != null ? config.blockPrefs.thermals : null, team, function(b){
    return isInstance(b, ThermalGeneratorBlock);
  }, Blocks.thermalGenerator);
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
  loadRLSchema(false);
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
    applyRLMeta(data);
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
  loadRLSchema(false);
  var fi = resolveNNFi();
  if (fi == null || !fi.exists()) {
    if ((state.tick - state.nnLastErrorTick) > 600) {
      Log.info("[RL] NN model nao encontrado: " + config.rlNNFile);
      state.nnLastErrorTick = state.tick;
    }
    if (config.rlNNBootstrapMissing && rlQMeta && rlQMeta.features && rlQMeta.actions) {
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
    applyRLMeta(data);
    if (data.layers != null && data.readOnly == null) data.readOnly = true;
    if (data.algorithm == "ppo-style" && data.policy == null) data.policy = "categorical";
    if (data.algorithm == "ppo-style" && data.output == null) data.output = "logits";
    if (data.features == null && rlQMeta.features != null) data.features = rlQMeta.features;
    if (data.actions == null && rlQMeta.actions != null) data.actions = rlQMeta.actions;
    if (data.norms == null && rlQMeta.norms != null) data.norms = rlQMeta.norms;
    if (data.inputSize == null && data.features != null) data.inputSize = data.features.length;
    if (data.outputSize == null && data.actions != null) data.outputSize = data.actions.length;
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

function tanh(x) {
  if (Math.tanh != null) return Math.tanh(x);
  var ex = Math.exp(x);
  var enx = Math.exp(-x);
  return (ex - enx) / (ex + enx);
}

function relu(x) {
  return x > 0 ? x : 0;
}

function applyActivation(x, act) {
  if (act == null || act == "none" || act == "linear") return x;
  if (act == "relu") return relu(x);
  if (act == "tanh") return tanh(x);
  return x;
}

function featureName(feat) {
  if (feat == null) return null;
  if (typeof feat === "string") return feat;
  try {
    if (feat.name != null) return feat.name;
  } catch (e) {
    // ignore
  }
  try {
    return String(feat);
  } catch (e2) {
    return null;
  }
}

function normalizeInput(model, input, features) {
  if (model == null || model.norms == null || features == null) return input;
  var norms = model.norms;
  var out = [];
  for (var i = 0; i < input.length; i++) {
    var name = featureName(features[i]);
    var v = input[i];
    if (name != null && norms[name] != null) {
      var n = norms[name];
      if (n != null && n != 0) v = v / n;
      if (v > 10) v = 10;
      if (v < -10) v = -10;
    }
    out.push(v);
  }
  return out;
}

function nnForwardLayers(model, input) {
  if (model == null || model.layers == null) return null;
  var vec = input;
  for (var li = 0; li < model.layers.length; li++) {
    var layer = model.layers[li];
    if (layer == null || layer.w == null) return null;
    var outSize = layer.out != null ? layer.out : (layer.b != null ? layer.b.length : 0);
    var inSize = layer["in"] != null ? layer["in"] : vec.length;
    var out = [];
    for (var o = 0; o < outSize; o++) {
      var sum = (layer.b != null && layer.b.length > o) ? layer.b[o] : 0;
      for (var j = 0; j < inSize; j++) {
        sum += (layer.w[o * inSize + j] || 0) * (vec[j] || 0);
      }
      out.push(applyActivation(sum, layer.act));
    }
    vec = out;
  }
  return { input: input, output: vec };
}

function nnForward(stateObj) {
  if (state.nnModel == null) return null;
  var model = state.nnModel;
  if (model.features == null || model.actions == null) return null;
  var input = [];
  for (var i = 0; i < model.features.length; i++) {
    var name = featureName(model.features[i]);
    var val = stateObj[name];
    if (val == null) val = 0;
    input.push(val);
  }
  input = normalizeInput(model, input, model.features);
  if (model.layers != null) {
    return nnForwardLayers(model, input);
  }
  // hidden = tanh(W1 * input + b1)
  var hidden = [];
  for (var h = 0; h < model.hiddenSize; h++) {
    var sum = model.b1[h] || 0;
    for (var j = 0; j < model.inputSize; j++) {
      sum += (model.w1[h * model.inputSize + j] || 0) * input[j];
    }
    hidden.push(tanh(sum));
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

function nnModelHasFeature(name) {
  if (state.nnModel == null || state.nnModel.features == null || name == null) return false;
  for (var i = 0; i < state.nnModel.features.length; i++) {
    if (featureName(state.nnModel.features[i]) == name) return true;
  }
  return false;
}

function shouldProtectEconomicMineScore(plan) {
  if (!config.rlNNEconomicGuard) return false;
  if (plan == null) return false;
  var threshold = config.rlNNEconomicGuardThreshold != null ? config.rlNNEconomicGuardThreshold : 0;
  if (plan.score < threshold && !plan.missingEconomicSignal) return false;
  if (!nnModelHasFeature("titanium")) return true;
  if (!nnModelHasFeature("industryBlocks")) return true;
  if (plan.itemName != null && !nnModelHasFeature(plan.itemName) && (plan.critical || plan.pressure > 0.5)) return true;
  return false;
}

function nnUsesPolicySampling() {
  if (config.rlPolicyMode != "nn") return false;
  if (!config.rlPolicySample) return false;
  if (state.nnModel == null) return false;
  if (state.nnModel.policy == "categorical") return true;
  if (state.nnModel.output == "logits" || state.nnModel.output == "probs") return true;
  return state.nnModel.algorithm == "ppo-style";
}

function softmaxValues(values, temperature) {
  if (values == null || values.length == 0) return [];
  var temp = temperature != null ? temperature : 1;
  if (temp <= 0) temp = 1;
  var maxv = values[0];
  for (var i = 1; i < values.length; i++) {
    if (values[i] > maxv) maxv = values[i];
  }
  var exps = [];
  var sum = 0;
  for (var j = 0; j < values.length; j++) {
    var e = Math.exp((values[j] - maxv) / temp);
    if (!(e >= 0)) e = 0;
    exps.push(e);
    sum += e;
  }
  if (sum <= 0) {
    var uniform = [];
    for (var k = 0; k < values.length; k++) uniform.push(1 / values.length);
    return uniform;
  }
  for (var m = 0; m < exps.length; m++) exps[m] = exps[m] / sum;
  return exps;
}

function sampleWeightedIndex(weights) {
  if (weights == null || weights.length == 0) return -1;
  var r = Math.random();
  var acc = 0;
  for (var i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (r <= acc) return i;
  }
  return weights.length - 1;
}

function pickPolicyOrder(actions) {
  if (actions == null || actions.length == 0) return actions;
  var model = state.nnModel;
  if (model == null) return actions;
  var remaining = [];
  for (var i = 0; i < actions.length; i++) remaining.push(actions[i]);
  var ordered = [];
  var outputKind = model.output != null ? model.output : "logits";
  var temperature = config.rlPolicyTemperature != null ? config.rlPolicyTemperature : 1.0;

  while (remaining.length > 0) {
    var weights = [];
    if (outputKind == "probs") {
      var probSum = 0;
      for (var j = 0; j < remaining.length; j++) {
        var p = remaining[j].score;
        if (!(p > 0)) p = 0;
        weights.push(p);
        probSum += p;
      }
      if (probSum <= 0) {
        for (var j2 = 0; j2 < remaining.length; j2++) weights[j2] = 1 / remaining.length;
      } else {
        for (var j3 = 0; j3 < weights.length; j3++) weights[j3] = weights[j3] / probSum;
      }
    } else {
      var logits = [];
      for (var k = 0; k < remaining.length; k++) logits.push(remaining[k].score);
      weights = softmaxValues(logits, temperature);
    }
    var idx = sampleWeightedIndex(weights);
    if (idx < 0) break;
    ordered.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return ordered.length > 0 ? ordered : actions;
}

function updateNNModel(prevState, actionName, nextState, reward) {
  if (!config.rlNNEnabled) return false;
  if (state.nnModel == null) return false;
  if (state.nnModel.layers != null) return false;
  if (state.nnModel.actions == null || state.nnModel.features == null) return false;
  var model = state.nnModel;
  if (model.hiddenSize == null || model.inputSize == null || model.outputSize == null) return false;
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
  if (state.nnModel.readOnly) return false;
  if (state.nnModel.layers != null && config.rlNNSaveExternal === false) return false;
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
    var name = featureName(f);
    var bins = [];
    try {
      if (f != null && f.bins != null && f.bins.length != null) bins = f.bins;
    } catch (e) {
      bins = [];
    }
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
      features: rlQMeta.features,
      norms: rlQMeta.norms
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
  if (isHeadless()) return null;
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

function clamp01(v) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
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

function resourcePressure(core, item) {
  if (core == null || core.items == null || item == null) return 0;
  var reserve = reserveFor(item);
  if (reserve <= 0) return 0;
  var total = core.items.get(item);
  var margin = config.resourceReserveSoftMargin != null ? config.resourceReserveSoftMargin : 0;
  if (margin < 0) margin = 0;
  var soft = reserve * (1 + margin);
  if (soft <= reserve) soft = reserve + 1;
  if (total <= reserve) return 1;
  if (total >= soft) return 0;
  return clamp01((soft - total) / (soft - reserve));
}

function reservePressure(core) {
  if (core == null) return 0;
  var maxp = 0;
  if (config.resourceReserve != null) {
    for (var key in config.resourceReserve) {
      if (!config.resourceReserve.hasOwnProperty(key)) continue;
      var item = itemByName(key);
      if (item == null) continue;
      var p = resourcePressure(core, item);
      if (p > maxp) maxp = p;
    }
  }
  return maxp;
}

function miningRoadmapEntry(item) {
  if (item == null || config.economicMiningRoadmap == null) return null;
  var name = null;
  try {
    name = item.name;
  } catch (e) {
    name = null;
  }
  if (name == null) return null;
  for (var i = 0; i < config.economicMiningRoadmap.length; i++) {
    var entry = config.economicMiningRoadmap[i];
    if (entry != null && entry.item == name) return entry;
  }
  return null;
}

function miningBypassCap(entry) {
  var extra = config.mineCriticalBypassSlots != null ? config.mineCriticalBypassSlots : 0;
  if (entry != null && entry.bypassSlots != null) extra = entry.bypassSlots;
  return config.maxDrills + Math.max(0, extra);
}

function countDrillsMiningItem(team, item) {
  if (team == null || item == null) return 0;
  return countBlocksByPredicate(team, function(b){
    if (b.block == null || b.block.group != BlockGroup.drills || b.tile == null) return false;
    var drop = null;
    try {
      drop = b.tile.drop();
    } catch (e) {
      drop = null;
    }
    if (drop == null) return false;
    return drop == item || (drop.name != null && item.name != null && drop.name == item.name);
  });
}

function computeMiningPlan(core, team) {
  if (core == null) return null;
  var cx = core.tile.x;
  var cy = core.tile.y;
  var ores = findOreTiles(cx, cy, config.oreSearchRadius, -1);
  if (ores == null || ores.length == 0) return null;
  var baseScore = config.mineRoadmapBaseScore != null ? config.mineRoadmapBaseScore : 0;
  var pressureWeight = config.mineRoadmapPressureWeight != null ? config.mineRoadmapPressureWeight : 100;
  var priorityWeight = config.mineRoadmapPriorityWeight != null ? config.mineRoadmapPriorityWeight : 30;
  var distanceWeight = config.mineRoadmapDistanceWeight != null ? config.mineRoadmapDistanceWeight : 1;
  var underDrilledBonus = config.mineRoadmapUnderDrilledBonus != null ? config.mineRoadmapUnderDrilledBonus : 25;
  var criticalGate = config.mineCriticalPressureGate != null ? config.mineCriticalPressureGate : 0;
  var best = null;
  for (var i = 0; i < ores.length; i++) {
    var ore = ores[i];
    if (ore == null || ore.item == null) continue;
    var tile = tileAt(ore.x, ore.y);
    if (tile == null || tile.block() != Blocks.air) continue;
    var entry = miningRoadmapEntry(ore.item);
    var pressure = resourcePressure(core, ore.item);
    var reserve = reserveFor(ore.item);
    var total = core.items != null ? core.items.get(ore.item) : 0;
    var deficit = reserve > total ? (reserve - total) : 0;
    var priority = entry != null && entry.priority != null ? entry.priority : (reserve > 0 ? 1.0 : 0.6);
    var itemDrills = countDrillsMiningItem(team, ore.item);
    var minDrills = entry != null && entry.minDrills != null ? entry.minDrills : 0;
    var underDrilled = itemDrills < minDrills;
    var critical = entry != null && entry.critical === true;
    var bypassCap = miningBypassCap(entry);
    var canBypass = critical && pressure >= criticalGate && state.drillCount < bypassCap;
    var underBaseCap = state.drillCount < config.maxDrills;
    if (!underBaseCap && !canBypass) continue;
    var score = baseScore;
    score += pressure * pressureWeight;
    score += priority * priorityWeight;
    score += Math.min(deficit, reserve > 0 ? reserve : 100) * 0.15;
    if (underDrilled) score += underDrilledBonus;
    if (critical && pressure > 0) score += 18;
    if (underBaseCap) score += 12;
    else if (canBypass) score += 16;
    score -= Math.sqrt(ore.dist2) * distanceWeight;
    if (best == null || score > best.score) {
      best = {
        ore: ore,
        item: ore.item,
        itemName: ore.itemName,
        score: score,
        pressure: pressure,
        reserve: reserve,
        total: total,
        deficit: deficit,
        underDrilled: underDrilled,
        itemDrills: itemDrills,
        minDrills: minDrills,
        critical: critical,
        allowBypass: !underBaseCap && canBypass,
        capped: !underBaseCap,
        missingEconomicSignal: critical || pressure > 0.5 || underDrilled
      };
    }
  }
  return best;
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

function getStrategyProfile(name) {
  if (config.strategyProfiles != null && config.strategyProfiles[name] != null) return config.strategyProfiles[name];
  if (config.strategyProfiles != null && config.strategyProfiles.balanced != null) return config.strategyProfiles.balanced;
  return null;
}

function pickStrategy(core, enemyCore, enemies, powerStats, beforeState) {
  var mode = config.strategyMode;
  if (mode != null && mode != "" && mode != "auto") {
    state.currentStrategy = mode;
    state.lastStrategyTick = state.tick;
    return mode;
  }
  if (config.strategySwitchCooldown != null && config.strategySwitchCooldown > 0) {
    if ((state.tick - state.lastStrategyTick) < config.strategySwitchCooldown && state.currentStrategy != null) {
      return state.currentStrategy;
    }
  }
  var coreHealthFrac = beforeState != null ? beforeState.coreHealthFrac : 1;
  var unitsTotal = beforeState != null ? beforeState.unitsTotal : 0;
  var wave = beforeState != null && beforeState.wave != null ? beforeState.wave : state.waveIndex;
  var pressure = reservePressure(core);
  var autoCfg = config.strategyAuto || {};
  var defHealth = autoCfg.defensiveCoreHealthFrac != null ? autoCfg.defensiveCoreHealthFrac : 0.5;
  var defEnemies = autoCfg.defensiveEnemyCount != null ? autoCfg.defensiveEnemyCount : 6;
  var defWave = autoCfg.defensiveWaveMin != null ? autoCfg.defensiveWaveMin : -1;
  var econPressure = autoCfg.economicReservePressure != null ? autoCfg.economicReservePressure : 0.6;
  var econPower = autoCfg.economicPowerAvg != null ? autoCfg.economicPowerAvg : 0.4;
  var econWave = autoCfg.economicWaveMax != null ? autoCfg.economicWaveMax : -1;
  var aggUnits = autoCfg.aggressiveUnitsMin != null ? autoCfg.aggressiveUnitsMin : 10;
  var aggEnemies = autoCfg.aggressiveEnemyMax != null ? autoCfg.aggressiveEnemyMax : 3;
  var powerLow = powerStats != null && powerStats.avg != null && powerStats.avg < econPower;
  var earlyWave = enemyCore == null && econWave >= 0 && wave >= 0 && wave <= econWave;
  var lateWave = enemyCore == null && defWave >= 0 && wave >= defWave;
  var strat = "balanced";
  if (coreHealthFrac < defHealth || enemies > defEnemies || (lateWave && enemies > 0)) {
    strat = "defensive";
  } else if (pressure > econPressure || powerLow || earlyWave) {
    strat = "economic";
  } else if (enemyCore != null && unitsTotal >= aggUnits && enemies < aggEnemies) {
    strat = "aggressive";
  }
  state.currentStrategy = strat;
  state.lastStrategyTick = state.tick;
  return strat;
}

function applyStrategyScore(name, score, strategy) {
  if (score <= 0) return score;
  var profile = getStrategyProfile(strategy);
  if (profile == null) return score;
  var mult = profile[name];
  if (mult == null) mult = 1.0;
  if (mult < 0) mult = 0;
  return score * mult;
}

function shouldUseEpsilon() {
  if (!config.rlEpsilonEnabled) return false;
  if (config.rlEpsilonOnlyWhenRL && config.rlPolicyMode == "heuristic") return false;
  if (nnUsesPolicySampling()) return false;
  if (config.rlPolicyMode == "nn" && state.nnModel == null) return false;
  return true;
}

function getEpsilon() {
  if (!shouldUseEpsilon()) return 0;
  var eps = state.rlEpsilon >= 0 ? state.rlEpsilon : (config.rlEpsilon != null ? config.rlEpsilon : 0);
  var minv = config.rlEpsilonMin != null ? config.rlEpsilonMin : 0;
  if (eps < minv) eps = minv;
  return eps;
}

function decayEpsilon() {
  if (!shouldUseEpsilon()) return;
  var decay = config.rlEpsilonDecay != null ? config.rlEpsilonDecay : 1;
  if (decay >= 1) return;
  var eps = getEpsilon();
  eps = eps * decay;
  var minv = config.rlEpsilonMin != null ? config.rlEpsilonMin : 0;
  if (eps < minv) eps = minv;
  state.rlEpsilon = eps;
}

function pickExploreOrder(ranked) {
  if (ranked == null || ranked.length == 0) return ranked;
  var eps = getEpsilon();
  if (eps <= 0) return ranked;
  if (Math.random() >= eps) return ranked;
  var idx = Math.floor(Math.random() * ranked.length);
  var order = [];
  order.push(ranked[idx]);
  for (var i = 0; i < ranked.length; i++) {
    if (i == idx) continue;
    order.push(ranked[i]);
  }
  return order;
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
  var headless = isHeadless();
  if (player == null && !headless) {
    if (config.aiDebugHud) state.lastPlaceFail = "no-player";
    warnBuildFail("Aguardando jogador local...");
    return false;
  }
  if (!consumeCoreItems(block, team)) {
    if (config.aiDebugHud) state.lastPlaceFail = "no-items:" + block.name;
    warnBuildFail("Sem recursos: " + block.localizedName);
    return false;
  }
  if (player != null) {
    Call.constructFinish(player, block, x, y, rotation || 0, team, false);
  } else {
    try {
      if (tile.setNet != null) {
        tile.setNet(block, team, rotation || 0);
      } else {
        tile.setBlock(block, team, rotation || 0);
      }
    } catch (e) {
      if (config.aiDebugHud) state.lastPlaceFail = "place-fail:" + block.name;
      return false;
    }
  }
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
  var conv = pickConveyorBlock(team);
  if (conv == null) conv = Blocks.conveyor;
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
    placeBlock(conv, x, y, rot, team);
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
  var conduit = pickConduitBlock(team);
  if (conduit == null) conduit = Blocks.conduit;
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
    placeBlock(conduit, x, y, rot, team);
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
      var drop = null;
      try {
        drop = tile.drop();
      } catch (e) {
        drop = null;
      }
      if (drop != null) {
        var dist2 = dx * dx + dy * dy;
        found.push({ x: tile.x, y: tile.y, dist2: dist2, item: drop, itemName: drop.name });
      }
    }
  }
  found.sort(function(a, b){ return a.dist2 - b.dist2; });
  if (maxCount != null && maxCount >= 0 && found.length > maxCount) found.length = maxCount;
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
  var nodeBlock = pickPowerNodeBlock(team);
  if (nodeBlock == null) return false;
  var nodePlaced = placeBlock(nodeBlock, node.x, node.y, 0, team);

  var panels = [
    { dx: -1, dy: 0 },
    { dx: 0, dy: 0 },
    { dx: -1, dy: 1 },
    { dx: 0, dy: 1 }
  ];
  var panelBlock = pickSolarBlock(team);
  if (panelBlock != null) {
  for (var i = 0; i < panels.length; i++) {
    var p = clampToBounds(node.x + panels[i].dx, node.y + panels[i].dy);
    placeBlock(panelBlock, p.x, p.y, 0, team);
  }
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
  var drill = pickDrillBlock(team);
  for (var i = 0; i < ores.length; i++) {
    if (drill != null && placeBlock(drill, ores[i].x, ores[i].y, 0, team)) {
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
  var turret = pickTurretBlock(team);
  for (var d = 0; d < defenseOffsets.length; d++) {
    var off = clampOffset(cx, cy, defenseOffsets[d].dx, defenseOffsets[d].dy);
    if (turret != null && placeBlock(turret, off.x, off.y, 0, team)) {
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

function countEnemyTurretsNearCore(team, enemyCore, radiusTiles) {
  if (enemyCore == null || enemyCore.tile == null) return 0;
  var cx = enemyCore.tile.x;
  var cy = enemyCore.tile.y;
  var radius = radiusTiles != null ? radiusTiles : config.attackDefenseRadius;
  var maxDist2 = radius * radius;
  var count = 0;
  Groups.build.each(function(b){
    if (b == null || b.team == null || b.team == team || b.block == null || b.tile == null) return;
    if (b.block.group != BlockGroup.turrets) return;
    var dx = b.tile.x - cx;
    var dy = b.tile.y - cy;
    if ((dx * dx + dy * dy) > maxDist2) return;
    count++;
  });
  return count;
}

function attackForceScore(buckets) {
  if (buckets == null) return 0;
  return buckets.ground.size + buckets.air.size * 1.25 + buckets.support.size * 0.75;
}

function attackThreatScore(enemies, enemyTurrets) {
  var turretThreat = config.attackTurretThreat != null ? config.attackTurretThreat : 3.0;
  return enemies + enemyTurrets * turretThreat;
}

function countFriendlyUnitsNearPoint(team, pos, radiusTiles) {
  if (team == null || pos == null) return 0;
  var radius = tilesToWorld(radiusTiles != null ? radiusTiles : config.attackRallyRadius);
  var maxDist2 = radius * radius;
  var playerId = -1;
  if (shouldExcludePlayerUnit()) {
    var player = getLocalPlayer();
    if (player != null && player.unit() != null) playerId = player.unit().id;
  }
  var count = 0;
  Groups.unit.each(function(u){
    if (u == null || u.team != team) return;
    if (playerId != -1 && u.id == playerId) return;
    var dx = u.x - pos.x;
    var dy = u.y - pos.y;
    if ((dx * dx + dy * dy) > maxDist2) return;
    count++;
  });
  return count;
}

function assessAttackOpportunity(core, enemyCore, team, buckets, enemies) {
  if (core == null || core.items == null || enemyCore == null) {
    return {
      allowed: false,
      reason: "missing-core",
      friendlyForce: 0,
      enemyThreat: 0,
      enemyTurrets: 0
    };
  }

  var copper = availableCoreItems(core, Items.copper);
  var lead = availableCoreItems(core, Items.lead);
  var friendlyForce = attackForceScore(buckets);
  var enemyTurrets = countEnemyTurretsNearCore(team, enemyCore, config.attackDefenseRadius);
  var enemyThreat = attackThreatScore(enemies, enemyTurrets);
  var resourceOk = copper >= config.attackMinCopper && lead >= config.attackMinLead;
  var forceOk = friendlyForce >= config.attackMinForce && friendlyForce >= enemyThreat * config.attackAdvantageRatio;
  var defenseOk = enemyTurrets <= config.attackMaxEnemyTurrets || friendlyForce >= enemyThreat * config.attackOverwhelmRatio;
  var allowed = resourceOk && forceOk && defenseOk;
  var reason = "ready";
  if (!resourceOk) reason = "low-resources";
  else if (!forceOk) reason = "low-advantage";
  else if (!defenseOk) reason = "heavy-defense";

  return {
    allowed: allowed,
    reason: reason,
    resourceOk: resourceOk,
    forceOk: forceOk,
    defenseOk: defenseOk,
    friendlyForce: friendlyForce,
    enemyThreat: enemyThreat,
    enemyTurrets: enemyTurrets
  };
}

function evaluateAttackPlan(core, enemyCore, team, buckets, enemies) {
  var attack = assessAttackOpportunity(core, enemyCore, team, buckets, enemies);
  attack.rallyPoint = null;
  attack.rallyUnits = 0;
  attack.rallyNeed = 0;
  attack.shouldRally = false;
  attack.canCommit = false;
  if (!attack.allowed || enemyCore == null) return attack;

  var rallyPoint = getRallyPoint(core, enemyCore, config.rallyDistance);
  var waveUnits = buckets.ground.size + buckets.air.size + Math.min(buckets.support.size, config.waveSupportMax);
  var rallyNeed = Math.max(1, Math.min(config.attackRallyMinUnits, waveUnits));
  var rallyUnits = countFriendlyUnitsNearPoint(team, rallyPoint, config.attackRallyRadius);
  var hasFreshRally = state.lastRallyTick > state.lastWaveTick;
  var grouped = rallyUnits >= rallyNeed;

  attack.rallyPoint = rallyPoint;
  attack.rallyUnits = rallyUnits;
  attack.rallyNeed = rallyNeed;
  attack.shouldRally = !hasFreshRally || !grouped;
  attack.canCommit = hasFreshRally && grouped;
  if (!attack.canCommit && attack.reason == "ready") attack.reason = hasFreshRally ? "regrouping" : "needs-rally";
  return attack;
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
  if (shouldExcludePlayerUnit()) {
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

function countBlocksByPredicate(team, predicate) {
  if (team == null) return 0;
  var count = 0;
  Groups.build.each(function(b){
    if (b == null || b.team != team || b.block == null) return;
    var ok = false;
    try {
      ok = predicate(b);
    } catch (e) {
      ok = false;
    }
    if (ok) count++;
  });
  return count;
}

function countBlocksByGroup(team, group) {
  return countBlocksByPredicate(team, function(b){
    return b.block.group == group;
  });
}

function isIndustryBlock(block) {
  if (block == null) return false;
  try {
    if (block.group == BlockGroup.units) return true;
  } catch (e) {
    // ignore
  }
  var name = "";
  try {
    name = String(block.name || "");
  } catch (e2) {
    name = "";
  }
  return name.indexOf("factory") >= 0 ||
    name.indexOf("reconstructor") >= 0 ||
    name.indexOf("assembler") >= 0 ||
    name.indexOf("kiln") >= 0 ||
    name.indexOf("press") >= 0 ||
    name.indexOf("smelter") >= 0 ||
    name.indexOf("mixer") >= 0 ||
    name.indexOf("separator") >= 0 ||
    name.indexOf("disassembler") >= 0 ||
    name.indexOf("pulverizer") >= 0 ||
    name.indexOf("centrifuge") >= 0 ||
    name.indexOf("crucible") >= 0;
}

function countIndustryBlocks(team) {
  return countBlocksByPredicate(team, function(b){
    return isIndustryBlock(b.block);
  });
}

function countPowerNodes(team) {
  return countBlocksByPredicate(team, function(b){
    return isInstance(b.block, PowerNodeBlock);
  });
}

function countPumps(team) {
  return countBlocksByPredicate(team, function(b){
    return isInstance(b.block, PumpBlock);
  });
}

function countThermals(team) {
  return countBlocksByPredicate(team, function(b){
    return isInstance(b.block, ThermalGeneratorBlock);
  });
}

function countLiquidHubs(team) {
  return countBlocksByPredicate(team, function(b){
    var list = config.blockPrefs != null ? config.blockPrefs.liquidHubs : null;
    return isPreferredBlock(b.block, list) || isLiquidHubBlock(b.block);
  });
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
  if (shouldExcludePlayerUnit()) {
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
  if (ids == null || ids.size == 0) return;
  var player = getLocalPlayer();
  if (player != null) {
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
    return;
  }

  if (!isHeadless()) return;

  for (var i = 0; i < ids.size; i++) {
    var id = ids.get(i);
    var unit = null;
    try {
      unit = Groups.unit.getByID(id);
    } catch (e3) {
      unit = null;
    }
    if (unit == null || unit.team != team) continue;
    var controller = null;
    try {
      controller = unit.controller();
    } catch (e4) {
      controller = null;
    }
    if (!(controller instanceof CommandAI)) {
      try {
        unit.controller(new CommandAI());
      } catch (e5) {
        continue;
      }
      try {
        controller = unit.controller();
      } catch (e6) {
        controller = null;
      }
    }
    if (controller == null) continue;
    try {
      controller.command(UnitCommand.moveCommand);
    } catch (e7) {
      // ignore
    }
    if (buildTarget != null) {
      try {
        controller.commandTarget(buildTarget);
      } catch (e8) {
        // ignore
      }
    } else if (pos != null) {
      try {
        controller.commandPosition(pos);
      } catch (e9) {
        // ignore
      }
    }
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

function ensureLogicLinks(build, core, team) {
  if (!config.logicTurretControl) return;
  if (build == null || core == null) return;
  var maxLinks = config.logicTurretMaxLinks != null ? config.logicTurretMaxLinks : 0;
  if (maxLinks <= 0) return;
  var radius = config.logicTurretSearchRadius != null ? config.logicTurretSearchRadius : config.logicControlRadius;
  if (radius <= 0) return;
  var cx = build.tile != null ? build.tile.x : core.tile.x;
  var cy = build.tile != null ? build.tile.y : core.tile.y;
  var maxDist2 = radius * radius;

  var turrets = [];
  Groups.build.each(function(b){
    if (b == null || b.team != team || b.block == null) return;
    if (b.block.group != BlockGroup.turrets) return;
    var dx = b.tile.x - cx;
    var dy = b.tile.y - cy;
    var dist2 = dx * dx + dy * dy;
    if (dist2 > maxDist2) return;
    turrets.push({ build: b, dist2: dist2 });
  });
  if (turrets.length == 0) return;
  turrets.sort(function(a, b){ return a.dist2 - b.dist2; });

  var desired = {};
  var desiredList = [];
  for (var i = 0; i < turrets.length && desiredList.length < maxLinks; i++) {
    var tb = turrets[i].build;
    if (tb == null || tb.tile == null) continue;
    var key = tb.tile.x + "," + tb.tile.y;
    if (desired[key]) continue;
    desired[key] = true;
    desiredList.push(tb);
  }

  var linked = {};
  var links = null;
  try {
    links = build.links;
  } catch (e) {
    links = null;
  }
  if (links != null) {
    try {
      for (var li = 0; li < links.size; li++) {
        var link = links.get(li);
        if (link == null) continue;
        var lk = link.x + "," + link.y;
        linked[lk] = true;
      }
    } catch (e2) {
      // ignore
    }
  }

  for (var d = 0; d < desiredList.length; d++) {
    var db = desiredList[d];
    if (db == null || db.tile == null) continue;
    var key2 = db.tile.x + "," + db.tile.y;
    if (linked[key2]) continue;
    try {
      build.configure(db.tile.pos());
      linked[key2] = true;
    } catch (e3) {
      // ignore
    }
  }

  if (links != null) {
    try {
      for (var li2 = 0; li2 < links.size; li2++) {
        var link2 = links.get(li2);
        if (link2 == null) continue;
        var key3 = link2.x + "," + link2.y;
        if (desired[key3]) continue;
        var tile2 = tileAt(link2.x, link2.y);
        if (tile2 == null || tile2.build == null || tile2.build.block == null) continue;
        if (tile2.build.block.group != BlockGroup.turrets) continue;
        try {
          build.configure(tile2.pos());
        } catch (e4) {
          // ignore
        }
      }
    } catch (e5) {
      // ignore
    }
  }
}

function buildLogicProgram(unitType, rallyX, rallyY, turretLinks) {
  if (unitType == null) return null;
  var uname = unitType.name != null ? unitType.name : String(unitType);
  var lines = [];
  var labels = {};
  var add = function(text, label){
    if (label != null) labels[label] = lines.length;
    lines.push(text);
  };
  var useTurrets = config.logicTurretControl && turretLinks != null && turretLinks > 0;
  var turretSort = config.logicTurretRadarSort != null ? config.logicTurretRadarSort : "distance";
  var turretExtra = config.logicTurretExtraScan === true;
  var turretSortAlt = config.logicTurretRadarSortAlt != null ? config.logicTurretRadarSortAlt : turretSort;

  add("set rallyX " + Math.round(rallyX));
  add("set rallyY " + Math.round(rallyY));

  if (useTurrets) {
    for (var i = 0; i < turretLinks; i++) {
      add("getlink lt " + i, i == 0 ? "MAIN" : null);
      add("jump {{TURT_DONE_" + i + "}} equal lt null");
      add("radar enemy any any " + turretSort + " lt 1 ttarget");
      if (turretExtra) {
        add("jump {{TURT_SCAN2_" + i + "}} equal ttarget null");
        add("control shootp lt ttarget 1");
        add("jump {{TURT_DONE_" + i + "}} always");
        add("radar enemy any any " + turretSortAlt + " lt 1 ttarget", "TURT_SCAN2_" + i);
        add("jump {{TURT_DONE_" + i + "}} equal ttarget null");
        add("control shootp lt ttarget 1");
        add("jump {{TURT_DONE_" + i + "}} always");
        add("set ttarget null", "TURT_DONE_" + i);
      } else {
        add("jump {{TURT_DONE_" + i + "}} equal ttarget null");
        add("control shootp lt ttarget 1");
        add("set ttarget null", "TURT_DONE_" + i);
      }
    }
  }

  add("ubind @" + uname, useTurrets ? null : "MAIN");
  add("jump {{MAIN}} equal @unit null");
  add("uradar enemy any any distance 1 target");
  add("jump {{RALLY}} equal target null");
  add("sensor tx target @x");
  add("sensor ty target @y");
  add("ucontrol approach tx ty " + config.logicAttackRadius);
  add("ucontrol target tx ty 1");
  add("jump {{MAIN}} always");
  add("ucontrol move rallyX rallyY", "RALLY");
  add("jump {{MAIN}} always");

  var keys = [];
  for (var lk in labels) {
    if (labels.hasOwnProperty(lk)) keys.push(lk);
  }
  for (var i2 = 0; i2 < lines.length; i2++) {
    var line = lines[i2];
    for (var k = 0; k < keys.length; k++) {
      var token = "{{" + keys[k] + "}}";
      if (line.indexOf(token) >= 0) {
        line = line.split(token).join(labels[keys[k]]);
      }
    }
    lines[i2] = line;
  }

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
  ensureLogicLinks(build, core, build.team);
  var turretLinks = config.logicTurretControl ? (config.logicTurretMaxLinks || 0) : 0;
  var code = buildLogicProgram(unitType, rallyX, rallyY, turretLinks);
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
  var baseX = core.tile.x;
  var baseY = core.tile.y;
  var dx = enemyCore.tile.x - baseX;
  var dy = enemyCore.tile.y - baseY;
  var len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  var rx = Math.round(baseX + (dx / len) * dist);
  var ry = Math.round(baseY + (dy / len) * dist);
  var clamped = clampToBounds(rx, ry);
  var world = tileCenterToWorld(clamped.x, clamped.y);
  return new Vec2(world.x, world.y);
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
  var plan = computeMiningPlan(core, getTeam());
  return plan != null ? plan.ore : null;
}

function findLiquidHub(team) {
  var found = null;
  Groups.build.each(function(b){
    if (b == null || b.team != team) return;
    var list = config.blockPrefs != null ? config.blockPrefs.liquidHubs : null;
    if (isPreferredBlock(b.block, list) || isLiquidHubBlock(b.block)) {
      found = b;
    }
  });
  return found;
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

function findHeatSpot(core, team, thermalBlock) {
  var cx = core.tile.x;
  var cy = core.tile.y;
  var thermal = thermalBlock != null ? thermalBlock : pickThermalBlock(team);
  if (thermal == null) return null;
  return findPlaceForBlock(thermal, cx, cy, config.thermalSearchRadius, team);
}

function actionMine(core, plan) {
  var team = getTeam();
  var drill = pickDrillBlock(team);
  if (drill == null) return false;
  if (!coreHasItemsFor(drill, team)) return false;
  var miningPlan = plan != null ? plan : computeMiningPlan(core, team);
  if (miningPlan == null || miningPlan.ore == null) return false;
  var ore = miningPlan.ore;
  if (!placeBlock(drill, ore.x, ore.y, 0, team)) return false;
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
  var pumpBlock = pickPumpBlock(team);
  if (pumpBlock == null) return false;
  if (!coreHasItemsFor(pumpBlock, team)) return false;
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
    if (hubBlock == null) return false;
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
    if (placeBlock(pumpBlock, liquids[i].x, liquids[i].y, 0, team)) {
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

  var nodeBlock = pickPowerNodeBlock(team);
  var node = clampToBounds(pump.x + 1, pump.y);
  placeBlock(nodeBlock, node.x, node.y, 0, team);
  return true;
}

function actionDefend(core) {
  var team = getTeam();
  if (state.turretCount >= config.maxTurrets) return false;
  var turret = pickTurretBlock(team);
  if (turret == null) return false;
  if (!coreHasItemsFor(turret, team)) return false;
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
    if (placeBlock(turret, off.x, off.y, 0, team)) {
      state.turretCount++;
      return true;
    }
  }
  return false;
}

function actionPower(core) {
  if (state.powerClusters >= config.maxPowerClusters) return false;
  var nodeBlock = pickPowerNodeBlock(getTeam());
  if (nodeBlock == null) return false;
  if (!coreHasItemsFor(nodeBlock, getTeam())) return false;
  return placePowerCluster(getTeam(), core.tile.x + 4, core.tile.y + 2);
}

function actionThermal(core) {
  if (state.thermalCount >= config.maxThermals) return false;
  var team = getTeam();
  var thermal = pickThermalBlock(team);
  if (thermal == null) return false;
  if (!coreHasItemsFor(thermal, team)) return false;
  var spot = findHeatSpot(core, team, thermal);
  if (spot == null) return false;
  if (!placeBlock(thermal, spot.x, spot.y, 0, team)) return false;
  state.thermalCount++;
  return true;
}

function actionRally(core, enemyCore) {
  var team = getTeam();
  var buckets = collectUnitBuckets(team);
  var rally = getRallyPoint(core, enemyCore, config.rallyDistance);
  var rallyIds = collectRallyIds(buckets);
  if (rallyIds.size <= 0) return false;
  commandUnitIds(team, rallyIds, null, rally);
  state.lastRallyTick = state.tick;
  return true;
}

function actionAttackWave(core, enemyCore) {
  var team = getTeam();
  var buckets = collectUnitBuckets(team);
  var attackPlan = evaluateAttackPlan(core, enemyCore, team, buckets, countEnemyUnits(team));
  var canWave = waveReady(buckets);
  var cooled = (state.tick - state.lastWaveTick) >= config.waveCooldown;
  if (!(canWave && cooled && attackPlan.canCommit)) return false;
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

function policyReadyActions(actions) {
  var ready = [];
  for (var i = 0; i < actions.length; i++) {
    var a = actions[i];
    if (!actionReady(a.name)) continue;
    var score = a.score - recentPenalty(a.name);
    if (score <= -999998) continue;
    ready.push({ name: a.name, score: score, run: a.run });
  }
  return ready;
}

Events.on(WorldLoadEvent, function(){
  state.built = false;
  state.lastMode = "";
  state.tick = 0;
  state.lastWaveTick = -9999;
  state.lastRallyTick = -9999;
  state.waveIndex = 0;
  state.drillCount = 0;
  state.turretCount = 0;
  state.powerClusters = 0;
  state.pumpCount = 0;
  state.liquidHubCount = 0;
  state.thermalCount = 0;
  state.industryBlocks = 0;
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
  state.currentStrategy = "balanced";
  state.lastStrategyTick = -9999;
  state.playerControlledUnitId = -1;
  state.playerControllerSet = false;
  state.controllerResetPenalty = 0;
  state.nnModel = null;
  state.nnLastLoadTick = -9999;
  state.nnLastSaveTick = -9999;
  state.nnLastErrorTick = -9999;
  state.rlEpsilon = config.rlEpsilon != null ? config.rlEpsilon : -1;
  state.lastRLState = null;
  state.gameOverEventSent = false;
  state.logicControllers = { ground: null, air: null, naval: null };
  rlSocketClose();
  rlSocket.queue = [];
  rlQMeta = emptyRLMeta();
  rlSchemaLastLoadTick = -9999;
  rlSchemaLastErrorTick = -9999;
  rlQTable = null;
  rlQTableLastLoadTick = -9999;
  rlQTableLastErrorTick = -9999;
  applyMobileSafeMode();
  aiHud.table = null;
  aiHud.button = null;
  aiHud.debugLabel = null;
  aiHud.useIcon = false;
  ensureHudButton();
  loadRLSchema(true);
  if (config.rlPolicyMode == "qtable" || config.rlPolicyMode == "hybrid") loadQTable();
  if (config.rlPolicyMode == "nn") loadNNModel();
  Log.info("[IA] Mundo carregado. Preparando plano de base.");
});

Events.on(GameOverEvent, function(e){
  if (!config.rlEmitGameOverEvent || state.gameOverEventSent) return;
  state.gameOverEventSent = true;

  var team = getTeam();
  if (team == null && Vars.state != null && Vars.state.rules != null) team = Vars.state.rules.defaultTeam;
  var winner = e != null ? e.winner : null;
  var core = getCore(team);
  var enemyCore = findEnemyCore(team);
  var enemies = countEnemyUnits(team);
  var terminalState = snapshotState(core, enemyCore, enemies, team);
  var prevState = state.lastRLState != null ? state.lastRLState : terminalState;
  var terminalInfo = {
    ok: true,
    terminal: true,
    reason: "gameOver",
    winner: safeTeamName(winner)
  };
  terminalInfo.reward = computeReward(prevState, "noop", terminalState, terminalInfo);
  emitTransition(prevState, "noop", terminalState, terminalInfo);
  state.lastRLState = terminalState;

  emitSocketEvent("gameOver", {
    winner: safeTeamName(winner),
    team: safeTeamName(team),
    won: team != null && winner != null && team == winner ? 1 : 0,
    lost: team != null && winner != null && team != winner ? 1 : 0
  });
  rlSocketClose();
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
  state.drillCount = countBlocksByGroup(team2, BlockGroup.drills);
  state.turretCount = countBlocksByGroup(team2, BlockGroup.turrets);
  state.powerClusters = countPowerNodes(team2);
  state.pumpCount = countPumps(team2);
  state.liquidHubCount = countLiquidHubs(team2);
  state.thermalCount = countThermals(team2);
  state.industryBlocks = countIndustryBlocks(team2);

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
  var buckets = collectUnitBuckets(team);
  var attackPlan = evaluateAttackPlan(core, enemyCore, team, buckets, enemies);
  var wantsAttack = enemyCore != null && attackPlan.allowed;
  var drillBlock = pickDrillBlock(team);
  var turretBlock = pickTurretBlock(team);
  var powerNodeBlock = pickPowerNodeBlock(team);
  var thermalBlock = pickThermalBlock(team);
  var pumpBlock = pickPumpBlock(team);
  var canDrill = drillBlock != null && coreHasItemsFor(drillBlock, team);
  var canDuo = turretBlock != null && coreHasItemsFor(turretBlock, team);
  var canPowerNode = powerNodeBlock != null && coreHasItemsFor(powerNodeBlock, team);
  var canThermal = thermalBlock != null && coreHasItemsFor(thermalBlock, team);
  var hubBlock = pickLiquidHubBlock(core);
  var canPump = pumpBlock != null && coreHasItemsFor(pumpBlock, team);
  var canLiquidHub = hubBlock != null && coreHasItemsFor(hubBlock, team);
  var canLiquid = canPump || findLiquidHub(team) != null || canLiquidHub;
  var miningPlan = computeMiningPlan(core, team);
  var powerStats = computePowerStatus(team);
  var powerNeedScore =
    powerStats.count == 0 ? 40 :
    (powerStats.avg < 0.4 || powerStats.min < 0.25) ? 45 :
    powerStats.avg < 0.7 ? 25 :
    powerStats.avg < 0.85 ? 10 : 0;

  var beforeState = snapshotState(core, enemyCore, enemies, team);
  var reserveP = reservePressure(core);
  var reservePenalty = 1;
  var reserveBoost = 1;
  if (reserveP > 0) {
    var pen = config.resourceReservePenalty != null ? config.resourceReservePenalty : 0;
    if (pen < 0) pen = 0;
    if (pen > 1) pen = 1;
    reservePenalty = 1 - (reserveP * pen);
    if (reservePenalty < 0) reservePenalty = 0;
    var boost = config.resourceReserveBoost != null ? config.resourceReserveBoost : 0;
    if (boost < 0) boost = 0;
    reserveBoost = 1 + (reserveP * boost);
  }
  var prevStrategy = state.currentStrategy;
  var strategy = pickStrategy(core, enemyCore, enemies, powerStats, beforeState);
  if (strategy != null && prevStrategy != null && strategy != prevStrategy) {
    Log.info("[IA] Estrategia: " + strategy);
  }

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
    mine: function(){ return actionMine(core, miningPlan); },
    defend: runCore(actionDefend),
    power: runCore(actionPower),
    noop: function(){ return true; }
  };

  var actions = [];
  var applyStrategyNow = !(config.strategyAffectsRL && config.rlPolicyMode != "heuristic");
  var addAction = function(name, score, run){
    var s = applyStrategyNow ? applyStrategyScore(name, score, strategy) : score;
    actions.push({ name: name, baseScore: s, score: s, run: run });
  };
  var thermalScore = (state.thermalCount < config.maxThermals && canThermal ? (powerNeedScore + 35) : 0);
  thermalScore *= reservePenalty;
  addAction("thermal", thermalScore, runCore(actionThermal));
  addAction("attackWave", attackPlan.canCommit ? 100 : 0, actionHandlers.attackWave);
  addAction("rally", attackPlan.shouldRally ? 120 : 0, actionHandlers.rally);
  var mineScore = (canDrill && miningPlan != null ? miningPlan.score : 0);
  mineScore *= reserveBoost;
  addAction("mine", mineScore, actionHandlers.mine);
  var defendScore = (canDuo ? (enemies > 0 ? 90 : 30) + (state.turretCount < config.maxTurrets ? 20 : 0) : 0);
  if (enemyCore != null && !wantsAttack && attackPlan.enemyTurrets >= config.attackMaxEnemyTurrets) defendScore += 20;
  defendScore *= reservePenalty;
  addAction("defend", defendScore, actionHandlers.defend);
  var powerScore = (canPowerNode && state.powerClusters < config.maxPowerClusters && availCopper > 200 && availLead > 150 ? 20 : 0) + powerNeedScore + (state.pumpCount > state.powerClusters ? 15 : 0);
  powerScore *= reservePenalty;
  addAction("power", powerScore, actionHandlers.power);
  var liquidScore = (canLiquid ? (state.pumpCount < config.maxPumps ? 45 : 0) + (state.liquidHubCount < config.maxLiquidHubs ? 15 : 0) : 0);
  liquidScore *= reservePenalty;
  addAction("liquid", liquidScore, runCore(actionLiquid));
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
          if (act2.baseScore <= 0 && act2.name != "noop") {
            act2.score = -999999;
            continue;
          }
          var nnv = nnScores[act2.name];
          if (nnv == null) {
            if (!config.rlNNFallbackHeuristic) act2.score = -999999;
            continue;
          }
          act2.score = nnv;
          if (act2.name == "mine" && shouldProtectEconomicMineScore(miningPlan)) {
            var floor = config.rlNNEconomicGuardFloor != null ? config.rlNNEconomicGuardFloor : 1.0;
            if (floor < 0) floor = 0;
            var minScore = act2.baseScore * floor;
            if (act2.score < minScore) act2.score = minScore;
          }
        }
      }
    }
  }

  if (config.strategyAffectsRL && config.rlPolicyMode != "heuristic") {
    for (var sa = 0; sa < actions.length; sa++) {
      var actS = actions[sa];
      actS.score = applyStrategyScore(actS.name, actS.score, strategy);
    }
  }

  var ranked = rankActions(actions);
  var policyActions = nnUsesPolicySampling() ? policyReadyActions(actions) : null;
  var pickedList = nnUsesPolicySampling() ? pickPolicyOrder(policyActions) : pickExploreOrder(ranked);
  if ((pickedList == null || pickedList.length == 0) && ranked != null && ranked.length > 0) pickedList = ranked;
  var pickedName = "noop";
  state.lastAction = "none";
  state.lastActionOk = false;
  for (var r = 0; r < pickedList.length; r++) {
    var picked = pickedList[r];
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
  decayEpsilon();
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
  state.lastRLState = afterState;
}



Events.run(Trigger.update, function(){
  state.tick++;

  ensureHudButton();
  ensurePlayerControlled();

  if (!state.aiEnabled) return;
  if (Vars.state != null && Vars.state.gameOver) return;

  var headless = isHeadless();
  var localPlayer = getLocalPlayer();
  var team = localPlayer != null ? localPlayer.team() : Vars.state.rules.defaultTeam;
  var core = getCore(team);
  if (core == null || (!headless && localPlayer == null)) {
    if (headless) warnBuildFail("Aguardando core...");
    else warnBuildFail("Aguardando player/core...");
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
