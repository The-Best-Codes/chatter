import { verify } from "jsonwebtoken";
import { findById } from "../models/userModel";

export async function protect(req, res, next) {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header (e.g., "Bearer <token>")
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = verify(token, process.env.JWT_SECRET);

      // Attach user to the request object, but without the password
      req.user = await findById(decoded.userId);

      if (!req.user || req.user.status !== "active") {
        return res
          .status(401)
          .json({ message: "Not authorized, user not active" });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
}
