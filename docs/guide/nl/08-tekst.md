---
title: Tekst en gebogen belettering
summary: Verhoogde of gegraveerde belettering in zeven lettertypen of een eigen lettertype, en desgewenst langs een cirkelboog, zoals op een munt, een deksel of een ring.
---

## Tekst toevoegen

Kies {{ui:shape.text}} in de vormenbibliotheek en plaats de tekst. Typ rechts in het veld {{ui:prop.text}} wat er moet staan. De instellingen daaronder:

- **{{ui:prop.font}}:** Er zijn zeven lettertypen: Multilanguage, Sans, Serif, Script, Monospace, Rounded en Stencil (letters van rechte lijnen). Nieuwe tekst begint in Sans. Letters met accenten zoals ä, ö, ü, é en het €-teken zitten in elk lettertype. Je eigen lettertypen komen daar nog bij, zie [Je eigen lettertypen](#je-eigen-lettertypen) hieronder.
- **{{ui:nameTag.letterSize}}:** Hoe groot de letters zijn, van bovenaf gezien; {{ui:prop.height}} bepaalt hoe dik ze zijn.
- **{{ui:prop.height}}:** Hoe ver de belettering boven het oppervlak uitsteekt.
- **{{ui:prop.bevel}}:** Rondt de randen van de letters af, zodat ze zachter ogen. Met {{ui:prop.segments}} bepaal je in hoeveel stappen.
- **Grootte:** Lengte en breedte van de regel stel je in zoals bij elke vorm. Sleep aan de grepen of typ de maten in.

Tekst is eerst één lichaam. Wil je de letters afzonderlijk bewerken, klik dan op {{ui:inspector.separateParts}}. Dan is elke letter een eigen vorm.

Ook de randen van tekst kun je afschuinen of afronden, recht of gebogen, zie [Randen breken en lichamen uithollen](chapter:randen-en-uithollen). Gebruik kleine maten zoals 0,2 tot 0,5 mm, want de streken van de letters zijn smal.

## Je eigen lettertypen

Naast de zeven ingebouwde lettertypen kun je elk eigen lettertype gebruiken: een lettertypebestand van je computer of, in Chrome en Edge, een lettertype dat op je computer is geïnstalleerd. Kies {{ui:font.manage}} onderaan {{ui:prop.font}}. Het venster {{ui:font.title}} opent.

- **{{ui:font.addFile}}** neemt een TrueType-bestand (`.ttf`), een OpenType-bestand (`.otf`) of een WOFF-bestand (`.woff`). Je kunt het bestand ook gewoon in het venster slepen.
- **Op Windows** staan de geïnstalleerde lettertypen in de map Fonts (`C:\Windows\Fonts`). Het bestandsvenster van de browser verbergt die map. Open hem in plaats daarvan in de Verkenner en sleep het lettertype naar het venster {{ui:font.title}}. Lettertypen die alleen voor jou zijn geïnstalleerd, staan in `%LOCALAPPDATA%\Microsoft\Windows\Fonts`, en die map toont het bestandsvenster wel. Op een Mac staan lettertypen in `/Library/Fonts` en `~/Library/Fonts`.
- **{{ui:font.fromSystem}}** toont de lettertypen die op je computer zijn geïnstalleerd. De eerste keer vraagt de browser of layerling ze mag lezen. Met het zoekveld vind je snel een lettertype, een klik neemt het over.

Is er een tekst geselecteerd, dan krijgt die meteen het nieuwe lettertype. Anders verschijnt het lettertype onder {{ui:prop.font}} in de groep {{ui:font.customGroup}}, en {{ui:font.use}} in het venster zet het op de geselecteerde teksten. Je eigen lettertypen werken net als de ingebouwde: tekst op een cirkelboog, afschuiningen en afrondingen op de randen en de STEP-export werken allemaal hetzelfde. Letters die een lettertype mist, worden uit Sans genomen.

### Arabisch en Hebreeuws

Arabisch, Perzisch, Urdu en Hebreeuws worden van rechts naar links geschreven: de eerste letter staat rechts, en in een gemengde tekst zoals "Naam عربي" loopt alleen het Arabische woord achterstevoren, cijfers blijven zoals gewoonlijk. Arabische letters verbinden zich met hun buren zoals het schrift dat vraagt, en lam-alef wordt een ligatuur. Daarvoor is een lettertype nodig dat deze letters heeft; de ingebouwde hebben ze niet. Voeg een eigen lettertype toe, zoals Arial, Tahoma of Segoe UI op Windows, of een gratis lettertype zoals Noto Naskh Arabic, Noto Sans Arabic of Amiri. Klinkertekens staan op de letter waar ze bij horen. Tekst op een cirkelboog, contour, silhouet, lagen en naambordjes werken ermee zoals met elke andere tekst.

### Wat werkt in welke browser

| Browser | Lettertypebestand kiezen | Lettertype van de computer |
| --- | --- | --- |
| Chrome en Edge op een computer, ook de geïnstalleerde layerling-app | ja | ja, nadat de browser het vraagt |
| Firefox | ja | nee |
| Safari op een Mac | ja | nee |
| Tablet en telefoon | ja, uit de bestanden van het apparaat | nee |

Webpagina's mogen de geïnstalleerde lettertypen niet zomaar lezen. Alleen Chrome en Edge hebben daar een toestemming voor, en alleen op beveiligde pagina's, via `https` zoals op layerling.com. Draait layerling via `http`, bijvoorbeeld op je eigen server of als Docker-installatie in je thuisnetwerk, dan ontbreekt {{ui:font.fromSystem}}; sleep het lettertype dan vanuit de Verkenner. In de andere browsers kies je het lettertypebestand uit de map met lettertypen, met hetzelfde resultaat. Heb je de vraag in Chrome of Edge geweigerd, sta het dan opnieuw toe in de site-instellingen, achter het slotje links van het adres.

layerling kan geen WOFF2-bestanden lezen (er is bijna altijd een TTF- of OTF-versie), geen lettertypecollecties (`.ttc`, meerdere lettertypen in één bestand) en geen lettertypen met kleuremoji. Van heel grote lettertypen, zoals Chinese, neemt layerling de eerste 8000 tekens. Een variabel lettertype wordt in zijn standaardinstelling gelezen, meestal het normale gewicht.

Sommige lettertypen, vooral schrijfletters en variabele lettertypen, tekenen een letter uit streken die elkaar overlappen. layerling voegt die bij het lezen van het lettertype samen tot één schone contour, zodat het lichaam printbaar blijft. Zulke letters bestaan dan uit heel korte rechte stukjes in plaats van bogen; dat zie je niet.

### Waar de lettertypen bewaard worden

Een eigen lettertype blijft **in deze browser op deze computer**. Een andere browser of een andere computer kent het niet, totdat je het daar ook toevoegt. Als je de sitegegevens van de browser wist, verdwijnen de lettertypen ook. In het venster {{ui:font.title}} verwijdert de prullenbak een lettertype uit de browser. Je ontwerpen verliezen daar niets door, zoals de volgende paragraaf laat zien.

### Ontwerpen met een eigen lettertype doorgeven

Een ontwerp slaat **niet het lettertypebestand op**, alleen de contouren van de letters die zijn teksten gebruiken, ook die uit eerdere stappen in de geschiedenis. Staat er in een tekst "Hallo", dan reizen alleen H, a, l en o mee. Dat geldt voor elke manier waarop een ontwerp wordt opgeslagen: in de browser, op je eigen server, als `.lyl`-bestand en in {{ui:myShapes.title}}.

Dus:

- **Het ontwerp opent overal correct**, ook op een computer zonder het lettertype. De teksten zien er hetzelfde uit en kunnen worden verplaatst, gedraaid, geschaald en afgerond.
- **Nieuwe letters hebben het lettertype nodig.** Typt iemand zonder het lettertype een letter die het ontwerp niet heeft meegebracht, dan tekent layerling die uit Sans. Onder {{ui:prop.font}} is het lettertype dan gemarkeerd als {{ui:font.fromDesign}}. Voeg je het lettertypebestand toe, dan komt elke letter terug.
- **Exports bevatten alleen geometrie.** STL, 3MF, OBJ, STEP en SVG bevatten lichamen en contouren, geen lettertype.
- **Oudere layerling-versies** kennen eigen lettertypen nog niet en tekenen zulke teksten in Multilanguage.

**Licenties:** Lettertypen zijn auteursrechtelijk beschermd, en hun licentie bepaalt wat je ermee mag. De ingesloten lettercontouren zijn wat PDF-bestanden van een lettertype meenemen, en de meeste licenties staan dat toe. Sommige commerciële lettertypen verbieden echter zelfs het doorgeven van losse letters. Controleer de licentie van het lettertype voordat je een ontwerp met een eigen lettertype doorgeeft of publiceert. Gratis lettertypen zoals die van Google Fonts (meestal onder de SIL Open Font License) kun je zonder zorgen doorgeven. Voor een geprint onderdeel of een geëxporteerde STL maakt het niet uit: die bevatten geen lettertype meer, alleen geometrie.

## Verhoogd of gegraveerd

- **Verhoogd:** Zet de tekst op het oppervlak en groepeer hem met het lichaam. Hij groeit eruit als reliëf.
- **Gegraveerd:** Zet de tekst op {{ui:inspector.hole}}, laat hem een stukje in het oppervlak steken en groepeer hem met het lichaam. De letters zijn dan gegraveerd.

Voor belettering op een zijvlak zet je eerst het werkvlak op dat vlak, zie [Weergave en werkvlak](chapter:weergave-en-werkvlak).

## Contour, silhouet en breder

Een tekst hoeft niet uit gevulde letters te bestaan. {{ui:prop.textFill}} in de eigenschappen biedt dezelfde keuze als Tinkercad:

- **{{ui:prop.textFill.filled}}:** de letters zoals ze zijn.
- **{{ui:prop.textFill.outline}}:** een lijn langs de contour van de letters, half binnen en half buiten.
- **{{ui:prop.textFill.outer}}:** een lijn rond de buitenkant van de letters.
- **{{ui:prop.textFill.inner}}:** een lijn aan de binnenkant van de letters.

Kies je een lijn, dan verschijnen er direct onder de lijst twee instellingen: {{ui:prop.sketchLineWidth}} bepaalt hoe dik de lijn is, {{ui:sketch.strokeJoin}} hoe hij om de hoeken gaat ({{ui:sketch.strokeJoin.round}}, {{ui:sketch.strokeJoin.bevel}} of {{ui:sketch.strokeJoin.miter}}). De minder gebruikte instellingen staan onder {{ui:inspector.more}}: {{ui:prop.sketchSilhouette}} laat de gaten in O, A of e weg, en {{ui:prop.textWider}} houdt de letters gevuld en maakt ze rondom een lijnbreedte dikker; letters die elkaar raken, groeien samen tot één stuk.

Met een lijn aan de buitenkant, een gecentreerde lijn of "Breder" groeit het kader van de tekst, terwijl de letters hun grootte houden. {{ui:prop.bevel}} en {{ui:prop.segments}} zijn er alleen voor gevulde letters.

## Lagen en naambordjes

Een naambordje voor een meerkleurenprint is een tekst in lagen: de letters bovenop, daaronder dezelfde tekst iets breder in een tweede kleur, onderaan een plaat zonder gaten in een derde. layerling maakt het met één klik:

- **Een nieuw naambordje:** kies {{ui:shape.nameTag}} in de vormenbibliotheek en plaats het. Er staat "Name" op in witte letters op een rode rand en een donkere plaat.
- **Vanuit een tekst:** selecteer de tekst en klik op {{ui:nameTag.makeLayers}} bovenaan zijn instellingen.

Alle instellingen van het bordje staan in de kaart {{ui:nameTag.title}}, bovenaan de instellingen:

- **{{ui:prop.text}}** en **{{ui:prop.font}}**, ook je eigen lettertypen. Het bordje groeit mee met de woorden.
- **{{ui:nameTag.letterSize}}:** hoe hoog de hoofdletters zijn, in mm. Alle lagen volgen en blijven op één lijn.
- **{{ui:nameTag.layers}}:** één rij per laag, van boven naar beneden. Elke rij heeft de kleur (klik op het gekleurde vierkantje), hoeveel breder de laag is dan de letters, de hoogte en {{ui:nameTag.noHoles}}, dat de gaten in letters zoals O en A opvult. {{ui:nameTag.corners}} bepaalt hoe een bredere laag om de hoeken van de letters gaat: {{ui:nameTag.corner.round}}, {{ui:nameTag.corner.bevel}} of {{ui:nameTag.corner.miter}}. De bovenste rij zijn de letters zelf. **+** voegt onderaan een laag toe, **–** haalt de onderste laag weg. Een bordje heeft twee tot zes lagen.
- **{{ui:nameTag.keyring}}:** geeft de onderste laag een rechte lip met een rond uiteinde en een gat voor een sleutelring; de lip groeit mee met het gat. Een gat van 3 mm, de standaard, geeft een lip van 6,5 mm breed die 6,75 mm uitsteekt, met de rand van het gat 2 mm van de rand van de onderste laag. Kies de {{ui:nameTag.keyringDiameter}} en de {{ui:nameTag.keyringSide}}: {{ui:nameTag.side.left}}, {{ui:nameTag.side.right}} of {{ui:nameTag.side.top}}. Het gat gaat door elke laag die het raakt, en de lip schuift mee als je de woorden, de lettergrootte of het lettertype verandert.
- **{{ui:nameTag.letterEdge}}:** rondt de bovenrand van de letters op de bovenste laag af of schuint hem af, zoals een geprint bordje wordt afgewerkt: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} of {{ui:nameTag.edge.chamfer}}, met de {{ui:nameTag.letterEdgeSize}} (0,4 mm om mee te beginnen, hooguit zo hoog als de laag). Het werkt voor elk lettertype en elk woord. De rand hoort bij de mesh van de letters, dus het randgereedschap behandelt zo'n tekst als mesh, en dat is voor zo'n fijne tekst zwaar; kies de rand daarom hier.

