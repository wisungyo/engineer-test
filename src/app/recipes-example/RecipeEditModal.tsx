"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import { recipeKeys } from "@/lib/recipe-keys";
import type { TIngredient, TRecipeDocument } from "@/lib/schemas/recipe";

interface RecipeEditModalProps {
    recipe: TRecipeDocument | null;
    onClose: () => void;
    onSaved: (updated: TRecipeDocument) => void;
}

type EditPayload = {
    title: string;
    description: string;
    servings: number;
    prepMin: number;
    cookMin: number;
    difficulty: "easy" | "medium" | "hard";
    tags: string[];
    ingredients: TIngredient[];
    steps: string[];
};

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const TAG_PATTERN = /^[a-z0-9-]+$/;

async function patchRecipe(id: string, data: EditPayload): Promise<TRecipeDocument> {
    const res = await fetch(`/api/recipes/example/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to update recipe");
    }
    return res.json() as Promise<TRecipeDocument>;
}

export default function RecipeEditModal({ recipe, onClose, onSaved }: RecipeEditModalProps) {
    const queryClient = useQueryClient();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [servings, setServings] = useState(1);
    const [prepMin, setPrepMin] = useState(0);
    const [cookMin, setCookMin] = useState(0);
    const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
    const [tags, setTags] = useState<string[]>([]);
    const [ingredients, setIngredients] = useState<TIngredient[]>([{ name: "", qty: 0, unit: "" }]);
    const [steps, setSteps] = useState<string[]>([""]);

    useEffect(() => {
        if (recipe) {
            setTitle(recipe.title);
            setDescription(recipe.description);
            setServings(recipe.servings);
            setPrepMin(recipe.prepMin);
            setCookMin(recipe.cookMin);
            setDifficulty(recipe.difficulty);
            setTags(recipe.tags);
            setIngredients(recipe.ingredients.length > 0 ? recipe.ingredients : [{ name: "", qty: 0, unit: "" }]);
            setSteps(recipe.steps.length > 0 ? recipe.steps : [""]);
        }
    }, [recipe]);

    const mutation = useMutation({
        mutationFn: (data: EditPayload) => patchRecipe(recipe!._id, data),
        onSuccess: (updated) => {
            void queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
            void queryClient.invalidateQueries({ queryKey: ["recipes", "distinct", "tags"] });
            onSaved(updated);
        },
    });

    function handleSave() {
        mutation.mutate({
            title,
            description,
            servings,
            prepMin,
            cookMin,
            difficulty,
            tags,
            ingredients: ingredients.filter((ing) => ing.name.trim().length > 0),
            steps: steps.filter((s) => s.trim().length > 0),
        });
    }

    function updateIngredient(index: number, field: keyof TIngredient, value: string | number) {
        setIngredients((prev) =>
            prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)),
        );
    }

    function removeIngredient(index: number) {
        setIngredients((prev) => prev.filter((_, i) => i !== index));
    }

    function addIngredient() {
        if (ingredients.length < 50) setIngredients((prev) => [...prev, { name: "", qty: 0, unit: "" }]);
    }

    function updateStep(index: number, value: string) {
        setSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
    }

    function removeStep(index: number) {
        setSteps((prev) => prev.filter((_, i) => i !== index));
    }

    function addStep() {
        if (steps.length < 30) setSteps((prev) => [...prev, ""]);
    }

    return (
        <Dialog open={recipe !== null} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
            {recipe && (
                <>
                    <DialogTitle>Edit Recipe</DialogTitle>

                    <DialogContent dividers>
                        <Stack spacing={2.5}>
                            {mutation.isError && (
                                <Alert severity="error">
                                    {mutation.error instanceof Error
                                        ? mutation.error.message
                                        : "Something went wrong"}
                                </Alert>
                            )}

                            <TextField
                                label="Title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                size="small"
                                fullWidth
                                required
                            />

                            <TextField
                                label="Description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                size="small"
                                fullWidth
                                multiline
                                minRows={3}
                            />

                            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                                <TextField
                                    label="Servings"
                                    type="number"
                                    value={servings}
                                    onChange={(e) => setServings(Number(e.target.value))}
                                    size="small"
                                    sx={{ width: 110 }}
                                    inputProps={{ min: 1 }}
                                />
                                <TextField
                                    label="Prep (min)"
                                    type="number"
                                    value={prepMin}
                                    onChange={(e) => setPrepMin(Number(e.target.value))}
                                    size="small"
                                    sx={{ width: 120 }}
                                    inputProps={{ min: 0 }}
                                />
                                <TextField
                                    label="Cook (min)"
                                    type="number"
                                    value={cookMin}
                                    onChange={(e) => setCookMin(Number(e.target.value))}
                                    size="small"
                                    sx={{ width: 120 }}
                                    inputProps={{ min: 0 }}
                                />
                            </Box>

                            <Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block", mb: 0.5 }}
                                >
                                    Difficulty
                                </Typography>
                                <ToggleButtonGroup
                                    value={difficulty}
                                    exclusive
                                    onChange={(_, v: "easy" | "medium" | "hard" | null) => {
                                        if (v) setDifficulty(v);
                                    }}
                                    size="small"
                                >
                                    {DIFFICULTIES.map((d) => (
                                        <ToggleButton key={d} value={d} sx={{ textTransform: "capitalize" }}>
                                            {d}
                                        </ToggleButton>
                                    ))}
                                </ToggleButtonGroup>
                            </Box>

                            <Autocomplete
                                multiple
                                freeSolo
                                options={[] as string[]}
                                value={tags}
                                onChange={(_, newValue) => {
                                    const valid = newValue
                                        .map((t) => (typeof t === "string" ? t.trim() : ""))
                                        .filter(
                                            (t) => t.length >= 2 && t.length <= 20 && TAG_PATTERN.test(t),
                                        );
                                    setTags(valid.slice(0, 5));
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Tags"
                                        size="small"
                                        helperText="Max 5 · 2–20 chars · lowercase, numbers, hyphens only"
                                    />
                                )}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                        <Chip
                                            label={option}
                                            size="small"
                                            {...getTagProps({ index })}
                                            key={option}
                                        />
                                    ))
                                }
                            />

                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Ingredients
                                </Typography>
                                <Stack spacing={1}>
                                    {ingredients.map((ing, i) => (
                                        <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                            <TextField
                                                value={ing.name}
                                                onChange={(e) => updateIngredient(i, "name", e.target.value)}
                                                size="small"
                                                placeholder="Name"
                                                sx={{ flex: 1 }}
                                            />
                                            <TextField
                                                type="number"
                                                value={ing.qty}
                                                onChange={(e) => updateIngredient(i, "qty", Number(e.target.value))}
                                                size="small"
                                                placeholder="Qty"
                                                sx={{ width: 80 }}
                                                inputProps={{ min: 0, step: "any" }}
                                            />
                                            <TextField
                                                value={ing.unit}
                                                onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                                                size="small"
                                                placeholder="Unit"
                                                sx={{ width: 80 }}
                                            />
                                            {ingredients.length > 1 && (
                                                <Button
                                                    size="small"
                                                    color="error"
                                                    onClick={() => removeIngredient(i)}
                                                    sx={{ minWidth: 0, px: 1 }}
                                                >
                                                    ✕
                                                </Button>
                                            )}
                                        </Box>
                                    ))}
                                    {ingredients.length < 50 && (
                                        <Button
                                            size="small"
                                            onClick={addIngredient}
                                            sx={{ alignSelf: "flex-start" }}
                                        >
                                            + Add ingredient
                                        </Button>
                                    )}
                                </Stack>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Steps
                                </Typography>
                                <Stack spacing={1}>
                                    {steps.map((step, i) => (
                                        <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ pt: 1, minWidth: 24, textAlign: "right" }}
                                            >
                                                {i + 1}.
                                            </Typography>
                                            <TextField
                                                value={step}
                                                onChange={(e) => updateStep(i, e.target.value)}
                                                size="small"
                                                fullWidth
                                                multiline
                                                maxRows={4}
                                                placeholder={`Step ${i + 1}`}
                                            />
                                            {steps.length > 1 && (
                                                <Button
                                                    size="small"
                                                    color="error"
                                                    onClick={() => removeStep(i)}
                                                    sx={{ minWidth: 0, px: 1, mt: 0.5 }}
                                                >
                                                    ✕
                                                </Button>
                                            )}
                                        </Box>
                                    ))}
                                    {steps.length < 30 && (
                                        <Button
                                            size="small"
                                            onClick={addStep}
                                            sx={{ alignSelf: "flex-start" }}
                                        >
                                            + Add step
                                        </Button>
                                    )}
                                </Stack>
                            </Box>
                        </Stack>
                    </DialogContent>

                    <DialogActions>
                        <Button onClick={onClose} disabled={mutation.isPending}>
                            Cancel
                        </Button>
                        <Button variant="contained" onClick={handleSave} disabled={mutation.isPending}>
                            {mutation.isPending ? "Saving…" : "Save"}
                        </Button>
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
}
