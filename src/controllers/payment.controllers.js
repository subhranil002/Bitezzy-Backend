import { ApiResponse, ApiError } from "../utils/index.js";
import razorpayInstance from "../configs/razorpay.configs.js";
import User from "../models/user.models.js";

export const handleCreatePlan = async (req, res, next) => {
    try {
        const user = req.user;

        const subscriptionPrice = user.chefProfile.subscriptionPrice;

        if (!subscriptionPrice) {
            throw new ApiError(400, "Subscription price not set");
        }

        // Create Razorpay Plan
        const plan = await razorpayInstance.plans.create({
            period: "monthly",
            interval: 1,
            item: {
                name: `${user.profile.name} Subscription`,
                amount: subscriptionPrice * 100,
                currency: "INR",
                description: `Monthly subscription for ${user.profile.name}`,
            },
        });

        // Save plan id in DB
        user.chefProfile.razorpayPlanId = plan.id;

        await user.save();

        return res.status(201).json(
            new ApiResponse(201, "Plan created successfully", plan)
        );
    } catch (error) {
        console.log(error);

        return next(
            error instanceof ApiError
                ? error
                : new ApiError(500, "Something went wrong while creating plan")
        );
    }
};

export const handleCreateSubscription = async (req, res) => {
    try {
        const { chefId } = req.body;

        // Validate chef
        const chef = await User.findOne({ _id: chefId, isActive: true });

        if (!chef) {
            throw new ApiError(404, "Chef not found");
        }

        // Check role
        if (chef.role !== "CHEF") {
            throw new ApiError(400, "Invalid chef account");
        }

        // Subscription price
        const subscriptionPrice = chef.chefProfile.subscriptionPrice;

        if (!subscriptionPrice) {
            throw new ApiError(400, "Subscription price not set");
        }

        // TODO: check if user has already subscribed

        // creating plan for the user
        const plan = await razorpayInstance.plans.create({
            period: "monthly",
            interval: 1,

            item: {
                name: `${chef.profile.name} Subscription`,
                amount: subscriptionPrice * 100, // paise
                currency: "INR",
                description: `Monthly subscription for ${chef.profile.name}`,
            },
        });

        // creating subscription for the user
        const subscription = await razorpayInstance.subscriptions.create({
            plan_id: plan.id,
            total_count: 12,
            customer_notify: 1,
            notes: {
                userId: req.user._id.toString(),
                chefId: chefId.toString(),
            },
        });

        return res.status(201).json({
            success: true,
            subscriptionId: subscription.id,
            razorpayKey: process.env.RAZORPAY_KEY_ID,
            subscription,
        });
    } catch (error) {
        console.log(error);
    }
};

export const handleWebhook = () => {};

export const handleCancelSubscription = () => {};
