---
title: Messen und Notizen
summary: Maßband, Lineal und Winkellineal, Abstände zum Nullpunkt – und Notizen, die an einem Teil hängen.
---

Wer ein Teil genau bauen will, muss messen können. layerling hat dafür mehrere Werkzeuge. Keines davon landet in einem Export. Wandstärken und Spalte im Inneren misst du am besten in der [Schnittansicht](chapter:ansicht-und-arbeitsebene) mit {{ui:camera.sectionMeasure}}.

## Das Maßband

Das Maßband liegt am unteren Ende der Kameraleiste am linken Rand ({{ui:camera.tapeTools}}). Es misst Abstände zwischen Ecken, Kanten und Flächen. Ein Klick darauf öffnet fünf Schaltflächen. Verdecken sie, was du messen willst, ziehst du sie am Griff links frei über die Arbeitsfläche; ein Doppelklick auf den Griff bringt sie zurück:

![Das Maßband mit seinen Schaltflächen: Maß hinzufügen, Messpunkte verschieben, Maß entfernen, ganze Kanten messen, alle Maße entfernen.](shot:tape-menu)

1. **{{ui:camera.addMeasurement}}:** Klicke einen Punkt an, ziehe zum nächsten und klicke ihn an. Die Strecke wird beschriftet.
2. **{{ui:camera.moveMeasurement}}:** Fasse die Punkte an und schiebe sie, die Zahl folgt.
3. **{{ui:camera.deleteMeasurement}}:** Danach klickst du ein Maß an, um es zu entfernen.
4. **{{ui:camera.tapeWholeEdges}}:** Ein Klick auf eine Kante misst sie ganz, bei einem Kreis zum Beispiel den Umfang. Ist das ausgeschaltet, setzt der Klick stattdessen einen Punkt auf die Kante, und der zweite Punkt kann überall liegen, so dass du den Durchmesser oder jede andere Strecke messen kannst. Mit [[Alt]] gilt der Schalter für einen Klick umgekehrt. Auf einem Kreis rastet der Punkt gegenüber vom ersten ein, wenn der Zeiger in die Nähe kommt, und die Punkte liegen auf dem wirklichen Kreis, so dass der Durchmesser genau herauskommt.
5. **{{ui:camera.deleteAllMeasurements}}:** Entfernt alle Maße auf einmal. Weil sich das nicht rückgängig machen lässt, fragt layerling vorher nach; gibt es keine Maße, passiert nichts.
6. **{{ui:camera.tapeMarkMiddle}}:** Unter der Zahl jeder Messung sitzt ein kleiner Fadenkreuz-Knopf. Er setzt einen [Bezugspunkt](#bezugspunkte) in die Mitte der Messung: nach einem Klick auf eine runde Kante, etwa den Rand einer Bohrung, in den Mittelpunkt dieses Kreises - auch bei einem importierten Netz, wo sonst nichts die Mitte einer Bohrung markiert -, bei einem Durchmesser oder jeder geraden Messung auf halber Strecke. Eine Form, die du ziehst, rastet dann mit ihrer Mitte an dem Punkt ein. Einen Punkt, der schon da ist, legt layerling nicht doppelt an. Das Maßband rastet an einem Bezugspunkt ein wie an einer Ecke: So misst du vom Mittelpunkt eines Kreises oder von der Mitte einer Linie aus - Punkt setzen, dann anklicken.

Mit [[Esc]] verlässt du den Messmodus.

## Das Lineal

Aus der Formenbibliothek holst du das {{ui:shape.ruler}}. Es ist ein reines Messwerkzeug: Es erscheint in keinem Export und lässt sich weder gruppieren noch verschneiden. Für jeden Körper, der das Lineal berührt oder überlappt, zeigt es die Ausdehnung als schwebende Zahl direkt in der Ansicht. Diese Zahl kannst du direkt dort ändern, und der Körper passt sich an. Über das schwebende Plus-Symbol legst du eine Kopie der gemessenen Form an.

## Das Winkellineal

Manchmal misst du besser an einem rechten Winkel. Klicke in der Kameraleiste auf {{ui:camera.cornerRulerTool}} und dann auf die Arbeitsfläche. Dort legt sich ein Winkellineal mit zwei Armen im rechten Winkel ab, mit Teilstrichen, wie ein Anschlagwinkel. Auch das hat keinen eigenen Körper. Klickst du nahe an die Ecke eines Körpers, rastet seine Ecke genau dort ein.

Das Winkellineal legt sich auf die Arbeitsebene. Liegt sie auf der Seite eines Körpers, liegt es also auch auf dieser Seite, siehe [Ansicht und Arbeitsebene](chapter:ansicht-und-arbeitsebene). So bemaßt du auf einer senkrechten Wand: Arbeitsebene auf die Wand legen, Winkellineal an ihre obere linke Ecke setzen und so oft auf den Griff klicken, bis die Arme nach rechts und nach unten zeigen.

- **Am Griff ziehen** verschiebt es.
- **Ein kurzer Klick auf den Griff** dreht es um 90°.
- **Das ×** daneben entfernt es.
- **Der kleine Knopf links am Griff** schaltet um, wovon aus gemessen wird: von der Außenkante eines Körpers (Eckpunkt, Symbol mit Linien) oder von seiner Mitte (Mittelpunkt, Fadenkreuz). Neben jeder grünen Zahl sitzt ein ebensolcher kleiner Schalter, der nur diese Zahl umstellt: bei einem stehenden Zylinder die Mitte in den beiden Armen und die Unterseite in der Höhe, bei einem liegenden die Mitte quer und ein Ende längs. Stimmen alle drei wieder überein, zeigt der Knopf am Griff den gemeinsamen Modus.

Stehen Körper an einem der Arme, zeigt das Winkellineal automatisch deren Maße an. Das geht nur auf der Grundplatte, nicht auf der Seite eines Körpers.

Markierst du einen Körper, zeigt das Winkellineal in Grün, wie weit er von der Ecke entfernt ist, entlang beider Arme und in der Höhe. Ein Klick auf eine grüne Zahl öffnet ein Eingabefeld: Tippe den gewünschten Abstand ein, und der Körper rückt genau dorthin. Sind mehrere Körper markiert, zählen sie zusammen wie einer. Gemessen wird ihr gemeinsamer Umriss, und ein eingetippter Wert verschiebt alle gemeinsam, ohne dass sich ihre Lage zueinander ändert.

Mit dem Mittelpunkt zählen die grünen Zahlen bis zur Mitte des Körpers, auch in der Höhe. So setzt du etwa eine Kugel mit ihrer Mitte genau 15 mm neben eine Kante, ohne den Radius abzuziehen. Auf einer Wand setzt du so ein Loch 40 mm von links und 190 mm von oben: Loch markieren, Mittelpunkt einschalten, 40 und 190 eintippen. Die Höhe zählt dort von der Wand aus nach außen.

Das Maßband und das Winkellineal bleiben stehen, wenn du eine Skizze machst und in die 3D-Ansicht zurückkehrst. Sie werden nicht mit dem Entwurf gespeichert und stehen nicht im Verlauf, und beim Neuladen der Seite sind sie weg.

## Abstände zum Nullpunkt und beim Verschieben

In den Einstellungen unter {{ui:workspace.appearance}} gibt es zwei Schalter für laufende Maße:

- {{ui:workspace.showMoveDimensions}} zeigt beim Verschieben, um wie viel du dich bewegst.
- {{ui:workspace.showOriginDimensions}} zeigt die Abstände der Auswahl zum Nullpunkt der Platte, auch bei mehreren markierten Körpern.

Mit {{ui:workspace.dimensionsAlwaysVisible}} bleiben die Maße dauerhaft sichtbar.

## Notizen

Eine Notiz hält fest, was die Geometrie nicht sagt: „Hier ist eine Schraube 0,3 mm zu eng“, „Deckel noch drucken“, „Maß von Peter“. Setze sie mit {{ui:editor.tool.note}} oder der Taste [[N]].

- Setzt du die Notiz **auf einen Körper**, wandert sie mit ihm.
- Setzt du sie **daneben**, bleibt sie auf der Arbeitsebene ({{ui:note.free}}).
- {{ui:note.detach}} löst eine angeheftete Notiz vom Körper.
- Ziehen verschiebt die Notiz, ein Klick öffnet sie zum Bearbeiten.
- Beim Schreiben übernimmt [[Enter]] den Text, und [[Esc]] stellt ihn wieder her, wie er vorher war; [[Umschalt]]+[[Enter]] beginnt eine neue Zeile.

Notizen werden im Entwurf gespeichert, tauchen in keinem Export auf und lassen sich über {{ui:visibility.notes}} ein- und ausblenden.

## Bezugspunkte

Ein Bezugspunkt ist eine bloße Markierung im Raum, wie ein Bleistiftstrich oder ein Anreißpunkt in der Werkstatt: Er gehört zu keinem Körper, wird nie gedruckt, und andere Dinge rasten an ihm ein. Klicke einen Körper mit der rechten Maustaste an und wähle {{ui:contextMenu.markCenter}}, {{ui:contextMenu.markCorners}} oder {{ui:contextMenu.markMidpoints}}: Die Punkte erscheinen auf der Oberseite des Körpers (der ganzen Auswahl, wenn du mehrere gewählt hast).

- Ziehe einen Punkt, um ihn zu verschieben, oder klicke ihn an, um seine Koordinaten zu sehen und neue einzutippen; sie gelten in der eingestellten Einheit. Jede Karte lässt sich am Titel wegziehen, wenn sie etwas verdeckt, und zwar einzeln: Die anderen bleiben, wo sie sind, und ein Doppelklick auf den Titel holt sie zurück. Die Karte, die du zuletzt angefasst hast, liegt vor den anderen. **Alle löschen** in einer Karte oder im Rechtsklickmenü löscht alle Punkte auf einmal. {{ui:common.delete}} entfernt ihn.
- Das Maßband kann auch einen Punkt setzen: {{ui:camera.tapeMarkMiddle}}, der Fadenkreuz-Knopf unter einer Messung, legt einen in ihre Mitte, etwa in den Mittelpunkt einer runden Bohrung. Und es misst von einem Punkt aus: Das Maßband rastet an Bezugspunkten ein wie an Ecken.
- Ziehst du eine Form, rasten ihre Kanten und ihre Mitte an einem Punkt ein, wie sie an anderen Formen einrasten ({{ui:workspace.objectSnap}}). Auch das Winkellineal rastet an Punkten ein.
- Punkte werden im Entwurf gespeichert, tauchen in keinem Export auf und werden zusammen mit den Notizen über {{ui:visibility.notes}} ein- und ausgeblendet.
- Eine KI kann sie mit `layerling_add_reference_points`, `layerling_list_reference_points` und `layerling_remove_reference_points` setzen, auflisten und entfernen.
