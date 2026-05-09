import jwt from "jsonwebtoken";
import User from "../models/user.models.js";
import { ApiError, ApiResponse } from "../utils/index.js";
import constants from "../constants.js";

const refreshAccessToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;

        // if refresh token is not present, throw an error
        if (!refreshToken) {
            // throw new ApiError("Refresh token not found", 455);
            throw new ApiError(455, "No Session Found! Please login again");
        }

        const decodedRefreshToken = jwt.verify(
            refreshToken,
            constants.REFRESH_TOKEN_SECRET,
            (err, decoded) => {
                if (err) {
                    throw new ApiError(
                        455,
                        "Refresh Token is invalid or expired"
                    );
                }
                return decoded;
            }
        );

        const user = await User.findOne({ _id: decodedRefreshToken?._id, isActive: true });
        if (!user) {
            throw new ApiError(455, "User not found");
        }

        // Check db refresh token with cookie refresh token
        if (user.refreshToken !== refreshToken) {
            throw new ApiError(455, "Refresh Token is invalid or expired");
        }

        // generate new access and refresh token
        const accessToken = await user.generateAccessToken();
        const newRefreshToken = await user.generateRefreshToken();

        user.refreshToken = newRefreshToken;
        await user.save();
        req.user = user;

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        }).cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        next();
    } catch (error) {
        console.log("Some error occured: ", error);

        // If the error is already an instance of ApiError, pass it to the error handler
        error instanceof ApiError
            ? next(error)
            : next(
                  new ApiError(500, "Something went wrong during validating user tokens")
              );
    }
};

export const isLoggedIn = async (req, res, next) => {
    try {
        // get the token from cookie
        const accessToken = req.cookies.accessToken;

        // validate
        if (!accessToken) {
            throw new ApiError(455, "Not logged in");
        }

        // Check if access token is valid
        try {
            const decodedAccessToken = jwt.verify(
                accessToken,
                constants.ACCESS_TOKEN_SECRET,
                (err, decoded) => {
                    if (err) {
                        throw new ApiError(
                            455,
                            "Access Token is invalid or expired"
                        );
                    }
                    return decoded;
                }
            );

            const userId = decodedAccessToken._id;

            let user = await getCache(`user:${userId}:profile`);

            if (!user) {
                user = await User.findOne({ _id: userId, isActive: true });
                if (!user) {
                    throw new ApiError(455, "User not found");
                }
            }

            // Set user in request
            req.user = user;

            next();
        } catch (error) {
            await refreshAccessToken(req, res, next);
        }
    } catch (error) {
        console.log("Some error occured: ", error);

        // If the error is already an instance of ApiError, pass it to the error handler
        error instanceof ApiError
            ? next(error)
            : next(
                  new ApiError(500, "Something went wrong during validating user tokens")
              );
    }
};

export const isAuthorized =
    (...roles) =>
    async (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new ApiError(403, "You are not authorized to access this route")
            );
        }
        next();
    };
