// Sidebar categories and the keyword rules that assign them.
//
// Tags are worked out from a recipe's title and ingredient list (see tagRecipe)
// and stored on Recipe.tags; origin comes from cleaning up the scraped cuisine
// string (see originFor). Re-run `npm run db:tag` after changing any rules here.

export interface Category {
  slug: string;
  label: string;
}

export interface Section {
  key: "ingredient" | "dish" | "diet";
  title: string;
  items: Category[];
}

export const SECTIONS: Section[] = [
  {
    key: "ingredient",
    title: "Main ingredient",
    items: [
      { slug: "chicken", label: "Chicken" },
      { slug: "beef", label: "Beef" },
      { slug: "pork", label: "Pork" },
      { slug: "lamb", label: "Lamb & mutton" },
      { slug: "seafood", label: "Seafood" },
      { slug: "eggs", label: "Eggs" },
      { slug: "tofu-beans", label: "Tofu & beans" },
    ],
  },
  {
    key: "dish",
    title: "Dish type",
    items: [
      { slug: "noodles", label: "Noodles & pasta" },
      { slug: "rice", label: "Rice" },
      { slug: "curries", label: "Curries" },
      { slug: "soups", label: "Soups & stews" },
      { slug: "salads", label: "Salads" },
      { slug: "tacos-sandwiches", label: "Tacos & sandwiches" },
      { slug: "pizza", label: "Pizza" },
      { slug: "breads", label: "Breads & baking" },
      { slug: "desserts", label: "Desserts" },
      { slug: "breakfast", label: "Breakfast" },
      { slug: "drinks", label: "Drinks" },
      { slug: "sauces", label: "Sauces & condiments" },
      { slug: "pickles", label: "Pickles & ferments" },
    ],
  },
  {
    key: "diet",
    title: "Diet",
    items: [
      { slug: "vegetarian", label: "Vegetarian" },
      { slug: "vegan", label: "Vegan" },
      { slug: "dairy-free", label: "Dairy-free" },
    ],
  },
];

export const ALL_TAGS = new Set(SECTIONS.flatMap((s) => s.items.map((i) => i.slug)));

// Lowercase and strip accents so "Crème" matches "creme" and "Niçoise" matches "nicoise".
function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// ---------------------------------------------------------------------------
// Main ingredient
// ---------------------------------------------------------------------------

const PROTEINS: Record<string, RegExp> = {
  chicken: /\b(chicken|murgh|murg|kozhi|pollo)\b/,
  beef: /\b(beef|steaks?|brisket|short ribs?|oxtail|veal|sirloin|ribeye|rib eye|carne asada|bulgogi|pot roast|corned beef|barbacoa|birria|meatloaf)\b/,
  pork: /\b(pork|bacon|ham|prosciutto|pancetta|guanciale|chorizo|carnitas|al pastor|chicharrones?|salami|pepperoni|sausages?|bratwurst|lechon)\b/,
  lamb: /\b(lamb|mutton|goat|gosht|keema|rogan josh)\b/,
  seafood:
    /\b(seafood|fish|salmon|tuna|cod|shrimps?|prawns?|crabs?|lobsters?|scallops?|mussels?|clams?|oysters?|squid|calamari|octopus|sardines?|tilapia|halibut|mahi|snapper|trout|catfish|swordfish|bacalao|ceviche|meen|machli|jhinga|eral|nethili|vanjaram|pomfret|mackerel|anchovies)\b/,
  eggs: /\b(eggs?|omelett?e|frittata|quiche|shakshuka|anda|mutta|huevos)\b/,
  "tofu-beans":
    /\b(tofu|tempeh|edamame|chickpeas?|garbanzos?|lentils?|dal|dhal|daal|chana|chole|rajma|beans?|frijoles|hummus|falafel|moong|masoor|urad|toor|lobia|soya chunks)\b/,
};

