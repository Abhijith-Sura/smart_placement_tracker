const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createReferralListing,
    getReferralListings,
    getMyReferralListings,
    updateReferralListing,
    deleteReferralListing,
    applyForReferral,
    getReferralApplications,
    updateReferralApplicationStatus,
} = require('../controllers/referralController');

// All referral routes require authentication
router.use(protect);

// Listings
router.post('/', createReferralListing);
router.get('/', getReferralListings);
router.get('/my-posts', getMyReferralListings);
router.patch('/:id', updateReferralListing);
router.delete('/:id', deleteReferralListing);

// Applications
router.post('/:id/apply', applyForReferral);
router.get('/applications', getReferralApplications);
router.patch('/applications/:appId', updateReferralApplicationStatus);

module.exports = router;
