import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/user.models.js";
import Recipe from "../models/recipe.models.js";
import {
    ApiResponse,
    ApiError,
    uploadImageToCloud,
    deleteLocalFile,
    deleteCloudFile,
    // isBlankValue,
    // convertToMongoKey,
} from "../utils/index.js";
import constants from "../constants.js";
import sendMail from "../utils/sendMail.js";
import { getCache, setCache, deleteCache } from "../utils/redisUtils.js";
import {
    contactUsAutoReplyTemplate,
    contactUsTemplate,
    forgotPasswordTemplate,
    welcomeTemplate,
} from "../emailTemplates/index.js";
import razorpayInstance from "../configs/razorpay.configs.js";
import { recalculateChefRatings } from "../utils/recalculateRecipeRatings.js";

export const handleRegister = async (req, res, next) => {
    try {
        // get name, email and pw from body
        const {
            email,
            password,
            profile_name,
            profile_cuisine,
            profile_dietaryLabels,
            profile_allergens,
        } = req.body;

        // validate
        if (!(email && password && profile_name && profile_cuisine)) {
            throw new ApiError(400, "All field must be passed");
        }

        // Email format validation using regex
        const emailRegex =
            /^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

        if (!emailRegex.test(email)) {
            throw new ApiError(400, "Email Not Valid");
        }

        // Password validation in controller
        const passwordRegex =
            // /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[\s\S]{8,}$/;

            /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[^\s]{8,64}$/;
        // check min 8 char, one uppercase, special char and number
        if (!passwordRegex.test(password)) {
            throw new ApiError(400, "Password Not Valid");
        }

        // validate if user exists
        let user = await User.findOne({ email });
        if (user) {
            throw new ApiError(400, "User already exists with this email");
        }

        // Prepare profile data - only include fields that are provided
        const profileData = {
            name: profile_name,
            cuisine: profile_cuisine,
        };

        if (profile_dietaryLabels)
            profileData.dietaryLabels = profile_dietaryLabels;

        if (profile_allergens) profileData.allergens = profile_allergens;

        // Create new user object
        const newUser = await User.create({
            email: email.toLowerCase(),
            password: password,
            profile: profileData,
            favourites: [], // Initialize empty favourites array
        });

        if (!newUser) {
            throw new ApiError(
                500,
                "User registration failed, please try again"
            );
        }

        // token create
        const accessToken = await newUser.generateAccessToken();
        const refreshToken = await newUser.generateRefreshToken();

        // save refresh token
        newUser.refreshToken = refreshToken;
        await newUser.save();
        newUser.password = undefined;

        // send cookie
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        }).cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        await setCache(`user:${newUser._id}:profile`, newUser, 3600);

        // send welcome email
        await sendMail(
            newUser.email,
            "Welcome to Bitezzy",
            welcomeTemplate({ name: newUser.profile.name })
        );

        // send response
        return res.status(201).json(
            new ApiResponse(201, "User Created Successfully", {
                newUser,
            })
        );
    } catch (error) {
        console.log("Some Error Occured: ", error);
        // If the error is already an instance of ApiError, pass it to the error handler
        error instanceof ApiError
            ? next(error)
            : next(
                new ApiError(500, "Something went wrong during registration")
            );
    }
};

export const handleLogin = async (req, res, next) => {
    try {
        // get email and pw from body
        const { email, password } = req.body;

        // validate
        if (!(email && password)) {
            throw new ApiError(400, "All field must be passed");
        }

        // validate if user exists
        let user = await User.findOne({
            email: email.toLowerCase(),
            isActive: true,
        }).select("+password");

        if (!user) {
            throw new ApiError(
                401,
                "User does not exists with this email or email is invalid"
            );
        }

        // compare pw hashed
        const matchedPw = await user.isPasswordCorrect(password);
        if (!matchedPw) {
            throw new ApiError(401, "Password is invalid");
        }

        // token create
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        // save refresh token
        user.refreshToken = refreshToken;
        await user.save();

        user.password = undefined;
        user.refreshToken = undefined;

        // send cookie
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        }).cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        await setCache(`user:${user._id}:profile`, user, 3600);

        // send response
        return res
            .status(200)
            .json(new ApiResponse(200, "Login Successful", user));
    } catch (error) {
        console.log("Some Error Occured: ", error);

        // If the error is already an instance of ApiError, pass it to the error handler
        error instanceof ApiError
            ? next(error)
            : next(new ApiError(500, "Something went wrong during login"));
    }
};

