exports.isAdmin = (req, res, next) => {
  // This middleware should be used AFTER the `protect` middleware,
  // so req.user will be available.
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Forbidden. Administrator access required." });
  }
};
