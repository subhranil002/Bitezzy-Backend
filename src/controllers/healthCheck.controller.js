import { ApiError, ApiResponse } from "../utils/index.js";
import mongoose from "mongoose";
import sendMail from "../utils/sendMail.js";
import { connection } from "../configs/queue.config.js";
import { qdrantClient } from "../services/vectorService.js";
import {connectToCloudinary} from "../utils/index.js"

export const handleHealthCheck = async (req, res) => {
    // send mail
    // try {
    //     // const resp = await sendMail(
    //     //     "afnanansari02@gmail.com",
    //     //     "Health Check",
    //     //     "<h1>Mail is working. Sent through bitezzy server</h1>"
    //     // );
    //     console.log("Mail sent successful", resp);
    // } catch (error) {
    //     console.log("Error sending mail:", error);
    // }

    return res
        .status(200)
        .json(new ApiResponse(200, "Server is up and running"));
};

export const handleDbPing = async (req, res) => {
    try {
        const resp = await mongoose.connection.db.admin().ping();
        return res
            .status(200)
            .json(new ApiResponse(200, "DB is up and running", resp));
    } catch (err) {
        res.status(500).json("DB ping failed");
    }
};

export const handleRedisPing = async (req, res) => {
    try {
        const response = await connection.ping();

        return res.status(200).json(
            new ApiResponse(200, "Redis is up and running", {
                ping: response,
            })
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, "Redis ping failed", {
                error: error.message,
            })
        );
    }
};

export const handleQdrantPing = async (req, res) => {
    try {
        const response = await qdrantClient.getCollections();

        return res.status(200).json(
            new ApiResponse(200, "Qdrant is up and running", {
                health: response,
            })
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, "Qdrant ping failed", {
                error: error.message,
            })
        );
    }
};

export const handleCloudinaryPing = async (req, res) => {
    try {
        const response = await connectToCloudinary();
        return res.status(200).json(
            new ApiResponse(200, "Cloudinary is up and running")
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, "Cloudinary ping failed", {
                error: error.message,
            })
        );
    }
};
