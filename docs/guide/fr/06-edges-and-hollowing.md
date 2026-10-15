---
title: Casser les bords et creuser les corps
summary: Chanfrein et congé sur bords choisis, parois d'égale épaisseur pour boîtes, coupelles et étuis.
---

## Chanfreinage et congés des bords

Les arêtes vives sont rarement belles sur une pièce imprimée, et elles ne sont pas non plus particulièrement résistantes. Un **chanfrein** coupe le bord en biais, un **congé** l'arrondit. Les deux agissent sur les bords sur lesquels vous cliquez.

1. Sélectionnez le corps (ou le groupe).
2. Cliquez sur {{ui:editor.tool.fillet}} ou {{ui:editor.tool.chamfer}} dans le ruban, appuyez sur [[B]] pour le congé ou sur [[Shift+B]] pour le chanfrein, ou cliquez avec le bouton droit sur le corps et sélectionnez-le dans le menu.
3. Les bords du corps s'illuminent. Cliquez sur ceux qui devraient être concernés. Un autre clic retire à nouveau un avantage. Avec [[Shift]], vous ajoutez ou supprimez une seule arête.
4. Définissez la taille et confirmez avec {{ui:edge.apply}} ou [[Enter]].

![L'outil "Congé arêtes" : toutes les arêtes vives sont sélectionnées, l'image montre l'aperçu avec un rayon de 4 mm.](shot:fillet-preview)

Le panneau se trouve en haut à droite. S'il recouvre les bords sur lesquels vous souhaitez cliquer, faites-le glisser par sa barre de titre ; il s'y ouvrira également la prochaine fois, tout comme {{ui:editor.tool.hollow}} et {{ui:editor.tool.array}}. Double-cliquez sur la barre de titre pour la remettre.

Choisir une forme dans la liste des formes alors que le panneau est ouvert le ferme sans rien appliquer et les bords sur lesquels vous avez cliqué sont oubliés. Le clic place ensuite la nouvelle forme au lieu de sélectionner les bords.

Dans le panneau vous trouvez :

- {{ui:edge.allSharpEdges}} sélectionne chaque arête à la fois, {{ui:edge.clear}} vide la sélection.
- **{{ui:edge.radius}}** pour le congé. Pour le chanfrein, vous définissez {{ui:edge.distance}} ou {{ui:edge.angle}}.
- {{ui:edge.sharpThreshold}} décide quels bords sont considérés comme nets. Une valeur de 25° traite uniquement les plis nets comme des bords et laisse les transitions plates seules.
- {{ui:edge.topEdges}} sélectionne uniquement les bords tout en haut du corps. C'est la méthode rapide pour un emporte-pièce : tracez le contour d'une esquisse sous forme d'un trait, puis chanfreinez les bords supérieurs. {{ui:edge.angle}} définit la pente du chanfrein ; il ne peut pas aller plus loin que l'épaisseur du mur.
- {{ui:edge.onlyVisibleEdges}} masque les bords qui se trouvent derrière le corps d'où vous regardez. Par défaut, chaque bord apparaît à travers le corps, ce qui prête à confusion sur une partie occupée ; avec l'interrupteur allumé, vous voyez et pouvez cliquer uniquement les bords face à vous. Tournez la vue pour atteindre les autres. Un bord dessiné en rouge (voir ci-dessous) apparaît toujours.
- {{ui:edge.tangentChains}} : un clic sélectionne alors également les arêtes qui s'enchaînent doucement les unes dans les autres, par exemple toutes les arêtes autour d'une face aux coins arrondis. Le commutateur décide uniquement ce qu'un clic sélectionne : le noyau de CAO comporte toujours un chanfrein ou un congé le long de ces bords continus et fluides. Le panneau vous indique le nombre d'arêtes supplémentaires qui se produisent.
- {{ui:edge.keepSize}} conserve le chanfrein ou le congé aussi grand qu'il est, même si vous mettez le corps à l'échelle ultérieurement.
- {{ui:edge.previewQuality}} ({{ui:edge.draft}}, {{ui:edge.standard}} ou {{ui:edge.fine}}) décide de la précision avec laquelle l'aperçu est calculé. Pour les pièces difficiles, {{ui:edge.draft}} est plus rapide.

Pendant que vous ajustez la taille, le layerling recalcule l'aperçu. Cela peut prendre un moment. Vous pouvez continuer à vous adapter ; la dernière valeur que vous avez choisie est celle qui est calculée.

Si la taille est trop grande pour le bord, layerling l'indique et suggère une valeur plus petite. Souvent, un ou deux millimètres de moins suffisent. Aux angles vifs, un congé a besoin de plus d’espace que son rayon ne le suggère. Sur un petit écran, le panneau défile tout seul pour que le message soit visible.

Lorsqu'une sélection qui a fonctionné échoue après avoir cliqué sur un bord supplémentaire, ce bord devient rouge et s'élargit : c'est celui qui ne peut pas être traité avec les autres à cette taille. Cliquez à nouveau dessus pour le retirer ou réduisez la taille. Si vous cliquez sur plusieurs bords pendant que le message est affiché, le premier reste rouge. Lorsqu'aucune sélection antérieure n'a fonctionné - au tout premier clic ou à une taille que vous venez d'augmenter - les bords qui échouent même d'eux-mêmes deviennent rouges, ou tous s'il ne s'agit que de leur combinaison.

Le bord sous le pointeur est également plus large, afin que vous puissiez voir lequel un clic sélectionnera.

### Reprendre un traitement de pointe

Un corps traité peut toujours être traité à nouveau. Sélectionnez-le à nouveau et ouvrez l'outil - Congé, Chanfrein ou Creux, chacun affiche la liste : sous {{ui:edge.featureHistory}} vous voyez ce qu'il y a déjà dessus. {{ui:edge.revertAction}} reprend un seul traitement. Remarque : si des traitements plus récents se trouvent au-dessus, ils vont avec et le panneau vous indique combien.

A côté d'un chanfrein, d'un congé ou d'un évidement, il y a aussi {{ui:edge.editAction}}. Il reprend le traitement de la même manière, mais ouvre à nouveau l'outil immédiatement avec les mêmes bords et l'ancienne valeur. Vous modifiez la valeur et l'appliquez à nouveau : un congé de 3 mm devient un congé de 5 mm sans cliquer à nouveau sur les bords. Si des traitements plus récents se trouvent au-dessus, ils l’accompagnent également ici. Cela vaut pour les traitements de bords que vous effectuerez désormais ; les plus âgés proposent uniquement la reprise, tout comme les parties individuelles d'un groupe.

Sur un groupe, par exemple un cylindre percé d'un trou, le bord traité appartient au corps fini et non à l'une de ses parties. Le groupe devient donc un seul corps et {{ui:editor.tool.ungroup}} n'est plus disponible. Reprenez le traitement comme décrit ci-dessus et le groupe revient avec toutes ses parties. Le moyen le plus simple consiste à traiter les bords en dernier. Cela vaut également pour les filetages : l'outil de bord prend un filetage comme corps exact, de sorte qu'un bloc avec un trou taraudé obtient ses bords arrondis avec le filetage en place. L'élaboration des bords d'un filetage prend plus de temps que pour une forme simple, quelques secondes pour un filetage M6 et environ une demi-minute pour un filetage de tuyau G1/2.

> **Bon à savoir :** la superposition fonctionne avec une véritable géométrie CAO pour les congés et les chanfreins, et pas seulement avec un maillage triangulaire. C'est pourquoi un bord arrondi reste un bord arrondi dans l'exportation STEP.

Une pièce importée en STEP conserve également sa géométrie CAO : chanfreins, congés et travaux d'évidement sur le corps à partir du fichier, quelle que soit la finesse avec laquelle la pièce est dessinée à l'écran. STL, OBJ et 3MF n'apportent que des triangles, et une pièce finement dessinée peut être trop dense pour l'outil de bord. Si une pièce est également disponible en STEP, importez-la.

## Corps creux

Boîtes, tasses, étuis et couvercles ont un point commun : ils sont vides à l'intérieur, avec des parois d'égale épaisseur. C'est exactement ce que fait {{ui:editor.tool.hollow}}.

1. Sélectionnez le corps et cliquez sur {{ui:editor.tool.hollow}}, ou cliquez avec le bouton droit sur le corps et sélectionnez-le dans le menu.
2. Définissez {{ui:shell.wall}}.
3. Sous {{ui:shell.openings}}, activez les côtés qui restent ouverts : {{ui:shell.side.top}}, {{ui:shell.side.bottom}}, {{ui:shell.side.front}}, {{ui:shell.side.back}}, {{ui:shell.side.left}} ou {{ui:shell.side.right}}, autant que vous le souhaitez - {{ui:shell.side.front}} fait à lui seul un emplacement pour un tiroir, {{ui:shell.side.left}} et {{ui:shell.side.right}} un tunnel. Sans aucun côté allumé, le corps reste fermé sur tout son pourtour, avec une cavité au milieu.
4. Décidez si {{ui:shell.edges}} doit être {{ui:shell.edges.round}} ou {{ui:shell.edges.sharp}}.
5. Cliquez sur {{ui:shell.apply}}.

![Le panneau creux avec l'épaisseur de la paroi, un interrupteur pour chaque côté qui reste ouvert et les bords intérieurs.](shot:hollow-panel)

Les murs grandissent vers l’intérieur. L’extérieur reste tel quel.

Le {{ui:shell.edges}} n'a d'importance que là où les parois intérieures s'écartent - à un niveau du corps ou autour d'une ouverture. Les coins de la cavité d'une boîte ordinaire sont toujours pointus, avec les deux réglages. Pour un intérieur arrondi, arrondissez d'abord les bords extérieurs du corps (voir ci-dessus), puis creusez-le : l'intérieur suit avec le rayon moins l'épaisseur de paroi. Si l'intérieur arrondi ne peut pas être construit, ce qui peut arriver avec un contour composé de très nombreuses pièces droites courtes telles qu'un dessin tracé, la superposition construit à la place le même corps creux avec des coins intérieurs pointus.

![Le résultat : une coque avec une paroi de 3 mm, ouverte en haut.](shot:hollow-result)

![La même boîte avec seulement la face avant ouverte : un emplacement pour un tiroir.](shot:hollow-sides)

Pour chaque côté ouvert, le corps a besoin d’une face plate tout au bord de ce côté. Les sphères et les formes libres ne peuvent donc pas être creusées de cette façon. Si le mur est trop épais pour le corps, le layerling vous le signale et en demande un plus fin.

Un corps avec une poche - un bloc avec un trou qui ne traverse pas complètement, réalisé en regroupant une boîte avec un trou surélevé - peut également être creusé, avec le dessus ouvert : les parois autour de la poche sont également creusées, de sorte qu'un anneau de cavité reste entre la paroi extérieure et la poche, ouvert en haut, et une fine cavité se trouve sous le fond de la poche.

**Les corps qui se terminent par un point**, comme un cône ou un triangle de révolution, n'ont pas de face plate sur le dessus qui pourrait rester ouverte. Là non plus, une cavité entièrement fermée ne fonctionne pas, car un point ne peut pas être décalé vers l'intérieur : même avec un mur de 1 mm, vous obtenez le message que les murs ne peuvent pas être aussi épais. Dessinez plutôt le mur dans le profil avant de procéder à la révolution : dupliquez le contour, réduisez la copie de manière uniforme, placez-la au milieu du grand contour et coupez le grand avec, puis faites pivoter le tout (chapitre Esquisses, section Révolution). La distance entre les deux contours correspond à l’épaisseur de la paroi.

Si vous redimensionnez un corps évidé ultérieurement, la superposition le creuse immédiatement à nouveau à la nouvelle taille. Le mur reste aussi épais que vous l'avez choisi, corps ronds inclus. Un cylindre que vous tirez plus loin dans un sens que dans l’autre devient une ellipse.

> **Astuce :** Avec une buse de 0,4 mm, 1,2 à 2 mm de paroi est un bon début : suffisamment fin pour économiser de la matière, suffisamment épais pour une pièce solide.
