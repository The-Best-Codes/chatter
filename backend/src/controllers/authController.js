import { compare } from "bcrypt";
import { validationResult } from "express-validator";
import jsonWebToken from "jsonwebtoken";
import { getRoomsForUser } from "../models/roomModel.js";
import { create as _create } from "../models/sessionModel.js";
import { create, findByUsername } from "../models/userModel.js";

const { sign } = jsonWebToken;

export async function signup(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    username,
    displayName,
    password,
    publicKeyIdentity = "placeholder", // TODO: Implement E2E encryption
    publicKeyBundle = {}, // TODO: Implement E2E encryption
  } = req.body;

  try {
    const existingUser = await findByUsername(username);
    if (existingUser) {
      return res.status(409).json({ message: "Username already exists." });
    }

    const newUser = await create({
      username,
      displayName,
      password,
      publicKeyIdentity,
      publicKeyBundle,
    });

    const token = sign(
      { userId: newUser.id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    res.status(201).json({
      message: "User created successfully!",
      token,
      user: newUser,
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Internal server error during signup." });
  }
}

export async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    const user = await findByUsername(username);
    if (!user) {
      return res
        .status(401)
        .json({ message: "Authentication failed. User not found." });
    }

    if (user.status !== "active") {
      return res
        .status(403)
        .json({ message: `Authentication failed. Account is ${user.status}.` });
    }

    const isPasswordMatch = await compare(password, user.hashed_password);
    if (!isPasswordMatch) {
      return res
        .status(401)
        .json({ message: "Authentication failed. Invalid credentials." });
    }

    const token = sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    await _create(user.id, token, req.headers["user-agent"], req.ip);

    const { hashed_password, ...userWithoutPassword } = user;

    res.status(200).json({
      message: "Login successful!",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal server error during login." });
  }
}
