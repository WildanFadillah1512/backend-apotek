const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/transaction.controller');

router.get('/', TransactionController.getAll);
router.post('/', TransactionController.create);
router.post('/sync', TransactionController.sync);

module.exports = router;
