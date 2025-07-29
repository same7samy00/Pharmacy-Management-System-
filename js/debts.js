// js/debts.js
import { db } from './firebase-init.js';
import { collection, getDocs, doc, updateDoc, addDoc, query, where } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { showNotification } from './utils.js';

const debtsCollection = collection(db, "debts");
const customersCollection = collection(db, "customers");

document.addEventListener('DOMContentLoaded', () => {
    loadDebts();
});

export async function loadDebts() {
    const debtsTableBody = document.querySelector('#debts table tbody');
    if (!debtsTableBody) return;

    debtsTableBody.innerHTML = ''; // Clear existing rows

    try {
        const querySnapshot = await getDocs(debtsCollection);
        if (querySnapshot.empty) {
            debtsTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-gray-500">لا توجد ديون مسجلة.</td></tr>`;
            return;
        }

        for (const debtDoc of querySnapshot.docs) {
            const debt = { ...debtDoc.data(), id: debtDoc.id };
            let customerName = 'عميل غير معروف';
            if (debt.customerId) {
                const customerDoc = await getDoc(doc(db, "customers", debt.customerId));
                if (customerDoc.exists()) {
                    customerName = customerDoc.data().name;
                }
            }

            const statusClass = debt.status === 'outstanding' ? 'bg-red-100 text-red-800' :
                                debt.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800';

            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-900">${customerName}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${debt.invoiceNumber || 'N/A'}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${debt.amount.toFixed(2)} ريال</td>
                <td class="px-4 py-3 text-sm text-gray-900">${(debt.amountPaid || 0).toFixed(2)} ريال</td>
                <td class="px-4 py-3 text-sm font-semibold ${debt.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}">${debt.remainingAmount.toFixed(2)} ريال</td>
                <td class="px-4 py-3 text-sm text-gray-900">${debt.debtDate ? new Date(debt.debtDate.toDate()).toLocaleDateString('ar-EG') : 'N/A'}</td>
                <td class="px-4 py-3">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">${debt.status === 'outstanding' ? 'مستحق' : debt.status === 'partially_paid' ? 'مدفوع جزئياً' : 'تم السداد'}</span>
                </td>
                <td class="px-4 py-3">
                    <div class="flex space-x-2 space-x-reverse">
                        <button onclick="payDebt('${debt.id}', ${debt.remainingAmount})" class="text-green-600 hover:text-green-800 text-sm">سداد</button>
                        <button onclick="viewDebtDetails('${debt.id}')" class="text-blue-600 hover:text-blue-800 text-sm">تفاصيل</button>
                        ${debt.remainingAmount > 0 ? `<button onclick="sendReminder('${debt.id}', '${customerName}')" class="text-orange-600 hover:text-orange-800 text-sm">تذكير</button>` : ''}
                    </div>
                </td>
            `;
            debtsTableBody.appendChild(row);
        }
        // Update summary cards (you'll need to calculate these from the loaded debts)
        updateDebtSummary();
    } catch (e) {
        showNotification('خطأ في تحميل الديون: ' + e.message, 'error');
        console.error("Error loading debts:", e);
    }
}

async function updateDebtSummary() {
    try {
        const querySnapshot = await getDocs(debtsCollection);
        let totalDebts = 0;
        let outstandingDebts = 0;
        let customersWithDebts = new Set();
        let paidThisMonth = 0; // This would require querying payments or filtering debts

        querySnapshot.forEach(doc => {
            const debt = doc.data();
            totalDebts += debt.amount;
            if (debt.remainingAmount > 0) {
                outstandingDebts += debt.remainingAmount;
                if (debt.customerId) customersWithDebts.add(debt.customerId);
            }
            // For paidThisMonth, you'd need more granular payment records or filter by debtDate for current month
        });

        document.querySelector('#debts .bg-red-50 .text-2xl').textContent = `${totalDebts.toFixed(2)} ريال`;
        document.querySelector('#debts .bg-yellow-50 .text-2xl').textContent = `${outstandingDebts.toFixed(2)} ريال`;
        document.querySelector('#debts .bg-blue-50 .text-2xl').textContent = `${customersWithDebts.size}`;
        // For paidThisMonth, you'd calculate dynamically or from a separate collection
        document.querySelector('#debts .bg-green-50 .text-2xl').textContent = `${paidThisMonth.toFixed(2)} ريال`;

    } catch (e) {
        console.error("Error updating debt summary:", e);
    }
}

window.payDebt = async (debtId, currentRemaining) => {
    const paymentAmount = parseFloat(prompt(`المبلغ المتبقي: ${currentRemaining.toFixed(2)} ريال. أدخل مبلغ السداد:`));
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        showNotification('مبلغ سداد غير صالح.', 'error');
        return;
    }
    if (paymentAmount > currentRemaining) {
        showNotification('مبلغ السداد أكبر من المبلغ المتبقي.', 'error');
        return;
    }

    try {
        const debtRef = doc(db, "debts", debtId);
        const debtSnap = await getDoc(debtRef);
        if (debtSnap.exists()) {
            const debtData = debtSnap.data();
            const newAmountPaid = (debtData.amountPaid || 0) + paymentAmount;
            const newRemainingAmount = debtData.remainingAmount - paymentAmount;
            let newStatus = 'partially_paid';
            if (newRemainingAmount <= 0.01) { // Allow for floating point inaccuracies
                newStatus = 'paid';
            }

            await updateDoc(debtRef, {
                amountPaid: newAmountPaid,
                remainingAmount: newRemainingAmount,
                status: newStatus
            });

            // Update customer's totalDebt
            if (debtData.customerId) {
                const customerRef = doc(db, "customers", debtData.customerId);
                const customerSnap = await getDoc(customerRef);
                if (customerSnap.exists()) {
                    const currentCustomerDebt = customerSnap.data().totalDebt || 0;
                    await updateDoc(customerRef, {
                        totalDebt: currentCustomerDebt - paymentAmount
                    });
                }
            }

            showNotification('تم تسجيل السداد بنجاح!', 'success');
            loadDebts(); // Reload debts to update display
        }
    } catch (e) {
        showNotification('خطأ في تسجيل السداد: ' + e.message, 'error');
        console.error("Error paying debt:", e);
    }
};

window.viewDebtDetails = (debtId) => {
    showNotification(`عرض تفاصيل الدين رقم: ${debtId}`, 'info');
    // Implement showing a modal with full debt and associated sales details
};

window.sendReminder = async (debtId, customerName) => {
    // This would typically involve Firebase Functions to send SMS/WhatsApp
    showNotification(`تم إرسال تذكير للعميل ${customerName} بالدين رقم ${debtId} (وظيفة تجريبية)`, 'success');
};

window.addNewDebt = () => {
    showNotification('جاري فتح نموذج إضافة دين جديد يدوياً...', 'info');
    // Could be used for manual debt entry not tied to a POS sale
};

window.sendDebtReminders = async () => {
    showNotification('جاري إرسال تذكيرات لجميع العملاء المتأخرين (وظيفة تجريبية)...', 'info');
    // Implement querying all outstanding debts and triggering reminders (via Cloud Functions)
};