// Words that put a protein word in a different meaning.
const NOT_PROTEIN: Record<string, RegExp> = {
  beef: /\b(cauliflower|tofu|mushroom|cabbage|portobello|eggplant|celeriac|watermelon|beet) steaks?\b/,
  pork: /\b(vegan|vegetarian|veggie|plant[- ]based|meatless) (sausages?|bacon|chorizo)\b/,
  lamb: /\bgoat'?s? (cheese|milk|yogh?urt|butter|kefir)\b/,
  seafood: /\b(oyster mushrooms?|oyster sauce|fish sauce|fish-free|vegan fish|cod liver oil|crab apples?)\b/,
  eggs: /\b(eggplants?|eggless|egg[- ]free|egg noodles?|egg rolls?|egg replacer|flax eggs?|chia eggs?)\b/,
  "tofu-beans":
    /\b(green beans?|string beans?|french beans?|coffee beans?|vanilla beans?|jelly beans?|bean sprouts|cocoa beans?|bean paste|beanless)\b/,
};

// Ingredient lines that mention a meat without it being the main thing.
const SUPPORTING_LINE = /\b(stock|broth|bouillon|base|fat|drippings|grease|bones?|gelatin|sauce|paste|powder|seasoning|extract|optional|garnish)\b/;

function hasProtein(slug: string, text: string) {
  if (!PROTEINS[slug].test(text)) return false;
  const not = NOT_PROTEIN[slug];
  // Only reject when every mention is the other meaning.
  return !not || PROTEINS[slug].test(text.replace(new RegExp(not.source, "g"), " "));
}

function mainIngredients(title: string, ingredients: string[]): string[] {
  const found = new Set<string>();
  for (const slug of Object.keys(PROTEINS)) if (hasProtein(slug, title)) found.add(slug);
  // Meats and seafood can also come from the ingredient list (a "Biryani" made with chicken).
  // Eggs and beans only count from the title: they're too often a minor ingredient.
  for (const slug of ["chicken", "beef", "pork", "lamb", "seafood"]) {
    if (found.has(slug)) continue;
    if (ingredients.some((line) => !SUPPORTING_LINE.test(line) && !MEAT_SUBSTITUTE.test(line) && hasProtein(slug, line))) {
      found.add(slug);
    }
  }
  return [...found];
}

// ---------------------------------------------------------------------------
// Dish type (title-based, plus a few hints from the scraped cuisine value)
// ---------------------------------------------------------------------------

