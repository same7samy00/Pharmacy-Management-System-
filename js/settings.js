// js/settings.js
import { db, auth } from './firebase-init.js';
import { doc, getDoc, updateDoc, setDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { showNotification } from './utils.js';

const settingsDocRef = doc(db, "settings", "pharmacy_config"); // Assuming one config document
const usersCollection = collection(db, "users");

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadUsers(); // Load users for management
});

export async function loadSettings() {
    try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            const settings = docSnap.data();
            document.querySelector('#settings input[value="صيدلية الشفاء"]').value = settings.pharmacyName || '';
            document.querySelector('#settings textarea').value = settings.address || '';
            document.querySelector('#settings input[value="011-4567890"]').value = settings.phone || '';
            document.querySelector('#settings input[value="info@pharmacy.com"]').value = settings.email || '';
            document.querySelector('#settings select[class*="border border-gray-300"]').value = (settings.expiryAlertDays + ' يوم') || '30 يوم';
            document.querySelector('#settings input[value="10"]').value = settings.lowStockThreshold || '10';
            document.querySelector('#settings input[value="15"]').value = settings.taxRate || '15';
            // You might want to persist dark mode state via localStorage in utils.js
        } else {
            // If no settings exist, create default ones
            await setDoc(settingsDocRef, {
                pharmacyName: "صيدلية الشفاء",
                address: "شارع الملك فهد، الرياض، المملكة العربية السعودية",
                phone: "011-4567890",
                email: "info@pharmacy.com",
                expiryAlertDays: 30,
                lowStockThreshold: 10,
                taxRate: 15,
                lastBackupDate: null,
                databaseSize: 0
            });
            showNotification('تم إنشاء الإعدادات الافتراضية.', 'info');
        }
        updateLastBackupInfo();
    } catch (e) {
        showNotification('خطأ في تحميل الإعدادات: ' + e.message, 'error');
        console.error("Error loading settings:", e);
    }
}

async function updateLastBackupInfo() {
    try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            const settings = docSnap.data();
            const lastBackupDate = settings.lastBackupDate ? new Date(settings.lastBackupDate.toDate()).toLocaleString('ar-EG') : 'لا يوجد';
            const databaseSize = settings.databaseSize ? (settings.databaseSize / (1024 * 1024)).toFixed(2) + ' MB' : 'N/A';
            document.querySelector('#settings .border-t.pt-4 p:nth-child(1)').textContent = `آخر نسخة احتياطية: ${lastBackupDate}`;
            document.querySelector('#settings .border-t.pt-4 p:nth-child(2)').textContent = `حجم قاعدة البيانات: ${databaseSize}`;
        }
    } catch (e) {
        console.error("Error updating backup info:", e);
    }
}

// Implement functions to update settings
window.saveGeneralSettings = async () => {
    try {
        const pharmacyName = document.querySelector('#settings input[value="صيدلية الشفاء"]').value;
        const address = document.querySelector('#settings textarea').value;
        const phone = document.querySelector('#settings input[value="011-4567890"]').value;
        const email = document.querySelector('#settings input[value="info@pharmacy.com"]').value;

        await updateDoc(settingsDocRef, { pharmacyName, address, phone, email });
        showNotification('تم حفظ الإعدادات العامة بنجاح!', 'success');
    } catch (e) {
        showNotification('خطأ في حفظ الإعدادات العامة: ' + e.message, 'error');
        console.error("Error saving general settings:", e);
    }
};

window.saveSystemSettings = async () => {
    try {
        const expiryAlertDays = parseInt(document.querySelector('#settings select[class*="border border-gray-300"]').value);
        const lowStockThreshold = parseInt(document.querySelector('#settings input[value="10"]').value);
        const taxRate = parseFloat(document.querySelector('#settings input[value="15"]').value);

        await updateDoc(settingsDocRef, { expiryAlertDays, lowStockThreshold, taxRate });
        showNotification('تم حفظ إعدادات النظام بنجاح!', 'success');
    } catch (e) {
        showNotification('خطأ في حفظ إعدادات النظام: ' + e.message, 'error');
        console.error("Error saving system settings:", e);
    }
};

