const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const User = require('../models/User');

// ─── @route  GET /api/chat/rooms ────────────────────────────
// ─── @access Private (All authenticated users) ──────────────
const getChatRooms = asyncHandler(async (req, res) => {
    // Find all chat rooms where the current user is a participant
    const rooms = await ChatRoom.find({ participants: req.user._id })
        .populate('participants', 'name role email') // Get user details
        .populate('groupAdmins', 'name role email')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });

    res.status(200).json({
        success: true,
        rooms,
    });
});

// ─── @route  GET /api/chat/:roomId ──────────────────────────
// ─── @access Private ────────────────────────────────────────
const getMessages = asyncHandler(async (req, res) => {
    const { roomId } = req.params;

    // Verify user is in this room, populate details for group view
    const room = await ChatRoom.findOne({ _id: roomId, participants: req.user._id })
        .populate('participants', 'name role email')
        .populate('groupAdmins', 'name role email')
        .populate('groupLogs.performedBy', 'name role');
    
    if (!room) {
        res.status(403);
        throw new Error('Access denied to this chat room');
    }

    // --- READ RECEIPT REFINEMENT: Mark unread messages as read by this user ---
    const unreadMessages = await Message.find({
        roomId,
        senderId: { $ne: req.user._id },
        'readBy.userId': { $ne: req.user._id }
    });

    if (unreadMessages.length > 0) {
        for (const msg of unreadMessages) {
            msg.readBy.push({ userId: req.user._id, readAt: new Date() });
            msg.readStatus = true;
            await msg.save();
        }

        // Notify other participants of read events real-time
        const io = req.app.get('io');
        if (io) {
            const { emitToUser } = require('../utils/socketManager');
            room.participants.forEach(pId => {
                if (pId.toString() !== req.user._id.toString()) {
                    emitToUser(io, pId.toString(), 'chat:messages_read', {
                        roomId,
                        userId: req.user._id,
                        messageIds: unreadMessages.map(m => m._id)
                    });
                }
            });
        }
    }

    const messages = await Message.find({ roomId })
        .sort({ createdAt: 1 }) // Chronological order
        .populate('senderId', 'name role')
        .populate('readBy.userId', 'name role email')
        .populate('pollOptions.votes', 'name role email');

    res.status(200).json({
        success: true,
        messages,
        room,
    });
});

// ─── @route  POST /api/chat/start ───────────────────────────
// ─── @access Private ────────────────────────────────────────
// Start a new chat room with a user, or get existing
const startChat = asyncHandler(async (req, res) => {
    const { targetUserId } = req.body;

    if (!targetUserId) {
        res.status(400);
        throw new Error('Target user ID is required');
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
        res.status(404);
        throw new Error('Target user not found');
    }

    const myRole = req.user.role;
    const targetRole = targetUser.role;

    const isAdminInvolved = myRole === 'admin' || targetRole === 'admin';
    const isCompanyAndStudent = (myRole === 'company' && targetRole === 'student') || (myRole === 'student' && targetRole === 'company');

    if (!isAdminInvolved && !isCompanyAndStudent) {
        res.status(403);
        throw new Error('You are not authorized to start a conversation with this user type.');
    }

    if (isCompanyAndStudent) {
        const studentId = myRole === 'student' ? req.user._id : targetUser._id;
        const companyId = myRole === 'company' ? req.user._id : targetUser._id;

        const Application = require('../models/Application');
        const Job = require('../models/Job');
        
        const companyJobs = await Job.find({ postedBy: companyId }).select('_id');
        const jobIds = companyJobs.map(j => j._id);

        const application = await Application.findOne({
            studentId,
            jobId: { $in: jobIds },
            status: { $in: ['shortlisted', 'interview', 'selected'] }
        });

        if (!application) {
            res.status(403);
            throw new Error('Companies can only message students who are shortlisted, in interview, or selected.');
        }
    }

    // Check if room already exists (1-to-1 only)
    let room = await ChatRoom.findOne({
        isGroup: { $ne: true },
        participants: { $all: [req.user._id, targetUserId] },
    }).populate('participants', 'name role');

    if (!room) {
        room = await ChatRoom.create({
            participants: [req.user._id, targetUserId],
            isGroup: false,
        });
        room = await room.populate('participants', 'name role');
    }

    res.status(200).json({
        success: true,
        room,
    });
});

