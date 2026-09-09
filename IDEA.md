# Citable — Projekt-Manifest

> **Überholt seit 09.09.2026.** Dieses Dokument ist der erste Entwurf und beschreibt nur
> die Merkle-Schicht. Die semantische Stufe 3 — der eigentliche Kern des Projekts — fehlt
> hier vollständig, und Abschnitt 5 (Verify-Screen), 7 (Bounties) und 8 (Tagesplan) sind
> nicht mehr aktuell. **Maßgeblich ist `CONCEPT.md`.** Behalten für Video-Skript (9),
> README-Gerüst (10) und die Risikoliste (11).

**Verifizierbares Publishing-Register mit Positionsbeweis**

| | |
|---|---|
| Event | ETHOnline 2026 |
| Zeitraum | 4.–16. September 2026 |
| Heute | 8. September 2026 — Tag 5 von 13 |
| Abgabe | 16. September 2026 (Zielabgabe: 15. September) |
| Track | Start Fresh |
| Bounties | ENS (Haupt), The Graph (optional) |
| Stack | Foundry · Solidity 0.8.24 · Next.js · viem/wagmi · merkletreejs · Sepolia |

---

## 0. Korrekturen gegenüber dem ersten Entwurf

Diese vier Punkte waren falsch und sind hier behoben. Nicht überlesen.

### 0.1 Der Positionsbeweis funktionierte nicht

`merkletreejs` sortiert Geschwisterpaare standardmäßig (`sortPairs: true`). Das ist bequem, weil man die Richtung nicht mitführen muss — **aber genau dadurch geht die Position verloren.** Ein sortierter Merkle-Beweis zeigt nur Mitgliedschaft, nicht Reihenfolge. Das Kernversprechen des Projekts wäre nicht beweisbar gewesen.

**Fix:** Der Index wandert ins Blatt.

```
leaf = keccak256(keccak256(abi.encode(uint256 index, string segment)))
```

Damit ist die Position kryptografisch an das Segment gebunden. Sortierte Paare sind jetzt unproblematisch und kompatibel mit OpenZeppelins `MerkleProof`. Nebeneffekt: Zwei identische Sätze im selben Text kollidieren nicht mehr.

Die doppelte Hashung ist die OpenZeppelin-Konvention gegen Second-Preimage-Angriffe. Nicht weglassen.

### 0.2 Der ENS-Teil erfüllt die Bounty vermutlich nicht

Ein selbst geschriebener `ENSSubnameManager` fasst ENS nicht an. Die Bounty verlangt ausdrücklich ENSv2 auf Sepolia, und dass die ENSv2-Features zentral sind, nicht kosmetisch. Ein eigener Contract, der zufällig auch Subnamen verwaltet, ist kein ENSv2-Einsatz.

**Konsequenz:** Siehe Abschnitt 6. Das ist das größte Risiko im Projekt und braucht am Tag 2 eine Entscheidung.

### 0.3 Falsches Datum

Der Vorentwurf nannte ETHOnline 2025 und den 26. Oktober. Beides falsch. Alle Fristen in diesem Dokument sind korrigiert.

### 0.4 Falschaussage zur KI-Nutzung

Im Vorentwurf stand, KI werde nicht als Code-Generator eingesetzt. Das stimmt nicht — die Arbeit läuft über Claude Code. Im Einreichungsformular wird das **ehrlich angegeben**. Eine Falschaussage dort kann disqualifizieren, und der Nutzen einer Lüge ist null: KI-Nutzung ist bei ETHGlobal erlaubt.

---

## 1. Das Projekt in drei Sätzen

Zitate aus dem Zusammenhang zu reißen ist die häufigste Form von Desinformation, und es gibt heute keine Infrastruktur, die dagegen hilft: Ein Link bricht, wenn das Original gelöscht wird, und ein Screenshot ist beliebig fälschbar.

Citable zerlegt eine Aussage beim Veröffentlichen in Segmente, baut daraus einen Merkle-Baum und legt nur die Wurzel on-chain — signiert vom Autor, gebunden an einen Namen.

Wird später ein Fragment zitiert, liefert der Zitierende einen Merkle-Beweis mit, und jeder kann in Sekunden nachrechnen: Dieses Fragment stand wortgleich an Position *i* von *n*, hier sind seine Nachbarn, hier ist das Datum.

