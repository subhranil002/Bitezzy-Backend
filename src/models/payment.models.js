import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        // Razorpay payment id
        razorpayPaymentId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        // Razorpay subscription id
        razorpaySubscriptionId: {
            type: String,
            index: true,
        },

        // Razorpay signature
        razorpaySignature: {
            type: String,
            required: true,
        },

        // User who paid
        purchasedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // Chef who received subscription
        chef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // Amount paid
        amount: {
            type: Number,
            required: true,
        },

        // Currency
        currency: {
            type: String,
            default: "INR",
        },

        // Payment status
        status: {
            type: String,
            enum: ["created", "authorized", "captured", "failed", "refunded"],
            default: "created",
        },

        subscriptionStatus: {
            type: String,
            enum: ["active", "cancelled", "expired", "pending"],
        },

        currentStart: Date,

        currentEnd: Date,

        nextBillingAt: Date,

        cancelledAt: Date,
    },
    {
        timestamps: true,
    }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
