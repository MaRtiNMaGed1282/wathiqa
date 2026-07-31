const express = require("express");
const router = express.Router();

const { getAllLaws, getLawById } = require("../controllers/library.controller");

router.get("/laws", getAllLaws);

router.get("/laws/:id", getLawById);

module.exports = router;
