import { Router } from "express";
import { body } from "express-validator";
import { login, signup } from "../controllers/authController.js";

const router = Router();

// POST /api/auth/signup
router.post(
  "/signup",
  [
    body("username")
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage("Username must be between 3 and 20 characters.")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage(
        "Username can only contain letters, numbers, and underscores.",
      ),
    body("displayName")
      .trim()
      .notEmpty()
      .withMessage("Display name cannot be empty."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long."),
    body("publicKeyIdentity")
      .notEmpty()
      .withMessage("Public identity key is required."),
    body("publicKeyBundle")
      .isObject()
      .withMessage("Public key bundle must be a valid JSON object."),
  ],
  signup,
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("username").notEmpty().withMessage("Username is required."),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  login,
);

export default router;
