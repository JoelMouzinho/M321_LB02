document.addEventListener("DOMContentLoaded", () => {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("login");
  const errorText = document.getElementById("errorText");

  loginButton.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      errorText.innerText = "Username and password are required.";
      errorText.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        errorText.innerText = data.error || "Invalid username or password.";
        errorText.classList.remove("hidden");
        return;
      }

      localStorage.setItem("token", data.token);
      window.location.href = "/";
    } catch (error) {
      console.error("Login Error:", error);
    }
  });
});