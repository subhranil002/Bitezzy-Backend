import mongoose from "mongoose";

const recipeSchema = new mongoose.Schema(
    {
        uuid: {
            type: String,
            required: [true, "UUID is required"],
            index: true,
        },

        title: {
            type: String,
            required: [true, "Title is required"],
        },

        description: {
            type: String,
            required: [true, "Description is required"],
        },

        thumbnail: {
            public_id: {
                type: String,
            },
            secure_url: {
                type: String,
            },
        },

        cuisine: {
            type: String,
            enum: {
                values: [
                    "indian",
                    "italian",
                    "chinese",
                    "mexican",
                    "thai",
                    "japanese",
                    "french",
                    "mediterranean",
                    "american",
                    "korean",
                    "vietnamese",
                    "middle-eastern",
                    "british",
                    "spanish",
                    "german",
                    "greek",
                ],
                message: "Invalid cuisine type",
            },
            required: [true, "Cuisine is required"],
        },

        chefId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        totalCookingTime: {
            type: Number,
            required: [true, "Total Cooking Time is required"],
        },

        servings: {
            type: Number,
            required: [true, "Servings is required"],
        },

        isPremium: {
            type: Boolean,
            default: false,
        },

        ingredients: [
            {
                name: String,
                quantity: Number,
                unit: String,
                marketPrice: Number,
            },
        ],

        steps: [
            {
                stepNo: Number,
                instruction: {
                    type: String,
                    required: [true, "Instruction is required"],
                },

                imageUrl: {
                    public_id: {
                        type: String,
                    },
                    secure_url: {
                        type: String,
                    },
                },
            },
        ],

        dietaryLabels: [
            {
                type: String,
                enum: {
                    values: [
                        "vegetarian",
                        "vegan",
                        "keto",
                        "paleo",
                        "gluten-free",
                        "dairy-free",
                        "low-carb",
                        "high-protein",
                        "sugar-free",
                        "organic",
                        "raw",
                        "mediterranean",
                        "low-fat",
                    ],
                    message: "Invalid dietary label",
                },
            },
        ],

        externalMediaLinks: [
            {
                name: String,
                url: String,
            },
        ],

        reviews: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: [true, "User ID is required"],
                },
                rating: {
                    type: Number,
                    required: [true, "Rating is required"],
                    min: [1, "Rating must be at least 1"],
                    max: [5, "Rating must be at most 5"],
                },
                message: {
                    type: String,
                    required: [true, "Review message is required"],
                    trim: true,
                    maxlength: [1000, "Review message cannot exceed 1000 characters"],
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
                updatedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],

        nutrition: {
            calorie: {
                type: Number,
            },

            carbohydrate: {
                type: Number,
            },

            protein: {
                type: Number,
            },

            fat: {
                type: Number,
            },

            fiber: {
                type: Number,
            },

            sugar: {
                type: Number,
            },
        },

        averageRating: {
            type: Number,
            default: 0,
            min: [0, "Average rating cannot be negative"],
            max: [5, "Average rating cannot exceed 5"],
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        strict: true, // Ignores fields not defined in schema
    }
);

recipeSchema.index({ "reviews.userId": 1 });

const Recipe = mongoose.model("Recipe", recipeSchema);

export default Recipe;