const DISHES: Record<string, RegExp> = {
  noodles:
    /\b(noodles?|pasta|spaghetti|linguine|fettuccine|fettucine|penne|rigatoni|macaroni|mac (and|&|n'?) cheese|lasagna|lasagne|ramen|udon|soba|pho|lo mein|chow mein|pad thai|pad see ew|ravioli|tortellini|gnocchi|gnudi|orzo|vermicelli|sevai|semiya|seviyan|hakka|carbonara|cacio e pepe|bucatini|pappardelle|farfalle|fusilli|orecchiette|ziti|tagliatelle|japchae|yakisoba|laksa|zoodles?)\b/,
  rice:
    /\b(rice|risotto|biryani|biriyani|pulao|pilaf|pilau|paella|jambalaya|congee|arroz|bibimbap|donburi|onigiri|sushi|khichdi|kichdi|pongal|bisibelebath|bisi bele bath|vangi bath|puliyogare|tahdig)\b/,
  curries:
    /\b(curry|curries|korma|kurma|vindaloo|tikka masala|makhani|kadai|kadhai|karahi|kuzhambu|kulambu|kozhambu|sabzi|sabji|subzi|saag|palak paneer|rogan josh|kofta|dal makhani|dal tadka|dal fry|chole|rajma masala|paneer butter masala|salna|masala)\b/,
  soups:
    /\b(soups?|stews?|chowders?|bisque|gumbo|pozole|posole|menudo|goulash|tagine|rasam|sambar|sambhar|pho|ramen|broth|minestrone|gazpacho|borscht|chili con carne|cioppino|bouillabaisse|caldo|sopa|dal shorba|shorba|consomme)\b|\bchili\b(?!\s*(crisp|oil|lime|sauce|garlic|paste|powder|flakes|crunch|glazed|mango|honey|maple|butter|pepper|chicken|paneer|potato|mushroom|prawns?|shrimp|baby corn|gobi|idli|cheese))/,
  salads: /\b(salads?|slaw|coleslaw|kachumber|kosambari)\b/,
  "tacos-sandwiches":
    /\b(tacos?|burritos?|quesadillas?|tostadas?|enchiladas?|fajitas?|sandwich(es)?|burgers?|sliders?|wraps?|subs?|panini|banh mi|sloppy joes?|grilled cheese|tortas?|gyros?|shawarma|kathi roll|frankie|hot dogs?|po'? ?boys?|french dip|pita pockets?|vada pav|pav bhaji|bao)\b/,
  pizza: /\b(pizzas?|calzones?|stromboli|pizza dough|flatbread pizza)\b/,
  breads:
    /\b(breads?|buns?|rolls?|biscuits?|scones?|muffins?|bagels?|focaccia|brioche|croissants?|naan|roti|chapati|chapathi|paratha|parotta|porotta|puri|poori|kulcha|bhatura|tortillas?|pitas?|flatbreads?|sourdough|pretzels?|crackers?|cornbread|babka|challah|danish|pastr(y|ies)|pie crust|dough|loaf|loaves|bread rolls?|appam|kulcha)\b/,
  desserts:
    /\b(cakes?|cupcakes?|cookies?|brownies?|blondies?|pies?|tarts?|tartlets?|puddings?|custards?|ice cream|gelato|sorbet|sherbet|cheesecakes?|fudge|truffles?|candy|candies|toffee|caramels?|mousse|panna cotta|flan|crumble|cobbler|crisp|halwa|halva|kheer|payasam|ladoo|laddu|laddoo|barfi|burfi|gulab jamun|rasgulla|rasmalai|jalebi|mysore pak|peda|kesari|macarons?|macaroons?|meringues?|pavlova|tiramisu|donuts?|doughnuts?|frosting|buttercream|icing|popsicles?|kulfi|sundaes?|parfaits?|baklava|churros?|cinnamon rolls?|dessert|sweets?|shrikhand|basundi|rabri|mithai|souffle|clafoutis|eclairs?|cannoli|biscotti|shortbread|bars|bark|mochi|zeppole|bundt|galette|trifle|bread pudding|brittle|praline|semifreddo|granita|chocolate)\b/,
  breakfast:
    /\b(breakfast|brunch|pancakes?|waffles?|french toast|oatmeal|overnight oats|porridge|granola|muesli|crepes?|omelett?e|frittata|scrambled eggs|eggs benedict|hash browns?|smoothie bowl|idli|idly|dosa|dosai|upma|poha|uttapam|uthappam|pesarattu|appam|shakshuka|quiche|strata|chia pudding|baked oats|cereal|bagel)\b/,
  drinks:
    /\b(drinks?|smoothies?|juices?|lemonade|limeade|tea|chai|latte|coffee|cafezinho|espresso|milkshakes?|shakes?|lassi|kombucha|kefir|tonic|mocktails?|punch|cider|hot chocolate|hot cocoa|horchata|agua fresca|soda|ginger beer|sharbat|sherbet|falooda|buttermilk|chaas|eggnog|kvass|tepache|shrub|infusion|frappe|cold brew|kadha|kashayam|panakam|nannari|jigarthanda|thandai|badam milk|rose milk|banana milk|golden milk|haldi doodh|sea moss drink)\b/,
  sauces:
    /\b(sauces?|salsas?|chutneys?|dips?|dressings?|vinaigrettes?|pesto|aioli|mayo(nnaise)?|ketchup|mustard|gravy|relish|jam|jelly|marmalade|preserves|compote|apple butter|pear butter|pumpkin butter|sweet potato butter|compound butter|herb butter|spice (blend|mix)|seasoning|masala powder|podi|garam masala|rub|syrups?|chili oil|chili crisp|paste|hummus|tzatziki|raita|guacamole|spreads?|glaze|marinade|ghee|gochujang|harissa|chimichurri|tahini|thokku|epis|orgeat|pachadi|vinagreta|aderezo|brown butter|browned butter)\b/,
  pickles:
    /\b(pickles?|pickled|achar|achaar|avakaya|kimchi|sauerkraut|ferment(ed|ing|s)?|kombucha|kefir|preserved lemons?|ginger bug|vinegar|cured egg yolks?|tepache|kvass|lacto)\b/,
};

const NOT_DISH: Record<string, RegExp> = {
  rice: /\b(rice paper|rice flour|rice noodles?|rice vinegar|rice cakes?|rice krispies?|cauliflower rice)\b/,
  // "Sweet potato", "sweet corn", "sweet and sour" aren't desserts; savory pies and tarts aren't either.
  desserts:
    /\b(sweet (potato|potatoes|corn|chili|chilli|and sour|pepper|peppers|onion|onions|soy)|shepherd'?s pie|cottage pie|pot pie|chicken pie|pork pie|meat pie|polenta pie|fish pie|tomato tart|onion tart|sunchoke tart|savory|savoury|crispy|chili crisp|chocolate stout cake)\b/,
  // "Cookie butter", "coffee cake", "tea cake" aren't drinks; "chai spiced" baking isn't either.
  drinks: /\b(coffee cake|tea cakes?|tea sandwich(es)?|chai spiced|coffee (bbq|rub|cookies?|cake)|tea time|soda bread|cider vinegar|hard cider|cider (donuts?|doughnuts?|bundt))\b/,
  breads: /\b(spring rolls?|egg rolls?|cabbage rolls?|sushi rolls?|maki rolls?|kathi rolls?|meatloaf|bread pudding)\b/,
  curries: /\b(masala (chai|tea|powder|dosa|vada|peanuts?|papad|corn|fries|omelett?e|pasta|maggi|oats|puri|poori))\b/,
};

// Cuisine values that are really a dish type.
const CUISINE_DISH: Record<string, string> = { pizza: "pizza", beverages: "drinks", desserts: "desserts" };

// Dish types whose words only count at the end of the recipe's name, so "Basil Pesto"
// is a sauce but "Pesto Pasta" and "Mustard Chicken" aren't, and "Mango Pickle" is a
// pickle but "Kimchi Udon" isn't.
const END_ONLY = new Set(["sauces", "pickles"]);
// Extra name patterns: "Pickled Red Onions", "Fermented Honey Garlic", "Persimmon Vinegar".
const NAME_EXTRA: Record<string, RegExp> = {
  pickles: /^((quick|refrigerator|lacto[- ]?) )*(pickled|fermented)\b|\bvinegar$/,
};
// Dish types matched anywhere in the recipe's name but not in its SEO tail or
// parentheses, so "Pumpkin Curry (with coffee!)" isn't a drink.
const NAME_ONLY = new Set(["drinks"]);

// The recipe's name without SEO tails: "How to Make Tomato Chutney Recipe | Easy Chutney" → "tomato chutney".
function nameOf(title: string) {
  return title
    .split(/\s\|\s|\s\(|\swith\s/)[0]
    .replace(/^how to (make|cook|prepare)\s+(an? )?/, "")
    .replace(/\b(recipes?|homemade|easy|quick and easy|best|simple|the|at home)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasDish(slug: string, title: string) {
  if (NAME_EXTRA[slug]?.test(nameOf(title))) return true;
  if (END_ONLY.has(slug)) return new RegExp(`(${DISHES[slug].source})$`).test(nameOf(title));
  if (NAME_ONLY.has(slug)) title = nameOf(title);
  const rule = DISHES[slug];
  if (!rule.test(title)) return false;
  const not = NOT_DISH[slug];
  return !not || rule.test(title.replace(new RegExp(not.source, "g"), " "));
}

// ---------------------------------------------------------------------------
// Diet (ingredient-based; a recipe needs a real ingredient list to qualify)
// ---------------------------------------------------------------------------

const MEAT =
  /\b(chicken|beef|pork|lamb|mutton|goat|veal|turkey|duck|goose|venison|elk|bison|rabbit|bacon|ham|prosciutto|pancetta|guanciale|salami|pepperoni|chorizo|sausages?|hot dogs?|jerky|lard|gelatine?|liver|oxtail|brisket|steaks?|meat|meatballs?|keema|seafood|fish|salmon|tuna|cod|shrimps?|prawns?|crabs?|lobsters?|scallops?|mussels?|clams?|oysters?|squid|calamari|octopus|anchov(y|ies)|sardines?|tilapia|halibut|mahi|snapper|trout|catfish|swordfish|bacalao|bonito|dashi|worcestershire|caviar|roe|eel|pomfret|mackerel|suet|bone marrow)\b/;
const NOT_MEAT =
  /\b(oyster mushrooms?|duck eggs?|vegan \w+|plant[- ]based \w+|meatless|mock \w+|faux \w+|imitation \w+|soya? chunks|veggie \w+|vegetarian \w+|(cauliflower|tofu|mushroom|cabbage|portobello) steaks?|kombu dashi|shiitake dashi|vegan worcestershire|coconut meat|crab apples?|fish-free|goat'?s? (cheese|milk|yogh?urt|butter|kefir))\b/;
// Lines that are only there as a swap, e.g. "chicken or vegetable stock" still counts as meat (strict).
const MEAT_SUBSTITUTE = /\b(vegan|plant[- ]based|meatless|mock|faux|imitation|vegetarian|veggie|tofu|seitan|jackfruit)\b/;

const DAIRY =
  /\b(milk|butter|buttermilk|cream|cheese|parmesan|parmigiano|pecorino|mozzarella|cheddar|feta|ricotta|mascarpone|gruyere|brie|paneer|halloumi|gouda|provolone|cotija|queso|burrata|ghee|yogh?urt|curds?|dahi|whey|khoy?a|khoa|mawa|malai|sour cream|creme fraiche|half[- ]and[- ]half|custard|ice cream|kefir|casein|lassi|rabri|chhena|chenna)\b/;
const NOT_DAIRY =
  /\b((almond|oat|soy|soya|coconut|cashew|rice|hemp|plant[- ]based|non[- ]dairy|dairy[- ]free|vegan|macadamia|pea|flax) (milk|butter|cream|cheese|yogh?urt|curd|ice cream|kefir|creamer)|(peanut|almond|cashew|nut|sunflower|seed|cocoa|cacao|shea|apple|pear|pumpkin|sweet potato|cookie|soy|sunbutter) butter|butternut|butter beans?|butter lettuce|cream of tartar|bean curd|lemon curd|water kefir|coconut cream|cashew cream|nutritional yeast|vegan \w+|dairy[- ]free \w+|milk thistle|milk chocolate chips?)\b/;
const EGG = /\b(eggs?|yolks?|egg whites?|mayo(nnaise)?|meringue|aioli)\b/;
const NOT_EGG = /\b(eggplants?|egg replacer|flax eggs?|chia eggs?|eggless|egg[- ]free|vegan (mayo|mayonnaise|aioli|egg)|just egg)\b/;
const HONEY = /\b(honey)\b/;
const NOT_HONEY = /\b(honeydew|honeycrisp|vegan honey|honey ?nut)\b/;

const lineHas = (lines: string[], yes: RegExp, no: RegExp) => lines.some((l) => yes.test(l.replace(new RegExp(no.source, "g"), " ")));

function diets(title: string, ingredients: string[]): string[] {
  const titleVegan = /\bvegan\b/.test(title);
  const titleVegetarian = titleVegan || /\bvegetarian\b/.test(title);
  const titleDairyFree = titleVegan || /\b(dairy[- ]free|non[- ]dairy)\b/.test(title);
  // Too little to judge (a 1-line ingredient list is usually a parsing gap).
  if (ingredients.length < 2) {
    return [titleVegetarian && "vegetarian", titleVegan && "vegan", titleDairyFree && "dairy-free"].filter(Boolean) as string[];
  }
  const meat = lineHas(ingredients, MEAT, NOT_MEAT) || PROTEINS.chicken.test(title) || PROTEINS.beef.test(title) || PROTEINS.seafood.test(title);
  const dairy = lineHas(ingredients, DAIRY, NOT_DAIRY);
  const egg = lineHas(ingredients, EGG, NOT_EGG);
  const honey = lineHas(ingredients, HONEY, NOT_HONEY);

  const vegetarian = titleVegetarian || !meat;
  const vegan = titleVegan || (vegetarian && !dairy && !egg && !honey);
  const dairyFree = titleDairyFree || !dairy;
  return [vegetarian && "vegetarian", vegan && "vegan", dairyFree && "dairy-free"].filter(Boolean) as string[];
}

/** The `tags` and `origin` columns for a new recipe, to spread into a create() call. */
export function taxonomyFields(title: string, ingredients: string[], cuisine?: string | null) {
  return { tags: tagRecipe(title, ingredients, cuisine).sort(), origin: originFor(cuisine) };
}

/** All sidebar tags for a recipe: main ingredients, dish types and diets. */
export function tagRecipe(rawTitle: string, rawIngredients: string[], rawCuisine?: string | null): string[] {
  const title = normalize(rawTitle);
  const ingredients = rawIngredients.map(normalize).filter((l) => !/:$/.test(l.trim()));
  const tags = new Set<string>(mainIngredients(title, ingredients));
  for (const slug of Object.keys(DISHES)) if (hasDish(slug, title)) tags.add(slug);
  // A pie or tart named for its meat ("Scottish Steak Pie") isn't a dessert.
  if (["chicken", "beef", "pork", "lamb", "seafood"].some((m) => hasProtein(m, title))) tags.delete("desserts");
  const cuisineDish = CUISINE_DISH[normalize(rawCuisine ?? "").trim()];
  if (cuisineDish) tags.add(cuisineDish);
  for (const d of diets(title, ingredients)) tags.add(d);
  if (normalize(rawCuisine ?? "").trim() === "vegan") ["vegan", "vegetarian", "dairy-free"].forEach((d) => tags.add(d));
  return [...tags];
}

// ---------------------------------------------------------------------------
// Origin: the scraped cuisine string, cleaned up and grouped by region
// ---------------------------------------------------------------------------

export const REGIONS: { name: string; origins: string[] }[] = [
  {
    name: "Asia",
    origins: [
      "Indian", "Indo-Chinese", "Pakistani", "Sri Lankan", "Chinese", "Taiwanese", "Japanese", "Korean", "Thai",
      "Vietnamese", "Filipino", "Malaysian", "Indonesian", "Singaporean", "Burmese", "Pan-Asian",
    ],
  },
  {
    name: "Americas",
    origins: ["American", "Cajun", "Hawaiian", "Tex-Mex", "Mexican", "Caribbean", "Latin American", "Peruvian"],
  },
  {
    name: "Europe",
    origins: [
      "Italian", "French", "Spanish", "Greek", "Mediterranean", "British", "Irish", "Scottish", "German", "Austrian",
      "Swiss", "Dutch", "Belgian", "Hungarian", "Russian", "Swedish", "Danish", "Finnish",
    ],
  },
  {
    name: "Middle East & Africa",
    origins: ["Middle Eastern", "Lebanese", "Turkish", "Israeli", "Jewish", "Afghan", "Moroccan", "Egyptian", "Ethiopian", "African"],
  },
  { name: "Oceania", origins: ["Australian"] },
];

export const REGION_OF = new Map(REGIONS.flatMap((r) => r.origins.map((o) => [o, r.name] as const)));

// Raw scraped cuisine values (lowercased) that need renaming. Anything that
// already matches an origin name is used as-is.
const ORIGIN_ALIASES: Record<string, string> = {
  "south indian": "Indian", "north indian": "Indian", kerala: "Indian", andhra: "Indian", bengal: "Indian",
  gujarat: "Indian", chettinad: "Indian", hyderabad: "Indian", maharashtra: "Indian", goan: "Indian", india: "Indian",
  bihar: "Indian", "indo chinese": "Indo-Chinese", pakisthani: "Pakistani", srilankan: "Sri Lankan",
  japan: "Japanese", thailand: "Thai", phillipines: "Filipino", philippines: "Filipino", singapore: "Singaporean",
  asian: "Pan-Asian", "chinese-american": "Chinese",
  amish: "American", hawaii: "Hawaiian", jamaican: "Caribbean", jamaica: "Caribbean", "puerto rican": "Caribbean",
  venetian: "Italian", france: "French", spain: "Spanish", "canary island": "Spanish", canarian: "Spanish",
  greece: "Greek", britain: "British", england: "British", english: "British", welsh: "British",
  ireland: "Irish", germany: "German", austria: "Austrian", belgium: "Belgian", hungary: "Hungarian",
  arabian: "Middle Eastern", arabic: "Middle Eastern", babylonian: "Middle Eastern",
  "ancient mesopotamia": "Middle Eastern", israel: "Israeli", morocco: "Moroccan", egypt: "Egyptian",
};

const ORIGIN_BY_LOWER = new Map([...REGION_OF.keys()].map((o) => [o.toLowerCase(), o]));

/** Clean origin name for a scraped cuisine value, or null for non-origins like "Other" or "Pizza". */
export function originFor(cuisine: string | null | undefined): string | null {
  if (!cuisine) return null;
  // "European - Irish" → "Irish"
  const value = (cuisine.includes(" - ") ? cuisine.split(" - ").pop()! : cuisine).trim().toLowerCase();
  return ORIGIN_ALIASES[value] ?? ORIGIN_BY_LOWER.get(value) ?? null;
}
