'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/invoices.controller');
const auth = require('../middlewares/auth.middleware');
const financial = require('../middlewares/financial.middleware');

router.use(auth, financial);
router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.post('/:id/payments', controller.recordPayment);
router.patch('/:id/cancel', controller.cancel);

module.exports = router;
