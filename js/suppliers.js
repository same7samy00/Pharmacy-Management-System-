// js/suppliers.js
import { db } from './firebase-init.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { showNotification } from './utils.js';

const suppliersCollection = collection(db, "suppliers");

document.addEventListener('DOMContentLoaded', () => {
    loadSuppliers();
});

export async function loadSuppliers() {
    const suppliersGrid = document.querySelector('#suppliers .grid.grid-cols-1'); // Adjust selector if needed
    if (!suppliersGrid) return;

    suppliersGrid.innerHTML = ''; // Clear existing suppliers

    try {
        const querySnapshot = await getDocs(suppliersCollection);
        if (querySnapshot.empty) {
            suppliersGrid.innerHTML = `<p class="text-gray-500 text-center py-4 col-span-full">لا توجد موردين مسجلون.</p>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const supplier = { ...doc.data(), id: doc.id };
            const supplierInitial = supplier.name ? supplier.name.charAt(0).toUpperCase() : '?';
            const statusClass = supplier.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
            const statusText = supplier.status === 'active' ? 'نشط' : 'معلق';

            const supplierCard = document.createElement('div');
            supplierCard.className = 'border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow';
            supplierCard.innerHTML = `
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        ${supplierInitial}
                    </div>
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">${statusText}</span>
                </div>
                <h3 class="text-lg font-bold text-gray-800 mb-2">${supplier.name}</h3>
                <div class="space-y-2 text-sm text-gray-600 mb-4">
                    <p><span class="font-semibold">الهاتف:</span> ${supplier.phone || 'N/A'}</p>
                    <p><span class="font-semibold">البريد:</span> ${supplier.email || 'N/A'}</p>
                    <p><span class="font-semibold">المنتجات:</span> ${supplier.productCount || 0} منتج</p>
                    <p><span class="font-semibold">آخر طلب:</span> ${supplier.lastOrderDate ? new Date(supplier.lastOrderDate.toDate()).toLocaleDateString('ar-EG') : 'N/A'}</p>
                </div>
                <div class="flex space-x-2 space-x-reverse">
                    <button onclick="viewSupplier('${supplier.id}')" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
                        عرض التفاصيل
                    </button>
                    <button onclick="editSupplier('${supplier.id}')" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
                        تعديل
                    </button>
                    <button onclick="deleteSupplier('${supplier.id}')" class="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
                        حذف
                    </button>
                </div>
            `;
            suppliersGrid.appendChild(supplierCard);
        });
    } catch (e) {
        showNotification('خطأ في تحميل الموردين: ' + e.message, 'error');
        console.error("Error loading suppliers:", e);
    }
}

window.openAddSupplierModal = () => {
    showNotification('سيتم فتح نموذج إضافة مورد جديد...', 'info');
    // Implement a modal for adding a new supplier
    // On form submission:
    // try {
    //     await addDoc(suppliersCollection, { name: ..., phone: ..., email: ..., status: 'active', productCount: 0, lastOrderDate: null });
    //     showNotification('تم إضافة المورد بنجاح!', 'success');
    //     loadSuppliers();
    // } catch (e) { showNotification('خطأ: ' + e.message, 'error'); }
};

window.viewSupplier = (supplierId) => {
    showNotification(`عرض تفاصيل المورد: ${supplierId}`, 'info');
    // Implement fetching and displaying supplier details including their products
};

window.editSupplier = (supplierId) => {
    showNotification(`تعديل بيانات المورد: ${supplierId}`, 'info');
    // Implement fetching supplier data and populating an edit modal
};

window.deleteSupplier = async (supplierId) => {
    if (confirm('هل أنت متأكد من حذف هذا المورد؟')) {
        try {
            await deleteDoc(doc(db, "suppliers", supplierId));
            // Consider unlinking products from this supplier or reassigning them
            showNotification('تم حذف المورد بنجاح!', 'success');
            loadSuppliers();
        } catch (e) {
            showNotification('خطأ في حذف المورد: ' + e.message, 'error');
            console.error("Error deleting supplier:", e);
        }
    }
};
