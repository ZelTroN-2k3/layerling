---
title: Selecteren en schikken
summary: Vormen selecteren, ze terugvinden in de objectlijst, uitlijnen, spiegelen, draaien, plat op een vlak leggen en in patronen vermenigvuldigen.
---

## Selecteren

Een klik op een vorm selecteert hem. Met [[Shift]] voeg je er meer toe of haal je ze weer weg. Een klik op een lege plek maakt de selectie leeg, en [[Esc]] doet dat ook. Sleep een kader op het lege werkvlak om alles te selecteren wat het raakt; met [[Shift]] ingedrukt voegt het kader toe wat nog niet geselecteerd was en haalt het weg wat dat wel was. En [[Ctrl]]+[[A]] selecteert alle zichtbare lichamen.

Wat in de weg zit, verberg je ({{ui:editor.tool.hideSelected}}, [[Ctrl]]+[[H]]). Verborgen vormen blijven in het ontwerp, ze zijn alleen niet te zien en gaan niet mee in de export; het exportvenster zegt vooraf hoeveel het er zijn. [[Ctrl]]+[[Shift]]+[[H]] haalt ze allemaal terug. Wat moet blijven staan, vergrendel je met het hangslot bovenaan in de instellingen of met [[Ctrl]]+[[L]]. Een vergrendelde vorm kun je niet verplaatsen, van grootte veranderen, draaien, een andere kleur geven of verwijderen: zijn grepen worden grijs, naast de pijl bovenop verschijnt een hangslot, en de gereedschappen die hem zouden veranderen zijn grijs. Als je over een greep beweegt, zie je nog steeds zijn maten, en een toets die hem zou veranderen meldt "Object vergrendeld". Zolang er één vergrendelde vorm in de selectie zit, verandert er ook aan de andere niets. Verbergen, hernoemen, kopiëren en dupliceren werken nog gewoon.

## De objectlijst

Met veel onderdelen raak je in de weergave makkelijk het overzicht kwijt. De objectlijst ({{ui:editor.tool.showOutliner}} of [[Ctrl]]+[[Shift]]+[[O]]) toont alle vormen als een lijst. Ze blijft open of dicht zoals je haar achterliet, voor elk ontwerp, tot je haar sluit; de keuze wordt in de browser onthouden.

![De objectlijst: de groep "Groep" met twee onderdelen en een bol ernaast. Een mappictogram opent de groep.](shot:object-list)

- Een klik op een regel selecteert de vorm, ook onderdelen binnen een groep. Met [[Shift]] ingedrukt voeg je meer regels toe of haal je ze weer weg, net als in de weergave. De pijltjes klappen groepen open en dicht.
- Het label laat zien of een onderdeel {{ui:outliner.solid}} of {{ui:outliner.hole}} is.
- Hangslot en oog vergrendelen en verbergen afzonderlijke onderdelen.
- {{ui:outliner.rename}} geeft een onderdeel een eigen naam; het potlood naast de naam bovenaan in de instellingen doet hetzelfde voor de geselecteerde vorm. Zinnige namen helpen enorm in grotere ontwerpen.
- Het zoekveld vindt vormen op naam en op soort, dus ook "cilinder" of "gat". Het zoekt ook binnen groepen, hoe diep ook genest: een groep met een treffer blijft in de lijst staan en klapt open om de gevonden onderdelen te tonen en de groepen die ernaartoe leiden. Een groep die op zijn eigen naam gevonden is, toont al zijn onderdelen als je hem opent.
- Het pijltje helemaal links in de titelbalk klapt de lijst in tot alleen de titelbalk, en weer terug.

De lijst zit vastgezet net rechts van de weergavekubus. Sleep hem aan zijn titelbalk om hem ergens op het werkvlak neer te zetten; hij schuift onder de weergavekubus en de camerabalk door. Laat hem weer naast de weergavekubus los, of dubbelklik op de titelbalk, en hij zit weer vast. Waar hij stond en of hij ingeklapt was, onthoudt deze browser.

## Een positie typen

