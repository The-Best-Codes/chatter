const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, displayName, password, publicKeyIdentity, publicKeyBundle } = req.body;

  try {
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(409).json({ message: "Username already exists." });
    }

    const newUser = await User.create({ username, displayName, password, publicKeyIdentity, publicKeyBundle });

    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: "User created successfully!",
      token,
      user: newUser
    });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Internal server error during signup." });
  }
};

exports.login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
        const user = await User.findByUsername(username);
        if (!user) {
            return res.status(401).json({ message: "Authentication failed. User not found." });
        }

        // Don't allow frozen/deleted users to log in
        if (user.status !== 'active') {
            return res.status(403).json({ message: `Authentication failed. Account is ${user.status}.`})
        }

        const isPasswordMatch = await bcrypt.compare(password, user.hashed_password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: "Authentication failed. Invalid credentials." });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Don't send the hashed password back to the client
        const { hashed_password, ...userWithoutPassword } = user;

        res.status(200).json({
            message: "Login successful!",
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal server error during login." });
    }
};
