# Build-Auftrag — Basis

Dieser Auftrag ist vollständig und eindeutig. Er baut die Basis von Citable in einem Zug.
Alles Nötige steht hier oder in den genannten Dateien; nichts muss erraten werden.

**Voraussetzung lesen:** `CLAUDE.md` (Einstieg), `CONCEPT.md` (maßgebliche Spezifikation).
`IDEA.md` ist überholt — nur Video-Skript (9) und Risikoliste (11) gelten dort noch.

---

## Was bereits steht — nicht neu bauen

| Datei | Inhalt |
|---|---|
| `src/Leaf.sol` | `leafOf(index, segment)` — die Blattformel |
| `src/CitableRegistry.sol` | Register mit `registerRoot`, `verifySegment`, `withdrawStatement` |
| `script/js/leaf.mjs` | dieselbe Formel in viem, per FFI gegen Solidity verifiziert |
| `script/js/guards.mjs` | `unsupportedTokens(absatz, behauptung)` — Wertprüfung |
| `script/js/*-probe.mjs`, `entailment-eval.mjs` | Messskripte, Ergebnisse in CONCEPT.md |
| `test/` | 16 grüne Tests |

`forge test` muss nach jedem Schritt grün bleiben. `npm install` ist Voraussetzung
(die Paritätstests rufen Node per FFI auf).

---

## Zwei Invarianten — niemals ändern

**1. Blattformel.** `keccak256(keccak256(abi.encode(uint256 index, string segment)))`
Wer sie ändert, ändert `src/Leaf.sol` **und** `script/js/leaf.mjs` und weist die Parität
per `forge test` nach. Sonst sind alle registrierten Aussagen unprüfbar.

**2. Segmentierung.** Trennen an `\n\n`, Ränder trimmen, leere Segmente verwerfen, UTF-8,
keine Normalisierung. Absätze, nicht Sätze.

---

## Aufgabe 1 — Client-Bibliothek (`lib/`)

Neues Verzeichnis `lib/`, reines ESM, keine Framework-Abhängigkeit. Diese Funktionen
werden später vom Frontend und von den Tests genutzt.

```js
segment(text)                 → string[]
  // Die Invariante oben, wörtlich. Kein Trimmen innerhalb eines Segments.

leafOf(index, segment)        → `0x${string}`
  // Aus script/js/leaf.mjs hierher ziehen. script/js/leaf.mjs bleibt als
  // FFI-Einstiegspunkt bestehen und importiert von hier — keine zweite Kopie der Formel.

buildTree(segments)           → { root, leaves, proofFor(index) }
  // merkletreejs mit { sortPairs: true }. proofFor liefert bytes32[] für verifySegment.

buildBundle(text, vectors?)   → { version: 1, model, dim, segments: [{ index, text, vector }] }
  // vectors optional — ohne Modell entstehen Segmente ohne vector-Feld.

verifyBundle(bundle, root)    → boolean
  // Baum aus bundle.segments neu bauen, Wurzel vergleichen. Die Verankerung: ohne sie
  // ist das IPFS-Bündel beliebig austauschbar.
```

**Akzeptanz:**
- `npm test` (node:test) deckt jede Funktion ab
- Ein Test baut einen Baum mit ≥4 Segmenten, erzeugt einen Beweis und prüft ihn gegen
  **den deployten Contract-Code** über `forge test` — der Beweis aus JS muss von
  `verifySegment` akzeptiert werden. Das ist die zweite Brücke zwischen JS und Solidity
  nach der Blattformel und der wahrscheinlichste Ort für einen stillen Fehler.
- UTF-8, Emoji und leere Zeilen sind abgedeckt

---

## Aufgabe 2 — ENS-Identität (Weg A)

**Das Loch:** `registerRoot` nimmt `ensNode` entgegen und prüft ihn nicht. Jeder kann
jeden Namen behaupten. Solange das so ist, ist das Kernversprechen nicht eingelöst.

**Entschieden:** ENSv2 auf Sepolia, echte Prüfung on-chain. Nicht nur Namensauflösung im
Frontend. Deployte Adressen und der Stand der Erkundung: `script/js/ens-probe.mjs`.

