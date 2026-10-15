---
title: Dateien, Speichern und Weitergeben
summary: Wo deine Entwürfe liegen, wie du sie sicherst, welche Formate layerling importiert und exportiert und was auf einem gemeinsamen Server möglich ist.
---

## Wo deine Entwürfe liegen

layerling speichert alles im Browser auf deinem Rechner. Es gibt kein Konto, und nichts wird hochgeladen. Jede Änderung sichert sich von selbst. Das Vorschaubild auf der Startseite zeigt die Ansicht, die du zuletzt vor dir hattest, als du mit {{ui:editor.homeDashboard}} zurückgegangen bist. Öffnest du layerling nach Tagen wieder im selben Browser, ist alles da.

Gehst du von einem Entwurf, in dem nichts liegt, zurück zur Startseite, fragt layerling, ob er bleiben soll. {{ui:confirm.yes}} oder [[Enter]] behält ihn, {{ui:confirm.no}} entfernt ihn, damit sich keine leeren Entwürfe ansammeln. Entwürfe im gemeinsamen Ordner auf einem Server sind davon ausgenommen.

Das hat eine Kehrseite: Wer den Browserspeicher löscht oder auf einen anderen Rechner wechselt, verliert die Entwürfe. **Sichere deshalb wichtige Arbeiten in eine Datei.**

## Sichern und Weitergeben

Auf der Startseite hat jeder Entwurf ein Menü mit den Optionen zum Umbenennen, Duplizieren und Löschen. Mit {{ui:dashboard.backupAll}} packst du alle Entwürfe auf einmal in eine einzige Datei. Über {{ui:dashboard.importGeometry}} kommen sie wieder zurück, auch in einem anderen Browser oder auf einem anderen Rechner. Die {{ui:myShapes.title}} dieses Browsers reisen in derselben Datei mit, im Ordner `Custom shapes`, siehe [Formen](chapter:formen).

Einen einzelnen Entwurf sicherst du im Editor: {{ui:editor.export}}, dann das Format **LYL** wählen und {{ui:export.saveProject}} anklicken. Die LYL-Datei ist layerlings eigenes Entwurfsformat und enthält alles: Formen, Gruppen, Skizzen, CAD-Daten, importierte Quellen und den Verlauf, also die Rückgängig-Schritte. Bei {{ui:export.historyTitle}} wählst du, wie viele der letzten Schritte mitreisen sollen; vorgegeben ist, was die Einstellungen (das Zahnrad im Menüband) unter {{ui:workspace.history}} aufheben. Die letzte Stufe, {{ui:export.historyNone}}, speichert den Entwurf nur mit seinem aktuellen Stand - der Weg, eine Datei ohne ihre Rückgängig-Schritte weiterzugeben. Der Export ist eine Kopie unter dem {{ui:export.fileName}}, den du einträgst; der Entwurf im Browser behält seinen Verlauf. Ältere `.skf`-Dateien aus früheren Fassungen lassen sich weiterhin öffnen, gespeichert wird dann als `.lyl`.

**In den eigenen Ordner speichern (Chrome und Edge).** Dort öffnet der Knopf den Speichern-Dialog deines Systems: Ordner und Namen wählst du selbst, und eine vorhandene Datei lässt sich ersetzen. Danach speichert [[Strg]]+[[S]] den Entwurf ohne Dialog wieder in genau diese Datei. Ein Entwurf, den du aus einer `.lyl`-Datei mit {{ui:dashboard.importGeometry}} oder dem Öffnen-Knopf im Export-Fenster geöffnet hast, wird ebenfalls in diese Datei zurückgespeichert. Einmalig fragt der Browser womöglich nach der Erlaubnis, die Datei zu ändern. Nach dem Neuladen der Seite kennt der Entwurf seine Datei nicht mehr, das nächste [[Strg]]+[[S]] fragt wieder danach; der Dialog beginnt im zuletzt benutzten Ordner. Firefox und Safari erlauben einer Seite nicht, so in Dateien zu schreiben. Dort wird die Datei wie bisher in den Downloads-Ordner heruntergeladen, und [[Strg]]+[[S]] lädt sie erneut herunter; Firefox lässt sich unter Einstellungen, Allgemein, Downloads so einstellen, dass es jedes Mal nach dem Ordner fragt.

## Exportieren