export const handleGuestLogin = async (req, res, next) => {
    try {
        const user = await User.findById(constants.GUEST_ID);

        const { accessToken } = await user.generateAccessToken();

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        });

        return res
            .status(200)
            .json(new ApiResponse(200, "Logged in successfully", user));
    } catch (error) {
        console.log("Some Error Occured: ", error);
        // If the error is already an instance of ApiError, pass it to the error handler
        error instanceof ApiError
            ? next(error)
            : next(
                new ApiError(500, "Something went wrong during guest login")
            );
    }
};

export const handleLogout = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        user.refreshToken = undefined; // Remove refresh token from db
        await user.save();

        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            path: "/",
        }).clearCookie("refreshToken", {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            path: "/",
        });

        return res
            .status(200)
            .json(new ApiResponse(200, "Logged out successfully"));
    } catch (error) {
        console.log("Some Error Occured: ", error);
        // If the error is already an instance of ApiError, pass it to the error handler
        error instanceof ApiError
            ? next(error)
            : next(new ApiError(500, "Something went wrong during logout"));
    }
};

export const handleChangeAvatar = async (req, res, next) => {
    try {
        // Get avatar file from request
        const avatarLocalPath = req.file ? req.file.path : "";

        // Check if avatar file is empty
        if (!avatarLocalPath) {
            throw new ApiError(400, "No avatar file provided");
        }

        // Find current user
        const user = await User.findById(req.user._id).select("profile.avatar");
        if (!user) {
            throw new ApiError(403, "User Not Found, please login again");
        }

        // Upload avatar to Cloudinary
        const newAvatar = await uploadImageToCloud(avatarLocalPath, "USER");
        if (!newAvatar.public_id || !newAvatar.secure_url) {
            throw new ApiError(400, "Error uploading avatar");
        }

        // Delete old avatar
        // console.log(user?.profile?.avatar?.public_id);
        const result = await deleteCloudFile(user?.profile?.avatar?.public_id);
        if (!result) {
            await deleteCloudFile(newAvatar.public_id);
            throw new ApiError(400, "Error deleting old avatar");
        }

        // Update DB user with new avatar
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { "profile.avatar": newAvatar },
            { new: true }
        );

        await deleteCache(`user:${user._id}:profile`);
        await setCache(`user:${user._id}:profile`, updatedUser, 3600);

        res.status(200).json(
            new ApiResponse(
                200,
                "Avatar Uploaded Successfully",
                updatedUser?.profile?.avatar
            )
        );
    } catch (error) {
        await deleteLocalFile(avatarLocalPath);
        console.log("Some Error Occured: ", error);
        // If the error is already an instance of ApiError, pass it to the error handler
        if (error instanceof ApiError) {
            return next(error);
        }

        // For all other errors, send a generic error message
        return next(
            new ApiError(500, "Something went wrong during file upload")
        );
    }
};

export const handleChangePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            throw new ApiError("All fields are required", 400);
        }

        const passwordRegex =
            /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[^\s]{8,64}$/;

        if (!passwordRegex.test(newPassword)) {
            throw new ApiError(
                400,
                "New password does not meet security requirements"
            );
        }

        const user = await User.findById(req.user._id).select("+password");
        if (!(await user.isPasswordCorrect(oldPassword))) {
            throw new ApiError(401, "Incorrect credentials");
        }

        user.password = newPassword;
        await user.save();

        return res
            .status(200)
            .json(new ApiResponse(200, "Password changed successfully"));
    } catch (error) {
        // If the error is already an instance of ApiError, pass it to the error handler
        if (error instanceof ApiError) {
            return next(error);
        }

        // For all other errors, send a generic error message
        return next(
            new ApiError(500, "Something went wrong during password change")
        );
    }
};

