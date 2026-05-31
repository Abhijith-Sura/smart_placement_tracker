require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function getOTP() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'abhiakhisura@gmail.com' }).select('+otp');
        if (user) {
            console.log('OTP for abhiakhisura@gmail.com is:', user.otp);
        } else {
            console.log('User not found.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
}

getOTP();
