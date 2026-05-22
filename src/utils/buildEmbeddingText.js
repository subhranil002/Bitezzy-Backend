function extractNumber(value, servings = 1) {
    if (value == null) return null;

    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.round(value / servings);
    } else {
        return value;
    }
}

function getCalorieTags(calories) {
    if (calories == null) return ["calories not specified"];

    const tags = [`contains ${calories} calories`];

    if (calories === 0) {
        tags.push("zero calorie");
    } else if (calories <= 100) {
        tags.push(
            "low calorie",
            "very low calorie",
            "under 100 calories",
            "less than 100 calories",
            `up to ${calories} calories`
        );
    } else if (calories <= 250) {
        tags.push(
            "light calorie",
            "under 250 calories",
            "less than 250 calories",
            `up to ${calories} calories`
        );
    } else if (calories <= 500) {
        tags.push(
            "moderate calorie",
            "under 500 calories",
            "less than 500 calories"
        );
    } else {
        tags.push("high calorie", "over 500 calories");
    }

    return tags;
}

function getProteinTags(protein) {
    if (protein == null) return ["protein not specified"];

    const tags = [`contains ${protein} grams of protein`];

    if (protein === 0) {
        tags.push("no protein", "protein free");
    } else if (protein <= 5) {
        tags.push(
            "low protein",
            "under 5 grams of protein",
            "less than 5 grams of protein",
            `up to ${protein} grams of protein`
        );
    } else if (protein <= 10) {
        tags.push(
            "light protein",
            "under 10 grams of protein",
            "less than 10 grams of protein",
            `up to ${protein} grams of protein`
        );
    } else if (protein <= 20) {
        tags.push(
            "moderate protein",
            "under 20 grams of protein",
            "less than 20 grams of protein"
        );
    } else {
        tags.push("high protein", "more than 20 grams of protein");
    }

    return tags;
}

function getCarbTags(carbs) {
    if (carbs == null) return ["carbohydrates not specified"];

    const tags = [`contains ${carbs} grams of carbohydrates`];

    if (carbs === 0) {
        tags.push("no carbs", "carb free", "zero carbs");
    } else if (carbs <= 5) {
        tags.push(
            "low carb",
            "under 5 grams of carbs",
            "less than 5 grams of carbs",
            `up to ${carbs} grams of carbs`
        );
    } else if (carbs <= 15) {
        tags.push(
            "moderate carbs",
            "under 15 grams of carbs",
            "less than 15 grams of carbs"
        );
    } else {
        tags.push("high carb", "more than 15 grams of carbs");
    }

    return tags;
}

function getSugarTags(sugar) {
    if (sugar == null) return ["sugar not specified"];

    const tags = [`contains ${sugar} grams of sugar`];

    if (sugar === 0) {
        tags.push("no sugar", "sugar free", "zero sugar");
    } else if (sugar <= 5) {
        tags.push(
            "low sugar",
            "under 5 grams of sugar",
            "less than 5 grams of sugar",
            `up to ${sugar} grams of sugar`
        );
    } else if (sugar <= 15) {
        tags.push(
            "moderate sugar",
            "under 15 grams of sugar",
            "less than 15 grams of sugar"
        );
    } else {
        tags.push("high sugar", "more than 15 grams of sugar");
    }

    return tags;
}

function getFatTags(fat) {
    if (fat == null) return ["fat not specified"];

    const tags = [`contains ${fat} grams of fat`];

    if (fat === 0) {
        tags.push("no fat", "fat free");
    } else if (fat <= 5) {
        tags.push(
            "low fat",
            "under 5 grams of fat",
            "less than 5 grams of fat",
            `up to ${fat} grams of fat`
        );
    } else if (fat <= 15) {
        tags.push(
            "moderate fat",
            "under 15 grams of fat",
            "less than 15 grams of fat"
        );
    } else {
        tags.push("high fat", "more than 15 grams of fat");
    }

    return tags;
}

function getFiberTags(fiber) {
    if (fiber == null) return ["fiber not specified"];

    const tags = [`contains ${fiber} grams of fiber`];

    if (fiber === 0) {
        tags.push("no fiber", "fiber free");
    } else if (fiber <= 3) {
        tags.push(
            "low fiber",
            "under 3 grams of fiber",
            "less than 3 grams of fiber",
            `up to ${fiber} grams of fiber`
        );
    } else if (fiber <= 7) {
        tags.push(
            "moderate fiber",
            "under 7 grams of fiber",
            "less than 7 grams of fiber"
        );
    } else {
        tags.push("high fiber", "more than 7 grams of fiber");
    }

    return tags;
}

