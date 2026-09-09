# Citable — Konzept

**Ein Herkunftsregister für Sprache.** Nicht "stand dieser Buchstabensalat im Text?",
sondern: **"Wurde diese Aussage gemacht?"** — auch dann, wenn sie in einer anderen Sprache
oder anderen Worten zitiert wird.

Dieses Dokument ist die Arbeitsbasis. `IDEA.md` beschreibt nur die erste Schicht und ist
damit unvollständig.

---

## 1. Das Ziel

Zu einer Person und einem Zeitpunkt liegt ein Text vor. Jemand behauptet später, diese
Person habe *X* gesagt. Citable beantwortet:

| Frage | Antwort |
|---|---|
| Stand *X* wortgleich im Text? | **Beweis** — ja/nein, mathematisch |
| An welcher Stelle, und was stand daneben? | **Beweis** — Position *i* von *n* + Nachbarn |
| Wurde *X* sinngemäß gesagt, in anderen Worten oder einer anderen Sprache? | **Messung** — Prozentwert |

Die ersten beiden Zeilen sind Kryptografie. Die dritte ist es nicht — und darf nie so
aussehen, als wäre sie es.

---

## 2. Schicht 1 — Der Wortbeweis

Deterministisch, binär, ohne Modell und ohne Vertrauensinstanz.

### Registrieren

```
Text
 │  Segmentierung: split "\n\n" · trim · leere verwerfen
 ▼
[0] Absatz A   [1] Absatz B   [2] Absatz C   [3] Absatz D
 │              │              │              │
 │  leaf = keccak256(keccak256(abi.encode(index, absatz)))
 ▼              ▼              ▼              ▼
L0             L1             L2             L3
 └──────┬───────┘              └──────┬───────┘
    H(L0,L1)                      H(L2,L3)
        └───────────────┬───────────────┘
                     WURZEL              ← 32 Bytes, on-chain
```

Der Index sitzt **im Blatt**, weil sortierte Geschwisterpaare (`merkletreejs`,
`sortPairs: true`) die Reihenfolge sonst verlieren. Ohne ihn wäre nur Mitgliedschaft
beweisbar, nicht Position.

On-chain liegen 32 Bytes — egal ob die Rede drei oder dreitausend Absätze hat. Volltext,
Segmentliste und Vektoren (siehe Schicht 2) liegen als Bündel auf IPFS, adressiert über
seinen eigenen Hash.

### Fragen

Der Prüfer holt das Bündel, baut den Baum lokal neu und erzeugt den Beweis selbst. Es gibt
keinen Dienst, dem man vertrauen muss. Der Contract rechnet nur nach:

```
verifySegment(wurzel, index, absatz, beweis) → true / false
```

Bei *n* Absätzen besteht der Beweis aus log₂(*n*) Hashes — bei 87 Absätzen sind es sieben.

**Was Schicht 1 nicht kann:** ein einziges geändertes Zeichen, und der Hash ist ein
anderer. Übersetzungen, Umformulierungen, korrigierte Tippfehler — alles unsichtbar.
Genau dafür gibt es Schicht 2.

---

## 3. Schicht 2 — Der Bedeutungsvergleich

### Die Idee

Zwei Absätze mit derselben Aussage sollten dieselbe Kennung bekommen — unabhängig von
Sprache und Formulierung:

> "Wurden die Zahlen manipuliert?"
> "Were the figures manipulated?"
> "Die Frage, ob man die Zahlen frisiert hat, steht im Raum."

Im Idealfall gilt `kennung(A) == kennung(B)`, und der Merkle-Beweis funktioniert genauso
wie bei Schicht 1.

### Warum das mit einem Hash nicht geht

Ein Hash ist absichtlich sprunghaft: ein Bit anders, ein völlig anderer Wert. Genau diese
Eigenschaft macht ihn als Beweis brauchbar — und als Bedeutungsträger unbrauchbar.

Dahinter steckt ein grundsätzliches Problem: Ein Hash braucht eine **scharfe
Äquivalenzrelation** — zwei Dinge sind gleich oder nicht. Bedeutungsnähe ist aber ein
**Kontinuum**. Wo genau hört "dieselbe Aussage" auf? Zwischen "die Zahlen wurden
manipuliert" und "die Zahlen wurden korrigiert" liegt kein Bit, sondern ein Verdacht.

Die Idee ist nicht naiv — sie hat einen Namen: **Locality-Sensitive Hashing**. Dabei
werden ähnliche Eingaben absichtlich auf gleiche oder benachbarte Werte abgebildet. Das
funktioniert, verlangt aber, dass man die Schwelle vorher festlegt und dann *versteckt*:
Bei 0.79 sagt das System "nein", bei 0.81 "ja", und der Leser sieht den Unterschied nicht.

**Deshalb der Prozentwert.** Er zeigt die Schwelle, statt sie zu verbergen, und lässt die
Entscheidung beim Menschen.

### Wie es stattdessen funktioniert

Statt eines Hashs bekommt jeder Absatz einen **Bedeutungsvektor** — eine Liste von Zahlen,
in der Nähe tatsächlich Nähe bedeutet.

