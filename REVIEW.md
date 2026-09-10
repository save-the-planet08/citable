# Verstehen — das laufende Kapitel

Dieses Kapitel baut nichts. Es sorgt dafür, dass Frederik jede Zeile in `src/` erklären
kann, bevor irgendwas darauf gestapelt wird. `BUILD.md` ist abgearbeitet (bis auf den
Broadcast) und gilt nur noch als Nachweis, was beauftragt war.

---

## Wo wir stehen

Arbeitstag 3 (Do 10.09.). Abgabe 16.09. — **sechs Tage**.

| | |
|---|---|
| `forge test` | 50 grün, 55 mit `SEPOLIA_RPC_URL` (dann läuft der Fork-Test mit) |
| `npm test` | 43 grün |
| `forge fmt --check`, `forge build` | sauber, null Warnungen |
| `npm audit --omit=dev` | ohne Befund |
| Contracts on-chain | **keine** — nichts ist deployt |

Gebaut: Blattformel mit bewiesener JS/Solidity-Parität, `CitableRegistry` mit
Positionsbeweis, Client-Bibliothek `lib/citable/`, `INameGuard` als Sperre,
`ENSv2NameGuard` gegen echtes ENSv2 auf Sepolia, Deploy-Skript.

Nicht gebaut: Frontend (keine Zeile), IPFS-Anbindung, Stufe 3 im Browser, Video.

Blockiert: der Broadcast. Braucht einen finanzierten Schlüssel in `.env`. Der Pfad selbst
ist gegen einen lokalen Sepolia-Fork mit echten Transaktionen durchgespielt — Deploy,
Verdrahtung, Registrierung durch einen realen ENS-Namensinhaber, `verifySegment` on-chain
angenommen, Fremder mit `NotAuthorized` abgewiesen.

**Achtung vor dem Deploy:** Der Schlüssel wird dauerhaft `owner` der Registry. `owner` ist
`immutable` — nur dieses Konto kann je den Guard setzen oder tauschen.

---

## Regeln für dieses Kapitel

- **Nur `src/`.** Vier Dateien, zusammen 259 Zeilen. Erst wenn die sitzen, kommen
  `script/` und `test/` — und dort nur sporadisch, nicht Zeile für Zeile.
- **Kein neuer Code**, solange Frederik nicht sagt, dass er den Stand versteht.
- **Eine Frage auf einmal**, dann warten.
- **Nicht erklären, was dasteht.** Erklären, *warum* es so dasteht und was die Alternative
  gekostet hätte. Wo eine Entscheidung schwach ist, wird das gesagt, nicht verteidigt.
- Antworten auf Deutsch, Code und Commits Englisch.

---

## Leseweg durch `src/`

### 1. `Leaf.sol` — 15 Zeilen, die alles tragen

```
leaf = keccak256(keccak256(abi.encode(uint256 index, string segment)))
```

Zwei Entscheidungen stecken darin, beide nicht offensichtlich:

- **Der Index sitzt im Blatt.** `merkletreejs` sortiert Geschwisterpaare, sonst passt der
  Beweis nicht zu OpenZeppelins `MerkleProof`. Sortieren wirft die Reihenfolge weg — ohne
  Index im Blatt wäre nur *Mitgliedschaft* beweisbar, nicht *Position*. Und die Position
  ist der ganze Punkt des Projekts.
- **Doppelt gehasht.** Ein innerer Knoten hasht 64 Byte. Ein Blatt hasht außen 32 Byte.
  Damit kann kein innerer Knoten als Blatt ausgegeben werden. OpenZeppelin-Konvention
  gegen Second-Preimage.

*Prüffrage:* Was ginge kaputt, wenn man den Index weglässt und stattdessen die
Blattreihenfolge im Contract speichert?

### 2. `CitableRegistry.sol` — 155 Zeilen, das eigentliche Register

Speichert pro Wurzel: Autor, `ensNode`, Zeitstempel, `segmentCount`, `withdrawn`, CID.
Kein Text, nie.

Worauf zu achten ist:

- **`registerRoot`** — die Reihenfolge der Prüfungen ist Absicht: billig vor teuer, der
  externe Guard-Aufruf zuletzt.
- **`segmentCount` ist eine Behauptung, keine Prüfung.** Aus einer Wurzel lässt sich die
  Blattzahl nicht zurückrechnen. Das Feld dient nur der Bereichsprüfung in
  `verifySegment`. Das belastbare *n* kommt aus dem Bündel, das `verifyBundle` gegen die
  Wurzel hält. `test_SegmentCountIsUnverified` hält das fest, damit es niemand für eine
  Prüfung hält.