De kaart {{ui:inspector.position}} in het eigenschappenpaneel laat zien waar het geselecteerde lichaam staat, en je kunt die positie typen: {{ui:prop.positionX}} en {{ui:prop.positionY}} zijn het midden van zijn kader op de plaat, met dezelfde tekens als de afstanden die op het werkvlak staan, en {{ui:prop.positionZ}} is de hoogte van zijn onderkant. X telt naar rechts, Y naar achteren en Z omhoog, volgens de rechterhandregel zoals in Tinkercad en CAD-programma's; de aspijlen op de plaat tonen de richtingen. De waarden staan in de eenheid die je hebt ingesteld, en de schuifregelaars reiken net zo ver als slepen.

## Onderdelen naast de plaat parkeren

Je kunt een vorm voorbij de rand van de plaat slepen en hem daar laten liggen, tot ongeveer één plaatbreedte buiten elke kant, om hem voor later te bewaren. Met de pijltoetsen verplaats je hem zo ver als je wilt. Een geparkeerd onderdeel hoort nog steeds bij het ontwerp en gaat met al het andere mee in de export. Wil je het weglaten, verberg het dan of exporteer alleen de selectie. Als je een printer hebt gekozen, waarschuwt layerling bij het exporteren wanneer er iets buiten de plaat ervan ligt.

## Uitlijnen tijdens het verplaatsen

Als je een vorm over het werkvlak sleept, lijnt hij uit op andere vormen: zijn linker-, rechter-, voor- of achterrand of zijn midden komt precies op een rand of midden van een andere vorm te liggen. Een roze hulplijn laat zien waaraan hij zich vasthoudt. Zo staan twee onderdelen strak naast elkaar of gecentreerd achter elkaar zonder dat je getallen hoeft te typen. Het werkt ook als het raster uitstaat.

Houd [[Shift]] ingedrukt tijdens het slepen om de verplaatsing op één as te houden: de vorm volgt de richting, X of Y, waarin je het verst hebt gesleept, en laat de andere met rust. Druk [[Shift]] het best pas in als je al aan het slepen bent; bij een vorm die nog niet geselecteerd is, voegt een klik met [[Shift]] hem alleen aan de selectie toe.

Heb je [[Alt]] al ingedrukt als het slepen begint, dan sleep je een kopie, zoals in Tinkercad: de vorm blijft waar hij is en de kopie komt waar je loslaat. Druk je [[Alt]] pas onderweg in, dan pauzeert het uitlijnen; de vorm volgt dan alleen het raster. Ook een kopie lijnt pas uit als je [[Alt]] onderweg loslaat. Om het uitlijnen voorgoed uit te zetten, gebruik je het rastermenu rechtsonder ({{ui:inspector.objectSnap}}) of de instellingen. Voorlopig lijnt alleen verplaatsen op het normale werkvlak uit, niet optillen en niet van grootte veranderen.

## Uitlijnen

Twee of meer geselecteerde vormen zet je op één lijn met {{ui:editor.tool.align}}: rond de selectie verschijnen punten voor links, midden en rechts, voor, midden en achter, en boven, midden en onder. Een klik op een punt verplaatst alle vormen daarheen. Klik je eerst op een van de geselecteerde vormen, dan blijft die op zijn plek en lijnen de andere ermee uit. Een vergrendelde vorm in de selectie is vanzelf die vaste vorm. Links, rechts, voor, achter, boven en onder gaan uit van de kaders om een vorm; het midden van een driehoek, vijfhoek of ster is het eigen midden ervan, dus een gat dat daarop is gecentreerd, zit in het midden van de vorm en niet van zijn kader.

Een vorm die schuin staat, zeg 45° gedraaid, wordt uitgelijnd op het kader eromheen, niet op zijn eigen randen. Om op de randen uit te lijnen, zet je eerst een werkvlak op een vlak van die vorm ({{ui:camera.placeWorkplane}}, dan op het vlak klikken): de punten staan dan op de assen van dat vlak, en de vormen worden langs die assen gemeten en verplaatst, zoals in Tinkercad. Zet het werkvlak terug om weer langs de plaat uit te lijnen.

![Uitlijnen toont de mogelijke doelen als stippen rond de selectie.](shot:align)

De toets is [[L]]. [[Esc]] annuleert.

## Spiegelen

