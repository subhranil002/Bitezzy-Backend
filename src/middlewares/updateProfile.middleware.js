import Joi from "joi";
import ApiError from "../utils/ApiError.js";

const DIETARY_LABELS = [
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
];

const ALLERGENS = [
    "peanuts",
    "tree nuts",
    "milk",
    "egg",
    "wheat",
    "soy",
    "fish",
    "shellfish",
    "sesame",
    "mustard",
    "celery",
    "lupin",
    "sulfites",
    "molluscs",
    "corn",
];

const SPECIALITIES = [
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
];

// educationSchema for validating education data
const educationSchema = Joi.object({
    institution: Joi.string().trim().max(100).required(),

    degree: Joi.string().trim().max(100).required(),

    fieldOfStudy: Joi.string().trim().max(100).required(),

    startYear: Joi.string()
        .min(1900)
        .required(),

    endYear: Joi.string().optional(),

    description: Joi.string().trim().max(500).allow("").optional(),
});

// experienceSchema for validating experience data
const experienceSchema = Joi.object({
    title: Joi.string().trim().max(100).required(),

    employmentType: Joi.string().trim().max(50).required(),

    companyOrOrganization: Joi.string().trim().max(100).required(),

    isCurrenltyWorking: Joi.boolean().optional(),

    startYear: Joi.string().trim().required(),

    endYear: Joi.string().trim().optional(),

    description: Joi.string().trim().max(500).allow("").optional(),
});

export const validateUpdateProfile = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().trim().min(2).max(50).optional(),

        bio: Joi.string().trim().allow("").max(300).optional(),

        dietaryLabels: Joi.array()
            .items(Joi.string().valid(...DIETARY_LABELS))
            .optional(),

        allergens: Joi.array()
            .items(Joi.string().valid(...ALLERGENS))
            .optional(),

        cuisine: Joi.string().trim().optional(),

        // Chef Fields
        education: Joi.array().items(educationSchema).optional(), // using educationSchema to validate education data

        experience: Joi.array().items(experienceSchema).optional(), // using experienceSchema to validate experience data

        speciality: Joi.string()
            .valid(...SPECIALITIES)
            .optional(),

        externalLinks: Joi.array()
            .items(
                Joi.string().uri({
                    scheme: ["http", "https"],
                })
            )
            .optional(),

        subscriptionPrice: Joi.number().integer().min(1).optional(),
    }).min(1); // At least one field required

    const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        allowUnknown: true, // allow unknown fields
        stripUnknown: true, // important: silently strip
    });

    if (error) {
        console.log(error);
        throw new ApiError(400, error.details.map((d) => d.message).join(", "));
    }

    // Replace body with validated & safe data
    req.body = value;
    next();
};
