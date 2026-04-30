import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { RecipeModel } from "@/lib/models/recipe";

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// All fields are required — the edit form always sends a complete payload.
const PatchSchema = z
    .object({
        title: z.string().trim().min(1, "Title is required"),
        description: z.string(),
        servings: z.number().int().positive("Servings must be a positive integer"),
        prepMin: z.number().int().nonnegative("Prep time must be 0 or more minutes"),
        cookMin: z.number().int().nonnegative("Cook time must be 0 or more minutes"),
        difficulty: z.enum(["easy", "medium", "hard"]),
        // Rule 4: max 5 tags, each 2–20 chars matching ^[a-z0-9-]+$
        tags: z
            .array(
                z
                    .string()
                    .min(2, "Each tag must be at least 2 characters")
                    .max(20, "Each tag must be at most 20 characters")
                    .regex(/^[a-z0-9-]+$/, "Tags must only contain lowercase letters, numbers, and hyphens"),
            )
            .max(5, "Maximum 5 tags allowed"),
        // Rule 3 (count + item shape): min 1, max 50 — duplicate-name check is in superRefine
        ingredients: z
            .array(z.object({ name: z.string(), qty: z.number(), unit: z.string() }))
            .min(1, "Must have at least 1 ingredient")
            .max(50, "Maximum 50 ingredients allowed"),
        // Rule 5: max 30 steps, each 5–500 chars
        steps: z
            .array(
                z
                    .string()
                    .min(5, "Each step must be at least 5 characters")
                    .max(500, "Each step must be at most 500 characters"),
            )
            .max(30, "Maximum 30 steps allowed"),
    })
    .superRefine((data, ctx) => {
        // Rule 2: prepMin + cookMin must be > 0 and ≤ 1440
        const totalTime = data.prepMin + data.cookMin;
        if (totalTime <= 0 || totalTime > 1440) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["prepMin"],
                message: "Total time (prepMin + cookMin) must be between 1 and 1440 minutes",
            });
        }

        // Rule 3 (uniqueness): no duplicate ingredient names, case-insensitive
        const seen = new Set<string>();
        data.ingredients.forEach((ing, idx) => {
            const key = ing.name.trim().toLowerCase();
            if (seen.has(key)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["ingredients", idx, "name"],
                    message: "Ingredient names must be unique (case-insensitive)",
                });
            }
            seen.add(key);
        });
    });

function firstZodMessage(err: z.ZodError): string {
    return err.issues[0]?.message ?? "Validation failed";
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
        }

        const body: unknown = await request.json();
        const parsed = PatchSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: firstZodMessage(parsed.error) }, { status: 400 });
        }

        const data = parsed.data;

        // Rule 1: Title uniqueness — Zod can't do async DB checks, so this stays here
        const titlePattern = new RegExp(`^${escapeRegex(data.title)}$`, "i");
        const duplicate = await RecipeModel.findOne({ title: titlePattern, _id: { $ne: id } }).lean();
        if (duplicate) {
            return NextResponse.json({ error: "Title already exists (case-insensitive)" }, { status: 409 });
        }

        const updated = await RecipeModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
        if (!updated) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

        return NextResponse.json(updated);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
        }

        const deleted = await RecipeModel.findByIdAndDelete(id).lean();
        if (!deleted) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
