---
title: Vue et plan de travail
summary: Déplacez-vous dans la scène, regardez droit devant et placez de nouvelles formes sur n'importe quelle surface de votre choix.
---

## Se déplacer

Avec la souris :

| Que faites-vous | Que se passe-t-il |
| --- | --- |
| faites glisser avec le bouton droit | faire pivoter la vue |
| cliquez sur le bouton droit | sur un corps, un menu avec les commandes les plus utilisées : dupliquer, percer ou solide, grouper, masquer, verrouiller, supprimer et plus encore ; sur un espace vide Coller et tout sélectionner |
| faites glisser avec le bouton du milieu | déplacer la vue |
| molette de la souris | zoomer et dézoomer |
| maintenez [[Ctrl]] et faites glisser avec le bouton gauche | déplace également la vue |

La vitesse de zoom de la molette se règle avec {{ui:workspace.zoomSpeed}} dans les paramètres, sous {{ui:workspace.appearance}} : un curseur de 1 à 10, réglé sur 5 au départ.

Sur une tablette ou un téléphone, deux doigts zooment (écartent et pincent) et déplacent la vue (glissent ensemble). Un doigt travaille sur le design, tout comme le bouton gauche de la souris. Pour faire pivoter avec un doigt, activez {{ui:camera.touchRotate}} dans la barre de la caméra. Ce commutateur ne s'affiche que sur les appareils dotés d'un écran tactile.

Une tablette graphique avec stylet se comporte comme une souris : la pointe est le bouton gauche, le bouton cylindrique du stylet celui de droite, pour tourner la vue et pour le menu. Les raccourcis clavier de la tablette peuvent être définis dans son pilote sur les [raccourcis clavier] de Layerling (chapter:shortcuts).

### Le cube de visualisation

Le cube en haut à gauche indique où vous regardez. Un clic sur l'un de ses côtés permet d'accéder à la vue droite du haut, du bas, de l'avant, de l'arrière, de la gauche ou de la droite. Un clic sur un coin du cube regarde le modèle en diagonale depuis ce coin, et un clic près d'un bord regarde depuis ce bord, entre deux côtés ; le spot s'allume lorsque le pointeur est dessus. Les touches numériques [[1]] à [[6]] donnent également les vues droites. Maintenez [[Shift]] avec eux et la vue effectue également un zoom sur la sélection, comme le fait [[Shift]]+[[F]].

Faites glisser le cube pour inverser la vue, tout comme en le faisant glisser avec le bouton droit de la souris. Sans rien sélectionné, les touches fléchées font également pivoter la vue : 15° en appuyant, 90° avec [[Shift]]. Ils tournent le modèle dans la direction où ils pointent - [[→]] tourne son avant vers la droite, [[↑]] incline son avant vers le haut. Si quelque chose est sélectionné, les flèches le déplacent ; cliquez d'abord sur un espace vide pour faire tourner la vue. Sur un écran tactile, cela fonctionne avec un seul doigt, sans activer {{ui:camera.touchRotate}}.

### La barre de caméra

Sur le bord gauche se trouve une barre étroite. Du haut :

- {{ui:camera.home}} ramène toute la scène en vue. La clé est [[F]] ou [[Home]].
- {{ui:camera.focusSelection}} effectue un zoom sur la sélection ([[Shift]]+[[F]]).
- {{ui:camera.zoomIn}} et {{ui:camera.zoomOut}} zooment pas à pas, tout comme les touches [[+]] et [[−]].
- {{ui:camera.orthographic}} passe à une vue plate dans laquelle les bords parallèles restent parallèles. Pour mesurer et aligner les bords, c'est souvent plus confortable que la vue en perspective. [[O]] bascule d'avant en arrière et un deuxième clic revient.
- {{ui:camera.hideWorkplane}} (l'œil au-dessus d'une grille) cache la plaque avec sa grille, vous pouvez donc regarder le dessous d'un dessin par le bas. Seule la vue change : de nouvelles formes atterrissent toujours sur le plan de travail. Un deuxième clic l'affiche à nouveau.
- {{ui:camera.placeWorkplane}}, le mètre ruban et l'équerre d'encadrement sont des outils à part entière, abordés ci-dessous et dans [Mesures et notes] (chapter:measuring-and-notes).

