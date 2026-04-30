import { type NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { RecipeModel } from "@/lib/models/recipe";
import { seed } from "../../../../../scripts/seed";

export async function POST(_request: NextRequest) {
    try {
        await connectDB();
        await RecipeModel.deleteMany({});
        await seed();
        const count = await RecipeModel.countDocuments();
        return NextResponse.json({ count });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
