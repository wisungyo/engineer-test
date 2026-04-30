// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockConnectDB, mockFindOne, mockFindByIdAndUpdate, mockFindByIdAndDelete } = vi.hoisted(() => ({
    mockConnectDB: vi.fn(),
    mockFindOne: vi.fn(),
    mockFindByIdAndUpdate: vi.fn(),
    mockFindByIdAndDelete: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    connectDB: mockConnectDB,
}));

vi.mock("@/lib/models/recipe", () => ({
    RecipeModel: {
        findOne: mockFindOne,
        findByIdAndUpdate: mockFindByIdAndUpdate,
        findByIdAndDelete: mockFindByIdAndDelete,
    },
}));

import { DELETE, PATCH } from "./route";

function makeRequest(url: string, body?: unknown): Request {
    return {
        url,
        json: vi.fn().mockResolvedValue(body),
    } as unknown as Request;
}

const validId = "507f191e810c19729de860ea";
const invalidId = "not-an-object-id";

const validPayload = {
    title: "Mie Goreng",
    description: "Stir fried noodle dish",
    servings: 2,
    prepMin: 10,
    cookMin: 15,
    difficulty: "easy",
    tags: ["quick"],
    ingredients: [{ name: "Noodle", qty: 1, unit: "pack" }],
    steps: ["Stir fry all ingredients together."],
};

describe("PATCH /api/recipes/example/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConnectDB.mockResolvedValue(undefined);
    });

    test("returns 400 for invalid recipe id", async () => {
        const response = await PATCH(makeRequest("http://localhost") as never, {
            params: Promise.resolve({ id: invalidId }),
        });

        expect(response.status).toBe(400);
        expect(mockFindOne).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({ error: "Invalid recipe ID" });
    });

    test("returns 400 when payload validation fails", async () => {
        const response = await PATCH(makeRequest("http://localhost", {}) as never, {
            params: Promise.resolve({ id: validId }),
        });

        expect(response.status).toBe(400);
        expect(mockFindOne).not.toHaveBeenCalled();
        const body = await response.json();
        expect(body.error).toBeTruthy();
    });

    test("returns 409 when another recipe has same title", async () => {
        mockFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: "duplicate" }) });

        const response = await PATCH(makeRequest("http://localhost", validPayload) as never, {
            params: Promise.resolve({ id: validId }),
        });

        expect(response.status).toBe(409);
        expect(mockFindOne).toHaveBeenCalledWith({
            title: expect.any(RegExp),
            _id: { $ne: validId },
        });
        expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
    });

    test("returns 404 when recipe to update is not found", async () => {
        mockFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
        mockFindByIdAndUpdate.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });

        const response = await PATCH(makeRequest("http://localhost", validPayload) as never, {
            params: Promise.resolve({ id: validId }),
        });

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({ error: "Recipe not found" });
    });

    test("updates recipe and returns payload", async () => {
        const updated = { _id: validId, ...validPayload };
        mockFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
        mockFindByIdAndUpdate.mockReturnValue({ lean: vi.fn().mockResolvedValue(updated) });

        const response = await PATCH(makeRequest("http://localhost", validPayload) as never, {
            params: Promise.resolve({ id: validId }),
        });

        expect(response.status).toBe(200);
        expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(validId, { $set: validPayload }, { new: true });
        await expect(response.json()).resolves.toMatchObject({
            _id: validId,
            title: "Mie Goreng",
        });
    });
});

describe("DELETE /api/recipes/example/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConnectDB.mockResolvedValue(undefined);
    });

    test("returns 400 for invalid recipe id", async () => {
        const response = await DELETE(makeRequest("http://localhost") as never, {
            params: Promise.resolve({ id: invalidId }),
        });

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ error: "Invalid recipe ID" });
    });

    test("returns 404 when recipe is missing", async () => {
        mockFindByIdAndDelete.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });

        const response = await DELETE(makeRequest("http://localhost") as never, {
            params: Promise.resolve({ id: validId }),
        });

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({ error: "Recipe not found" });
    });

    test("returns success when delete succeeds", async () => {
        mockFindByIdAndDelete.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: validId }) });

        const response = await DELETE(makeRequest("http://localhost") as never, {
            params: Promise.resolve({ id: validId }),
        });

        expect(response.status).toBe(200);
        expect(mockFindByIdAndDelete).toHaveBeenCalledWith(validId);
        await expect(response.json()).resolves.toEqual({ success: true });
    });
});
