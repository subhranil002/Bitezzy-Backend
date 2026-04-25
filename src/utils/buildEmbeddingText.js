export function buildEmbeddingText(recipe, chefName) {
    const ingredientsText =
        recipe.ingredients?.map((i) => i.name).join(", ") || "";
    const stepsText = recipe.steps?.map((s) => s.instruction).join(" ") || "";

    return `
Recipe: ${recipe.title}

Description: ${recipe.description}

This recipe is made by chef ${chefName}.

Cuisine: ${recipe.cuisine}

Ingredients used: ${ingredientsText}

Cooking steps: ${stepsText}

Dietary preferences: ${recipe.dietaryLabels?.join(", ")}

${recipe.totalCookingTime ? `Ready in ${recipe.totalCookingTime} minutes.` : ""}

${recipe.servings ? `Serves ${recipe.servings} people.` : ""}

${recipe.nutrition?.totalCalories ? `Contains ${recipe.nutrition.totalCalories} calories.` : ""}

${recipe.isPremium ? "This is a premium recipe." : ""}
`.trim();
}
