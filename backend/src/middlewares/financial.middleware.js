module.exports = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "غير مصرح",
    });
  }

  if (req.user.role !== "admin" && req.user.role !== "lawyer") {
    return res.status(403).json({
      message: "ليس لديك صلاحية للوصول إلى البيانات المالية",
    });
  }

  next();
};