export const handleForgetPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            throw new ApiError(400, "Email is required");
        }

        const user = await User.findOne({ email, isActive: true });
        if (!user) {
            throw new ApiError(400, "User not found with this mail");
        }

        // generate reset token
        const resetToken = crypto.randomBytes(20).toString("hex");

        // console.log("Reset Token: ", resetToken);

        // generate hash of reset token to store in db
        const forgotPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        // console.log("forgotPasswordToken: ", forgotPasswordToken);

        // generate expiry date
        const forgotPasswordExpiry = Date.now() + 15 * 60 * 1000;

        // generate reset password url
        const resetPasswordUrl = `${constants.FRONTEND_URL}/resetpassword/${resetToken}`;

        // console.log("resetPasswordUrl: ", resetPasswordUrl);

        // send mail to user with frontend url + reset token
        await sendMail(
            email,
            "Reset Password",
            forgotPasswordTemplate({
                name: user.profile.name,
                resetLink: resetPasswordUrl,
            })
        );

        // saving token in db
        await User.findByIdAndUpdate(user._id, {
            forgotPasswordToken,
            forgotPasswordExpiry,
        });

        return res
            .status(200)
            .json(new ApiResponse(200, `Mail sent successfully on ${email}`));
    } catch (error) {
        error instanceof ApiError
            ? next(error)
            : next(
                new ApiError(
                    500,
                    "Something went wrong during while sending reset password link"
                )
            );
    }
};

export const handleResetPassword = async (req, res, next) => {
    try {
        const { resetToken, password } = req.body;
        if (!resetToken || !password) {
            throw new ApiError(400, "All fields are required");
        }

        const passwordRegex =
            /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[^\s]{8,64}$/;

        if (!passwordRegex.test(password)) {
            throw new ApiError(
                400,
                "New password does not meet security requirements"
            );
        }

        // generate hash of reset token to check in db
        const forgotPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        // find user with reset token and expiry date
        const user = await User.findOne({
            forgotPasswordToken,
            forgotPasswordExpiry: { $gt: Date.now() },
        });
        if (!user) {
            throw new ApiError(400, "Token is invalid or expired");
        }

        user.password = password;
        user.forgotPasswordToken = undefined;
        user.forgotPasswordExpiry = undefined;
        await user.save();

        return res
            .status(200)
            .json(new ApiResponse(200, "Password reset successfully"));
    } catch (error) {
        error instanceof ApiError
            ? next(error)
            : next(
                new ApiError(
                    500,
                    "Something went wrong during password reset"
                )
            );
    }
};

export const handleGetProfile = async (req, res, next) => {
    try {
        const cacheKey = `user:${req.user._id}:profile`;
        let user = await getCache(cacheKey);

        if (!user) {
            user = await User.findOne({
                _id: req.user._id,
                isActive: true,
            }).populate({
                path: "chefProfile.reviews.userId",
                select: "profile.name profile.avatar",
            });

            if (!user) {
                throw new ApiError(404, "User not found");
            }

            await setCache(cacheKey, user, 3600);
        }

        return res
            .status(200)
            .json(
                new ApiResponse(200, "Profile Data Fetched Successfully", user)
            );
    } catch (error) {
        // If the error is already an instance of ApiError, pass it to the error handler
        if (error instanceof ApiError) {
            return next(error);
        }

        // For all other errors, send a generic error message
        return next(
            new ApiError(500, "Something went wrong during fetching profile")
        );
    }
};

export const handleGetMySubscriptions = async (req, res, next) => {
    try {
        const cacheKey = `user:${req.user._id}:subscriptions`;
        let subscriptions = await getCache(cacheKey);

        if (!subscriptions) {
            const user = await User.findOne({
                _id: req.user._id,
                isActive: true,
            })
                .select("profile.subscribed")
                .populate("profile.subscribed");

            if (!user) {
                throw new ApiError(404, "User not found");
            }

            subscriptions = user.profile?.subscribed || [];
            await setCache(cacheKey, subscriptions, 3600);
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    "Subscriptions Fetched Successfully",
                    subscriptions
                )
            );
    } catch (error) {
        if (error instanceof ApiError) {
            return next(error);
        }
        return next(
            new ApiError(
                500,
                "Something went wrong during fetching subscriptions"
            )
        );
    }
};

