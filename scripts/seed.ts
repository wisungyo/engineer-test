import { connectDB } from "@/lib/db";
import { RecipeModel } from "@/lib/models/recipe";
import type { TCreateRecipeInput } from "@/lib/schemas/recipe";

// Deterministic PRNG — mulberry32 with fixed seed 0xC0FFEE.
// Do NOT replace with Math.random(): seed output must be identical across runs.
function mulberry32(seed: number) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const rand = mulberry32(0xc0ffee);

function pick<T>(arr: readonly T[]): T {
    const item = arr[Math.floor(rand() * arr.length)];
    if (item === undefined) throw new Error("empty array");
    return item;
}

function pickN<T>(arr: readonly T[], n: number): T[] {
    const shuffled = [...arr].sort(() => rand() - 0.5);
    return shuffled.slice(0, n);
}

function randInt(min: number, max: number): number {
    return Math.floor(rand() * (max - min + 1)) + min;
}

const ADJECTIVES = [
    "Spicy",
    "Creamy",
    "Quick",
    "Classic",
    "Hearty",
    "Light",
    "Smoky",
    "Tangy",
    "Sweet",
    "Crispy",
    "Rustic",
    "Fresh",
    "Golden",
    "Zesty",
    "Rich",
    "Simple",
    "Bold",
    "Warm",
    "Cool",
    "Crunchy",
] as const;

const NOUNS = [
    "Pasta",
    "Curry",
    "Salad",
    "Stew",
    "Tacos",
    "Soup",
    "Stir-fry",
    "Bowl",
    "Casserole",
    "Wrap",
    "Pie",
    "Roast",
    "Gratin",
    "Risotto",
    "Fritters",
    "Skillet",
    "Bake",
    "Broth",
    "Medley",
    "Blend",
] as const;

const DESCRIPTIONS = [
    "A comforting dish perfect for weeknight dinners.",
    "Ready in under 30 minutes with minimal cleanup.",
    "A family favourite that never disappoints.",
    "Packed with vegetables and full of flavour.",
    "Inspired by traditional recipes with a modern twist.",
    "Great for meal prep — stays fresh for days.",
    "Crowd-pleasing and endlessly customisable.",
    "Light yet satisfying, perfect for any season.",
    "Layers of flavour developed with simple techniques.",
    "The kind of recipe you will come back to every week.",
] as const;

const INGREDIENT_POOL = [
    { name: "olive oil", unit: "tbsp" },
    { name: "garlic", unit: "cloves" },
    { name: "onion", unit: "medium" },
    { name: "salt", unit: "tsp" },
    { name: "black pepper", unit: "tsp" },
    { name: "chicken breast", unit: "g" },
    { name: "pasta", unit: "g" },
    { name: "tomatoes", unit: "g" },
    { name: "basil", unit: "g" },
    { name: "parmesan", unit: "g" },
    { name: "lemon juice", unit: "ml" },
    { name: "butter", unit: "g" },
    { name: "flour", unit: "g" },
    { name: "milk", unit: "ml" },
    { name: "eggs", unit: "large" },
    { name: "cumin", unit: "tsp" },
    { name: "paprika", unit: "tsp" },
    { name: "chili flakes", unit: "tsp" },
    { name: "vegetable broth", unit: "ml" },
    { name: "chickpeas", unit: "g" },
    { name: "spinach", unit: "g" },
    { name: "carrots", unit: "g" },
    { name: "celery", unit: "stalks" },
    { name: "potatoes", unit: "g" },
    { name: "rice", unit: "g" },
    { name: "coconut milk", unit: "ml" },
    { name: "soy sauce", unit: "tbsp" },
    { name: "ginger", unit: "tsp" },
    { name: "honey", unit: "tbsp" },
    { name: "lime juice", unit: "tbsp" },
] as const;

const STEP_TEMPLATES = [
    "Preheat the oven to {temp}°C.",
    "Chop all vegetables into bite-sized pieces.",
    "Heat oil in a large pan over medium heat.",
    "Cook the onion and garlic until softened, about 3 minutes.",
    "Add the remaining ingredients and stir to combine.",
    "Season with salt and pepper to taste.",
    "Simmer on low heat for {time} minutes.",
    "Remove from heat and let rest for 5 minutes.",
    "Garnish and serve immediately.",
    "Transfer to a baking dish and bake for {time} minutes.",
    "Bring a large pot of salted water to a boil.",
    "Cook until tender or per package instructions.",
    "Deglaze the pan with a splash of broth.",
    "Fold in the fresh herbs just before serving.",
    "Adjust seasoning to your preference.",
] as const;

const TAGS_POOL = [
    "quick",
    "vegan",
    "spicy",
    "comfort",
    "healthy",
    "kid-friendly",
    "one-pot",
    "gluten-free",
    "vegetarian",
    "high-protein",
    "meal-prep",
    "easy",
    "weeknight",
    "summer",
    "winter",
] as const;

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

const SERVINGS_POOL = [2, 4, 4, 6, 6, 8] as const;

function generateTitle(index: number): string {
    const adj = pick(ADJECTIVES);
    const noun = pick(NOUNS);
    // Index suffix guarantees 100 unique titles even when random adj+noun collide.
    return `${adj} ${noun} #${index + 1}`;
}

function generateRecipe(index: number): TCreateRecipeInput {
    const ingredientCount = randInt(3, 8);
    const pickedIngredients = pickN(INGREDIENT_POOL, ingredientCount).map((ing) => ({
        name: ing.name,
        qty: randInt(1, 500),
        unit: ing.unit,
    }));

    const stepCount = randInt(3, 6);
    const steps = Array.from({ length: stepCount }, () => {
        const template = pick(STEP_TEMPLATES);
        return template.replace("{temp}", String(randInt(160, 220))).replace("{time}", String(randInt(5, 40)));
    });

    return {
        title: generateTitle(index),
        description: pick(DESCRIPTIONS),
        servings: pick(SERVINGS_POOL),
        prepMin: randInt(5, 30),
        cookMin: randInt(10, 60),
        difficulty: pick(DIFFICULTIES),
        tags: pickN(TAGS_POOL, randInt(1, 4)),
        ingredients: pickedIngredients,
        steps,
    };
}

export async function seed() {
    await connectDB();
    const recipes = Array.from({ length: 100 }, (_, i) => generateRecipe(i));
    await RecipeModel.deleteMany({});
    await RecipeModel.insertMany(recipes);
    console.log(`✅ Seeded ${recipes.length} recipes`);
}

// Only self-invoke when run directly via tsx, not when imported
// (e.g. from src/instrumentation.ts or src/app/api/admin/reset/route.ts).
const invokedPath = process.argv[1] ?? "";
const isDirectRun = invokedPath.endsWith("scripts/seed.ts") || invokedPath.endsWith("scripts/seed.js");

if (isDirectRun) {
    seed()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error("Seed failed:", err);
            process.exit(1);
        });
}