```
ETHRegistry          0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2
RootRegistry         0x8115186e8f2e0b0281e86ab91f0f48ba90364354
UniversalResolverV2  0x4a1817d13e9cf196f471725176355c1234b63c70
VerifiableFactory    0x10dc6333cdfe1fcef624c6e0a8221b91804cd7ef
```

**Schritt 2a — offene Frage zuerst klären.** `ownerOf(labelhash("ens"))` liefert `0x0`,
obwohl der Name registriert ist. Die Token-ID wird also anders abgeleitet (vermutlich
maskierte Versionsbits). Im Quelltext der `PermissionedRegistry` nachsehen und in
`ens-probe.mjs` beweisen, dass die Ableitung stimmt — erst dann weiterbauen.

**Schritt 2b — Prüfung im Contract.** `registerRoot` lehnt ab, wenn `msg.sender` unter
`ensNode` nicht publizieren darf. Die Prüfung sitzt hinter einer Schnittstelle:

```solidity
interface INameGuard {
    function mayPublish(bytes32 ensNode, address account) external view returns (bool);
}
```

Der Registry-Contract hält eine `INameGuard`-Adresse. Ist sie `address(0)`, wird nicht
geprüft (Bestandsverhalten, alle 16 Tests bleiben grün). Ist sie gesetzt, revertet
`registerRoot` mit `NotAuthorized()`.

**Schritt 2c — `ENSv2NameGuard`.** Implementiert `INameGuard` gegen die ENSv2-Registry.
Nicht bloß Besitz prüfen, sondern eine **Publikationsrolle** über Enhanced Access Control:
Wer den Namen besitzt, darf publizieren — und wer die Rolle zugewiesen bekommen hat,
ebenfalls. Das bildet eine Redaktion korrekt ab: Ein Volontär darf unter dem Namen der
Zeitung veröffentlichen, ohne ihn zu besitzen. Genau diese Unterscheidung ist der Grund,
warum ENS hier tragend und nicht dekorativ ist.

**Akzeptanz:**
- Foundry-Fork-Test gegen Sepolia (`vm.createSelectFork`) mit einem real registrierten Namen
- Test: Guard auf `address(0)` → alle bisherigen Tests unverändert grün
- Test: Guard gesetzt, fremder Aufrufer → `NotAuthorized()`
- Keine hartkodierten Werte in der Demo — die Bounty verlangt das ausdrücklich

---

## Aufgabe 3 — Deploy auf Sepolia

`script/Deploy.s.sol`: deployt `CitableRegistry`, danach `ENSv2NameGuard`, setzt den Guard.

- RPC und Schlüssel aus `.env` (`.env.example` anlegen und committen, `.env` niemals)
- Adressen nach `deployments/sepolia.json`, in README und CLAUDE.md eintragen
- Contract auf Etherscan verifizieren

---

## Reihenfolge und Commits

Ein Commit pro logischer Einheit, Conventional Commits, Englisch, Imperativ.
**Mindestens ein aussagekräftiger Commit pro Arbeitstag** — ETHGlobal kann Einreichungen
mit einem einzigen großen Commit disqualifizieren.

1. `feat: add client library for segmentation and merkle trees`
2. `test: prove JS-generated proofs verify against the contract`
3. `chore: resolve ENSv2 token id derivation`
4. `feat: gate registerRoot behind a name guard`
5. `feat: add ENSv2 name guard with publisher role`
6. `chore: deploy to sepolia`

---

## Was nicht gebaut wird

- **Frontend.** Kommt danach, nicht in diesem Auftrag.
- **The-Graph-Subgraph.** Gestrichen.
- **Eigene Subname-Registry.** ENSv2 liefert sie; wir nutzen sie.
- **Datenbank, Server, Indexer.** Der Client rechnet selbst nach.
- **Änderungen an der Blattformel oder der Segmentierungsregel.**

## Woran der Auftrag scheitert

Melden statt weiterbauen, wenn:

- die Token-ID-Ableitung aus 2a sich nicht innerhalb von zwei Stunden klären lässt —
  dann `INameGuard` bleibt, `ENSv2NameGuard` wird vertagt, Guard bleibt `address(0)`
- ein JS-erzeugter Beweis von `verifySegment` abgelehnt wird — das ist ein
  Invariantenbruch und hat Vorrang vor allem anderen
- `forge test` nach einem Schritt rot ist
