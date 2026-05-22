import Razorpay from "razorpay";
import constants from "../constants.js";

const razorpayInstance = new Razorpay({
    key_id: constants.RAZORPAY_KEY_ID,
    key_secret: constants.RAZORPAY_KEY_SECRET,
});

export default razorpayInstance;