**Der Pitch-Satz:** Nicht "ist dieses Zitat echt?" — sondern "hier ist der Beweis, dass ich richtig zitiert habe."

---

## 2. Was es kann und was nicht

Beides gehört ins Video. Die Grenzen offen zu nennen ist bei Juroren ein Vorteil.

**Kann:**
- Wortgenaue Zugehörigkeit eines Fragments zu einer Aussage beweisen
- **Position** beweisen — Segment *i* von *n*
- Nachbarsegmente mitliefern, damit Kontext prüfbar ist
- Urheberschaft an einen Namen binden statt an eine anonyme Adresse
- Überleben, wenn das Original gelöscht wird — die Wurzel bleibt

**Kann nicht:**
- Übersetzungen oder Paraphrasen erkennen. Ein Hash kennt keine Bedeutung
- Erfundene Zitate entlarven. Nicht registriert heißt nur: nicht registriert
- Das Adoptionsproblem lösen. Kein Hackathon-Projekt tut das

---

## 3. Architektur

Bewusst **ohne Datenbank**. Der Vorentwurf hatte Postgres/SQLite im Indexer — das ist eine ganze Komponente, die du nicht brauchst und die dich einen Tag kostet.

Der Volltext liegt auf IPFS. Wer prüfen will, holt den Volltext, baut den Baum lokal neu und erzeugt den Beweis selbst. Das ist nicht nur einfacher, es ist auch **konzeptionell besser**: Es gibt keinen Dienst, dem man vertrauen muss.

```
┌──────────────────────────────────────────────────────────┐
│                    NEXT.JS FRONTEND                       │
│   Register (publish)  │  Verify (cite)  │  Author (ENS)   │
└───────────┬──────────────────┬───────────────┬───────────┘
            │                  │               │
            ▼                  ▼               ▼
┌──────────────────────────────────────────────────────────┐
│              CLIENT-SIDE (kein Server, keine DB)          │
│   segmentieren · merkletreejs · Beweis bauen · prüfen     │
└───────────┬──────────────────────────────────┬───────────┘
            │                                  │
            ▼                                  ▼
┌───────────────────────┐        ┌────────────────────────┐
│   SEPOLIA CONTRACT    │        │   IPFS (Volltext)      │
│   CitableRegistry     │        │   Pinata oder lokal    │
│   - registerRoot()    │        └────────────────────────┘
│   - verifySegment()   │
│   - getStatement()    │
└───────────┬───────────┘
            │
            ▼ (nur wenn Zeit)
┌──────────────────────────────────────────────────────────┐
│           THE GRAPH SUBGRAPH — Aufstockung                │
│   Indexiert StatementRegistered-Events                    │
│   GraphQL: alle Aussagen eines Autors, Suche über Wurzeln │
└──────────────────────────────────────────────────────────┘
```

### Datenfluss Registrierung

1. Autor tippt Text ins Frontend
2. Client segmentiert (Absätze, siehe 4.1)
3. Für jedes Segment: `leaf = keccak256(keccak256(abi.encode(index, text)))`
4. merkletreejs baut den Baum, liefert die Wurzel
5. Volltext + Segmentliste nach IPFS → CID
6. `registerRoot(root, ensNode, cid, segmentCount)` auf Sepolia

### Datenfluss Prüfung

1. Prüfer hat: Fragment, Wurzel (oder Statement-Link)
2. Client holt Volltext über die CID aus dem Contract
3. Client baut den Baum neu, findet das Segment, erzeugt den Beweis
4. `verifySegment(root, index, text, proof)` — view call, kostenlos
5. Anzeige: Position *i* von *n*, Nachbarn *i-1* und *i+1*, Datum, Autor

---

## 4. Contracts

### 4.1 Segmentierung — vorher festlegen

Die Segmentgrenzen müssen **deterministisch** sein, sonst baut der Prüfer einen anderen Baum als der Autor und nichts stimmt überein.

Regel für v1, bewusst dumm und robust:

- Trennen an `\n\n` (Leerzeile), also Absätze — nicht an Sätzen
- Whitespace am Rand jedes Segments abschneiden
- Leere Segmente verwerfen
- UTF-8, keine Normalisierung