// ─── @route  POST /api/chat/:roomId ─────────────────────────
// ─── @access Private ────────────────────────────────────────
const sendMessage = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
        res.status(400);
        throw new Error('Message content cannot be empty');
    }

    // Verify room access
    const room = await ChatRoom.findOne({ _id: roomId, participants: req.user._id });
    if (!room) {
        res.status(403);
        throw new Error('Access denied to this chat room');
    }

    // Create message with sender automatically in the readBy list
    const message = await Message.create({
        roomId,
        senderId: req.user._id,
        content: content.trim(),
        readBy: [{ userId: req.user._id, readAt: new Date() }]
    });

    // Update room's last message and timestamp
    room.lastMessage = message._id;
    await room.save();

    // Populate details
    await message.populate('senderId', 'name role');
    await message.populate('readBy.userId', 'name role email');

    // 🔴 WEBSOCKET EMIT (Socket.io) 🔴
    const io = req.app.get('io');
    if (io) {
        const { emitToUser } = require('../utils/socketManager');
        room.participants.forEach(pId => {
            if (pId.toString() !== req.user._id.toString()) {
                emitToUser(io, pId.toString(), 'chat:receive_message', { message });
            }
        });
    }

    res.status(201).json({
        success: true,
        message,
    });
});

// ─── @route  GET /api/chat/contacts ──────────────────────────
// ─── @access Private (All authenticated users) ──────────────
const getChatContacts = asyncHandler(async (req, res) => {
    const myRole = req.user.role;
    const myId = req.user._id;

    let contacts = [];

    if (myRole === 'admin') {
        // Admin can chat with any student or company
        contacts = await User.find({ 
            role: { $in: ['student', 'company'] },
            _id: { $ne: myId }
        }).select('name role email');
    } else if (myRole === 'student') {
        // Student can chat with any admin
        const admins = await User.find({ role: 'admin' }).select('name role email');
        
        const Application = require('../models/Application');
        
        const apps = await Application.find({
            studentId: myId,
            status: { $in: ['shortlisted', 'interview', 'selected'] }
        }).populate({
            path: 'jobId',
            select: 'postedBy',
            populate: {
                path: 'postedBy',
                select: 'name role email'
            }
        });

        const companiesMap = {};
        apps.forEach(app => {
            if (app.jobId && app.jobId.postedBy) {
                const comp = app.jobId.postedBy;
                companiesMap[comp._id.toString()] = comp;
            }
        });
        
        const eligibleCompanies = Object.values(companiesMap);
        contacts = [...admins, ...eligibleCompanies];
    } else if (myRole === 'company') {
        // Company can chat with any admin
        const admins = await User.find({ role: 'admin' }).select('name role email');
        
        const Application = require('../models/Application');
        const Job = require('../models/Job');
        
        const myJobs = await Job.find({ postedBy: myId }).select('_id');
        const jobIds = myJobs.map(j => j._id);
        
        const apps = await Application.find({
            jobId: { $in: jobIds },
            status: { $in: ['shortlisted', 'interview', 'selected'] }
        }).populate({
            path: 'studentId',
            select: 'name role email'
        });
        
        const studentsMap = {};
        apps.forEach(app => {
            if (app.studentId) {
                const stud = app.studentId;
                studentsMap[stud._id.toString()] = stud;
            }
        });
        
        const eligibleStudents = Object.values(studentsMap);
        contacts = [...admins, ...eligibleStudents];
    }

    // Exclude users who already have active 1-to-1 rooms
    const existingRooms = await ChatRoom.find({
        participants: myId,
        isGroup: { $ne: true }
    });

    const activeChatParticipantIds = new Set();
    existingRooms.forEach(room => {
        room.participants.forEach(pId => {
            if (pId.toString() !== myId.toString()) {
                activeChatParticipantIds.add(pId.toString());
            }
        });
    });

    contacts = contacts.filter(contact => !activeChatParticipantIds.has(contact._id.toString()));

    res.status(200).json({
        success: true,
        contacts,
    });
});

