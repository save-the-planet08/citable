# Citable

Verifizierbares Publishing-Register mit Positionsbeweis. ETHOnline 2026, Abgabe 16.09.2026.

Vollständiges Manifest: `IDEA.md` — Architektur, Tagesplan, Video-Skript, Bounty-Zuordnung.
Diese Datei ist der Einstieg pro Session, nicht die Spezifikation.

## Der Kernsatz

Nicht "ist dieses Zitat echt?" — sondern **"hier ist der Beweis, dass ich richtig zitiert habe."**

Citable zerlegt eine Aussage in Absätze, bindet jeden an seine Position, legt nur die
Merkle-Wurzel on-chain. Wer zitiert, liefert einen Beweis mit: Dieses Fragment stand
wortgleich an Position *i* von *n*, hier sind die Nachbarn, hier das Datum.

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

Arbeitstag 1 (Di 08.09.) abgeschlossen: Foundry-Setup, OpenZeppelin v5.7.0, Blattformel
auf beiden Seiten, 6 Paritätstests grün, gepusht nach
`github.com/save-the-planet08/citable`.

**Als Nächstes — Tag 2 (Mi 09.09.):**
1. `src/CitableRegistry.sol` nach IDEA.md 4.2 (nutzt `Leaf.leafOf`)
2. Die sechs Pflichttests aus IDEA.md 4.3 grün — besonders `test_RevertWhen_WrongIndex`,
   der beweist, dass der Positionsbeweis wirklich trägt
3. **ENS-Entscheidung A oder B** (IDEA.md 6) — Zeitschranke ist Ende Tag 2

Offen: CI läuft ohne `npm install` und ist deshalb rot.

## Arbeitsregeln

- **Contracts vor Frontend.** Die sechs Registry-Tests sind grün, bevor Next.js angefasst wird.
- **Mindestens ein aussagekräftiger Commit pro Arbeitstag.** ETHGlobal kann Einreichungen
  mit einem einzigen großen Commit disqualifizieren.
- Conventional Commits, Englisch, Imperativ.
- Der Tagesplan in IDEA.md 8 ist verbindlich. Liegt der Stand hinten, wird gestrichen —
  nicht die Nacht durchgearbeitet.

## Streichliste bei Zeitdruck

In dieser Reihenfolge, ohne Rückfrage:

1. The-Graph-Subgraph
2. Author-Screen (Screen 3)
3. IPFS-Pinning — Volltext notfalls ins Repo, CID-Feld leer

**Nicht streichbar:** Verify-Screen, die sechs Registry-Tests, das Video.

## Was bewusst nicht gebaut wird

**Semantische Ähnlichkeit (v2, nicht in diesem Hackathon).** Wenn kein Merkle-Beweis
gefunden wird, wäre eine Embedding-Ähnlichkeit als Sinn-Schicht denkbar — Prozentwert,
klar als Heuristik gekennzeichnet, Entscheidung beim Nutzer. Konzeptionell richtig, aber:
Ein Embedding-Wert ist modellabhängig und damit nicht unabhängig nachrechenbar. Falls das
je gebaut wird, muss das Modell neben der Zahl stehen (`all-MiniLM-L6-v2 · 78 %`), sonst
ist sie eine erfundene Zahl mit Beweis-Anmutung.

In v1 ist der dritte Zustand des Verify-Screens ein **Teilstring**-Vergleich:
"Kommt vor, aber nicht als vollständiges Segment." Deterministisch und laut IDEA.md 9 die
stärkste Sekunde im Video.

**Wahrscheinlichkeit, dass Person X etwas je gesagt hat.** Nicht baubar — der Nenner
(welcher Anteil aller Äußerungen liegt vor?) ist unbekannt, jede Prozentzahl geraten.
Die ehrliche Variante ist eine Abwesenheitsaussage mit sichtbarem Nenner: "Steht in keiner
der 47 registrierten Aussagen von X."

**World / Selfie Check.** Nachweis mit geringer Sicherheitsstufe, als Urheberschaftsnachweis
gegen die ausdrückliche Anweisung des Sponsors.

**Datenbank, Server, Indexer.** Der Volltext liegt auf IPFS, der Baum wird im Client neu
gebaut. Es soll keinen Dienst geben, dem man vertrauen muss.

## Grenzen — gehören ins Video und ins README

- Keine Übersetzungen, keine Paraphrasen. Ein Hash kennt keine Bedeutung.
- Nicht registriert ≠ erfunden.
- Absatzgranularität, nicht Satzgranularität.
- Das Kaltstart-Problem bleibt ungelöst.

## KI-Nutzung

Contracts, Frontend und Tests entstehen mit Claude Code. Das wird im Einreichungsformular
ehrlich angegeben — KI-Nutzung ist bei ETHGlobal erlaubt, eine Falschaussage disqualifiziert.
