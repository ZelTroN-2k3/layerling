---
title: Esquisses : du contour au corps
summary: Dessinez un contour plat, arrondissez ou chanfreinez ses coins et tirez-le ou faites-le tourner pour former un corps.
---

Tout ne peut pas être assemblé à partir de formes de base. Pour les pièces avec un contour propre, comme un support, un profil de dent ou un vase, vous dessinez d'abord le **contour**, puis vous en faites un corps. C'est à cela que sert le mode esquisse.

## Démarrer une esquisse

En haut, passez de {{ui:editor.modeGeometry}} à {{ui:editor.modeSketch}}. Cliquez sur {{ui:sketch.to3d}} dans le ruban et choisissez ce que doit devenir le contour :

- **{{ui:sketch.extrude}} :** Le contour est tiré vers le haut, comme un emporte-pièce.
- **{{ui:sketch.revolve}} :** Le contour tourne autour d'un axe, comme sur un tour. Cela donne des vases, des coupes, des cônes et tout ce qui est rond.

L'éditeur affiche alors une feuille avec une grille. C'est votre surface de dessin.

## Dessin

Le ruban en mode esquisse est divisé en zones :

- **Dessin :** {{ui:sketch.line}} crée des sections droites : cliquez sur les points les uns après les autres ; maintenir [[Shift]] enclenche la nouvelle ligne par pas de 15°, horizontal et vertical inclus. La longueur et l'angle de la nouvelle ligne s'affichent sur le pointeur. Vous pouvez également saisir la longueur, voir [Lignes par numéros](#lines-by-numbers). Le {{ui:sketch.bezier}} est façonné avec ses poignées : cliquez sur un point et faites glisser dans la direction où la ligne doit continuer, comme avec l'outil plume dans Illustrator ou Inkscape. Plus vous tirez loin, plus il se plie ; l'étirement jusqu'au nouveau point se courbe pendant que vous faites glisser, vous voyez donc ce que vous obtenez. Faire glisser pendant que vous placez un point plie la courbe ; si vous venez de Tinkercad et que vous souhaitez simplement cliquer sur des points, prenez le {{ui:sketch.smooth}}. Le {{ui:sketch.smooth}} trace un chemin fluide à travers les points sur lesquels vous cliquez. Pour fermer le contour, cliquez à nouveau sur le premier point à la fin.
- **Formes :** {{ui:sketch.addShape}} propose des contours prêts à l'emploi : {{ui:sketch.rectangle}}, {{ui:sketch.circle}}, {{ui:sketch.ellipse}}, {{ui:sketch.halfCircle}}, {{ui:sketch.pieSlice}}, {{ui:sketch.boltCircle}} (un disque avec des trous), {{ui:sketch.triangle}}, {{ui:sketch.hexagon}}, un {{ui:sketch.polygon}} et un {{ui:sketch.star}}. Cliquez sur l'un d'entre eux pour le placer à l'origine de l'esquisse ou faites-le glisser du menu jusqu'à l'endroit souhaité. Au bas du menu, {{ui:sketch.polygonSides}} définit le nombre de côtés du polygone et de points de l'étoile, et {{ui:sketch.starInner}} la profondeur des vallées de l'étoile vers le milieu (10 à 90 pour cent du rayon extérieur) ; les deux s’appliquent à la forme suivante que vous ajoutez. Comme toute forme d'esquisse, ce sont ensuite des points d'angle ordinaires, vous pouvez donc les déplacer, les arrondir ou les chanfreiner un par un.
- **Chevauchement :** Poussez deux contours fermés l'un sur l'autre et ils restent deux corps, qui fusionnent dans l'éditeur 3D ; le chevauchement n'est pas un trou. Un trou ne vient que d’un contour entièrement inséré dans un autre. Le déplacement ne rejoint pas les lignes là où elles se croisent, vous pouvez donc séparer à nouveau les formes. Cependant, si vous tracez une ligne entre les autres, la superposition place un point à chaque croisement.
- **Sélection :** {{ui:sketch.select}} déplace les points et les lignes. Un clic à l'intérieur d'un contour fermé sélectionne tout le contour, vous pouvez donc le faire glisser ou le redimensionner immédiatement ; à l'intérieur d'un trou, il choisit le trou. Le cadre autour de la sélection comporte huit poignées : les coins changent de largeur et de hauteur ensemble, conservant les proportions lorsque vous maintenez [[Shift]]. Ceux sur les côtés ne changent que dans une seule direction. La poignée ronde au-dessus du cadre fait pivoter l'ensemble de la sélection autour de son milieu : le chiffre au-dessus indique l'angle, et en maintenant [[Shift]], elle se déplace par pas de 15°. [[R]] fait toujours pivoter un contour fermé entier de 45° à chaque pression. Cliquez sur la pilule de largeur ou de hauteur pour saisir une nouvelle taille, également sous forme de somme ("60+12,5") ou en pourcentage ("150 %"). Avec [[Shift]] maintenu, un clic sur un point ou une ligne l'ajoute à la sélection ou l'enlève à nouveau, vous pouvez donc en choisir plusieurs et les déplacer ensemble. Faites glisser une case sur un espace vide pour tout sélectionner. Une ligne peut également être glissée (elle se déplace par ses deux extrémités, ou par toute la sélection si elle en fait partie). Les touches fléchées déplacent la sélection d'un pas de grille, [[Shift]] avec elles d'un pas plus grand, et [[Shift]] maintenu pendant que vous faites glisser maintient le déplacement sur un axe. {{ui:sketch.refine}} : un clic sur une section ajoute un point, un clic sur un point le supprime. Il existe également {{ui:sketch.erase}} et l'insertion d'une image modèle ({{ui:sketch.addImage}}).
- **Presse-papiers :** {{ui:editor.tool.copy}}, {{ui:editor.tool.paste}}, {{ui:editor.tool.duplicate}} et {{ui:editor.tool.delete}} travaillent sur les points, lignes et images sélectionnés, comme dans l'éditeur 3D ; Coupes [[Ctrl]]+[[X]]. La géométrie collée et dupliquée se pose à côté de l'original avec un espace de 10 mm, sur un endroit libre où elle ne touche aucune ligne existante, de sorte qu'elle ne soit jamais jointe à ce qui est déjà là. Il reste sélectionné, vous pouvez donc le faire glisser directement en place.
- **Historique :** {{ui:sketch.undo}} et {{ui:sketch.redo}}.
- **Affichage :** Effectuez un panoramique avec le bouton central de la souris ou avec [[Shift]] ou [[Ctrl]] plus le bouton droit de la souris, comme dans l'éditeur 3D. [[F]] ajuste l'intégralité de l'esquisse dans la vue, [[Shift]]+[[F]] effectue un zoom sur la sélection, et [[+]] et [[−]] effectuent un zoom avant et arrière, comme dans l'éditeur 3D. Le {{ui:camera.tapeTools}} sur la barre latérale mesure la distance entre deux points. L'esquisse affiche également les dimensions dès que vous cliquez sur quelque chose : la longueur d'une ligne, ou pour un point, la longueur des lignes qui s'y rejoignent. Le bouton {{ui:sketch.showMeasurements}} sur la barre latérale masque et affiche ces dimensions lorsqu'elles gênent, par exemple lors du façonnage de courbes ; le ruban à mesurer continue de fonctionner. Sur une ligne droite, vous pouvez cliquer sur la pilule de dimension et saisir la longueur en millimètres ; [[Enter]] l'applique, [[Esc]] l'annule. La ligne garde sa direction, son point de départ reste là où il se trouve et les lignes à l'autre extrémité suivent. Avec un point final sélectionné, celui-là se déplace. [[Alt]]+[[Enter]] agrandit la ligne des deux côtés autour de son milieu. Dans les courbes, la pilule n'affiche que la longueur.

Un corps vient uniquement d'un contour **fermé**.

![Un contour en forme de L. Au point d'angle sélectionné, en haut à gauche, les longueurs des deux lignes sont affichées en millimètres et l'angle entre elles en degrés.](shot:sketch-outline)

## Lignes par numéros

Une fois que vous avez défini le premier point avec {{ui:sketch.line}} ou {{ui:sketch.smooth}}, tapez simplement un nombre : deux champs s'ouvrent à côté de la ligne, {{ui:sketch.typedLength}} en millimètres et {{ui:sketch.typedAngle}} en degrés. [[<]] ou [[Tab]] se déplace vers l'angle, donc "50<30" donne une ligne de 50 mm de long à 30°, comme dans AutoCAD. [[Enter]] définit le point et vous pouvez taper la ligne suivante immédiatement ; [[Esc]] ferme les champs sans terminer la chaîne de lignes.

L'angle compte dans le sens inverse des aiguilles d'une montre à partir de la droite : 0° vers la droite, 90° vers le haut, 180° vers la gauche, 270° vers le bas. Laissez-le vide et la ligne suit le pointeur, vous donnez donc uniquement la longueur et montrez la direction avec la souris. Des sommes comme « 40+12,5 » fonctionnent dans les deux domaines. Si le point devait sortir de la plaque, le champ l'indique et attend une autre valeur.

## Courber un côté droit

Sélectionnez une ligne droite et cliquez sur {{ui:sketch.curveLine}} dans la barre qui apparaît : le côté s'incline en courbe, comme dans Tinkercad, et montre ses deux poignées. Faites-les glisser pour façonner la courbe ; plus une poignée est éloignée, plus la courbure est forte. {{ui:sketch.straightenLine}} rend le côté droit. Un point que vous sélectionnez peut être arrondi avec {{ui:sketch.smooth}} : il obtient ses propres poignées et les lignes à côté deviennent des courbes.

![Le côté inférieur du contour en forme de L est plié en courbe, avec ses deux poignées aux extrémités.](shot:sketch-curve)

## Angles de lecture et de frappe

Cliquez sur un coin où **deux lignes droites** se rencontrent : à côté des longueurs, la superposition affiche l'**angle** entre elles en degrés, avec un petit arc. Sur un contour fermé, c'est l'angle à l'intérieur de la forme, donc une bosse se lit au-dessus de 180°. Cliquez sur la valeur et saisissez un nouvel angle. L'une des deux lignes tourne alors autour du coin et garde sa longueur, et l'autre reste là où elle est. La ligne qui tourne est tracée en pointillés ; [[Tab]] passe à l'autre, [[Enter]] s'applique et [[Esc]] s'annule. Ce qui pend à l’extrémité de la ligne tournée va avec.

Déplacer un point change trois angles : au point lui-même et aux deux coins voisins aux extrémités de ses lignes. Ainsi, la superposition montre également ces deux éléments, et chacun peut être cliqué et saisi. De cette façon, vous réglez, par exemple, le coin inférieur gauche à 75,5° tandis que le point supérieur gauche, qui se déplace pour lui, est sélectionné. Ici aussi, vous pouvez calculer, par ex. "90-14,5".

Un coin ne montre aucun angle à l'endroit où une courbe le rencontre, ni à l'endroit où plus de deux lignes se rencontrent. Le bouton {{ui:sketch.showMeasurements}} sur la barre latérale masque l'angle ainsi que les longueurs.

## Arrondir ou chanfreiner les coins

Cliquez sur un point d'angle et choisissez {{ui:sketch.filletCorner}} ou {{ui:sketch.chamferCorner}}. Un petit champ apparaît pour le {{ui:sketch.filletRadius}} ou le {{ui:sketch.chamferDistance}}. Saisissez la taille et confirmez avec la coche. Cela fonctionne pour les coins entre deux lignes droites.

Plusieurs coins fonctionnent également : sélectionnez-les avec [[Shift]] et cliquez sur chacun, ou tracez un cadre autour d'eux et choisissez {{ui:sketch.filletCorner}} ou {{ui:sketch.chamferCorner}} dans la barre qui apparaît. Tous ont le même rayon ou distance. Lorsque deux coins sélectionnés partagent un côté, chacun en occupe au maximum 45 %, de sorte qu'un rectangle arrondi sur tout son pourtour ressort pareil à chaque coin. Les points qui ne constituent pas un coin entre deux lignes droites sont laissés de côté et le message indique leur nombre. Un cadre autour d'une forme entière, ou un clic à l'intérieur de celle-ci, sélectionne ses coins et ses lignes ensemble, et la barre propose alors {{ui:sketch.curveLine}} et {{ui:sketch.straightenLine}} pour toutes les lignes sélectionnées à côté des outils de coin.

![Le coin en haut à gauche est arrondi avec un rayon de 12 mm.](shot:sketch-fillet)

## Lignes de construction

Une ligne de construction vous aide à placer des points sans faire partie du corps. Il est dessiné en pointillés et ne compte jamais comme contour : vous pouvez le tirer aussi loin que vous le souhaitez au-delà de la forme et le corps ne grandit pas.

- Allumez {{ui:sketch.construction}} dans le groupe {{ui:sketch.group.draw}}. Les nouvelles lignes, celles tapées par mesure également, sont alors des lignes de construction. Le bouton revient aux lignes normales.
- Une ligne que vous avez tracée devient déjà une ligne de construction lorsque vous cliquez dessus et choisissez {{ui:sketch.makeConstruction}}. {{ui:sketch.makeSolid}} en fait à nouveau une ligne normale.
- Les nouveaux points s'accrochent à l'endroit où une ligne de construction croise une autre ligne, un anneau bleu l'indique, ainsi qu'aux extrémités de la ligne de construction. C'est ainsi qu'on pose un coin sur un milieu, à distance fixe d'un bord ou sur un croisement, sans calculer.
- Une ligne de construction ne coupe pas le contour là où elle le traverse. Lorsqu'il tourne, il peut également se trouver à droite de l'axe.

## En faire un corps

Cliquez sur {{ui:sketch.finishSketch}}. Le contour constitue un corps sur le plan de travail. Dans ses paramètres, vous modifiez la hauteur, la couleur et tout le reste comme pour toute autre forme. Lorsque vous le redimensionnez, la superposition le reconstruit à partir de l'esquisse un instant plus tard, et l'esquisse grandit avec elle. Il reste donc un corps exact qui prend des chanfreins et des congés, et la prochaine fois que vous le modifierez, l'esquisse aura la taille du corps.

Si le plan de travail se trouve sur le côté d'un corps, vous dessinez la façon dont vous regardez ce côté : le haut dans l'esquisse se trouve également sur le corps fini. Le léger contour du corps dans la vue d’esquisse montre où il se trouve. Si le plan de travail traverse un corps, la vue d'esquisse affiche à la place le contour de cette coupe, de sorte qu'un corps creux apparaît comme un anneau et que vous pouvez aligner l'esquisse avec ses parois. Un point que vous définissez ou faites glisser près d'un coin de ces contours s'aligne exactement dessus ; un petit anneau bleu le montre. De cette façon, vous incorporez les bords d'autres corps dans l'esquisse, même lorsque le plan de travail ne repose pas exactement sur eux.

![Le contour est devenu un corps. Le coin est arrondi.](shot:sketch-result)

Avec {{ui:inspector.editSketch}} vous pouvez revenir à l'esquisse à tout moment pour la modifier. Un double clic sur le corps fait la même chose, comme dans Tinkercad (un corps verrouillé reste fermé) ; {{ui:workspace.doubleClickOpensSketch}} dans les paramètres désactive cela. Les traitements de bord que vous avez déjà effectués sur le corps sont perdus, car les bords sont créés à nouveau.

### Tournant

Lors d'une révolution, vous dessinez la moitié de la section **à gauche de l'axe** indiqué dans l'esquisse. À côté, vous voyez un aperçu 3D de la révolution. Cela montre immédiatement à quoi ressemblera le corps. Le contour doit être fermé. À la fin, cliquez sur {{ui:sketch.finishRevolve}}.

Un corps de révolution est un corps exact, comme un corps extrudé : il prend des chanfreins et des congés, et on peut le creuser, pour une tasse ou un vase. Un corps tourné avec une couche plus ancienne est un maillage ; ouvrez {{ui:inspector.editSketch}} et terminez-le à nouveau pour le rendre exact. Un profil qui traverse l'axe ne peut pas être construit exactement et devient un maillage, comme auparavant.

## Construire comme un trait

Normalement, la zone située à l’intérieur d’un contour fermé devient le corps. Avec {{ui:sketch.stroke}} dans la section {{ui:sketch.group.finish}}, vous construisez la ligne elle-même, avec une largeur que vous définissez. Cochez {{ui:sketch.strokeOn}} dans le panneau ; le croquis montre d'emblée ce qui en ressort.

- Un **contour fermé** devient un cadre. {{ui:sketch.strokeAlign}} indique où se trouve le mur : {{ui:sketch.strokeAlign.center}} sur la ligne tracée, {{ui:sketch.strokeAlign.inside}} à l'intérieur ou {{ui:sketch.strokeAlign.outside}} à l'extérieur. L'extérieur est pratique pour une tolérance : dessinez le contour d'un trou, une queue d'aronde par exemple, et donnez-lui un trait de 0,2 mm à l'extérieur pour obtenir l'espace dont l'impression a besoin.
- Une **ligne ouverte** devient une bande, centrée sur la ligne. {{ui:sketch.strokeCap}} définit l'apparence de ses extrémités : {{ui:sketch.strokeCap.flat}}, {{ui:sketch.strokeCap.square}} (plus longue de la moitié de la largeur) ou {{ui:sketch.strokeCap.round}}.
- {{ui:sketch.strokeJoin}} s'applique aux deux : {{ui:sketch.strokeJoin.miter}}, {{ui:sketch.strokeJoin.round}} ou {{ui:sketch.strokeJoin.bevel}}.

L'esquisse conserve la ligne tracée. Ouvrez-le à nouveau et vous continuez à changer de ligne et de trait ; décochez la case et la zone est à nouveau construite. Les courbes sont divisées en petits morceaux droits. Une révolution n'a pas de trait.

## Remplissage et silhouette

Vous pouvez également définir le trait sans ouvrir l'esquisse : dans les propriétés d'un corps d'esquisse, choisissez {{ui:prop.sketchFill.area}}, {{ui:prop.sketchFill.outside}}, {{ui:prop.sketchFill.inside}} ou {{ui:prop.sketchFill.center}} sous {{ui:prop.sketchFill}}, avec {{ui:prop.sketchLineWidth}} et {{ui:sketch.strokeJoin}}. Le corps est immédiatement reconstruit, là où il se trouve. Ceux-ci correspondent aux modes de remplissage de l'importation SVG de Tinkercad : par défaut, ligne extérieure et ligne intérieure. {{ui:prop.sketchFill.grow}} maintient la zone remplie et l'agrandit de la largeur du trait tout autour, avec des coins pointus, ronds ou biseautés : une couche de base sous un logo pour une impression multicolore, que le trait extérieur seul ne donnerait que comme un anneau.

{{ui:prop.sketchSilhouette}} laisse de côté tous les contours qui se trouvent à l'intérieur d'un autre : les trous et tout ce qui s'y trouve. Seul le contour extérieur reste. Avec {{ui:prop.sketchFill.outside}}, cela crée un emporte-pièce : importez un SVG deux fois, une fois avec la silhouette comme zone pour la base et une fois avec la silhouette et 1 à 2 mm de trait à l'extérieur comme mur. Le commutateur se trouve également dans le panneau {{ui:sketch.stroke}} en mode esquisse.

Les congés et les chanfreins sur les arêtes disparaissent lorsque le corps est reconstruit, comme lorsque l'esquisse est modifiée.

## Murs inclinés, pour les tampons

Une esquisse extrudée comporte des parois verticales. Un tampon, une matrice de gaufrage ou un poinçon doivent être inclinés, à l'extérieur comme à l'intérieur, avec la même épaisseur de paroi sur toute la longueur. Layerling n'a pas d'angle de dépouille pour une extrusion, mais pour des contours simples, {{ui:inspector.taper}} vous y amène. Une méthode qui fonctionne :

1. Dessinez le contour avec le trou dont il a besoin et faites-en un corps. Dupliquez le corps ([[Ctrl]]+[[D]]).
2. Sur le premier corps, activez {{ui:prop.sketchSilhouette}} pour que le trou soit rempli et donnez-lui un fond plus large que le haut avec {{ui:inspector.taper}}.
3. Sur la copie, ouvrez à nouveau son esquisse et supprimez le contour extérieur, de sorte qu'il ne reste que le contour du trou. Terminez l'esquisse, changez le corps en {{ui:inspector.hole}} et donnez-lui un bas plus étroit que le haut avec {{ui:inspector.taper}}.
4. Déplacez le trou dans le premier corps, là où se trouvait le trou, et regroupez les deux.

Les murs sont désormais inclinés vers l'extérieur et l'intérieur. Taper met à l'échelle tout le contour, ce qui est donc exact pour les formes simples, où vous pouvez choisir les tailles pour que les murs soient parallèles, et seulement une approximation pour les détails fins tels que le lettrage.

## Une image comme modèle

Avec {{ui:sketch.addImage}} vous mettez une photo ou un dessin sous le croquis et vous le tracez. Vous pouvez définir sa taille, son opacité et sa position. Une fois l'image bien placée, verrouillez-la avec [[L]] afin de ne pas la déplacer accidentellement pendant le dessin. Une image verrouillée n'est pas gênante : les clics la traversent, vous pouvez donc sélectionner des lignes et des points dessus et faire glisser un cadre dessus. Pour le sélectionner à nouveau, par exemple pour le déverrouiller, [[Alt]]+cliquez dessus. Si ses paramètres sur le bord droit couvrent l'image, faites-les glisser par leur barre de titre ; un double-clic dessus les ancre à nouveau.

Sous {{ui:sketch.imageAlign}} vous alignez une photo qui n'a pas été prise directement :

- **{{ui:sketch.imageRotation}} :** Tournez l'image autour de son centre, avec la poignée ronde au-dessus de son cadre ou sous forme de nombre en degrés. Avec [[Shift]], la poignée s'enclenche par pas de 15°.
- **{{ui:sketch.centreImageX}}** et **{{ui:sketch.centreImageY}} :** placent le centre de l'image sur X = 0 ou Y = 0. Pour une révolution, X = 0 est l'axe, donc l'image est alors symétrique par rapport à lui.
- **{{ui:sketch.calibrateImage}} :** Cliquez sur deux points de l'image dont vous connaissez la distance, les extrémités d'une règle ou un diamètre connu, et saisissez la distance réelle. L'image est mise à l'échelle uniformément afin que la distance soit correcte ; le premier point reste là où il était.
- **{{ui:sketch.cropImage}} :** Les poignées du cadre recadrent désormais l'image au lieu de la redimensionner ; ce qui est coupé reste stocké et revient avec {{ui:sketch.uncropImage}} ou lorsqu'une poignée est à nouveau retirée.

Tous les quatre touchent uniquement à la référence, jamais au croquis.

## Touches en mode esquisse

| Clé | Effet |
| --- | --- |
| [[Esc]] | terminer la chaîne de lignes, effacer la sélection |
| [[Delete]] | supprimer l'élément sélectionné |
| [[Ctrl]]+[[C]] | copier la sélection |
| [[Ctrl]]+[[X]] | couper la sélection |
| [[Ctrl]]+[[V]] | coller |
| [[Ctrl]]+[[D]] | dupliquer la sélection |
| [[Ctrl]]+[[Z]] | annuler |
| [[Shift]] | pendant le dessin : tracez la ligne par pas de 15° ; tout en faisant glisser : conserver le mouvement sur un axe |
| chiffre, [[<]], [[Tab]], [[Enter]] | pendant le dessin : tapez et définissez la longueur et l'angle de la ligne suivante |
| [[R]] | faire pivoter l'esquisse fermée de 45° |
| [[L]] | verrouiller ou déverrouiller l'image du modèle |

> **Conseil :** Dessinez autant de points que nécessaire. Un contour avec quelques points bien placés donne un corps plus lisse qu’un enchevêtrement de plusieurs.
