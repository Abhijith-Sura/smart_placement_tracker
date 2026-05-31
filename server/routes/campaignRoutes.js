const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getTargetCount, sendCampaign, getCampaigns } = require('../controllers/campaignController');

// Secure all campaign paths to Admin or Company accounts
router.use(protect);
router.use(authorize('admin', 'company'));

router.post('/target-count', getTargetCount);
router.post('/send', sendCampaign);
router.get('/', getCampaigns);

module.exports = router;
