# Citable

Verifizierbares Publishing-Register mit Positionsbeweis. ETHOnline 2026, Abgabe 16.09.2026.

**Laufendes Kapitel: `REVIEW.md`** — verstehen statt bauen. Kein neuer Code, bis Frederik
den Stand von `src/` durchhat. Dort steht auch der aktuelle Stand mit Zahlen.

**Maßgebliche Spezifikation: `CONCEPT.md`** — beide Schichten, mit den Messwerten, auf denen
die Entscheidungen beruhen. `IDEA.md` ist der erste Entwurf und kennt Schicht 3 nicht; es
gilt nur noch für Tagesplan, Video-Skript und Bounty-Zuordnung. Bei Widerspruch gewinnt
CONCEPT.md. Diese Datei hier ist der Einstieg pro Session, nicht die Spezifikation.

## Der Kernsatz

Nicht "ist dieses Zitat echt?" — sondern **"hier ist der Beweis, dass ich richtig zitiert habe."**

Citable zerlegt eine Aussage in Absätze, bindet jeden an seine Position, legt nur die
Merkle-Wurzel on-chain. Wer zitiert, liefert einen Beweis mit: Dieses Fragment stand
wortgleich an Position *i* von *n*, hier sind die Nachbarn, hier das Datum.

Findet sich kein wörtlicher Treffer, kommt Stufe 3: Übersetzungen und Umformulierungen
werden über NLI erkannt und als Deckungsgrad beziffert — ausdrücklich als Messung, nicht
als Beweis.

## Zwei Invarianten — nie ändern ohne Not

Ändert sich eine davon, sind alle bereits registrierten Aussagen nicht mehr prüfbar.

**1. Blattformel** (`src/Leaf.sol`, `script/js/leaf.mjs`)

```
leaf = keccak256(keccak256(abi.encode(uint256 index, string segment)))
```

Der Index sitzt *im* Blatt, weil `merkletreejs` mit `sortPairs: true` die Reihenfolge
sonst verliert — ein sortierter Beweis zeigt nur Mitgliedschaft, nicht Position. Doppelte
Hashung ist OpenZeppelin-Konvention gegen Second-Preimage.

**2. Segmentierung** (v1, bewusst dumm)

- Trennen an `\n\n` (Leerzeile), also Absätze — nicht an Sätzen
- Whitespace am Rand jedes Segments abschneiden
- Leere Segmente verwerfen
- UTF-8, keine Normalisierung

Absätze statt Sätze, weil Satzgrenzenerkennung sprachabhängig ist und zwei
Implementierungen zu verschiedenen Bäumen kommen. Diese Regel gehört wortgleich ins README.

## JS ↔ Solidity muss byte-identisch bleiben

Das größte technische Risiko im Projekt. `test/Leaf.t.sol` ruft per FFI
`script/js/leaf.mjs` auf und vergleicht gegen `Leaf.leafOf` — kein hardcodiertes Fixture,
sonst driften beide Seiten unbemerkt auseinander.

Wer die Blattformel anfasst, fasst **beide** Dateien an. `forge test` beweist es.

Dasselbe gilt für den ganzen Beweis: `test/ProofBridge.t.sol` lässt `script/js/tree.mjs`
segmentieren und den Baum bauen und legt das Ergebnis `verifySegment` vor. Segmentierung,
Baumform und Paarsortierung müssen also ebenfalls übereinstimmen.

```bash
npm install && forge test    # braucht ffi = true (steht in foundry.toml)
npm test                     # Client-Bibliothek
```

## Stand

Arbeitstag 2 (Mi 09.09.). Erledigt: Foundry-Setup, OpenZeppelin v5.7.0, Blattformel mit
bewiesener JS/Solidity-Parität, `CitableRegistry` mit Positionsbeweis, Schicht 3 gemessen
und entschieden (NLI + Wertprüfung statt Ähnlichkeit), Client-Bibliothek `lib/citable/`,
und die ENS-Schicht.

**Tests:** `forge test` 50 grün (55 mit `SEPOLIA_RPC_URL`, dann läuft der Fork-Test mit),
`npm test` 43 grün, `forge fmt --check` und `forge build` ohne Warnung.