**Warum Absätze statt Sätze:** Satzgrenzenerkennung ist sprachabhängig und fehleranfällig (Abkürzungen, Zitate, Zahlen). Zwei Implementierungen kommen zu unterschiedlichen Ergebnissen. Absätze sind eindeutig. Das kostet Granularität und spart dir einen halben Tag Fehlersuche.

Diese Regel gehört ins README, wortgleich.

### 4.2 CitableRegistry.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title CitableRegistry
/// @notice Register für Merkle-Wurzeln von Aussagen, mit Positionsbeweis.
contract CitableRegistry {
    struct Statement {
        address author;
        bytes32 ensNode;
        uint64  timestamp;
        uint32  segmentCount;
        bool    withdrawn;
        string  cid;
    }

    mapping(bytes32 root => Statement) public statements;
    mapping(address author => bytes32[] roots) private _rootsByAuthor;

    uint256 public statementCount;

    event StatementRegistered(
        bytes32 indexed root,
        address indexed author,
        bytes32 indexed ensNode,
        uint32  segmentCount,
        string  cid
    );

    event StatementWithdrawn(bytes32 indexed root, uint64 at);

    error AlreadyRegistered();
    error EmptyStatement();
    error NotAuthor();
    error UnknownStatement();

    // ---------------------------------------------------------------
    // Schreiben
    // ---------------------------------------------------------------

    function registerRoot(
        bytes32 root,
        bytes32 ensNode,
        string calldata cid,
        uint32 segmentCount
    ) external {
        if (statements[root].timestamp != 0) revert AlreadyRegistered();
        if (segmentCount == 0) revert EmptyStatement();

        statements[root] = Statement({
            author:       msg.sender,
            ensNode:      ensNode,
            timestamp:    uint64(block.timestamp),
            segmentCount: segmentCount,
            withdrawn:    false,
            cid:          cid
        });

        _rootsByAuthor[msg.sender].push(root);
        unchecked { ++statementCount; }

        emit StatementRegistered(root, msg.sender, ensNode, segmentCount, cid);
    }

    /// @notice Der Autor kann eine Aussage als zurückgezogen markieren.
    /// @dev Beweise bleiben gültig. Zurückziehen ist Metadaten, kein Löschen —
    ///      sonst könnte ein Autor unbequeme Zitate nachträglich entwerten.
    function withdrawStatement(bytes32 root) external {
        Statement storage s = statements[root];
        if (s.timestamp == 0) revert UnknownStatement();
        if (s.author != msg.sender) revert NotAuthor();
        s.withdrawn = true;
        emit StatementWithdrawn(root, uint64(block.timestamp));
    }

    // ---------------------------------------------------------------
    // Lesen
    // ---------------------------------------------------------------

    /// @notice Blattberechnung. Muss byte-identisch im Frontend nachgebaut werden.
    function leafOf(uint256 index, string calldata segment)
        public pure returns (bytes32)
    {
        return keccak256(bytes.concat(keccak256(abi.encode(index, segment))));
    }

    /// @notice Beweist, dass `segment` an Position `index` in der Aussage `root` stand.
    function verifySegment(
        bytes32 root,
        uint256 index,
        string calldata segment,
        bytes32[] calldata proof
    ) external view returns (bool) {
        if (statements[root].timestamp == 0) return false;
        if (index >= statements[root].segmentCount) return false;
        return MerkleProof.verify(proof, root, leafOf(index, segment));
    }

    function getStatement(bytes32 root) external view returns (Statement memory) {
        return statements[root];
    }

    function rootsByAuthor(address author) external view returns (bytes32[] memory) {
        return _rootsByAuthor[author];
    }
}
```

**Beachten:**
- `verifySegment` prüft **nicht** `withdrawn`. Das ist Absicht. Ein Autor darf nicht rückwirkend beweisen können, dass er etwas nie gesagt hat. Die Wurzel und der Zeitstempel bleiben für immer. `withdrawn` ist nur eine Anzeige im Frontend.
- `leafOf` ist `public pure`, damit du im Frontend gegen den Contract testen kannst, ob deine JS-Implementierung dasselbe Blatt berechnet. Das ist der Punkt, an dem 80 % der Merkle-Projekte scheitern. Prüf es früh.
- Custom Errors statt `require`-Strings — du kennst das, und es ist billiger.

### 4.3 Foundry-Tests, Pflichtumfang

Diese sechs müssen grün sein, bevor du das Frontend anfasst:

| Test | Was er prüft |
|---|---|
| `test_RegisterRoot` | Speichern und Event |
| `test_RevertWhen_AlreadyRegistered` | Doppelregistrierung wird abgelehnt |
| `test_VerifySegment_ValidProof` | Gültiger Beweis geht durch |
| `test_RevertWhen_WrongIndex` | Richtiges Segment, falsche Position → false |
| `test_VerifySegment_UnknownRoot` | Unbekannte Wurzel → false |
| `test_WithdrawnStatementStillVerifies` | Zurückgezogen ≠ ungültig |

Der vierte ist der wichtigste. **Er ist der Beweis, dass dein Positionsbeweis wirklich funktioniert.** Zeig ihn im Video.

---

## 5. Frontend

Drei Screens. viem + wagmi, weil das der Ökosystem-Standard ist und weil du es ohnehin lernen musst.

**Regel: hässlich und funktionierend schlägt schön und kaputt.** Next.js + Tailwind, kein Design-System.

### Screen 1 — Register
Textarea → "Segmentieren" zeigt nummerierte Absätze → Wurzel wird angezeigt → Wallet-Signatur → `registerRoot`. Erfolg: Transaktions-Hash und Wurzel zum Kopieren.

### Screen 2 — Verify
Zwei Eingaben: Wurzel (oder Link) und Fragment. Ergebnis in drei Zuständen:

- ✅ **Gefunden** — "Segment 3 von 87, veröffentlicht am 03.09.2026 von anna.wochenzeitung.eth", darunter Segment 2 und 4 ausgegraut als Kontext
- ❌ **Nicht enthalten** — "Dieses Fragment steht nicht in dieser Aussage"
- ⚠️ **Teiltreffer** — Fragment ist Teilstring eines Segments, aber nicht das ganze Segment. Ehrlich anzeigen: "Kommt vor, aber nicht als vollständiges Segment"

Der dritte Zustand ist der interessanteste und gehört ins Video, weil er der echte Fall ist.

### Screen 3 — Author
Name oder Adresse eingeben → alle Aussagen. Aus Contract-Events oder Subgraph.

### Die eine Sache, die zuerst laufen muss

Bevor irgendetwas anderes: **Ein Skript, das ein Blatt in JS berechnet und mit `leafOf` aus dem Contract vergleicht.** Wenn `abi.encode` in viem und in Solidity nicht dasselbe Byte-Ergebnis liefern, funktioniert nichts, und du findest es sonst erst am Tag 6.

---

## 6. Die ENS-Entscheidung — größtes Risiko

Die ENS-Bounty verlangt ENSv2 auf Sepolia, mit den ENSv2-Features als Kern und nicht als Beiwerk. Ein selbstgebauter Subname-Contract erfüllt das mit hoher Wahrscheinlichkeit **nicht**.

Es gibt zwei Wege, und du musst dich am Ende von Tag 2 entscheiden.

**Weg A — echtes ENSv2.** Du deployst eine eigene Subname-Registry gegen die ENSv2-Contracts auf Sepolia, mit Enhanced Access Control für die Rolle "darf unter diesem Namen veröffentlichen". Wenn das läuft, sitzt du auf einer $4.500-Bounty mit wenig Konkurrenz, weil ENSv2 Beta ist und kaum jemand Erfahrung hat.

Risiko: dünne Dokumentation, Bugs, die vor dir niemand gefunden hat.

**Weg B — eigener Contract, ENS nur zur Namensauflösung.** Schnell, sicher, funktioniert. Aber für die ENS-Bounty vermutlich zu wenig.

**Empfehlung:** Tag 2 vormittags in Weg A investieren. Kommt bis abends kein Subname zustande, auf Weg B umschwenken und die Restzeit ins Frontend stecken. Ein laufendes Projekt ohne ENS-Bounty schlägt ein halbfertiges mit.

**Sofort erledigen, unabhängig vom Weg:** ENSv2-Dokumentation aufrufen, einen Testnamen auf Sepolia registrieren, Faucet-ETH holen. Wenn irgendwo eine Warteschlange oder ein Formular ist, willst du das heute wissen und nicht an Tag 5.

---

## 7. Bounty-Zuordnung

Bei der Einreichung wählst du bis zu drei Partner-Preise.

### ENS — $4.500 (Haupt)
Genutzte ENSv2-Features und warum sie tragend sind: Ohne Identitätsschicht ist jede Signatur anonym, und "Schlüssel 0x7f3a… hat das gesagt" beweist gegenüber einem Leser nichts. Die Bindung an einen Namen ist keine Zierde, sie ist der Grund, warum der Beweis überzeugt.

Im Formular: konkrete Codezeilen verlinken, nicht nur das Repo.

### The Graph — $5.000 (nur wenn Zeit)
Subgraph indexiert `StatementRegistered`. Live-Daten aus Subgraph Studio, keine Mocks. Ehrlich: Das ist ein einzelner Subgraph, und die Bounty verlangt mehr als das. Rechne dir keine großen Chancen aus, aber es kostet wenig, wenn der Rest steht.

### World — bewusst ausgelassen
Selfie Check ist ein Nachweis mit geringer Sicherheitsstufe. Ihn als Urheberschaftsnachweis einzusetzen widerspricht der ausdrücklichen Anweisung des Sponsors. Nicht machen.

---

## 8. Tagesplan

Heute ist Dienstag, 8. September. Abgabe Mittwoch, 16. September. Ziel: Sonntag, 15. September abends fertig, ein Tag Puffer.

| Tag | Datum | Aufgabe |
|---|---|---|
| **Heute** | Di 8.9. | `forge init`, erstes Commit. **Blatt-Kompatibilität JS ↔ Solidity beweisen.** ENSv2-Doku sichten, Sepolia-Faucet |
| 2 | Mi 9.9. | `CitableRegistry.sol` + alle sechs Tests grün. **ENS-Entscheidung A oder B** |
| 3 | Do 10.9. | ENS-Schicht nach Entscheidung. Deploy auf Sepolia per `forge script` |
| 4 | Fr 11.9. | Next.js aufsetzen, wagmi-Verbindung, **Register-Screen** komplett |
| 5–6 | Sa 12.9. / So 13.9. | **Verify-Screen**, Nachbarsegmente, drei Zustände. Author-Screen. Ende Tag 6: durchgehender Klickpfad |
| 7 | Mo 14.9. | Demo-Daten anlegen, IPFS anbinden, README schreiben |
| 8 | Di 15.9. | **Video aufnehmen. Einreichen.** |
| 9 | Mi 16.9. | Puffer. Nur Polish, keine neuen Features |

**Wichtig:** Wenn du dieses Wochenende weg bist, verlierst du die zwei größten Blöcke. Dann fällt der Author-Screen weg und der Subgraph ist gestrichen — sag mir früh Bescheid, dann schneiden wir den Plan neu.

**Commit-Disziplin:** Mindestens ein aussagekräftiger Commit pro Arbeitstag. ETHGlobal kann Einreichungen mit einem einzigen großen Commit disqualifizieren. Nicht am letzten Tag alles auf einmal.

---

## 9. Video, 2 Minuten

Nur erfundene Personen. Keine echten Politiker, keine erfundenen Zitate echter Menschen.

```
[0:00–0:20]  PROBLEM
  Ein Tweet: "Roth hat zugegeben, dass die Zahlen manipuliert wurden."
  Daneben der Originalartikel. Da steht: "Wurden die Zahlen manipuliert?
  Diese Frage stellt sich seit Monaten."
  Sprecher: "Drei Wörter, entgegengesetzte Bedeutung. Heute lässt sich
  das nicht beweisen — ein Link bricht, ein Screenshot ist fälschbar."

