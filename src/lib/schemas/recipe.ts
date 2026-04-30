import { z } from 'zod';
import mongoose, { type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Zod schemas — define SHAPE only.
// Business rules (uniqueness, length limits, dedup logic, etc.) are NOT
// enforced here; they are part of the interview challenge for the candidate.
// ---------------------------------------------------------------------------

export const IngredientSchema = z.object({
  name: z.string(),
  qty: z.number(),
  unit: z.string(),
});

export type TIngredient = z.infer<typeof IngredientSchema>;

export const RecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  servings: z.number().int().positive(),
  prepMin: z.number().int().nonnegative(),
  cookMin: z.number().int().nonnegative(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.array(z.string()),
  ingredients: z.array(IngredientSchema),
  steps: z.array(z.string()),
});

export type TCreateRecipeInput = z.infer<typeof RecipeSchema>;

// ---------------------------------------------------------------------------
// RecipeFormSchema — enforces all business rules except title uniqueness
// (rule 1 requires an async DB check and must be handled outside Zod).
// Use this on both client and server for consistent validation.
// ---------------------------------------------------------------------------

export const RecipeFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required'),
    description: z.string(),
    servings: z.number().int().positive('Servings must be a positive integer'),
    prepMin: z.number().int().nonnegative('Prep time must be 0 or more'),
    cookMin: z.number().int().nonnegative('Cook time must be 0 or more'),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    // Rule 4: max 5 tags, each 2–20 chars matching ^[a-z0-9-]+$
    tags: z
      .array(
        z
          .string()
          .min(2, 'Each tag must be at least 2 characters')
          .max(20, 'Each tag must be at most 20 characters')
          .regex(/^[a-z0-9-]+$/, 'Tags must only contain lowercase letters, numbers, and hyphens'),
      )
      .max(5, 'Maximum 5 tags allowed'),
    // Rule 3 (count + shape): min 1, max 50 — duplicate check is in superRefine
    ingredients: z
      .array(z.object({ name: z.string(), qty: z.number(), unit: z.string() }))
      .min(1, 'Must have at least 1 ingredient')
      .max(50, 'Maximum 50 ingredients allowed'),
    // Rule 5: max 30 steps, each 5–500 chars
    steps: z
      .array(
        z
          .string()
          .min(5, 'Each step must be at least 5 characters')
          .max(500, 'Each step must be at most 500 characters'),
      )
      .max(30, 'Maximum 30 steps allowed'),
  })
  .superRefine((data, ctx) => {
    // Rule 2: prepMin + cookMin must be > 0 and ≤ 1440
    const totalTime = data.prepMin + data.cookMin;
    if (totalTime <= 0 || totalTime > 1440) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['prepMin'],
        message: 'Total time (prepMin + cookMin) must be between 1 and 1440 minutes',
      });
    }
    // Rule 3 (uniqueness): no duplicate ingredient names, case-insensitive
    const seen = new Set<string>();
    data.ingredients.forEach((ing, idx) => {
      const key = ing.name.trim().toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ingredients', idx, 'name'],
          message: 'Ingredient names must be unique (case-insensitive)',
        });
      }
      seen.add(key);
    });
  });

export type TRecipeFormInput = z.infer<typeof RecipeFormSchema>;

export const RecipeDocumentSchema = RecipeSchema.extend({
  _id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TRecipeDocument = z.infer<typeof RecipeDocumentSchema>;

// ---------------------------------------------------------------------------
// Mongoose schema
// ---------------------------------------------------------------------------

const ingredientMongooseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    unit: { type: String, required: true },
  },
  { _id: false }
);

const recipeMongooseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    servings: { type: Number, required: true },
    prepMin: { type: Number, required: true },
    cookMin: { type: Number, required: true },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
    },
    tags: [{ type: String }],
    ingredients: [ingredientMongooseSchema],
    steps: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

// HMR-safe model creation (prevents "Cannot overwrite model" error in Next.js dev)
export const RecipeModel: Model<TCreateRecipeInput & Document> =
  (mongoose.models['Recipe'] as Model<TCreateRecipeInput & Document> | undefined) ??
  mongoose.model<TCreateRecipeInput & Document>('Recipe', recipeMongooseSchema);
