"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import { recipeKeys } from "@/lib/recipe-keys";
import type { TRecipeDocument } from "@/lib/schemas/recipe";

interface RecipeDetailModalProps {
    recipe: TRecipeDocument | null;
    onClose: () => void;
    onEdit: (recipe: TRecipeDocument) => void;
    onDeleted: () => void;
}

const difficultyColor = {
    easy: "success",
    medium: "warning",
    hard: "error",
} as const;

async function deleteRecipe(id: string): Promise<void> {
    const res = await fetch(`/api/recipes/example/${id}`, { method: "DELETE" });
    if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to delete recipe");
    }
}

export default function RecipeDetailModal({ recipe, onClose, onEdit, onDeleted }: RecipeDetailModalProps) {
    const queryClient = useQueryClient();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: () => deleteRecipe(recipe!._id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
            void queryClient.invalidateQueries({ queryKey: ["recipes", "distinct", "tags"] });
            setShowDeleteConfirm(false);
            onDeleted();
        },
    });

    function handleClose() {
        setShowDeleteConfirm(false);
        deleteMutation.reset();
        onClose();
    }

    return (
        <Dialog open={recipe !== null} onClose={handleClose} maxWidth="sm" fullWidth scroll="paper">
            {recipe && (
                <>
                    {showDeleteConfirm ? (
                        <>
                            <DialogTitle>Delete Recipe</DialogTitle>
                            <DialogContent>
                                <Typography sx={{ mb: deleteMutation.isError ? 2 : 0 }}>
                                    Are you sure you want to delete &ldquo;{recipe.title}&rdquo;? This action cannot be
                                    undone.
                                </Typography>
                                {deleteMutation.isError && (
                                    <Alert severity="error">
                                        {deleteMutation.error instanceof Error
                                            ? deleteMutation.error.message
                                            : "Something went wrong"}
                                    </Alert>
                                )}
                            </DialogContent>
                            <DialogActions>
                                <Button
                                    onClick={() => { setShowDeleteConfirm(false); deleteMutation.reset(); }}
                                    disabled={deleteMutation.isPending}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    color="error"
                                    variant="contained"
                                    onClick={() => deleteMutation.mutate()}
                                    disabled={deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending ? "Deleting…" : "Delete"}
                                </Button>
                            </DialogActions>
                        </>
                    ) : (
                        <>
                            <DialogTitle
                                sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", pr: 3 }}
                            >
                                <Box sx={{ flex: 1 }}>{recipe.title}</Box>
                                <Chip
                                    label={recipe.difficulty}
                                    size="small"
                                    color={difficultyColor[recipe.difficulty]}
                                />
                            </DialogTitle>

                            <DialogContent dividers>
                                <Typography variant="body1" sx={{ mb: 2 }}>
                                    {recipe.description}
                                </Typography>

                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {recipe.prepMin + recipe.cookMin} min &nbsp;·&nbsp; {recipe.servings} servings
                                </Typography>

                                {recipe.tags.length > 0 && (
                                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 2 }}>
                                        {recipe.tags.map((tag) => (
                                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                                        ))}
                                    </Box>
                                )}

                                <Divider sx={{ mb: 2 }} />

                                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                                    Ingredients
                                </Typography>
                                <List dense disablePadding sx={{ mb: 2 }}>
                                    {recipe.ingredients.map((ing, i) => (
                                        <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                                            <ListItemText
                                                primary={`${ing.qty} ${ing.unit} ${ing.name}`}
                                                slotProps={{ primary: { variant: "body2" } }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>

                                <Divider sx={{ mb: 2 }} />

                                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                                    Steps
                                </Typography>
                                <List dense disablePadding>
                                    {recipe.steps.map((step, i) => (
                                        <ListItem key={i} disableGutters alignItems="flex-start" sx={{ py: 0.5 }}>
                                            <ListItemText
                                                primary={`${i + 1}. ${step}`}
                                                slotProps={{ primary: { variant: "body2" } }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>

                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                                    Added{" "}
                                    {new Date(recipe.createdAt).toLocaleDateString(undefined, {
                                        dateStyle: "medium",
                                    })}
                                </Typography>
                            </DialogContent>

                            <DialogActions>
                                <Button color="error" onClick={() => setShowDeleteConfirm(true)}>
                                    Delete
                                </Button>
                                <Box sx={{ flex: 1 }} />
                                <Button onClick={handleClose}>Close</Button>
                                <Button variant="contained" onClick={() => onEdit(recipe)}>
                                    Edit
                                </Button>
                            </DialogActions>
                        </>
                    )}
                </>
            )}
        </Dialog>
    );
}