export function buildEmbeddingText(recipe, chefName = "") {
    const ingredients = recipe.ingredients?.length
        ? recipe.ingredients
              .map((i) => i?.name?.trim())
              .filter(Boolean)
              .join(", ")
        : "No ingredients listed";

    const ingredientDetails = recipe.ingredients?.length
        ? recipe.ingredients
              .map((i) => {
                  const quantity = i?.quantity != null ? `${i.quantity}` : "";
                  const unit = i?.unit || "";
                  const name = i?.name || "";
                  return `${quantity} ${unit} ${name}`
                      .replace(/\s+/g, " ")
                      .trim();
              })
              .filter(Boolean)
              .join(", ")
        : "No ingredient details listed";

    const steps = recipe.steps?.length
        ? [...recipe.steps]
              .sort((a, b) => (a.stepNo || 0) - (b.stepNo || 0))
              .map((s) => s?.instruction?.trim())
              .filter(Boolean)
              .join(" ")
        : "No cooking steps available";

    const dietaryLabels = recipe.dietaryLabels?.length
        ? recipe.dietaryLabels.join(", ")
        : "No dietary labels";

    const calories = extractNumber(recipe.nutrition?.calorie, recipe.servings);
    const protein = extractNumber(recipe.nutrition?.protein, recipe.servings);
    const carbohydrate = extractNumber(
        recipe.nutrition?.carbohydrate,
        recipe.servings
    );
    const fat = extractNumber(recipe.nutrition?.fat, recipe.servings);
    const fiber = extractNumber(recipe.nutrition?.fiber, recipe.servings);
    const sugar = extractNumber(recipe.nutrition?.sugar, recipe.servings);

    const nutritionText = [
        `Calories: ${recipe.nutrition?.calorie ? `${recipe.nutrition.calorie} kcal` : "not specified"}`,
        `Protein: ${recipe.nutrition?.protein ? `${recipe.nutrition.protein} g` : "not specified"}`,
        `Carbohydrates: ${recipe.nutrition?.carbohydrate ? `${recipe.nutrition.carbohydrate} g` : "not specified"}`,
        `Fat: ${recipe.nutrition?.fat ? `${recipe.nutrition.fat} g` : "not specified"}`,
        `Fiber: ${recipe.nutrition?.fiber ? `${recipe.nutrition.fiber} g` : "not specified"}`,
        `Sugar: ${recipe.nutrition?.sugar ? `${recipe.nutrition.sugar} g` : "not specified"}`,
    ].join("\n");

    const nutritionSearchTags = [
        ...getCalorieTags(calories),
        ...getProteinTags(protein),
        ...getCarbTags(carbohydrate),
        ...getSugarTags(sugar),
        ...getFatTags(fat),
        ...getFiberTags(fiber),
    ].join(", ");

    return `
Recipe title: ${recipe.title || "Untitled recipe"}

Description:
${recipe.description || "No description available"}

This recipe is made by, Chef: ${chefName || "Unknown chef"}

Cuisine:
${recipe.cuisine || "Not specified"}

Dietary labels:
${dietaryLabels}

Recipe type:
${recipe.isPremium ? "Premium recipe" : "Free recipe"}

Cooking time:
${recipe.totalCookingTime != null ? `${recipe.totalCookingTime} minutes` : "Not specified"}

Servings:
${recipe.servings != null ? `${recipe.servings}` : "Not specified"}

Ingredients:
${ingredients}

Ingredient details:
${ingredientDetails}

Cooking instructions:
${steps}

Nutrition information:
${nutritionText}

Nutrition search tags:
${nutritionSearchTags}

Search keywords:
${recipe.title || ""},
${recipe.cuisine || ""},
${dietaryLabels},
${ingredients},
${recipe.isPremium ? "premium recipe" : "free recipe"},
${recipe.totalCookingTime != null ? `${recipe.totalCookingTime} minutes` : ""},
${recipe.servings != null ? `serves ${recipe.servings} person` : ""},
`.trim();
}