[0:20–0:45]  REGISTRIEREN
  Anna fügt ihren Artikel ein. Das Tool zeigt 87 nummerierte Segmente.
  Sie signiert als anna.wochenzeitung.eth. Transaktion, Wurzel on-chain.

[0:45–1:15]  DAS FALSCHE ZITAT
  "hat zugegeben, dass die Zahlen manipuliert wurden" eingeben.
  ❌ Nicht enthalten.
  Dann nur "die Zahlen manipuliert":
  ⚠️ Teiltreffer — kommt in Segment 3 vor, aber nicht als vollständiges
  Segment. Segment 3 im Original wird angezeigt: eine Frage.

[1:15–1:40]  DER POSITIONSBEWEIS
  Segment 3 vollständig eingeben.
  ✅ Position 3 von 87. Daneben Segment 2 und 4 als Kontext.
  Datum, Autor-Name.
  Sprecher: "Nicht nur echt. Sondern an welcher Stelle, und was
  daneben stand."

[1:40–1:55]  IDENTITÄT
  wochenzeitung.eth hat anna.wochenzeitung.eth vergeben und kann es
  entziehen — bereits veröffentlichte Beweise bleiben gültig.

[1:55–2:10]  GRENZEN
  "Wir beweisen wortgenaue Zitate, keine Bedeutung. Übersetzungen und
  Umformulierungen erkennen wir nicht. Und wer nie registriert hat,
  kann nichts beweisen. Das ist ehrlich das, was geht."