Elke wijziging is meteen te zien. Het bordje is een bundel: het beweegt als één geheel, en elke laag blijft een eigen lichaam in een eigen kleur, zoals een slicer ze nodig heeft voor een meerkleurenprint. Om de randen van één laag af te ronden of af te schuinen, klik je op {{ui:group.editBundle}} en kies je de laag, zie [Randen breken en lichamen uithollen](chapter:randen-en-uithollen).

### Veel naambordjes tegelijk

Typ de namen in de {{ui:textLayers.names}}, één per regel, tot honderd. De knop eronder zegt hoeveel bordjes hij maakt, bijvoorbeeld "12 naambordjes maken". Elk bordje krijgt dezelfde lagen, lettergrootte en sleutelringgat en is een eigen object; ze worden in rijen onder het eerste neergelegd, 5 mm uit elkaar. Een gewone tekst heeft de namenlijst ook, verderop in zijn instellingen.

## Icoonbordjes

Een icoonbordje is hetzelfde bordje met een SVG-icoon in plaats van letters: een hartje, een wolk, het logo van een club. Het icoon bovenop, daaronder dezelfde contour iets breder in een tweede kleur, onderaan een plaat zonder gaten.

- **Een nieuw icoonbordje:** kies {{ui:shape.iconTag}} in de vormenbibliotheek. Er opent een klein venster: klik op {{ui:iconTag.browse}}, kies een SVG-bestand, controleer de afbeelding, typ de {{ui:iconTag.width}} van het icoon en klik op {{ui:iconTag.ok}}. Het bordje staat midden op de plaat, in dezelfde lagen als een nieuw naambordje.
- **Vanuit een schetslichaam:** een geïmporteerde SVG, of een schets die je zelf hebt getekend, heeft {{ui:nameTag.makeLayers}} bovenaan zijn instellingen.