// ─── @route  POST /api/chat/groups ───────────────────────────
// ─── @access Private (Admin only) ────────────────────────────
const createGroupChat = asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Only administrators can create group chats');
    }

    const { groupName, participants } = req.body;

    if (!groupName || !groupName.trim()) {
        res.status(400);
        throw new Error('Group name is required');
    }

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
        res.status(400);
        throw new Error('At least one group participant is required');
    }

    // Enforce including the creator
    const memberIds = [...new Set([req.user._id.toString(), ...participants])];

    const group = await ChatRoom.create({
        isGroup: true,
        groupName: groupName.trim(),
        participants: memberIds,
        createdBy: req.user._id,
        groupAdmins: [req.user._id], // Creator is the default admin
        groupLogs: [
            {
                action: `Group created by ${req.user.name}`,
                performedBy: req.user._id,
            }
        ]
    });

    const populatedGroup = await ChatRoom.findById(group._id)
        .populate('participants', 'name role email')
        .populate('groupAdmins', 'name role email')
        .populate('groupLogs.performedBy', 'name role');

    // Socket notify members
    const io = req.app.get('io');
    if (io) {
        const { emitToUser } = require('../utils/socketManager');
        memberIds.forEach(pId => {
            if (pId.toString() !== req.user._id.toString()) {
                emitToUser(io, pId.toString(), 'chat:group_created', { room: populatedGroup });
            }
        });
    }

    res.status(201).json({
        success: true,
        room: populatedGroup,
    });
});

// ─── @route  POST /api/chat/groups/:roomId/members ───────────
// ─── @access Private (Admins or Group Admins only) ───────────
const manageGroupMembers = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const { participants } = req.body;

    if (!participants || !Array.isArray(participants)) {
        res.status(400);
        throw new Error('Participants array is required');
    }

    const room = await ChatRoom.findOne({ _id: roomId, isGroup: true });
    if (!room) {
        res.status(404);
        throw new Error('Group chat room not found');
    }

    // AUTH CHECK: Must be platform admin OR in the groupAdmins array!
    const isGroupAdmin = room.groupAdmins.some(aId => aId.toString() === req.user._id.toString());
    const isPlatformAdmin = req.user.role === 'admin';

    if (!isGroupAdmin && !isPlatformAdmin) {
        res.status(403);
        throw new Error('Only group administrators can manage members');
    }

    // Enforce creator always stays in group
    const newMemberIds = [...new Set([req.user._id.toString(), ...participants])];
    
    // Find who was added and who was removed for audit logging
    const oldMemberIds = room.participants.map(p => p.toString());
    const added = newMemberIds.filter(id => !oldMemberIds.includes(id));
    const removed = oldMemberIds.filter(id => !newMemberIds.includes(id));

    room.participants = newMemberIds;

    // Log the actions
    const User = require('../models/User');
    for (const userId of added) {
        const u = await User.findById(userId).select('name');
        if (u) {
            room.groupLogs.push({
                action: `Added member ${u.name}`,
                performedBy: req.user._id,
            });
        }
    }
    for (const userId of removed) {
        const u = await User.findById(userId).select('name');
        if (u) {
            room.groupLogs.push({
                action: `Removed member ${u.name}`,
                performedBy: req.user._id,
            });
            // If they were an admin, demote them too
            room.groupAdmins = room.groupAdmins.filter(aId => aId.toString() !== userId);
        }
    }

    await room.save();

    const populatedGroup = await ChatRoom.findById(room._id)
        .populate('participants', 'name role email')
        .populate('groupAdmins', 'name role email')
        .populate('groupLogs.performedBy', 'name role');

    // Notify all participants of membership update
    const io = req.app.get('io');
    if (io) {
        const { emitToUser } = require('../utils/socketManager');
        const unionParticipants = [...new Set([...oldMemberIds, ...newMemberIds])];
        unionParticipants.forEach(pId => {
            emitToUser(io, pId, 'chat:group_updated', { room: populatedGroup });
        });
    }

    res.status(200).json({
        success: true,
        room: populatedGroup,
    });
});

