export const recalculateRecipeRatings = (recipe) => {
    const reviews = recipe.reviews || [];

    recipe.averageRating =
        reviews.length > 0
            ? Number(
                (
                    reviews.reduce(
                        (sum, review) => sum + review.rating,
                        0
                    ) / reviews.length
                ).toFixed(2)
            )
            : 0;
};

export const recalculateChefRatings = (chef) => {
    const reviews = chef.chefProfile?.reviews || [];

    if (chef.chefProfile) {
        chef.chefProfile.averageRating =
            reviews.length > 0
                ? Number(
                    (
                        reviews.reduce(
                            (sum, review) => sum + review.rating,
                            0
                        ) / reviews.length
                    ).toFixed(2)
                )
                : 0;
    }
};