export const handleGetMyRecipes = async (req, res, next) => {
    try {
        const cacheKey = `user:${req.user._id}:recipes`;
        let recipes = await getCache(cacheKey);

        if (!recipes) {
            const user = await User.findOne({
                _id: req.user._id,
                isActive: true,
            })
                .select("chefProfile.recipes")
                .populate("chefProfile.recipes");

            if (!user) {
                throw new ApiError(404, "User not found");
            }

            recipes = user.chefProfile?.recipes || [];
            await setCache(cacheKey, recipes, 3600);
        }

        return res
            .status(200)
            .json(
                new ApiResponse(200, "Recipes Fetched Successfully", recipes)
            );
    } catch (error) {
        if (error instanceof ApiError) {
            return next(error);
        }
        return next(
            new ApiError(500, "Something went wrong during fetching recipes")
        );
    }
};

export const handleUpdateProfile = async (req, res, next) => {
    try {
        const user = req.user; // from auth middleware

        // Common fields (allowed for all users)
        const baseFieldMap = {
            name: "profile.name",
            bio: "profile.bio",
            dietaryLabels: "profile.dietaryLabels",
            allergens: "profile.allergens",
            cuisine: "profile.cuisine",
        };

        // Chef-only fields
        const chefFieldMap = {
            education: "chefProfile.education",
            experience: "chefProfile.experience",
            speciality: "chefProfile.speciality",
            subscriptionPrice: "chefProfile.subscriptionPrice",
            externalLinks: "chefProfile.externalLinks",
        };

        // Decide allowed fields based on role
        let allowedFieldMap = { ...baseFieldMap };

        if (user.role === "CHEF") {
            allowedFieldMap = { ...baseFieldMap, ...chefFieldMap };
        }

        const updates = {};

        let newSubscriptionPrice = null;

        // getting new price if user is chef and updating subscription price
        if (user.role === "CHEF" && req.body.subscriptionPrice !== undefined) {
            newSubscriptionPrice = Number(req.body.subscriptionPrice);
        }

        // Only allow valid fields
        for (const key in req.body) {
            if (allowedFieldMap[key]) {
                updates[allowedFieldMap[key]] = req.body[key];
            }
        }

        // getting old price from the db
        const oldSubscriptionPrice = Number(
            user?.chefProfile?.subscriptionPrice
        );

        // checking if price has changed
        const isSubscriptionPriceChanged =
            user.role === "CHEF" &&
            newSubscriptionPrice !== null &&
            oldSubscriptionPrice !== newSubscriptionPrice;

        // prevent empty updates
        if (Object.keys(updates).length === 0) {
            throw new ApiError(400, "No valid fields provided for update");
        }

        // if price has changed, create new plan
        if (isSubscriptionPriceChanged) {
            const plan = await razorpayInstance.plans.create({
                period: "monthly",
                interval: 1,
                item: {
                    name: `${user.profile.name} Subscription`,
                    amount: newSubscriptionPrice * 100,
                    currency: "INR",
                    description: `Monthly subscription for ${user.profile.name}`,
                },
            });

            // save plan id in db
            updates["chefProfile.razorpayPlanId"] = plan.id;
        }
        // console.log(updates);
        const updatedUser = await User.findOneAndUpdate(
            { _id: user._id, isActive: true },
            { $set: updates },
            { new: true, runValidators: true }
        ).populate({
            path: "chefProfile.reviews.userId",
            select: "profile.name profile.avatar",
        });

        if (!updatedUser) {
            throw new ApiError(404, "User not found");
        }

        const cacheKey = `user:${user._id}:profile`;
        await deleteCache(cacheKey);
        await setCache(cacheKey, updatedUser, 3600);

        return res
            .status(200)
            .json(
                new ApiResponse(200, "User updated successfully", updatedUser)
            );
    } catch (error) {
        console.log("Some error occured: ", error);
        if (error instanceof ApiError) {
            return next(error);
        }
        return next(new ApiError(500, "Something went wrong during update"));
    }
};