// ─── @route  POST /api/chat/groups/:roomId/admins ────────────
// ─── @access Private (Admins or Group Admins only) ───────────
const manageGroupAdmins = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const { targetUserId, action } = req.body; // 'promote' or 'demote'

    if (!targetUserId || !action) {
        res.status(400);
        throw new Error('Target user ID and action are required');
    }

    const room = await ChatRoom.findOne({ _id: roomId, isGroup: true });
    if (!room) {
        res.status(404);
        throw new Error('Group chat room not found');
    }

    // AUTH CHECK: Must be platform admin OR in the groupAdmins array!
    const isGroupAdmin = room.groupAdmins.some(aId => aId.toString() === req.user._id.toString());
    const isPlatformAdmin = req.user.role === 'admin';

    if (!isGroupAdmin && !isPlatformAdmin) {
        res.status(403);
        throw new Error('Only group administrators can manage admin privileges');
    }

    const targetUser = await User.findById(targetUserId).select('name');
    if (!targetUser) {
        res.status(404);
        throw new Error('Target user not found');
    }

    // Verify target is a participant
    if (!room.participants.some(pId => pId.toString() === targetUserId)) {
        res.status(400);
        throw new Error('Target user is not a member of this group');
    }

    if (action === 'promote') {
        if (!room.groupAdmins.some(aId => aId.toString() === targetUserId)) {
            room.groupAdmins.push(targetUserId);
            room.groupLogs.push({
                action: `Promoted ${targetUser.name} to Group Admin`,
                performedBy: req.user._id
            });
        }
    } else if (action === 'demote') {
        // Enforce at least one admin remains
        if (room.groupAdmins.length <= 1 && room.groupAdmins.some(aId => aId.toString() === targetUserId)) {
            res.status(400);
            throw new Error('Cannot demote the only remaining administrator');
        }
        room.groupAdmins = room.groupAdmins.filter(aId => aId.toString() !== targetUserId);
        room.groupLogs.push({
            action: `Demoted ${targetUser.name} from Group Admin`,
            performedBy: req.user._id
        });
    } else {
        res.status(400);
        throw new Error('Invalid action. Use promote or demote');
    }

    await room.save();

    const populatedGroup = await ChatRoom.findById(room._id)
        .populate('participants', 'name role email')
        .populate('groupAdmins', 'name role email')
        .populate('groupLogs.performedBy', 'name role');

    // Notify participants
    const io = req.app.get('io');
    if (io) {
        const { emitToUser } = require('../utils/socketManager');
        room.participants.forEach(pId => {
            emitToUser(io, pId.toString(), 'chat:group_updated', { room: populatedGroup });
        });
    }

    res.status(200).json({
        success: true,
        room: populatedGroup,
    });
});

// ─── @route  POST /api/chat/rooms/:roomId/meeting ────────────
// ─── @access Private (Admins or Group Admins only) ───────────
const toggleMeeting = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const { action } = req.body; // 'start' or 'stop'

    const room = await ChatRoom.findOne({ _id: roomId, participants: req.user._id });
    if (!room) {
        res.status(403);
        throw new Error('Access denied to this chat room');
    }

    // Group-only admin enforcement
    if (room.isGroup) {
        const isGroupAdmin = room.groupAdmins.some(aId => aId.toString() === req.user._id.toString());
        const isPlatformAdmin = req.user.role === 'admin';
        if (!isGroupAdmin && !isPlatformAdmin) {
            res.status(403);
            throw new Error('Only group administrators can start/stop meetings in this group');
        }
    }

    if (action === 'start') {
        const link = `https://meet.jit.si/PlaceIQ_Meeting_${room._id}_${Date.now()}`;
        room.meetingActive = true;
        room.meetingLink = link;
        room.groupLogs.push({
            action: `Video meeting started by ${req.user.name}`,
            performedBy: req.user._id,
        });

        // Add a system announcement message to the feed
        const systemMessage = await Message.create({
            roomId: room._id,
            senderId: req.user._id,
            content: `📞 Meeting started. Click "Join Video Call" in the header or in logs to join!`,
            readBy: [{ userId: req.user._id, readAt: new Date() }]
        });
        room.lastMessage = systemMessage._id;
    } else {
        room.meetingActive = false;
        room.meetingLink = '';
        room.groupLogs.push({
            action: `Video meeting ended by ${req.user.name}`,
            performedBy: req.user._id,
        });

        // Add a system announcement message to the feed
        const systemMessage = await Message.create({
            roomId: room._id,
            senderId: req.user._id,
            content: `📞 Meeting ended.`,
            readBy: [{ userId: req.user._id, readAt: new Date() }]
        });
        room.lastMessage = systemMessage._id;
    }

    await room.save();

    const populatedRoom = await ChatRoom.findById(room._id)
        .populate('participants', 'name role email')
        .populate('groupAdmins', 'name role email')
        .populate('groupLogs.performedBy', 'name role');

    // Notify participants
    const io = req.app.get('io');
    if (io) {
        const { emitToUser } = require('../utils/socketManager');
        room.participants.forEach(pId => {
            emitToUser(io, pId.toString(), 'chat:meeting_toggled', { room: populatedRoom });
        });
    }

    res.status(200).json({
        success: true,
        room: populatedRoom,
    });
});

