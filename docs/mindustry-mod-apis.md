# Mindustry Mod API Map (Energy, Liquids, Units)

This page maps the main in-game APIs you can use from JS mods to control **energia**, **líquidos** and **unidades**. The references point to the Mindustry source tree inside this repo.

## Core Entry Points
Use these global namespaces from JS mods:
- `Vars`: global singletons for world, state, player, content, etc. `Mindustry/core/src/mindustry/Vars.java`.
- `Blocks`, `Items`, `Liquids`, `UnitTypes`: static content registries. `Mindustry/core/src/mindustry/content/Blocks.java`, `Items.java`, `Liquids.java`, `UnitTypes.java`.
- `Groups`: entity groups (`Groups.unit`, `Groups.build`, etc). `Mindustry/core/src/mindustry/gen/Groups.java`.
- `Events`, `Trigger`: lifecycle hooks like `Trigger.update`, `WorldLoadEvent`. `Mindustry/core/src/mindustry/game/EventType.java`.
- `Call` and `InputHandler`: network-safe commands (build, configure, unit commands). `Mindustry/core/src/mindustry/input/InputHandler.java`.

## Buildings: Power, Liquids, Items
Every placed block is a `Building` with optional modules:
- `build.power` (`PowerModule`): power graph and status. `Mindustry/core/src/mindustry/world/modules/PowerModule.java`.
- `build.liquids` (`LiquidModule`): liquid storage & flows. `Mindustry/core/src/mindustry/world/modules/LiquidModule.java`.
- `build.items` (`ItemModule`): item storage. `Mindustry/core/src/mindustry/world/modules/ItemModule.java`.

These are declared on `BuildingComp`:
- `@Nullable PowerModule power;`
- `@Nullable LiquidModule liquids;`
- `@Nullable ItemModule items;`

Source: `Mindustry/core/src/mindustry/entities/comp/BuildingComp.java`.

### Useful Power APIs
- `build.power.status`: percent of demand supplied (0.0–1.0). `PowerModule.status`.
- `build.power.graph`: power graph for linked nodes.
- `block.hasPower`: whether a block uses power.

Source: `Mindustry/core/src/mindustry/world/modules/PowerModule.java` and `Mindustry/core/src/mindustry/world/Block.java`.

### Useful Liquid APIs
- `build.liquids.get(liquid)`
- `build.liquids.current()` / `currentAmount()`
- `build.liquids.add(liquid, amount)` / `remove(liquid, amount)`

Source: `Mindustry/core/src/mindustry/world/modules/LiquidModule.java`.

### Detecting Liquid Tiles
- `tile.floor().isLiquid`
- `tile.floor().liquidDrop`

Source: `Mindustry/core/src/mindustry/world/blocks/environment/Floor.java`.

## Energy Control (Blocks)
Common power blocks you can place with `Call.constructFinish`:
- `Blocks.powerNode`
- `Blocks.solarPanel`
- `Blocks.battery`
- `Blocks.combustionGenerator`

Source: `Mindustry/core/src/mindustry/content/Blocks.java`.

## Liquid Control (Blocks)
Common liquid blocks you can place and connect:
- `Blocks.mechanicalPump`
- `Blocks.rotaryPump`
- `Blocks.conduit`, `Blocks.pulseConduit`
- `Blocks.liquidRouter`, `Blocks.liquidContainer`, `Blocks.liquidTank`

Source: `Mindustry/core/src/mindustry/content/Blocks.java`.

## Unit Control
### Commanding Units
You can issue movement/attack commands via `InputHandler`:
- `InputHandler.setUnitCommand(player, unitIds, UnitCommand.moveCommand)`
- `InputHandler.commandUnits(player, unitIds, target, null, pos, false, true)`

Source: `Mindustry/core/src/mindustry/input/InputHandler.java`.

### Configuring Unit Factories
`UnitFactory` is configurable via `config(Integer)` or `config(UnitType)`:
- `build.configure(unitType)` or `build.configureAny(unitType)`
- Or use `Call.tileConfig(player, build, unitType)`

Source: `Mindustry/core/src/mindustry/world/blocks/units/UnitFactory.java` and `Mindustry/core/src/mindustry/input/InputHandler.java`.

## Practical Mod Hooks
- `Events.run(Trigger.update, ...)` for per-tick AI logic.
- `Groups.build.each(...)` to scan factories, pumps, power nodes.
- `Groups.unit.each(...)` to gather and command units.

These entry points are already used in `scripts/ai.js`.