**ENS-Entscheidung Weg A ist umgesetzt.** Die offene Frage aus BUILD.md 2a ist geklärt:
Die unteren 32 Bit einer ENSv2-Token-ID tragen `tokenVersionId` aus dem Registry-Speicher
(`LibLabel.withVersion(anyId, v) = anyId ^ uint32(anyId) ^ v`), deshalb liefert
`ownerOf(labelhash)` für *jeden* Namen `0x0`. `"ens"` hat zusätzlich keinen Inhaber, weil
es RESERVED ist. Bewiesen in `script/js/ens-probe.mjs` gegen Namen, die es selbst aus
Mint-Ereignissen findet — darunter einer bei Version 9.

Daraus folgt die Bauregel: **Der Guard rechnet nie eine Token-ID aus**, er fragt die
Registry (`getOwner`, `roles`), die die Versionsbits selbst auflöst.

`ENSv2NameGuard` prüft nicht bloß Besitz, sondern eine Publikationsrolle
(`ROLE_SET_RESOLVER`, per Konstruktor gesetzt). Ein eigenes Rollen-Bit ginge nicht: ENSv2
vergibt Admin-Rollen nur bei der Registrierung. Der Guard liest `roles` statt `hasRoles`,
sonst dürfte der Registrar der ROOT_RESOURCE unter jedem fremden Namen veröffentlichen.

`ensNode` heißt ab jetzt: die ENSv2-Kennung eines Namens, also `labelhash(label)` — nicht
der ENSv1-Namehash. Aus einem Namehash ließe sich das Label nicht zurückgewinnen.

**Der Deploy-Pfad ist bewiesen, nicht bloß geschrieben.** Gegen einen lokalen Anvil-Fork
von Sepolia wurde wirklich gebroadcastet: beide Contracts deployt, Guard verdrahtet,
`deployments/sepolia.json` geschrieben. Danach der Rauchtest mit echtem ENS-Zustand — ein
realer Namensinhaber registriert, der Beweis aus `lib/citable/` wird von `verifySegment`
angenommen, an falscher Position abgelehnt, ein Fremder scheitert an `NotAuthorized`. Die
Artefakte des Forks sind wieder entfernt.

**Deployt auf Sepolia** (Arbeitstag 3, Do 10.09.), beide Contracts auf Etherscan verifiziert:

| | |
|---|---|
| `CitableRegistry` | `0xD3B137b6c6f572290Cf91ac312319364822792e7` |
| `ENSv2NameGuard` | `0x67732407626BCb5D5610887EC97782c610F5E8d2` |
| `owner` (immutable) | `0x5b5Bd6a1523612B67C32D4aDC8b52766d0085D19` |

Der Guard ist verdrahtet und scharf: `nameGuard` zeigt auf den Guard, `PUBLISH_ROLE` ist
16777216 (`1 << 24`), `REGISTRY` auf die ENSv2-ETHRegistry. Gegengeprüft mit `cast call`
gegen die Kette, nicht nur aus der Skriptausgabe. `leafOf(3, "Hallo Welt")` liefert on-chain
denselben Hash wie `script/js/leaf.mjs` — die JS/Solidity-Parität ist damit gegen den echten
Contract bewiesen.

Nur dieses `owner`-Konto kann je den Guard setzen oder tauschen. `owner` ist `immutable`,
daran ist nichts mehr zu ändern.

**Als Nächstes:** Frontend, Verify-Screen zuerst. Offen aus `REVIEW.md`: `script/` und
`test/` überfliegen, vor allem `test/Leaf.t.sol` und `test/ProofBridge.t.sol`.

`BUILD.md` ist abgearbeitet bis auf den Broadcast und gilt nur noch als Nachweis, was
beauftragt war.

**Nicht vergessen — `segmentCount` ist keine bewiesene Zahl.** Aus einer Wurzel lässt sich
die Blattzahl nicht zurückrechnen. Das Feld dient nur der Bereichsprüfung. Das *n* in
"Absatz i von n" kommt aus dem Bündel, das `verifyBundle` gegen die Wurzel hält — dort ist
es bewiesen.

## Arbeitsregeln

- **Contracts vor Frontend.** Die sechs Registry-Tests sind grün, bevor Next.js angefasst wird.
- **Mindestens ein aussagekräftiger Commit pro Arbeitstag.** ETHGlobal kann Einreichungen
  mit einem einzigen großen Commit disqualifizieren.
