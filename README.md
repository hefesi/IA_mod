# Deprecation Policy for Scripts

**Deprecated modules under scripts/ (ai_socket.js, ai_schema.js, ai_policy.js, ai_actions.js, ai_state.js, ai_ui.js) follow a call-time throw contract:**

- Importing a deprecated module does NOT throw an error immediately.
- Any attempt to call an exported function from a deprecated module will throw a deprecation error at runtime.
- Tests for deprecated modules must import the module and invoke at least one exported function, asserting that the deprecation error is thrown.

This contract ensures that static analysis and migration tools can import deprecated modules without breaking, while any actual use of deprecated functionality is immediately and clearly rejected at runtime.

### Comprehensive Coverage of Legacy Public Surfaces

Each deprecated module exposes a complete set of stubs covering the entire legacy public surface:

- **ai_actions.js**: 4 exported functions (executeAction, executeActionDecision, runDirectAction, runActionPlan) - all stubbed with individual deprecation errors
- **ai_policy.js**: 7 exported functions (selectPolicy, pickPolicyOrder, qScoresForState, nnScoresForState, applyCommandBias, rankActions, policyReadyActions) - all stubbed with individual deprecation errors
- **ai_schema.js**: 2 exported functions (hasBucketizedFeatures, applyRLMeta) - all stubbed with individual deprecation errors
- **ai_state.js**: 5 exported functions (snapshotState, emitTransition, emitMicroTransition, emitSocketEvent, safeTeamName) - all stubbed with individual deprecation errors
- **ai_socket.js**: 13 exported functions + rlSocket object with 3 methods - all stubbed with individual deprecation errors
- **ai_ui.js**: 3 exported functions (notify, ensureHudButton, buildHudButton) - all stubbed with individual deprecation errors

Each test file (tests/test_ai_*.js) validates that all critical legacy symbols throw explicit deprecation errors when called, ensuring no undefined behavior from accidental usage.

**If you deprecate a module in the future, follow this pattern and update its test accordingly.**
# IA_mod

## Executando com argumentos de linha de comando

Para iniciar o jogo carregando um mapa e/ou conectando-se automaticamente a um servidor, passe argumentos para o executável do Mindustry (geralmente `Mindustry.exe`):

- `-map <nome>`: abre o menu de seleção de modo para o mapa especificado (tenta encontrar pelo nome exibido, nome simples ou arquivo `.msav`).
- `-mode <modo>`: usado em conjunto com `-map` para escolher o modo (`survival`, `sandbox`, `attack`, `pvp`, `editor`).
- `-autoplay`: quando usado com `-map`, inicia imediatamente o jogo naquele mapa.
- `-name <nome>`: define o nome do jogador antes de conectar.
- `+connect <host[:port]>`: conecta automaticamente a um servidor ao iniciar.

Exemplo:

```powershell
Mindustry.exe -map "maze" -mode survival -autoplay -name Bot +connect 127.0.0.1:6567
```

## Comandos de Chat

Após o jogo iniciar com o mod carregado, você pode controlar a IA através dos comandos de chat a seguir:

### Fluxo de uso básico (Player IA)

| Comando | Efeito |
|---|---|
| `/ia on` | Liga a IA (padrão já ligado) |
| `/ia off` | Desliga a IA e devolve controle ao jogador |
| `/ia control on` | Ativa o takeover: IA assume a unidade do jogador |
| `/ia control off` | Desativa o takeover: jogador retoma controle manual |
| `/ia observer on` | Modo observador: IA gerencia a base, mas não controla a unidade |
| `/ia observer off` | Desativa modo observador |
| `/ia status` | Exibe o estado atual: `observer=`, `takeover=`, `jogador=` |

### Comportamento padrão (após inicialização)

Ao carregar qualquer mapa com o mod ativo:

- A IA já inicia **ligada** (`aiEnabledDefault: true`)
- O takeover da unidade do jogador já inicia **ativo** (`aiControlPlayerUnit: true`)
- Para jogar manualmente, basta digitar `/ia control off` ou `/ia off`

