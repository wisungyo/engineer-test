import { type NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { RecipeModel, RecipeSchema } from '@/lib/schemas/recipe';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    if (searchParams.get('distinct') === 'tags') {
      const tags = await RecipeModel.distinct('tags');
      return NextResponse.json((tags as string[]).sort());
    }

    const pageSize = Math.min(Math.max(1, Number(searchParams.get('pageSize') ?? '10')), 50);
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const search = searchParams.get('search')?.trim();
    const tagsParam = searchParams.get('tags');
    const difficulty = searchParams.get('difficulty');

    const query: Record<string, unknown> = {};

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { title: regex },
        { description: regex },
        { tags: regex },
        { 'ingredients.name': regex },
        { steps: regex },
      ];
    }

    if (tagsParam) {
      const tags = tagsParam.split(',').map((t) => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        query.tags = { $all: tags };
      }
    }

    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      query.difficulty = difficulty;
    }

    const [data, total] = await Promise.all([
      RecipeModel.find(query)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      RecipeModel.countDocuments(query),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: unknown = await request.json();

    const parsed = RecipeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Rule 1: Title must be unique — case-insensitive after trim
    const titlePattern = new RegExp(`^${escapeRegex(data.title.trim())}$`, 'i');
    const duplicate = await RecipeModel.findOne({ title: titlePattern }).lean();
    if (duplicate) {
      return NextResponse.json({ error: 'Title already exists (case-insensitive)' }, { status: 409 });
    }

    // Rule 2: Total time must be between 1 and 1440 minutes
    const totalTime = data.prepMin + data.cookMin;
    if (totalTime <= 0 || totalTime > 1440) {
      return NextResponse.json(
        { error: 'Total time (prepMin + cookMin) must be between 1 and 1440 minutes' },
        { status: 400 },
      );
    }

    // Rule 3: Ingredients — min 1, max 50, no duplicates (case-insensitive)
    if (data.ingredients.length < 1 || data.ingredients.length > 50) {
      return NextResponse.json(
        { error: 'Must have between 1 and 50 ingredients' },
        { status: 400 },
      );
    }
    const ingredientNames = data.ingredients.map((i) => i.name.trim().toLowerCase());
    if (new Set(ingredientNames).size !== ingredientNames.length) {
      return NextResponse.json(
        { error: 'Ingredient names must be unique (case-insensitive)' },
        { status: 400 },
      );
    }

    // Rule 4: Tags — max 5, each 2–20 chars matching ^[a-z0-9-]+$
    if (data.tags.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 tags allowed' }, { status: 400 });
    }
    const tagPattern = /^[a-z0-9-]+$/;
    for (const tag of data.tags) {
      if (tag.length < 2 || tag.length > 20 || !tagPattern.test(tag)) {
        return NextResponse.json(
          { error: `Tag "${tag}" is invalid — must be 2–20 chars matching ^[a-z0-9-]+$` },
          { status: 400 },
        );
      }
    }

    // Rule 5: Steps — max 30, each 5–500 characters
    if (data.steps.length > 30) {
      return NextResponse.json({ error: 'Maximum 30 steps allowed' }, { status: 400 });
    }
    for (const step of data.steps) {
      if (step.length < 5 || step.length > 500) {
        return NextResponse.json(
          { error: 'Each step must be between 5 and 500 characters' },
          { status: 400 },
        );
      }
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    const recipe = await RecipeModel.create(data);
    return NextResponse.json(recipe, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
