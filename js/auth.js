// js/auth.js
import { auth, db } from './firebase-init.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { showNotification } from './utils.js'; // Import utility for notifications

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            errorMessage.textContent = '';

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // *** تم إزالة التحقق من دور المستخدم وبياناته في Firestore تمامًا هنا ***
                // سيتم توجيه المستخدم مباشرة بعد تسجيل الدخول بنجاح في Firebase Auth.

                showNotification('تم تسجيل الدخول بنجاح!', 'success');
                window.location.href = 'index.html'; // توجيه الجميع لصفحة البداية

            } catch (error) {
                let message = 'حدث خطأ أثناء تسجيل الدخول. يرجى التحقق من البريد الإلكتروني وكلمة المرور.';
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
                } else if (error.code === 'auth/invalid-email') {
                    message = 'صيغة البريد الإلكتروني غير صحيحة.';
                } else if (error.code === 'auth/too-many-requests') {
                    message = 'تم حظر هذا الحساب مؤقتًا بسبب محاولات تسجيل الدخول الفاشلة المتكررة. حاول مرة أخرى لاحقًا.';
                }
                errorMessage.textContent = message;
                showNotification(message, 'error');
                console.error("Login error:", error.message);
            }
        });
    }

    // *** تم إزالة جميع التحققات من حالة المصادقة والدور للصفحات الأخرى هنا أيضًا ***
    // هذا يعني أن أي صفحة يتم الوصول إليها (غير صفحة تسجيل الدخول)
    // لن تقوم بالتحقق مما إذا كان المستخدم مسجل دخول أم لا.
    // يجب أن تكون جميع الصفحات المحمية (index.html, pos.html, etc.) هي التي تستدعي هذا auth.js.
    // لكن مع إزالة هذا الجزء، لن يكون هناك فحص على الإطلاق.
    /*
    if (window.location.pathname !== '/login.html') {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // User is not logged in, redirect to login page
                window.location.href = 'login.html';
            } else {
                // No role checking here
                // User is logged in, allow access to the page
            }
        });
    }
    */
});

// Logout function
export async function logout() {
    try {
        await auth.signOut();
        localStorage.removeItem('userRole');
        localStorage.removeItem('lastSection'); // Clear last section on logout
        showNotification('تم تسجيل الخروج بنجاح!', 'info');
        window.location.href = 'login.html';
    } catch (error) {
        showNotification('حدث خطأ أثناء تسجيل الخروج: ' + error.message, 'error');
        console.error("Logout error:", error.message);
    }
}

window.logout = logout; // Make logout globally accessible for the header button
