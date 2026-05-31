const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');

        const User = require('./models/User');
        const ChatRoom = require('./models/ChatRoom');

        // Fetch all Admins
        const admins = await User.find({ role: 'admin' });
        console.log(`\n--- Admins in Database (${admins.length}) ---`);
        admins.forEach(u => console.log(`ID: ${u._id}, Name: "${u.name}", Email: "${u.email}"`));

        // Fetch all Students
        const students = await User.find({ role: 'student' });
        console.log(`\n--- Students in Database (${students.length}) ---`);
        students.forEach(u => console.log(`ID: ${u._id}, Name: "${u.name}", Email: "${u.email}"`));

        // Fetch all ChatRooms
        const rooms = await ChatRoom.find({}).populate('participants', 'name role email');
        console.log(`\n--- ChatRooms in Database (${rooms.length}) ---`);
        rooms.forEach((r, idx) => {
            const pNames = r.participants.map(p => `"${p.name}" (${p.role})`).join(' and ');
            console.log(`[Room ${idx + 1}] ID: ${r._id}, Participants: ${pNames}, LastMessage: ${r.lastMessage}`);
        });

        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

run();
