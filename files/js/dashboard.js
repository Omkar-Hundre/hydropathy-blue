// Check if user is authenticated
function checkAuth() {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
        window.location.href = 'index.html';
    }
}

// Set welcome message
function setWelcomeMessage() {
    const username = localStorage.getItem('username');
    const welcomeMessage = document.getElementById('welcomeMessage');
    welcomeMessage.textContent = `Welcome, ${username}!`;
}

// Logout function
function logout() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
}

// Run when page loads
checkAuth();
setWelcomeMessage(); 