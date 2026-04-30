// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockConnectDB, mockDistinct, mockFind, mockCountDocuments, mockFindOne, mockCreate, mockSafeParse } =
    vi.hoisted(() => ({
        mockConnectDB: vi.fn(),
        mockDistinct: vi.fn(),
        mockFind: vi.fn(),
        mockCountDocuments: vi.fn(),
        mockFindOne: vi.fn(),
        mockCreate: vi.fn(),
        mockSafeParse: vi.fn(),
    }));

vi.mock("@/lib/db", () => ({
    connectDB: mockConnectDB,
}));

vi.mock("@/lib/schemas/recipe", () => ({
    RecipeModel: {
        distinct: mockDistinct,
        find: mockFind,
        countDocuments: mockCountDocuments,
        findOne: mockFindOne,
        create: mockCreate,
    },
    RecipeFormSchema: {
        safeParse: mockSafeParse,
    },
}));

import { GET, POST } from "./route";

function makeRequest(url: string, body?: unknown): Request {
    return {
        url,
        json: vi.fn().mockResolvedValue(body),
    } as unknown as Request;
}

describe("GET /api/recipes/example", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConnectDB.mockResolvedValue(undefined);
    });

    test("returns sorted distinct tags", async () => {
        mockDistinct.mockResolvedValue(["dinner", "breakfast"]);

        const response = await GET(makeRequest("http://localhost/api/recipes/example?distinct=tags") as never);

        expect(response.status).toBe(200);
        expect(mockConnectDB).toHaveBeenCalledTimes(1);
        expect(mockDistinct).toHaveBeenCalledWith("tags");
        await expect(response.json()).resolves.toEqual(["breakfast", "dinner"]);
    });

    test("returns paginated recipe list with defaults", async () => {
        const lean = vi.fn().mockResolvedValue([{ title: "A" }]);
        const limit = vi.fn().mockReturnValue({ lean });
        const skip = vi.fn().mockReturnValue({ limit });

        mockFind.mockReturnValue({ skip });
        mockCountDocuments.mockResolvedValue(23);

        const response = await GET(makeRequest("http://localhost/api/recipes/example") as never);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(mockFind).toHaveBeenCalledWith({});
        expect(skip).toHaveBeenCalledWith(0);
        expect(limit).toHaveBeenCalledWith(10);
        expect(mockCountDocuments).toHaveBeenCalledWith({});
        expect(payload.totalPages).toBe(3);
        expect(payload.page).toBe(1);
        expect(payload.pageSize).toBe(10);
        expect(payload.total).toBe(23);
        expect(payload.data).toEqual([{ title: "A" }]);
    });

    test("applies filters and clamps pageSize to 50", async () => {
        const lean = vi.fn().mockResolvedValue([]);
        const limit = vi.fn().mockReturnValue({ lean });
        const skip = vi.fn().mockReturnValue({ limit });

        mockFind.mockReturnValue({ skip });
        mockCountDocuments.mockResolvedValue(0);

        await GET(
            makeRequest(
                "http://localhost/api/recipes/example?search=tomato&tags=quick,comfort&difficulty=hard&page=2&pageSize=999",
            ) as never,
        );

        const query = mockFind.mock.calls[0]?.[0] as Record<string, unknown>;

        expect(skip).toHaveBeenCalledWith(50);
        expect(limit).toHaveBeenCalledWith(50);
        expect(query.difficulty).toBe("hard");
        expect(query.tags).toEqual({ $all: ["quick", "comfort"] });
        expect(Array.isArray(query.$or)).toBe(true);
        const firstOr = (query.$or as Array<Record<string, unknown>>)[0];
        expect(firstOr.title).toBeInstanceOf(RegExp);
    });
});

describe("POST /api/recipes/example", () => {
    const validBody = {
        title: "Nasi Goreng",
        description: "Indonesian fried rice",
        servings: 2,
        prepMin: 10,
        cookMin: 10,
        difficulty: "easy",
        tags: ["quick"],
        ingredients: [{ name: "Rice", qty: 1, unit: "plate" }],
        steps: ["Fry all ingredients together."],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockConnectDB.mockResolvedValue(undefined);
    });

    test("returns 400 when validation fails", async () => {
        mockSafeParse.mockReturnValue({
            success: false,
            error: { issues: [{ message: "Validation failed" }] },
        });

        const response = await POST(makeRequest("http://localhost/api/recipes/example", {}) as never);

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ error: "Validation failed" });
        expect(mockFindOne).not.toHaveBeenCalled();
    });

    test("returns 409 when title already exists", async () => {
        mockSafeParse.mockReturnValue({ success: true, data: validBody });
        mockFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: "existing" }) });

        const response = await POST(makeRequest("http://localhost/api/recipes/example", validBody) as never);

        expect(response.status).toBe(409);
        expect(mockCreate).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: "Title already exists (case-insensitive)",
        });
    });

    test("creates a recipe and returns 201", async () => {
        vi.useFakeTimers();
        mockSafeParse.mockReturnValue({ success: true, data: validBody });
        mockFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
        mockCreate.mockResolvedValue({ _id: "new-id", ...validBody });

        const pending = POST(makeRequest("http://localhost/api/recipes/example", validBody) as never);
        await vi.runAllTimersAsync();
        const response = await pending;

        expect(response.status).toBe(201);
        expect(mockCreate).toHaveBeenCalledWith(validBody);
        await expect(response.json()).resolves.toMatchObject({
            _id: "new-id",
            title: "Nasi Goreng",
        });

        vi.useRealTimers();
    });
});
