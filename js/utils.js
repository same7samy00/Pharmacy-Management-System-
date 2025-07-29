// js/utils.js
export function showNotification(message, type = 'info', duration = 3000) {
    const notificationsContainer = document.getElementById('notifications');
    if (!notificationsContainer) {
        console.warn('Notifications container not found!');
        return;
    }

    const notificationDiv = document.createElement('div');
    notificationDiv.className = `p-4 mb-3 rounded-lg shadow-md fade-in flex items-center space-x-3 space-x-reverse ${
        type === 'success' ? 'bg-green-100 text-green-800' :
        type === 'error' ? 'bg-red-100 text-red-800' :
        'bg-blue-100 text-blue-800'
    }`;
    notificationDiv.innerHTML = `
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            ${type === 'success' ? '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>' :
            type === 'error' ? '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>' :
            '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>'
        }
        </svg>
        <span>${message}</span>
        <button onclick="this.parentNode.remove()" class="text-gray-500 hover:text-gray-700 mr-auto">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
        </button>
    `;
    notificationsContainer.appendChild(notificationDiv);

    setTimeout(() => {
        notificationDiv.classList.remove('fade-in');
        notificationDiv.classList.add('fade-out');
        notificationDiv.addEventListener('animationend', () => notificationDiv.remove());
    }, duration);
}

let isDarkMode = localStorage.getItem('darkMode') === 'true'; // Load from localStorage

export function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    const body = document.getElementById('mainBody');
    const darkModeIcon = document.getElementById('darkModeIcon');

    if (isDarkMode) {
        body.classList.add('dark-mode');
        if (darkModeIcon) {
            darkModeIcon.innerHTML = `
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
            `;
        }
        showNotification('تم تفعيل الوضع الليلي', 'success');
    } else {
        body.classList.remove('dark-mode');
        if (darkModeIcon) {
            darkModeIcon.innerHTML = `
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
            `;
        }
        showNotification('تم إلغاء الوضع الليلي', 'success');
    }
    localStorage.setItem('darkMode', isDarkMode); // Save preference
}

export function showSection(sectionName, clickedButton = null) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });

    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('fade-in');
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        btn.classList.add('text-gray-600');
    });

    if (clickedButton) {
        clickedButton.classList.remove('text-gray-600');
        clickedButton.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
    } else {
        // This case handles programmatic section changes, like after login
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            // Find button by sectionName attribute or data attribute if you add one
            if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`showSection('${sectionName}')`)) {
                btn.classList.remove('text-gray-600');
                btn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
            }
        });
    }
    localStorage.setItem('lastSection', sectionName);
}

// Function to initialize dark mode on page load
export function initializeTheme() {
    const body = document.getElementById('mainBody');
    if (localStorage.getItem('darkMode') === 'true') {
        body.classList.add('dark-mode');
        const darkModeIcon = document.getElementById('darkModeIcon');
        if (darkModeIcon) {
            darkModeIcon.innerHTML = `
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
            `;
        }
    }
}

// Make functions globally accessible for onclick attributes
window.showNotification = showNotification;
window.toggleDarkMode = toggleDarkMode;
window.showSection = (sectionName) => showSection(sectionName, event.currentTarget);