{{ui:editor.tool.mirror}} ([[M]], of klik met rechts op de selectie en kies het) klapt de selectie om over een vlak: {{ui:mirror.leftRight}}, {{ui:mirror.frontBack}} of {{ui:mirror.topBottom}}. Klik op de bijbehorende aspijl. Dat is handig voor symmetrische onderdelen: bouw één helft, kopieer die en spiegel de kopie.

## Draaien en het draaipunt instellen

Je draait met de gebogen pijlen op de vorm, met de getallen in de instellingen of met [[R]] in stappen van 45°. Als je op de draaicirkel sleept, klikt de draaiing vast op elk streepje, dus elke 22,5°; houd [[Shift]] ingedrukt voor fijnere stappen, dan verschijnen er extra streepjes om de 11,25°. Sleep buiten de cirkel om vrij te draaien in stappen van 1°, of in stappen van 45° met [[Shift]]. Normaal draait de selectie om haar midden. Soms moet dat niet, bijvoorbeeld als een schuine buis aan zijn uiteinde verder gedraaid moet worden. Daarvoor is er {{ui:editor.tool.rotationPivot}}: klik daarna op een vlak. Een plat vlak levert zijn middelpunt, bijvoorbeeld de as van een buiseinde. De selectie draait nu om dat punt. Een tweede klik op het gereedschap haalt het weer weg.

De hoeken blijven bij het lichaam. In zijn instellingen toont {{ui:inspector.rotation}} ze als {{ui:prop.rotateX}}, {{ui:prop.rotateY}} en {{ui:prop.rotateZ}}, genoemd zoals de positie: Y loopt over de plaat, Z is omhoog. Typ daar een hoek en het lichaam draait ernaartoe - om zijn midden, of om zijn eigen draaipunt als het er een heeft. Zolang een gedraaid lichaam geselecteerd is, staan zijn hoeken ook eronder op het werkvlak; {{ui:workspace.showRotationAngles}} in de instellingen zet dat uit.

![Een lichaam gedraaid om twee assen: zijn hoeken staan eronder, en de kaart Rotatie in zijn instellingen neemt ze als getallen.](shot:rotation-card)

Met **één lichaam** geselecteerd hoort het draaipunt bij dat lichaam: selecteer andere onderdelen en kom terug, en het is er nog steeds. Het verplaatst, draait en schaalt mee met het lichaam, wordt in het project opgeslagen en komt terug met Ongedaan maken. Onder {{ui:inspector.position}} heeft het draaipunt een eigen X, Y en Z, die je kunt typen of een tikje kunt verschuiven, en {{ui:inspector.pivotRemove}} haalt het weg. Je kunt de rode markering van het draaipunt ook met de muis slepen: ze glijdt over het oppervlak van de lichamen en klikt vast op hoeken, randmiddens en randen, zodat een scharnierpen precies op een hoek terechtkomt. Met meerdere lichamen geselecteerd geldt het draaipunt alleen voor die selectie, en een nieuwe selectie haalt het weg.

## Plat op een vlak leggen

Moet een onderdeel op zijn beste kant liggen om te printen? Selecteer het, klik op {{ui:editor.tool.layFlat}} en dan op het vlak dat naar beneden moet. Terwijl je de aanwijzer over het onderdeel beweegt, licht het vlak eronder op, zodat je ziet welk vlak je gaat kiezen; draai de weergave om de andere kanten te bekijken. Het onderdeel draait zo dat dit vlak op het werkvlak rust.

Moeten twee onderdelen vlak tegen vlak komen, of strak gelijk liggen? Selecteer het onderdeel dat moet bewegen, klik op {{ui:editor.tool.mateFaces}}, klik dan op een vlak ervan en daarna op het vlak van het andere onderdeel. In het paneel zet {{ui:mate.mode.against}} de vlakken tegen elkaar (rug aan rug, rakend), {{ui:mate.mode.flush}} legt ze in één vlak naast elkaar; {{ui:mate.gap}} laat ruimte ertussen, bijvoorbeeld voor speling. {{ui:mate.apply}} verplaatst het onderdeel: het draait de kortste weg tot de vlakken evenwijdig zijn - helemaal niet als ze dat al zijn - en schuift dan alleen in de richting van het andere vlak, zodat het zijdelings op zijn plek blijft. Het andere onderdeel blijft waar het is, en één keer Ongedaan maken draait alles terug.

