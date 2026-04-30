"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { recipeKeys } from "@/lib/recipe-keys";
import type { RecipeFilters } from "@/lib/recipe-keys";
import type { TRecipeDocument } from "@/lib/schemas/recipe";
import RecipeDetailModal from "./RecipeDetailModal";
import RecipeEditModal from "./RecipeEditModal";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

async function fetchExampleRecipes(filters: NonNullable<RecipeFilters>): Promise<TRecipeDocument[]> {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.tags?.length) params.set("tags", filters.tags.join(","));
    if (filters.difficulty) params.set("difficulty", filters.difficulty);
    const res = await fetch(`/api/recipes/example?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch recipes");
    return res.json() as Promise<TRecipeDocument[]>;
}

async function fetchAllTags(): Promise<string[]> {
    const res = await fetch("/api/recipes/example?distinct=tags");
    if (!res.ok) throw new Error("Failed to fetch tags");
    return res.json() as Promise<string[]>;
}

async function createExampleRecipe(data: { title: string; servings: number }): Promise<TRecipeDocument> {
    const res = await fetch("/api/recipes/example", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            title: data.title,
            description: "Added via quick-add form.",
            servings: data.servings,
            prepMin: 10,
            cookMin: 10,
            difficulty: "easy",
            tags: [],
            ingredients: [{ name: "placeholder", qty: 1, unit: "g" }],
            steps: ["Prepare as needed."],
        }),
    });
    if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to create recipe");
    }
    return res.json() as Promise<TRecipeDocument>;
}

export default function RecipesExamplePage() {
    const queryClient = useQueryClient();

    const [title, setTitle] = useState("");
    const [servings, setServings] = useState(4);

    const [selectedRecipe, setSelectedRecipe] = useState<TRecipeDocument | null>(null);
    const [editingRecipe, setEditingRecipe] = useState<TRecipeDocument | null>(null);

    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const filters: NonNullable<RecipeFilters> = {
        search: debouncedSearch || undefined,
        tags: selectedTags.length ? selectedTags : undefined,
        difficulty: selectedDifficulty ?? undefined,
    };

    const {
        data: recipes,
        isLoading,
        error,
    } = useQuery({
        queryKey: recipeKeys.list(filters),
        queryFn: () => fetchExampleRecipes(filters),
    });

    const { data: allTags = [] } = useQuery({
        queryKey: ["recipes", "distinct", "tags"],
        queryFn: fetchAllTags,
    });

    const createMutation = useMutation({
        mutationFn: createExampleRecipe,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
            void queryClient.invalidateQueries({ queryKey: ["recipes", "distinct", "tags"] });
        },
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;
        createMutation.mutate({ title, servings });
        setTitle("");
    }

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h4" sx={{ mb: 1 }}>
                Example: Recipe List + Quick Add
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                This page demonstrates the conventions used in this scaffold. Review the source (
                <code>src/app/recipes-example/page.tsx</code>, <code>src/lib/recipe-keys.ts</code>) before building your
                own implementation.
            </Typography>

            <Box
                component="form"
                onSubmit={handleSubmit}
                data-testid="quick-add-form"
                sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}
            >
                <TextField
                    label="Recipe title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    size="small"
                    inputProps={{ "data-testid": "quick-add-title-input" }}
                    sx={{ flex: 1, minWidth: 200 }}
                />
                <TextField
                    label="Servings"
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(Number(e.target.value))}
                    size="small"
                    sx={{ width: 110 }}
                />
                <Button type="submit" variant="contained" data-testid="quick-add-submit">
                    Add
                </Button>
            </Box>

            {createMutation.isError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {createMutation.error instanceof Error ? createMutation.error.message : "Something went wrong"}
                </Alert>
            )}

            {/* Search & filters */}
            <Stack spacing={2} sx={{ mb: 3 }}>
                <TextField
                    label="Search recipes"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    size="small"
                    placeholder="Search by title, description, ingredients, tags…"
                    inputProps={{ "data-testid": "search-input" }}
                    fullWidth
                />

                <Autocomplete
                    multiple
                    options={allTags}
                    value={selectedTags}
                    onChange={(_, newValue) => setSelectedTags(newValue)}
                    renderInput={(params) => (
                        <TextField {...params} label="Filter by tags" size="small" data-testid="tags-filter" />
                    )}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                            <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
                        ))
                    }
                />

                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                        Difficulty
                    </Typography>
                    <ToggleButtonGroup
                        value={selectedDifficulty}
                        exclusive
                        onChange={(_, value: string | null) => setSelectedDifficulty(value)}
                        size="small"
                        data-testid="difficulty-filter"
                    >
                        {DIFFICULTIES.map((d) => (
                            <ToggleButton key={d} value={d} sx={{ textTransform: "capitalize" }}>
                                {d}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </Box>
            </Stack>

            {isLoading && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress data-testid="loading-spinner" />
                </Box>
            )}

            {error && <Alert severity="error">{error instanceof Error ? error.message : "Load failed"}</Alert>}

            {recipes && (
                <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} found
                    </Typography>
                    <Stack spacing={2} data-testid="recipe-list">
                        {recipes.length === 0 && (
                            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                                No recipes match your filters.
                            </Typography>
                        )}
                        {recipes.map((recipe) => (
                            <Card
                                key={String(recipe._id)}
                                data-testid="recipe-card"
                                role="button"
                                onClick={() => setSelectedRecipe(recipe)}
                                sx={{ cursor: "pointer" }}
                            >
                                <CardContent>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                        <Typography variant="h6" sx={{ flex: 1 }}>
                                            {recipe.title}
                                        </Typography>
                                        <Chip
                                            label={recipe.difficulty}
                                            size="small"
                                            color={
                                                recipe.difficulty === "easy"
                                                    ? "success"
                                                    : recipe.difficulty === "medium"
                                                      ? "warning"
                                                      : "error"
                                            }
                                        />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        {recipe.prepMin + recipe.cookMin} min · {recipe.servings} servings
                                    </Typography>
                                    {recipe.tags.length > 0 && (
                                        <Box sx={{ mt: 1, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                            {recipe.tags.map((tag) => (
                                                <Chip key={tag} label={tag} size="small" variant="outlined" />
                                            ))}
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                </>
            )}

            <RecipeDetailModal
                recipe={selectedRecipe}
                onClose={() => setSelectedRecipe(null)}
                onEdit={(r) => { setSelectedRecipe(null); setEditingRecipe(r); }}
            />
            <RecipeEditModal
                recipe={editingRecipe}
                onClose={() => setEditingRecipe(null)}
                onSaved={(updated) => { setEditingRecipe(null); setSelectedRecipe(updated); }}
            />
        </Container>
    );
}