Klicke auf {{ui:editor.export}} oder drücke [[Strg]]+[[E]].

![Das Exportfenster mit den Formaten STL, 3MF, OBJ, STEP, SVG, PNG, LYL und 2D.](shot:export-panel)

Oben steht der Dateiname, darunter wählst du das Format. Ist etwas markiert, wird nur die Auswahl exportiert, sonst der ganze Entwurf. Lässt die Auswahl sichtbare Teile aus, sagt das ein Hinweis im Fenster deutlich, und {{ui:export.selectAll}} markiert mit einem Klick alles Sichtbare. Ist die Datei geschrieben, schließt sich das Fenster von selbst; schlägt der Export fehl, bleibt es mit der Meldung offen.

| Format | Wofür | Was du wissen musst |
| --- | --- | --- |
| **STL** | Slicer und 3D-Druck | Ein Dreiecksnetz. Das einfachste und verbreitetste Format. |
| **3MF** | Slicer mit Farben | Jeder Körper bleibt ein eigenes Teil mit Namen und Farbe. Was sich überlappt, wird nur bei gleicher Farbe zusammengefügt; steckt eine Form in einer andersfarbigen, etwa ein Logo in einer Platte, spart die zuerst gebaute dort Platz für die spätere aus. Geeignet für PrusaSlicer, Bambu Studio, OrcaSlicer und Cura. Bambu Studio und OrcaSlicer fragen beim Öffnen, wie die Farben auf deine Filamente verteilt werden sollen, und nennen die Datei „nicht von Bambu“ – die Meldung ist harmlos. |
| **OBJ** | Modellierung und Austausch | Ein breit unterstütztes Netzformat. Die Farben stehen als Eckpunktfarben in derselben Datei, ohne zusätzliche `.mtl`. Bambu Studio und OrcaSlicer lesen sie und fragen wie bei 3MF nach der Zuordnung auf die Filamente; andere Programme sehen nur die Form. Überlappende Körper werden wie bei 3MF nur bei gleicher Farbe zusammengefügt. |
| **STEP** | Ein vollwertiges CAD-Programm | Behält Quader, Zylinder, Kugeln und Kegel als exakte Geometrie, ebenso Formen aus einem Umriss (Stern, Herz, Ellipse, Rohr, Halbkugel, Rundes Dach, Abgerundeter Quader, Schwalbenschwanz, die Bohrungen und mehr), das gebogene Rohr, Gewinde, Federn und Zahnräder, dazu Rundungen und Fasen. Der erste STEP-Export in einer Sitzung lädt den CAD-Kern (etwa 22 MB) einmalig nach. |
| **SVG** | Lasercutter und Plotter | Eine saubere Draufsicht in Millimetern, samt Löchern und gekrümmten Umrissen. |
| **PNG** | Forenbeiträge, Druckportale, Rückfragen | Ein Bild der Ansicht, wie sie gerade ist, in doppelter Auflösung und ohne Griffe, Auswahlrahmen und Maße. {{ui:export.png.plate}} und {{ui:export.png.transparent}} wählst du im Fenster. Drehe und zoome vorher, bis der Ausschnitt passt; die Auswahl spielt hier keine Rolle. |
| **LYL** | layerling selbst | Der bearbeitbare Entwurf mit allem Drum und Dran. |
| **2D** | Werkstatt, Drehbank und Fräse, Dokumentation | Eine Zeichnung im Maßstab 1:1 als PDF oder SVG: Vorder-, Drauf- und rechte Seitenansicht auf einem ISO-Blatt. Siehe unten. |

**STL in den eigenen Ordner (Chrome und Edge).** Dort öffnet der erste STL-Export eines Entwurfs den Speichern-Dialog deines Systems: Ordner und Namen wählst du selbst, und eine vorhandene Datei lässt sich ersetzen. Danach schreibt jeder STL-Export des Entwurfs ohne Dialog in genau diese Datei; das Export-Fenster zeigt, in welche, und **Speichern unter …** neben dem Export-Knopf wählt eine andere. Der Dialog merkt sich seinen eigenen Ordner, getrennt von dem für Entwürfe, so bleiben die Slicer-Dateien beim Slicer. Nach dem Neuladen der Seite kennt der Entwurf seine STL-Datei nicht mehr, und der nächste Export fragt wieder. Firefox und Safari laden die Datei wie bisher herunter.