- Conventional Commits, Englisch, Imperativ.
- Der Tagesplan in IDEA.md 8 ist überholt (er kennt Schicht 3 nicht), die Abgabe am
  16.09. nicht. Liegt der Stand hinten, wird gestrichen — nicht die Nacht durchgearbeitet.

## Streichliste bei Zeitdruck

In dieser Reihenfolge, ohne Rückfrage:

1. ~~The-Graph-Subgraph~~ — bereits gestrichen
2. Author-Screen (Screen 3)
3. IPFS-Pinning — Volltext notfalls ins Repo, CID-Feld leer
4. Stufe 3 im Browser → notfalls nur als Skript im Video zeigen

**Nicht streichbar:** Verify-Screen mit Stufe 1 und 2, die Registry-Tests, das Video.

## Was bewusst nicht gebaut wird

**Reine Ähnlichkeitsmessung als Deckungsmaß.** Gemessen und verworfen: Embeddings bewerten
ein Falschzitat (0,880) höher als eine korrekte Übersetzung (0,877), weil sie Thema statt
Aussage messen. Stufe 3 nutzt deshalb NLI (entailment) plus eine deterministische
Wertprüfung — siehe CONCEPT.md und `script/js/entailment-eval.mjs`. Die angezeigte
Prozentzahl bedeutet "kein Falschzitat aus dem Testsatz erreichte diesen Wert", nicht
"zu X % wahr".

**Wahrscheinlichkeit, dass Person X etwas je gesagt hat.** Nicht baubar — der Nenner
(welcher Anteil aller Äußerungen liegt vor?) ist unbekannt, jede Prozentzahl geraten.
Die ehrliche Variante ist eine Abwesenheitsaussage mit sichtbarem Nenner: "Steht in keiner
der 47 registrierten Aussagen von X."

**World / Selfie Check.** Nachweis mit geringer Sicherheitsstufe, als Urheberschaftsnachweis
gegen die ausdrückliche Anweisung des Sponsors.

**Datenbank, Server, Indexer.** Der Volltext liegt auf IPFS, der Baum wird im Client neu
gebaut. Es soll keinen Dienst geben, dem man vertrauen muss.

## Grenzen — gehören ins Video und ins README

- Stufe 3 ist eine Messung, kein Beweis, und kann falsch liegen.
- Spanisch ist schwach (0,562 gegen 0,821 für Englisch) und fällt bei Schwelle 0,80 durch.
- 16 Testfälle sind ein Signal, keine Validierung.
- Ironie und Zitat-im-Zitat werden nicht erkannt. Frage-gegen-Aussage schon.
- Nicht registriert ≠ erfunden.
- Die Namensprüfung ist aus, solange `nameGuard` auf `address(0)` steht.
- Der Besitzer der Registry kann den Guard wieder abschalten — bekannter zentraler Punkt.
- Mit gesetztem Guard ist ein ENS-Name Pflicht: `ensNode == bytes32(0)` scheitert an
  `NotAuthorized`, weil `getOwner(0)` keinen Inhaber kennt. Anonym registrieren geht nur
  ohne Guard. Kein Test hält das fest — es ist Folge der Guard-Logik, nicht Entwurf.
- Wird ein Name verkauft, bleiben die Aussagen des alten Inhabers unverändert stehen; der
  Guard wird nur beim Registrieren gefragt, nie beim Verifizieren. Richtig so, weil die
  Aussage historisch ist — aber der Verify-Screen zeigt nicht, ob der Name inzwischen den
  Besitzer gewechselt hat.
- `setNameGuard` prüft nur, dass an der Adresse Code liegt, nicht dass es ein Guard ist.
  Ein falscher Contract lässt jede Registrierung reverten, heilbar durch einen zweiten
  Aufruf.
- Der Guard deckt eine Registry und nur Namen zweiter Ebene ab; Unternamen sind vertagt.
- Wer denselben Text zuerst registriert, gewinnt — Front-Running ist dokumentiert, nicht gelöst.
- Absatzgranularität, nicht Satzgranularität.
- Das Kaltstart-Problem bleibt ungelöst.

## KI-Nutzung

Contracts, Frontend und Tests entstehen mit Claude Code. Das wird im Einreichungsformular
ehrlich angegeben — KI-Nutzung ist bei ETHGlobal erlaubt, eine Falschaussage disqualifiziert.
