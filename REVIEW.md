# Verstehen — abgeschlossen (Do 10.09.)

Dieses Kapitel ist durch. Frederik hat `src/` verstanden, alle vier Prüffragen sind
beantwortet. Es steht hier als Nachweis und als Nachschlagewerk — **das laufende Kapitel
ist jetzt `NIGHT.md`.**

Offen geblieben und bewusst vertagt: `script/` und `test/` überfliegen, vor allem
`test/Leaf.t.sol` und `test/ProofBridge.t.sol`, weil die zwei die JS↔Solidity-Brücke
sichern.

---

## Was in diesem Kapitel entschieden und getan wurde

- Alle 97 Kommentarzeilen in `src/` von Deutsch nach Englisch — bei identischem Bytecode
  bis auf die 43 Byte CBOR-Metadaten. Der Grund: Die Contracts sind auf Etherscan
  verifiziert, der Quelltext ist damit öffentlich, und die Begründungen darin sind das
  Wertvollste an den Dateien.
- Drei undokumentierte Verhaltensweisen gefunden und in die Grenzen-Liste von `CLAUDE.md`
  aufgenommen: ENS-Name ist mit Guard Pflicht, ein verkaufter Name lässt alte Aussagen
  stehen, `setNameGuard` prüft nur auf Code.
- Deploy auf Sepolia, beide Contracts verifiziert.

---

## Die vier Dateien in `src/` — Kurzfassung

### `Leaf.sol` — 15 Zeilen, die alles tragen

```
leaf = keccak256(keccak256(abi.encode(uint256 index, string segment)))
```

- **Der Index sitzt im Blatt.** `merkletreejs` sortiert Geschwisterpaare, sonst passt der
  Beweis nicht zu OpenZeppelins `MerkleProof`. Sortieren wirft die Reihenfolge weg — ohne
  Index im Blatt wäre nur *Mitgliedschaft* beweisbar, nicht *Position*.
- **Doppelt gehasht.** Innerer Knoten hasht 64 Byte, ein Blatt außen 32. Damit kann kein
  innerer Knoten als Blatt ausgegeben werden. Ehrlich dazu: `abi.encode(uint256, string)`
  liefert nie 64 Byte, der Angriff wäre hier schon durch die Kodierung ausgeschlossen. Der
  doppelte Hash ist Konvention und Robustheit, nicht Notwendigkeit.

### `CitableRegistry.sol` — 155 Zeilen

- `segmentCount` ist eine **Behauptung des Autors**, keine Prüfung. Das belastbare *n*
  kommt aus dem Bündel, das `verifyBundle` gegen die Wurzel hält.
- `verifySegment` gibt `false` statt zu reverten und prüft `withdrawn` bewusst nicht —
  sonst könnte ein Autor unbequeme Zitate rückwirkend entwerten. Zurückziehen ist
  Metadaten, kein Löschen.
- Der Guard-Aufruf steht **vor** dem Schreiben. Das ist sicher, weil `mayPublish` im
  Interface `view` ist und der Compiler daraus einen `STATICCALL` macht. Die Sicherheit
  hängt an diesem `view`, nicht an der Reihenfolge.
- `owner` ist `immutable`, kein Transfer. Preis: Schlüsselverlust friert den Guard dauerhaft ein.

### `INameGuard.sol` — 15 Zeilen

`address(0)` heißt „keine Prüfung", nicht „niemand darf" — sonst wäre die Registry
zwischen Deploy und `setNameGuard` tot und es gäbe kein Zurück. Bewusst *fail-open*, weil
der Beweis nicht am Namen hängt.

Der Typ `bytes32` statt `string label` ist der Grund, warum nur Namen zweiter Ebene gehen:
Aus einem Hash lässt sich kein Label zurückgewinnen, und ohne Label kein `getSubregistry`.
Die Lücke sitzt **hier**, nicht im Guard.

### `ENSv2NameGuard.sol` — 74 Zeilen

- Keine privilegierte Funktion, kein Owner. Nach dem Deploy vollständig eingefroren.
- `publishRole == 0` würde jeden unter jedem Namen durchlassen (`roles & 0 == 0`), ohne zu
  reverten. Deshalb die Konstruktorprüfung.
- `roles` statt `hasRoles`, weil `hasRoles` die ROOT_RESOURCE mitrechnet und der Registrar
  sonst unter jedem fremden Namen publizieren dürfte.
- Ein verkaufter Name lässt alte Aussagen unverändert — der Guard wird nur beim
  Registrieren gefragt, nie beim Verifizieren. Richtig so, weil die Aussage historisch ist.
