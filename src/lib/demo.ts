import { emptyLibrary, type Item, type Library } from "./model";
const content = [
  [
    "Spaces to slow down",
    "studio.notes",
    "A quiet corner, a good book, and nowhere else to be. Warm timber, soft light, and the kind of room that makes you exhale.",
    "#interiors #slowliving",
    "Slow living",
  ],
  [
    "The perfect Sunday pasta",
    "table.for.two",
    "Fresh tomato pasta with basil and a little patience. Roast tomatoes with garlic, toss with spaghetti, finish with olive oil. Save this recipe for Sunday.",
    "#pasta #recipe",
    "Around the table",
  ],
  [
    "A different kind of escape",
    "roam.journal",
    "A weekend along the Italian coast. Small towns, late lunches, and a swim before breakfast. A travel itinerary for the slower route.",
    "#travel #italy",
    "Somewhere new",
  ],
  [
    "Less, but better",
    "form.archive",
    "Thoughtful typography and a beautifully simple identity. An independent design studio explores shape, negative space, and the beauty of restraint.",
    "#design #typography",
    "Good design",
  ],
  [
    "Making a little room",
    "studio.notes",
    "An interior filled with linen, sunlight, and handmade objects. Design a home around the things you actually love.",
    "#interiors #home",
    "Slow living",
  ],
  [
    "Breakfast worth waking up for",
    "table.for.two",
    "A recipe for soft pancakes with lemon and honey. Whisk eggs, flour and milk; cook gently in butter. A delicious breakfast to share.",
    "#recipe #breakfast",
    "Around the table",
  ],
  [
    "Take the scenic route",
    "roam.journal",
    "Travel through the mountains by train, with a notebook and a window seat. A guide to three quiet stops on your next journey.",
    "#travel #train",
    "Somewhere new",
  ],
  [
    "Letters with personality",
    "form.archive",
    "A typography collection celebrating unexpected letterforms, printed matter, and independent editorial design. Inspiration for your next project.",
    "#design #typography",
    "Good design",
  ],
];
export function demoLibrary(): Library {
  const l = emptyLibrary();
  l.collections = [
    {
      id: "demo-slow",
      name: "Slow living",
      parentId: null,
      manual: true,
      style: 0,
    },
    {
      id: "demo-food",
      name: "Around the table",
      parentId: null,
      manual: true,
      style: 1,
    },
    {
      id: "demo-travel",
      name: "Somewhere new",
      parentId: null,
      manual: true,
      style: 2,
    },
    {
      id: "demo-design",
      name: "Good design",
      parentId: null,
      manual: true,
      style: 3,
    },
  ];
  l.items = content.map(([, creator, caption, tags, name], i): Item => ({
    id: `demo${i}`,
    url: `https://www.instagram.com/p/demo${i}/`,
    fbid: "",
    captions: [caption],
    creator,
    hashtags: tags.split(" "),
    timestamp: Math.floor(Date.now() / 1000) - i * 86400 * 19,
    importedAt: Date.now(),
    favorite: i === 0,
    archived: false,
    note: "",
    tags: [],
    intent: null,
    collections: [l.collections.find((c) => c.name === name)!.id],
    excluded: [],
  }));
  return l;
}
