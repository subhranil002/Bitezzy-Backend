import { ApiResponse, ApiError } from "../utils/index.js";
import razorpayInstance from "../configs/razorpay.configs.js";
import User from "../models/user.models.js"; // user model
import Payment from "../models/payment.models.js"; // payment model
import constants from "../constants.js";
import crypto from "crypto";

export const handleCreatePlan = async (req, res, next) => {
    try {
        const user = req.user;

        const subscriptionPrice = user.chefProfile.subscriptionPrice;

        if (!subscriptionPrice) {
            throw new ApiError(400, "Subscription price not set");
        }

        // Check if plan already exists
        if (user.chefProfile.razorpayPlanId) {
            throw new ApiError(400, "Plan already exists");
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

        return res
            .status(201)
            .json(new ApiResponse(201, "Plan created successfully", plan));
    } catch (error) {
        console.log(error);

        return next(
            error instanceof ApiError
                ? error
                : new ApiError(500, "Something went wrong while creating plan")
        );
    }
};

export const handleCreateSubscription = async (req, res, next) => {
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

        // Check if plan exists
        if (!chef.chefProfile.razorpayPlanId) {
            throw new ApiError(400, "Chef subscription plan not found");
        }

        // TODO: check if user has already subscribed

        // creating subscription for the user
        const subscription = await razorpayInstance.subscriptions.create({
            plan_id: chef.chefProfile.razorpayPlanId,
            total_count: 12,
            customer_notify: 1,
            notes: {
                userId: req.user._id.toString(),
                chefId: chefId.toString(),
            },
        });

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    "Subscription created successfully",
                    subscription
                )
            );
    } catch (error) {
        console.log(error);

        return next(
            error instanceof ApiError
                ? error
                : new ApiError(
                      500,
                      "Something went wrong while creating subscription"
                  )
        );
    }
};

export const handleWebhook = async (req, res, next) => {
    try {
        // Get Razorpay signature
        const razorpaySignature = req.headers["x-razorpay-signature"];

        // Create expected signature
        const expectedSignature = crypto
            .createHmac("sha256", constants.RAZORPAY_WEBHOOK_SECRET)
            .update(req.body)
            .digest("hex");

        // Verify signature
        if (razorpaySignature !== expectedSignature) {
            throw new ApiError(400, "Invalid webhook signature");
        }

        // Convert raw buffer to JSON
        const payload = JSON.parse(req.body.toString());

        // Event type
        const event = payload.event;

        console.log("event name:", event);

        switch (event) {
            // Payment Success
            case "payment.captured": {
                const paymentEntity = payload.payload.payment?.entity;
                const {
                    id: razorpayPaymentId,
                    // subscription_id: razorpaySubscriptionId,
                    amount,
                    currency,
                    status,
                } = paymentEntity;

                // console.log(payload.payload.payment?.entity);

                console.log("Payment Entity", paymentEntity);

                // const userId = paymentEntity.notes?.userId;
                // const chefId = paymentEntity.notes?.chefId;

                // console.log("User ID", userId);
                // console.log("Chef ID", chefId);

                // if (!userId || !chefId) {
                //     break;
                // }

                // Prevent duplicate payment save
                const existingPayment = await Payment.findOne({
                    razorpayPaymentId,
                });

                if (existingPayment) {
                    break;
                }

                const payment = await Payment.create({
                    razorpayPaymentId,
                    // razorpaySubscriptionId,
                    razorpaySignature,
                    // purchasedBy: userId,
                    // chef: chefId,
                    amount: amount / 100,
                    currency,
                    status, // payment status
                    // subscriptionStatus: "active", // subscription status
                });

                // await payment.save();

                console.log("Payment created successfully: ", payment);

                // Add chef to user's subscribed list
                // const user = await User.findOneAndUpdate(
                //     {
                //         _id: userId,
                //         isActive: true,
                //     },
                //     {
                //         $addToSet: {
                //             "profile.subscribed": chefId,
                //         },
                //     }
                // );
                // console.log("User subscribed: ", user.profile.subscribed);

                // // Add user to chef subscribers
                // const chef = await User.findOneAndUpdate(
                //     {
                //         _id: chefId,
                //         isActive: true,
                //     },
                //     {
                //         $addToSet: {
                //             "chefProfile.subscribers": userId,
                //         },
                //     }
                // );
                // console.log("Chef subscribers: ", chef.chefProfile.subscribers);
                break;
            }
            case "payment.failed": {
                console.log("Payment failed");
                // throw new ApiError(400, "Payment failed");
                break;
            }
            case "subscription.activated": {
                const subscriptionEntity = payload.payload.subscription?.entity;

                console.log("Subscription Entity", subscriptionEntity);

                const {
                    id: razorpaySubscriptionId,
                    current_start,
                    current_end,
                    charge_at,
                    status,
                } = subscriptionEntity;

                await Payment.findOneAndUpdate(
                    {
                        razorpaySubscriptionId,
                    },
                    {
                        subscriptionStatus: status,
                        currentStart: new Date(current_start * 1000),
                        currentEnd: new Date(current_end * 1000),
                        nextBillingAt: new Date(charge_at * 1000),
                    }
                );

                break;
            }
            case "subscription.cancelled": {
                const subscriptionEntity = payload.payload.subscription?.entity;

                const { id: razorpaySubscriptionId, ended_at } =
                    subscriptionEntity;

                const payment = await Payment.findOneAndUpdate(
                    {
                        razorpaySubscriptionId,
                    },
                    {
                        subscriptionStatus: "cancelled",
                        cancelledAt: new Date(ended_at * 1000),
                    },
                    {
                        new: true,
                    }
                );

                // Remove chef from user's subscribed list
                if (payment) {
                    await User.findOneAndUpdate(
                        {
                            _id: payment.purchasedBy,
                            isActive: true,
                        },
                        {
                            $pull: {
                                "profile.subscribed": payment.chef,
                            },
                        }
                    );

                    // Remove user from chef subscribers list
                    await User.findOneAndUpdate(
                        {
                            _id: payment.chef,
                            isActive: true,
                        },
                        {
                            $pull: {
                                "chefProfile.subscribers": payment.purchasedBy,
                            },
                        }
                    );
                }

                break;
            }
            default:
                console.log(`Unhandled event: ${event}`);
                break;
        }

        res.status(200).json(
            new ApiResponse(200, "Webhook handled successfully")
        );
    } catch (error) {
        console.log(error);

        return next(
            error instanceof ApiError
                ? error
                : new ApiError(
                      500,
                      "Something went wrong while handling webhook"
                  )
        );
    }
};

export const handleCancelSubscription = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const { chefId } = req.body;

        // Find active subscription
        const payment = await Payment.findOne({
            purchasedBy: userId,
            chef: chefId,
            subscriptionStatus: "active",
        });

        if (!payment) {
            throw new ApiError(404, "Active subscription not found");
        }

        // Cancel subscription in Razorpay
        const cancelledSubscription =
            await razorpayInstance.subscriptions.cancel(
                payment.razorpaySubscriptionId,
                {
                    cancel_at_cycle_end: true,
                    // true = cancel after billing cycle
                    // false = immediate cancel
                }
            );

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    "Subscription cancelled successfully",
                    cancelledSubscription
                )
            );
    } catch (error) {
        console.log(error);

        return next(
            error instanceof ApiError
                ? error
                : new ApiError(
                      500,
                      "Something went wrong while cancelling subscription"
                  )
        );
    }
};
