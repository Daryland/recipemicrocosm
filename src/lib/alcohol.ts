// Standing rule for this library: no alcoholic drink recipes, from any site.
// Food cooked with a splash of sake/wine and desserts with a little rum are fine.
const ALCOHOL_TITLE_RE =
  /\b(margarita|cocktail|sangria|mojito|daiquiri|spritz|martini|cosmopolitan|negroni|moscow mule|shandy|paloma|michelada|sidecar|highball|bellini|hurricane cocktail|salty dog|greyhound cocktail|seabreeze|(?<!torta )mimosas?|(?!crostini|bucatini)\w+tini|tinto de verano|sky juice|french 75|frozignon)\b|\b(ros[eé]|fros[eé])(?![a-z])/i;

// Drink-style title words and alcohol ingredients.
const DRINK_TITLE_RE =
  /\b(drinks?|cocktails?|spiked|boozy|jell-?o shots?|punch|toddy|mules?|coffee|latte|lemonade|limeade|cider|nog|shots?|smoothie|cooler|spritzer|slush|highball|chuhai|umeshu|sour|fizz|float)\b/i;
const ALCOHOL_INGREDIENT_RE =
  /\b(tequila|mezcal|rum|vodka|gin|whiske?y|bourbon|brandy|cognac|liqueur|triple sec|cointreau|grand marnier|kahl[uú]a|vermouth|campari|aperol|champagne|prosecco|sparkling wine|ros[eé] wine|ros[eé]|wine(?! ?vinegar)|port wine|beer|lager|stout|hard cider|sake|soju|shochu|umeshu|chartreuse|amaretto|schnapps|baileys|chambord|limoncello|licor|potable alcohol)\b/i;

// Frozen or jellied treats that are really a way to serve a spirit, e.g. "Gin Sorbet".
const SPIRIT_IN_TITLE_RE = /\b(gin|vodka|tequila|mezcal|rum|whiske?y|bourbon|sake|prosecco|champagne)\b/i;
const FROZEN_TREAT_RE = /\b(sorbet|granita|popsicles?|paletas?|ice pops?|slush(ie|y)?|jell-?o)\b/i;
// Fruit served soaked in a spirit, e.g. "Tequila Grapes", "Tipsy Grapes".
const SOAKED_FRUIT_RE = /\b(grapes|strawberries|cherries|watermelon)\b/i;
const TIPSY_RE = /\b(tipsy|drunken?|soaked)\b/i;

/**
 * True for alcoholic drinks (and spirit-forward frozen/jello treats). Requires
 * an alcohol ingredient, so "Shrimp Cocktail" or a dish named after a person
 * called Margarita isn't caught, and food cooked with a splash of wine is kept.
 */
export function isAlcoholicDrink(title: string, ingredients: string[]): boolean {
  const boozy = ingredients.filter((line) => ALCOHOL_INGREDIENT_RE.test(line)).length;
  if (boozy === 0) return false;
  const spiritTitle = SPIRIT_IN_TITLE_RE.test(title) || TIPSY_RE.test(title);
  return (
    ALCOHOL_TITLE_RE.test(title) ||
    DRINK_TITLE_RE.test(title) ||
    (spiritTitle && (FROZEN_TREAT_RE.test(title) || SOAKED_FRUIT_RE.test(title))) ||
    // Frozen treats where alcohol is a big share of the recipe (e.g. a vodka granita).
    (FROZEN_TREAT_RE.test(title) && boozy / ingredients.length >= 0.25)
  );
}
