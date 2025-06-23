const AuthService = {
  /**
   * Handles user login.
   * @param {string} username - The user's username.
   * @param {string} password - The user's password.
   * @returns {Promise<object>} A promise that resolves with user data and token on success.
   * @throws {Error} Throws an error if login fails (e.g., network error, API error response).
   */
  login: async (username, password) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data.message ||
          (data.errors && data.errors[0]?.msg) ||
          "Login failed.";
        throw new Error(errorMessage);
      }

      localStorage.setItem("chatterUserToken", data.token);

      return data;
    } catch (error) {
      console.error("AuthService: Login Error:", error);
      throw error;
    }
  },

  /**
   * Handles user signup.
   * @param {object} userData - Object containing username, displayName, password, publicKeyIdentity, publicKeyBundle.
   * @returns {Promise<object>} A promise that resolves with new user data and token on success.
   * @throws {Error} Throws an error if signup fails.
   */
  signup: async ({
    username,
    displayName,
    password,
    publicKeyIdentity,
    publicKeyBundle,
  }) => {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          displayName,
          password,
          publicKeyIdentity,
          publicKeyBundle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data.message ||
          (data.errors && data.errors[0]?.msg) ||
          "Signup failed.";
        throw new Error(errorMessage);
      }

      localStorage.setItem("userToken", data.token);

      return data;
    } catch (error) {
      console.error("AuthService: Signup Error:", error);
      throw error;
    }
  },

  logout: () => {
    // TODO: API route for this? Use session routes?
    localStorage.removeItem("userToken");
  },

  getToken: () => {
    // TODO: User info endpoint?
    return localStorage.getItem("userToken");
  },
};

export default AuthService;
