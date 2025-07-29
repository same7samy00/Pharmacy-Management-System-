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

                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    const userRole = userData.role;
                    localStorage.setItem('userRole', userRole);

                    showNotification('تم تسجيل الدخول بنجاح!', 'success');

                    if (userRole === 'doctor') {
                        window.location.href = 'index.html'; // أو dashboard.html
                    } else if (userRole === 'assistant') {
                        window.location.href = 'pos.html';
                    } else {
                        errorMessage.textContent = 'دور المستخدم غير معرف.';
                        await auth.signOut();
                    }
                } else {
                    errorMessage.textContent = 'بيانات المستخدم غير موجودة في قاعدة البيانات.';
                    await auth.signOut();
                }

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

    // *** تم إزالة جزء الحماية للصفحات الأخرى مؤقتًا لأغراض الاختبار ***
    // onAuthStateChanged(auth, async (user) => {
    //     if (window.location.pathname !== '/login.html') { // Only run if not on login page
    //         if (!user) {
    //             window.location.href = 'login.html';
    //         } else {
    //             const userDocRef = doc(db, "users", user.uid);
    //             const userDocSnap = await getDoc(userDocRef);
    //             if (userDocSnap.exists()) {
    //                 const userData = userDocSnap.data();
    //                 const userRole = userData.role;
    //                 localStorage.setItem('userRole', userRole);

    //                 const currentPage = window.location.pathname.split('/').pop();
    //                 const doctorAllowedPages = ['index.html', 'dashboard.html', 'inventory.html', 'pos.html', 'debts.html', 'customers.html', 'suppliers.html', 'reports.html', 'settings.html'];
    //                 const assistantAllowedPages = ['index.html', 'dashboard.html', 'pos.html', 'debts.html', 'customers.html'];

    //                 if (userRole === 'doctor' && !doctorAllowedPages.includes(currentPage)) {
    //                     alert('ليس لديك الصلاحية لدخول هذه الصفحة.');
    //                     window.location.href = 'index.html';
    //                 } else if (userRole === 'assistant' && !assistantAllowedPages.includes(currentPage)) {
    //                     alert('ليس لديك الصلاحية لدخول هذه الصفحة.');
    //                     window.location.href = 'pos.html';
    //                 }
    //             } else {
    //                 await auth.signOut();
    //                 window.location.href = 'login.html';
    //             }
    //         }
    //     }
    // });
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