```
"Wurden die Zahlen manipuliert?"    → [0.21, -0.08, 0.44, …]  ┐
"Were the figures manipulated?"     → [0.19, -0.11, 0.41, …]  ├ nah beieinander
"Die Zahlen frisiert?"              → [0.23, -0.06, 0.47, …]  ┘

"Das Wetter war gut."               → [-0.55, 0.31, -0.12, …]   weit weg
```

Ein **multilinguales** Modell bildet Deutsch, Englisch und weitere Sprachen in denselben
Raum ab — dieselbe Aussage landet an derselben Stelle, egal in welcher Sprache. Der
Abstand wird als Kosinus-Ähnlichkeit gemessen und als Prozentwert ausgegeben.

### Die Vektoren sind selbst beweisbar

Die Vektoren liegen im IPFS-Bündel, dessen CID im Contract steht. Da eine CID der Hash
ihres Inhalts ist, gilt: **Wer das Bündel verändert, ändert die CID** — und die passt dann
nicht mehr zu der on-chain hinterlegten.

Damit ist nachträgliche Manipulation ausgeschlossen: Niemand kann Vektoren so
zurechtbiegen, dass ein Zitat besser passt. Die Vektoren werden einmal beim Registrieren
berechnet und stehen fest.

Zusätzlich wird die **Modellkennung** mitgespeichert. Ohne sie ist ein Prozentwert nicht
reproduzierbar — ein anderes Modell liefert eine andere Zahl. Die Kennung steht deshalb
immer neben dem Wert.

### Ähnlichkeit allein reicht nicht — gemessen, nicht vermutet

`script/js/similarity-probe.mjs` prüft, ob Bedeutungsnähe ein verzerrtes Zitat von einer
korrekten Übersetzung trennen kann. **Sie kann es nicht:**

| Eingabe gegen "Wurden die Zahlen manipuliert? Diese Frage stellt sich seit Monaten." | Ähnlichkeit |
|---|---|
| Übersetzung: "Were the figures manipulated? …" | 0,877 |
| Umformulierung | 0,888 |
| **Falschzitat: "Roth hat zugegeben, dass die Zahlen manipuliert wurden."** | **0,880** |
| unverwandter Satz | 0,810 |

Das Falschzitat liegt **über** der korrekten Übersetzung. Der Grund: Ähnlichkeitsmodelle
messen, *worüber* geredet wird, nicht *was behauptet* wird. Frage und Behauptung sehen für
sie gleich aus. Eine Prozentzahl auf dieser Grundlage würde in genau dem Fall, für den das
Projekt gebaut ist, die Desinformation bestätigen.

### Die Lösung: erst suchen, dann prüfen

`script/js/nli-probe.mjs` misst dieselben Fälle mit einem NLI-Modell — einem Modell, das
nicht nach Themennähe fragt, sondern: **"Ist diese Behauptung durch den Text gedeckt?"**

| Eingabe | entailment |
|---|---|
| identisch | 0,9595 |
| Übersetzung | **0,9825** |
| Umformulierung | 0,9310 |
| **Falschzitat** | **0,5982** |
| unverwandt | 0,3509 |

Zwischen dem schwächsten gedeckten Fall und dem Falschzitat liegen 33 Punkte. Die
Trennung ist eindeutig, und die Übersetzung bekommt den höchsten Wert von allen.

Daraus folgt der zweistufige Aufbau — jeder Teil macht das, was er nachweislich kann:

```
87 Absätze
    │  Embeddings (multilingual-e5-small) — schnell, wählt die 3 besten Kandidaten
    ▼
3 Kandidaten
    │  NLI (mDeBERTa-v3-base-xnli) — langsamer, aber nur noch 3 Vergleiche
    ▼
"Absatz 3 — zu 91 % durch den Text gedeckt"
```

Die angezeigte Prozentzahl ist damit der entailment-Wert und misst das Richtige: nicht
"gleiches Thema", sondern "vom Text gedeckt".

---

## 4. Der vollständige Ablauf

### Registrieren

1. Autor fügt den Text ein
2. Segmentierung an Leerzeilen
3. Pro Absatz: Blatt-Hash **und** Bedeutungsvektor
4. Merkle-Baum über die Blätter → Wurzel
5. Bündel `{ volltext, segmente, vektoren, modell }` → IPFS → CID
6. `registerRoot(wurzel, ensNode, cid, absatzZahl)` auf Sepolia

### Fragen — eine Kaskade in drei Stufen

