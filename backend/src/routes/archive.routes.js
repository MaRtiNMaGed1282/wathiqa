'use strict';

const express = require('express');
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const controller = require('../controllers/archive.controller');

const router = express.Router();

router.get('/', auth, role('admin'), controller.listArchived);
router.post('/', auth, role('admin'), controller.archive);
router.put('/:id/restore', auth, role('admin'), controller.restore);

module.exports = router;
