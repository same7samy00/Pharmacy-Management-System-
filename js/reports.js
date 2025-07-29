// js/reports.js
import { db } from './firebase-init.js';
import { collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { showNotification } from './utils.js';

const salesCollection = collection(db, "sales");
const productsCollection = collection(db, "products");
const debtsCollection = collection(db, "debts");
const customersCollection = collection(db, "customers");

document.addEventListener('DOMContentLoaded', () => {
    // No initial report generation, user will click buttons
});

window.showReportContent = (title, contentHtml) => {
    document.getElementById('reportTitle').textContent = title;
    document.getElementById('reportContent').innerHTML = contentHtml;
    document.getElementById('reportDisplay').classList.remove('hidden');
    document.getElementById('reportDisplay').scrollIntoView({ behavior: 'smooth' });
};

window.generateSalesReport = async () => {
    showNotification('جاري توليد تقرير المبيعات...', 'info');
    let salesHtml = '';
    let totalSales = 0;
    let dailySales = 0; // For today
    let monthlySales = 0; // For current month

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.getTime();
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();

    try {
        const querySnapshot = await getDocs(salesCollection);
        if (querySnapshot.empty) {
            salesHtml = '<p class="text-gray-500 text-center py-4">لا توجد بيانات مبيعات لعرضها.</p>';
        } else {
            let salesList = [];
            querySnapshot.forEach(doc => {
                const sale = doc.data();
                salesList.push(sale);
                totalSales += sale.totalAmount;
                
                const saleDate = sale.saleDate.toDate().getTime(); // Convert Timestamp to JS Date milliseconds
                if (saleDate >= startOfDay) {
                    dailySales += sale.totalAmount;
                }
                if (saleDate >= startOfMonth) {
                    monthlySales += sale.totalAmount;
                }
            });

            // Example: Most sold products (requires aggregation, simple example here)
            const productSales = {};
            salesList.forEach(sale => {
                sale.items.forEach(item => {
                    productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
                });
            });
            const sortedProducts = Object.entries(productSales).sort(([,a],[,b]) => b - a).slice(0, 5); // Top 5

            salesHtml = `
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div class="bg-white p-4 rounded-lg border">
                        <h4 class="font-semibold text-gray-800">مبيعات اليوم</h4>
                        <p class="text-2xl font-bold text-green-600">${dailySales.toFixed(2)} ريال</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg border">
                        <h4 class="font-semibold text-gray-800">إجمالي المبيعات</h4>
                        <p class="text-2xl font-bold text-blue-600">${totalSales.toFixed(2)} ريال</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg border">
                        <h4 class="font-semibold text-gray-800">مبيعات الشهر</h4>
                        <p class="text-2xl font-bold text-purple-600">${monthlySales.toFixed(2)} ريال</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg border">
                        <h4 class="font-semibold text-gray-800">متوسط الفاتورة</h4>
                        <p class="text-2xl font-bold text-orange-600">${(totalSales / salesList.length).toFixed(2)} ريال</p>
                    </div>
                </div>
                <h4 class="text-lg font-semibold text-gray-800 mb-3">أكثر المنتجات مبيعًا (أعلى 5)</h4>
                <ul class="list-disc list-inside bg-white p-4 rounded-lg border space-y-2">
                    ${sortedProducts.map(([name, quantity]) => `<li>${name}: ${quantity} وحدة</li>`).join('')}
                </ul>
            `;
        }
        showReportContent('تقرير المبيعات المفصل', salesHtml);
        showNotification('تم توليد تقرير المبيعات بنجاح.', 'success');
    } catch (e) {
        showNotification('خطأ في توليد تقرير المبيعات: ' + e.message, 'error');
        console.error("Error generating sales report:", e);
    }
};

window.generateInventoryReport = async () => {
    showNotification('جاري توليد تقرير المخزون...', 'info');
    let inventoryHtml = '';
    let totalProducts = 0;
    let lowStockCount = 0;
    let expiredCount = 0;
    let nearExpiryCount = 0; // within 30 days

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    try {
        const querySnapshot = await getDocs(productsCollection);
        if (querySnapshot.empty) {
            inventoryHtml = '<p class="text-gray-500 text-center py-4">لا توجد منتجات في المخزون لعرضها.</p>';
        } else {
            totalProducts = querySnapshot.size;
            let lowStockProducts = [];
            let expiredProducts = [];
            let nearExpiryProducts = [];

            querySnapshot.forEach(doc => {
                const product = doc.data();
                if (product.quantity < 50) { // Assuming 50 is low stock threshold
                    lowStockCount++;
                    lowStockProducts.push(product.name);
                }
                if (product.expiryDate) {
                    const expiryDate = product.expiryDate.toDate();
                    if (expiryDate < today) {
                        expiredCount++;
                        expiredProducts.push(product.name);
                    } else if (expiryDate <= thirtyDaysFromNow) {
                        nearExpiryCount++;
                        nearExpiryProducts.push(product.name);
                    }
                }
            });

            inventoryHtml = `
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div class="bg-white p-4 rounded-lg border">
                        <h4 class="font-semibold text-gray-800">إجمالي المنتجات</h4>
                        <p class="text-2xl font-bold text-blue-600">${totalProducts}</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg border">
                        <h4 class="font-semibold text-gray-800">مخزون منخفض</h4>
                        <p class="text-2xl font-bold text-yellow-600">${lowStockCount}</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg border">
                        <h4 class="font-semibold text-gray-800">منتجات منتهية/قرب الانتهاء</h4>
                        <p class="text-2xl font-bold text-red-600">${expiredCount + nearExpiryCount}</p>
                    </div>
                </div>
                <h4 class="text-lg font-semibold text-gray-800 mb-3">تفاصيل التنبيهات</h4>
                <div class="space-y-4">
                    <div class="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h5 class="font-semibold text-red-800">منتجات منتهية الصلاحية (${expiredCount})</h5>
                        <ul class="list-disc list-inside text-red-600">
                            ${expiredProducts.length > 0 ? expiredProducts.map(name => `<li>${name}</li>`).join('') : '<li>لا توجد منتجات منتهية.</li>'}
                        </ul>
                    </div>
                    <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h5 class="font-semibold text-yellow-800">منتجات قرب انتهاء الصلاحية (${nearExpiryCount})</h5>
                        <ul class="list-disc list-inside text-yellow-600">
                            ${nearExpiryProducts.length > 0 ? nearExpiryProducts.map(name => `<li>${name}</li>`).join('') : '<li>لا توجد منتجات قرب الانتهاء.</li>'}
                        </ul>
                    </div>
                    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h5 class="font-semibold text-blue-800">منتجات بمخزون منخفض (${lowStockCount})</h5>
                        <ul class="list-disc list-inside text-blue-600">
                            ${lowStockProducts.length > 0 ? lowStockProducts.map(name => `<li>${name}</li>`).join('') : '<li>لا توجد منتجات بمخزون منخفض.</li>'}
                        </ul>
                    </div>
                </div>
            `;
        }
        showReportContent('تقرير المخزون', inventoryHtml);
        showNotification('تم توليد تقرير المخزون بنجاح.', 'success');
    } catch (e) {
        showNotification('خطأ في توليد تقرير المخزون: ' + e.message, 'error');
        console.error("Error generating inventory report:", e);
    }
};

window.generateDebtReport = async () => {
    showNotification('جاري توليد تقرير الديون...', 'info');
    let debtsHtml = '';
    let totalOutstanding = 0;
    let overdueDebts = 0;
    let paidThisMonth = 0; // Placeholder

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate comparison

    try {
        const querySnapshot = await getDocs(debtsCollection);
        if (querySnapshot.empty) {
            debtsHtml = '<p class="text-gray-500 text-center py-4">لا توجد بيانات ديون لعرضها.</p>';
        } else {
            let outstandingList = [];
            let overdueList = [];

            for (const debtDoc of querySnapshot.docs) {
                const debt = debtDoc.data();
                if (debt.remainingAmount > 0) {
                    totalOutstanding += debt.remainingAmount;
                    outstandingList.push(debt);

                    if (debt.debtDate && debt.debtDate.toDate() < today) { // Using debtDate as due date for simplicity
                        overdueDebts += debt.remainingAmount;
                        overdueList.push(debt);
                    }
                }
                // For 'paidThisMonth', you'd need more complex logic/data
            }

            debtsHtml = `
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div class="bg-white p-4 rounded-lg border">
                        <h4 class="font-semibold text-gray-800">إجمالي الديون المستحقة</h4>
                        <p class="text-2xl font-bold text-red-600">${totalOutstanding.toFixed(2)} ريال</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg border">
                        <h4 class="font-semibold text-gray-800">ديون متأخرة السداد</h4>
                        <p class="text-2xl font-bold text-orange-600">${overdueDebts.toFixed(2)} ريال</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg border">
                        <h4 class="font-semibold text-gray-800">تم السداد هذا الشهر</h4>
                        <p class="text-2xl font-bold text-green-600">${paidThisMonth.toFixed(2)} ريال</p>
                    </div>
                </div>
                <h4 class="text-lg font-semibold text-gray-800 mb-3">قائمة الديون المتأخرة</h4>
                <div class="overflow-x-auto bg-white p-4 rounded-lg border">
                    <table class="w-full table-auto">
                        <thead>
                            <tr>
                                <th class="px-4 py-2 text-right text-sm font-semibold text-gray-700">العميل</th>
                                <th class="px-4 py-2 text-right text-sm font-semibold text-gray-700">رقم الفاتورة</th>
                                <th class="px-4 py-2 text-right text-sm font-semibold text-gray-700">المبلغ المتبقي</th>
                                <th class="px-4 py-2 text-right text-sm font-semibold text-gray-700">تاريخ الاستحقاق</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${overdueList.length > 0 ? overdueList.map(debt => `
                                <tr>
                                    <td class="px-4 py-2 text-sm text-gray-900">${debt.customerId || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm text-gray-900">${debt.invoiceNumber || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm text-red-600 font-semibold">${debt.remainingAmount.toFixed(2)} ريال</td>
                                    <td class="px-4 py-2 text-sm text-gray-900">${debt.debtDate ? new Date(debt.debtDate.toDate()).toLocaleDateString('ar-EG') : 'N/A'}</td>
                                </tr>
                            `).join('') : `<tr><td colspan="4" class="text-center py-4 text-gray-500">لا توجد ديون متأخرة السداد.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            `;
        }
        showReportContent('تقرير الديون', debtsHtml);
        showNotification('تم توليد تقرير الديون بنجاح.', 'success');
    } catch (e) {
        showNotification('خطأ في توليد تقرير الديون: ' + e.message, 'error');
        console.error("Error generating debt report:", e);
    }
};

window.generateCustomerReport = async () => {
    showNotification('جاري توليد تقرير العملاء...', 'info');
    let customersHtml = '';
    let totalCustomers = 0;
    let newCustomersThisMonth = 0;
    let loyalCustomers = 0; // Placeholder for high loyalty points
    let highSpendingCustomers = [];

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    try {
        const querySnapshot = await getDocs(customersCollection);
        if (querySnapshot.empty) {
            customersHtml = '<p class="text-gray-500 text-center py-4">لا توجد بيانات عملاء لعرضها.</p>';
        } else {
            totalCustomers = querySnapshot.size;
            querySnapshot.forEach(doc => {
                const customer = doc.data();
                // Assumed 'createdAt' field for new customers
                if (customer.createdAt && customer.createdAt.toDate() >= startOfMonth) {
                    newCustomersThisMonth++;
                }
                if (customer.loyaltyPoints && customer.loyaltyPoints > 500) { // Example threshold
                    loyalCustomers++;
                }
                if (customer.totalPurchases && customer.totalPurchases > 1000) { // Example threshold
                    highSpendingCustomers.push(customer);
                }
            });
            // Sort high spending customers for display
            highSpendingCustomers.sort((a, b) => b.totalPurchases - a.totalPurchases);

            customersHtml = `
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div class="bg-white p-4 rounded-lg border">
                        <h4 class="font-semibold text-gray-800">إجمالي العملاء</h4>
                        <p class="text-2xl font-bold text-blue-600">${totalCustomers}</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg border">
                        <h4 class="font-semibold text-gray-800">عملاء جدد هذا الشهر</h4>
                        <p class="text-2xl font-bold text-green-600">${newCustomersThisMonth}</p>
                    </div>
                    <div class="bg-white p-4 rounded-lg border">
                        <h4 class="font-semibold text-gray-800">عملاء مميزون</h4>
                        <p class="text-2xl font-bold text-purple-600">${loyalCustomers}</p>
                    </div>
                </div>
                <h4 class="text-lg font-semibold text-gray-800 mb-3">قائمة العملاء ذوي الإنفاق العالي (أعلى 5)</h4>
                <div class="overflow-x-auto bg-white p-4 rounded-lg border">
                    <table class="w-full table-auto">
                        <thead>
                            <tr>
                                <th class="px-4 py-2 text-right text-sm font-semibold text-gray-700">اسم العميل</th>
                                <th class="px-4 py-2 text-right text-sm font-semibold text-gray-700">إجمالي المشتريات</th>
                                <th class="px-4 py-2 text-right text-sm font-semibold text-gray-700">نقاط الولاء</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${highSpendingCustomers.slice(0, 5).map(customer => `
                                <tr>
                                    <td class="px-4 py-2 text-sm text-gray-900">${customer.name}</td>
                                    <td class="px-4 py-2 text-sm text-blue-600 font-semibold">${customer.totalPurchases.toFixed(2)} ريال</td>
                                    <td class="px-4 py-2 text-sm text-gray-900">${customer.loyaltyPoints} نقطة</td>
                                </tr>
                            `).join('')}
                            ${highSpendingCustomers.length === 0 ? `<tr><td colspan="3" class="text-center py-4 text-gray-500">لا توجد عملاء ذوي إنفاق عالي حاليًا.</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            `;
        }
        showReportContent('تقرير العملاء', customersHtml);
        showNotification('تم توليد تقرير العملاء بنجاح.', 'success');
    } catch (e) {
        showNotification('خطأ في توليد تقرير العملاء: ' + e.message, 'error');
        console.error("Error generating customer report:", e);
    }
};

window.exportReport = (type) => {
    showNotification(`جاري تصدير التقرير الحالي كـ ${type.toUpperCase()}...`, 'info');
    // Implement actual export logic using libraries like jsPDF or SheetJS (for Excel)
    // This would require more advanced setup and external libraries.
};
