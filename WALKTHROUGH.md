# Der Durchlauf — sehen, dass es stimmt

Laufendes Kapitel ab Fr 11.09. Abgabe **Mi 16.09.**

Der Zweck dieses Kapitels ist nicht Bauen. Es ist **Nachprüfen**: Frederik soll jede
Behauptung des Produkts einmal selbst gegen eine Quelle halten, die nicht von uns kommt.
Was hier nicht standhält, wird im Video auch nicht standhalten.

---

## Was behauptet wird, und woran man es prüft

Jede Zeile hier ist eine Behauptung, die Citable aufstellt, und daneben die Stelle, an der
sie sich unabhängig widerlegen ließe. Wenn eine nicht hält, ist das der wichtigste Fund
der Woche.

| Behauptung | Unabhängig prüfbar an |
|---|---|
| Es gibt eine Registry auf Sepolia | Etherscan, verifizierter Quelltext |
| Zwei Aussagen stehen wirklich drin | `statementCount()` auf Etherscan |
| Der Name gehört uns wirklich | ENSv2-Registry, `getOwner` |
| Der Volltext liegt auf IPFS | fremdes Gateway, nicht unsere Seite |
| Die CID beschreibt genau diese Bytes | Datei herunterladen, Hash selbst rechnen |
| Der Beweis hängt an der Kette, nicht an uns | ein Zeichen ändern → Beweis fällt |
| Stufe 3 ist eine Messung, kein Beweis | Falschzitat eingeben → niedriger Wert |

---

## Die Adressen

| | |
|---|---|
| `CitableRegistry` | `0xD3B137b6c6f572290Cf91ac312319364822792e7` |
| `ENSv2NameGuard` | `0x67732407626BCb5D5610887EC97782c610F5E8d2` |
| Besitzer / Autor | `0x5b5Bd6a1523612B67C32D4aDC8b52766d0085D19` |
| ENS-Name | `wochenzeitung.eth`, `ensNode` `0xbbf0e552…1e31264f` |
| Gateway | `https://indigo-broad-pig-566.mypinata.cloud/ipfs/` |

### Aussage 1 — `statements/wochenzeitung/anhoerung.txt`

```
root   0xa2ea6730bdfce31305c0b43b999aa2a430cacf97324b3329bd4e56c1891ebc4b
cid    bafkreifvnoguinbhn5qoqsn3mx7rljasw4rmsssjkn3pbjli4ghysboc2y
tx     0xb845949f606dc4cf36a0a0eddecc974569d4704ff21106a20562cbeaf875b324
block  11676951 · 7 Absätze
```

### Aussage 2 — `statements/wochenzeitung/quartalszahlen.txt`

Wörtlich der Messkorpus aus `script/js/entailment-eval.mjs`. Die Zahlen in CONCEPT.md 3
wurden gegen genau diese sechs Absätze gemessen.

```
root   0x2690f5f5a083942a3a35c2ecc0c23434b4bf6615166fab6dda45b54933b45caf
cid    bafkreigvmtrim5iff7myblynsoedmlrh3sw4jat3hh4xeqz74zbe7macw4
tx     0xa7f30d5580e9159d0d2deb8c7adb561c3d5af2c043428a0234e0bd436bd8e96d
block  11676953 · 6 Absätze
```

---

## Die sieben Eingaben

Alle auf der deployten Seite, in dieser Reihenfolge. Name ist immer `wochenzeitung.eth`.

**1 · Stufe 1, Beweis**

> Von den siebzehn Sachverständigen haben elf schriftlich Stellung genommen. Zwei dieser Stellungnahmen sind in den Ausschussbericht eingeflossen, die übrigen nicht.

Erwartet: **PROVEN**, Absatz 5 von 7, Nachbarabsätze daneben, Merkle-Beweis mit 3 Knoten.

**2 · Derselbe Satz mit einem geänderten Zeichen**

Ein Wort tauschen, etwa `elf` → `zwölf`. Erwartet: **kein** Beweis mehr. Das ist der
wichtigste Moment des ganzen Durchlaufs — er zeigt, dass der Beweis an der Kette hängt
und nicht an gutem Willen.

