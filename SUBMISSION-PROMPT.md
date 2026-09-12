# Prompt — Citable, Video und Einreichung

Geschrieben am 12.09.2026. Gedacht zum Einfügen in eine **frische Session** im Repo
`~/learning/solidity/citable`. Vier Tage bis zur Abgabe.

---

## Auftrag

Zwei Dinge, in dieser Reihenfolge:

1. **Das Video-Skript.** Zwei Minuten, englisch gesprochen, Bild für Bild durchgeplant —
   was zu sehen ist, was gesagt wird, wie lange. Erst besprechen, dann schreiben.
2. **Das Einreichungsformular.** Jeder Textblock ausformuliert, jede Behauptung mit einer
   Codezeile oder einer Transaktion belegt.

Nicht coden, außer es fällt beim Durchgehen ein Fehler auf, der das Video kaputt macht.

---

## Vorher lesen, in dieser Reihenfolge

| Datei | Wofür |
|---|---|
| `CLAUDE.md` | Der Stand. Einstieg pro Session. |
| `WALKTHROUGH.md` | **Die sieben Eingaben, mit denen das Produkt vorgeführt wird.** Das ist das Rückgrat des Videos. |
| `CONCEPT.md` 3 | Die Messwerte für Stufe 3. Jede Zahl im Video muss von dort kommen. |
| `IDEA.md` 7 | Bounty-Zuordnung — **aber die Zahlen gegenprüfen**, siehe unten. |

**`IDEA.md` 8 und 9 sind überholt.** Der Tagesplan kennt den Stand nicht mehr, und das
Video-Skript in Abschnitt 9 stammt aus einer Zeit, in der es Stufe 3 noch nicht gab. Es
sagt dort wörtlich, Übersetzungen und Umformulierungen würden *nicht* erkannt. Das stimmt
heute nicht mehr und ist inzwischen der stärkste Teil des Projekts. Das alte Skript taugt
noch als Beleg dafür, wie das Falschzitat aufgebaut ist — sonst nicht.

---

## Der Stand, in Zahlen

| | |
|---|---|
| `CitableRegistry` | `0xD3B137b6c6f572290Cf91ac312319364822792e7` |
| `ENSv2NameGuard` | `0x67732407626BCb5D5610887EC97782c610F5E8d2` |
| Autor | `0x5b5Bd6a1523612B67C32D4aDC8b52766d0085D19` |
| Namen | `wochenzeitung.eth`, `frederik.eth`, `citable.eth` |
| Netz | Sepolia, beide Contracts auf Etherscan verifiziert |

Drei registrierte Aussagen, alle mit **scharfem** Guard:

| Aussage | Wurzel | Absätze |
|---|---|---|
| `statements/wochenzeitung/anhoerung.txt` | `0xa2ea6730…891ebc4b` | 7 |
| `statements/wochenzeitung/quartalszahlen.txt` | `0x2690f5f5…33b45caf` | 6 |
| `statements/frederik/gettysburg.txt` | `0x78e0a0fd…14c4e972` | 4 |

`quartalszahlen.txt` ist **wortgleich** der Messkorpus aus
`script/js/entailment-eval.mjs`. Stünde dort ein anderer Text, wären die Zahlen im Video
nicht die gemessenen.

**Tests:** `forge test` grün, `npm test` grün, `forge fmt --check`, `forge build` und
`next build` ohne Warnung. `next build` erzeugt nur statische Routen.

---

## Die Seite, wie sie jetzt aufgebaut ist

Die Oberfläche ist **durchgehend englisch**. Deutsch steht nur noch als zitiertes
Quellmaterial im Deckungs-Abschnitt, und jede deutsche Zeile trägt dort eine englische
Glosse.

1. **Hero** — klassisch, kein Scroll-Effekt. Schlagzeile *„Anyone can invent a quotation.
   Now you can prove you didn't."*, zwei Knöpfe, daneben ein echter Registereintrag mit
   Position 4 von 4 und dem Siegel `PROVEN`. Entrance-Animation beim Laden, reines CSS.
