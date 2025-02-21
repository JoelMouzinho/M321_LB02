document.addEventListener("DOMContentLoaded", () => {
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const registerButton = document.getElementById("register");
    const errorText = document.getElementById("errorText");

    registerButton.addEventListener("click", async (event) => {
        event.preventDefault(); // Verhindert das Neuladen der Seite

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        if (!username || !password || !confirmPassword) {
            errorText.innerText = "All fields are required.";
            errorText.classList.remove("hidden");
            return;
        }

        if (password !== confirmPassword) {
            errorText.innerText = "Passwords do not match.";
            errorText.classList.remove("hidden");
            return;
        }

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Registration failed");
            }

            alert("Registration successful! Redirecting to login...");
            window.location.href = "/login";
        } catch (error) {
            errorText.innerText = error.message;
            errorText.classList.remove("hidden");
        }
    });
});