- **`verifySegment` gibt `false` statt zu reverten** und prüft `withdrawn` bewusst nicht —
  sonst könnte ein Autor rückwirkend beweisen, er habe etwas nie gesagt.
- **`owner` ist `immutable`**, `setNameGuard` ist der einzige privilegierte Aufruf.
  Bekannte Zentralisierung: Dieses Konto kann die Namensprüfung abschalten. Es kann
  bestehende Aussagen nicht ändern, und kein Beweis hängt daran.
- **Härtungen aus dem Audit:** Nullwurzel abgelehnt, zweites Zurückziehen abgelehnt,
  Guard-Adresse ohne Code abgelehnt (sonst legt ein Vertipper das ganze Register lahm).

*Prüffrage:* Warum darf eine zurückgezogene Aussage weiterhin verifizieren?

### 3. `INameGuard.sol` — 15 Zeilen, eine Funktion

```solidity
function mayPublish(bytes32 ensNode, address account) external view returns (bool);
```

Die Schnittstelle sagt absichtlich nicht, wie `ensNode` zu lesen ist. Dadurch hängt die
Registry nicht an ENS und ist ohne Guard (`address(0)`) unverändert benutzbar.

*Prüffrage:* Warum ist `address(0)` „keine Prüfung" und nicht „niemand darf"?

### 4. `ENSv2NameGuard.sol` — 74 Zeilen, der ENS-Teil

- **`ensNode` ist `labelhash(label)`**, nicht der ENSv1-Namehash. Aus einem Namehash ließe
  sich das Label nicht zurückgewinnen, und ohne Label findet die ENSv2-Registry ihren
  Eintrag nicht. Folge: **nur Namen zweiter Ebene**, keine Unternamen. Das ist die
  schärfste Lücke zwischen Pitch und Code — `anna.wochenzeitung.eth` aus CONCEPT.md
  funktioniert so **nicht**.
- **Der Guard rechnet nie eine Token-ID aus.** Die unteren 32 Bit einer ENSv2-Token-ID
  tragen `tokenVersionId` aus dem Registry-Speicher, deshalb liefert `ownerOf(labelhash)`
  für *jeden* Namen `0x0`. Er fragt `getOwner` und `roles`, die die Versionsbits selbst
  auflösen. Nachweis: `node script/js/ens-probe.mjs`.
- **Publikationsrolle statt Besitz.** Wer den Namen hält, darf. Wer die Rolle zugewiesen
  bekam, auch — der Volontär unter dem Namen der Zeitung. Genau das macht ENS hier tragend
  statt dekorativ.
- **`roles` statt `hasRoles`.** `hasRoles` rechnet die ROOT_RESOURCE hinzu; der Registrar
  dürfte sonst unter jedem fremden Namen veröffentlichen.
- **Warum `ROLE_SET_RESOLVER`?** Ein eigenes Rollen-Bit ginge nicht — ENSv2 vergibt
  Admin-Rollen nur bei der Registrierung. Gemessen: Jede `.eth`-Registrierung auf Sepolia
  gibt dem Inhaber genau diese Rolle samt Admin-Bit, er kann sie also weiterreichen.

*Prüffrage:* Ein Name wird verkauft. Was passiert mit Aussagen, die der alte Inhaber
darunter registriert hat — und ist das richtig so?

---

## Woran du merkst, dass du durch bist

Beantworte ohne Nachschlagen:

1. Warum steht der Index im Blatt und nicht daneben?
2. Warum wird zweimal gehasht?
3. Was beweist ein Merkle-Beweis hier — und was nicht?
4. Warum ist `segmentCount` keine bewiesene Zahl, und wo kommt das echte *n* her?
5. Was passiert bei `registerRoot`, wenn `nameGuard` auf `address(0)` steht?
6. Warum liefert `ownerOf(labelhash("ens"))` auf Sepolia `0x0` — zwei Gründe?
7. Warum liest der Guard `roles` und nicht `hasRoles`?

---

## Danach

1. `script/` und `test/` überfliegen — vor allem `test/Leaf.t.sol` und
   `test/ProofBridge.t.sol`, weil die zwei die JS↔Solidity-Brücken sichern.
2. Broadcast auf Sepolia, sobald `.env` steht. Adressen danach hier, in `README.md` und in
   `CLAUDE.md` eintragen.
3. Dann erst planen: Verify-Screen zuerst, er ist nicht streichbar.