```

Der Teiltreffer bei 0:45 ist die stärkste Sekunde im Video. Nicht kürzen.

---

## 10. README-Gerüst

```markdown
# Citable
Verifiable publishing with position proofs.

## The problem
[2 Absätze: Zitat aus dem Zusammenhang, warum Link und Screenshot versagen]

## How it works
[Merkle-Diagramm, Blattformel, Segmentierungsregel wortgleich aus 4.1]

## Why a blockchain
Öffentlich lesbar, ohne Erlaubnis beschreibbar, von niemandem
nachträglich änderbar. Ein Register bei einer Firma hätte genau die
zentrale Instanz, die das Projekt vermeiden soll.

## Contracts (Sepolia)
- CitableRegistry: 0x… — [Etherscan]
- Kernfunktion: verifySegment() — [Zeilennummer verlinken]

## Run it
forge install && forge test
cd web && npm install && npm run dev

## Demo
[Video-Link]

## Bounties
### ENS
[Welche ENSv2-Features, welche Zeilen, warum tragend]
### The Graph
[Subgraph-Manifest, Endpoint]

## Limitations
- Keine Übersetzungen, keine Paraphrasen — Hashes kennen keine Bedeutung
- Nicht registriert ≠ erfunden
- Kaltstart-Problem ungelöst
- Absatzgranularität, nicht Satzgranularität