Eine Aussparung, die du nicht gruppiert hast, zieht der Export von jedem Körper ab, den sie berührt, so wie die Ansicht es zeigt. Du musst also nicht vor jedem Export gruppieren. Mit einer Auswahl zählen nur die ausgewählten Aussparungen. Allein lässt sich eine Aussparung nicht exportieren; darauf weist dich layerling hin.

STEP enthält nur exakte CAD-Körper. Was sich nicht exakt abbilden lässt, etwa ein als STL importiertes Netz, bleibt draußen. Die Meldung nach dem Export nennt diese Körper beim Namen und sagt, warum. Für den Drucker nimmst du dann STL oder 3MF, die tragen alles.

### Eine Zeichnung für die Werkstatt

Wähle das Format **2D** (mit der Maus darauf steht Zeichnung) und unter dem Dateinamen PDF oder SVG. Ist etwas ausgewählt, wird nur die Auswahl gezeichnet, sonst der ganze sichtbare Entwurf; Aussparungen, die du nicht gruppiert hast, schneiden trotzdem die Teile, die sie berühren.

layerling zeichnet Vorder-, Drauf- und rechte Seitenansicht in Erstwinkelprojektion (die Seitenansicht links neben der Vorderansicht, die Draufsicht darunter) auf das kleinste ISO-Blatt, das passt, von A4 bis A0, oder ein größeres, wenn das Teil es braucht. Es ist immer 1:1. Jede Ansicht trägt ihre Gesamtbreite und -höhe, Kanten, die man nicht sieht, sind gestrichelt. Runde Bohrungen, die parallel zu einer Blickrichtung laufen, bekommen ein Mittenkreuz und eine Bezeichnung (F1, T1, R1), und eine Tabelle unten nennt ihren Durchmesser und ihre Lage, gemessen von der linken unteren Ecke der Ansicht. Das Schriftfeld unten rechts enthält Name, Maßstab, Einheit, Datum und Blattnummer. Die Wörter auf dem Blatt folgen der Sprache der Oberfläche.

Drucke bei 100 % oder „tatsächlicher Größe“, sonst stimmen die Längen nicht. Was die Zeichnung nicht tut: Gewinde, Tiefen, Toleranzen und schräge Bohrungen werden nicht bemaßt, und die Maße kommen aus dem Modell als Netz, sind also Nennmaße. Ein sehr feines Teil (über 100.000 Dreiecke) oder mehr als 200 Bohrungen lehnt der Export mit einer Meldung ab; wähle dann weniger Objekte.

Die Projektion beruht auf der Zeichnungsarbeit von Cadverix-3D von WC3D.

### Wie viel Filament braucht das?

Bei STL, 3MF, OBJ und STEP zeigt das Feld {{ui:export.estimateTitle}} Volumen, Gewicht und Filamentlänge (1,75 mm) dessen, was exportiert wird. Gezählt wird wie in der Datei: nur sichtbare Körper, Aussparungen abgezogen, Überlappungen nur einmal. Rechts wählst du das Filament – PLA, PETG, ABS, ASA, TPU oder PA (Nylon) –, das Gewicht folgt seiner Dichte. Das Volumen ist das des Körpers. Gewicht und Filament sind eine grobe Schätzung für einen Druck mit Wänden und Füllung: Unter der Überschrift stellst du die {{ui:export.estimateInfillLabel}} (zu Beginn 15 %) und die {{ui:export.estimateWallsLabel}} (2) ein, und das Feld sagt, was es gezählt hat und wie viel dasselbe Teil massiv wöge. Die Einstellungen deines Slicers entscheiden über die echte Zahl, nimm sie also als Richtwert, gut zum Vergleichen von Entwürfen und dafür, ob die Rolle noch reicht. Bei 100 % Füllung zählt das Feld das Teil als massiv, die Obergrenze und taugt gut zum Vergleichen und dafür, ob die Rolle noch reicht.

## Importieren

Über {{ui:editor.import}} oder [[Strg]]+[[I]] bringst du fremde Dateien in den Entwurf.

![Das Importfenster: Entwürfe öffnen oder einfügen und Geometrie ablegen.](shot:import-panel)