export const handleGetUserById = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const cacheKey = `user:${userId}:profile`;

        let user = await getCache(cacheKey);

        if (!user) {
            user = await User.findOne({
                _id: userId,
                isActive: true,
            }).select(
                "-email -password -forgotPasswordToken -forgotPasswordExpiry"
            ).populate({
                path: "chefProfile.reviews.userId",
                select: "profile.name profile.avatar",
            });

            if (!user) {
                throw new ApiError(404, "User not found");
            }

            await setCache(cacheKey, user, 3600);
        }

        return res
            .status(200)
            .json(new ApiResponse(200, "User fetched successfully", user));
    } catch (error) {
        if (error instanceof ApiError) {
            return next(error);
        }
        return next(
            new ApiError(500, "Something went wrong during fetching user")
        );
    }
};

export const handleGetUserSubscriptionsById = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const cacheKey = `user:${userId}:subscriptions`;

        let subscriptions = await getCache(cacheKey);

        if (!subscriptions) {
            const user = await User.findOne({
                _id: userId,
                isActive: true,
            })
                .select("profile.subscribed")
                .populate("profile.subscribed");

            if (!user) {
                throw new ApiError(404, "User not found");
            }

            subscriptions = user.profile?.subscribed || [];
            await setCache(cacheKey, subscriptions, 3600);
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    "Subscriptions fetched successfully",
                    subscriptions
                )
            );
    } catch (error) {
        if (error instanceof ApiError) {
            return next(error);
        }
        return next(
            new ApiError(
                500,
                "Something went wrong during fetching user subscriptions"
            )
        );
    }
};

export const handleGetUserRecipesById = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const cacheKey = `user:${userId}:recipes`;

        let recipes = await getCache(cacheKey);

        if (!recipes) {
            const user = await User.findOne({
                _id: userId,
                isActive: true,
            })
                .select("chefProfile.recipes")
                .populate("chefProfile.recipes");

            if (!user) {
                throw new ApiError(404, "User not found");
            }

            recipes = user.chefProfile?.recipes || [];
            await setCache(cacheKey, recipes, 3600);
        }

        return res
            .status(200)
            .json(
                new ApiResponse(200, "Recipes fetched successfully", recipes)
            );
    } catch (error) {
        if (error instanceof ApiError) {
            return next(error);
        }
        return next(
            new ApiError(
                500,
                "Something went wrong during fetching user recipes"
            )
        );
    }
};

export const handleContactus = async (req, res, next) => {
    try {
        const { email, profile } = req.user;
        const { subject, message } = req.body;

        if (!subject || !message) {
            throw new ApiError(400, "All fields are required");
        }

        // send mail to admin
        await sendMail(
            constants.AUTHORIZE_MAIL,
            subject,
            contactUsTemplate({ name: profile.name, email, message })
        );

        // send confirm mail to user
        await sendMail(
            email,
            "Bitezzy: New Contact Us Submission",
            contactUsAutoReplyTemplate({ name: profile.name })
        );

        return res
            .status(200)
            .json(new ApiResponse(200, "Message sent successfully"));
    } catch (error) {
        error instanceof ApiError
            ? next(error)
            : next(
                new ApiError(
                    500,
                    "Something went wrong during sending conatct us message"
                )
            );
    }
};

export const handleGetFavourites = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const cacheKey = `user:${userId}:favourites`;

        let favourites = await getCache(cacheKey);

        if (!favourites) {
            const user = await User.findOne({
                _id: req.user._id,
                isActive: true,
            }).populate("favourites");

            favourites = user.favourites;
            await setCache(cacheKey, favourites, 3600);
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    "Favourites fetched successfully",
                    favourites
                )
            );
    } catch (error) {
        console.log("Some error occured: ", error);

        // If the error is already an instance of ApiError, pass it to the error handler
        error instanceof ApiError
            ? next(error)
            : next(
                new ApiError(
                    500,
                    "Something went wrong during fetching favourites"
                )
            );
    }
};

