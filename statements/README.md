# Registrierte Aussagen

Der Quelltext jeder Aussage, die auf Sepolia registriert ist. Was on-chain steht, ist nur
die Wurzel; der Volltext liegt auf IPFS. Hier liegt er zusätzlich, damit die Wurzel auch
dann reproduzierbar bleibt, wenn kein Gateway die CID mehr ausliefert.

    node script/js/publish.mjs statements/<name>/<datei>.txt --name=<label> [--broadcast]

Die Datei ist die Quelle der Wahrheit für die Wurzel. Ein einziges Zeichen mehr, eine
Leerzeile anders — und es ist eine andere Aussage. Deshalb wird hier nichts nachträglich
korrigiert: eine Korrektur ist eine neue Registrierung.

Was tatsächlich auf der Kette steht, steht in `deployments/statements/`.

## quartalszahlen.txt ist wörtlich der Messkorpus

Die sechs Absätze sind Zeichen für Zeichen dieselben wie in
`script/js/entailment-eval.mjs`. Das ist Absicht: die Zahlen in CONCEPT.md 3 — Schwelle
0,80, kein durchgelassenes Falschzitat, 0,235 Abstand — wurden gegen genau diese Absätze
gemessen. Stünde im Browser ein anderer Text, wären die Zahlen im Video nicht die
gemessenen, sondern geraten.