- **{{ui:import.openProject}}:** Ein layerling-Entwurf (`.lyl`, oder eine ältere `.skf`) kommt als neuer Entwurf zurück.
- **{{ui:import.insertProject}}:** Die Körper eines layerling-Entwurfs kommen in den offenen dazu. Praktisch für Grundformen, die du immer wieder brauchst: Baue sie einmal, speichere sie und hole sie jedes Mal herein.
- **Geometrie hinzufügen:** Lege STL-, OBJ-, 3MF-, STEP- oder SVG-Dateien im Fenster ab oder klicke, um eine Datei auszuwählen. Importierte Netze kannst du drehen, verschieben, mit Aussparungen schneiden und dann weiterbauen. Ein SVG kommt als Skizzenkörper, auch eins aus einem Nachzeichner wie picsvg.com oder Inkscapes „Bitmap nachzeichnen“: Seine Umrisse werden zu Linien und Kurven einer Skizze, 4 mm hoch und von oben so zu lesen wie in der Zeichnung. In den Eigenschaften stellst du die {{ui:prop.sketchFill}} ein, als Fläche oder als Kontur außen, innen oder mittig, und mit {{ui:prop.sketchSilhouette}} fallen die Löcher weg, siehe [Skizzen](chapter:skizzen), Abschnitt „Füllung und Silhouette“. Die Punkte selbst änderst du im Skizzenmodus. Nur ein sehr verwickeltes SVG mit mehr als 2500 Linien und Kurven kommt als festes Netz. Eine Form, die sich nicht zu einem Körper bauen lässt, etwa ein Umriss, der sich selbst kreuzt oder an einem Punkt berührt, lässt layerling weg und meldet nach dem Import, wie viele es waren. Dann hilft es, im Zeichenprogramm überlappende Teile zusammenzufügen, die Umrisse zu schließen und die Datei neu zu speichern. Zeichnungen, die auf einer Seite entstanden sind, etwa die Ebenen eines Dokuments als einzelne Dateien, liegen wieder deckungsgleich, wenn du im Importfenster vor dem Import {{ui:import.keepSvgPage}} einschaltest: Jede behält ihre Lage auf der Seite, sonst wird jede auf sich selbst zentriert. Eine farbige OBJ oder 3MF kommt als ein Körper je Farbe, alle an ihrem Platz zueinander. Bei einer OBJ stehen die Farben entweder in der Datei selbst, wie bei einer OBJ aus layerling, oder in einer `.mtl` daneben. Die wählst du mit aus, oder du importierst gleich das ganze ZIP, so wie Tinkercad die OBJ herausgibt. Eine 3MF trägt ihre Farben selbst, und bei einem Projekt aus Bambu Studio, OrcaSlicer oder PrusaSlicer bekommt jedes Teil die Farbe seines Filaments. Eine 3MF mit mehreren Objekten, etwa ein Projekt mit einem Objekt je Druckplatte, kommt als ein Körper je Objekt; Modifier, negative Volumen und Stützblocker aus dem Slicer bleiben draußen. Was im Slicer auf die Flächen gemalt wurde, liest layerling nicht.

Ein Entwurf, der mit einer **neueren layerling-Version** gespeichert wurde, kann Dinge enthalten, die deine Version noch nicht kennt, etwa eine neue Form, eine neue Einstellung oder eigene Schriften. Kann layerling ihn deshalb nicht öffnen, nennt die Meldung beide Versionen. Öffnet er sich, steht im Hinweis, dass Neueres hier anders aussehen kann. In beiden Fällen hilft es, die Seite neu zu laden: layerling.com liefert immer die neueste Version. Die installierte App holt sie sich beim nächsten Start, auf einem eigenen Server spielst du das Update ein.

Bilder als Vorlage fügst du im Skizzenmodus ein, siehe [Skizzen](chapter:skizzen).

## Ein importiertes Netz vereinfachen

Ein gescanntes oder modelliertes Netz hat oft weit mehr Dreiecke, als seine Form braucht, und jedes davon wird beim Verschieben, Schneiden und Speichern mitgeschleppt. {{ui:simplify.title}} in der Gruppe Ändern (oder im Rechtsklickmenü des Körpers) zeigt das Netz, wie es ist, neben dem, was ein gewählter Anteil seiner Dreiecke davon übrig lässt; beide Ansichten drehen und zoomen gemeinsam, mit den Maustasten der Arbeitsebene. Lege fest, wie viel bleiben soll, als Prozentsatz oder als Zahl von Dreiecken, und {{ui:simplify.apply}} übernimmt das leichtere Netz. Das Ergebnis ist ein einfaches Netz: Beim Ergebnis eines Schnitts oder einer Vereinigung entfallen {{ui:group.edit}} und die ursprünglichen Teile.

