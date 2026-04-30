import { type NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { RecipeModel, RecipeFormSchema } from '@/lib/schemas/recipe';

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

    const parsed = RecipeFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Rule 1: Title uniqueness — Zod can't do async DB checks, so this stays here
    const titlePattern = new RegExp(`^${escapeRegex(data.title)}$`, 'i');
    const duplicate = await RecipeModel.findOne({ title: titlePattern }).lean();
    if (duplicate) {
      return NextResponse.json({ error: 'Title already exists (case-insensitive)' }, { status: 409 });
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    const recipe = await RecipeModel.create(data);
    return NextResponse.json(recipe, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
