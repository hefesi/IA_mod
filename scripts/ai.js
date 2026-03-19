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
var BuildVisibility = Packages.mindustry.world.meta.BuildVisibility;
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
  attackMaxEconomicPressure: 0.7,
  attackMinEconomyStage: 3,
  oreSearchRadius: 12,
  maxDrills: 5,
  priorityOreSearchRadius: 20,
  priorityDrillCap: 8,
  maxTargetedDrillsPerItem: 2,
  strategicDrillOverflow: 2,
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
  rlSocketEnabled: false,
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
  rlNNHeuristicAssist: true,
  rlMicroPolicyEnabled: true,
  rlMicroPolicyDir: "micro_policies",
  rlMicroPolicyFilePattern: "micro_{action}.json",
  rlMicroPolicyReloadTicks: 0,
  rlMicroPolicyBootstrapMissing: false,
  rlMicroLogCandidates: true,
  rlPolicySample: true,
  rlPolicyTemperature: 1.0,
  rlNNSaveInterval: 0,
  rlNNSaveExternal: false,
  rlNNAlpha: 0.01,
  rlNNGamma: 0.9,
  rlAdaptiveBlend: true,
  rlAdaptiveBlendMin: 0.25,
  rlAdaptiveBlendMax: 0.85,
  rlAdaptiveBlendPressureWeight: 0.55,
  rlAdaptiveBlendStageWeight: 0.45,
  aiDirectiveDurationTicks: 3600,
  rlEpsilonEnabled: true,
  rlEpsilon: 0.08,
  rlEpsilonMin: 0.02,
  rlEpsilonDecay: 0.999,
  rlEpsilonOnlyWhenRL: true,
  rlNoopRescueStreak: 8,
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
  rlRewardCoal: 0.01,
  rlRewardSand: 0.01,
  rlRewardGraphite: 0.03,
  rlRewardSilicon: 0.04,
  rlRewardTitanium: 0.03,
  rlRewardPlastanium: 0.06,
  rlRewardIndustryFactory: 6,
  rlRewardEconomyStage: 12,
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
  // When true, enabling the AI allows it to take over the local player's unit.
  // Mantido true para permitir construção inicial usando recursos/start flow do player.
  aiControlPlayerUnit: true,
  // When true, the AI only observes/commands other units and keeps the player's unit under manual control.
  observerMode: false,
  // Penalty applied (negative) when the AI reassigns controller (resets player control).
  controllerResetPenalty: -1,
  resourceReserve: {
    "copper": 120,
    "lead": 100,
    "graphite": 40,
    "metaglass": 40,
    "silicon": 40,
    "plastanium": 25,
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
  mineRoadmapDemandWeight: 10,
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
    thermals: ["thermal-generator"],
    industry: {
      graphite: ["graphite-press"],
      silicon: ["silicon-smelter"],
      plastanium: ["plastanium-compressor"]
    }
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
      industry: 1.0,
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
      industry: 1.0,
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
      industry: 1.0,
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
      industry: 1.4,
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
  mobileCoreTapSingleToggle: true,
  mobileTapToggleCooldown: 45,
  safeModeLogInterval: 600,
  contentScanInterval: 900,
  factoryConfigInterval: 600,
  industrySearchRadius: 12,
  maxFactoryBlocks: 4,
  preferredGroundUnit: "dagger",
  preferredAirUnit: "mono",
  preferredNavalUnit: "risso",
  logicEnabled: false,
  logicBuildInterval: 600,
  logicSearchRadius: 8,
  logicControlRadius: 12,
  logicMaxProcessors: 3,
  logicTurretControl: false,
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

var industryBlueprints = {
  graphite: {
    name: "graphite",
    output: "graphite",
    blocks: ["graphite-press"],
    maxFactories: 2,
    offset: { dx: 10, dy: 0 },
    inputs: [
      { name: "coal", coreOffset: { dx: 2, dy: 0 }, preferVertical: false }
    ],
    outputFeed: { factoryOffset: { dx: 0, dy: 2 }, preferVertical: true }
  },
  silicon: {
    name: "silicon",
    output: "silicon",
    blocks: ["silicon-smelter"],
    maxFactories: 2,
    offset: { dx: 0, dy: 10 },
    inputs: [
      { name: "coal", coreOffset: { dx: -2, dy: 1 }, preferVertical: false },
      { name: "sand", coreOffset: { dx: 2, dy: 1 }, preferVertical: false }
    ],
    outputFeed: { factoryOffset: { dx: 0, dy: -2 }, preferVertical: true }
  },
  plastanium: {
    name: "plastanium",
    output: "plastanium",
    blocks: ["plastanium-compressor"],
    maxFactories: 1,
    offset: { dx: -10, dy: 0 },
    inputs: [
      { name: "titanium", coreOffset: { dx: -2, dy: -1 }, preferVertical: false }
    ],
    outputFeed: { factoryOffset: { dx: 0, dy: -2 }, preferVertical: true },
    liquid: { name: "oil", preferVertical: false }
  }
};

var industryReserveIgnore = {
  copper: true,
  lead: true,
  coal: true,
  sand: true,
  titanium: true,
  graphite: true,
  silicon: true,
  plastanium: true
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
  factoryBlocks: 0,
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
  lastMicroAction: "",
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
  microPolicies: {},
  microLastLoadTicks: {},
  microLastErrorTicks: {},
  pendingMicroTransition: null,
  rlEpsilon: -1,
  lastRLState: null,
  gameOverEventSent: false,
  contentDemandTick: -9999,
  contentDemand: {},
  contentDemandSimple: {},
  contentDemandProfile: {},
  lastEconomicFocus: null,
  logicControllers: {
    ground: null,
    air: null,
    naval: null
  },
  lastMicroReward: 0,
  noopStreak: 0,
  commandBias: null,
  commandBiasUntilTick: -1
};

// --- RL logging helpers (offline training via logs) ---
var rlSocket = {
  sock: null,
  out: null,
  lastConnectTick: -9999,
  lastErrorTick: -9999,
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
    if ((state.tick - rlSocket.lastErrorTick) > 600) {
      Log.info("[RL] Socket connect error: " + e + " | para desativar logs remotos: rlSocketEnabled=false");
      rlSocket.lastErrorTick = state.tick;
    }
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
  var resourceProfile = collectCoreAbstractResources(core);
  var ammoProfile = computeAmmoProfile(core, enemies, team);
  var chainStatus = computeProductionChainStatus(core, team);
  var factoryProfile = computeFactoryCapacityProfile(team);
  var powerStats = computePowerStatus(team);
  var liquidPressure = clamp01((Math.max(0, config.maxPumps - state.pumpCount) + Math.max(0, config.maxLiquidHubs - state.liquidHubCount)) / Math.max(1, config.maxPumps + config.maxLiquidHubs));
  var desiredTurrets = Math.min(config.maxTurrets, enemies > 0 ? 4 : 2);
  var defensePressure = clamp01((enemies + Math.max(0, desiredTurrets - state.turretCount) * 2) / Math.max(1, config.maxTurrets * 3));

  var unitsGround = 0;
  var unitsAir = 0;
  var unitsSupport = 0;
  var industryFactories = 0;
  var economyStage = 0;
  if (team != null) {
    var buckets = collectUnitBuckets(team);
    unitsGround = buckets.ground.size;
    unitsAir = buckets.air.size;
    unitsSupport = buckets.support.size;
    var stageInfo = economyStageInfo(core, team, unitsGround + unitsAir + unitsSupport);
    if (stageInfo != null) {
      industryFactories = stageInfo.industryFactories;
      economyStage = stageInfo.stage;
    }
  }
  var unitsTotal = unitsGround + unitsAir + unitsSupport;

  var baseX = corePresent ? core.tile.x : 0;
  var baseY = corePresent ? core.tile.y : 0;
  var dx = enemyCore != null ? (enemyCore.x - baseX) : 0;
  var dy = enemyCore != null ? (enemyCore.y - baseY) : 0;
  var dist = enemyCore != null ? Math.round(Math.sqrt(dx * dx + dy * dy)) : -1;
  return {
    tick: state.tick,
    resourceTier1: resourceProfile.tier1,
    resourceTier2: resourceProfile.tier2,
    resourceTier3: resourceProfile.tier3,
    resourceTier4: resourceProfile.tier4,
    resourceTier5: resourceProfile.tier5,
    resourceBasic: resourceProfile.basic,
    resourceIndustrial: resourceProfile.industrial,
    resourceStrategic: resourceProfile.strategic,
    combatStock: resourceProfile.combat,
    ammoKinetic: ammoProfile.kineticStock,
    ammoExplosive: ammoProfile.explosiveStock,
    ammoEnergy: ammoProfile.energyStock,
    ammoPressureKinetic: ammoProfile.kineticPressure,
    ammoPressureExplosive: ammoProfile.explosivePressure,
    ammoPressureEnergy: ammoProfile.energyPressure,
    chainPressure: chainStatus.pressure,
    chainCoverage: chainStatus.coverage,
    factoryCapacity: factoryProfile.factoryCapacity,
    upgradeCapacity: factoryProfile.upgradeCapacity,
    factoryVariety: factoryProfile.factoryVariety,
    mobilityCapacity: factoryProfile.mobilityCapacity,
    supportCapacity: factoryProfile.supportCapacity,
    unitCapacity: factoryProfile.unitCapacity,
    defensePressure: Math.round(defensePressure * 100) / 100,
    powerPressure: Math.round((1 - clamp01(powerStats.avg)) * 100) / 100,
    liquidPressure: Math.round(liquidPressure * 100) / 100,
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
    industryBlocks: state.industryBlocks,
    factoryBlocks: state.factoryBlocks,
    industryFactories: industryFactories,
    economyStage: economyStage,
    economicPressure: Math.round(reservePressure(core) * 100) / 100
  };
}

function emitTransition(prevState, actionName, nextState, info) {
  var payload = { type: "transition", s: prevState, a: actionName, s2: nextState, info: info, t: state.tick };
  var line = JSON.stringify(payload);
  if (config.rlLogEnabled) Log.info("[RL]" + line);
  rlSocketSend(line);
}

function emitMicroTransition(prevState, policyName, decisionName, nextState, info) {
  var payload = {
    type: "micro",
    policy: policyName,
    a: decisionName,
    s: prevState,
    s2: nextState,
    info: info != null ? info : {},
    t: state.tick
  };
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
    " mr:" + Math.round(state.lastMicroReward * 100) / 100 +
    " tick:" + state.tick +
    " last:" + (state.lastAction == "" ? "-" : state.lastAction) +
    " micro:" + (state.lastMicroAction == "" ? "-" : state.lastMicroAction) +
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

function isUnitUsable(unit) {
  if (unit == null) return false;
  try {
    if (unit.dead != null && unit.dead) return false;
  } catch (e) {
    // ignore
  }
  try {
    if (unit.isValid != null && !unit.isValid()) return false;
  } catch (e2) {
    // ignore
  }
  try {
    if (unit.health != null && unit.health <= 0) return false;
  } catch (e3) {
    // ignore
  }
  return true;
}

function ensurePlayerControlled() {
  if (!config.aiControlPlayerUnit) return;
  var player = getLocalPlayer();
  if (player == null) return;
  var unit = null;
  try {
    unit = player.unit();
  } catch (e) {
    unit = null;
  }
  // Enquanto o player estiver sem unidade viva (spawn/morte), nao tenta reassumir controle.
  if (!isUnitUsable(unit)) {
    state.playerControllerMode = "player";
    state.playerControlledUnitId = -1;
    return;
  }
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

function liquidByName(name) {
  if (name == null) return null;
  try {
    var liquid = Liquids[name];
    if (liquid != null) return liquid;
  } catch (e) {
    // ignore
  }
  try {
    var seq = Vars.content.liquids();
    var found = null;
    seq.each(function(liq){
      if (found != null) return;
      try {
        if (liq != null && liq.name == name) found = liq;
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

function eachSeq(seq, fn) {
  if (seq == null || fn == null) return;
  try {
    if (seq.each != null) {
      seq.each(function(value){
        fn(value);
      });
      return;
    }
  } catch (e) {
    // ignore
  }
  try {
    var size = seq.size != null ? seq.size : seq.length;
    for (var i = 0; i < size; i++) {
      var value = seq.get != null ? seq.get(i) : seq[i];
      fn(value);
    }
  } catch (e2) {
    // ignore
  }
}

function readContentName(obj) {
  if (obj == null) return "";
  try {
    if (obj.name != null) return String(obj.name);
  } catch (e) {
    // ignore
  }
  try {
    return String(obj);
  } catch (e2) {
    return "";
  }
}

function seqSize(seq) {
  if (seq == null) return 0;
  try {
    if (seq.size != null) return seq.size;
  } catch (e) {
    // ignore
  }
  try {
    if (seq.length != null) return seq.length;
  } catch (e2) {
    // ignore
  }
  return 0;
}

function unitUnlocked(unit) {
  if (unit == null) return false;
  try {
    if (!config.campaignSafeMode) return true;
    if (unit.unlockedNow != null) return unit.unlockedNow();
  } catch (e) {
    // ignore
  }
  return true;
}

function requirementsTotal(reqs) {
  var total = 0;
  eachSeq(reqs, function(stack){
    if (stack == null) return;
    try {
      total += stack.amount != null ? stack.amount : 0;
    } catch (e) {
      // ignore
    }
  });
  return total;
}

function addDemand(map, item, amount) {
  if (map == null || item == null || amount == null || amount <= 0) return;
  var key = readContentName(item);
  if (key == "") return;
  if (map[key] == null) map[key] = 0;
  map[key] += amount;
}

function addRequirementsDemand(map, reqs, weight) {
  var mul = weight != null ? weight : 1;
  if (mul <= 0) return;
  eachSeq(reqs, function(stack){
    if (stack == null || stack.item == null) return;
    var amount = 0;
    try {
      amount = stack.amount != null ? stack.amount : 0;
    } catch (e) {
      amount = 0;
    }
    if (amount <= 0) amount = 1;
    addDemand(map, stack.item, amount * mul);
  });
}

function ensureDemandProfileEntry(map, item) {
  if (map == null || item == null) return null;
  var key = readContentName(item);
  if (key == "") return null;
  var entry = map[key];
  if (entry == null) {
    entry = {
      item: item,
      itemName: key,
      total: 0,
      blockDemand: 0,
      unitDemand: 0,
      chainDemand: 0,
      ammoDemand: 0,
      stock: 0,
      producersBuilt: 0,
      producersUnlocked: 0,
      tier: 1,
      category: "basic",
      scarcity: 0,
      criticality: 0
    };
    map[key] = entry;
  } else if (entry.item == null) {
    entry.item = item;
  }
  return entry;
}

function addDemandProfile(map, item, amount, source) {
  if (map == null || item == null || amount == null || amount <= 0) return null;
  var entry = ensureDemandProfileEntry(map, item);
  if (entry == null) return null;
  entry.total += amount;
  if (source == "block") entry.blockDemand += amount;
  else if (source == "unit") entry.unitDemand += amount;
  else if (source == "chain") entry.chainDemand += amount;
  else if (source == "ammo") entry.ammoDemand += amount;
  else entry.chainDemand += amount;
  return entry;
}

function addRequirementsDemandProfile(map, reqs, weight, source) {
  var mul = weight != null ? weight : 1;
  if (mul <= 0) return;
  eachSeq(reqs, function(stack){
    if (stack == null || stack.item == null) return;
    var amount = 0;
    try {
      amount = stack.amount != null ? stack.amount : 0;
    } catch (e) {
      amount = 0;
    }
    if (amount <= 0) amount = 1;
    addDemandProfile(map, stack.item, amount * mul, source);
  });
}

function demandProfileToSimpleMap(profile) {
  var out = {};
  if (profile == null) return out;
  for (var key in profile) {
    if (!profile.hasOwnProperty(key)) continue;
    var entry = profile[key];
    if (entry == null || !(entry.total > 0)) continue;
    out[key] = entry.total;
  }
  return out;
}

function readContentStat(obj, key) {
  if (obj == null || key == null) return 0;
  try {
    var value = obj[key];
    if (value == null) return 0;
    return typeof value === "number" ? value : Number(value);
  } catch (e) {
    return 0;
  }
}

function clampValue(v, min, max) {
  if (v == null || !(v >= min)) return min;
  if (v > max) return max;
  return v;
}

function itemTierFor(item) {
  if (item == null) return 1;
  var hardness = readContentStat(item, "hardness");
  var cost = readContentStat(item, "cost");
  var explosiveness = readContentStat(item, "explosiveness");
  var flammability = readContentStat(item, "flammability");
  var charge = readContentStat(item, "charge");
  var radioactivity = readContentStat(item, "radioactivity");
  var score = hardness * 1.4 + cost * 0.8 + explosiveness * 1.0 + flammability * 0.5 + charge * 2.2 + radioactivity * 2.6;
  var name = readContentName(item);
  if (name.indexOf("surge") >= 0 || name.indexOf("phase") >= 0 || name.indexOf("carbide") >= 0 || name.indexOf("fissile") >= 0) score += 2.5;
  else if (name.indexOf("thorium") >= 0 || name.indexOf("oxide") >= 0 || name.indexOf("plastanium") >= 0 || name.indexOf("blast") >= 0) score += 1.5;
  else if (name.indexOf("titanium") >= 0 || name.indexOf("silicon") >= 0 || name.indexOf("graphite") >= 0 || name.indexOf("metaglass") >= 0) score += 0.6;
  if (score >= 8) return 5;
  if (score >= 5.5) return 4;
  if (score >= 3.2) return 3;
  if (score >= 1.4) return 2;
  return 1;
}

function resourceCategoryForItem(item) {
  if (item == null) return "basic";
  var tier = itemTierFor(item);
  var charge = readContentStat(item, "charge");
  var radioactivity = readContentStat(item, "radioactivity");
  var explosiveness = readContentStat(item, "explosiveness");
  var flammability = readContentStat(item, "flammability");
  if (tier >= 4 || charge > 0.55 || radioactivity > 0.35) return "strategic";
  if (explosiveness > 0.4 || flammability > 0.45) return "combat";
  if (tier >= 2) return "industrial";
  return "basic";
}

function ammoFamilyForItem(item) {
  if (item == null) return "kinetic";
  var charge = readContentStat(item, "charge");
  var radioactivity = readContentStat(item, "radioactivity");
  var explosiveness = readContentStat(item, "explosiveness");
  var flammability = readContentStat(item, "flammability");
  if (charge > 0.45 || radioactivity > 0.3) return "energy";
  if (explosiveness > 0.4 || flammability > 0.45) return "explosive";
  return "kinetic";
}

function unitCapabilityScore(unit) {
  if (unit == null) return 0;
  return unitCombatValue(unit) * 1.0 + unitEconomicValue(unit) * 0.75 + unitSupportValue(unit) * 0.45;
}

function collectCoreAbstractResources(core) {
  var profile = {
    tier1: 0,
    tier2: 0,
    tier3: 0,
    tier4: 0,
    tier5: 0,
    basic: 0,
    industrial: 0,
    strategic: 0,
    combat: 0,
    ammoKinetic: 0,
    ammoExplosive: 0,
    ammoEnergy: 0
  };
  if (core == null || core.items == null) return profile;
  try {
    Vars.content.items().each(function(item){
      if (item == null) return;
      var total = 0;
      try {
        total = core.items.get(item);
      } catch (e) {
        total = 0;
      }
      if (!(total > 0)) return;
      var tier = itemTierFor(item);
      if (tier <= 1) profile.tier1 += total;
      else if (tier == 2) profile.tier2 += total;
      else if (tier == 3) profile.tier3 += total;
      else if (tier == 4) profile.tier4 += total;
      else profile.tier5 += total;
      var category = resourceCategoryForItem(item);
      if (category == "basic") profile.basic += total;
      else if (category == "industrial") profile.industrial += total;
      else if (category == "strategic") profile.strategic += total;
      else profile.combat += total;
      var ammoFamily = ammoFamilyForItem(item);
      if (ammoFamily == "explosive") profile.ammoExplosive += total;
      else if (ammoFamily == "energy") profile.ammoEnergy += total;
      else profile.ammoKinetic += total;
    });
  } catch (e2) {
    // ignore
  }
  return profile;
}

function blockOutputItems(block) {
  var out = [];
  if (block == null) return out;
  try {
    if (block.outputItem != null && block.outputItem.item != null) {
      out.push({ item: block.outputItem.item, amount: block.outputItem.amount != null ? block.outputItem.amount : 1 });
    }
  } catch (e) {
    // ignore
  }
  try {
    eachSeq(block.outputItems, function(stack){
      if (stack == null || stack.item == null) return;
      out.push({ item: stack.item, amount: stack.amount != null ? stack.amount : 1 });
    });
  } catch (e2) {
    // ignore
  }
  return out;
}

function blockProducesItem(block, item) {
  if (block == null || item == null) return false;
  var outputs = blockOutputItems(block);
  for (var i = 0; i < outputs.length; i++) {
    var stack = outputs[i];
    if (stack == null || stack.item == null) continue;
    if (stack.item == item) return true;
    if (stack.item.name != null && item.name != null && stack.item.name == item.name) return true;
  }
  return false;
}

function countProducerBlocks(team, item) {
  if (team == null || item == null) return 0;
  return countBlocksByPredicate(team, function(b){
    return blockProducesItem(b.block, item);
  });
}

function unlockedProducerCount(item) {
  if (item == null) return 0;
  var count = 0;
  try {
    Vars.content.blocks().each(function(block){
      if (block == null || !blockUnlocked(block) || !isIndustryBlock(block)) return;
      if (blockProducesItem(block, item)) count++;
    });
  } catch (e) {
    // ignore
  }
  return count;
}

function augmentDemandWithProductionChain(team, demand) {
  if (demand == null) return demand;
  var chain = {};
  for (var key in demand) {
    if (!demand.hasOwnProperty(key)) continue;
    var weight = demand[key];
    if (!(weight > 0)) continue;
    var item = itemByName(key);
    if (item == null) continue;
    try {
      Vars.content.blocks().each(function(block){
        if (block == null || !blockUnlocked(block) || !isIndustryBlock(block)) return;
        if (!blockProducesItem(block, item)) return;
        addRequirementsDemand(chain, block.requirements, Math.min(24, weight) * 0.18);
      });
    } catch (e) {
      // ignore
    }
  }
  for (var ckey in chain) {
    if (!chain.hasOwnProperty(ckey)) continue;
    if (demand[ckey] == null) demand[ckey] = 0;
    demand[ckey] += chain[ckey];
  }
  return demand;
}

function applyProductionChainDemand(profile, team) {
  if (profile == null) return profile;
  var chain = {};
  for (var key in profile) {
    if (!profile.hasOwnProperty(key)) continue;
    var entry = profile[key];
    var weight = entry != null ? entry.total : 0;
    if (!(weight > 0)) continue;
    var item = entry.item != null ? entry.item : itemByName(key);
    if (item == null) continue;
    try {
      Vars.content.blocks().each(function(block){
        if (block == null || !blockUnlocked(block) || !isIndustryBlock(block)) return;
        if (!blockProducesItem(block, item)) return;
        addRequirementsDemandProfile(chain, block.requirements, Math.min(24, weight) * 0.18, "chain");
      });
    } catch (e) {
      // ignore
    }
  }
  for (var ckey in chain) {
    if (!chain.hasOwnProperty(ckey)) continue;
    var centry = chain[ckey];
    if (centry == null) continue;
    var target = ensureDemandProfileEntry(profile, centry.item != null ? centry.item : itemByName(ckey));
    if (target == null) continue;
    target.total += centry.total;
    target.chainDemand += centry.chainDemand;
  }
  return profile;
}

function computeItemScarcity(entry) {
  if (entry == null) return 0;
  var reserve = Math.max(20, manualReserveFor(entry.item), entry.total * 2);
  var stock = entry.stock != null ? entry.stock : 0;
  var base = clamp01((reserve - stock) / Math.max(1, reserve));
  if (entry.producersBuilt <= 0) base += entry.producersUnlocked > 0 ? 0.18 : 0.32;
  else base -= Math.min(0.25, entry.producersBuilt * 0.08);
  return clamp01(base);
}

function computeItemCriticality(entry) {
  if (entry == null) return 0;
  var strategicBonus = entry.category == "strategic" ? 10 : 0;
  var noProducerBonus = entry.producersBuilt <= 0 ? 12 : 0;
  var tierBonus = entry.tier >= 4 ? 8 : 0;
  return Math.round((entry.total * 0.45 + entry.scarcity * 25 + noProducerBonus + strategicBonus + tierBonus) * 100) / 100;
}

function scanRawContentDemand(team) {
  var profile = {};
  try {
    Vars.content.blocks().each(function(block){
      if (block == null || !blockUnlocked(block)) return;
      var weight = blockDemandWeight(block);
      addRequirementsDemandProfile(profile, block.requirements, weight, "block");
      if (isFactoryBlock(block)) {
        var options = collectFactoryPlanOptions(block);
        for (var i = 0; i < options.length; i++) {
          var option = options[i];
          addRequirementsDemandProfile(profile, option.requirements, weight * 0.8, "unit");
        }
      }
      var outputs = blockOutputItems(block);
      for (var j = 0; j < outputs.length; j++) {
        var output = outputs[j];
        if (output == null || output.item == null) continue;
        var source = resourceCategoryForItem(output.item) == "combat" ? "ammo" : "chain";
        addDemandProfile(profile, output.item, Math.max(0.2, (output.amount != null ? output.amount : 1) * 0.35 * weight), source);
      }
    });
  } catch (e) {
    // ignore
  }
  return profile;
}

function finalizeDemandProfile(team, core, rawProfile) {
  var profile = rawProfile != null ? rawProfile : {};
  for (var key in profile) {
    if (!profile.hasOwnProperty(key)) continue;
    var entry = profile[key];
    if (entry == null) continue;
    var item = entry.item != null ? entry.item : itemByName(key);
    entry.item = item;
    entry.itemName = readContentName(item);
    entry.stock = 0;
    if (core != null && core.items != null && item != null) {
      try {
        entry.stock = core.items.get(item);
      } catch (e) {
        entry.stock = 0;
      }
    }
    entry.producersBuilt = countProducerBlocks(team, item);
    entry.producersUnlocked = unlockedProducerCount(item);
    entry.tier = itemTierFor(item);
    entry.category = resourceCategoryForItem(item);
    entry.scarcity = computeItemScarcity(entry);
    entry.criticality = computeItemCriticality(entry);
  }
  return profile;
}

function getDemandProfileEntry(team, core, item) {
  if (item == null) return null;
  var profile = getContentDemandProfile(team, core);
  if (profile == null) return null;
  var key = readContentName(item);
  if (key == "") return null;
  return profile[key] != null ? profile[key] : null;
}

function getContentDemandProfile(team, core) {
  var interval = config.contentScanInterval != null ? config.contentScanInterval : 600;
  if (state.contentDemandProfile == null || state.contentDemandSimple == null || (state.tick - state.contentDemandTick) >= interval) {
    var raw = scanRawContentDemand(team);
    applyProductionChainDemand(raw, team);
    var finalProfile = finalizeDemandProfile(team, core, raw);
    state.contentDemandProfile = finalProfile;
    state.contentDemandSimple = demandProfileToSimpleMap(finalProfile);
    state.contentDemand = state.contentDemandSimple;
    state.contentDemandTick = state.tick;
  }
  return state.contentDemandProfile;
}

function computeProductionChainStatus(core, team) {
  var demand = getContentDemand(team);
  var totalWeight = 0;
  var coveredWeight = 0;
  var pressure = 0;
  if (demand == null) {
    return { pressure: 0, coverage: 1, bottleneck: 0 };
  }
  for (var key in demand) {
    if (!demand.hasOwnProperty(key)) continue;
    var item = itemByName(key);
    if (item == null) continue;
    var weight = demand[key];
    if (!(weight > 0)) continue;
    var limited = Math.min(40, weight);
    totalWeight += limited;
    var built = countProducerBlocks(team, item);
    var unlocked = unlockedProducerCount(item);
    var stock = 0;
    if (core != null && core.items != null) {
      try {
        stock = core.items.get(item);
      } catch (e) {
        stock = 0;
      }
    }
    var shortage = stock <= 0 ? 1 : (stock < limited ? 0.5 : 0);
    var tier = itemTierFor(item);
    if (built > 0) coveredWeight += limited;
    else if (unlocked > 0) coveredWeight += limited * 0.35;
    var gapFactor = built > 0 ? (0.3 / (1 + built)) : (unlocked > 0 ? 0.85 : 1.15);
    pressure += limited * (gapFactor + shortage * 0.55 + (tier - 1) * 0.08);
  }
  if (totalWeight <= 0) {
    return { pressure: 0, coverage: 1, bottleneck: 0 };
  }
  return {
    pressure: Math.round((pressure / totalWeight) * 100) / 100,
    coverage: Math.round((coveredWeight / totalWeight) * 100) / 100,
    bottleneck: Math.round((pressure - coveredWeight / totalWeight) * 100) / 100
  };
}

function computeFactoryCapacityProfile(team) {
  var profile = {
    factoryCapacity: 0,
    upgradeCapacity: 0,
    factoryVariety: 0,
    mobilityCapacity: 0,
    supportCapacity: 0,
    unitCapacity: 0
  };
  if (team == null) return profile;
  Groups.build.each(function(b){
    if (b == null || b.team != team || b.block == null || !isFactoryBlock(b.block)) return;
    var role = factoryRoleForBlock(b.block);
    var options = collectFactoryPlanOptions(b.block);
    var variety = options.length;
    var bestCapability = 0;
    var support = 0;
    for (var i = 0; i < options.length; i++) {
      var option = options[i];
      if (option == null || option.unit == null) continue;
      var capability = unitCapabilityScore(option.unit);
      if (capability > bestCapability) bestCapability = capability;
      support += unitSupportValue(option.unit);
    }
    var base = 1 + variety * 0.35 + bestCapability * 0.03;
    profile.factoryCapacity += base;
    profile.factoryVariety += variety;
    profile.unitCapacity += bestCapability;
    profile.supportCapacity += support * 0.05;
    if (role == "air" || role == "naval") profile.mobilityCapacity += base;
    var name = readContentName(b.block);
    if (name.indexOf("reconstructor") >= 0 || name.indexOf("assembler") >= 0) {
      profile.upgradeCapacity += 1.5 + variety * 0.25 + bestCapability * 0.02;
    }
  });
  profile.factoryCapacity = Math.round(profile.factoryCapacity * 100) / 100;
  profile.upgradeCapacity = Math.round(profile.upgradeCapacity * 100) / 100;
  profile.factoryVariety = Math.round(profile.factoryVariety * 100) / 100;
  profile.mobilityCapacity = Math.round(profile.mobilityCapacity * 100) / 100;
  profile.supportCapacity = Math.round(profile.supportCapacity * 100) / 100;
  profile.unitCapacity = Math.round(profile.unitCapacity * 100) / 100;
  return profile;
}

function computeAmmoProfile(core, enemies, team) {
  var totals = collectCoreAbstractResources(core);
  var intensity = enemies > 0 ? Math.min(1.5, enemies / 8) : 0.25;
  var demand = getContentDemand(team);
  var combatDemand = 0;
  if (demand != null) {
    for (var key in demand) {
      if (!demand.hasOwnProperty(key)) continue;
      var item = itemByName(key);
      if (item == null) continue;
      if (resourceCategoryForItem(item) == "combat") combatDemand += Math.min(20, demand[key]);
    }
  }
  var desiredBase = 80 + combatDemand * 0.6 + state.turretCount * 12 + intensity * 35;
  var kineticPressure = clamp01((desiredBase - totals.ammoKinetic) / Math.max(1, desiredBase));
  var explosivePressure = clamp01(((desiredBase * 0.55) - totals.ammoExplosive) / Math.max(1, desiredBase * 0.55));
  var energyPressure = clamp01(((desiredBase * 0.45) - totals.ammoEnergy) / Math.max(1, desiredBase * 0.45));
  return {
    kineticStock: totals.ammoKinetic,
    explosiveStock: totals.ammoExplosive,
    energyStock: totals.ammoEnergy,
    kineticPressure: Math.round(kineticPressure * 100) / 100,
    explosivePressure: Math.round(explosivePressure * 100) / 100,
    energyPressure: Math.round(energyPressure * 100) / 100
  };
}

function unitWeaponCount(unit) {
  if (unit == null) return 0;
  try {
    if (unit.weapons != null) return seqSize(unit.weapons);
  } catch (e) {
    // ignore
  }
  return 0;
}

function unitEconomicValue(unit) {
  if (unit == null) return 0;
  var score = 0;
  try {
    if (unit.mineTier != null) score += unit.mineTier * 3;
  } catch (e) {
    // ignore
  }
  try {
    if (unit.buildSpeed != null) score += unit.buildSpeed * 0.3;
  } catch (e2) {
    // ignore
  }
  try {
    if (unit.itemCapacity != null) score += unit.itemCapacity * 0.02;
  } catch (e3) {
    // ignore
  }
  return score;
}

function unitCombatValue(unit) {
  if (unit == null) return 0;
  var score = unitWeaponCount(unit) * 8;
  try {
    if (unit.health != null) score += unit.health * 0.02;
  } catch (e) {
    // ignore
  }
  try {
    if (unit.speed != null) score += unit.speed * 6;
  } catch (e2) {
    // ignore
  }
  try {
    if (unit.armor != null) score += unit.armor * 2;
  } catch (e3) {
    // ignore
  }
  return score;
}

function unitSupportValue(unit) {
  if (unit == null) return 0;
  return unitEconomicValue(unit) + unitCombatValue(unit) * 0.35;
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

function pickLastAffordableBlockFromNames(list, team, ignoreReserveItems) {
  if (list == null || list.length == null) return null;
  var best = null;
  for (var i = 0; i < list.length; i++) {
    var name = list[i];
    var b = blockByName(name);
    if (b == null) continue;
    if (!blockUnlocked(b)) continue;
    if (!coreHasItemsFor(b, team, ignoreReserveItems)) continue;
    best = b;
  }
  return best;
}

function pickBlockFromNamesWithIgnore(list, team, ignoreReserveItems) {
  if (list == null || list.length == null) return null;
  for (var i = 0; i < list.length; i++) {
    var name = list[i];
    var b = blockByName(name);
    if (b == null) continue;
    if (!blockUnlocked(b)) continue;
    if (!coreHasItemsFor(b, team, ignoreReserveItems)) continue;
    return b;
  }
  return null;
}

function blockOrderIndex(block, list) {
  if (block == null || list == null || list.length == null) return -1;
  for (var i = 0; i < list.length; i++) {
    if (block.name == list[i]) return i;
  }
  return -1;
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

function pickDrillBlock(team, ignoreReserveItems) {
  var ordered = pickLastAffordableBlockFromNames(config.blockPrefs != null ? config.blockPrefs.drills : null, team, ignoreReserveItems);
  if (ordered != null) return ordered;
  return pickBlock(config.blockPrefs != null ? config.blockPrefs.drills : null, team, function(b){
    return b.group == BlockGroup.drills;
  }, Blocks.mechanicalDrill);
}

function pickTurretBlock(team) {
  return pickBlock(config.blockPrefs != null ? config.blockPrefs.turrets : null, team, function(b){
    return b.group == BlockGroup.turrets;
  }, Blocks.duo);
}

function pickConveyorBlock(team, ignoreReserveItems) {
  var names = config.blockPrefs != null ? config.blockPrefs.conveyors : null;
  var picked = pickLastAffordableBlockFromNames(names, team, ignoreReserveItems);
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

function pickConduitBlock(team, ignoreReserveItems) {
  var names = config.blockPrefs != null ? config.blockPrefs.conduits : null;
  var picked = pickLastAffordableBlockFromNames(names, team, ignoreReserveItems);
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

function pickPumpBlock(team, ignoreReserveItems) {
  var ordered = pickLastAffordableBlockFromNames(config.blockPrefs != null ? config.blockPrefs.pumps : null, team, ignoreReserveItems);
  if (ordered != null) return ordered;
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

function pickPowerNodeBlock(team, ignoreReserveItems) {
  var ordered = pickLastAffordableBlockFromNames(config.blockPrefs != null ? config.blockPrefs.powerNodes : null, team, ignoreReserveItems);
  if (ordered != null) return ordered;
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

function isFactoryBlock(block) {
  if (block == null) return false;
  try {
    if (block == Blocks.groundFactory || block == Blocks.airFactory || block == Blocks.navalFactory) return true;
  } catch (e) {
    // ignore
  }
  try {
    if (block.group == BlockGroup.units) return true;
  } catch (e2) {
    // ignore
  }
  var name = readContentName(block);
  return name.indexOf("factory") >= 0 || name.indexOf("assembler") >= 0 || name.indexOf("reconstructor") >= 0;
}

function factoryRoleForBlock(block) {
  if (block == null) return "ground";
  var name = readContentName(block);
  if (name.indexOf("air") >= 0) return "air";
  if (name.indexOf("naval") >= 0 || name.indexOf("ship") >= 0) return "naval";
  return "ground";
}

function blockDemandWeight(block) {
  if (block == null) return 1;
  var score = 1;
  try {
    if (block.group == BlockGroup.units) score += 2.5;
    else if (block.group == BlockGroup.turrets) score += 1.2;
    else if (block.group == BlockGroup.power) score += 0.9;
    else if (block.group == BlockGroup.drills) score += 1.1;
    else if (block.group == BlockGroup.distribution) score += 0.5;
  } catch (e) {
    // ignore
  }
  if (isIndustryBlock(block)) score += 1.0;
  if (isFactoryBlock(block)) score += 1.2;
  return score;
}

function collectFactoryPlanOptions(block) {
  var options = [];
  if (block == null) return options;
  eachSeq(block.plans, function(plan){
    if (plan == null) return;
    var unit = null;
    try {
      if (plan.unit != null) unit = plan.unit;
      else if (plan.result != null) unit = plan.result;
    } catch (e) {
      unit = null;
    }
    if (unit == null || !unitUnlocked(unit)) return;
    var reqs = null;
    try {
      reqs = plan.requirements;
    } catch (e2) {
      reqs = null;
    }
    options.push({
      unit: unit,
      requirements: reqs,
      role: factoryRoleForBlock(block)
    });
  });
  return options;
}

function currentStrategyName(fallback) {
  if (fallback != null && fallback != "") return fallback;
  if (state.currentStrategy != null && state.currentStrategy != "") return state.currentStrategy;
  return "balanced";
}

function scoreFactoryOption(core, option, strategyName) {
  if (option == null || option.unit == null) return -999999;
  var unit = option.unit;
  var reqs = option.requirements;
  var score = 20;
  var strat = currentStrategyName(strategyName);
  var combat = unitCombatValue(unit);
  var econ = unitEconomicValue(unit);
  var support = unitSupportValue(unit);
  var reqTotal = requirementsTotal(reqs);
  var affordable = reqTotal <= 0 ? 1 : 0;
  eachSeq(reqs, function(stack){
    if (stack == null || stack.item == null || core == null || core.items == null) return;
    var total = core.items.get(stack.item);
    var need = stack.amount != null ? stack.amount : 0;
    if (total >= need) affordable += 1;
  });
  score += affordable * 8;
  if (strat == "aggressive") score += combat * 1.25 + support * 0.25;
  else if (strat == "defensive") score += combat * 0.9 + support * 0.55 + econ * 0.25;
  else if (strat == "economic") score += econ * 1.35 + support * 0.6 + combat * 0.3;
  else score += combat * 0.8 + econ * 0.6 + support * 0.4;
  if (option.role == "air") score += strat == "aggressive" ? 10 : 6;
  if (option.role == "naval") score += strat == "aggressive" ? 6 : 3;
  score -= reqTotal * 0.08;
  return score;
}

function pickFactoryUnitForBuild(build, core, strategyName) {
  if (build == null || build.block == null) return null;
  var options = collectFactoryPlanOptions(build.block);
  if (options.length == 0) {
    if (build.block != Blocks.groundFactory && build.block != Blocks.airFactory && build.block != Blocks.navalFactory) return null;
  }
  var best = null;
  for (var i = 0; i < options.length; i++) {
    var option = options[i];
    var score = scoreFactoryOption(core, option, strategyName);
    if (best == null || score > best.score) {
      best = {
        unit: option.unit,
        score: score
      };
    }
  }
  if (best != null && best.unit != null) return best.unit;
  var role = factoryRoleForBlock(build.block);
  if (role == "air") return unitTypeByName(config.preferredAirUnit);
  if (role == "naval") return unitTypeByName(config.preferredNavalUnit);
  return unitTypeByName(config.preferredGroundUnit);
}

function configureFactories(team, core, strategyName) {
  if ((state.tick - state.lastFactoryConfigTick) < config.factoryConfigInterval) return false;
  var changed = false;
  Groups.build.each(function(b){
    if (b == null || b.team != team || b.block == null) return;
    if (!isFactoryBlock(b.block)) return;
    var unit = pickFactoryUnitForBuild(b, core, strategyName);
    if (unit == null || !unitUnlocked(unit)) return;
    changed = configureBuild(b, unit) || changed;
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

function microPolicyDefaultFeatures() {
  var out = [
    "enemyCount",
    "unitsTotal",
    "economyStage",
    "reservePressure",
    "chainPressure",
    "chainCoverage",
    "powerPressure",
    "liquidPressure",
    "defensePressure"
  ];
  for (var i = 0; i < 8; i++) {
    out.push("opt" + i + "Need");
    out.push("opt" + i + "Risk");
    out.push("opt" + i + "Value");
    out.push("opt" + i + "Dist");
    out.push("opt" + i + "Enabled");
  }
  return out;
}

function microPolicyDefaultActions(actionName) {
  if (actionName == "mine") return ["ensure-0", "ensure-1", "ensure-2", "ensure-3", "ore-plan"];
  if (actionName == "defend") return ["slot-0", "slot-1", "slot-2", "slot-3", "slot-4", "slot-5", "slot-6", "slot-7"];
  if (actionName == "industry") return ["module-0", "module-1", "module-2", "mine-input-0", "mine-input-1", "mine-input-2", "expand-factory", "upgrade-economy"];
  if (actionName == "attackWave") return ["commit-wave"];
  if (actionName == "rally") return ["rally-force"];
  if (actionName == "power") return ["cluster-0", "cluster-1", "cluster-2", "cluster-3"];
  if (actionName == "thermal") return ["heat-spot-0"];
  if (actionName == "liquid") return ["source-0", "source-1", "source-2", "source-3"];
  return ["default"];
}

function initializeMicroPolicyModel(actionName) {
  var features = microPolicyDefaultFeatures();
  var actions = microPolicyDefaultActions(actionName);
  var hiddenSize = config.rlNNHidden || 16;
  var model = {
    policy: actionName,
    inputSize: features.length,
    hiddenSize: hiddenSize,
    outputSize: actions.length,
    features: features,
    actions: actions,
    w1: [],
    b1: [],
    w2: [],
    b2: []
  };
  var scale = 0.1;
  for (var i = 0; i < hiddenSize * features.length; i++) model.w1.push((Math.random() * 2 - 1) * scale);
  for (var j = 0; j < hiddenSize; j++) model.b1.push(0);
  for (var k = 0; k < hiddenSize * actions.length; k++) model.w2.push((Math.random() * 2 - 1) * scale);
  for (var m = 0; m < actions.length; m++) model.b2.push(0);
  return model;
}

function resolveMicroPolicyFi(actionName) {
  if (actionName == null || actionName == "") return null;
  var fileName = String(config.rlMicroPolicyFilePattern || "micro_{action}.json").replace("{action}", actionName);
  try {
    if (config.rlMicroPolicyDir != null && config.rlMicroPolicyDir != "") {
      var mod = Vars.mods.getMod(config.modName);
      if (mod != null && mod.root != null) return mod.root.child(config.rlMicroPolicyDir).child(fileName);
    }
  } catch (e) {
    // ignore
  }
  try {
    return new Fi(fileName);
  } catch (e2) {
    return null;
  }
}

function microPolicyFileCandidates(actionName) {
  var list = [];
  if (actionName == null || actionName == "") return list;
  list.push(String(actionName));
  if (actionName == "industry") {
    list.push("build");
    list.push("economy");
  } else if (actionName == "mine") {
    list.push("expand");
    list.push("resource");
  } else if (actionName == "power") {
    list.push("energy");
  }
  return list;
}

function loadMicroPolicyModel(actionName) {
  if (!config.rlMicroPolicyEnabled) return null;
  if (actionName == null || actionName == "") return null;
  var cached = state.microPolicies[actionName];
  var lastLoad = state.microLastLoadTicks[actionName];
  if (cached != null && config.rlMicroPolicyReloadTicks > 0 && (state.tick - lastLoad) < config.rlMicroPolicyReloadTicks) return cached;
  var fi = null;
  var aliases = microPolicyFileCandidates(actionName);
  for (var ai = 0; ai < aliases.length; ai++) {
    fi = resolveMicroPolicyFi(aliases[ai]);
    if (fi != null && fi.exists()) break;
    fi = null;
  }
  if (fi == null || !fi.exists()) {
    if ((state.tick - (state.microLastErrorTicks[actionName] || -9999)) > 600) {
      Log.info("[RL] Micro policy nao encontrada: " + actionName + " (arquivos tentados: " + aliases.join(", ") + ")");
      state.microLastErrorTicks[actionName] = state.tick;
    }
    if (config.rlMicroPolicyBootstrapMissing) {
      cached = initializeMicroPolicyModel(actionName);
      state.microPolicies[actionName] = cached;
      state.microLastLoadTicks[actionName] = state.tick;
      return cached;
    }
    state.microPolicies[actionName] = null;
    return null;
  }
  try {
    var text = fi.readString();
    var data = JSON.parse(String(text));
    if (data == null) throw "invalid";
    if (data.features == null) data.features = microPolicyDefaultFeatures();
    if (data.actions == null) data.actions = microPolicyDefaultActions(actionName);
    if (data.inputSize == null) data.inputSize = data.features.length;
    if (data.outputSize == null) data.outputSize = data.actions.length;
    if (data.policy == null) data.policy = actionName;
    state.microPolicies[actionName] = data;
    state.microLastLoadTicks[actionName] = state.tick;
    return data;
  } catch (e3) {
    state.microPolicies[actionName] = null;
    state.microLastErrorTicks[actionName] = state.tick;
    return null;
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

function modelHasNamedEntry(list, name) {
  if (list == null || name == null) return false;
  for (var i = 0; i < list.length; i++) {
    if (featureName(list[i]) == name) return true;
  }
  return false;
}

function nnModelHasFeature(name) {
  return state.nnModel != null && modelHasNamedEntry(state.nnModel.features, name);
}

function nnModelHasAction(name) {
  return state.nnModel != null && modelHasNamedEntry(state.nnModel.actions, name);
}

function shouldKeepHeuristicNNScore(actionName, stageInfo, smeltingMineNeed, advancedMineNeed) {
  if (!config.rlNNHeuristicAssist) return false;
  if (config.rlPolicyMode != "nn" || state.nnModel == null) return false;
  if (actionName != "mine") return false;

  if (advancedMineNeed) {
    if (!nnModelHasFeature("resourceTier3")) return true;
    if (!nnModelHasFeature("resourceStrategic")) return true;
    if (!nnModelHasFeature("chainPressure")) return true;
    if (!nnModelHasAction("industry")) return true;
  }

  if (smeltingMineNeed) {
    if (!nnModelHasFeature("resourceIndustrial")) return true;
    if (!nnModelHasFeature("chainCoverage")) return true;
    if (!nnModelHasFeature("factoryCapacity")) return true;
  }

  if (stageInfo != null && stageInfo.stage < 1) {
    if (!nnModelHasFeature("resourceTier1")) return true;
  }

  return false;
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

function decisionLabel(actionName, decision) {
  if (actionName == null) actionName = "unknown";
  if (decision == null) return actionName + "/default";
  var parts = [actionName, decision.actionId != null ? decision.actionId : (decision.kind != null ? decision.kind : "default")];
  if (decision.itemName != null) parts.push(decision.itemName);
  else if (decision.module != null) parts.push(decision.module);
  else if (decision.block != null && decision.block.name != null) parts.push(decision.block.name);
  if (decision.x != null && decision.y != null) parts.push(decision.x + "," + decision.y);
  return parts.join("/");
}

function clampMetric(v) {
  if (v == null || isNaN(v)) return 0;
  if (v > 10) return 10;
  if (v < -10) return -10;
  return v;
}

function buildMicroPolicyState(actionName, ctx, decisions) {
  var snap = ctx != null ? ctx.beforeState : null;
  var out = {
    enemyCount: clampMetric((snap != null ? snap.enemies : 0) / 20),
    unitsTotal: clampMetric((snap != null ? snap.unitsTotal : 0) / 40),
    economyStage: clampMetric((snap != null ? snap.economyStage : 0) / 5),
    reservePressure: clampMetric(snap != null ? snap.economicPressure : 0),
    chainPressure: clampMetric(snap != null ? snap.chainPressure : 0),
    chainCoverage: clampMetric(snap != null ? snap.chainCoverage : 0),
    powerPressure: clampMetric(snap != null ? snap.powerPressure : 0),
    liquidPressure: clampMetric(snap != null ? snap.liquidPressure : 0),
    defensePressure: clampMetric(snap != null ? snap.defensePressure : 0)
  };
  for (var i = 0; i < 8; i++) {
    var decision = decisions != null && decisions.length > i ? decisions[i] : null;
    var features = decision != null && decision.features != null ? decision.features : {};
    out["opt" + i + "Need"] = clampMetric(features.need != null ? features.need : 0);
    out["opt" + i + "Risk"] = clampMetric(features.risk != null ? features.risk : 0);
    out["opt" + i + "Value"] = clampMetric(features.value != null ? features.value : 0);
    out["opt" + i + "Dist"] = clampMetric(features.distance != null ? features.distance / 20 : 0);
    out["opt" + i + "Enabled"] = decision != null ? 1 : 0;
  }
  return out;
}

function microPolicyScores(actionName, ctx, decisions) {
  var model = loadMicroPolicyModel(actionName);
  if (model == null || model.features == null || model.actions == null || decisions == null || decisions.length == 0) return null;
  var stateObj = buildMicroPolicyState(actionName, ctx, decisions);
  var prev = state.nnModel;
  state.nnModel = model;
  var fwd = nnForward(stateObj);
  state.nnModel = prev;
  if (fwd == null || fwd.output == null || fwd.output.length == 0) return null;
  var scores = {};
  for (var i = 0; i < model.actions.length && i < fwd.output.length; i++) {
    scores[model.actions[i]] = fwd.output[i];
  }
  return scores;
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
  if (!nnModelHasFeature("resourceTier3")) return true;
  if (!nnModelHasFeature("chainPressure")) return true;
  if (!nnModelHasFeature("resourceStrategic") && (plan.critical || plan.pressure > 0.5)) return true;
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

function clampNumber(v, minv, maxv) {
  if (v < minv) return minv;
  if (v > maxv) return maxv;
  return v;
}

function normalizedStage(stageInfo) {
  var stage = stageInfo != null && stageInfo.stage != null ? stageInfo.stage : 0;
  return clampNumber(stage / 5, 0, 1);
}

function adaptiveBlendWeight(stageInfo, reservePressureValue, fallbackBlend) {
  var blend = fallbackBlend != null ? fallbackBlend : 0.5;
  if (!config.rlAdaptiveBlend) return blend;
  var minBlend = config.rlAdaptiveBlendMin != null ? config.rlAdaptiveBlendMin : 0.25;
  var maxBlend = config.rlAdaptiveBlendMax != null ? config.rlAdaptiveBlendMax : 0.85;
  if (maxBlend < minBlend) {
    var tmp = minBlend;
    minBlend = maxBlend;
    maxBlend = tmp;
  }
  var pressureWeight = config.rlAdaptiveBlendPressureWeight != null ? config.rlAdaptiveBlendPressureWeight : 0.55;
  var stageWeight = config.rlAdaptiveBlendStageWeight != null ? config.rlAdaptiveBlendStageWeight : 0.45;
  var confidence = clampNumber((1 - reservePressureValue) * pressureWeight + normalizedStage(stageInfo) * stageWeight, 0, 1);
  return minBlend + (maxBlend - minBlend) * confidence;
}

function blendScores(heuristicScore, learnedScore, learnedWeight) {
  var h = heuristicScore != null ? heuristicScore : 0;
  if (learnedScore == null) return h;
  var lw = clampNumber(learnedWeight != null ? learnedWeight : 0.5, 0, 1);
  return h * (1 - lw) + learnedScore * lw;
}

function extractAiIntent(parts) {
  var intent = {
    verb: parts.length > 1 ? parts[1] : "toggle",
    arg1: parts.length > 2 ? parts[2] : null,
    raw: parts.join(" ")
  };
  if (intent.raw.indexOf("liga") >= 0 || intent.raw.indexOf("ativ") >= 0) intent.verb = "on";
  if (intent.raw.indexOf("desliga") >= 0 || intent.raw.indexOf("parar") >= 0) intent.verb = "off";
  if (intent.raw.indexOf("status") >= 0 || intent.raw.indexOf("estado") >= 0) intent.verb = "status";
  if (intent.raw.indexOf("limpar") >= 0 || intent.raw.indexOf("resetar") >= 0) intent.verb = "clear";
  if (intent.raw.indexOf("estrateg") >= 0) intent.verb = "strategy";
  if (intent.raw.indexOf("modo") >= 0 || intent.raw.indexOf("policy") >= 0) intent.verb = "policy";
  return intent;
}

function parseAiDirective(text) {
  if (text == null) return null;
  var msg = String(text).toLowerCase();
  var bias = {};
  if (msg.indexOf("econom") >= 0 || msg.indexOf("miner") >= 0 || msg.indexOf("recurso") >= 0) {
    bias.mine = 1.25;
    bias.industry = 1.2;
  }
  if (msg.indexOf("defes") >= 0 || msg.indexOf("seguran") >= 0 || msg.indexOf("proteg") >= 0) {
    bias.defend = 1.35;
    bias.rally = 1.1;
    bias.attackWave = 0.75;
  }
  if (msg.indexOf("ataq") >= 0 || msg.indexOf("agress") >= 0 || msg.indexOf("pression") >= 0) {
    bias.attackWave = 1.35;
    bias.rally = 1.2;
    bias.defend = 0.9;
  }
  if (msg.indexOf("energi") >= 0 || msg.indexOf("power") >= 0 || msg.indexOf("bateria") >= 0) {
    bias.power = 1.3;
    bias.thermal = 1.25;
  }
  if (msg.indexOf("liqu") >= 0 || msg.indexOf("coolant") >= 0 || msg.indexOf("criogen") >= 0) {
    bias.liquid = 1.35;
  }
  if (msg.indexOf("industr") >= 0 || msg.indexOf("fabr") >= 0 || msg.indexOf("produção") >= 0 || msg.indexOf("producao") >= 0) {
    bias.industry = bias.industry != null ? Math.max(bias.industry, 1.3) : 1.3;
  }
  var keys = Object.keys(bias);
  return keys.length > 0 ? bias : null;
}

function applyCommandBias(actions) {
  if (actions == null || actions.length == 0) return;
  if (state.commandBias == null) return;
  if (state.tick > state.commandBiasUntilTick) {
    state.commandBias = null;
    state.commandBiasUntilTick = -1;
    return;
  }
  for (var i = 0; i < actions.length; i++) {
    var act = actions[i];
    if (act == null || act.name == null) continue;
    var mult = state.commandBias[act.name];
    if (mult == null) continue;
    if (mult < 0) mult = 0;
    act.baseScore *= mult;
    act.score *= mult;
  }
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
  reward += (nextState.titanium - prevState.titanium) * config.rlRewardTitanium;
  reward += (nextState.resourceTier1 - prevState.resourceTier1) * 0.004;
  reward += (nextState.resourceTier2 - prevState.resourceTier2) * 0.006;
  reward += (nextState.resourceTier3 - prevState.resourceTier3) * 0.01;
  reward += (nextState.resourceTier4 - prevState.resourceTier4) * 0.014;
  reward += (nextState.resourceTier5 - prevState.resourceTier5) * 0.018;
  reward += (nextState.resourceIndustrial - prevState.resourceIndustrial) * 0.005;
  reward += (nextState.resourceStrategic - prevState.resourceStrategic) * 0.008;
  reward += (nextState.combatStock - prevState.combatStock) * 0.004;
  reward += (nextState.industryFactories - prevState.industryFactories) * config.rlRewardIndustryFactory;
  reward += (nextState.economyStage - prevState.economyStage) * config.rlRewardEconomyStage;
  reward += (nextState.drills - prevState.drills) * config.rlRewardDrill;
  reward += (nextState.turrets - prevState.turrets) * config.rlRewardTurret;
  reward += (nextState.power - prevState.power) * config.rlRewardPower;
  reward += (nextState.pumps - prevState.pumps) * config.rlRewardPump;
  reward += (nextState.liquidHubs - prevState.liquidHubs) * config.rlRewardLiquidHub;
  reward += (nextState.thermals - prevState.thermals) * config.rlRewardThermal;
  reward += (nextState.unitsTotal - prevState.unitsTotal) * config.rlRewardUnit;
  reward += (nextState.factoryCapacity - prevState.factoryCapacity) * 1.5;
  reward += (nextState.upgradeCapacity - prevState.upgradeCapacity) * 1.8;
  reward += (nextState.factoryVariety - prevState.factoryVariety) * 0.4;
  reward += (nextState.unitCapacity - prevState.unitCapacity) * 0.08;
  reward += (nextState.chainCoverage - prevState.chainCoverage) * 25;
  reward -= (nextState.chainPressure - prevState.chainPressure) * 18;
  reward -= (nextState.powerPressure - prevState.powerPressure) * 14;
  reward -= (nextState.defensePressure - prevState.defensePressure) * 12;
  reward -= (nextState.liquidPressure - prevState.liquidPressure) * 8;
  reward -= (nextState.ammoPressureKinetic - prevState.ammoPressureKinetic) * 8;
  reward -= (nextState.ammoPressureExplosive - prevState.ammoPressureExplosive) * 9;
  reward -= (nextState.ammoPressureEnergy - prevState.ammoPressureEnergy) * 9;

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

function canPlaceBlock(block, x, y, rotation, team, ignoreReserveItems) {
  if (block == null) return false;
  if (!blockUnlocked(block)) return false;
  if (!coreHasItemsFor(block, team, ignoreReserveItems)) return false;
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
  if (block == null) return false;
  try {
    if (BuildVisibility != null) {
      if (block.buildVisibility == BuildVisibility.sandboxOnly) return false;
      if (block.buildVisibility == BuildVisibility.hidden) return false;
    }
  } catch (e0) {
    // ignore
  }
  if (!config.campaignSafeMode) return true;
  try {
    return block.unlockedNow();
  } catch (e) {
    return true;
  }
}

function scanContentDemand(team) {
  getContentDemandProfile(team, getCore(team));
  return state.contentDemandSimple;
}

function getContentDemand(team) {
  getContentDemandProfile(team, getCore(team));
  return state.contentDemandSimple != null ? state.contentDemandSimple : {};
}

function contentDemandForItem(team, item) {
  var entry = getDemandProfileEntry(team, getCore(team), item);
  return entry != null && entry.total != null ? entry.total : 0;
}

function computeReservePressureFromReserve(stock, reserve) {
  if (!(reserve > 0)) return 0;
  var margin = config.resourceReserveSoftMargin != null ? config.resourceReserveSoftMargin : 0;
  if (margin < 0) margin = 0;
  var soft = reserve * (1 + margin);
  if (soft <= reserve) soft = reserve + 1;
  if (stock <= reserve) return 1;
  if (stock >= soft) return 0;
  return clamp01((soft - stock) / (soft - reserve));
}

function computeDynamicMiningEntry(item, core, team, profileEntry) {
  if (item == null) return null;
  var entry = profileEntry != null ? profileEntry : getDemandProfileEntry(team, core, item);
  if (entry == null) return null;
  var reserve = reserveFor(item, team, core, entry);
  if (reserve <= 0 && !(entry.total > 0)) return null;
  var reservePressure = computeReservePressureFromReserve(entry.stock, reserve);
  var critical = entry.criticality >= 70 || reservePressure >= 0.8;
  return {
    item: readContentName(item),
    priority: 0.7 + entry.criticality / 60 + entry.scarcity * 0.8,
    minDrills: entry.criticality >= 50 ? 1 : 0,
    critical: critical,
    bypassSlots: entry.criticality >= 85 ? 2 : 1,
    demand: entry.total,
    scarcity: entry.scarcity,
    criticality: entry.criticality,
    chainCriticality: entry.chainDemand,
    producersBuilt: entry.producersBuilt,
    tier: entry.tier,
    category: entry.category,
    dynamic: true,
    reserve: reserve,
    reservePressure: reservePressure
  };
}

function synthesizeMiningEntry(item, core, team) {
  return computeDynamicMiningEntry(item, core, team, null);
}

function manualReserveFor(item) {
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

function dynamicReserveFor(item, team, core, profileEntry) {
  if (item == null) return 0;
  var entry = profileEntry != null ? profileEntry : getDemandProfileEntry(team, core, item);
  if (entry == null) return 0;
  var baseTier = entry.tier <= 1 ? 40 : (entry.tier == 2 ? 35 : (entry.tier == 3 ? 28 : (entry.tier == 4 ? 22 : 16)));
  var baseCategory = entry.category == "basic" ? 30 : (entry.category == "industrial" ? 24 : 18);
  var demandFactor = Math.min(160, entry.total * 2);
  var scarcityFactor = entry.scarcity * 40;
  var producerFactor = entry.producersBuilt <= 0 ? 20 : 0;
  var dynamicReserve = baseTier + baseCategory + demandFactor + scarcityFactor + producerFactor;
  return Math.round(Math.max(0, dynamicReserve));
}

function reserveFor(item, team, core, profileEntry) {
  var manual = manualReserveFor(item);
  var dynamic = dynamicReserveFor(item, team != null ? team : getTeam(), core != null ? core : getCore(team != null ? team : getTeam()), profileEntry);
  return Math.max(manual, dynamic);
}

function economicPressure(core, team) {
  return reservePressure(core, team);
}

function shouldIgnoreReserve(ignoreReserveItems, item) {
  if (ignoreReserveItems == null || item == null) return false;
  var key = null;
  try {
    key = item.name;
  } catch (e) {
    key = null;
  }
  if (key == null) return false;
  try {
    if (ignoreReserveItems[key] === true) return true;
  } catch (e2) {
    // ignore
  }
  try {
    if (ignoreReserveItems.length != null) {
      for (var i = 0; i < ignoreReserveItems.length; i++) {
        if (ignoreReserveItems[i] == key) return true;
      }
    }
  } catch (e3) {
    // ignore
  }
  return false;
}

function resourcePressure(core, item, team, profileEntry) {
  if (core == null || core.items == null || item == null) return 0;
  var entry = profileEntry != null ? profileEntry : getDemandProfileEntry(team != null ? team : getTeam(), core, item);
  var reserve = reserveFor(item, team, core, entry);
  if (reserve <= 0) return 0;
  var total = entry != null ? entry.stock : 0;
  if (entry == null) {
    try {
      total = core.items.get(item);
    } catch (e) {
      total = 0;
    }
  }
  return computeReservePressureFromReserve(total, reserve);
}

function reservePressure(core, team) {
  if (core == null) return 0;
  var profile = getContentDemandProfile(team != null ? team : getTeam(), core);
  var seen = {};
  var maxp = 0;
  if (profile != null) {
    for (var key in profile) {
      if (!profile.hasOwnProperty(key)) continue;
      var entry = profile[key];
      if (entry == null || !(entry.total > 0)) continue;
      seen[key] = true;
      var item = entry.item != null ? entry.item : itemByName(key);
      if (item == null) continue;
      var p = resourcePressure(core, item, team, entry);
      if (p > maxp) maxp = p;
    }
  }
  if (config.resourceReserve != null) {
    for (var rkey in config.resourceReserve) {
      if (!config.resourceReserve.hasOwnProperty(rkey) || seen[rkey] === true) continue;
      var ritem = itemByName(rkey);
      if (ritem == null) continue;
      var rp = resourcePressure(core, ritem, team, null);
      if (rp > maxp) maxp = rp;
    }
  }
  return maxp;
}

function miningRoadmapEntry(item, core, team) {
  if (item == null) return null;
  var dynamicEntry = computeDynamicMiningEntry(item, core, team, null);
  var manual = null;
  if (config.economicMiningRoadmap != null) {
    var name = null;
    try {
      name = item.name;
    } catch (e) {
      name = null;
    }
    if (name != null) {
      for (var i = 0; i < config.economicMiningRoadmap.length; i++) {
        var entry = config.economicMiningRoadmap[i];
        if (entry != null && entry.item == name) { manual = entry; break; }
      }
    }
  }
  if (dynamicEntry == null) return manual;
  if (manual == null) return dynamicEntry;
  return {
    item: dynamicEntry.item,
    priority: (dynamicEntry.priority != null ? dynamicEntry.priority : 0) + (manual.priority != null ? (manual.priority - 1) * 0.8 : 0),
    minDrills: Math.max(dynamicEntry.minDrills != null ? dynamicEntry.minDrills : 0, manual.minDrills != null ? manual.minDrills : 0),
    critical: manual.critical === true || dynamicEntry.critical === true,
    bypassSlots: Math.max(dynamicEntry.bypassSlots != null ? dynamicEntry.bypassSlots : 0, manual.bypassSlots != null ? manual.bypassSlots : 0),
    dynamic: true,
    demand: dynamicEntry.demand,
    scarcity: dynamicEntry.scarcity,
    criticality: dynamicEntry.criticality,
    chainCriticality: dynamicEntry.chainCriticality,
    producersBuilt: dynamicEntry.producersBuilt,
    tier: dynamicEntry.tier,
    category: dynamicEntry.category,
    reserve: dynamicEntry.reserve,
    reservePressure: dynamicEntry.reservePressure
  };
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
  var demandWeight = config.mineRoadmapDemandWeight != null ? config.mineRoadmapDemandWeight : 8;
  var distanceWeight = config.mineRoadmapDistanceWeight != null ? config.mineRoadmapDistanceWeight : 1;
  var underDrilledBonus = config.mineRoadmapUnderDrilledBonus != null ? config.mineRoadmapUnderDrilledBonus : 25;
  var criticalGate = config.mineCriticalPressureGate != null ? config.mineCriticalPressureGate : 0;
  var best = null;
  for (var i = 0; i < ores.length; i++) {
    var ore = ores[i];
    if (ore == null || ore.item == null) continue;
    var tile = tileAt(ore.x, ore.y);
    if (tile == null || tile.block() != Blocks.air) continue;
    var profileEntry = getDemandProfileEntry(team, core, ore.item);
    var entry = miningRoadmapEntry(ore.item, core, team);
    if (entry == null && profileEntry == null) continue;
    var reserve = reserveFor(ore.item, team, core, profileEntry);
    var reservePressureValue = resourcePressure(core, ore.item, team, profileEntry);
    var demand = entry != null && entry.demand != null ? entry.demand : (profileEntry != null ? profileEntry.total : contentDemandForItem(team, ore.item));
    var priority = entry != null && entry.priority != null ? entry.priority : (reserve > 0 ? 1.0 : 0.6);
    var criticality = entry != null && entry.criticality != null ? entry.criticality : (profileEntry != null ? profileEntry.criticality : 0);
    var scarcity = entry != null && entry.scarcity != null ? entry.scarcity : (profileEntry != null ? profileEntry.scarcity : 0);
    var chainCriticality = entry != null && entry.chainCriticality != null ? entry.chainCriticality : (profileEntry != null ? profileEntry.chainDemand : 0);
    var total = profileEntry != null ? profileEntry.stock : (core.items != null ? core.items.get(ore.item) : 0);
    var deficit = reserve > total ? (reserve - total) : 0;
    var itemDrills = countDrillsMiningItem(team, ore.item);
    var minDrills = entry != null && entry.minDrills != null ? entry.minDrills : 0;
    var underDrilled = itemDrills < minDrills;
    var critical = entry != null && entry.critical === true;
    var bypassCap = miningBypassCap(entry);
    var canBypass = critical && reservePressureValue >= criticalGate && state.drillCount < bypassCap;
    var underBaseCap = state.drillCount < config.maxDrills;
    if (!underBaseCap && !canBypass) continue;
    var idealDrills = Math.max(minDrills, Math.ceil(Math.max(0, demand) / 24));
    var oversaturationPenalty = Math.max(0, itemDrills - idealDrills) * 12;
    var tierBonus = profileEntry != null ? Math.max(0, profileEntry.tier - 1) * 6 : 0;
    var categoryBonus = profileEntry != null ? (profileEntry.category == "basic" ? 10 : (profileEntry.category == "industrial" ? 14 : (profileEntry.category == "strategic" ? 18 : 12))) : 0;
    var score = baseScore;
    score += reservePressureValue * pressureWeight;
    score += priority * priorityWeight;
    score += Math.min(demand, 24) * demandWeight;
    score += criticality * 1.2;
    score += scarcity * 40;
    score += Math.min(18, chainCriticality * 2.4);
    score += Math.min(deficit, reserve > 0 ? reserve : 100) * 0.15;
    if (underDrilled) score += underDrilledBonus;
    score += tierBonus + categoryBonus;
    if (critical && reservePressureValue > 0) score += 18;
    if (underBaseCap) score += 12;
    else if (canBypass) score += 16;
    score -= Math.sqrt(ore.dist2) * distanceWeight;
    score -= oversaturationPenalty;
    if (best == null || score > best.score) {
      best = {
        ore: ore,
        item: ore.item,
        itemName: ore.itemName,
        score: score,
        pressure: reservePressureValue,
        reservePressure: reservePressureValue,
        reserve: reserve,
        total: total,
        deficit: deficit,
        underDrilled: underDrilled,
        demand: demand,
        itemDrills: itemDrills,
        minDrills: minDrills,
        critical: critical,
        criticality: criticality,
        scarcity: scarcity,
        chainCriticality: chainCriticality,
        allowBypass: !underBaseCap && canBypass,
        capped: !underBaseCap,
        missingEconomicSignal: critical || reservePressureValue > 0.5 || underDrilled,
        reason: {
          reservePressure: Math.round(reservePressureValue * 100) / 100,
          demand: Math.round(demand * 100) / 100,
          criticality: Math.round(criticality * 100) / 100,
          scarcity: Math.round(scarcity * 100) / 100,
          chainCriticality: Math.round(chainCriticality * 100) / 100,
          category: profileEntry != null ? profileEntry.category : null,
          tier: profileEntry != null ? profileEntry.tier : 1,
          itemDrills: itemDrills,
          oversaturationPenalty: oversaturationPenalty
        }
      };
    }
  }
  return best;
}

function availableCoreItems(core, item, ignoreReserveItems) {
  if (core == null || core.items == null || item == null) return 0;
  var total = core.items.get(item);
  var reserve = shouldIgnoreReserve(ignoreReserveItems, item) ? 0 : reserveFor(item);
  var avail = total - reserve;
  return avail < 0 ? 0 : avail;
}

function coreHasItemsFor(block, team, ignoreReserveItems) {
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
    if (availableCoreItems(core, stack.item, ignoreReserveItems) < need) return false;
  }
  return true;
}

function consumeCoreItems(block, team, ignoreReserveItems) {
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
    if (availableCoreItems(core, stack.item, ignoreReserveItems) < need) return false;
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
  var economyStage = beforeState != null && beforeState.economyStage != null ? beforeState.economyStage : economyStageInfo(core, getTeam(), unitsTotal).stage;
  var pressure = economicPressure(core, getTeam());
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
  } else if (pressure > econPressure || powerLow || earlyWave || (enemyCore != null && economyStage < config.attackMinEconomyStage)) {
    strat = "economic";
  } else if (enemyCore != null && economyStage >= config.attackMinEconomyStage && unitsTotal >= aggUnits && enemies < aggEnemies) {
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

function placeBlock(block, x, y, rotation, team, ignoreReserveItems) {
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
  if (!coreHasItemsFor(block, team, ignoreReserveItems)) {
    if (config.aiDebugHud) state.lastPlaceFail = "no-items:" + block.name;
    warnBuildFail("Sem recursos: " + block.localizedName);
    return false;
  }
  if (!canPlaceBlock(block, x, y, rotation || 0, team, ignoreReserveItems)) {
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
  if (!consumeCoreItems(block, team, ignoreReserveItems)) {
    if (config.aiDebugHud) state.lastPlaceFail = "no-items:" + block.name;
    warnBuildFail("Sem recursos: " + block.localizedName);
    return false;
  }
  var builderUnit = null;
  if (player != null) {
    try {
      builderUnit = player.unit();
    } catch (e) {
      builderUnit = null;
    }
  }
  if (player != null && isUnitUsable(builderUnit)) {
    Call.constructFinish(tile, block, builderUnit, rotation || 0, team, null);
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

function stepTowardAxis(x, y, tx, ty, preferVertical) {
  var dx = tx - x;
  var dy = ty - y;
  var sx = dx == 0 ? 0 : (dx > 0 ? 1 : -1);
  var sy = dy == 0 ? 0 : (dy > 0 ? 1 : -1);
  if (preferVertical && sy != 0) return { dx: 0, dy: sy };
  if (!preferVertical && sx != 0) return { dx: sx, dy: 0 };
  if (sx != 0) return { dx: sx, dy: 0 };
  if (sy != 0) return { dx: 0, dy: sy };
  return { dx: 0, dy: 0 };
}

function placeConveyorPath(team, sx, sy, tx, ty, maxSteps, preferVertical, ignoreReserveItems) {
  var conv = pickConveyorBlock(team, ignoreReserveItems);
  if (conv == null) conv = Blocks.conveyor;
  var x = sx;
  var y = sy;
  var steps = 0;
  var placedAny = false;
  while ((x != tx || y != ty) && steps < maxSteps) {
    var step = stepTowardAxis(x, y, tx, ty, preferVertical);
    if (step.dx == 0 && step.dy == 0) break;
    var nx = x + step.dx;
    var ny = y + step.dy;
    var ntile = tileAt(nx, ny);
    if (ntile == null) break;
    var rot = rotationForStep(step.dx, step.dy);
    placedAny = placeBlock(conv, x, y, rot, team, ignoreReserveItems) || placedAny;
    if (ntile.block() != Blocks.air) {
      if (ntile.block().isCore != null && ntile.block().isCore()) break;
      break;
    }
    x = nx;
    y = ny;
    steps++;
  }
  return placedAny;
}

function placeConduitPath(team, sx, sy, tx, ty, maxSteps, preferVertical, ignoreReserveItems) {
  var conduit = pickConduitBlock(team, ignoreReserveItems);
  if (conduit == null) conduit = Blocks.conduit;
  var x = sx;
  var y = sy;
  var steps = 0;
  var placedAny = false;
  while ((x != tx || y != ty) && steps < maxSteps) {
    var step = stepTowardAxis(x, y, tx, ty, preferVertical);
    if (step.dx == 0 && step.dy == 0) break;
    var nx = x + step.dx;
    var ny = y + step.dy;
    var ntile = tileAt(nx, ny);
    if (ntile == null) break;
    var rot = rotationForStep(step.dx, step.dy);
    placedAny = placeBlock(conduit, x, y, rot, team, ignoreReserveItems) || placedAny;
    if (ntile.block() != Blocks.air) {
      break;
    }
    x = nx;
    y = ny;
    steps++;
  }
  return placedAny;
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

function findLiquidTilesByType(cx, cy, radius, liquid, maxCount) {
  var found = [];
  if (liquid == null) return found;
  for (var dx = -radius; dx <= radius; dx++) {
    for (var dy = -radius; dy <= radius; dy++) {
      var tile = tileAt(cx + dx, cy + dy);
      if (tile == null) continue;
      if (tile.floor() == null || !tile.floor().isLiquid || tile.block() != Blocks.air) continue;
      var liq = tile.floor().liquidDrop;
      if (liq != liquid) continue;
      var dist2 = dx * dx + dy * dy;
      found.push({ x: tile.x, y: tile.y, dist2: dist2, liquid: liq });
    }
  }
  found.sort(function(a, b){ return a.dist2 - b.dist2; });
  if (maxCount != null && maxCount > 0 && found.length > maxCount) found.length = maxCount;
  return found;
}

function placePowerCluster(team, baseX, baseY, ignoreReserveItems) {
  var node = clampToBounds(baseX - 2, baseY + 1);
  var nodeBlock = pickPowerNodeBlock(team, ignoreReserveItems);
  if (nodeBlock == null) return false;
  var nodePlaced = placeBlock(nodeBlock, node.x, node.y, 0, team, ignoreReserveItems);

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
    placeBlock(panelBlock, p.x, p.y, 0, team, ignoreReserveItems);
  }
  }

  var batt = clampToBounds(node.x + 1, node.y + 1);
  placeBlock(Blocks.battery, batt.x, batt.y, 0, team, ignoreReserveItems);

  if (nodePlaced) state.powerClusters++;
  return nodePlaced;
}

function scoreProducedItemValue(outputItem, team, core, profile) {
  if (outputItem == null) return 0;
  var entry = null;
  if (profile != null) {
    var key = readContentName(outputItem);
    entry = key != "" ? profile[key] : null;
  }
  if (entry == null) entry = getDemandProfileEntry(team, core, outputItem);
  if (entry == null) return 0;
  var builtPenalty = entry.producersBuilt <= 0 ? 18 : (8 / (1 + entry.producersBuilt));
  return entry.total * 0.8 + entry.criticality * 0.7 + entry.scarcity * 35 + builtPenalty + entry.tier * 4 + entry.chainDemand * 2.2;
}

function strategicInputPressureBonus(block, team, core, profile) {
  if (block == null || block.requirements == null) return 0;
  var bonus = 0;
  eachSeq(block.requirements, function(stack){
    if (stack == null || stack.item == null) return;
    var entry = getDemandProfileEntry(team, core, stack.item);
    if (entry == null) return;
    bonus += entry.criticality * 0.08 + entry.scarcity * 8;
  });
  return bonus;
}

function scoreIndustryBlock(block, team, core, strategyName) {
  if (block == null || !isFactoryBlock(block)) return -999999;
  if (!blockUnlocked(block)) return -999999;
  if (!coreHasItemsFor(block, team)) return -999999;
  var profile = getContentDemandProfile(team, core);
  var score = 50;
  var strat = currentStrategyName(strategyName);
  var role = factoryRoleForBlock(block);
  var existing = countBlocks(team, block);
  if (existing > 0) score -= existing * 18;
  if (role == "air") score += strat == "aggressive" ? 18 : 8;
  if (role == "naval") score += strat == "aggressive" ? 10 : 4;
  if (role == "ground") score += 10;
  if (readContentName(block).indexOf("reconstructor") >= 0) score += strat == "economic" ? 12 : 8;
  if (readContentName(block).indexOf("assembler") >= 0) score += 10;
  var options = collectFactoryPlanOptions(block);
  var bestCapability = 0;
  for (var i = 0; i < options.length; i++) {
    var option = options[i];
    if (option == null || option.unit == null) continue;
    var capability = unitCapabilityScore(option.unit);
    if (capability > bestCapability) bestCapability = capability;
  }
  score += Math.min(40, options.length * 4 + bestCapability * 0.08);
  var outputs = blockOutputItems(block);
  for (var j = 0; j < outputs.length; j++) {
    var output = outputs[j];
    if (output == null || output.item == null) continue;
    score += Math.min(75, scoreProducedItemValue(output.item, team, core, profile));
  }
  var chainStatus = computeProductionChainStatus(core, team);
  score += chainStatus.pressure * 10;
  score += Math.max(0, 1 - chainStatus.coverage) * 20;
  score += strategicInputPressureBonus(block, team, core, profile);
  score -= blockCost(block) * 0.12;
  if (core != null && reservePressure(core, team) > 0.55) score -= 12;
  return score;
}

function computeIndustryExpansionPlan(core, team, strategyName) {
  if (core == null) return null;
  if (state.factoryBlocks >= config.maxFactoryBlocks) return null;
  var best = null;
  try {
    Vars.content.blocks().each(function(block){
      if (block == null) return;
      var score = scoreIndustryBlock(block, team, core, strategyName);
      if (score <= 0) return;
      if (best == null || score > best.score) {
        best = { block: block, score: score };
      }
    });
  } catch (e) {
    // ignore
  }
  return best;
}

function placeIndustryBlock(core, team, block) {
  if (core == null || team == null || block == null) return false;
  var cx = core.tile.x;
  var cy = core.tile.y;
  var pos = findPlaceForBlock(block, cx, cy, config.industrySearchRadius, team);
  if (pos == null) return false;
  if (!placeBlock(block, pos.x, pos.y, 0, team)) return false;
  state.factoryBlocks++;
  state.industryBlocks++;

  var step = stepToward(cx, cy, pos.x, pos.y);
  var ux = cx + step.dx;
  var uy = cy + step.dy;
  placeBlock(Blocks.unloader, ux, uy, 0, team);

  var sx = ux + step.dx;
  var sy = uy + step.dy;
  placeConveyorPath(team, sx, sy, pos.x, pos.y, config.maxConveyorSteps);
  placePowerCluster(team, pos.x, pos.y);
  return true;
}

function placeFactoryAndFeeder(core) {
  var team = getTeam();
  var plan = computeIndustryExpansionPlan(core, team, "economic");
  if (plan != null && placeIndustryBlock(core, team, plan.block)) return true;
  placePowerCluster(team, core.tile.x + 4, core.tile.y + 2);
  return false;
}

function buildPlan(core) {
  var team = getTeam();
  var cx = core.tile.x;
  var cy = core.tile.y;

  // 1) Bootstrap industrial generico + energia basica.
  placeFactoryAndFeeder(core);

  // 2) Mineracao guiada pelo plano economico, inclusive para conteudo novo.
  for (var i = 0; i < config.maxDrills; i++) {
    if (!actionMine(core, null)) break;
  }

  // 3) Defesas basicas em cruz ao redor do core.
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
  var unitsTotal = buckets != null ? (buckets.ground.size + buckets.air.size + buckets.support.size) : 0;
  var stageInfo = economyStageInfo(core, team, unitsTotal);
  var econPressure = economicPressure(core, team);
  var resourceOk = copper >= config.attackMinCopper && lead >= config.attackMinLead;
  var stageOk = stageInfo.stage >= config.attackMinEconomyStage;
  var economyOk = econPressure <= config.attackMaxEconomicPressure;
  var forceOk = friendlyForce >= config.attackMinForce && friendlyForce >= enemyThreat * config.attackAdvantageRatio;
  var defenseOk = enemyTurrets <= config.attackMaxEnemyTurrets || friendlyForce >= enemyThreat * config.attackOverwhelmRatio;
  var allowed = resourceOk && stageOk && economyOk && forceOk && defenseOk;
  var reason = "ready";
  if (!resourceOk) reason = "low-resources";
  else if (!stageOk) reason = "low-tech";
  else if (!economyOk) reason = "weak-economy";
  else if (!forceOk) reason = "low-advantage";
  else if (!defenseOk) reason = "heavy-defense";

  return {
    allowed: allowed,
    reason: reason,
    resourceOk: resourceOk,
    stageOk: stageOk,
    economyStage: stageInfo.stage,
    economyOk: economyOk,
    economicPressure: econPressure,
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

function countBlocksNamed(team, names) {
  if (team == null || names == null || names.length == null || names.length == 0) return 0;
  var lookup = {};
  for (var i = 0; i < names.length; i++) lookup[names[i]] = true;
  return countBlocksByPredicate(team, function(b){
    return b.block != null && lookup[b.block.name] === true;
  });
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

function countFactoryBlocks(team) {
  return countBlocksByPredicate(team, function(b){
    return isFactoryBlock(b.block);
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

function countDrillsForItem(team, item) {
  if (item == null) return 0;
  return countBlocksByPredicate(team, function(b){
    if (b.block.group != BlockGroup.drills || b.tile == null) return false;
    var drop = null;
    try {
      drop = b.tile.drop();
    } catch (e) {
      drop = null;
    }
    return drop == item;
  });
}

function economyIndustryStageRequirement(name) {
  if (name == "plastanium") return 2;
  if (name == "silicon") return 1;
  return 0;
}

function economyItemStageRequirement(name) {
  if (name == "thorium" || name == "plastanium") return 3;
  if (name == "titanium") return 2;
  if (name == "graphite" || name == "silicon" || name == "metaglass") return 1;
  return 0;
}

function industryBlueprintByOutput(itemName) {
  if (itemName == null) return null;
  for (var key in industryBlueprints) {
    if (!industryBlueprints.hasOwnProperty(key)) continue;
    var def = industryBlueprints[key];
    if (def == null || def.output == null) continue;
    if (def.output == itemName) return def;
  }
  return null;
}

function pushUniqueName(list, seen, name) {
  if (name == null || name == "") return;
  if (seen[name] === true) return;
  seen[name] = true;
  list.push(name);
}

function economyStageInfo(core, team, unitsTotal) {
  var t = team != null ? team : getTeam();
  var totalUnits = unitsTotal != null ? unitsTotal : 0;
  var graphiteFactories = t != null ? countIndustryFactories(t, "graphite") : 0;
  var siliconFactories = t != null ? countIndustryFactories(t, "silicon") : 0;
  var plastaniumFactories = t != null ? countIndustryFactories(t, "plastanium") : 0;
  var industryFactories = graphiteFactories + siliconFactories + plastaniumFactories;
  var factoryBlocks = t != null ? countFactoryBlocks(t) : state.factoryBlocks;
  var factoryProfile = t != null ? computeFactoryCapacityProfile(t) : {
    factoryCapacity: 0,
    upgradeCapacity: 0,
    factoryVariety: 0,
    mobilityCapacity: 0,
    supportCapacity: 0,
    unitCapacity: 0
  };
  var graphite = coreItemCount(core, itemByName("graphite"));
  var silicon = coreItemCount(core, itemByName("silicon"));
  var titanium = coreItemCount(core, itemByName("titanium"));
  var plastanium = coreItemCount(core, itemByName("plastanium"));
  var thorium = coreItemCount(core, itemByName("thorium"));
  var drills = state.drillCount;
  var stage = 0;

  if (
    drills >= Math.min(2, config.maxDrills) ||
    graphiteFactories > 0 ||
    siliconFactories > 0 ||
    graphite >= 40 ||
    silicon >= 30
  ) {
    stage = 1;
  }

  if (
    siliconFactories > 0 ||
    factoryBlocks > 0 ||
    titanium >= 50 ||
    (graphiteFactories > 0 && silicon >= 50) ||
    factoryProfile.factoryCapacity >= 1.5
  ) {
    stage = 2;
  }

  if (
    plastaniumFactories > 0 ||
    factoryBlocks >= 2 ||
    factoryProfile.upgradeCapacity >= 1.5 ||
    (siliconFactories > 0 && titanium >= 80) ||
    (factoryProfile.factoryCapacity >= 2.2 && totalUnits >= Math.max(6, Math.floor(config.attackMinForce * 0.7)))
  ) {
    stage = 3;
  }

  if (
    (plastaniumFactories > 0 && factoryBlocks >= 2) ||
    plastanium >= 50 ||
    thorium >= 60 ||
    factoryProfile.upgradeCapacity >= 3.5
  ) {
    stage = 4;
  }

  return {
    stage: stage,
    industryFactories: industryFactories,
    graphiteFactories: graphiteFactories,
    siliconFactories: siliconFactories,
    plastaniumFactories: plastaniumFactories,
    factoryBlocks: factoryBlocks,
    unitsTotal: totalUnits
  };
}

function allowedDrillCapacity(stageInfo, team) {
  var base = config.maxDrills != null ? config.maxDrills : 5;
  var softCap = config.priorityDrillCap != null ? Math.max(base, config.priorityDrillCap) : base;
  var stage = stageInfo != null && stageInfo.stage != null ? stageInfo.stage : 0;
  var cap = base + Math.max(0, stage);
  if (team != null && countIndustryFactories(team, "plastanium") > 0) cap += 1;
  if (cap < base) cap = base;
  if (cap > softCap) cap = softCap;
  return cap;
}

function buildEconomyIndustryOrder(stageInfo) {
  var stage = stageInfo != null && stageInfo.stage != null ? stageInfo.stage : 0;
  var order = [];
  var seen = {};
  pushUniqueName(order, seen, "graphite");
  if (stage >= 1) pushUniqueName(order, seen, "silicon");
  if (stage >= 2) pushUniqueName(order, seen, "plastanium");
  return order;
}

function buildEconomyMiningOrder(stageInfo) {
  var stage = stageInfo != null && stageInfo.stage != null ? stageInfo.stage : 0;
  var order = [];
  var seen = {};
  if (config.economicMiningRoadmap != null) {
    for (var i = 0; i < config.economicMiningRoadmap.length; i++) {
      var entry = config.economicMiningRoadmap[i];
      if (entry == null || entry.item == null) continue;
      if (stage < economyItemStageRequirement(entry.item)) continue;
      pushUniqueName(order, seen, entry.item);
    }
  }
  var modules = buildEconomyIndustryOrder(stageInfo);
  for (var m = 0; m < modules.length; m++) {
    var def = industryBlueprints[modules[m]];
    if (def == null || def.inputs == null) continue;
    for (var j = 0; j < def.inputs.length; j++) {
      var input = def.inputs[j];
      if (input == null || input.name == null) continue;
      pushUniqueName(order, seen, input.name);
    }
  }
  return order;
}

function rankIndustryNeeds(core, team) {
  var t = team != null ? team : getTeam();
  var stageInfo = economyStageInfo(core, t);
  var stage = stageInfo != null && stageInfo.stage != null ? stageInfo.stage : 0;
  var needs = [];
  for (var key in industryBlueprints) {
    if (!industryBlueprints.hasOwnProperty(key)) continue;
    var def = industryBlueprints[key];
    if (def == null) continue;
    var count = countIndustryFactories(t, key);
    var maxFactories = def.maxFactories != null ? def.maxFactories : 1;
    var outputItem = itemByName(def.output);
    var outputEntry = outputItem != null ? getDemandProfileEntry(t, core, outputItem) : null;
    var outputTarget = industryOutputTarget(key);
    var outputStock = outputItem != null ? coreItemCount(core, outputItem) : 0;
    var outputPressure = outputTarget > 0 ? clamp01((outputTarget - outputStock) / Math.max(1, outputTarget)) : 0;
    if (outputEntry != null) outputPressure = Math.max(outputPressure, outputEntry.scarcity != null ? outputEntry.scarcity : 0);
    var inputPressure = 0;
    var missingInputs = 0;
    if (def.inputs != null) {
      for (var i = 0; i < def.inputs.length; i++) {
        var input = def.inputs[i];
        if (input == null || input.name == null) continue;
        var inputItem = itemByName(input.name);
        if (inputItem == null) continue;
        var inputEntry = getDemandProfileEntry(t, core, inputItem);
        var inputTarget = industryInputTarget(key, input.name);
        var reserve = inputTarget > 0 ? inputTarget : reserveFor(inputItem, t, core, inputEntry);
        var inputStock = coreItemCount(core, inputItem);
        var pressure = reserve > 0 ? clamp01((reserve - inputStock) / Math.max(1, reserve)) : 0;
        pressure = Math.max(pressure, resourcePressure(core, inputItem, t, inputEntry));
        if (countDrillsForItem(t, inputItem) <= 0) {
          pressure += 0.2;
          missingInputs++;
        }
        if (pressure > inputPressure) inputPressure = pressure;
      }
    }
    if (inputPressure > 1) inputPressure = 1;
    var stagePenalty = stage < economyIndustryStageRequirement(key) ? (economyIndustryStageRequirement(key) - stage) * 22 : 0;
    var demandScore = 0;
    if (outputEntry != null) {
      demandScore += outputEntry.criticality != null ? outputEntry.criticality * 0.7 : 0;
      demandScore += outputEntry.scarcity != null ? outputEntry.scarcity * 30 : 0;
      demandScore += outputEntry.chainDemand != null ? outputEntry.chainDemand * 2 : 0;
    }
    var score = outputPressure * 80 + inputPressure * 35 + demandScore;
    if (count < maxFactories) score += (maxFactories - count) * 18;
    if (count <= 0) score += 12;
    score += missingInputs * 10;
    score -= count * 10;
    score -= stagePenalty;
    if (count >= maxFactories && outputPressure <= 0.05 && inputPressure <= 0.05) score -= 15;
    needs.push({
      name: key,
      def: def,
      count: count,
      pressure: Math.max(outputPressure, inputPressure),
      outputPressure: outputPressure,
      inputPressure: inputPressure,
      score: Math.round(score * 100) / 100
    });
  }
  needs.sort(function(a, b){ return b.score - a.score; });
  return needs;
}

function upgradeEconomyScore(team) {
  var t = team != null ? team : getTeam();
  var score = 0;
  var drill = pickDrillBlock(t, industryReserveIgnore);
  var powerNode = pickPowerNodeBlock(t, industryReserveIgnore);
  var pump = pickPumpBlock(t, industryReserveIgnore);
  var conveyor = pickConveyorBlock(t, industryReserveIgnore);
  var conduit = pickConduitBlock(t, industryReserveIgnore);
  score += countUpgradeableOrderedBuilds(t, config.blockPrefs != null ? config.blockPrefs.drills : null, drill, null) * 18;
  score += countUpgradeableOrderedBuilds(t, config.blockPrefs != null ? config.blockPrefs.powerNodes : null, powerNode, null) * 10;
  score += countUpgradeableOrderedBuilds(t, config.blockPrefs != null ? config.blockPrefs.pumps : null, pump, null) * 8;
  score += countUpgradeableOrderedBuilds(t, config.blockPrefs != null ? config.blockPrefs.conveyors : null, conveyor, null) * 6;
  score += countUpgradeableOrderedBuilds(t, config.blockPrefs != null ? config.blockPrefs.conduits : null, conduit, null) * 5;
  return score;
}

function tryUpgradeEconomy(team) {
  var t = team != null ? team : getTeam();
  var drill = pickDrillBlock(t, industryReserveIgnore);
  if (tryUpgradeOrderedBuild(t, config.blockPrefs != null ? config.blockPrefs.drills : null, drill, null, industryReserveIgnore)) return true;
  var powerNode = pickPowerNodeBlock(t, industryReserveIgnore);
  if (tryUpgradeOrderedBuild(t, config.blockPrefs != null ? config.blockPrefs.powerNodes : null, powerNode, null, industryReserveIgnore)) return true;
  var pump = pickPumpBlock(t, industryReserveIgnore);
  if (tryUpgradeOrderedBuild(t, config.blockPrefs != null ? config.blockPrefs.pumps : null, pump, null, industryReserveIgnore)) return true;
  var conveyor = pickConveyorBlock(t, industryReserveIgnore);
  if (tryUpgradeOrderedBuild(t, config.blockPrefs != null ? config.blockPrefs.conveyors : null, conveyor, null, industryReserveIgnore)) return true;
  var conduit = pickConduitBlock(t, industryReserveIgnore);
  if (tryUpgradeOrderedBuild(t, config.blockPrefs != null ? config.blockPrefs.conduits : null, conduit, null, industryReserveIgnore)) return true;
  return false;
}

function computeMiningPlanForItem(core, team, item) {
  if (core == null || item == null) return null;
  var cx = core.tile.x;
  var cy = core.tile.y;
  var radius = config.priorityOreSearchRadius != null ? Math.max(config.oreSearchRadius, config.priorityOreSearchRadius) : config.oreSearchRadius;
  var ores = findOreTiles(cx, cy, radius, -1);
  if (ores == null || ores.length == 0) return null;
  var entry = miningRoadmapEntry(item, core, team);
  var profileEntry = getDemandProfileEntry(team, core, item);
  var reserve = reserveFor(item, team, core, profileEntry);
  var reservePressureValue = resourcePressure(core, item, team, profileEntry);
  var demand = entry != null && entry.demand != null ? entry.demand : (profileEntry != null ? profileEntry.total : contentDemandForItem(team, item));
  var priority = entry != null && entry.priority != null ? entry.priority : (reserve > 0 ? 1.0 : 0.6);
  var criticality = entry != null && entry.criticality != null ? entry.criticality : (profileEntry != null ? profileEntry.criticality : 0);
  var scarcity = entry != null && entry.scarcity != null ? entry.scarcity : (profileEntry != null ? profileEntry.scarcity : 0);
  var itemDrills = countDrillsMiningItem(team, item);
  var minDrills = entry != null && entry.minDrills != null ? entry.minDrills : 0;
  var underDrilled = itemDrills < minDrills;
  var critical = entry != null && entry.critical === true;
  var criticalGate = config.mineCriticalPressureGate != null ? config.mineCriticalPressureGate : 0;
  var bypassCap = miningBypassCap(entry);
  var canBypass = critical && reservePressureValue >= criticalGate && state.drillCount < bypassCap;
  var underBaseCap = state.drillCount < config.maxDrills;
  if (!underBaseCap && !canBypass) return null;
  var baseScore = config.mineRoadmapBaseScore != null ? config.mineRoadmapBaseScore : 0;
  var distanceWeight = config.mineRoadmapDistanceWeight != null ? config.mineRoadmapDistanceWeight : 1;
  var best = null;
  for (var i = 0; i < ores.length; i++) {
    var ore = ores[i];
    if (ore == null || ore.item == null) continue;
    if (ore.item != item && (ore.item.name == null || item.name == null || ore.item.name != item.name)) continue;
    var tile = tileAt(ore.x, ore.y);
    if (tile == null || tile.block() != Blocks.air) continue;
    var score = baseScore;
    score += reservePressureValue * 100;
    score += priority * 30;
    score += Math.min(demand, 24) * 8;
    score += criticality * 1.2;
    score += scarcity * 40;
    if (underDrilled) score += config.mineRoadmapUnderDrilledBonus != null ? config.mineRoadmapUnderDrilledBonus : 25;
    if (itemDrills <= 0) score += 18;
    score -= Math.sqrt(ore.dist2) * distanceWeight;
    if (best == null || score > best.score) {
      best = {
        ore: ore,
        item: item,
        itemName: item.name,
        score: score,
        pressure: reservePressureValue,
        reservePressure: reservePressureValue,
        reserve: reserve,
        demand: demand,
        criticality: criticality,
        scarcity: scarcity,
        allowBypass: !underBaseCap && canBypass
      };
    }
  }
  return best;
}

function ensureMiningForItem(core, itemName, seen) {
  if (core == null || itemName == null || itemName == "") return false;
  var loopGuard = seen != null ? seen : {};
  if (loopGuard[itemName] === true) return false;
  loopGuard[itemName] = true;
  var team = getTeam();
  var item = itemByName(itemName);
  if (item != null) {
    var directPlan = computeMiningPlanForItem(core, team, item);
    if (directPlan != null && directPlan.ore != null) {
      var stageInfo = economyStageInfo(core, team);
      if (state.drillCount >= allowedDrillCapacity(stageInfo, team) && directPlan.allowBypass !== true) return false;
      var drill = pickDrillBlock(team, industryReserveIgnore);
      if (drill == null || !coreHasItemsFor(drill, team)) return false;
      if (!placeBlock(drill, directPlan.ore.x, directPlan.ore.y, 0, team)) return false;
      state.drillCount++;
      var step = stepToward(directPlan.ore.x, directPlan.ore.y, core.tile.x, core.tile.y);
      placeConveyorPath(team, directPlan.ore.x + step.dx, directPlan.ore.y + step.dy, core.tile.x, core.tile.y, config.maxConveyorSteps, null, industryReserveIgnore);
      return true;
    }
  }
  var blueprint = industryBlueprintByOutput(itemName);
  if (blueprint == null || blueprint.inputs == null || blueprint.inputs.length == 0) return false;
  var bestInput = null;
  var bestScore = -999999;
  for (var i = 0; i < blueprint.inputs.length; i++) {
    var input = blueprint.inputs[i];
    if (input == null || input.name == null || loopGuard[input.name] === true) continue;
    var inputItem = itemByName(input.name);
    if (inputItem == null) continue;
    var inputEntry = getDemandProfileEntry(team, core, inputItem);
    var inputTarget = industryInputTarget(blueprint.name, input.name);
    var reserve = inputTarget > 0 ? inputTarget : reserveFor(inputItem, team, core, inputEntry);
    var inputStock = coreItemCount(core, inputItem);
    var pressure = reserve > 0 ? clamp01((reserve - inputStock) / Math.max(1, reserve)) : 0;
    pressure = Math.max(pressure, resourcePressure(core, inputItem, team, inputEntry));
    var score = pressure * 100;
    if (countDrillsForItem(team, inputItem) <= 0) score += 20;
    if (inputStock < inputTarget) score += (inputTarget - inputStock) * 0.1;
    if (score > bestScore) {
      bestScore = score;
      bestInput = input.name;
    }
  }
  return bestInput != null ? ensureMiningForItem(core, bestInput, loopGuard) : false;
}

function countUpgradeableOrderedBuilds(team, list, targetBlock, predicate) {
  if (team == null || targetBlock == null || list == null || list.length == null) return 0;
  var targetIndex = blockOrderIndex(targetBlock, list);
  if (targetIndex <= 0) return 0;
  return countBlocksByPredicate(team, function(b){
    if (b == null || b.block == null || b.tile == null) return false;
    var idx = blockOrderIndex(b.block, list);
    if (idx < 0 || idx >= targetIndex) return false;
    if (b.block.size != null && targetBlock.size != null && b.block.size != targetBlock.size) return false;
    if (predicate != null && !predicate(b, targetBlock)) return false;
    return true;
  });
}

function tryUpgradeOrderedBuild(team, list, targetBlock, predicate, ignoreReserveItems) {
  if (team == null || targetBlock == null || list == null || list.length == null) return false;
  var targetIndex = blockOrderIndex(targetBlock, list);
  if (targetIndex <= 0) return false;
  var upgraded = false;
  Groups.build.each(function(b){
    if (upgraded || b == null || b.team != team || b.block == null || b.tile == null) return;
    var idx = blockOrderIndex(b.block, list);
    if (idx < 0 || idx >= targetIndex) return;
    if (b.block.size != null && targetBlock.size != null && b.block.size != targetBlock.size) return;
    if (predicate != null && !predicate(b, targetBlock)) return;
    var rotation = 0;
    try {
      rotation = b.rotation;
    } catch (e) {
      rotation = 0;
    }
    upgraded = placeBlock(targetBlock, b.tile.x, b.tile.y, rotation, team, ignoreReserveItems);
  });
  return upgraded;
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

function isManagedAILogicController(build) {
  if (build == null || build.tile == null || build.block == null) return false;
  if (!isLogicBlock(build.block)) return false;
  var key = build.tile.x + "," + build.tile.y;
  var tracked = state.logicControllers;
  if (tracked != null) {
    if (tracked.ground != null && (tracked.ground.x + "," + tracked.ground.y) == key) return true;
    if (tracked.air != null && (tracked.air.x + "," + tracked.air.y) == key) return true;
    if (tracked.naval != null && (tracked.naval.x + "," + tracked.naval.y) == key) return true;
  }
  var code = null;
  try {
    code = build.code;
  } catch (e) {
    code = null;
  }
  if (code == null) return false;
  code = String(code);
  return code.indexOf("uradar enemy any any distance 1 target") >= 0 &&
         code.indexOf("ucontrol approach tx ty") >= 0 &&
         code.indexOf("ucontrol move rallyX rallyY") >= 0;
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
  var team = getTeam();
  var core = getCore(team);
  if (core == null) return;
  if (!enabled || !config.logicEnabled) {
    disableManagedLogicControllers(core, team);
    return;
  }
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

function disableManagedLogicControllers(core, team) {
  if (core == null) return;
  var cx = core.tile.x;
  var cy = core.tile.y;
  var radius = config.logicControlRadius;
  var maxDist2 = radius * radius;
  Groups.build.each(function(b){
    if (b == null || b.team != team || b.block == null || b.tile == null) return;
    if (!isLogicBlock(b.block)) return;
    var dx = b.tile.x - cx;
    var dy = b.tile.y - cy;
    if (dx * dx + dy * dy > maxDist2) return;
    if (!isManagedAILogicController(b)) return;
    try {
      b.enabled = false;
    } catch (e) {
      // ignore
    }
  });
  state.logicControllers = { ground: null, air: null, naval: null };
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

function priorityMineItems(core, team) {
  var profile = getContentDemandProfile(team != null ? team : getTeam(), core);
  var ranked = [];
  if (profile != null) {
    for (var key in profile) {
      if (!profile.hasOwnProperty(key)) continue;
      var entry = profile[key];
      if (entry == null || entry.item == null || !(entry.total > 0)) continue;
      ranked.push(entry);
    }
  }
  ranked.sort(function(a, b){
    var bc = b != null && b.criticality != null ? b.criticality : 0;
    var ac = a != null && a.criticality != null ? a.criticality : 0;
    if (bc != ac) return bc - ac;
    var bs = b != null && b.scarcity != null ? b.scarcity : 0;
    var as = a != null && a.scarcity != null ? a.scarcity : 0;
    return bs - as;
  });
  var items = [];
  for (var i = 0; i < ranked.length && i < 6; i++) items.push(ranked[i].item);
  return items;
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
  var stageInfo = economyStageInfo(core, team);
  var priority = priorityMineItems(core, team);
  for (var p = 0; p < priority.length; p++) {
    var item = priority[p];
    if (item == null || item.name == null) continue;
    if (ensureMiningForItem(core, item.name)) return true;
  }
  if (state.drillCount >= allowedDrillCapacity(stageInfo, team)) return false;
  var drill = pickDrillBlock(team, industryReserveIgnore);
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
  placeConveyorPath(team, sx, sy, cx, cy, config.maxConveyorSteps, null, industryReserveIgnore);
  return true;
}

function ensureIndustryLiquidFeed(team, factoryPos, def) {
  if (def == null || def.liquid == null) return false;
  var liquid = liquidByName(def.liquid.name);
  if (liquid == null) return false;
  var range = config.priorityOreSearchRadius != null ? config.priorityOreSearchRadius : config.liquidSearchRadius;
  var pumpBuild = findExistingPumpForLiquid(team, liquid, factoryPos.x, factoryPos.y, range);
  var changed = false;
  if (pumpBuild == null) {
    var pumpBlock = pickPumpBlock(team, industryReserveIgnore);
    if (pumpBlock == null || !coreHasItemsFor(pumpBlock, team, industryReserveIgnore)) return false;
    var tiles = findLiquidTilesByType(factoryPos.x, factoryPos.y, range, liquid, 1);
    if (tiles.length == 0) return false;
    if (!placeBlock(pumpBlock, tiles[0].x, tiles[0].y, 0, team, industryReserveIgnore)) return false;
    state.pumpCount++;
    pumpBuild = tileAt(tiles[0].x, tiles[0].y).build;
    changed = true;
  }
  if (pumpBuild == null || pumpBuild.tile == null) return changed;
  var preferVertical = def.liquid.preferVertical === true;
  var step = stepTowardAxis(pumpBuild.tile.x, pumpBuild.tile.y, factoryPos.x, factoryPos.y, preferVertical);
  changed = placeConduitPath(team, pumpBuild.tile.x + step.dx, pumpBuild.tile.y + step.dy, factoryPos.x, factoryPos.y, config.maxConduitSteps, preferVertical, industryReserveIgnore) || changed;
  return changed;
}

function ensureIndustryModule(core, name) {
  var def = industryBlueprints[name];
  if (def == null || core == null || core.tile == null) return false;
  var team = getTeam();
  var block = pickIndustryBuildBlock(name, team);
  if (block == null) return false;
  var used = {};
  var existingCount = countIndustryFactories(team, name);
  var shiftX = def.offset.dx == 0 ? existingCount * 3 : existingCount * (def.offset.dx > 0 ? 3 : -3);
  var shiftY = def.offset.dy == 0 ? existingCount * 3 : existingCount * (def.offset.dy > 0 ? 3 : -3);
  var prefer = clampOffset(core.tile.x, core.tile.y, def.offset.dx + shiftX, def.offset.dy + shiftY);
  var factory = ensureConfiguredBlock(block, prefer.x, prefer.y, 2, 0, team, null, used, industryReserveIgnore);
  if (factory == null) return false;
  var changed = factory.created;
  if (factory.created) changed = placePowerCluster(team, factory.x, factory.y, industryReserveIgnore) || changed;

  for (var i = 0; i < def.inputs.length; i++) {
    var input = def.inputs[i];
    var item = itemByName(input.name);
    if (item == null) continue;
    var feederPref = clampOffset(core.tile.x, core.tile.y, input.coreOffset.dx, input.coreOffset.dy);
    var feeder = ensureConfiguredBlock(Blocks.unloader, feederPref.x, feederPref.y, 1, 0, team, item, used, industryReserveIgnore);
    if (feeder == null) continue;
    changed = feeder.created || changed;
    var stepIn = stepTowardAxis(feeder.x, feeder.y, factory.x, factory.y, input.preferVertical === true);
    changed = placeConveyorPath(team, feeder.x + stepIn.dx, feeder.y + stepIn.dy, factory.x, factory.y, config.maxConveyorSteps, input.preferVertical === true, industryReserveIgnore) || changed;
  }

  if (def.outputFeed != null) {
    var outPref = clampOffset(factory.x, factory.y, def.outputFeed.factoryOffset.dx, def.outputFeed.factoryOffset.dy);
    var outItem = itemByName(def.output);
    var outloader = ensureConfiguredBlock(Blocks.unloader, outPref.x, outPref.y, 1, 0, team, outItem, used, industryReserveIgnore);
    if (outloader != null) {
      changed = outloader.created || changed;
      var stepOut = stepTowardAxis(outloader.x, outloader.y, core.tile.x, core.tile.y, def.outputFeed.preferVertical === true);
      changed = placeConveyorPath(team, outloader.x + stepOut.dx, outloader.y + stepOut.dy, core.tile.x, core.tile.y, config.maxConveyorSteps, def.outputFeed.preferVertical === true, industryReserveIgnore) || changed;
    }
  }

  changed = ensureIndustryLiquidFeed(team, { x: factory.x, y: factory.y }, def) || changed;
  return changed;
}

function actionIndustry(core) {
  var team = getTeam();
  var stageInfo = economyStageInfo(core, team);
  var mineOrder = buildEconomyMiningOrder(stageInfo);
  for (var m = 0; m < mineOrder.length; m++) {
    if (ensureMiningForItem(core, mineOrder[m])) return true;
  }

  var stageFactories = buildEconomyIndustryOrder(stageInfo);
  for (var f = 0; f < stageFactories.length; f++) {
    if (ensureIndustryModule(core, stageFactories[f])) return true;
  }

  var needs = rankIndustryNeeds(core, team);
  for (var i = 0; i < needs.length; i++) {
    var need = needs[i];
    var def = need.def;
    for (var j = 0; j < def.inputs.length; j++) {
      var input = def.inputs[j];
      var item = itemByName(input.name);
      if (item == null) continue;
      var inputTarget = industryInputTarget(need.name, input.name);
      if (countDrillsForItem(team, item) <= 0 || coreItemCount(core, item) < inputTarget) {
        if (ensureMiningForItem(core, input.name)) return true;
      }
    }
    if (need.count < def.maxFactories || need.pressure > 0.25) {
      if (ensureIndustryModule(core, need.name)) return true;
    }
  }
  return tryUpgradeEconomy(team);
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

function actionIndustry(core, plan) {
  var team = getTeam();
  var expansion = plan != null ? plan : computeIndustryExpansionPlan(core, team, state.currentStrategy);
  if (expansion == null || expansion.block == null) return false;
  return placeIndustryBlock(core, team, expansion.block);
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

function buildActionContext(core, team, enemyCore, enemies, buckets, attackPlan, miningPlan, powerStats, stageInfo, chainStatus, ammoProfile, strategy, industryPlan, beforeState, topDemandEntry, topIndustryNeed, reservePressure, powerNeedScore, missingProducers) {
  return {
    core: core,
    team: team,
    enemyCore: enemyCore,
    enemies: enemies,
    buckets: buckets,
    attackPlan: attackPlan,
    miningPlan: miningPlan,
    powerStats: powerStats,
    stageInfo: stageInfo,
    chainStatus: chainStatus,
    ammoProfile: ammoProfile,
    strategy: strategy,
    industryPlan: industryPlan,
    beforeState: beforeState,
    topDemandEntry: topDemandEntry,
    topIndustryNeed: topIndustryNeed,
    reservePressure: reservePressure,
    powerNeedScore: powerNeedScore,
    missingProducers: missingProducers
  };
}

function findActionEntry(actions, name) {
  if (actions == null || name == null) return null;
  for (var i = 0; i < actions.length; i++) {
    var action = actions[i];
    if (action != null && action.name == name) return action;
  }
  return null;
}

function applySituationalActionGuards(actions, ctx) {
  if (actions == null || ctx == null) return;
  var coreHealth = 1;
  if (ctx.beforeState != null && ctx.beforeState.coreHealthFrac != null) coreHealth = ctx.beforeState.coreHealthFrac;
  coreHealth = clamp01(coreHealth);

  var enemies = ctx.enemies != null ? ctx.enemies : 0;
  var enemyTurrets = ctx.attackPlan != null && ctx.attackPlan.enemyTurrets != null ? ctx.attackPlan.enemyTurrets : 0;
  var ammoPressure = 0;
  if (ctx.ammoProfile != null) {
    ammoPressure = Math.max(
      ctx.ammoProfile.kineticPressure || 0,
      ctx.ammoProfile.explosivePressure || 0,
      ctx.ammoProfile.energyPressure || 0
    );
  }

  var defenseEmergency = (1 - coreHealth) * 90 + Math.min(45, enemies * 7) + enemyTurrets * 4 + ammoPressure * 10;
  var reservePressure = ctx.reservePressure != null ? ctx.reservePressure : 0;
  var chainPressure = ctx.chainStatus != null && ctx.chainStatus.pressure != null ? ctx.chainStatus.pressure : 0;
  var chainCoverage = ctx.chainStatus != null && ctx.chainStatus.coverage != null ? ctx.chainStatus.coverage : 1;
  var economyEmergency = reservePressure * 70 + chainPressure * 30 + Math.max(0, 1 - chainCoverage) * 25;
  if (ctx.missingProducers != null) economyEmergency += Math.min(24, ctx.missingProducers * 6);
  if (ctx.topDemandEntry != null && ctx.topDemandEntry.producersBuilt <= 0) economyEmergency += 12;

  var powerEmergency = ctx.powerNeedScore != null ? ctx.powerNeedScore : 0;
  if (ctx.powerStats != null && ctx.powerStats.avg != null) powerEmergency += (1 - clamp01(ctx.powerStats.avg)) * 45;

  var attackConfidence = 0;
  if (ctx.attackPlan != null) {
    if (ctx.attackPlan.allowed) attackConfidence += 30;
    if (ctx.attackPlan.canCommit) attackConfidence += 35;
    if (ctx.attackPlan.shouldRally) attackConfidence += 10;
    var forceEdge =
      (ctx.attackPlan.friendlyForce != null ? ctx.attackPlan.friendlyForce : 0) -
      (ctx.attackPlan.enemyThreat != null ? ctx.attackPlan.enemyThreat : 0);
    attackConfidence += Math.max(-30, Math.min(35, forceEdge * 4));
    attackConfidence -= enemyTurrets * 6;
  }

  var defend = findActionEntry(actions, "defend");
  var mine = findActionEntry(actions, "mine");
  var industry = findActionEntry(actions, "industry");
  var power = findActionEntry(actions, "power");
  var thermal = findActionEntry(actions, "thermal");
  var liquid = findActionEntry(actions, "liquid");
  var attackWave = findActionEntry(actions, "attackWave");
  var rally = findActionEntry(actions, "rally");
  var noop = findActionEntry(actions, "noop");

  if (defend != null && defenseEmergency > 30) {
    defend.score = Math.max(defend.score, defend.baseScore + defenseEmergency);
  }
  if (mine != null && economyEmergency > 35) {
    mine.score = Math.max(mine.score, mine.baseScore + economyEmergency * 0.65);
  }
  if (industry != null && economyEmergency > 35) {
    industry.score = Math.max(industry.score, industry.baseScore + economyEmergency * 0.5);
  }
  if (power != null && powerEmergency > 30) {
    power.score = Math.max(power.score, power.baseScore + powerEmergency);
  }
  if (thermal != null && powerEmergency > 45) {
    thermal.score = Math.max(thermal.score, thermal.baseScore + powerEmergency * 0.8);
  }
  if (liquid != null && ctx.topIndustryNeed != null && ctx.topIndustryNeed.name == "plastanium") {
    liquid.score = Math.max(liquid.score, liquid.baseScore + 30);
  }

  var blockAttack =
    defenseEmergency > 60 ||
    economyEmergency > 75 ||
    powerEmergency > 70 ||
    coreHealth < 0.65;

  if (blockAttack) {
    if (attackWave != null) attackWave.score = -999999;
    if (rally != null) rally.score = Math.min(rally.score, 20);
  } else if (attackConfidence > 45) {
    if (attackWave != null) attackWave.score = Math.max(attackWave.score, attackWave.baseScore + attackConfidence);
    if (rally != null && ctx.attackPlan != null && ctx.attackPlan.shouldRally) {
      rally.score = Math.max(rally.score, rally.baseScore + attackConfidence * 0.8);
    }
  }

  if (noop != null && (defenseEmergency > 25 || economyEmergency > 25 || powerEmergency > 25 || attackConfidence > 35)) {
    noop.score = -999999;
  }
}

function sortMicroDecisions(list) {
  if (list == null) return [];
  list.sort(function(a, b){
    var bs = b != null && b.score != null ? b.score : 0;
    var as = a != null && a.score != null ? a.score : 0;
    return bs - as;
  });
  return list;
}

function markMicroDecision(actionName, decision) {
  if (actionName == null || decision == null) return;
  var kind = decision.kind != null ? decision.kind : "default";
  state.lastMicroAction = actionName + ":" + kind;
}

function selectMicroDecision(actionName, ctx, decisions) {
  if (decisions == null || decisions.length == 0) return null;
  var learnedScores = microPolicyScores(actionName, ctx, decisions);
  var learnedAvailable = false;
  if (learnedScores != null) {
    for (var li = 0; li < decisions.length; li++) {
      var d0 = decisions[li];
      if (d0 != null && d0.actionId != null && learnedScores[d0.actionId] != null) {
        learnedAvailable = true;
        break;
      }
    }
  }
  var scored = [];
  for (var i = 0; i < decisions.length; i++) {
    var decision = decisions[i];
    if (decision == null) continue;
    var heuristicScore = decision.score != null ? decision.score : 0;
    var actionId = decision.actionId != null ? decision.actionId : null;
    var learnedScore = (learnedScores != null && actionId != null && learnedScores[actionId] != null) ? learnedScores[actionId] : null;
    var finalScore = heuristicScore;
    var selectionMode = "heuristic-fallback";
    if (learnedAvailable) {
      selectionMode = "micro-policy";
      finalScore = learnedScore != null ? learnedScore : -999999;
    }
    scored.push({
      decision: decision,
      heuristicScore: heuristicScore,
      learnedScore: learnedScore,
      finalScore: finalScore,
      selectionMode: selectionMode
    });
  }
  scored.sort(function(a, b){ return b.finalScore - a.finalScore; });
  if (scored.length == 0) return null;
  return {
    picked: scored[0].decision,
    scored: scored,
    learnedAvailable: learnedAvailable
  };
}

function chooseMineMicroDecision(ctx) {
  var core = ctx != null ? ctx.core : null;
  var team = ctx != null ? ctx.team : getTeam();
  var decisions = [];
  var profile = getContentDemandProfile(team, core);
  var priority = priorityMineItems(core, team);
  for (var i = 0; i < priority.length && i < 4; i++) {
    var item = priority[i];
    if (item == null || item.name == null) continue;
    var entry = profile != null ? profile[item.name] : null;
    decisions.push({
      actionId: "ensure-" + i,
      kind: "ensure-item",
      score: (entry != null ? entry.criticality : 140) - i * 8,
      itemName: item.name,
      features: {
        optionIndex: i,
        need: entry != null ? entry.criticality / 100 : 1,
        scarcity: entry != null ? entry.scarcity : 0,
        tier: entry != null ? entry.tier / 5 : 0.2,
        value: entry != null ? Math.min(1.2, entry.total / 100) : 1.0
      }
    });
  }
  var plan = ctx != null ? ctx.miningPlan : null;
  if (plan != null && plan.ore != null) {
    decisions.push({
      kind: "ore",
      actionId: "ore-plan",
      score: plan.score != null ? plan.score : 120,
      plan: plan,
      features: {
        optionIndex: decisions.length,
        distance: Math.sqrt(plan.ore.dist2 != null ? plan.ore.dist2 : 0),
        need: plan.criticality != null ? plan.criticality / 100 : (plan.pressure != null ? plan.pressure : 0.5),
        scarcity: plan.scarcity != null ? plan.scarcity : 0,
        tier: plan.reason != null && plan.reason.tier != null ? plan.reason.tier / 5 : 0.2,
        value: plan.demand != null ? Math.min(1.5, plan.demand / 100) : 1.0
      }
    });
  }
  return sortMicroDecisions(decisions);
}

function executeMineMicroDecision(ctx, decision) {
  if (ctx == null || decision == null) return false;
  var core = ctx.core;
  var team = ctx.team;
  if (decision.kind == "ensure-item") {
    return ensureMiningForItem(core, decision.itemName);
  }
  if (decision.kind != "ore" || decision.plan == null || decision.plan.ore == null) return false;
  var stageInfo = economyStageInfo(core, team);
  if (state.drillCount >= allowedDrillCapacity(stageInfo, team)) return false;
  var drill = pickDrillBlock(team, industryReserveIgnore);
  if (drill == null || !coreHasItemsFor(drill, team)) return false;
  var ore = decision.plan.ore;
  if (!placeBlock(drill, ore.x, ore.y, 0, team)) return false;
  state.drillCount++;
  var cx = core.tile.x;
  var cy = core.tile.y;
  var step = stepToward(ore.x, ore.y, cx, cy);
  placeConveyorPath(team, ore.x + step.dx, ore.y + step.dy, cx, cy, config.maxConveyorSteps, null, industryReserveIgnore);
  return true;
}

function chooseDefendMicroDecision(ctx) {
  if (ctx == null || ctx.core == null) return null;
  var core = ctx.core;
  var team = ctx.team;
  if (state.turretCount >= config.maxTurrets) return null;
  var turret = pickTurretBlock(team);
  if (turret == null || !coreHasItemsFor(turret, team)) return null;
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
  var out = [];
  for (var i = 0; i < offsets.length; i++) {
    var pick = offsets[(state.turretCount + i) % offsets.length];
    var off = clampOffset(core.tile.x, core.tile.y, pick.dx, pick.dy);
    var score = 100 - (Math.abs(pick.dx) + Math.abs(pick.dy));
    if (ctx.enemies > 0) score += 20;
    if (ctx.enemyCore != null && ctx.enemyCore.tile != null) {
      var ddx = off.x - ctx.enemyCore.tile.x;
      var ddy = off.y - ctx.enemyCore.tile.y;
      var towardEnemy = ddx * ddx + ddy * ddy;
      score += 30 / Math.max(1, Math.sqrt(towardEnemy));
    }
    out.push({
      kind: "turret-slot",
      actionId: "slot-" + i,
      score: score,
      turret: turret,
      x: off.x,
      y: off.y,
      features: {
        optionIndex: i,
        distance: Math.sqrt(pick.dx * pick.dx + pick.dy * pick.dy),
        need: ctx.enemies > 0 ? 1 : 0.4,
        risk: ctx.enemyCore != null ? 0.3 : 0.1,
        value: score / 100
      }
    });
  }
  return sortMicroDecisions(out);
}

function executeDefendMicroDecision(ctx, decision) {
  if (ctx == null || decision == null || decision.turret == null) return false;
  if (!placeBlock(decision.turret, decision.x, decision.y, 0, ctx.team)) return false;
  state.turretCount++;
  return true;
}

function chooseIndustryMicroDecision(ctx) {
  if (ctx == null || ctx.core == null) return null;
  var core = ctx.core;
  var team = ctx.team;
  var decisions = [];
  var usedActionIds = {};
  var needs = rankIndustryNeeds(core, team);
  for (var i = 0; i < needs.length && i < 3; i++) {
    var need = needs[i];
    if (need == null) continue;
    decisions.push({ actionId: "module-" + i, kind: "module", score: 120 + need.score, module: need.name, features: { optionIndex: i, need: need.score / 100, value: 1.2 } });
    usedActionIds["module-" + i] = true;
    var def = need.def;
    if (def != null && def.inputs != null) {
      for (var j = 0; j < def.inputs.length; j++) {
        var input = def.inputs[j];
        var item = itemByName(input.name);
        if (item == null) continue;
        var inputTarget = industryInputTarget(need.name, input.name);
        if (countDrillsForItem(team, item) <= 0 || coreItemCount(core, item) < inputTarget) {
          var inputIdx = Math.min(2, j);
          var inputActionId = "mine-input-" + inputIdx;
          if (usedActionIds[inputActionId] === true) continue;
          decisions.push({ actionId: inputActionId, kind: "mine-input", score: 110 + need.score * 0.8, itemName: input.name, module: need.name, features: { optionIndex: decisions.length, need: need.score / 100, value: 0.9 } });
          usedActionIds[inputActionId] = true;
        }
      }
    }
  }
  if (ctx.industryPlan != null && ctx.industryPlan.block != null) {
    decisions.push({ actionId: "expand-factory", kind: "expand-factory", score: 100 + ctx.industryPlan.score, block: ctx.industryPlan.block, features: { optionIndex: decisions.length, need: ctx.industryPlan.score / 100, value: 1.1 } });
  }
  decisions.push({ actionId: "upgrade-economy", kind: "upgrade-economy", score: 70 + (ctx.stageInfo != null ? ctx.stageInfo.stage * 5 : 0), features: { optionIndex: decisions.length, need: 0.5, value: 0.8 } });
  return sortMicroDecisions(decisions);
}

function executeIndustryMicroDecision(ctx, decision) {
  if (ctx == null || decision == null) return false;
  if (decision.kind == "module") return ensureIndustryModule(ctx.core, decision.module);
  if (decision.kind == "mine-input") return ensureMiningForItem(ctx.core, decision.itemName);
  if (decision.kind == "expand-factory" && decision.block != null) return placeIndustryBlock(ctx.core, ctx.team, decision.block);
  if (decision.kind == "upgrade-economy") return tryUpgradeEconomy(ctx.team);
  return false;
}

function chooseAttackWaveMicroDecision(ctx) {
  if (ctx == null || ctx.enemyCore == null || ctx.attackPlan == null || ctx.buckets == null) return null;
  var canWave = waveReady(ctx.buckets);
  var cooled = (state.tick - state.lastWaveTick) >= config.waveCooldown;
  if (!(canWave && cooled && ctx.attackPlan.canCommit)) return null;
  var waveIds = collectWaveIds(ctx.buckets);
  if (waveIds.size <= 0) return null;
  return [{
    kind: "commit-wave",
    actionId: "commit-wave",
    score: 100 + waveIds.size + (ctx.attackPlan.friendlyForce != null ? ctx.attackPlan.friendlyForce : 0),
    waveIds: waveIds,
    target: new Vec2(ctx.enemyCore.x, ctx.enemyCore.y),
    features: { optionIndex: 0, need: ctx.attackPlan.canCommit ? 1 : 0, risk: ctx.attackPlan.enemyTurrets != null ? ctx.attackPlan.enemyTurrets / 10 : 0, value: waveIds.size / 10 }
  }];
}

function executeAttackWaveMicroDecision(ctx, decision) {
  if (ctx == null || decision == null || ctx.enemyCore == null || decision.waveIds == null || decision.waveIds.size <= 0) return false;
  commandUnitIds(ctx.team, decision.waveIds, ctx.enemyCore, decision.target);
  state.lastWaveTick = state.tick;
  state.waveIndex++;
  Log.info("[IA] Onda " + state.waveIndex + " lançada: " + decision.waveIds.size + " unidades.");
  return true;
}

function chooseRallyMicroDecision(ctx) {
  if (ctx == null || ctx.core == null || ctx.enemyCore == null || ctx.buckets == null) return null;
  var rallyIds = collectRallyIds(ctx.buckets);
  if (rallyIds.size <= 0) return null;
  return [{
    kind: "rally-force",
    actionId: "rally-force",
    score: 100 + rallyIds.size,
    rallyIds: rallyIds,
    rallyPoint: getRallyPoint(ctx.core, ctx.enemyCore, config.rallyDistance),
    features: { optionIndex: 0, need: rallyIds.size / 10, value: 0.8 }
  }];
}

function executeRallyMicroDecision(ctx, decision) {
  if (ctx == null || decision == null || decision.rallyIds == null || decision.rallyIds.size <= 0) return false;
  commandUnitIds(ctx.team, decision.rallyIds, null, decision.rallyPoint);
  state.lastRallyTick = state.tick;
  return true;
}

function choosePowerMicroDecision(ctx) {
  if (ctx == null || ctx.core == null) return null;
  if (state.powerClusters >= config.maxPowerClusters) return null;
  var nodeBlock = pickPowerNodeBlock(ctx.team);
  if (nodeBlock == null || !coreHasItemsFor(nodeBlock, ctx.team)) return null;
  var offsets = [
    { dx: 4, dy: 2, score: 100 },
    { dx: -4, dy: 2, score: 95 },
    { dx: 4, dy: -2, score: 92 },
    { dx: -4, dy: -2, score: 88 }
  ];
  var options = [];
  for (var i = 0; i < offsets.length; i++) {
    var off = offsets[i];
    var x = ctx.core.tile.x + off.dx;
    var y = ctx.core.tile.y + off.dy;
    var cand = {
      kind: "cluster",
      actionId: "cluster-" + i,
      score: off.score,
      x: x,
      y: y,
      features: {
        optionIndex: i,
        distance: Math.sqrt(off.dx * off.dx + off.dy * off.dy),
        need: ctx.powerStats != null ? (1 - clamp01(ctx.powerStats.avg)) : 0.3,
        value: off.score / 100
      }
    };
    options.push(cand);
  }
  return sortMicroDecisions(options);
}

function executePowerMicroDecision(ctx, decision) {
  if (ctx == null || decision == null) return false;
  return placePowerCluster(ctx.team, decision.x, decision.y);
}

function chooseThermalMicroDecision(ctx) {
  if (ctx == null || ctx.core == null) return null;
  if (state.thermalCount >= config.maxThermals) return null;
  var thermal = pickThermalBlock(ctx.team);
  if (thermal == null || !coreHasItemsFor(thermal, ctx.team)) return null;
  var spot = findHeatSpot(ctx.core, ctx.team, thermal);
  if (spot == null) return null;
  return [{ actionId: "heat-spot-0", kind: "heat-spot", score: 100, thermal: thermal, x: spot.x, y: spot.y, features: { optionIndex: 0, need: 1, value: 1 } }];
}

function executeThermalMicroDecision(ctx, decision) {
  if (ctx == null || decision == null || decision.thermal == null) return false;
  if (!placeBlock(decision.thermal, decision.x, decision.y, 0, ctx.team)) return false;
  state.thermalCount++;
  return true;
}

function chooseLiquidMicroDecision(ctx) {
  if (ctx == null || ctx.core == null) return null;
  var team = ctx.team;
  if (state.pumpCount >= config.maxPumps && state.liquidHubCount >= config.maxLiquidHubs) return null;
  var pumpBlock = pickPumpBlock(team);
  if (pumpBlock == null || !coreHasItemsFor(pumpBlock, team)) return null;
  var liquids = findLiquidTiles(ctx.core.tile.x, ctx.core.tile.y, config.liquidSearchRadius, config.maxPumps);
  if (liquids.length == 0) return null;
  var decisions = [];
  for (var i = 0; i < liquids.length && i < 4; i++) {
    var best = liquids[i];
    decisions.push({
      kind: "liquid-network",
      actionId: "source-" + i,
      score: 100 - Math.sqrt(best.dist2),
      pumpX: best.x,
      pumpY: best.y,
      liquid: best.liquid,
      features: {
        optionIndex: i,
        distance: Math.sqrt(best.dist2),
        need: state.pumpCount < config.maxPumps ? 1 : 0.5,
        value: 1 - Math.min(1, Math.sqrt(best.dist2) / 20)
      }
    });
  }
  return sortMicroDecisions(decisions);
}

function executeLiquidMicroDecision(ctx, decision) {
  if (ctx == null || decision == null) return false;
  return actionLiquid(ctx.core);
}

function executeActionDecision(actionName, ctx, decision) {
  if (actionName == "mine") return executeMineMicroDecision(ctx, decision);
  if (actionName == "defend") return executeDefendMicroDecision(ctx, decision);
  if (actionName == "industry") return executeIndustryMicroDecision(ctx, decision);
  if (actionName == "attackWave") return executeAttackWaveMicroDecision(ctx, decision);
  if (actionName == "rally") return executeRallyMicroDecision(ctx, decision);
  if (actionName == "power") return executePowerMicroDecision(ctx, decision);
  if (actionName == "thermal") return executeThermalMicroDecision(ctx, decision);
  if (actionName == "liquid") return executeLiquidMicroDecision(ctx, decision);
  return false;
}

function runDirectAction(actionName, ctx) {
  if (actionName == "mine") return actionMine(ctx.core, ctx.miningPlan);
  if (actionName == "defend") return actionDefend(ctx.core);
  if (actionName == "industry") return actionIndustry(ctx.core, ctx.industryPlan);
  if (actionName == "attackWave") return actionAttackWave(ctx.core, ctx.enemyCore);
  if (actionName == "rally") return actionRally(ctx.core, ctx.enemyCore);
  if (actionName == "power") return actionPower(ctx.core);
  if (actionName == "thermal") return actionThermal(ctx.core);
  if (actionName == "liquid") return actionLiquid(ctx.core);
  if (actionName == "noop") return true;
  return false;
}

function runActionPlan(actionName, ctx) {
  if (actionName == null || ctx == null) return false;
  var decisions = null;
  if (actionName == "mine") decisions = chooseMineMicroDecision(ctx);
  else if (actionName == "defend") decisions = chooseDefendMicroDecision(ctx);
  else if (actionName == "industry") decisions = chooseIndustryMicroDecision(ctx);
  else if (actionName == "attackWave") decisions = chooseAttackWaveMicroDecision(ctx);
  else if (actionName == "rally") decisions = chooseRallyMicroDecision(ctx);
  else if (actionName == "power") decisions = choosePowerMicroDecision(ctx);
  else if (actionName == "thermal") decisions = chooseThermalMicroDecision(ctx);
  else if (actionName == "liquid") decisions = chooseLiquidMicroDecision(ctx);
  else if (actionName == "noop") return true;
  if (decisions == null || decisions.length == 0) {
    state.lastMicroAction = actionName + ":direct";
    state.pendingMicroTransition = null;
    return runDirectAction(actionName, ctx);
  }
  var selected = selectMicroDecision(actionName, ctx, decisions);
  if (selected == null || selected.scored == null || selected.scored.length == 0) {
    state.lastMicroAction = actionName + ":direct";
    state.pendingMicroTransition = null;
    return runDirectAction(actionName, ctx);
  }
  var options = [];
  for (var si = 0; si < selected.scored.length; si++) {
    var entry = selected.scored[si];
    options.push({
      action: decisionLabel(actionName, entry.decision),
      heuristicScore: Math.round(entry.heuristicScore * 100) / 100,
      learnedScore: entry.learnedScore != null ? (Math.round(entry.learnedScore * 100) / 100) : null,
      finalScore: Math.round(entry.finalScore * 100) / 100,
      selectionMode: entry.selectionMode
    });
  }
  for (var si2 = 0; si2 < selected.scored.length; si2++) {
    var entry2 = selected.scored[si2];
    if (entry2 == null || entry2.decision == null) continue;
    if (!executeActionDecision(actionName, ctx, entry2.decision)) continue;
    markMicroDecision(actionName, entry2.decision);
    state.pendingMicroTransition = {
      policy: actionName,
      action: decisionLabel(actionName, entry2.decision),
      state: ctx.beforeState,
      options: options,
      selectionMode: entry2.selectionMode
    };
    return true;
  }
  state.lastMicroAction = actionName + ":direct";
  state.pendingMicroTransition = null;
  return runDirectAction(actionName, ctx);
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

function tileKey(x, y) {
  return x + "," + y;
}

function coreItemCount(core, item) {
  if (core == null || core.items == null || item == null) return 0;
  return core.items.get(item);
}

function industryBlockNames(name) {
  var pref = null;
  try {
    if (config.blockPrefs != null && config.blockPrefs.industry != null) pref = config.blockPrefs.industry[name];
  } catch (e) {
    pref = null;
  }
  if (pref != null && pref.length != null && pref.length > 0) return pref;
  if (industryBlueprints[name] != null && industryBlueprints[name].blocks != null) return industryBlueprints[name].blocks;
  return [];
}

function pickIndustryBuildBlock(name, team) {
  return pickBlockFromNamesWithIgnore(industryBlockNames(name), team, industryReserveIgnore);
}

function countIndustryFactories(team, name) {
  return countBlocksNamed(team, industryBlockNames(name));
}

function industryOutputTarget(name) {
  var target = null;
  try {
    if (config.industryTargets != null && config.industryTargets[name] != null) target = config.industryTargets[name].output;
  } catch (e) {
    target = null;
  }
  if (target != null) return Math.max(0, target);
  var def = industryBlueprints[name];
  if (def == null) return 0;
  return reserveFor(itemByName(def.output));
}

function industryInputTarget(name, inputName) {
  var target = null;
  try {
    if (config.industryTargets != null && config.industryTargets[name] != null && config.industryTargets[name].inputs != null) {
      target = config.industryTargets[name].inputs[inputName];
    }
  } catch (e) {
    target = null;
  }
  return target != null ? Math.max(0, target) : 0;
}

function canUseOrPlaceBlock(block, x, y, team, ignoreReserveItems) {
  var tile = tileAt(x, y);
  if (tile == null) return false;
  if (tile.build != null && tile.build.team == team && tile.build.block == block) return true;
  return canPlaceBlock(block, x, y, 0, team, ignoreReserveItems);
}

function findPlacementSpot(block, prefX, prefY, radius, team, used, ignoreReserveItems) {
  var best = null;
  var bestScore = 999999;
  for (var dx = -radius; dx <= radius; dx++) {
    for (var dy = -radius; dy <= radius; dy++) {
      var x = prefX + dx;
      var y = prefY + dy;
      if (used != null && used[tileKey(x, y)] === true) continue;
      if (!canUseOrPlaceBlock(block, x, y, team, ignoreReserveItems)) continue;
      var score = dx * dx + dy * dy;
      if (best == null || score < bestScore) {
        best = { x: x, y: y };
        bestScore = score;
      }
    }
  }
  return best;
}

function ensureConfiguredBlock(block, prefX, prefY, radius, rotation, team, configValue, used, ignoreReserveItems) {
  var spot = findPlacementSpot(block, prefX, prefY, radius, team, used, ignoreReserveItems);
  if (spot == null) return null;
  var tile = tileAt(spot.x, spot.y);
  var build = tile != null ? tile.build : null;
  var created = false;
  if (!(build != null && build.team == team && build.block == block)) {
    if (!placeBlock(block, spot.x, spot.y, rotation || 0, team, ignoreReserveItems)) return null;
    created = true;
    tile = tileAt(spot.x, spot.y);
    build = tile != null ? tile.build : null;
  }
  if (build != null && created && configValue != null) configureBuild(build, configValue);
  if (used != null) used[tileKey(spot.x, spot.y)] = true;
  return { x: spot.x, y: spot.y, build: build, created: created };
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
  state.factoryBlocks = 0;
  state.actionHistory = [];
  state.lastActionTicks = {};
  state.lastMicroAction = "";
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
  state.microPolicies = {};
  state.microLastLoadTicks = {};
  state.microLastErrorTicks = {};
  state.pendingMicroTransition = null;
  state.rlEpsilon = config.rlEpsilon != null ? config.rlEpsilon : -1;
  state.lastRLState = null;
  state.lastMicroReward = 0;
  state.gameOverEventSent = false;
  state.contentDemandTick = -9999;
  state.contentDemand = {};
  state.contentDemandSimple = {};
  state.contentDemandProfile = {};
  state.lastEconomicFocus = null;
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

  var intent = extractAiIntent(parts);
  var cmd = intent.verb;
  var arg1 = intent.arg1;
  var enabled = state.aiEnabled;
  if (cmd == "on" || cmd == "ligar" || cmd == "start" || cmd == "true" || cmd == "1") {
    enabled = true;
  } else if (cmd == "off" || cmd == "desligar" || cmd == "stop" || cmd == "false" || cmd == "0") {
    enabled = false;
  } else if (cmd == "status" || cmd == "estado") {
    try {
      if (e.player != null) {
        e.player.sendMessage(
          "IA: " + (state.aiEnabled ? "ligada" : "desligada")
          + " | estrategia=" + currentStrategyName(state.currentStrategy)
          + " | policy=" + config.rlPolicyMode
          + " | diretriz=" + (state.commandBias != null && state.tick <= state.commandBiasUntilTick ? "ativa" : "nenhuma")
        );
      }
    } catch (e2) {
      // ignore
    }
    e.cancelled = true;
    return;
  } else if (cmd == "strategy" || cmd == "estrategia") {
    var newStrategy = arg1 != null ? String(arg1).toLowerCase() : "auto";
    if (newStrategy != "auto" && newStrategy != "balanced" && newStrategy != "aggressive" && newStrategy != "defensive" && newStrategy != "economic") {
      newStrategy = "auto";
    }
    config.strategyMode = newStrategy;
    state.lastStrategyTick = -999999;
    try {
      if (e.player != null) e.player.sendMessage("IA estrategia definida para: " + newStrategy);
    } catch (e3) {
      // ignore
    }
    e.cancelled = true;
    return;
  } else if (cmd == "policy" || cmd == "modo") {
    var newPolicy = arg1 != null ? String(arg1).toLowerCase() : "hybrid";
    if (newPolicy != "heuristic" && newPolicy != "qtable" && newPolicy != "hybrid" && newPolicy != "nn") {
      newPolicy = "hybrid";
    }
    config.rlPolicyMode = newPolicy;
    try {
      if (e.player != null) e.player.sendMessage("IA policy definida para: " + newPolicy);
    } catch (e4) {
      // ignore
    }
    e.cancelled = true;
    return;
  } else if (cmd == "clear") {
    state.commandBias = null;
    state.commandBiasUntilTick = -1;
    try {
      if (e.player != null) e.player.sendMessage("IA limpou diretrizes temporarias.");
    } catch (e6) {
      // ignore
    }
    e.cancelled = true;
    return;
  } else {
    var directive = parseAiDirective(msg);
    if (directive != null) {
      state.commandBias = directive;
      var duration = config.aiDirectiveDurationTicks != null ? config.aiDirectiveDurationTicks : 3600;
      if (duration < 0) duration = 0;
      state.commandBiasUntilTick = state.tick + duration;
      try {
        if (e.player != null) e.player.sendMessage("IA aplicou diretriz inteligente temporaria.");
      } catch (e5) {
        // ignore
      }
      e.cancelled = true;
      return;
    }
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
  var isCore = false;
  try {
    isCore = build.block.flags != null && build.block.flags.contains(BlockFlag.core);
  } catch (e2) {
    isCore = false;
  }
  if (!isCore) {
    try {
      var bname = build.block.name != null ? String(build.block.name).toLowerCase() : "";
      isCore = bname.indexOf("core") >= 0;
    } catch (e3) {
      isCore = false;
    }
  }
  if (!isCore) return;

  if (isMobileSafe() && config.mobileCoreTapSingleToggle) {
    var cooldown = config.mobileTapToggleCooldown != null ? config.mobileTapToggleCooldown : 45;
    if (cooldown < 0) cooldown = 0;
    var canToggle = (state.tick - state.lastTapTick) > cooldown;
    if (canToggle) {
      setAiEnabled(!state.aiEnabled, e.player);
      state.lastTapTick = state.tick;
      state.lastTapX = e.tile.x;
      state.lastTapY = e.tile.y;
    }
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
  state.factoryBlocks = countFactoryBlocks(team2);

  if (config.logicEnabled) ensureLogicControllers(core2, team2);
  else disableManagedLogicControllers(core2, team2);

  // Loop principal: snapshot -> escolhe acao -> executa -> recompensa -> Q-table/NN -> salvar.
  runAiStep(core2, team2);
}

function runAiStep(core, team) {
  var demandProfile = getContentDemandProfile(team, core);
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
  var topDemandEntry = null;
  var missingProducers = 0;
  if (demandProfile != null) {
    for (var dkey in demandProfile) {
      if (!demandProfile.hasOwnProperty(dkey)) continue;
      var dentry = demandProfile[dkey];
      if (dentry == null || !(dentry.total > 0)) continue;
      if (dentry.producersBuilt <= 0) missingProducers++;
      if (topDemandEntry == null || dentry.criticality > topDemandEntry.criticality) topDemandEntry = dentry;
    }
  }
  var powerStats = computePowerStatus(team);
  var stageInfo = economyStageInfo(core, team, buckets.ground.size + buckets.air.size + buckets.support.size);
  if (stageInfo == null) stageInfo = { stage: 0, industryFactories: state.factoryBlocks };
  var chainStatus = computeProductionChainStatus(core, team);
  var ammoProfile = computeAmmoProfile(core, enemies, team);
  var miningTier = miningPlan != null && miningPlan.item != null ? itemTierFor(miningPlan.item) : 1;
  var advancedMineNeed = miningPlan != null && (miningTier >= 3 || miningPlan.critical === true);
  var miningCategory = miningPlan != null && miningPlan.item != null ? resourceCategoryForItem(miningPlan.item) : "basic";
  var smeltingMineNeed = miningPlan != null && (miningCategory == "industrial" || miningCategory == "combat");
  var powerNeedScore =
    powerStats.count == 0 ? 40 :
    (powerStats.avg < 0.4 || powerStats.min < 0.25) ? 45 :
    powerStats.avg < 0.7 ? 25 :
    powerStats.avg < 0.85 ? 10 : 0;

  var beforeState = snapshotState(core, enemyCore, enemies, team);
  var reserveP = economicPressure(core, team);
  var industryNeeds = rankIndustryNeeds(core, team);
  var topIndustryNeed = industryNeeds.length > 0 ? industryNeeds[0] : null;
  var economyUpgradeScore = upgradeEconomyScore(team);
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
  configureFactories(team, core, strategy);
  var industryPlan = computeIndustryExpansionPlan(core, team, strategy);
  var actionCtx = buildActionContext(
    core,
    team,
    enemyCore,
    enemies,
    buckets,
    attackPlan,
    miningPlan,
    powerStats,
    stageInfo,
    chainStatus,
    ammoProfile,
    strategy,
    industryPlan,
    beforeState,
    topDemandEntry,
    topIndustryNeed,
    reserveP,
    powerNeedScore,
    missingProducers
  );

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

  var actionHandlers = {
    attackWave: function(){ return runActionPlan("attackWave", actionCtx); },
    rally: function(){ return runActionPlan("rally", actionCtx); },
    mine: function(){ return runActionPlan("mine", actionCtx); },
    defend: function(){ return runActionPlan("defend", actionCtx); },
    power: function(){ return runActionPlan("power", actionCtx); },
    liquid: function(){ return runActionPlan("liquid", actionCtx); },
    thermal: function(){ return runActionPlan("thermal", actionCtx); },
    industry: function(){ return runActionPlan("industry", actionCtx); },
    noop: function(){ return true; }
  };

  var actions = [];
  var applyStrategyNow = !(config.strategyAffectsRL && config.rlPolicyMode != "heuristic");
  var addAction = function(name, score, run){
    var s = applyStrategyNow ? applyStrategyScore(name, score, strategy) : score;
    actions.push({ name: name, baseScore: s, score: s, run: run });
  };
  var desiredTurrets = Math.min(config.maxTurrets, Math.max(2, 2 + Math.min(2, stageInfo.stage) + (enemies > 3 ? 1 : 0)));
  var desiredPower = Math.min(config.maxPowerClusters, stageInfo.stage >= 3 ? 2 : (stageInfo.stage >= 1 ? 1 : 0));
  var desiredLiquid = stageInfo.stage >= 2 ? 1 : 0;
  var thermalScore = (state.thermalCount < config.maxThermals && canThermal ? (powerNeedScore + (stageInfo.stage >= 2 ? 45 : 35)) : 0);
  thermalScore *= reservePenalty;
  addAction("thermal", thermalScore, actionHandlers.thermal);
  addAction("attackWave", attackPlan.canCommit ? 100 : 0, actionHandlers.attackWave);
  addAction("rally", attackPlan.shouldRally ? 120 : 0, actionHandlers.rally);
  var mineScore = (canDrill && miningPlan != null ? miningPlan.score : 0);
  mineScore += chainStatus.pressure * 18;
  if (topDemandEntry != null) {
    mineScore += topDemandEntry.criticality * 0.45 + topDemandEntry.scarcity * 22;
    mineScore += missingProducers * 6;
  }
  state.lastEconomicFocus = topDemandEntry != null ? {
    item: topDemandEntry.itemName,
    reason: topDemandEntry.producersBuilt <= 0 ? "high-demand-low-stock-no-producer" : "high-demand-scarcity",
    criticality: Math.round(topDemandEntry.criticality * 100) / 100
  } : null;
  mineScore *= reserveBoost;
  addAction("mine", mineScore, actionHandlers.mine);
  var defendScore = (canDuo ? (enemies > 0 ? 90 : 25) + (state.turretCount < desiredTurrets ? 30 : state.turretCount < config.maxTurrets ? 12 : 0) : 0);
  defendScore += (ammoProfile.kineticPressure + ammoProfile.explosivePressure + ammoProfile.energyPressure) * 8;
  if (enemyCore != null && !wantsAttack && attackPlan.enemyTurrets >= config.attackMaxEnemyTurrets) defendScore += 20;
  defendScore *= reservePenalty;
  addAction("defend", defendScore, actionHandlers.defend);
  var powerScore = (canPowerNode && state.powerClusters < desiredPower && availCopper > 200 && availLead > 150 ? 35 : 0) + powerNeedScore + (state.pumpCount > state.powerClusters ? 15 : 0);
  powerScore *= reservePenalty;
  addAction("power", powerScore, actionHandlers.power);
  var liquidScore = 0;
  if (canLiquid) {
    if (desiredLiquid > 0 && state.pumpCount < config.maxPumps) liquidScore += 55;
    if (desiredLiquid > 0 && state.liquidHubCount < config.maxLiquidHubs) liquidScore += 20;
    if (topIndustryNeed != null && topIndustryNeed.name == "plastanium") liquidScore += 25;
  }
  liquidScore *= reservePenalty;
  addAction("liquid", liquidScore, actionHandlers.liquid);
  var industryScore = (topIndustryNeed != null ? (45 + topIndustryNeed.score) : 0) + economyUpgradeScore + (industryPlan != null ? industryPlan.score : 0);
  if (stageInfo.stage < 1) industryScore += 30;
  else if (stageInfo.stage < 2) industryScore += 60;
  else if (stageInfo.stage < 3) industryScore += 55;
  else industryScore += 20;
  industryScore += chainStatus.pressure * 22;
  industryScore += Math.max(0, 1 - chainStatus.coverage) * 35;
  if (industryPlan != null && reserveP < 0.85) {
    industryScore += strategy == "aggressive" ? 12 : (strategy == "economic" ? 24 : 16);
    if (beforeState.unitsTotal < config.attackMinForce) industryScore += 10;
  }
  industryScore *= reserveBoost;
  addAction("industry", industryScore, actionHandlers.industry);
  addAction("noop", 0, actionHandlers.noop);
  applyCommandBias(actions);

  if (config.rlPolicyMode != "heuristic") {
    if (config.rlPolicyMode == "qtable" || config.rlPolicyMode == "hybrid") {
      var qScores = qScoresForState(beforeState);
      var isQTable = config.rlPolicyMode == "qtable";
      var isHybrid = config.rlPolicyMode == "hybrid";
      var blend = adaptiveBlendWeight(stageInfo, reserveP, config.rlQTableBlend);
      for (var qi = 0; qi < actions.length; qi++) {
        var act = actions[qi];
        var qv = qScores != null ? qScores[act.name] : null;
        if (qv == null) {
          if (isQTable) act.score = 0;
          continue;
        }
        if (isQTable) act.score = qv;
        else if (isHybrid) act.score = blendScores(act.score, qv, blend);
      }
    }

    if (config.rlPolicyMode == "nn" && state.nnModel != null) {
      var heuristicScores = {};
      for (var hs = 0; hs < actions.length; hs++) {
        heuristicScores[actions[hs].name] = actions[hs].score;
      }
      var nnScores = nnScoresForState(beforeState);
      if (nnScores != null) {
        for (var qi2 = 0; qi2 < actions.length; qi2++) {
          var act2 = actions[qi2];
          if (act2.baseScore <= 0 && act2.name != "noop") {
            act2.score = -999999;
            continue;
          }
          if (shouldKeepHeuristicNNScore(act2.name, stageInfo, smeltingMineNeed, advancedMineNeed)) {
            continue;
          }
          var nnv = nnScores[act2.name];
          if (nnv == null) {
            if (!config.rlNNFallbackHeuristic) act2.score = -999999;
            continue;
          }
          var nnBlend = adaptiveBlendWeight(stageInfo, reserveP, config.rlQTableBlend);
          act2.score = blendScores(act2.score, nnv, nnBlend);
          if (act2.name == "mine" && shouldProtectEconomicMineScore(miningPlan)) {
            var floor = config.rlNNEconomicGuardFloor != null ? config.rlNNEconomicGuardFloor : 1.0;
            if (floor < 0) floor = 0;
            var minScore = act2.baseScore * floor;
            if (act2.score < minScore) act2.score = minScore;
          }
        }

        var noopScore = -999999;
        var bestNonNoopNN = -999999;
        var bestNonNoopHeuristic = -999999;
        for (var ns = 0; ns < actions.length; ns++) {
          var actN = actions[ns];
          if (actN.name == "noop") {
            noopScore = actN.score;
          } else {
            if (actN.score > bestNonNoopNN) bestNonNoopNN = actN.score;
            var hScore = heuristicScores[actN.name];
            if (hScore != null && hScore > bestNonNoopHeuristic) bestNonNoopHeuristic = hScore;
          }
        }
        if (bestNonNoopHeuristic > 0 && bestNonNoopNN <= noopScore) {
          for (var hr = 0; hr < actions.length; hr++) {
            var actR = actions[hr];
            var fallbackScore = heuristicScores[actR.name];
            if (fallbackScore != null) actR.score = fallbackScore;
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

  applySituationalActionGuards(actions, actionCtx);

  if (config.rlPolicyMode == "nn" && state.noopStreak >= (config.rlNoopRescueStreak || 8)) {
    for (var rs = 0; rs < actions.length; rs++) {
      var actRescue = actions[rs];
      if (actRescue == null) continue;
      actRescue.score = actRescue.baseScore != null ? actRescue.baseScore : actRescue.score;
    }
  }

  var ranked = rankActions(actions);
  var policyActions = nnUsesPolicySampling() ? policyReadyActions(actions) : null;
  var pickedList = nnUsesPolicySampling() ? pickPolicyOrder(policyActions) : pickExploreOrder(ranked);
  if ((pickedList == null || pickedList.length == 0) && ranked != null && ranked.length > 0) pickedList = ranked;
  var pickedName = "noop";
  state.lastAction = "none";
  state.lastActionOk = false;
  state.pendingMicroTransition = null;
  for (var r = 0; r < pickedList.length; r++) {
    var picked = pickedList[r];
    var ok = false;
    try {
      ok = picked.run();
    } catch (e) {
      ok = false;
    }
    if (!ok) {
      state.pendingMicroTransition = null;
      continue;
    }
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
  if (!did || pickedName == "noop") state.noopStreak += 1;
  else state.noopStreak = 0;

  var core2 = getCore(team);
  var enemyCore2 = findEnemyCore(team);
  var enemies2 = countEnemyUnits(team);
  var afterState = snapshotState(core2, enemyCore2, enemies2, team);
  var reward = computeReward(beforeState, pickedName, afterState, { ok: did });
  state.lastReward = reward;
  state.lastMicroReward = reward;
  updateOnlineQTable(beforeState, pickedName, afterState, reward);
  updateNNModel(beforeState, pickedName, afterState, reward);
  saveQTableIfNeeded();
  saveNNModelIfNeeded();
  if (state.pendingMicroTransition != null) {
    var microInfo = {
      ok: did,
      reward: reward,
      selectionMode: state.pendingMicroTransition.selectionMode
    };
    if (config.rlMicroLogCandidates) microInfo.actionSpace = state.pendingMicroTransition.options;
    emitMicroTransition(
      state.pendingMicroTransition.state != null ? state.pendingMicroTransition.state : beforeState,
      state.pendingMicroTransition.policy,
      state.pendingMicroTransition.action,
      afterState,
      microInfo
    );
    state.pendingMicroTransition = null;
  }
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
  var fallbackTeam = (Vars.state != null && Vars.state.rules != null) ? Vars.state.rules.defaultTeam : null;
  var team = localPlayer != null ? localPlayer.team() : fallbackTeam;
  if (team == null) team = getTeam();
  var core = getCore(team);
  if (core == null) {
    warnBuildFail("Aguardando core...");
    return;
  }
  if (!headless && localPlayer == null) {
    // Mobile/client edge case: em algumas versões o player local pode não estar pronto
    // no mesmo tick, mas já existe core/time; não bloquear IA por isso.
    if ((state.tick - state.lastWarnTick) >= config.warnInterval) {
      warnBuildFail("Player local indisponível; IA rodando via team/core.");
    }
  }

  if (team == null) {
    warnBuildFail("Aguardando team...");
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
