# Mindustry Architecture Overview

## Purpose and Scope
This page provides a high-level introduction to the Mindustry codebase architecture, explaining how major systems interact and the key design patterns used throughout the game. Mindustry is a tower defense and real-time strategy game implemented in Java using the Arc framework.

For detailed information about specific systems, see:
- Project structure and build configuration: Project Structure
- Entity management and components: Entity-Component System
- Block and unit definitions: Content System
- Player input handling: Input and Control
- Network synchronization: Networking and Multiplayer

## Project Module Structure
Mindustry uses a multi-module Gradle project to support deployment across desktop, mobile, and server platforms.

### Module Organization
The Gradle settings include these modules: `desktop`, `core`, `server`, `ios`, `annotations`, `tools`, `tests`, with `android` included when an Android SDK is present.

Sources:
settings.gradle 1-3

## High-Level Architecture
The codebase is organized into several major subsystems that operate together each frame.

### Primary Systems
- `Vars` exposes global singletons for major systems like `state`, `world`, `content`, `control`, `renderer`, `ui`, `net`, and `player`.
- `Renderer` coordinates the main rendering pipeline through specialized renderers such as `BlockRenderer`, `FogRenderer`, `MinimapRenderer`, `OverlayRenderer`, `LightRenderer`, and `Pixelator`.
- `InputHandler` is the base input system; `DesktopInput` and `MobileInput` provide platform-specific implementations.

Sources:
core/src/mindustry/Vars.java 1-200
core/src/mindustry/core/Renderer.java 1-50
core/src/mindustry/input/InputHandler.java 1-160

## Core Concepts

### Blocks and Buildings
The game distinguishes between `Block` (static type definition) and `Building` (runtime entity instance).

Concept | Class | Purpose
--- | --- | ---
Block Type | `Block` | Static definition and configuration. Each block defines its `buildType` (the runtime `Building` it spawns).
Block Instance | `BuildingComp` | Runtime entity with modules such as items, liquids, and power.
Block Catalog | `Blocks` | Static registry of block definitions exposed as static `Block` fields.

Example (conceptual): A turret type is defined in `Blocks` (for example, `Blocks.duo`), while each placed turret is a `Building` instance created from `Block.buildType`.

Sources:
core/src/mindustry/world/Block.java 42-250
core/src/mindustry/entities/comp/BuildingComp.java 49-160
core/src/mindustry/content/Blocks.java 1-200

### Units
Similar to blocks, units separate type from instance using `UnitType` and `UnitComp`.

Concept | Class | Purpose
--- | --- | ---
Unit Type | `UnitType` | Static definition, including the default AI controller reference.
Unit Instance | `UnitComp` | Runtime entity that references its `UnitType` and `UnitController`.
AI Controller | `UnitController` | Behavior logic referenced by `UnitComp`.

Sources:
core/src/mindustry/type/UnitType.java 44-360
core/src/mindustry/entities/comp/UnitComp.java 36-110

### Bullets and Combat
Bullets are entities whose behavior is defined by `BulletType` and fired from `Weapon` definitions.

- `BulletType` defines properties like lifetime, speed, damage, and hit size.
- `BulletComp` is the runtime bullet entity component with transient bullet state.
- `Weapon` ties a weapon to a `BulletType`.
- `Damage` contains utility methods for applying damage and explosions.

Sources:
core/src/mindustry/entities/bullet/BulletType.java 29-154
core/src/mindustry/entities/comp/BulletComp.java 1-50
core/src/mindustry/type/Weapon.java 29-60
core/src/mindustry/entities/Damage.java 24-50

## Entity-Component System
Mindustry uses annotation-driven components to compose entities.

Component Architecture
- Component classes such as `UnitComp` and `BuildingComp` are annotated with `@Component`.
- Entity definitions are composed with `@EntityDef` on component classes.
- Code generation is performed by annotation processors during compilation (inferred from the annotation usage and the presence of the `annotations` module).

Sources:
core/src/mindustry/entities/comp/UnitComp.java 36-48
core/src/mindustry/entities/comp/BuildingComp.java 49-64
settings.gradle 1-3

