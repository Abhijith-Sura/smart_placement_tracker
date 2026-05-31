const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/chatController');

// All chat routes require authentication
router.use(protect);

router.get('/rooms', getChatRooms);
router.get('/contacts', getChatContacts);
router.post('/start', startChat);
router.post('/groups', createGroupChat);
router.post('/groups/:roomId/members', manageGroupMembers);
router.post('/groups/:roomId/admins', manageGroupAdmins);
router.post('/rooms/:roomId/meeting', toggleMeeting);
router.post('/rooms/:roomId/poll', createPoll);
router.post('/messages/:messageId/vote', votePoll);
router.get('/:roomId', getMessages);
router.post('/:roomId', sendMessage);

module.exports = router;
