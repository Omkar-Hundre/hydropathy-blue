class Authentication {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.errorMessage = document.getElementById('errorMessage');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const userId = document.getElementById('userId').value;
        const password = document.getElementById('password').value;

        try {
            const users = await this.fetchUsers();
            const user = users.find(u => u.id === userId);

            if (!user) {
                this.showError('Invalid user ID or password');
                return;
            }

            const hashedPassword = await this.hashPassword(password);
            
            if (user.password === hashedPassword) {
                // Store login state
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('userId', userId);
                
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                this.showError('Invalid user ID or password');
            }
        } catch (error) {
            this.showError('An error occurred. Please try again.');
            console.error('Login error:', error);
        }
    }

    async fetchUsers() {
        try {
            const response = await fetch('files/data/users.json');
            const data = await response.json();
            return data.users;
        } catch (error) {
            throw new Error('Failed to fetch users data');
        }
    }

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
        setTimeout(() => {
            this.errorMessage.classList.add('hidden');
        }, 3000);
    }
}

// Initialize authentication when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Authentication();
}); 