De kaart {{ui:iconTag.title}} bovenaan de instellingen bevat:

- **{{ui:iconTag.replace}}:** zet het icoon uit een andere SVG op het bordje; de lagen en de breedte blijven zoals ze zijn.
- **{{ui:iconTag.iconWidth}}:** hoe breed het icoon bovenop is, in mm. Alle lagen volgen en blijven op één lijn.
- **{{ui:nameTag.layers}}:** de rijen zoals bij een naambordje - kleur, hoeveel breder, {{ui:nameTag.corners}}, hoogte en {{ui:nameTag.noHoles}}, **+** en **–**, twee tot zes lagen. De bovenste rij is het icoon zelf.
- **{{ui:iconTag.count}}:** hoeveel bordjes je wilt, 1 tot 100. {{ui:iconTag.fill}} rekent het uit op basis van de plaat van de printer die in de instellingen is gekozen, voor kleine logo's een volle plaat. De knop eronder maakt ze, 5 mm uit elkaar, neergelegd op het midden van de plaat; het eerste is het bordje zelf.

De SVG heeft gesloten contouren nodig; een tekening van alleen open lijnen kan geen bordje worden. Een schetslichaam waarvan de vulling een lijn is, houdt die: het vlak van die lijn is het icoon.

## Tekst op een cirkelboog

