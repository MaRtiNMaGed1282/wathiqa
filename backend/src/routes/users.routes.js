const express = require("express");

const router = express.Router();

const usersController = require("../controllers/users.controller");

const auth = require("../middlewares/auth.middleware");

const admin = require("../middlewares/admin.middleware");

router.get("/", auth, usersController.getUsers);

router.post("/", auth, admin, usersController.createUser);

router.put("/:id/status", auth, admin, usersController.toggleUserStatus);

router.put("/:id/password", auth, admin, usersController.resetPassword);

router.delete("/:id", auth, admin, usersController.deleteUser);

module.exports = router;