## Prior art
C2PA / Content Credentials, Soft Binding Resolution, Numbers Protocol,
Chainpoint. Citable unterscheidet sich durch den Positionsbeweis
innerhalb einer Aussage.

## AI usage
Contracts, Frontend und Tests wurden mit Claude Code entwickelt.
Architektur, Design und Verifikation durch den Autor.

## License
MIT
```

Der Abschnitt "Prior art" ist kein Eingeständnis von Schwäche. Er zeigt, dass du das Feld kennst — und nimmt dem Juror die Frage vorweg.

---

## 11. Risiken

| Risiko | Wahrscheinlichkeit | Gegenmaßnahme |
|---|---|---|
| Blatt-Hash JS ≠ Solidity | **hoch** | Heute als Allererstes prüfen, gegen `leafOf` |
| ENSv2 zu sperrig | mittel | Zeitschranke Ende Tag 2, dann Weg B |
| Frontend frisst mehr Zeit als geplant | **hoch** | Author-Screen ist streichbar. Verify ist es nicht |
| IPFS-Pinning zickt | mittel | Volltext notfalls im Repo, CID-Feld leer lassen |
| Wochenende fällt aus | offen | Plan neu schneiden, Subgraph streichen |
| Am Ende keine Zeit fürs Video | mittel | Video an Tag 8 fest eingeplant, nicht als Restposten |

---

## 12. Nächster Befehl

```bash
forge init citable && cd citable
forge install OpenZeppelin/openzeppelin-contracts
git add . && git commit -m "chore: initial foundry setup"
```

Danach, noch heute Abend: das Blatt-Kompatibilitätsskript. Alles andere hängt daran.