**3 · Stufe 2, Teilzitat**

> Vier Werktage sind wenig für eine Vorlage dieses Umfangs

Erwartet: **PART OF A PARAGRAPH**, Absatz 4 von 7, der volle Absatz daneben.

**4 · Abwesenheit mit Nenner**

> Wir haben das Gesetz im Alleingang durchgewunken.

Erwartet: **NOT FOUND**, „in none of the 2 statements", 13 Absätze verglichen. Kein
blankes Nein.

**5 · Ein Name ohne Aussagen**

`tagesschau.eth` — erwartet: **NOTHING REGISTERED**, ausdrücklich nicht „erfunden".

**6 · Stufe 3, die Übersetzung** — der eigentliche Anwendungsfall

> Revenue rose by four percent last quarter.

Auf *Measure coverage* klicken. Erster Lauf lädt ~400 MB. Erwartet: **gedeckt, ~83 %**,
Absatz 3 von 6. CONCEPT.md maß 0,821 in Node — der Browser liefert 0,8253.

**7 · Stufe 3, die Falle**

> Im vergangenen Quartal stieg der Umsatz um vierzig Prozent.

Erwartet: **gar nicht gemessen.** Die Wertprüfung sieht die 40 in einem Absatz, der vier
sagt, und lässt das Modell nicht ran. Und zum Vergleich:

> Roth hat zugegeben, dass die Zahlen manipuliert wurden.

Erwartet: **9 %**. Dieses Falschzitat lag bei reiner Ähnlichkeitsmessung bei 0,880 und
damit *über* der korrekten Übersetzung (0,877) — nachzulesen in CONCEPT.md 3. Genau
deshalb misst Stufe 3 Deckung statt Ähnlichkeit.

---

## Was daneben offen sein soll

Zum Gegenprüfen, während die Seite läuft:

- `https://sepolia.etherscan.io/address/0xD3B137b6c6f572290Cf91ac312319364822792e7#readContract` — `statementCount` lesen
- `https://indigo-broad-pig-566.mypinata.cloud/ipfs/bafkreifvnoguinbhn5qoqsn3mx7rljasw4rmsssjkn3pbjli4ghysboc2y` — der Volltext, von fremder Infrastruktur
- Im Apparat unter dem Beweis steht, **welche Quelle** geantwortet hat. Steht dort
  „this app's own copy", hat das Gateway nicht geliefert und `NEXT_PUBLIC_IPFS_GATEWAYS`
  fehlt im Vercel-Build.

Die CID selbst nachrechnen:

```bash
curl -s https://indigo-broad-pig-566.mypinata.cloud/ipfs/bafkreifvnoguinbhn5qoqsn3mx7rljasw4rmsssjkn3pbjli4ghysboc2y > /tmp/b.json
ipfs add -Q --cid-version 1 /tmp/b.json     # muss dieselbe CID ergeben
```

---

## Was noch offen ist

| | |
|---|---|
| Hero-Variante | A oder D, `design/hero/README.md`. Gebaut ist D. |
| Video | Frederiks |
| Einreichungsformular | Frederiks, inklusive ehrlicher Angabe zur KI-Nutzung |
| Author-Screen | gestrichen, bleibt gestrichen |
| Frontend-Tests | es gibt keine automatisierten. Bewusst vertagt. |

## Grenzen, die im Video vorkommen müssen

Stehen vollständig in `README.md` und `CLAUDE.md`. Die drei, die am ehesten vergessen
werden:

- Stufe 3 zieht Code von jsDelivr und Gewichte von huggingface.co. Stufe 1 und 2 nicht —
  die brauchen nur die Kette und die Bytes.
- Die Erreichbarkeit der Bündel hängt an **einem** Pinata-Konto — auch für alles, was
  Fremde über den Registrieren-Screen eintragen. Der pinnt inzwischen selbst
  (`api/pin.mjs`), und genau das ist der zweite zentrale Punkt neben dem Registry-Owner.
- 16 Testfälle sind ein Signal, keine Validierung. Spanisch fällt bei Schwelle 0,80 durch.