// ─── @route  POST /api/chat/rooms/:roomId/poll ───────────────
// ─── @access Private ─────────────────────────────────────────
const createPoll = asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const { question, options } = req.body;

    if (!question || !question.trim()) {
        res.status(400);
        throw new Error('Poll question is required');
    }

    if (!options || !Array.isArray(options) || options.length < 2) {
        res.status(400);
        throw new Error('At least two options are required for a poll');
    }

    const room = await ChatRoom.findOne({ _id: roomId, participants: req.user._id });
    if (!room) {
        res.status(403);
        throw new Error('Access denied to this chat room');
    }

    // Format options with an empty votes array
    const formattedOptions = options.map(opt => ({
        optionText: opt.trim(),
        votes: []
    }));

    // Create Message
    const message = await Message.create({
        roomId,
        senderId: req.user._id,
        content: `📊 Poll: ${question.trim()}`,
        isPoll: true,
        pollQuestion: question.trim(),
        pollOptions: formattedOptions,
        readBy: [{ userId: req.user._id, readAt: new Date() }]
    });

    room.lastMessage = message._id;
    await room.save();

    await message.populate('senderId', 'name role');
    await message.populate('readBy.userId', 'name role email');

    // Notify members via socket
    const io = req.app.get('io');
    if (io) {
        const { emitToUser } = require('../utils/socketManager');
        room.participants.forEach(pId => {
            if (pId.toString() !== req.user._id.toString()) {
                emitToUser(io, pId.toString(), 'chat:receive_message', { message });
            }
        });
    }

    res.status(201).json({
        success: true,
        message,
    });
});

// ─── @route  POST /api/chat/messages/:messageId/vote ─────────
// ─── @access Private ─────────────────────────────────────────
const votePoll = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { optionId } = req.body;

    if (!optionId) {
        res.status(400);
        throw new Error('Option ID is required');
    }

    const message = await Message.findById(messageId);
    if (!message || !message.isPoll) {
        res.status(404);
        throw new Error('Poll message not found');
    }

    // Verify user is in the room
    const room = await ChatRoom.findOne({ _id: message.roomId, participants: req.user._id });
    if (!room) {
        res.status(403);
        throw new Error('Access denied to this poll');
    }

    const option = message.pollOptions.id(optionId);
    if (!option) {
        res.status(404);
        throw new Error('Poll option not found');
    }

    // Toggle user vote
    const userIdStr = req.user._id.toString();
    const hasVoted = option.votes.some(id => id.toString() === userIdStr);

    if (hasVoted) {
        // Remove vote
        option.votes = option.votes.filter(id => id.toString() !== userIdStr);
    } else {
        // Add vote
        option.votes.push(req.user._id);
    }

    await message.save();

    const populatedMsg = await Message.findById(message._id)
        .populate('senderId', 'name role')
        .populate('readBy.userId', 'name role email')
        .populate('pollOptions.votes', 'name role email');

    // Broadcast poll update to all other room participants
    const io = req.app.get('io');
    if (io) {
        const { emitToUser } = require('../utils/socketManager');
        room.participants.forEach(pId => {
            emitToUser(io, pId.toString(), 'chat:poll_updated', { message: populatedMsg });
        });
    }

    res.status(200).json({
        success: true,
        message: populatedMsg,
    });
});

module.exports = {
    getChatRooms,
    getMessages,
    startChat,
    sendMessage,
    getChatContacts,
    createGroupChat,
    manageGroupMembers,
    toggleMeeting,
    manageGroupAdmins,
    createPoll,
    votePoll,
};
