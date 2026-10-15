---
title: Getting started
summary: From a blank sheet to your first part for the 3D printer, in five minutes, with no account and nothing to install.
---

layerling is a design program for 3D printing that runs right in your browser. You build a part from simple shapes, cut holes into it, round the edges and send it to your slicer. There is nothing to install and nothing to sign up for. What you build stays on your computer.

![The start page of layerling: "Create new 3D design" at the top, your designs and the quick guide below.](shot:start-page)

## Creating a design

Open [layerling.com](https://layerling.com/). On the start page click {{ui:dashboard.createDesign}}. The editor opens with an empty workplane, the grid on which everything takes shape.

If you already have a file to continue with, use {{ui:dashboard.importGeometry}}. That works for layerling designs (`.lyl`) as well as STL, OBJ, 3MF, STEP or SVG files.

All your designs later appear on the start page with a preview picture. They are kept in your browser's storage and saved automatically after every change, so there is no save button. How to pack designs into a file and pass them on is covered in [Files and saving](chapter:files-and-saving).

## The editor at a glance

![The editor with two shapes on the workplane. The ribbon on top, the camera controls on the left, the settings of the selected shape on the right.](shot:editor-overview)

- **On top** is the ribbon. It is sorted by task: {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.group.modify}}, {{ui:editor.group.arrange}}, {{ui:editor.group.manage}} and {{ui:editor.group.help}}. Hover over an icon to see its name. Wherever you see a small question mark, for example in a shape's settings, in the shape library or in the tool panels, it leads straight to the matching chapter of this guide.
- **In the middle** lies the workplane. This is where you place shapes, pull them into form and see the result.
- **On the right** appear the settings of the selected shape: colour, dimensions, position and whatever else makes up the shape. Typing numbers is more exact than dragging.
- **On the left** are the camera controls with the view cube above them. They move you around the scene, more in [View and workplane](chapter:view-and-workplane).
- **At the very top** you switch between {{ui:editor.modeGeometry}} and {{ui:editor.modeSketch}}, rename the design and choose language and colour scheme.

## Your first part

As an example, we build a cube with a hole.

1. Click {{ui:editor.addShape}} in the ribbon and pick {{ui:shape.box}}. The shape now hangs on your mouse pointer. A click on the workplane sets it down.
2. On the right, set the dimensions, for example 40 mm long, 40 mm wide and 20 mm high.
3. Place a {{ui:shape.cylinder}} in the middle the same way, 14 mm across and 30 mm high. It should be taller than the cube so it reaches all the way through.
4. Select the cylinder and click {{ui:inspector.hole}} on the right. It turns see-through: the solid has become a tool that takes material away.
5. Select both shapes and click {{ui:editor.tool.group}}. The cube now has a hole.

![The cylinder is a hole and sticks out of the top of the cube.](shot:hole-before)

![After grouping, the cube has a bore.](shot:hole-after)

This is how bores, slots and pockets are made. The chapter [Solids and holes](chapter:solids-and-holes) explains it in detail.

## New since your last visit

When you open layerling again after an update, a card on the start page lists what has been added since you were last here: every version since then, the newest first. After a long absence you scroll down inside the card. Below them, {{ui:whatsNew.earlier}} adds the versions from before your last visit too. Close it with {{ui:whatsNew.dismiss}} and it stays away until the next update. {{ui:whatsNew.footerLink}} in the footer of the start page shows the latest additions again at any time. The browser remembers the last version you saw, and nothing about you leaves it.

On a copy of layerling on your own computer or server, the notice "Update available" has a button, {{ui:update.previewShow}}, that lists what the update brings before you install it. The list is fetched from GitHub only when you press the button.

## From design to print

When your part is done, click {{ui:editor.export}}, choose STL or 3MF and download the file. Open it in your slicer, for example Bambu Studio, PrusaSlicer, OrcaSlicer or Cura. If you choose your printer in the settings, you can see while building whether the part fits on the print bed. More in [Printing](chapter:printing).

> **Tip:** If you come from Tinkercad you will find your way quickly: plate, shapes, solid and hole, group, align and mirror work almost the same. What is new is mostly chamfer and fillet, hollowing, threads and sketches.
