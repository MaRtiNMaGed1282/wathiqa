module.exports = (req, res, next) => {
  if (req.user?.role === "assistant" && req.body && Object.prototype.hasOwnProperty.call(req.body, "total_fees")) {
    return res.status(403).json({
      message: "ليس لديك صلاحية لتعديل البيانات المالية",
    });
  }

  next();
};
