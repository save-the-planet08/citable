# Prompt — Citable, die Seite neu

Geschrieben am 11.09.2026. Gedacht zum Einfügen in eine frische Session im Repo
`~/learning/solidity/citable`. Lies vorher `CLAUDE.md` und `CONCEPT.md`.

---

## Auftrag

Bau die Citable-Website neu. Nicht abhübschen — neu denken. Die bisherigen fünf
Abschnitte sind nicht heilig, die Komponenten in `frontend/src/components/` sind
Rohmaterial, kein Bestand.

Arbeite **Stück für Stück**. Ein Teil wird fertig, wird angesehen, wird abgenommen,
dann der nächste. Nicht alles gleichzeitig anfassen.

Die Oberfläche ist durchgehend **englisch**. Deutsch ist nur das zitierte Material.

---

## Die Haltung

Die Seite spricht **gegen den Social-Media-Wahn**. Sie ist kein neutrales Werkzeug mit
Feature-Liste, sie hat eine Position: Behauptungen fliegen ungeprüft durch die Welt,
Zitate werden verschoben, verkürzt, erfunden — und fast niemand kann nachsehen.

Der Ton ist **New York Times**, nicht Start-up. Redaktionell, seriös, gesetzt. Serifen
für Schlagzeilen und Zitate, Linien statt Karten, Spalten statt Kacheln, viel Weißraum,
eine einzige Akzentfarbe. Die Wucht kommt aus Typografie und Bewegung, nicht aus
Farbverläufen.

---

## Hero — die SVG-Animation

Das Herzstück. Alles gerechnet, kein Bild-Asset, SVG.

**Der Ablauf:**

1. Ein echter Satz steht groß da, gesetzt wie eine Schlagzeile.
2. Er **vervielfältigt sich** in vier oder fünf Kopien über den Schirm. Jede Kopie ist
   leicht verfälscht — ein Wort getauscht, eine Zahl verändert, eine Verneinung
   eingefügt. Die Abweichung ist sichtbar, aber nicht plakativ markiert.
3. Ein **Geschoss** schlägt ein.
4. **Einschlag:** Sprünge laufen durch die Glyphen, rote Korrekturtinte spritzt, die
   verfälschten Kopien **zerspringen in Scherben und fallen aus dem Bild.**
5. Eine Kopie bleibt **unbeschädigt** stehen. Daneben klatscht der Stempel:
   `PROVEN · paragraph 5 of 7`.

**Beim Scrollen wird hineingezoomt** — in die Einschlagstelle, in das getroffene
Zitat. Der Hero geht nicht weg, er wird zur nächsten Sektion. Scroll-getrieben,
interaktiv, nicht nur eine Animation, die einmal abläuft.

**Offene Entscheidung — was ist das Geschoss?** Frederik entscheidet:

- die Merkle-Wurzel als Hex-Kette, die als Projektil einschlägt
- ein Anführungszeichen als Projektil — „das Zitat schlägt zurück"
- der Stempel `PROVEN` selbst

**Oben im Hero sitzt ein Logo.** Gibt es noch nicht, muss entworfen werden. Es muss
auf einem Screenshot wiedererkennbar sein.

---

## Was die Seite zeigen muss, in dieser Reihenfolge

**1 · Das Problem, ganz oben.** Echte, **belegbare** Falschzitat-Fälle mit Quelle —
Fälle, in denen nachweislich etwas anders gesagt oder gar nicht gesagt wurde. Die
Schlagzeilen werden **recherchiert**, nicht erfunden (siehe Nicht verhandelbar).

**2 · Die zwei Türen, gleichwertig.** Auslesen (`/`) und Hochladen (`/register`). Beide
sichtbar, keine versteckt. Heute ist Hochladen begraben.

**3 · Wie der Beweis hält.** Der Merkle-Baum, von den Blättern aufwärts gezeichnet — die
Reihenfolge, in der er gerechnet wird.

**4 · Die drei Stufen.** Wörtlich, Teilzitat, Deckungsmessung.

**5 · Die Grenzen.** Unbewegt, ohne Beschönigung. Stehen vollständig in `README.md`.

---

## Funktionales, das mitgebaut wird

**Wallet verbinden, sichtbar.** `src/lib/wallet.ts` existiert, hängt aber nur an
`/register`. Gehört nach oben, global.

