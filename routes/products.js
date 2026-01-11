const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/product.controller');

router.get('/', ProductController.getAll);
router.post('/', ProductController.create);

module.exports = router;