2. **The idea** — warum die andere Frage („ist dieses Zitat echt?") unlösbar ist: der
   Nenner fehlt. Citable dreht die Beweislast um.
3. **Two doors** — Auslesen und Hochladen, gleich groß, ein Werkzeug darunter, ein Klick
   tauscht es. `#check` und `#register`. Keine zweite Seite.
4. **How a proof holds** — der Merkle-Baum, von den Blättern aufwärts gezeichnet.
5. **Three answers, and only two of them are facts** — die Kaskade, Stufe 1 bis 3.
6. **The words change. The meaning does not.** — der Deckungs-Abschnitt. Ein registrierter
   Absatz, fünf echte Anfragen, die gemessenen Zahlen. `#coverage`.
7. **The limits are part of the instrument** — unbewegt, ohne Beschönigung.

---

## Was das Video zeigen muss, nach Wucht sortiert

**1 · Die Zahl, die die ganze Entscheidung trägt.** Bei reiner Ähnlichkeitsmessung bekam
das erfundene Geständnis *„Roth hat zugegeben, dass die Zahlen manipuliert wurden"* den
Wert **0,880** — **höher** als die korrekte englische Übersetzung desselben Absatzes mit
**0,877**. Quelle: `CONCEPT.md` 3, gemessen mit `script/js/similarity-probe.mjs`.

Das ist der beste Satz, den das Projekt zu bieten hat: Auf Ähnlichkeit gebaut, hätte die
Prozentzahl die Desinformation bestätigt — und zwar genau im Fall, für den das Projekt
gebaut ist. Deshalb misst Stufe 3 Deckung (NLI) statt Ähnlichkeit. **Diese Sekunde nicht
kürzen.**

**2 · Der eigentliche Anwendungsfall.** Deutscher Absatz, englische Abfrage:

> Revenue rose by four percent last quarter.

Stufe 1 und 2 finden nichts — kein einziges Zeichen stimmt überein. Stufe 3 misst
**0,8253 → 83 %** gegen Absatz 3 von 6. Läuft im Browser.

**3 · Die Falle.** Ein Wort geändert:

> Im vergangenen Quartal stieg der Umsatz um **vierzig** Prozent.

**Gar nicht bewertet.** Die Wertprüfung liest eine 40 in einer Behauptung über einen
Absatz, der *vier* sagt, und lässt das Modell nicht ran. Deterministisch, von Hand
nachprüfbar, und auf den **Wert** normalisiert statt auf die Schreibweise — `four`, `vier`
und `cuatro` werden zu `n:4`. Ohne diese Normalisierung würde die Regel ausgerechnet
Übersetzungen blockieren.

**4 · Der Positionsbeweis.** Absatz *i* von *n*, mit den Nachbarn daneben. Der Index sitzt
*im* Blatt, weil ein sortierter Merkle-Beweis nur Mitgliedschaft zeigt, nicht Position.
Das war der Fehler im ersten Entwurf und ist in `IDEA.md` 0.1 dokumentiert — ehrlich
erzählt ist das ein Pluspunkt, kein Makel.

**5 · Das Teilzitat.** Ein verkürztes Zitat, das stimmt und trotzdem täuscht. Der volle
Absatz steht daneben. Im alten Skript hieß es, das sei die stärkste Sekunde — das stimmt
immer noch, es ist nur nicht mehr die einzige.

**6 · ENS.** Ohne Identitätsschicht ist jede Signatur anonym, und „Schlüssel 0x7f3a… hat
das gesagt" beweist gegenüber einem Leser nichts. Der Name ist keine Zierde, er ist der
Grund, warum der Beweis überzeugt. Der Guard war bei allen drei Registrierungen scharf.

**7 · Die Grenzen.** Ausdrücklich ins Video. Bei Juroren ist das ein Vorteil, kein Risiko.
Spanisch fällt bei Schwelle 0,80 durch (0,562) — ein korrektes Zitat, das das Instrument
ablehnt. Das steht auf der Seite, nicht dahinter.

---

## Nicht verhandelbar

- **Keine erfundenen Zitate echter Menschen.** Der Messkorpus benutzt erfundene Personen
  (Frau Roth, ein namenloser Vorstand). Dabei bleibt es.
- **Jede Zahl im Video steht in `CONCEPT.md` oder `WALKTHROUGH.md`.** Keine gerundete
  Schätzung, keine Zahl aus dem Kopf. Wer eine neue braucht, misst sie.
- **Stufe 3 ist eine Messung, kein Beweis.** Die Prozentzahl bedeutet „kein Falschzitat aus
  dem Testsatz erreichte diesen Wert", nicht „zu X % wahr". Das muss im Video gesagt
  werden, und zwar im selben Atemzug wie die 83 %.
- **Die KI-Nutzung wird im Formular ehrlich angegeben.** Contracts, Frontend und Tests sind
  mit Claude Code entstanden. Bei ETHGlobal ist das erlaubt, eine Falschaussage
  disqualifiziert.
- **Kein World / Selfie Check.** Nachweis mit geringer Sicherheitsstufe, als
  Urheberschaftsnachweis gegen die ausdrückliche Anweisung des Sponsors.

---

## Was Frederik hier einfügt

Der Abschnitt ist absichtlich leer. Frederik fügt das aktuelle Material von ETHGlobal ein,
bevor die Arbeit beginnt:

- Die Preisseite für ETHOnline 2026, wörtlich — **die Beträge und die Aufteilung nicht aus
  `IDEA.md` übernehmen.** Sie waren am 09.09. schon einmal falsch und wurden korrigiert.
- Die Anforderungen an das Einreichungsformular: welche Felder, welche Längen, welche
  Pflichtangaben.
- Die Vorgaben für das Video: Länge, Format, wo es liegen muss.
- Die Regeln zu KI-Nutzung und zu Commit-Historie.

```
[hier einfügen]
```

**Bis das eingefügt ist, wird nichts behauptet, was nur aus `IDEA.md` stammt.**

---

## Offen, und nur von Frederik zu lösen

- **Vercel-Deploy.** `next build` erzeugt nur statische Routen, es ist ein
  Konfigurationsschritt. `NEXT_PUBLIC_IPFS_GATEWAYS` muss im Build gesetzt sein — steht auf
  dem Verify-Screen „this app's own copy", fehlt es.
- **Video aufnehmen.**
- **Einreichungsformular ausfüllen.**
- **Das Logo.** Der Hero trägt ein Platzhalter-Zeichen: Rahmen, Anführungszeichen, blaue
  Positionsmarke. Für einen Screenshot reicht es, schön ist es nicht.
- **Porträts für die Falschzitat-Kacheln**, falls der Problem-Abschnitt noch gebaut wird —
  gemeinfrei bei Einstein, Gandhi, Marie Antoinette, Voltaire; bei Mandela ist fast jedes
  Foto geschützt.

## Zwei Dateien ohne Verwendung

`frontend/src/lib/impact.ts` und `frontend/src/lib/misquotes.ts` werden nirgends mehr
importiert. In `misquotes.ts` stehen fünf recherchierte Falschzitate **mit ausgeschriebenen
Quellen** (Einstein, Gandhi, Mandela, Marie Antoinette, Voltaire) — Material für einen
Problem-Abschnitt, der noch nicht geschrieben ist, oder fürs Video. Entweder benutzen oder
vor der Abgabe löschen; toter Code im Repo ist bei einer Jury ein unnötiger Abzug.

---

## Arbeitsweise

- Deutsch reden, Skript und Formular auf **Englisch** schreiben.
- Erst besprechen, dann schreiben. Nicht mit einem fertigen Skript anfangen.
- Eine Frage auf einmal.
- Conventional Commits, englisch, Imperativ. Mindestens ein aussagekräftiger Commit pro
  Arbeitstag — ETHGlobal kann Einreichungen mit einem einzigen großen Commit
  disqualifizieren.
- Liegt der Stand hinten, wird gestrichen, nicht die Nacht durchgearbeitet.