/*
export const handleSubscribeToChef = async (req, res, next) => {
    try {
        const { chefId } = req.params;
        const userId = req.user._id;

        if (userId.toString() === chefId.toString()) {
            throw new ApiError(400, "You cannot subscribe to yourself");
        }

        const chef = await User.findOne({ _id: chefId, isActive: true });

        if (!chef || chef.role !== "CHEF") {
            throw new ApiError(404, "Chef not found");
        }

        const user = await User.findOneAndUpdate(
            {
                _id: userId,
                isActive: true,
                "profile.subscribed": { $ne: chefId },
            },
            { $addToSet: { "profile.subscribed": chefId } },
            { new: true }
        );

        if (!user) {
            const userExists = await User.findOne({
                _id: userId,
                isActive: true,
            });
            if (!userExists) throw new ApiError(404, "User not found");
            throw new ApiError(400, "Already subscribed to this chef");
        }

        await User.updateOne(
            { _id: chefId },
            { $addToSet: { "chefProfile.subscribers": userId } }
        );

        await deleteCache(`user:${userId}:subscriptions`);
        await deleteCache(`user:${chefId}:subscribers`);

        return res.status(200).json(
            new ApiResponse(200, "Successfully subscribed", {
                userId,
                chefId,
            })
        );
    } catch (error) {
        console.log("Some error occured: ", error);

        // If the error is already an instance of ApiError, pass it to the error handler
        error instanceof ApiError
            ? next(error)
            : next(
                  new ApiError(
                      500,
                      "Something went wrong during subscribing chef"
                  )
              );
    }
};
*/

/*
export const handleUnsubscribeFromChef = async (req, res, next) => {
    try {
        const { chefId } = req.params;
        const userId = req.user._id;

        const chef = await User.findOne({ _id: chefId, isActive: true });

        if (!chef || chef.role !== "CHEF") {
            throw new ApiError(404, "Chef not found");
        }

        const user = await User.findOneAndUpdate(
            { _id: userId, isActive: true },
            { $pull: { "profile.subscribed": chefId } },
            { new: true }
        );

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        await User.updateOne(
            { _id: chefId },
            { $pull: { "chefProfile.subscribers": userId } }
        );

        await deleteCache(`user:${userId}:subscriptions`);
        await deleteCache(`user:${chefId}:subscribers`);

        return res.status(200).json(
            new ApiResponse(200, "Unsubscribed successfully", {
                chefId,
                userId,
            })
        );
    } catch (error) {
        console.log("Some error occured: ", error);

        // If the error is already an instance of ApiError, pass it to the error handler
        error instanceof ApiError
            ? next(error)
            : next(
                  new ApiError(
                      500,
                      "Something went wrong during unsubscribing chef"
                  )
              );
    }
};
*/