La petite flèche tout en haut de la barre la cache si elle gêne.

Un design s'ouvre comme vous l'avez laissé : l'angle, le zoom et la position de la vue sont conservés avec lui dans ce navigateur, de sorte que vous continuez là où vous vous êtes arrêté, même après être retourné à Home ou avoir fermé la page. Un fichier enregistré (.lyl) emporte la vue, elle s'y ouvre donc également ailleurs. La vue ne fait pas partie de l'historique d'annulation.

## Regarder à l'intérieur : la vue en coupe

{{ui:camera.sectionView}}, le dernier bouton de la barre (l'outil de coupe), coupe la vue ouverte le long d'un plan afin que vous puissiez vérifier les murs, les cavités et les pièces qui s'emboîtent les unes dans les autres. Rien n'est coupé pour vrai : le design, ses fichiers et chaque export restent entiers.

- Choisissez l'axe sur lequel se situe le plan : X (largeur), Y (profondeur) ou Z (hauteur), comme dans les champs de position. L'avion commence au milieu de votre dessin.
- {{ui:camera.sectionCoarse}} déplace le plan sur tout le dessin, {{ui:camera.sectionFine}} le déplace un peu de chaque côté de son emplacement, sur des dixièmes de millimètre. Vous pouvez également saisir le poste.
- Le bouton à côté des axes montre l'autre côté de la coupe, {{ui:camera.sectionReset}} remet le plan au milieu, et {{ui:camera.sectionShowPlane}} masque le plan bleu.
- Vous pouvez cliquer et sélectionner ce que la coupe laisse ouverte, parois intérieures incluses.
- {{ui:camera.sectionWorkplane}} met le plan de travail sur la coupe. Il repose sur le plan de la coupe et fait face à l'extérieur du corps qui reste, comme le visage qu'une coupure laisse. Si vous passez ensuite à l'esquisse, elle commence exactement là et le contour pâle montre la coupe, que vous pouvez dessiner et sur laquelle vous pouvez vous accrocher. C'est ainsi que vous dessinez un couvercle qui s'adapte à la cavité que vous avez ouverte avec la section, par exemple. Le bouton à côté des axes choisit quel côté reste, et avec lui, dans quelle direction le plan de travail est orienté. Vous remettez le plan de travail sur la plaque de base comme d'habitude.
- {{ui:camera.sectionMeasure}} mesure directement sur la coupe : le contour apparaît en bleu, et deux clics dessus donnent la distance, plus ses parties selon les deux axes du plan. Les deux points s'accrochent au contour, les coins en premier. Lorsque le deuxième clic atterrit n'importe où sur le mur opposé, il s'aligne sur le premier point - vous pouvez ainsi lire l'épaisseur du mur, les espaces et le dégagement sans viser exactement. Un troisième clic démarre la mesure suivante, [[Esc]] termine la mesure. Le déplacement de l'avion efface la mesure.
- {{ui:camera.sectionExportSvg}} enregistre les contours sur le plan de coupe au format SVG au 1:1, pour un laser, un traceur, un gabarit ou un joint. Une coupe en X est vue de droite, une coupe en Y de face, une coupe en Z de dessus. Comme lors de l'exportation, seuls les corps visibles entrent, les trous sont déjà supprimés et les corps de la même couleur sont réunis en un seul contour. Chaque couleur conserve son propre chemin sans remplissage, de sorte que le logiciel laser les sépare sous forme de calques.

Le panneau s'accroche à son bouton. S'il recouvre quelque chose, faites-le glisser par sa barre de titre n'importe où sur le plan de travail ; il y ouvrira la prochaine fois aussi. Double-cliquez sur la barre de titre ou déposez-la sur le bouton pour la remettre en place.

[[Esc]] ferme le panneau ; la coupe reste jusqu'à ce que vous l'éteigniez ou reveniez à l'aperçu du design. Lorsqu'il est allumé, son bouton reste en surbrillance. Tout ce que vous placez sur le côté coupé ne s'affiche qu'une fois que vous avez désactivé la coupure.

## Le plan de travail

Les nouvelles formes s'alignent sur le plan de travail. Au début, c'est la plaque de base avec la grille. Mais vous pouvez le poser sur n'importe quelle surface, pour placer quelque chose sur un côté ou une face inclinée.

1. Appuyez sur [[W]] ou cliquez sur {{ui:camera.placeWorkplane}}.
2. Déplacez la souris sur une face d'un corps. Il s'allume.
3. Un clic y place le plan de travail. Tout ce que vous ajoutez repose désormais sur ce visage.

Cliquez plutôt sur la plaque vide et le plan de travail repose à plat à l'endroit sur lequel vous avez cliqué, sur la grille d'accrochage. De nouvelles formes et une esquisse terminée, également tournée, apparaissent alors là plutôt qu'au milieu de la planche. Alors que le plan de travail repose ainsi à plat sur la plaque, la plaque ne montre que son contour : deux grilles dans le même plan formeraient un motif scintillant.

Sur une face, l'origine du plan de travail s'accroche autrement à la grille. Cliquez près d’un coin du visage et il se place exactement sur ce coin. Près d'un bord, il repose sur le bord et la grille s'aligne avec lui ; c’est ainsi que l’on choisit volontairement l’angle de la grille. Sans coin ni bord, la grille sur une face couchée est parallèle au corps, donc sur une boîte tournée, elle est tournée avec lui.

Un clic à côté de la plaque ou [[Esc]] ramène le plan de travail à la plaque de base. {{ui:camera.resetWorkplane}} est encore plus rapide : le bouton avec la flèche vers le bas se trouve dans la barre de la caméra sous l'œil tandis que le plan de travail se trouve sur un visage. [[Shift]]+[[W]] le place directement sur la face actuellement sélectionnée. Si vous maintenez [[Shift]] tout en cliquant, le plan pointe dans l'autre sens.

Lorsqu'un plan de travail repose sur une face, un œil apparaît à côté de {{ui:camera.placeWorkplane}}. Il masque le plan de travail sans le faire tomber, pour une vision claire du design : de nouvelles formes se posent toujours sur cette face, et la rotation tourne toujours autour d'elle. Un clic sur l'œil le montre à nouveau, tout comme la définition d'un nouveau plan de travail.

## Grille et capture

La grille montre la taille de la plaque. En bas à droite se trouve l'**étape d'accrochage** : déplacer et mettre à l'échelle l'accrochage par pas de cette taille, par exemple 1 mm. Réduisez-le pour un travail fin et plus grand pour un arrangement grossier. {{ui:editor.tool.snapToGrid}} dans le ruban déplace ensuite les formes sélectionnées sur le croisement de grille le plus proche. Lors du déplacement, les formes s'alignent également sur d'autres formes, voir [Sélection et organisation] (chapter:select-and-arrange).

Sous {{ui:workspace.measurement}} dans les paramètres, vous définissez {{ui:workspace.units}}. Avec {{ui:units.imperial}}, la superposition affiche chaque mesure en pouces, sur la forme, dans le panneau des propriétés, sur le ruban à mesurer et sur la règle. La grille d'accrochage propose alors des pas de 1/64 à 1 pouce, et la grille sur la plaque est dessinée en pouces (1/8 à 1 pouce, 1/4 de pouce par défaut) avec une ligne plus forte sur chaque pouce entier. Sous {{ui:workspace.inchFormat}}, vous choisissez si les pouces apparaissent sous forme de fractions comme dans Tinkercad (1 5/8, arrondi à 1/64 de pouce) ou sous forme de décimales (1,625) avec autant de décimales que défini sous {{ui:workspace.accuracy}}. Vous pouvez taper l'un ou l'autre, "1 5/8" inclus.

Sous {{ui:workspace.customSnapGrids}}, au même endroit, vous ajoutez vos propres étapes d'accrochage : un nom et une taille en millimètres, par exemple "Pin pitch 2,54 mm" pour l'espacement des puces DIP, des embases à broches et des trous de carte perforée, ou "MX Key Unit" avec 19,05 mm pour l'espacement des touches du clavier. Le menu Snap Step propose ensuite cette mesure entière, divisée en deux et en quatre (1 ×, ½ × et ¼ ×), de sorte que les formes peuvent être déplacées d'un pas, d'un demi-pas ou d'un quart de pas. Les étapes personnalisées sont conservées avec la conception et accompagnent {{ui:workspace.makeDefault}}.

La taille, la largeur de la grille et la couleur de la plaque sont modifiées dans les paramètres (la roue dentée dans le ruban) : les zones sont {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} et {{ui:workspace.history}}. Sous {{ui:workspace.appearance}}, vous trouvez des commutateurs tels que {{ui:workspace.startInPerspective}} et {{ui:workspace.showShadows}}, sous {{ui:workspace.workplane}} {{ui:workspace.showGrid}}. Les couleurs de la zone de travail sont également définies sous {{ui:workspace.appearance}} : {{ui:workspace.backgroundColor}} et {{ui:workspace.surfaceColor}} pour le thème clair (les thèmes sombres gardent les leurs), à côté de la couleur de la grille sous {{ui:workspace.workplane}}. Là, vous choisissez également si la ligne de grille la plus sombre apparaît tous les 5 ou tous les 10 pas de grille ({{ui:workspace.gridMajorEvery}}) et lui donnez une couleur qui lui est propre avec {{ui:workspace.gridMajorColor}} ; la croix centrale et la bordure de la plaque le prennent également. Chaque ligne de la grille s'élargit lorsque vous effectuez un zoom avant, comme dans Tinkercad, et reste visible lorsque vous effectuez un zoom arrière ; si c'est trop pour vous, désactivez {{ui:workspace.gridLinesGrow}} et les lignes restent larges d'un pixel à chaque zoom, comme dans l'esquisse. Dans le champ de couleur, [[Enter]] prend une valeur hexadécimale saisie. {{ui:workspace.edgeLines}} dessine un contour sur chaque corps, dans la couleur de {{ui:workspace.edgeColor}} (noir au départ, comme dans Tinkercad) : cela aide lorsque les couleurs sombres se croisent. Cette option est désactivée par défaut et les très grands maillages importés sont laissés de côté. La grille passe toujours par l'origine, de sorte que les lignes les plus fortes se trouvent sur les axes, quelles que soient les mesures de la plaque.

{{ui:workspace.showAxes}} (activé par défaut) dessine trois flèches dans le coin arrière gauche de la plaque : **X** en rouge vers la droite, **Y** en vert vers l'arrière et **Z** en bleu vers le haut, comme le comptent les champs de position. C'est la règle de droite que Tinkercad, les programmes de CAO et les slicers utilisent également. Avec le plan de travail sur une face, ils le suivent. Éteignez-les ici s'ils vous gênent.

Deux curseurs sous {{ui:workspace.appearance}} définissent la manière dont les corps sont éclairés. {{ui:workspace.shadowStrength}} indique à quel point les ombres portées sont sombres, et {{ui:workspace.shadeContrast}} déplace la lumière de la lumière ambiante uniforme vers la lumière principale : vers "punch", les côtés ombragés deviennent plus sombres et les ombres apparaissent davantage, vers "doux", tout devient plus plat. Dans la partie supérieure, le contraste devient très fort, donc les côtés ombrés et les ombres deviennent très sombres. {{ui:workspace.shadowSoftness}} rend les bords des ombres doux au lieu d'être nets. {{ui:workspace.lightAzimuth}} fait tourner le feu principal autour de la plaque (0° depuis l'avant, 90° depuis la droite), et {{ui:workspace.lightElevation}} le soulève ; à 90°, il se dresse droit au-dessus de la plaque comme dans Tinkercad, et les ombres tombent juste sous les corps. {{ui:workspace.lightReset}} remet tout en place. {{ui:workspace.classicLook}} définit la zone de travail comme le montre Tinkercad : fond blanc, une grille millimétrique bleu pâle avec une ligne plus foncée tous les centimètres, des lignes de bord noires, de la lumière d'en haut avec des ombres douces. Chaque valeur peut encore être modifiée individuellement par la suite. Tous commencent comme la superposition a toujours été, et ce qui vous convient dépend de votre moniteur. La vue d'esquisse a ses propres couleurs : {{ui:workspace.sketchBackground}} pour la fenêtre autour de la feuille, {{ui:workspace.sketchPlateColor}} pour la feuille sous la grille et {{ui:workspace.sketchGridColor}}, le tout pour le thème clair. {{ui:workspace.sketchMatch}} reprend les trois couleurs de la zone de travail en un clic.