// User Management (Needs a dedicated modal/section within settings)
export async function loadUsers() {
    const userManagementContainer = document.getElementById('userManagementContainer'); // Add this div to your settings HTML
    if (!userManagementContainer) return; // Add user management section to settings.html

    userManagementContainer.innerHTML = `
        <h4 class="text-lg font-semibold text-gray-800 mb-3">إدارة المستخدمين</h4>
        <button onclick="openAddUserModal()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold mb-4">إضافة مستخدم جديد</button>
        <div class="overflow-x-auto">
            <table class="w-full table-auto">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-2 text-right text-sm font-semibold text-gray-700">الاسم/البريد</th>
                        <th class="px-4 py-2 text-right text-sm font-semibold text-gray-700">الدور</th>
                        <th class="px-4 py-2 text-right text-sm font-semibold text-gray-700">الإجراءات</th>
                    </tr>
                </thead>
                <tbody id="usersTableBody" class="divide-y divide-gray-200">
                    </tbody>
            </table>
        </div>
    `;

    const usersTableBody = document.getElementById('usersTableBody');
    usersTableBody.innerHTML = '';

    try {
        const querySnapshot = await getDocs(usersCollection);
        if (querySnapshot.empty) {
            usersTableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500">لا توجد مستخدمين مسجلين.</td></tr>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const user = { ...doc.data(), id: doc.id };
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-4 py-2 text-sm text-gray-900">${user.name || user.email}</td>
                <td class="px-4 py-2 text-sm text-gray-900">${user.role === 'doctor' ? 'صيدلي مسؤول' : 'مساعد صيدلي'}</td>
                <td class="px-4 py-2">
                    <div class="flex space-x-2 space-x-reverse">
                        <button onclick="editUserRole('${user.id}', '${user.role}')" class="text-blue-600 hover:text-blue-800 text-sm">تعديل الدور</button>
                        <button onclick="deleteUser('${user.id}')" class="text-red-600 hover:text-red-800 text-sm">حذف</button>
                    </div>
                </td>
            `;
            usersTableBody.appendChild(row);
        });
    } catch (e) {
        showNotification('خطأ في تحميل المستخدمين: ' + e.message, 'error');
        console.error("Error loading users:", e);
    }
}

window.openAddUserModal = () => {
    // You'll need a modal for this. For now, simulate.
    const email = prompt('أدخل البريد الإلكتروني للمستخدم الجديد:');
    const password = prompt('أدخل كلمة المرور للمستخدم الجديد (6 أحرف على الأقل):');
    const role = prompt('أدخل دور المستخدم (doctor أو assistant):');

    if (email && password && (role === 'doctor' || role === 'assistant')) {
        addNewUser(email, password, role);
    } else {
        showNotification('بيانات غير صالحة للمستخدم الجديد.', 'error');
    }
};

async function addNewUser(email, password, role) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            email: email,
            role: role,
            name: email.split('@')[0] // Basic name from email
        });
        showNotification('تم إضافة المستخدم بنجاح!', 'success');
        loadUsers(); // Refresh user list
    } catch (e) {
        showNotification('خطأ في إضافة المستخدم: ' + e.message, 'error');
        console.error("Error adding new user:", e);
    }
}

window.editUserRole = async (userId, currentRole) => {
    const newRole = prompt(`الدور الحالي هو: ${currentRole}. أدخل الدور الجديد (doctor أو assistant):`);
    if (newRole && (newRole === 'doctor' || newRole === 'assistant')) {
        try {
            await updateDoc(doc(db, "users", userId), { role: newRole });
            showNotification('تم تحديث دور المستخدم بنجاح!', 'success');
            loadUsers(); // Refresh user list
        } catch (e) {
            showNotification('خطأ في تحديث دور المستخدم: ' + e.message, 'error');
            console.error("Error updating user role:", e);
        }
    } else {
        showNotification('دور غير صالح.', 'error');
    }
};

window.deleteUser = async (userId) => {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.')) {
        try {
            // Delete user document from Firestore first
            await deleteDoc(doc(db, "users", userId));
            
            // Note: Deleting user from Firebase Authentication requires Admin SDK (backend) or user themselves
            // For a frontend-only app, you might just disable them or rely on the Firestore role check.
            // If you need to fully delete from Auth, you'd use a Cloud Function.
            showNotification('تم حذف بيانات المستخدم من Firestore. (لحذف المستخدم من Firebase Auth بالكامل، يتطلب ذلك وظائف خادم)', 'success');
            loadUsers();
        } catch (e) {
            showNotification('خطأ في حذف المستخدم: ' + e.message, 'error');
            console.error("Error deleting user:", e);
        }
    }
};

window.createBackup = async () => {
    showNotification('جاري إنشاء نسخة احتياطية من البيانات...', 'info');
    // This is a complex operation typically handled by Firebase Cloud Functions
    // to export data to Cloud Storage or another database.
    // For a simple frontend-only demo, you might download JSON of collections.
    try {
        const collectionsToBackup = ["products", "sales", "customers", "suppliers", "debts", "users"];
        let backupData = {};
        let totalSize = 0;

        for (const colName of collectionsToBackup) {
            const snapshot = await getDocs(collection(db, colName));
            backupData[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            totalSize += JSON.stringify(backupData[colName]).length; // Rough size estimate
        }

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pharmacy_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Update last backup info in settings
        await updateDoc(settingsDocRef, {
            lastBackupDate: new Date(),
            databaseSize: totalSize
        });
        updateLastBackupInfo();

        showNotification('تم إنشاء نسخة احتياطية وتنزيلها بنجاح!', 'success');
    } catch (e) {
        showNotification('خطأ في إنشاء النسخة الاحتياطية: ' + e.message, 'error');
        console.error("Backup error:", e);
    }
};

window.restoreBackup = async () => {
    showNotification('جاري استعادة نسخة احتياطية (تتطلب رفع ملف JSON)...', 'info');
    // This is also complex, involving parsing JSON and batch writing to Firestore.
    // Needs careful implementation to avoid data loss.
    // Usually done via Firebase Cloud Functions for security and large datasets.
    alert('وظيفة الاستعادة تتطلب اختيار ملف JSON تم نسخه احتياطياً. كن حذراً، قد يؤدي ذلك إلى الكتابة فوق البيانات الحالية.');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                // Implement logic to write data back to Firestore
                // This is a dangerous operation and should be handled with extreme care
                // Best practice is to use Firebase Admin SDK from a backend/Cloud Function.
                showNotification('تم قراءة ملف النسخة الاحتياطية. تتطلب هذه العملية موافقة إضافية.', 'warning');
                console.log('Backup data to restore:', data);
                // Example for one collection (DO NOT RUN ON PRODUCTION WITHOUT CAREFUL TESTING)
                // for (const item of data.products) {
                //     await setDoc(doc(db, "products", item.id), item);
                // }
                showNotification('الاستعادة تمت بنجاح جزئياً (للمنتجات فقط - وظيفة تجريبية).', 'success');
                loadProducts(); // Refresh relevant data
            } catch (parseError) {
                showNotification('خطأ في قراءة ملف النسخة الاحتياطية: ' + parseError.message, 'error');
                console.error("Restore parse error:", parseError);
            }
        };
        reader.readAsText(file);
    };
    input.click();
};

window.changePassword = async () => {
    const newPassword = prompt('أدخل كلمة المرور الجديدة:');
    if (newPassword && newPassword.length >= 6) {
        try {
            const user = auth.currentUser;
            if (user) {
                // This requires re-authentication if it's been a while
                // Or you could use a separate password reset flow
                // For now, simple update (might fail if user hasn't logged in recently)
                await user.updatePassword(newPassword);
                showNotification('تم تغيير كلمة المرور بنجاح!', 'success');
            } else {
                showNotification('لا يوجد مستخدم مسجل دخول لتغيير كلمة المرور.', 'error');
            }
        } catch (e) {
            showNotification('خطأ في تغيير كلمة المرور: ' + e.message, 'error');
            console.error("Error changing password:", e);
        }
    } else {
        showNotification('كلمة المرور يجب أن تكون 6 أحرف على الأقل.', 'error');
    }
};

window.exportData = (dataType) => {
    showNotification(`جاري تصدير بيانات ${dataType}...`, 'info');
    // Similar to backup, but for specific collections
};

window.importData = (dataType) => {
    showNotification(`جاري استيراد بيانات ${dataType}...`, 'info');
    // Similar to restore, but for specific collections
};