```
Fragment eingeben
        │
        ▼
┌─ Stufe 1: Wortbeweis ───────────────────────────────────────┐
│  Blatt bilden, Merkle-Beweis prüfen                         │
│  Treffer → ✅ BEWIESEN                                       │
│     "Absatz 3 von 87, veröffentlicht am 03.09.2026          │
│      von anna.wochenzeitung.eth"  + Absatz 2 und 4          │
└──────────────────────────┬───────────────────────────────────┘
                           │ kein Treffer
                           ▼
┌─ Stufe 2: Teilstring ────────────────────────────────────────┐
│  Steckt das Fragment wörtlich in einem Absatz?               │
│  Treffer → ⚠️ TEILZITAT                                       │
│     "Kommt in Absatz 3 vor, aber nicht als ganzer Absatz."   │
│      Absatz 3 vollständig daneben — der Kontext, der fehlt.  │
└──────────────────────────┬───────────────────────────────────┘
                           │ kein Treffer
                           ▼
┌─ Stufe 3: Deckung ───────────────────────────────────────────┐
│  a) Embeddings → die 3 thematisch nächsten Absätze           │
│  b) NLI auf diese 3 → ist die Behauptung gedeckt?            │
│  Bester Wert → 📊 KEIN BEWEIS, MESSUNG                       │
│     gedeckt:      "Absatz 3 — zu 93 % durch den Text         │
│                    gedeckt (mDeBERTa-xnli)."                 │
│     nicht gedeckt: "Absatz 3 behandelt dasselbe Thema,       │
│                    deckt die Behauptung aber nicht (60 %)."  │
│      + Absatz 3 immer im Volltext daneben                    │
└──────────────────────────────────────────────────────────────┘
```

Stufe 1 und 2 sind Tatsachen. **Stufe 3 ist eine Messung und muss im Interface klar
anders aussehen** — andere Farbe, andere Form, ausgeschriebener Hinweis. Ein Prozentwert,
der wie ein Beweis aussieht, richtet mehr Schaden an als gar keine Antwort.

### Der eigentliche Anwendungsfall

Ein deutscher Artikel wird in einer englischen Zeitung zitiert. Schicht 1 findet nichts —
kein einziges Zeichen stimmt überein. Schicht 2 sagt: 91 % Nähe zu Absatz 12.

Das ist der Fall, für den es bisher nichts gibt. Und es ist der Fall, der im Video gezeigt
gehört.

---

## 5. Was wo liegt

| Ort | Inhalt | Warum dort |
|---|---|---|
| **Sepolia** | Wurzel, Autor, ENS-Node, Zeitstempel, Absatzzahl, CID | 32 Bytes, unveränderlich, öffentlich prüfbar |
| **IPFS** | Volltext, Segmente, Vektoren, Modellkennung | zu groß für die Kette, über CID manipulationssicher |
| **Client** | Baumbau, Beweis, Vektorvergleich | kein Dienst, dem man vertrauen muss |

Keine Datenbank. Kein Server. Kein Indexer.

---

## 6. Was das kann und was nicht

**Kann:**
- Wortgenaue Zugehörigkeit beweisen — mathematisch, ohne Vertrauensinstanz
- Die Position beweisen: Absatz *i* von *n*, mit Nachbarn als Kontext
- Teilzitate erkennen und den fehlenden Kontext daneben zeigen
- Sinngemäße Nähe über Sprachgrenzen hinweg **messen** und beziffern
- Urheberschaft an einen Namen binden statt an eine Adresse
- Überleben, wenn das Original gelöscht wird

**Kann nicht:**
- Bedeutung *beweisen*. Stufe 3 ist eine Modellaussage, kein Beweis, und kann falsch liegen
- Etwas über nicht registrierte Texte sagen. Nicht registriert heißt nur: nicht registriert
- Ironie und Zitat-im-Zitat verstehen. Der Frage-gegen-Behauptung-Fall ist durch die
  NLI-Stufe abgedeckt (0,60 gegen 0,93), Ironie bleibt offen
- Beweisen, dass jemand etwas **nie** gesagt hat
- Das Kaltstart-Problem lösen

---

## 7. Offene Entscheidungen

1. ~~Modell~~ — entschieden: `multilingual-e5-small` zum Suchen,
   `mDeBERTa-v3-base-xnli-multilingual-nli-2mil7` zum Prüfen. Beide gemessen.
2. **Wo läuft es** — im Browser (Transformers.js, kein Server, aber beim ersten Besuch
   lädt vor allem das NLI-Modell spürbar) oder serverseitig?
3. **Schwelle** — ab welchem entailment-Wert gilt eine Behauptung als gedeckt? Die
   Messung legt eine Grenze um 0,85 nahe, das braucht mehr als fünf Testfälle
4. **Reichweite der Frage** — nur gegen eine Aussage prüfen, oder gegen alle Aussagen eines
   Autors? Letzteres beantwortet "Hat Person X das gesagt?" mit sichtbarem Nenner:
   *"In keiner der 47 registrierten Aussagen gedeckt. Höchster Wert: 62 %."*
5. **Geschwindigkeit** — wie viele Kandidaten gehen ins NLI? Drei ist geraten, nicht
   gemessen
6. **Hackathon-Umfang** — Abgabe ist in sieben Tagen. Beide Modelle im Browser plus
   Register- und Verify-Screen ist eng; ENS wird dadurch wahrscheinlich Weg B

---

## 8. Stand

Schicht 1 ist zur Hälfte gebaut: Blattformel steht in `src/Leaf.sol` und
`script/js/leaf.mjs`, die Übereinstimmung beider Seiten ist durch sechs Tests bewiesen.
Registry-Contract, Schicht 2 und Frontend fehlen.

Der bestehende Code bleibt gültig — Schicht 2 ersetzt ihn nicht, sie kommt darüber.