![Les paramètres sous Apparence : couleurs d'arrière-plan et du plan de travail pour le thème de lumière et le commutateur pour les lignes de bord sur tous les corps.](shot:settings-appearance)

![Trois corps sombres avec des lignes de bord activées : les contours les séparent.](shot:edge-lines)

![L'éditeur dans la palette de couleurs sombres. Vous définissez la palette de couleurs en haut à droite : Système, Clair, Foncé ou Graphite.](shot:editor-dark)

{{ui:workspace.toolbarSize}} sous {{ui:workspace.appearance}} rend les boutons du ruban en haut, son menu de forme et les commandes de la caméra à gauche plus petits ou plus grands : {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (comme toujours) ou {{ui:workspace.toolbarSizeLarge}}. Small laisse plus de place pour le plan de travail sur un ordinateur portable ; grand est plus facile à frapper sur un grand écran ou avec un doigt. Avec de gros boutons, les groupes du ruban passent sur une deuxième rangée lorsque la fenêtre est trop étroite pour eux. La taille est conservée dans ce navigateur et s'applique à chaque conception.

> **Conseil :** Arrêtez de faire pivoter la vue lorsque vous assemblez exactement les pièces. Utilisez les touches numériques pour accéder à la vue droite de dessus ou de face et appuyez sur [[O]] pour l'affichage plat. Vous voyez alors immédiatement si les deux bords sont vraiment à égalité.

## Quand la superposition semble lente

layerling calcule et dessine tout dans votre navigateur. Sur un ordinateur plus ancien, doté d'une carte graphique faible ou sur plusieurs grands écrans, l'affichage peut donc sembler lent. Cela aide :

- **{{ui:workspace.fastMode}}** sous {{ui:workspace.appearance}} désactive d'un coup tout ce qui coûte cher à la vue : les ombres, les lignes de contour sur tous les corps et l'inertie de la caméra. Il dessine également la vue uniquement à la résolution de l'écran, qui, sur les écrans haute résolution, représente jusqu'à quatre fois moins de pixels. Vos propres paramètres sont conservés et s'appliquent à nouveau dès que vous le désactivez.
- **La caméra continue de tourner :** Lorsque vous lâchez la souris après avoir tourné, la vue s'allume un instant et ralentit doucement. C'est exprès, pas de bégaiement. Si vous êtes habitué à Tinkercad ou Fusion 360, désactivez {{ui:workspace.cameraInertia}} sous {{ui:workspace.appearance}} et la vue s'arrête immédiatement.
- **Commutateurs simples :** Sans mode rapide, vous pouvez également désactiver uniquement {{ui:workspace.showShadows}} ou {{ui:workspace.edgeLines}}.
- **Utilisez la carte graphique :** Dans Chrome, ouvrez `chrome://gpu` (dans Edge `edge://gpu`). À côté de « WebGL », il devrait indiquer « Accélération matérielle ». S'il est indiqué « Logiciel uniquement », l'accélération matérielle est désactivée dans les paramètres du navigateur. Sous Windows, vous pouvez également choisir « Hautes performances » pour le navigateur sous Paramètres → Système → Affichage → Graphiques, afin qu'il utilise la vraie carte graphique et non la plus faible du processeur.
- **Simplifiez les grands maillages importés :** Un modèle de plusieurs centaines de milliers de triangles ralentit toute vue. Comment l'affiner se trouve dans le chapitre sur les fichiers, sous "Simplifier un maillage importé".
- **Fermez les autres onglets :** Chaque onglet de superposition ouvert et toutes les autres pages 3D partagent la même carte graphique.