![Het paneel Vlakken uitlijnen: het onderdeel dat beweegt is gekozen, een vlak van het andere onderdeel komt daarna, dan vlak tegen vlak of gelijk, en een optionele tussenruimte.](shot:mate-faces)

**Een exacte hoek tussen twee vlakken:** {{ui:editor.tool.mateFaces}} laat de vlakken evenwijdig; voor een hoek ertussen is er geen eigen gereedschap, maar zo kom je er. Breng eerst de vlakken samen met {{ui:editor.tool.mateFaces}}, zodat ze evenwijdig liggen. Zet dan het draaipunt op de rand waar ze elkaar ontmoeten ({{ui:editor.tool.rotationPivot}}, klik de rand of een hoek) en typ de hoek, bijvoorbeeld 15 of 30, in de kaart {{ui:inspector.rotation}} van het onderdeel. Het draait om dat draaipunt. De assen van de kaart zijn de assen van de plaat, dus dit werkt als de rand langs X, Y of Z loopt.

Net zo eenvoudig zijn {{ui:editor.tool.dropToWorkplane}} ([[D]]), dat de selectie op het werkvlak laat zakken, en {{ui:editor.tool.centerOnWorkplane}}.

[[C]] pakt de selectie op, zoals Cruise in Tinkercad: ze volgt de muisaanwijzer en gaat liggen op het vlak van een ander lichaam waar je boven bent, ook op schuine vlakken. Een klik zet haar daar neer, [[Esc]] laat haar waar ze was. Haar onderkant rust dan op het vlak, uitgelijnd op de randen van het vlak zoals een nieuwe vorm dat zou zijn; haar eigen draaiing om haar verticale as houdt ze. Meerdere onderdelen reizen samen en houden hun onderlinge afstand. Boven de lege plaat zet [[C]] een gekanteld onderdeel weer rechtop op het werkvlak.

## Patronen: rij en cirkel

Voor gatenrasters, boutcirkels en getande ringen is er het {{ui:editor.tool.array}}. Selecteer de vormen die vermenigvuldigd moeten worden en klik erop in het lint.

![Het patroon in de modus "Cirkel": de kopieën verschijnen eerst als voorbeeld.](shot:pattern-tool)

- **{{ui:array.mode.row}}:** De selectie wordt op gelijke afstanden herhaald. De rij stapt langs alle drie de assen tegelijk, met {{ui:array.spacingX}}, {{ui:array.spacingY}} en {{ui:array.spacingZ}}: één ervan geeft een rechte rij, twee of drie een diagonale rij of een trap. Een negatieve afstand legt de rij de andere kant op.
- **{{ui:array.mode.circle}}:** De selectie wordt rond een middelpunt verdeeld. Hoeveel kopieën er zijn, stel je in onder {{ui:array.count}}, en de {{ui:array.angle}} is 360° voor een volle cirkel. Kies of de kopieën meedraaien. {{ui:array.rise}} tilt elke kopie iets hoger dan de vorige (een schroef of een oplopende spiraal), en {{ui:array.radiusChange}} zet haar verder van het middelpunt af of er dichter bij (een platte spiraal); samen geven ze een kegelvormige spiraal.

Tip: zet eerst met {{ui:editor.tool.rotationPivot}} het draaipunt op een vlak, dan ligt het middelpunt van de cirkel precies daar.

![Het patroon in de modus "Cirkel" met per kopie een stijging en een straalverandering: de kopieën klimmen en worden wijder, als een spiraal.](shot:pattern-spiral)

De kopieën verschijnen eerst als voorbeeld. Pas {{ui:array.apply}} maakt ze aan. Zijn de kopieën gaten, groepeer ze dan daarna met het lichaam waarin ze moeten snijden.

## Gatenpatroon op een vlak

Voor ventilatieopeningen, luidsprekerroosters, mandjes en behuizingen verdeelt het {{ui:holePattern.title}} gaten gelijkmatig over een plat vlak. Je hoeft niet meer één gat te maken, het te herhalen en op de wand te zetten. Selecteer precies één lichaam en klik op {{ui:holePattern.title}} in de groep {{ui:editor.group.modify}} van de werkbalk, naast het patroon. Je kunt ook met rechts op het lichaam klikken, of het vinden met [[Ctrl]]+[[K]].

