import type { ComicDocument, Panel } from "../../../shared/document";
import { artwork } from "./artwork";
const RECTS = [
  { x: 12, y: 12, width: 876, height: 532 },
  { x: 12, y: 558, width: 430, height: 390 },
  { x: 456, y: 558, width: 432, height: 390 },
  { x: 12, y: 962, width: 876, height: 226 },
];
interface PanelSeed {
  dialogue: string;
  speaker?: string;
  sound?: Panel["sound"];
  choices?: Panel["choices"];
  continueTo?: string;
}
function page(
  id: string,
  title: string,
  art: number,
  seeds: PanelSeed[],
  wide = false,
) {
  const rects = wide ? [RECTS[0]!, RECTS[3]!] : RECTS;
  return {
    id,
    title,
    width: 900,
    height: 1200,
    image: artwork(art),
    panels: seeds.map((seed, i) => ({
      id: `${id.replace("page", "panel")}-${i}`,
      dialogue: seed.dialogue,
      speaker: seed.speaker ?? (i % 2 ? "陈屿" : "旁白"),
      sound: seed.sound ?? (i === 2 ? "pulse" : "rain"),
      duration: 4 + i,
      rect: rects[i]!,
      choices: seed.choices,
      continueTo: seed.continueTo,
    })),
  };
}
export function demoDocument(): ComicDocument {
  const chapterOne = [
    "整座城市都在等待一场不会停的雨。",
    "末班车已经走了，你还在等谁？",
    "一封没有署名的消息，在凌晨两点亮起。",
    "沿着光走。我们在旧车站见。",
  ];
  const chapterThree = [
    "城市的边缘，终于亮起一线微光。",
    "原来你一直都在。",
    "那封信，是写给昨天的自己。",
    "天亮了。我们出发吧。",
  ];
  return {
    version: 1,
    id: "before-rain",
    title: "雨停之前",
    author: "林间工作室",
    chapters: [
      {
        id: "chapter-0",
        title: "第一章 · 夜的来信",
        subtitle: "凌晨 02:17 / 城市边缘",
        pages: Array.from({ length: 4 }, (_, p) =>
          page(
            `page-0-${p}`,
            `第 ${p + 1} 页`,
            p,
            chapterOne.map((dialogue) => ({ dialogue })),
          ),
        ),
      },
      {
        id: "chapter-1",
        title: "第二章 · 失落的频率",
        subtitle: "凌晨 03:42 / 旧车站",
        pages: [
          page(
            "page-1-0",
            "岔路口",
            1,
            [
              { dialogue: "街灯把影子拉得很长。" },
              {
                dialogue: "前面分出两条路，该往哪走？",
                sound: "pulse",
                choices: [
                  {
                    id: "choice-alley",
                    label: "调查唱片店后巷",
                    targetPanelId: "panel-1-1-0",
                  },
                  {
                    id: "choice-platform",
                    label: "径直前往月台",
                    targetPanelId: "panel-1-2-0",
                  },
                ],
              },
            ],
            true,
          ),
          page(
            "page-1-1",
            "唱片店后巷",
            2,
            [
              { dialogue: "我记得这里，曾经有一间唱片店。" },
              {
                dialogue: "玻璃柜里，还躺着一张没寄出的唱片。",
                sound: "pulse",
                continueTo: "panel-1-3-0",
              },
            ],
            true,
          ),
          page(
            "page-1-2",
            "月台",
            3,
            [
              { dialogue: "有人比我更早抵达。", sound: "wind" },
              {
                dialogue: "月台的钟，停在三点四十二分。",
                sound: "pulse",
                continueTo: "panel-1-3-0",
              },
            ],
            true,
          ),
          page(
            "page-1-3",
            "汇合",
            4,
            [
              { dialogue: "雨声里，传来一首熟悉的歌。", sound: "wind" },
              {
                dialogue: "候车室的门虚掩着，透出昏黄的灯。",
                continueTo: "panel-2-0-0",
                choices: [
                  {
                    id: "choice-return",
                    label: "折返唱片店后巷",
                    targetPanelId: "panel-1-1-0",
                    condition: { kind: "choice", id: "choice-alley" },
                  },
                  {
                    id: "choice-clock",
                    label: "提起月台停摆的钟",
                    targetPanelId: "panel-2-0-2",
                    condition: { kind: "panel", id: "panel-1-2-1" },
                  },
                ],
              },
            ],
            true,
          ),
        ],
      },
      {
        id: "chapter-2",
        title: "第三章 · 天光将至",
        subtitle: "清晨 05:06 / 海岸",
        pages: Array.from({ length: 3 }, (_, p) =>
          page(
            `page-2-${p}`,
            `第 ${p + 1} 页`,
            2 + p,
            chapterThree.map((dialogue) => ({ dialogue })),
          ),
        ),
      },
    ],
  };
}
