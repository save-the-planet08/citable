# Citable

Verifizierbares Publishing-Register mit Positionsbeweis. ETHOnline 2026, Abgabe 16.09.2026.

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

```bash
npm install && forge test    # braucht ffi = true (steht in foundry.toml)
```

## Stand

Arbeitstag 2 (Mi 09.09.). Erledigt: Foundry-Setup, OpenZeppelin v5.7.0, Blattformel mit
bewiesener JS/Solidity-Parität, `CitableRegistry` mit Positionsbeweis (16 Tests grün),
Schicht 3 gemessen und entschieden (NLI + Wertprüfung statt Ähnlichkeit).

**ENS-Entscheidung gefallen: Weg A** (echtes ENSv2 auf Sepolia). Die deployten Contracts
sind erreichbar und die Interfaces antworten (`script/js/ens-probe.mjs`) — wir nutzen die
ENSv2-Registry, statt eine eigene zu bauen. Offen: Ableitung der Token-ID.

**Als Nächstes:** `BUILD.md` — Client-Bibliothek, ENS-Namensprüfung, Deploy auf Sepolia.

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
- `ensNode` ist im Contract ungeprüft, bis die ENS-Schicht steht.
- Wer denselben Text zuerst registriert, gewinnt — Front-Running ist dokumentiert, nicht gelöst.
- Absatzgranularität, nicht Satzgranularität.
- Das Kaltstart-Problem bleibt ungelöst.

## KI-Nutzung

Contracts, Frontend und Tests entstehen mit Claude Code. Das wird im Einreichungsformular
ehrlich angegeben — KI-Nutzung ist bei ETHGlobal erlaubt, eine Falschaussage disqualifiziert.
