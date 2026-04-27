import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import constants from "../constants.js";
import { ApiError } from "./index.js";
import { fileURLToPath } from "url";
import "dotenv/config";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
});

// in use
export const deleteLocalFile = async (localFilePath) => {
    try {
        if (!localFilePath) return;

        const absolutePath = path.resolve(localFilePath);

        if (fs.existsSync(absolutePath)) {
            await fs.promises.unlink(absolutePath);
            console.log("Deleted local file:", absolutePath);
        }
    } catch (error) {
        console.log("File delete error:", error);
        throw new ApiError(500, "Error while deleting local file");
    }
};

// in use
export const uploadImageToCloud = async (localFilePath, type) => {
    // Check if localFilePath is empty
    if (!localFilePath) return null;

    try {
        // console.log("=== Upload Debug Info ===");
        // console.log("File Path:", localFilePath);
        // console.log("File Exists:", fs.existsSync(localFilePath));
        // const stats = fs.statSync(localFilePath);
        // console.log("FILE SIZE:", stats.size);

        // console.log("File Size:", stats.size);
        // console.log("File MIME:", mime.lookup(localFilePath));
        // console.log("==========================");

        // console.log(cloudinary.config())
        // console.log("Cloud Name: ", constants.CLOUDINARY_CLOUD_NAME);
        // console.log("Cloud Key: ", constants.CLOUDINARY_API_KEY);
        // console.log("Cloud Secret: ", constants.CLOUDINARY_SECRET);

        // Dynamic folder for handling different types of files
        let folderName;
        if (type === "USER") {
            folderName = "/avatar";
        } else if (type === "RECIPES") {
            folderName = "/recipes";
        }

        // Upload image
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "image",
            moderation: constants.CLOUDINARY_IMAGE_MODERATION,
            folder: folderName, // organize in Cloudinary
            allowed_formats: ["jpg", "jpeg", "png", "webp"],
        });

        // Delete local files
        await deleteLocalFile(localFilePath);

        if (
            response?.moderation?.length > 0 &&
            response?.moderation[0]?.status === "rejected"
        ) {
            throw new ApiError(
                400,
                "This image is not safe to upload, please upload a different image"
            );
        }

        // Return public_id and secure_url
        return {
            public_id: response.public_id,
            secure_url: response.secure_url,
        };
    } catch (error) {
        await deleteLocalFile();
        throw new ApiError(500, error.message);
    }
};

// in use
export const deleteCloudFile = async (public_id) => {
    try {
        if (!public_id) return true;
        // console.log("ID: ", public_id);

        const resource_type = "image";

        // console.log(public_id);
        // console.log(resource_type);

        await cloudinary.uploader.destroy(public_id, {
            resource_type: resource_type,
        });

        return true;
    } catch (error) {
        // throw new ApiError(500, "Eroor deleting old avatar file");
        console.log("Error while deleting file", error);
    }
};

/* Subhra's Way */

/*
export const uploadImageToCloud = async (localFilePath) => {
    if (!localFilePath) return null;

    try {
        console.log("Uploading File: ", localFilePath);
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "image",
        });

        if (
            response?.moderation?.length > 0 &&
            response?.moderation[0]?.status === "rejected"
        ) {
            throw new ApiError(
                "This image is not safe to upload, please upload a different image",
                400
            );
        }

        // console.log("Uploaded File: ", localFilePath);
        return {
            public_id: response.public_id,
            secure_url: response.secure_url,
        };
    } catch (error) {
        console.log("Error while uploading file :: uploadImageToCloud :: ", error);
        await deleteLocalFiles();
        throw new ApiError(error.message, 500);
    }
};
*/

// subhra's way(Not currently used)
export const deleteLocalFiles = async () => {
    //     try {
    //         const tempDir = path.join(
    //             path.dirname(fileURLToPath(import.meta.url)),
    //             "../../public/temp"
    //         );
    //         if (fs.existsSync(tempDir)) {
    //             const files = await fs.promises.readdir(tempDir);
    //             await Promise.all(
    //                 files.map(async (file) => {
    //                     if (file !== ".gitkeep") {
    //                         const filePath = path.join(tempDir, file);
    //                         await fs.promises.unlink(filePath);
    //                     }
    //                 })
    //             );
    //         }
    //     } catch (error) {
    //         throw new ApiError("Error while deleting local files", 500);
    //     }
};
