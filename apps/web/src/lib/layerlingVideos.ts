/**
 * Videos by other people about layerling. Plain links, no embeds: an embedded
 * player would contact YouTube as soon as the page opens, and layerling keeps
 * visitors' data to itself. Newest first; `lang` is the spoken language.
 * The guide has a chapter with the same list: 16-videos.md in docs/guide (both languages).
 */
export const LAYERLING_VIDEOS = [
  {
    title: "The PERFECT FREE CAD Program Between Tinkercad and Fusion 360!",
    channel: "Print N Repeat",
    lang: "EN",
    url: "https://youtu.be/GIoG-IHPXyg",
  },
  {
    title: "Meet Layerling Free Browser Based CAD that EXTENDS Tinkercad!",
    channel: "HL ModTech",
    lang: "EN",
    url: "https://youtu.be/979_Ohy9ESM",
  },
  {
    // A whole playlist, so new videos in it arrive here without a release.
    title: "Layerling – Playlist",
    channel: "Making Layers",
    lang: "EN",
    url: "https://www.youtube.com/playlist?list=PLCsBmX2kOGWs",
  },
  {
    title: "Tinkercad Too Basic? Fusion 360 Too Much? Meet Layerling for 3D Printing",
    channel: "3D Jesus | 3D Printing & Design",
    lang: "EN",
    url: "https://youtu.be/kzV7fQ3rXhw",
  },
] as const;
