const express = require('express');
const auth = require('../middlewares/auth.middleware');
const controller = require('../controllers/sessions.controller');

const router = express.Router();
router.get('/', auth, controller.listMySessions);
router.post('/logout-all', auth, controller.revokeAllOtherSessions);
router.delete('/:id', auth, controller.revokeMySession);

module.exports = router;
