const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { validateTransfer } = require('../middleware/validation');
const { validateSecurityCodeRequest } = require('../middleware/validation');

// POST /api/transfers/request-code - Request security code for transfer
router.post('/request-code',
  validateSecurityCodeRequest,
  transferController.requestSecurityCode
);

// POST /api/transfers - Create a new transfer
router.post('/',
  validateTransfer,
  transferController.createTransfer
);

// GET /api/transfers - Get user's transfer history
router.get('/',
  transferController.getUserTransfers
);

// GET /api/transfers/:id - Get specific transfer details
router.get('/:id',
  transferController.getTransferById
);

// GET /api/transfers/status/:id - Get transfer status
router.get('/status/:id',
  transferController.getTransferStatus
);

module.exports = router;