1. Klik op een plat vlak van het lichaam. Het hele platte vlak rond je klik telt, niet alleen de driehoek onder de aanwijzer. Een gebogen vlak werkt niet: je krijgt een hint en klikt in plaats daarvan op een plat vlak.
2. Stel in het venster in hoe de gaten eruitzien en liggen:
   - **{{ui:holePattern.form}}:** {{ui:holePattern.form.round}}, {{ui:holePattern.form.square}}, {{ui:holePattern.form.rectangle}}, {{ui:holePattern.form.hexagon}} of {{ui:holePattern.form.slot}}.
   - **Maat:** de {{ui:holePattern.size.diameter}} van een rond gat, de {{ui:holePattern.size.side}} van een vierkant gat, {{ui:holePattern.size.width}} en {{ui:holePattern.size.height}} voor een rechthoek en een sleuf. Bij de zeshoek is de maat de {{ui:holePattern.size.corners}}.
   - **{{ui:holePattern.spacing}}:** de afstand van het midden van het ene gat tot het volgende. Is die kleiner dan de gaten toelaten, dan verhoogt layerling hem tot de kleinst mogelijke waarde, zodat er een wand tussen de gaten blijft.
   - **{{ui:holePattern.wall}}:** dezelfde afstand anders uitgedrukt: de wand die tussen twee naburige gaten overblijft, en dat is de wanddikte in de print. Stel die in en de afstand van midden tot midden volgt, en andersom. Bij zeshoeken, rechthoeken en sleuven meet layerling de kleinste afstand tussen hun randen.
   - **{{ui:holePattern.arrangement}}:** {{ui:holePattern.arrangement.grid}} zet de gaten in rijen en kolommen. {{ui:holePattern.arrangement.staggered}} verschuift elke tweede rij een halve afstand en schuift de rijen dichter op elkaar, zodat elk gat buren op dezelfde afstand heeft - met zeshoeken geeft dat een honingraat.
   - **{{ui:holePattern.margin}}:** de vrije afstand tussen de gaten en de rand van het vlak. Alleen gaten die helemaal binnen het vlak min deze marge liggen, worden gemaakt; wat daarbuiten zou komen, valt weg. De marge geldt ook rond openingen in het vlak.
   - **{{ui:holePattern.depth}}:** {{ui:holePattern.depth.through}} (de standaard) snijdt door de hele wand. Met {{ui:holePattern.depth.custom}} geef je de diepte in millimeters op, bijvoorbeeld voor verdiepingen.
3. De gaten verschijnen meteen als voorbeeld op het vlak en volgen elke waarde. Het venster zegt hoeveel gaten er passen. {{ui:holePattern.repick}} kiest een ander vlak, [[Esc]] sluit het gereedschap, en net als de andere gereedschapsvensters verplaats je het aan zijn titelbalk.
4. Pas {{ui:holePattern.apply}} maakt de gaten.

De gaten zijn gewone gaten, gegroepeerd met het lichaam, net als na {{ui:editor.tool.group}}: er wordt niets vastgebakken. {{ui:editor.tool.ungroup}} heft de groep weer op en maakt elk gat los, zodat je het daarna een voor een kunt verplaatsen, veranderen of verwijderen. Het geheel is één stap voor {{ui:editor.tool.undo}}. Het gereedschap maakt niet meer dan 400 gaten tegelijk; maak de gaten dan groter of de afstand wijder.

Een AI kan hetzelfde via de MCP-brug met `layerling_perforate_face` (zie het hoofdstuk [AI met MCP](chapter:ai-met-mcp)).

## Meerdere onderdelen tegelijk veranderen

Met meerdere onderdelen geselecteerd laat het eigenschappenpaneel rechts zien hoeveel het er zijn en biedt het wat voor ze allemaal samen geldt: {{ui:inspector.solid}} of {{ui:inspector.hole}}, één kleur voor allemaal (een klik op {{ui:inspector.solid}} opent de kleuren) en het slot. Bij een gemengde selectie maakt één klik ze allemaal tot lichamen of allemaal tot gaten. Is een van de onderdelen vergrendeld, dan is alleen het slot te gebruiken. Maten verander je met de grepen, met {{ui:scalePercent.title}} of door een getal in een maatlabel te typen. Bij meerdere onderdelen is het getal de maat van de hele selectie: elk onderdeel groeit mee, de ruimtes ertussen ook, net als wanneer je aan een greep sleept. Lichaam en gat werken ook met een klik met rechts of met de toetsen [[S]] en [[H]].