## Content Registration System
Content (blocks, units, items, liquids) is registered statically and loaded at startup.

Content Loading Flow
- The `Blocks` class declares a large set of static `Block` fields that act as the block registry.
- The global `content` loader is exposed on `Vars`.

Sources:
core/src/mindustry/content/Blocks.java 1-200
core/src/mindustry/Vars.java 1-200

## Main Game Loop
The game loop ties input, simulation, and rendering together each frame.

Update Sequence (conceptual)
- Input is processed by `InputHandler` and its platform-specific subclasses.
- Simulation systems update world and state data exposed on `Vars`.
- Rendering is coordinated by `Renderer` and its sub-renderers.

Sources:
core/src/mindustry/input/InputHandler.java 1-160
core/src/mindustry/Vars.java 1-200
core/src/mindustry/core/Renderer.java 1-50

## Input Handling Architecture
Input is abstracted to support desktop and mobile platforms with different interaction models.

Input System Structure
Layer | Class | Notes
--- | --- | ---
Base Input | `InputHandler` | Shared input logic (implements `InputProcessor` and `GestureListener`).
Desktop Input | `DesktopInput` | Desktop-specific input implementation.
Mobile Input | `MobileInput` | Mobile-specific input implementation.

Sources:
core/src/mindustry/input/InputHandler.java 50-125
core/src/mindustry/input/DesktopInput.java 30-70
core/src/mindustry/input/MobileInput.java 32-86

## Rendering Pipeline
Rendering uses a layered system with specialized renderers.

Renderer Components
- `Renderer` maintains instances of `BlockRenderer`, `FogRenderer`, `MinimapRenderer`, `OverlayRenderer`, `LightRenderer`, and `Pixelator`.
- `BlockRenderer` maintains spatial indices (quadtrees) such as `BlockQuadtree`, `FloorQuadtree`, and `OverlayQuadtree` to organize renderable data.

Sources:
core/src/mindustry/core/Renderer.java 28-50
core/src/mindustry/graphics/BlockRenderer.java 1-50
core/src/mindustry/graphics/MinimapRenderer.java 1-30
core/src/mindustry/graphics/OverlayRenderer.java 1-20

## Localization System
Localization uses property file bundles, with default English strings in `bundle.properties`.

Key Format (examples)
- `block.duo.name = Duo`
- `block.duo.description = A basic turret that shoots copper bullets.`
- `server.kicked.banned = You are banned on this server.`

Sources:
core/assets/bundles/bundle.properties 1-200

## Key Global Variables
Critical game state is accessed through the `Vars` class.

Essential Globals
Variable | Type | Purpose
--- | --- | ---
player | `Player` | Local player instance
state | `GameState` | Current game state (rules, wave, etc.)
world | `World` | Tile grid and world data
content | `ContentLoader` | Content registry
control | `Control` | Scene and game loop control
renderer | `Renderer` | Main rendering coordinator
ui | `UI` | UI dialogs and fragments
net | `Net` | Network client/server

Sources:
core/src/mindustry/Vars.java 41-150

## Summary
Mindustry's architecture follows these key principles:

- Separation of type and instance: `Block` and `UnitType` define behavior; `BuildingComp` and `UnitComp` are runtime entities.
- Entity-component composition: entities are built from annotated components such as `UnitComp` and `BuildingComp`.
- Static content registration: content is defined in static registries like `Blocks` and loaded at startup.
- Layered rendering: rendering is coordinated by `Renderer` with specialized sub-renderers and spatial indices.
- Platform abstraction: input handling is unified by `InputHandler` with desktop and mobile implementations.

Sources:
core/src/mindustry/world/Block.java 42-250
core/src/mindustry/entities/comp/BuildingComp.java 49-160
core/src/mindustry/type/UnitType.java 44-360
core/src/mindustry/entities/comp/UnitComp.java 36-110
core/src/mindustry/entities/comp/BulletComp.java 1-50
core/src/mindustry/content/Blocks.java 1-200
core/src/mindustry/core/Renderer.java 28-50
core/src/mindustry/graphics/BlockRenderer.java 1-50
core/src/mindustry/input/InputHandler.java 1-160