export const addChefReview = async (req, res, next) => {
    try {
        const { chefId } = req.params;
        const { rating, message } = req.body;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(chefId)) {
            throw new ApiError(400, "Invalid chef ID format");
        }
        if (!rating || rating < 1 || rating > 5) {
            throw new ApiError(400, "Rating is required and must be between 1 and 5");
        }
        if (!message?.trim()) {
            throw new ApiError(400, "Review message is required");
        }
        if (message.length > 1000) {
            throw new ApiError(400, "Message cannot exceed 1000 characters");
        }

        if (userId.toString() === chefId.toString()) {
            throw new ApiError(400, "You cannot review yourself");
        }

        const newReview = {
            userId,
            rating,
            message: message.trim(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const updatedChef = await User.findOneAndUpdate(
            {
                _id: chefId,
                role: "CHEF",
                isActive: true,
                "chefProfile.reviews.userId": { $ne: userId },
            },
            {
                $push: {
                    "chefProfile.reviews": newReview,
                },
            },
            {
                new: true,
            }
        ).populate({
            path: "chefProfile.reviews.userId",
            select: "profile.name profile.avatar",
        });

        if (!updatedChef) {
            const chefExists = await User.exists({
                _id: chefId,
                role: "CHEF",
                isActive: true,
            });

            if (!chefExists) {
                throw new ApiError(
                    404,
                    "Chef not found or is inactive"
                );
            }

            throw new ApiError(
                409,
                "You have already reviewed this chef"
            );
        }

        // Keep User.reviewsGiven synchronized
        await User.findByIdAndUpdate(userId, {
            $push: {
                reviewsGiven: {
                    targetType: "CHEF",
                    targetId: chefId,
                    rating,
                    message: message.trim(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            },
        });
        const chefRecipes = await Recipe.find(
            { chefId },
            "_id"
        ).lean();

        await deleteCache(`user:${userId}:profile`);

        recalculateChefRatings(updatedChef);
        await updatedChef.save();

        await Promise.all([
            deleteCache(`chef:${chefId}:reviews:summary`),
            deleteCache(`user:${chefId}:profile`),
            ...chefRecipes.map((recipe) =>
                deleteCache(`recipe:${recipe._id}`)
            ),
        ]);

        const cachedChef = updatedChef.toObject();

        await setCache(
            `user:${chefId}:profile`,
            cachedChef,
            3600
        );

        return res
            .status(201)
            .json(new ApiResponse(201, "Review added successfully"));
    } catch (error) {
        console.error("Error adding chef review:", error);
        return next(
            error instanceof ApiError
                ? error
                : new ApiError(500, "Something went wrong while adding chef review")
        );
    }
};

export const updateChefReview = async (req, res, next) => {
    try {
        const { chefId } = req.params;
        const { rating, message } = req.body;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(chefId)) {
            throw new ApiError(400, "Invalid chef ID format");
        }
        if (!rating || rating < 1 || rating > 5) {
            throw new ApiError(400, "Rating is required and must be between 1 and 5");
        }
        if (message !== undefined) {
            if (!message?.trim()) {
                throw new ApiError(400, "Review message is required");
            }
            if (message.length > 1000) {
                throw new ApiError(400, "Message cannot exceed 1000 characters");
            }
        }

        const updateFields = {
            "chefProfile.reviews.$.updatedAt": new Date(),
            "chefProfile.reviews.$.rating": rating,
        };
        if (message !== undefined) {
            updateFields["chefProfile.reviews.$.message"] = message.trim();
        }

        const updatedUser = await User.findOneAndUpdate(
            {
                _id: chefId, "chefProfile.reviews.userId": userId, role: "CHEF",
                isActive: true,
            },
            { $set: updateFields },
            {
                new: true,
            }
        ).populate({
            path: "chefProfile.reviews.userId",
            select: "profile.name profile.avatar",
        });

        if (!updatedUser) {
            const chefExists = await User.exists({ _id: chefId, role: "CHEF", isActive: true });
            if (!chefExists) {
                throw new ApiError(404, "Chef not found or is inactive");
            }
            throw new ApiError(404, "Review not found");
        }

        // Keep User.reviewsGiven synchronized
        const userUpdateFields = {
            "reviewsGiven.$[elem].rating": rating,
            "reviewsGiven.$[elem].updatedAt": new Date(),
        };
        if (message !== undefined) {
            userUpdateFields["reviewsGiven.$[elem].message"] = message.trim();
        }

        await User.findByIdAndUpdate(
            userId,
            { $set: userUpdateFields },
            {
                arrayFilters: [
                    {
                        "elem.targetType": "CHEF",
                        "elem.targetId": chefId,
                    },
                ],
            }
        );

        const chefRecipes = await Recipe.find(
            { chefId },
            "_id"
        ).lean();

        await deleteCache(`user:${userId}:profile`);

        recalculateChefRatings(updatedUser);
        await updatedUser.save();

        await Promise.all([
            deleteCache(`chef:${chefId}:reviews:summary`),
            deleteCache(`user:${chefId}:profile`),
            ...chefRecipes.map((recipe) =>
                deleteCache(`recipe:${recipe._id}`)
            ),
        ]);

        const cachedChef = updatedUser.toObject();

        await setCache(
            `user:${chefId}:profile`,
            cachedChef,
            3600
        );

        return res
            .status(200)
            .json(new ApiResponse(200, "Review updated successfully"));
    } catch (error) {
        console.error("Error updating chef review:", error);
        return next(
            error instanceof ApiError
                ? error
                : new ApiError(500, "Something went wrong while updating chef review")
        );
    }
};

export const deleteChefReview = async (req, res, next) => {
    try {
        const { chefId } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(chefId)) {
            throw new ApiError(400, "Invalid chef ID format");
        }

        const updatedUser = await User.findOneAndUpdate(
            {
                _id: chefId,
                role: "CHEF",
                isActive: true,
                "chefProfile.reviews.userId": userId
            },
            { $pull: { "chefProfile.reviews": { userId } } },
            { new: true }
        ).populate({
            path: "chefProfile.reviews.userId",
            select: "profile.name profile.avatar",
        });

        if (!updatedUser) {
            const chefExists = await User.exists({ _id: chefId, role: "CHEF", isActive: true });
            if (!chefExists) {
                throw new ApiError(404, "Chef not found or is inactive");
            }
            throw new ApiError(404, "Review not found or could not be deleted");
        }

        // Keep User.reviewsGiven synchronized
        await User.findByIdAndUpdate(userId, {
            $pull: {
                reviewsGiven: {
                    targetType: "CHEF",
                    targetId: new mongoose.Types.ObjectId(chefId),
                },
            },
        });

        const chefRecipes = await Recipe.find(
            { chefId },
            "_id"
        ).lean();

        await deleteCache(`user:${userId}:profile`);

        recalculateChefRatings(updatedUser);
        await updatedUser.save();

        await Promise.all([
            deleteCache(`chef:${chefId}:reviews:summary`),
            deleteCache(`user:${chefId}:profile`),
            ...chefRecipes.map((recipe) =>
                deleteCache(`recipe:${recipe._id}`)
            ),
        ]);

        const cachedChef = updatedUser.toObject();

        await setCache(
            `user:${chefId}:profile`,
            cachedChef,
            3600
        );

        return res
            .status(200)
            .json(new ApiResponse(200, "Review deleted successfully"));
    } catch (error) {
        console.error("Error deleting chef review:", error);
        return next(
            error instanceof ApiError
                ? error
                : new ApiError(500, "Something went wrong while deleting chef review")
        );
    }
};

export const getAllReviews = async (req, res, next) => {
    try {
        const { chefId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        if (!mongoose.Types.ObjectId.isValid(chefId)) {
            throw new ApiError(400, "Invalid chef ID format");
        }

        const cacheKey = `chef:${chefId}:reviews:summary`;
        let summaryData = await getCache(cacheKey);

        if (!summaryData) {
            const chef = await User.findOne({
                _id: chefId,
                role: "CHEF",
                isActive: true
            }).select("chefProfile.averageRating chefProfile.reviews").lean();

            if (!chef) {
                throw new ApiError(404, "Chef not found or is inactive");
            }

            const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            const reviewsList = chef.chefProfile?.reviews || [];
            reviewsList.forEach((r) => {
                if (r.rating >= 1 && r.rating <= 5) {
                    breakdown[r.rating]++;
                }
            });

            summaryData = {
                averageRating: chef.chefProfile?.averageRating || 0,
                totalReviews: reviewsList.length,
                breakdown,
                reviews: reviewsList
            };

            await setCache(cacheKey, summaryData, 3600);
        }

        // Apply pagination and sorting in-memory
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const sortedReviews = [...summaryData.reviews].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        const paginatedReviews = sortedReviews.slice(startIndex, endIndex);

        return res.status(200).json(
            new ApiResponse(200, "Review summary fetched successfully", {
                reviews: paginatedReviews,
                meta: {
                    page,
                    limit,
                    totalPages: Math.ceil(summaryData.totalReviews / limit),
                    averageRating: summaryData.averageRating,
                    totalReviews: summaryData.totalReviews,
                    breakdown: summaryData.breakdown,
                }
            })
        );
    } catch (error) {
        console.error("Error fetching chef review summary:", error);
        return next(
            error instanceof ApiError
                ? error
                : new ApiError(500, "Something went wrong while fetching chef review summary")
        );
    }
};