**Das KI-Modell lädt im Hintergrund, mit Skala.** Heute startet der Download erst beim
Klick auf `Measure coverage`. Neu:

- **Start bei Absicht**, nicht beim Seitenaufruf: sobald der Cursor ins Suchfeld geht
  oder das erste Zeichen fällt. Wer nur scrollt, lädt nichts.
- **Gestaffelt:** `multilingual-e5-small` (~45 MB) zuerst, reicht für die Vorauswahl.
  `mDeBERTa-v3-base-xnli` (der Brocken) parallel, wird erst für die Zahl gebraucht.
- **Sichtbare Fortschrittsanzeige**, und sie wird als Argument beschriftet, nicht als
  Entschuldigung: *„The model downloads to your machine. Your query never leaves it."*
- Kleiner geht nicht: Der Brocken ist der mehrsprachige Teil — deutscher Absatz gegen
  englische Abfrage. Genau der Vorführfall. Ein englisches Kleinmodell kann das nicht.

**Stufe 3 startet automatisch**, sobald Stufe 1 und 2 nichts finden. Kein zweiter Klick.
Die Beschriftung bleibt trotzdem eindeutig: Messung, kein Beweis.

---

## Nicht verhandelbar

- **Keine erfundenen Schlagzeilen.** Jede Headline auf der Seite braucht eine belegbare
  Quelle. Eine Seite über korrektes Zitieren, die Zitate erfindet, erledigt sich selbst.
- **Keine Gewalt gegen die Presse im Bild.** Kugel und Blut auf einer Zeitung lesen sich
  als „Journalist erschossen" — das passiert real, für genau diese Arbeit. Das Geschoss
  trifft die **gefälschte Kopie**, nicht das Blatt. Das Rot ist **Korrekturtinte**, nicht
  Blut.
- **Die Blattformel und die Segmentierung ändern sich nicht.** Siehe `CLAUDE.md`, zwei
  Invarianten. Wer sie anfasst, macht alle registrierten Aussagen unprüfbar.
- **Kein Server, kein Indexer, keine Datenbank.** Der Baum wird im Client gebaut. Es
  soll keinen Dienst geben, dem man vertrauen muss.
- **Stufe 3 ist eine Messung, kein Beweis.** Die Prozentzahl bedeutet „kein Falschzitat
  aus dem Testsatz erreichte diesen Wert", nicht „zu X % wahr".
- **`prefers-reduced-motion` wird respektiert.** Geprüft auf 1440 und 390.

---

## Was schon steht und weiterlebt

| | |
|---|---|
| `CitableRegistry` | `0xD3B137b6c6f572290Cf91ac312319364822792e7` |
| `ENSv2NameGuard` | `0x67732407626BCb5D5610887EC97782c610F5E8d2` |
| Autor | `0x5b5Bd6a1523612B67C32D4aDC8b52766d0085D19` |
| Namen | `wochenzeitung.eth`, `frederik.eth`, `citable.eth` |

Drei registrierte Aussagen, alle mit scharfem Guard:

| Aussage | Wurzel | Absätze |
|---|---|---|
| `anhoerung.txt` | `0xa2ea6730…891ebc4b` | 7 |
| `quartalszahlen.txt` | `0x2690f5f5…33b45caf` | 6 |
| `gettysburg.txt` | `0x78e0a0fd…14c4e972` | 4 |

Stack: Next.js als statischer Export, Tailwind, acht Komponenten in
`frontend/src/components/`, 1154 Zeilen. Zwei Routen: `/` und `/register`.

---

## Werkzeug

Nutze die vorhandenen Skills in dieser Reihenfolge: `hero-archetypes` für den Hero
(isoliert bauen, selbst ansehen), `motion-choice` für jede Scroll-Bewegung,
`frontend-design` für Typografie und Farbe. `ambient-field` nur, wenn es sich aufdrängt —
„nein" ist dort die häufige Antwort.

Conventional Commits, Englisch, Imperativ. Ein Commit pro fertigem Teil.

---

## Noch offen, wenn diese Session beginnt

- Das Geschoss (siehe Hero)
- Das Logo
- Die recherchierten Falschzitat-Fälle mit Quellen
- Welche Quelle auf dem Verify-Screen antwortet — steht dort „this app's own copy",
  fehlt `NEXT_PUBLIC_IPFS_GATEWAYS` im Vercel-Build