## Schalen in procenten

Om een of meer onderdelen met hetzelfde deel groter of kleiner te maken, zeg alle onderdelen van een printbestand met 20 %, gebruik je {{ui:scalePercent.title}}. Selecteer de onderdelen, klik er met rechts op en kies {{ui:scalePercent.title}}, of zoek het met [[Ctrl]]+[[K]].

Onder {{ui:scalePercent.percent}} typ je de nieuwe maat als percentage van de huidige: 120 % is een vijfde groter, 50 % half zo groot. Breedte, diepte en hoogte veranderen gelijk, zodat de verhoudingen blijven. De onderkant blijft waar hij is, zodat er niets in de plaat zakt.

Met meerdere onderdelen kies je hoe ze groeien:

- **{{ui:scalePercent.mode.together}}:** De onderdelen groeien rond hun gezamenlijke midden, en de tussenruimtes groeien mee. Het geheel wordt groter alsof het één onderdeel is.
- **{{ui:scalePercent.mode.each}}:** Elk onderdeel groeit waar het staat, en de tussenruimtes blijven gelijk.

Pas {{ui:scalePercent.apply}} verandert het ontwerp, en één stap terug maakt het ongedaan. Met een vergrendeld onderdeel in de selectie gaat het niet open.

## Ongedaan maken

{{ui:editor.tool.undo}} ([[Ctrl]]+[[Z]]) en {{ui:editor.tool.redo}} ([[Ctrl]]+[[Shift]]+[[Z]] of [[Ctrl]]+[[Y]]) stappen door je geschiedenis. Hoeveel stappen er met het opgeslagen ontwerp meegaan, stel je in de instellingen in onder {{ui:workspace.history}}.

## Terugkijken: de geschiedenisweergave

{{ui:editor.tool.history}}, naast ongedaan maken en opnieuw, opent een weergave van je geschiedenis zonder iets te veranderen. Het werkgebied toont het ontwerp zoals het was, en een schuifregelaar onderaan loopt door elke stap van ongedaan maken: helemaal rechts is de huidige stand, elke stap naar links is één keer ongedaan maken eerder, en standen die je ongedaan hebt gemaakt staan rechts van de huidige. De pijltoetsen stappen door de standen, [[Esc]] gaat terug naar de huidige stand. Je kunt de weergave intussen draaien en zoomen, maar er kan niets geselecteerd of verplaatst worden; het ontwerp zelf blijft precies zoals het is. Zit de balk ergens voor, sleep hem dan aan zijn titelbalk weg; een dubbelklik erop haalt hem terug.

Twee dingen kun je uit een eerdere stand meenemen. {{ui:historyView.createProject}} zet die stand in een nieuw ontwerp in het overzicht, genoemd naar dit ontwerp met de tijd van die stand tussen haakjes - een ontwerp dat is opgeslagen voordat layerling tijden bijhield, krijgt in plaats daarvan "kopie" - en met de geschiedenis tot dat punt, zodat ongedaan maken daar blijft werken. {{ui:historyView.export}} opent de gewone export met die stand als ontwerp, zodat je hem kunt opslaan als STL, 3MF, STEP, een afbeelding of een LYL-bestand met de geschiedenis tot die stand.

{{ui:historyView.delete}} staat alleen linksonder in de balk. Na een vraag verwijdert het elke eerdere stap voorgoed: het ontwerp houdt de stand die het nu heeft (niet de getoonde), Ongedaan maken heeft niets meer om naar terug te gaan en een bestand dat je daarna opslaat, bevat geen geschiedenis. Gebruik het om een ontwerp te delen zonder zijn verleden, of om de stappen van ongedaan maken opnieuw te beginnen. Het kan niet ongedaan worden gemaakt; om een bestand te delen zonder je eigen ontwerp aan te raken, kies je in plaats daarvan {{ui:export.historyNone}} bij het exporteren.
