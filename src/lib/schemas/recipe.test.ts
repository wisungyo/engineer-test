import { describe, test, expect } from "vitest";
import { RecipeSchema, IngredientSchema } from "./recipe";
import { RecipeModel } from "@/lib/models/recipe";

const validRecipe = {
    title: "Classic Spaghetti",
    description: "A simple pasta dish with tomato sauce.",
    servings: 4,
    prepMin: 10,
    cookMin: 20,
    difficulty: "easy" as const,
    tags: ["quick", "comfort"],
    ingredients: [
        { name: "Spaghetti", qty: 400, unit: "g" },
        { name: "Tomato sauce", qty: 500, unit: "ml" },
    ],
    steps: ["Boil salted water.", "Cook pasta for 10 minutes.", "Heat the sauce and combine."],
};

describe("RecipeSchema", () => {
    test("accepts a valid recipe", () => {
        const result = RecipeSchema.safeParse(validRecipe);
        expect(result.success).toBe(true);
    });

    test("rejects a recipe with missing title field", () => {
        const { title: _title, ...noTitle } = validRecipe;
        const result = RecipeSchema.safeParse(noTitle);
        expect(result.success).toBe(false);
    });

    test("rejects an invalid difficulty value", () => {
        const result = RecipeSchema.safeParse({
            ...validRecipe,
            difficulty: "extreme",
        });
        expect(result.success).toBe(false);
    });

    test("accepts zero prepMin (business rules are not enforced here)", () => {
        // Note: the candidate is responsible for adding the total-time > 0 rule
        const result = RecipeSchema.safeParse({ ...validRecipe, prepMin: 0, cookMin: 0 });
        expect(result.success).toBe(true);
    });

    test("accepts duplicate ingredient names (dedup is a business rule)", () => {
        // Note: the candidate is responsible for deduplication logic
        const result = RecipeSchema.safeParse({
            ...validRecipe,
            ingredients: [
                { name: "Salt", qty: 5, unit: "g" },
                { name: "salt", qty: 3, unit: "g" }, // duplicate — accepted at schema level
            ],
        });
        expect(result.success).toBe(true);
    });
});

describe("RecipeModel", () => {
    test("can create and retrieve a recipe document", async () => {
        const created = await RecipeModel.create(validRecipe);
        expect(created._id).toBeDefined();
        expect(created.title).toBe("Classic Spaghetti");

        const found = await RecipeModel.findById(created._id).lean();
        expect(found).not.toBeNull();
        expect(found?.title).toBe("Classic Spaghetti");
    });
});
