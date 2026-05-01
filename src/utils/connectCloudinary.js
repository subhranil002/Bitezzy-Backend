import cloudinary from "../configs/cloudinary.configs.js";

export const connectToCloudinary = async () => {
    try {
        await cloudinary.api.ping();
        console.log("Connected to Cloudinary");
    } catch (error) {
        console.log(
            "Error while connecting to Cloudinary: ",
            error?.error?.message || error
        );
    }
};