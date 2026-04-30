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
import type { TRecipeDocument } from "@/lib/schemas/recipe";

interface RecipeDetailModalProps {
    recipe: TRecipeDocument | null;
    onClose: () => void;
}

const difficultyColor = {
    easy: "success",
    medium: "warning",
    hard: "error",
} as const;

export default function RecipeDetailModal({ recipe, onClose }: RecipeDetailModalProps) {
    return (
        <Dialog open={recipe !== null} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
            {recipe && (
                <>
                    <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", pr: 3 }}>
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

                        {/* Metadata */}
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {recipe.prepMin + recipe.cookMin} min &nbsp;·&nbsp; {recipe.servings} servings
                        </Typography>

                        {/* Tags */}
                        {recipe.tags.length > 0 && (
                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 2 }}>
                                {recipe.tags.map((tag) => (
                                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                                ))}
                            </Box>
                        )}

                        <Divider sx={{ mb: 2 }} />

                        {/* Ingredients */}
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                            Ingredients
                        </Typography>
                        <List dense disablePadding sx={{ mb: 2 }}>
                            {recipe.ingredients.map((ing, i) => (
                                <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                                    <ListItemText
                                        primary={`${ing.qty} ${ing.unit} ${ing.name}`}
                                        primaryTypographyProps={{ variant: "body2" }}
                                    />
                                </ListItem>
                            ))}
                        </List>

                        <Divider sx={{ mb: 2 }} />

                        {/* Steps */}
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                            Steps
                        </Typography>
                        <List dense disablePadding>
                            {recipe.steps.map((step, i) => (
                                <ListItem key={i} disableGutters alignItems="flex-start" sx={{ py: 0.5 }}>
                                    <ListItemText
                                        primary={`${i + 1}. ${step}`}
                                        primaryTypographyProps={{ variant: "body2" }}
                                    />
                                </ListItem>
                            ))}
                        </List>

                        {/* Footer */}
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                            Added {new Date(recipe.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </Typography>
                    </DialogContent>

                    <DialogActions>
                        <Button onClick={onClose}>Close</Button>
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
}
