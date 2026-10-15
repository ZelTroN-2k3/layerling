---
title: Meten en notities
summary: Meetlint, liniaal en winkelhaak, afstanden tot de oorsprong, notities die aan een onderdeel vast blijven zitten, en referentiepunten waarop dingen uitlijnen.
---

Om een onderdeel precies te bouwen, moet je meten. layerling heeft daar verschillende hulpmiddelen voor. Geen daarvan komt in een export terecht. Wanddiktes en tussenruimtes binnen een onderdeel meet je het best in de [doorsnedeweergave](chapter:weergave-en-werkvlak) met {{ui:camera.sectionMeasure}}.

## Het meetlint

Het meetlint zit aan de onderkant van de camerabalk aan de linkerrand ({{ui:camera.tapeTools}}). Het meet afstanden tussen hoeken, randen en vlakken. Een klik erop opent vijf knoppen. Zitten die in de weg bij wat je wilt meten, sleep ze dan aan de greep links naar een willekeurige plek op het werkvlak; een dubbelklik op de greep zet ze terug:

![Het meetlint met zijn knoppen: meting toevoegen, meetpunten verplaatsen, meting verwijderen, hele randen, alle metingen verwijderen.](shot:tape-menu)

1. **{{ui:camera.addMeasurement}}:** Klik op een punt, sleep naar het volgende en klik daarop. De afstand krijgt een label.
2. **{{ui:camera.moveMeasurement}}:** Pak de punten en verplaats ze, het getal volgt mee.
3. **{{ui:camera.deleteMeasurement}}:** Klik daarna op een meting om die te verwijderen.
4. **{{ui:camera.tapeWholeEdges}}:** Een klik op een rand meet de hele rand, bij een cirkel bijvoorbeeld de omtrek. Staat dit uit, dan zet een klik in plaats daarvan een punt op de rand, en het tweede punt mag overal liggen, zodat je de diameter of een andere afstand kunt meten. [[Alt]] draait de schakelaar voor één klik om. Op een cirkel klikt het punt tegenover het eerste vast zodra de aanwijzer in de buurt komt, en de punten liggen op de echte cirkel, zodat de diameter precies klopt.
5. **{{ui:camera.deleteAllMeasurements}}:** Verwijdert alle metingen in één keer. Omdat dit niet ongedaan kan worden gemaakt, vraagt layerling het eerst; zijn er geen metingen, dan is er niets te doen.
6. **{{ui:camera.tapeMarkMiddle}}:** Onder het getal van elke meting zit een klein draadkruisknopje. Het zet een [referentiepunt](#referentiepunten) in het midden van de meting: na een klik op een ronde rand, zoals de rand van een gat, in het middelpunt van die cirkel - ook bij een geïmporteerd net, waar anders niets het midden van een gat markeert - en bij een diameter of elke rechte meting halverwege. Een vorm die je sleept snapt dan met zijn midden op het punt. Een punt dat er al is, wordt niet dubbel gemaakt.

[[Esc]] verlaat de meetmodus.

## De liniaal

De {{ui:shape.ruler}} haal je uit de vormenbibliotheek. Het is puur een meetinstrument: hij komt in geen enkele export terecht en kan niet gegroepeerd of geknipt worden. Voor elk lichaam dat de liniaal raakt of overlapt, toont hij de afmeting als zwevend getal direct in de weergave. Je kunt dat getal daar meteen aanpassen, en het lichaam volgt. Het zwevende plusteken maakt een kopie van de gemeten vorm.

## De winkelhaak

Soms meet je beter in een rechte hoek. Klik op {{ui:camera.cornerRulerTool}} in de camerabalk en dan op het werkvlak. Daar wordt een winkelhaak geplaatst met twee armen in een rechte hoek, met maatstreepjes zoals op een blokhaak. Ook die heeft geen eigen lichaam. Klik je dicht bij de hoek van een lichaam, dan klikt zijn hoek precies daar vast.

De winkelhaak ligt op het werkvlak. Ligt dat op de zijkant van een lichaam, dan ligt de winkelhaak ook op die zijkant, zie [Weergave en werkvlak](chapter:weergave-en-werkvlak). Zo maat je op een verticale wand: zet het werkvlak op de wand, plaats de winkelhaak in de linkerbovenhoek en klik op de greep tot de armen naar rechts en naar beneden wijzen.

- **De greep slepen** verplaatst hem.
- **Een korte klik op de greep** draait hem 90°.
- **Het ×** ernaast verwijdert hem.
- **Het knopje links van de greep** wisselt waarvandaan gemeten wordt: de buitenkant van een lichaam (eindpunt, een icoon met lijnen) of het midden ervan (middelpunt, een vizierkruis).

Staan er lichamen bij een van de armen, dan toont de winkelhaak automatisch hun afmetingen. Dat werkt alleen op de bodemplaat, niet op de zijkant van een lichaam.

Selecteer je een lichaam, dan toont de winkelhaak in het groen hoe ver het van de hoek af staat, langs beide armen en in de hoogte. Klik op een groen getal om een afstand te typen, en het lichaam schuift precies daarheen. Met meerdere lichamen geselecteerd tellen ze als één: de winkelhaak meet hun gezamenlijke omtrek, en een getypte waarde verplaatst ze allemaal samen zonder hun onderlinge posities te veranderen.

Met het middelpunt tellen de groene getallen tot het midden van het lichaam, ook in de hoogte. Zo plaats je een bol met zijn middelpunt precies 15 mm van een rand, zonder de straal ervan af te trekken. Op een wand plaats je een gat op 40 mm van links en 190 mm van boven zo: selecteer het gat, schakel naar middelpunt, typ 40 en 190. De hoogte telt daar vanaf de wand naar buiten.

Zowel het meetlint als de winkelhaak blijven staan terwijl je schetst en terugkeert naar de 3D-weergave. Ze worden niet met het ontwerp opgeslagen en niet in de geschiedenis, en ze verdwijnen als je de pagina herlaadt.

## Afstanden tot de oorsprong en tijdens het verplaatsen

In de instellingen onder {{ui:workspace.appearance}} staan twee schakelaars voor live maten:

- {{ui:workspace.showMoveDimensions}} toont hoeveel je verplaatst tijdens het slepen.
- {{ui:workspace.showOriginDimensions}} toont de afstanden van de selectie tot de oorsprong van de plaat, ook bij meerdere geselecteerde lichamen.

Met {{ui:workspace.dimensionsAlwaysVisible}} blijven de maten altijd zichtbaar.

## Notities

Een notitie legt vast wat de geometrie niet zegt: "Deze schroef zit 0,3 mm te krap", "het deksel nog printen", "maat van Peter". Plaats er een met {{ui:editor.tool.note}} of de toets [[N]].

- Plaats je de notitie **op een lichaam**, dan reist ze mee.
- Plaats je haar **ernaast**, dan blijft ze op het werkvlak ({{ui:note.free}}).
- {{ui:note.detach}} maakt een vastgemaakte notitie los van het lichaam.
- Slepen verplaatst de notitie, een klik opent haar om te bewerken.
- Terwijl je schrijft, bewaart [[Enter]] de tekst en zet [[Esc]] hem terug zoals hij was voordat je begon; [[Shift]]+[[Enter]] begint een nieuwe regel.

Notities worden in het ontwerp opgeslagen, komen in geen enkele export terecht en kun je tonen of verbergen met {{ui:visibility.notes}}.

## Referentiepunten

Een referentiepunt is een kaal merkteken in de ruimte, zoals een potloodstreep of een aftekenpunt in een werkplaats: het hoort bij geen enkel lichaam, wordt nooit geprint, en andere dingen klikken eraan vast. Klik met rechts op een lichaam en kies {{ui:contextMenu.markCenter}}, {{ui:contextMenu.markCorners}} of {{ui:contextMenu.markMidpoints}}: de punten verschijnen op het bovenvlak van het lichaam (van de hele selectie, als je er meerdere hebt geselecteerd).

- Sleep een punt om het te verplaatsen, of klik erop om de coördinaten te zien en nieuwe te typen; ze gebruiken de eenheid die je hebt ingesteld. Elke kaart kun je aan zijn titel wegslepen als die iets bedekt, en wel afzonderlijk: de andere blijven waar ze zijn, en een dubbelklik op de titel zet hem terug. De kaart die je het laatst hebt aangeraakt, ligt voor de andere. **Alles verwijderen** in een kaart, of in het rechtsklikmenu, verwijdert alle punten in één keer. {{ui:common.delete}} verwijdert het punt.
- Het meetlint kan ook een punt zetten: {{ui:camera.tapeMarkMiddle}}, het draadkruisknopje onder een meting, zet er een in het midden, bijvoorbeeld in het middelpunt van een rond gat.
- Sleep je een vorm, dan klikken zijn randen en zijn midden vast aan een punt, zoals ze aan andere vormen vastklikken ({{ui:workspace.objectSnap}}). Ook de winkelhaak klikt vast aan punten.
- Punten worden in het ontwerp opgeslagen, komen in geen enkele export terecht en worden samen met de notities getoond of verborgen met {{ui:visibility.notes}}.
- Een AI kan ze markeren, opsommen en verwijderen met `layerling_add_reference_points`, `layerling_list_reference_points` en `layerling_remove_reference_points`.