Moet de belettering niet recht lopen, maar de rand van een munt, een deksel of een ring volgen? Daarvoor is er de instelling {{ui:prop.textCurved}}.

![Tekst volgt een cirkel. Alle letters staan op één gemeenschappelijke lijn.](shot:curved-text)

Zodra je die aanzet, loopt de tekst langs de cirkel. Alle letters staan op dezelfde basislijn, net zo gelijkmatig als bij gewone tekst. Er zijn vier instellingen:

- **{{ui:prop.textRadius}}** (5 tot 500 mm): De straal van de cirkel waarover de basislijn van de letters loopt.
- **{{ui:nameTag.letterSize}}:** Hoe hoog de letters zijn. Dit hangt niet meer af van de breedte van de vorm.
- **{{ui:prop.textInward}}:** Verplaatst de tekst van de bovenkant van de cirkel naar de onderkant. De letters wijzen dan met hun kop naar het middelpunt.
- **{{ui:prop.textFlipped}}:** Draait alleen de letters om, zodat je ze van de andere kant kunt lezen. De tekst blijft op zijn plaats op de cirkel.

**Het middelpunt van de cirkel is het midden van de vorm.** Daarom werkt uitlijnen zoals gewoonlijk: centreer je de tekst met een cilinder of ring, dan zit hij er precies concentrisch op. Trek je aan een greep, dan groeien straal en lettergrootte samen, zodat de belettering niet vervormt.

> **Tip:** Bovenaan de cirkel staan de letters buiten de basislijn; met {{ui:prop.textInward}} staan ze binnen, met hun kop naar het middelpunt. Wil je dat de belettering op een schijf past, dan moeten de straal plus de lettergrootte kleiner zijn dan de straal van de schijf.
