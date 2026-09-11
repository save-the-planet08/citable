# Citable

Verifizierbares Publishing-Register mit Positionsbeweis. ETHOnline 2026, Abgabe 16.09.2026.

**Laufendes Kapitel: `NIGHT.md`** — das Produkt fertigbauen. Dort steht der Auftrag, der
Design-Brief und die Reihenfolge. `REVIEW.md` ist abgeschlossen und dient nur noch als
Nachschlagewerk zu `src/`.

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

Arbeitstag 4 (Fr 11.09., in der Nacht davor gebaut). Der volle Ablauf läuft zum ersten Mal
wirklich durch: Text → Bündel → IPFS → Kette → Beweis im Browser.

**Tests:** `forge test` 55 grün, `npm test` 60 grün (CID und Wertprüfung sind dazugekommen),
`forge fmt --check`, `forge build` und `next build` ohne Warnung. `next build` erzeugt nur
statische Routen — der Vercel-Deploy ist ein Konfigurationsschritt, kein Umbau.

**`wochenzeitung.eth` gehört uns.** Der ENSv2-Registrar auf Sepolia nimmt ein Test-USDC mit
öffentlichem `mint`, also war der zweite Weg aus NIGHT.md 2 doch offen. Damit **blieb der
Guard die ganze Zeit scharf** — die drei Transaktionen mit Guard-Abschalten waren nicht
nötig und sind nicht passiert. `script/js/ens-register.mjs` macht den Weg reproduzierbar.

**Zwei Aussagen registriert**, beide unter diesem Namen, beide mit scharfem Guard:

| | |
|---|---|
| `statements/wochenzeitung/anhoerung.txt` | `0xa2ea6730…891ebc4b`, 7 Absätze |
| `statements/wochenzeitung/quartalszahlen.txt` | `0x2690f5f5…33b45caf`, 6 Absätze |

`quartalszahlen.txt` ist **wörtlich** der Messkorpus aus `script/js/entailment-eval.mjs`.
Stünde dort ein anderer Text, wären die Zahlen im Video nicht die gemessenen.

**CID ohne kubo** (`lib/citable/cid.mjs`): eine Datei unter der Chunk-Größe ist ein einzelner
Raw-Block, ihre CID also sha256 mit vier Byte Kopf. Gegen kubo 0.43.0 geprüft, Vektoren
liegen im Test. Darüber hinaus wirft es, statt eine CID zu raten, die nirgendwohin zeigt.

**Die Bündel-Quellen laufen um die Wette**, und die Wurzelprüfung ist *in* das Rennen
hineingegeben: wer Bytes liefert, die die Wurzel nicht nachbauen, verliert das Rennen,
statt geglaubt zu werden. Deshalb darf die App eine eigene Kopie ausliefern
(`frontend/public/bundles/`) — sie kauft Erreichbarkeit, nicht Vertrauen, und der Screen
sagt, welche Quelle geantwortet hat. Ausfall und Fälschung bleiben getrennt: „niemand
antwortet" beweist nichts, „jemand antwortet mit falschen Bytes" ist ein Vorwurf.

**Stufe 3 läuft im Browser** und reproduziert die gemessenen Zahlen: englische Übersetzung
0,8253 (CONCEPT.md maß 0,821 in Node), „vierzig Prozent" wird von der Wertprüfung gar nicht
erst bewertet, das Falschzitat bekommt 9 %.

**transformers.js lässt sich hier nicht bündeln.** `env.js` liest beim Import `fs`, um zu
entscheiden, ob es auf einem Server läuft; Turbopack übersetzt ein nacktes Node-Builtin im
Browser-Bundle zu `void 0`, und `Object.keys(void 0)` tötet die Bibliothek vor dem ersten
Modell-Byte. `resolveAlias` hilft nicht — die Ersetzung passiert vor der Auflösung. Die
Bibliothek kommt jetzt zur Laufzeit von jsDelivr, die Gewichte von huggingface.co. Das ist
eine echte Abhängigkeit und steht so im README. Stufe 1 und 2 sind davon nicht berührt.

**Registrieren-Screen steht.** Der Browser rechnet für `anhoerung.txt` dieselbe Wurzel und
dieselbe CID wie `script/js/publish.mjs` — geprüft, nicht angenommen. Schritt 3 (Bündel
herunterladen) ist Pflicht, weil die Seite keinen Pinning-Schlüssel hat: wer ohne die Bytes
registriert, legt einen toten Link mit Zeitstempel auf die Kette.

**Landingpage:** fünf Abschnitte, zwei davon bewegt — der Baum zeichnet sich von den
Blättern aufwärts (die Reihenfolge, in der er gerechnet wird), und die Behauptung steht
still, während die drei Stufen daran vorbeilaufen. Die Grenzen-Sektion ist bewusst
unbewegt. Geprüft auf 1440 und 390 und mit `prefers-reduced-motion`.

**Contracts** (unverändert, Arbeitstag 3):

| | |
|---|---|
| `CitableRegistry` | `0xD3B137b6c6f572290Cf91ac312319364822792e7` |
| `ENSv2NameGuard` | `0x67732407626BCb5D5610887EC97782c610F5E8d2` |
| `owner` (immutable) | `0x5b5Bd6a1523612B67C32D4aDC8b52766d0085D19` |

**Offen und nur von Frederik zu lösen:** Pinata-Konto (`PINATA_JWT` in `.env`, dann pinnt
`publish.mjs` zusätzlich dorthin — sonst hält nur die App-eigene Kopie die CIDs), Vercel,
Video, Einreichungsformular. Alle vier sind Konfiguration, kein Umbau.

**Noch nicht gebaut:** Author-Screen (steht ohnehin auf der Streichliste). Zwei
Hero-Varianten liegen zur Wahl in `design/hero/` — gebaut ist Variante D.

## Arbeitsregeln

- **Contracts vor Frontend.** Erledigt — die Contracts sind deployt und verifiziert.
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
- Stufe 3 zieht Code von jsDelivr und Gewichte von huggingface.co. Nicht bündelbar, siehe
  Stand. Stufe 1 und 2 sind davon nicht berührt — sie brauchen nur die Kette und die Bytes.
- Die registrierten Bündel tragen **keine** Vektoren, Stufe 3 rechnet sie zur Abfragezeit.
  Kein Loch im Argument: die Absätze wurden vorher gegen die Wurzel gehalten, und wer die
  Vektoren selbst rechnet, muss dem Veröffentlichenden noch weniger glauben als CONCEPT.md 3
  annimmt. Es kostet Zeit, nicht Vertrauen. Nachträglich nachrüsten geht nicht: die CID
  steht unveränderlich auf der Kette, eine neue CID hieße eine neue Wurzel.
- **Kein öffentliches Gateway hält diese CIDs.** Ohne Pinning-Dienst liefert nur die Kopie
  in `frontend/public/bundles/`. Die wird wie jede Quelle gegen die Wurzel geprüft und im
  Screen als das benannt, was sie ist — aber es ist Erreichbarkeit auf genau einem Ursprung,
  also das, wogegen IPFS gewählt wurde.
- Der Registrieren-Screen pinnt nicht. Er hat keinen Schlüssel, lädt nichts hoch und
  verlangt deshalb den Download, bevor er die Transaktion anbietet.
- Das Kaltstart-Problem bleibt ungelöst.

## KI-Nutzung

Contracts, Frontend und Tests entstehen mit Claude Code. Das wird im Einreichungsformular
ehrlich angegeben — KI-Nutzung ist bei ETHGlobal erlaubt, eine Falschaussage disqualifiziert.
