'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const admin = require('../middlewares/admin.middleware');
const permissionsController = require('../controllers/permissions.controller');

router.get('/definitions', auth, admin, permissionsController.getDefinitions);
router.get('/users/:id', auth, admin, permissionsController.getUserPermissions);
router.put('/users/:id', auth, admin, permissionsController.updateUserPermissions);
router.put('/users/:id/profile', auth, admin, permissionsController.updateUser);

module.exports = router;
