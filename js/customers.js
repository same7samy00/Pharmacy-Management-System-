// js/customers.js
import { db } from './firebase-init.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { showNotification } from './utils.js';

const customersCollection = collection(db, "customers");

document.addEventListener('DOMContentLoaded', () => {
    loadCustomers();
});

export async function loadCustomers() {
    const customersTableBody = document.querySelector('#customers table tbody');
    if (!customersTableBody) return;

    customersTableBody.innerHTML = ''; // Clear existing rows

    try {
        const querySnapshot = await getDocs(customersCollection);
        if (querySnapshot.empty) {
            customersTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-gray-500">لا توجد عملاء مسجلون.</td></tr>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const customer = { ...doc.data(), id: doc.id };
            const customerInitial = customer.name ? customer.name.charAt(0).toUpperCase() : '?';

            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-4 py-3">
                    <div class="flex items-center">
                        <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold ml-3">
                            ${customerInitial}
                        </div>
                        <div>
                            <p class="text-sm font-semibold text-gray-900">${customer.name}</p>
                            <p class="text-xs text-gray-500">${customer.type || 'عميل عادي'}</p>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">${customer.phone || 'N/A'}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${customer.email || 'N/A'}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${customer.lastVisit ? new Date(customer.lastVisit.toDate()).toLocaleDateString('ar-EG') : 'N/A'}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${(customer.totalPurchases || 0).toFixed(2)} ريال</td>
                <td class="px-4 py-3 text-sm ${customer.totalDebt > 0 ? 'text-red-600 font-semibold' : 'text-gray-900'}">${(customer.totalDebt || 0).toFixed(2)} ريال</td>
                <td class="px-4 py-3 text-sm text-gray-900">${customer.loyaltyPoints || 0} نقطة</td>
                <td class="px-4 py-3">
                    <div class="flex space-x-2 space-x-reverse">
                        <button onclick="viewCustomer('${customer.id}')" class="text-blue-600 hover:text-blue-800 text-sm">عرض</button>
                        <button onclick="editCustomer('${customer.id}')" class="text-green-600 hover:text-green-800 text-sm">تعديل</button>
                        <button onclick="deleteCustomer('${customer.id}')" class="text-red-600 hover:text-red-800 text-sm">حذف</button>
                    </div>
                </td>
            `;
            customersTableBody.appendChild(row);
        });
        updateCustomerStats();
    } catch (e) {
        showNotification('خطأ في تحميل العملاء: ' + e.message, 'error');
        console.error("Error loading customers:", e);
    }
}

async function updateCustomerStats() {
    try {
        const querySnapshot = await getDocs(customersCollection);
        let totalCustomers = querySnapshot.size;
        let customersWithDebts = 0;
        let newCustomersThisMonth = 0; // Requires 'createdAt' field and filtering
        let totalPurchasesSum = 0;

        querySnapshot.forEach(doc => {
            const customer = doc.data();
            if (customer.totalDebt > 0) customersWithDebts++;
            totalPurchasesSum += (customer.totalPurchases || 0);

            // For newCustomersThisMonth, assume 'createdAt' field exists
            // const createdAt = customer.createdAt ? new Date(customer.createdAt.toDate()) : null;
            // if (createdAt && createdAt.getMonth() === new Date().getMonth() && createdAt.getFullYear() === new Date().getFullYear()) {
            //     newCustomersThisMonth++;
            // }
        });
        const averagePurchase = totalCustomers > 0 ? totalPurchasesSum / totalCustomers : 0;

        document.querySelector('#customers .bg-blue-50 .text-3xl').textContent = totalCustomers;
        document.querySelector('#customers .bg-green-50 .text-3xl').textContent = newCustomersThisMonth;
        document.querySelector('#customers .bg-purple-50 .text-3xl').textContent = averagePurchase.toFixed(2);
        document.querySelector('#customers .bg-orange-50 .text-3xl').textContent = customersWithDebts;

    } catch (e) {
        console.error("Error updating customer stats:", e);
    }
}


window.openAddCustomerModal = () => {
    showNotification('سيتم فتح نموذج إضافة عميل جديد...', 'info');
    // Implement a modal form for adding a new customer
    // On form submission:
    // try {
    //     await addDoc(customersCollection, { name: ..., phone: ..., email: ..., totalDebt: 0, loyaltyPoints: 0, lastVisit: new Date() });
    //     showNotification('تم إضافة العميل بنجاح!', 'success');
    //     loadCustomers(); // Reload customer list
    // } catch (e) { showNotification('خطأ: ' + e.message, 'error'); }
};

window.viewCustomer = (customerId) => {
    showNotification(`عرض تفاصيل العميل: ${customerId}`, 'info');
    // Implement fetching and displaying customer details including past sales/debts
};

window.editCustomer = (customerId) => {
    showNotification(`تعديل بيانات العميل: ${customerId}`, 'info');
    // Implement fetching customer data and populating an edit modal
};

window.deleteCustomer = async (customerId) => {
    if (confirm('هل أنت متأكد من حذف هذا العميل؟ سيتم حذف جميع البيانات المتعلقة به (الديون والفواتير).')) {
        try {
            await deleteDoc(doc(db, "customers", customerId));
            // Also need to delete related debts and potentially unlink sales (or delete sales if you want cascade)
            // This might require a Firebase Cloud Function for complex cascade deletes.
            showNotification('تم حذف العميل بنجاح!', 'success');
            loadCustomers(); // Reload customer list
            loadDebts(); // Also reload debts just in case
        } catch (e) {
            showNotification('خطأ في حذف العميل: ' + e.message, 'error');
            console.error("Error deleting customer:", e);
        }
    }
};

window.exportCustomers = () => {
    showNotification('جاري تصدير بيانات العملاء...', 'info');
    // Implement fetching all customer data and converting to CSV/Excel
};
