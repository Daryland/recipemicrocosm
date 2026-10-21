// Featured recipes shown at the top of the home page. The season follows the
// month (Northern Hemisphere meteorological seasons) and each category rotates
// to its next recipe every week of that season. A season is at most 14 weeks,
// so the food pools hold ~13 recipes to avoid repeats; the wellness pools are
// drinks only (teas, juices, smoothies, agua frescas), smaller, and repeat. To change a pick, edit its slug; slugs that no longer
// exist are skipped.

export type SeasonKey = "winter" | "spring" | "summer" | "fall";

export interface SeasonCategory {
  label: string; // shown above the card, e.g. "Feel good"
  slugs: string[]; // rotation order, one per week
}

export interface Season {
  key: SeasonKey;
  name: string;
  blurb: string;
  startMonth: number; // 0 = January
  categories: SeasonCategory[];
}

export const SEASONS: Record<SeasonKey, Season> = {
  winter: {
    key: "winter",
    name: "Winter",
    blurb: "Slow, warming food for short days.",
    startMonth: 11,
    categories: [
      {
        label: "Feel good",
        slugs: [
          "leek-and-potato-soup",
          "slow-cooker-chicken-soup",
          "healthy-chicken-pot-pie",
          "greek-lemon-chicken-soup-avgolemono",
          "authentic-hungarian-goulash",
          "slow-cooker-italian-pot-roast",
          "classic-baked-mac-and-cheese",
          "lemon-chicken-orzo-soup",
          "slow-cooker-ham-and-bean-soup",
          "braised-chicken-thighs",
          "japanese-chicken-curry",
          "cock-a-leekie-soup-for-burns-night",
          "easy-creamy-lasagna-soup",
        ],
      },
      {
        label: "Taste good",
        slugs: [
          "sweet-potato-shepherd-s-pie",
          "blood-orange-cake",
          "dark-chocolate-hot-cocoa",
          "braised-short-ribs-with-ancho-bbq-sacue",
          "salted-caramel-soft-gingerbread-cookies",
          "simple-coconut-chicken-tikka-masala",
          "chocolate-dipped-clementines-with-sea-salt",
          "katsudon-pork-cutlet-egg-rice-bowl",
          "meyer-lemon-cake",
          "japanese-katsu-curry-with-chicken-cutlets",
          "italian-hot-chocolate",
          "gingerbread-chocolate-trifle-with-swiss-meringue-candied-cranberries",
          "mexican-hot-chocolate",
        ],
      },
      {
        label: "Something different",
        slugs: [
          "ozoni-japanese-new-year-mochi-soup",
          "cotechino-con-lenticchie-for-a-healthy-and-prosperous-new-year-cotechino-and-lentils",
          "turkish-manti-lamb-dumplings",
          "red-pozole",
          "ginger-miso-dumpling-soup",
          "oaxacan-black-mole",
          "slow-cooker-chicken-thigh-hot-pot",
          "vegan-arroz-caldo",
          "oxtail-soup",
          "lebanese-stuffed-cabbage-rolls",
          "beef-pho-bone-broth",
          "natto-kimchi-donburi",
          "red-chile-pork-tamales-steamed-in-corn-husks",
        ],
      },
      {
        label: "Health & wellness",
        slugs: [
          "authentic-golden-milk-turmeric-milk-tea",
          "orange-ginger-tea",
          "orange-ginger-detox-smoothie",
          "drink-your-retinol-juice-shots",
          "carrot-orange-ginger-juice",
          "ginger-berry-fruit-smoothie",
          "orange-carrot-smoothie",
          "green-detox-smoothie",
        ],
      },
    ],
  },
  spring: {
    key: "spring",
    name: "Spring",
    blurb: "Peas, asparagus, rhubarb and everything green.",
    startMonth: 2,
    categories: [
      {
        label: "Feel good",
        slugs: [
          "light-and-tasty-pea-soup",
          "sheet-pan-lemon-herb-chicken",
          "pesto-pasta-with-asparagus-and-goat-cheese",
          "shrimp-and-asparagus-pouches-with-lemon-garlic-butter",
          "baked-salmon-with-fresh-herbs",
          "spinach-and-feta-greek-egg-bake",
          "pesto-pasta-with-shrimp-and-peas",
          "garlic-and-dill-roasted-salmon",
          "white-asparagus-soup",
          "creamy-pea-pesto-white-bean-skillet-vegan",
          "stuffed-shells-italian-recipe-using-ricotta-and-spinach",
          "bacon-and-potato-frittata",
          "greek-spinach-rice",
        ],
      },
      {
        label: "Taste good",
        slugs: [
          "strawberry-rhubarb-crumble-with-easy-3-ingredient-topping",
          "grilled-rack-of-lamb-with-honey-pasilla-glaze",
          "fronteras-famous-strawberry-shortcakes",
          "asparagus-pizza-with-parsley-chive-pesto",
          "rhubarb-pie",
          "carrot-cake-with-pineapple-and-cream-cheese-frosting",
          "strawberries-and-cream",
          "pizza-rustica-italian-easter-pie",
          "strawberry-rhubarb-cobbler",
          "roasted-leg-of-lamb-in-pasilla-black-olive-sauce",
          "rhubarb-eton-mess",
          "vegan-carrot-cake",
          "strawberry-muffins",
        ],
      },
      {
        label: "Something different",
        slugs: [
          "asparagus-and-ramp-pizza-with-lemon-mint-mascarpone",
          "strawberry-shiratama-dango",
          "green-olive-dressed-salad-with-mussels-and-fava-beans",
          "traditional-italian-dove-bread-for-easter-colomba-di-pasqua",
          "chicken-tacos-with-sorrel-salsa-verde",
          "aunt-rosa-s-very-best-rhubarb-fool",
          "spanish-leek-croquettes-croquetas-de-puerro",
          "fava-beans-recipe-italian-style",
          "root-to-top-carrot-pizza",
          "rhubarb-granita-with-whipped-cream-rhubarb-ice",
          "sourdough-discard-grilled-flatbread-with-asparagus-burrata-marinated-artichokes",
          "strawberry-matcha",
          "herb-green-ceviche",
        ],
      },
      {
        label: "Health & wellness",
        slugs: [
          "apple-ginger-green-smoothie",
          "strawberry-ginger-smoothie",
          "green-detox-smoothie",
          "vegan-matcha-banana-smoothie",
          "carrot-orange-ginger-juice",
          "berry-ginger-chia-smoothie",
          "cucumber-apple-green-smoothie",
          "berry-spinach-protein-smoothie",
        ],
      },
    ],
  },
  summer: {
    key: "summer",
    name: "Summer",
    blurb: "Cold soups, corn and things you don't need the oven for.",
    startMonth: 5,
    categories: [
      {
        label: "Feel good",
        slugs: [
          "chunky-gazpacho-chilled-tomato-soup",
          "panzanella-traditional-italian-bread-and-tomato-salad",
          "classic-ensenada-fish-tacos",
          "street-corn-pasta-salad",
          "grilled-new-york-strip-with-chimichurri",
          "lebanese-fattoush-salad",
          "everyday-steak-tacos",
          "pesto-pasta-salad-with-green-beans-and-corn",
          "simple-caprese-sandwich",
          "grilled-shrimp-tacos-with-cabbage-slaw",
          "baked-zucchini-italian-style-with-tomatoes-side-dish",
          "grilled-veggies-with-lemon-herb-vinaigrette",
          "creamy-zucchini-pasta-2",
        ],
      },
      {
        label: "Taste good",
        slugs: [
          "cowboy-butter-steak-tacos-with-corn-salsa",
          "peach-ricotta-snacking-cake",
          "fresh-corn-pizza-with-garlic-scape-pesto-red-onion-and-feta",
          "sweet-corn-ice-cream",
          "grilled-pork-tacos-al-pastor",
          "peach-lime-skillet-cake",
          "mexican-street-corn-jalape-o-poppers",
          "savory-peaches-and-cream-pizza-with-fresh-herbs-and-aged-goat-cheese",
          "slow-grilled-pork-shoulder-with-ancho-barbecue-sauce",
          "browned-butter-blueberry-white-chocolate-chunk-cookies",
          "peach-pizza-with-ricotta-and-prosciutto",
          "overnight-peach-french-toast-bake",
          "prosciutto-and-melon-prosciutto-e-melone",
        ],
      },
      {
        label: "Something different",
        slugs: [
          "hiyashi-chuka-cold-ramen",
          "xocos-watermelon-gazpacho",
          "shrimp-in-aguachile",
          "chilled-tanuki-udon",
          "nopal-cactus-salad",
          "watermelon-pizza",
          "tacos-arabes-with-cucumber-crema-and-chipotle-salsa",
          "zucchini-scallion-pancakes-with-soy-dipping-sauce",
          "summer-rolls-with-pineapple-glazed-crispy-tofu",
          "fried-zucchini-blossoms",
          "grill-roasted-whole-fish-adobado",
          "coconut-lime-ice-pops",
          "tropical-beach-ceviche",
        ],
      },
      {
        label: "Health & wellness",
        slugs: [
          "watermelon-agua-fresca",
          "blueberry-kale-power-smoothie-high-protein",
          "herby-lime-and-cucumber-agua-fresca",
          "jamaica-flower-cooler",
          "cucumber-agua-fresca-becomes-green-juice",
          "blueberry-mango-lime-smoothie",
          "tropical-green-smoothie",
          "mixed-berry-watermelon-smoothie",
        ],
      },
    ],
  },
  fall: {
    key: "fall",
    name: "Fall",
    blurb: "Squash, pears and something warm to drink.",
    startMonth: 8,
    categories: [
      {
        label: "Feel good",
        slugs: [
          "roasted-chicken-with-sweet-potatoes-and-pears",
          "pumpkin-soup-recipe-easy-and-freezes-well",
          "mushroom-pot-pie",
          "maple-dijon-roasted-chicken-with-fall-veggies-easy-one-pan-dinner",
          "crock-pot-slow-cooker-butternut-squash-soup",
          "sheet-pan-pork-chops-with-apples-onions-and-sweet-potatoes",
          "wild-rice-and-mushroom-soup",
          "butternut-squash-mac-and-cheese",
          "sausage-kale-and-butternut-squash-soup",
          "italian-sausage-and-mushroom-risotto",
          "chicken-soup-with-delicata-squash-and-kale",
          "beef-and-bean-chili",
          "mushroom-barley-soup",
        ],
      },
      {
        label: "Taste good",
        slugs: [
          "pumpkin-baked-brie",
          "great-grandma-s-old-fashioned-apple-pie",
          "pumpkin-gnocchi-with-butter-sage-sauce",
          "pumpkin-bread-with-streusel-and-brown-butter-glaze",
          "maple-bacon-pizza-with-apples-and-cheddar",
          "caramel-apple-bread-pudding",
          "mushroom-baked-brie",
          "salted-pecan-pie",
          "apple-fritter-focaccia",
          "pumpkin-cheese-fondue",
          "pear-cake-using-whole-pears-no-peeling-necessary",
          "apple-brie-rosette-pastries",
          "pumpkin-bars-with-cream-cheese-frosting",
        ],
      },
      {
        label: "Something different",
        slugs: [
          "soup-joumou-haitian-pumpkin-soup",
          "kabocha-brown-rice-soup",
          "chipotle-glazed-pork-with-persimmon-salsa",
          "japanese-sweet-potato-rice-satsumaimo-gohan",
          "brussels-sprout-pizza-with-grapes-and-gruyere",
          "kuri-or-butternut-or-pumpkin-soup-with-ancho-and-apple",
          "daigaku-imo-japanese-candied-sweet-potatoes",
          "stuffed-acorn-squash-with-farro-and-chorizo",
          "japanese-mushroom-rice-kinoko-gohan",
          "vegan-pumpkin-curry-with-coffee",
          "maple-persimmon-whipped-ricotta",
          "whole-kabocha-gratin",
          "kabocha-pumpkin-daifuku-mochi",
        ],
      },
      {
        label: "Health & wellness",
        slugs: [
          "apple-ginger-green-smoothie",
          "drink-your-retinol-juice-shots",
          "carrot-apple-ginger-green-smoothie",
          "authentic-golden-milk-turmeric-milk-tea",
          "orange-ginger-tea",
          "kale-pear-amp-peach-green-juice",
          "apple-cinnamon-smoothie",
          "authentic-golden-milk-turmeric-milk-tea",
        ],
      },
    ],
  },
};

/** Dec–Feb winter, Mar–May spring, Jun–Aug summer, Sep–Nov fall. */
export function seasonFor(date: Date = new Date()): Season {
  const month = date.getMonth();
  if (month === 11 || month <= 1) return SEASONS.winter;
  if (month <= 4) return SEASONS.spring;
  if (month <= 7) return SEASONS.summer;
  return SEASONS.fall;
}

/** Whole weeks since the first day of the season `date` falls in (0-based). */
export function weekOfSeason(date: Date = new Date()): number {
  const season = seasonFor(date);
  // Winter starts in December of the previous year when it's Jan/Feb.
  const year = date.getMonth() < season.startMonth ? date.getFullYear() - 1 : date.getFullYear();
  const start = new Date(year, season.startMonth, 1);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((today.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Orders a category's pool so this week's recipe comes first, followed by the
 * ones after it. The page shows the first slug that exists, so a missing
 * recipe falls through to next week's instead of leaving a gap.
 */
export function rotatedSlugs(category: SeasonCategory, week: number): string[] {
  const n = category.slugs.length;
  const offset = ((week % n) + n) % n;
  return [...category.slugs.slice(offset), ...category.slugs.slice(0, offset)];
}