Schneiden, Vereinigen und Schnittmengen mit einem importierten Netz werden in deinem Browser berechnet, darum begrenzen die Arbeitsbereich-Einstellungen, wie viele Dreiecke so ein Netz haben darf ({{ui:workspace.booleanTriangleLimit}}). Ein Netz über der Grenze wird nicht verarbeitet, und die Meldung nennt seine Dreieckszahl; vereinfache das Netz zuerst oder hebe die Grenze an, wenn dein Rechner das verträgt.

## Einen Fehler melden

Macht layerling etwas Unerwartetes, speichere einen {{ui:editor.bugReport}}: Der Link steht unten in der Fußzeile neben dem Forum. Das ist eine ZIP-Datei, weil GitHub und viele Foren eine bloße .lyl ablehnen: Darin liegen dein Entwurf als .lyl und eine kurze Textdatei mit Version, Browser, Bildschirmgröße, den letzten Meldungen und aufgetretenen Fehlern. Die Startseite öffnet das ZIP wie eine Sicherung, oder du entpackst es und öffnest die .lyl. Persönliches steht nicht darin. Häng die Datei an deinen Beitrag im Forum oder bei GitHub, dann lässt sich der Fehler mit genau deinem Entwurf nachstellen.

Bleibt layerling mit einem Fehler stehen, erscheint statt einer leeren Seite ein Fenster mit der Fehlermeldung. Darin sicherst du den zuletzt im Browser gespeicherten Stand des Entwurfs als .lyl-Datei, kehrst zur Übersicht zurück oder beginnst einen neuen Entwurf. Die Fehlermeldung aus dem Fenster und die gesicherte Datei helfen beim Melden.

## Gemeinsame Entwürfe auf einem Server

Wenn layerling auf einem eigenen Rechner oder Webserver läuft, kann es einen gemeinsamen Ordner anbieten, in dem alle Nutzer Entwürfe ablegen. Auf der Startseite erscheint er dann als {{ui:dashboard.sharedProjects}}. Du legst dort Ordner an, verschiebst Entwürfe per Ziehen und suchst über den ganzen Ordner. Ein Entwurf, der dort liegt, sichert sich von selbst dorthin zurück. Ein Entwurf aus diesem Browser kommt auf den Server, indem du seine Kachel auf die Serverkachel ziehst oder im Menü der Kachel {{ui:dashboard.sendToServer}} wählst. Eine Sicherung, die du öffnest, landet zuerst in diesem Browser, wie jeder Entwurf, den du öffnest; von dort legst du die Entwürfe auf den Server. Die Startseite zeigt einen Entwurf unter seinem Dateinamen: Benennst du ihn um, auf seiner Kachel oder oben im Editor, wird auch die Datei auf dem Server umbenannt. Löschst du einen Entwurf oder Ordner, ist er endgültig weg, samt seiner Arbeitskopie in diesem Browser. Eigene Formen auf dem Server liegen dort im Ordner `Custom shapes`, siehe [Formen](chapter:formen).

Zwei Dinge machen das schneller: {{ui:dashboard.sendAllToServer}} auf der Startseite legt alle Entwürfe dieses Browsers auf einmal auf den Server, und mit dem Haken bei {{ui:dashboard.newOnServer}} startet jeder neue Entwurf gleich im Serverordner und sichert sich dort ab der ersten Änderung. Der Haken bleibt in diesem Browser gespeichert. Ein Entwurf, der nicht mitkommt - etwa weil sein Name auf dem Server schon vergeben ist -, bleibt im Browser, und die Meldung sagt, wie viele es sind.

Das ist kein gleichzeitiges Bearbeiten: Wer eine Datei öffnet, arbeitet an einer eigenen Kopie. Hat inzwischen jemand anderes die Datei geändert, verweigert layerling das Überschreiben.

Auf layerling.com ist diese Funktion nicht eingeschaltet. Wie du sie auf einem eigenen Server einrichtest, steht in der [README auf GitHub](https://github.com/henmedia/layerling/blob/main/README.de.md#gemeinsame-entwürfe-im-netz).
