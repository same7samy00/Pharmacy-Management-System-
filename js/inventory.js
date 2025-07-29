// js/inventory.js
import { db } from './firebase-init.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { showNotification } from './utils.js';

const productsCollection = collection(db, "products");

// Global functions (mocked for now, will be implemented with Firestore)
window.openAddProductModal = () => {
    document.getElementById('addProductModal').classList.remove('hidden');
    // Clear form fields
    document.getElementById('addProductForm').reset();
};

window.closeAddProductModal = () => {
    document.getElementById('addProductModal').classList.add('hidden');
};

document.addEventListener('DOMContentLoaded', () => {
    // Event listener for Add Product Form submission
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const productName = document.getElementById('productName').value;
            const productBarcode = document.getElementById('productBarcode').value;
            const productPrice = parseFloat(document.getElementById('productPrice').value);
            const productQuantity = parseInt(document.getElementById('productQuantity').value);

            try {
                await addDoc(productsCollection, {
                    name: productName,
                    barcode: productBarcode,
                    price: productPrice,
                    quantity: productQuantity,
                    activeIngredient: "", // Add more fields as needed
                    expiryDate: null,
                    supplierId: "",
                    unitType: "علبة",
                    purchasePrice: 0
                });
                showNotification('تم إضافة المنتج بنجاح!', 'success');
                closeAddProductModal();
                loadProducts(); // Reload products in the table
            } catch (e) {
                showNotification('خطأ في إضافة المنتج: ' + e.message, 'error');
                console.error("Error adding document: ", e);
            }
        });
    }

    // Load products when inventory section is shown
    // This needs to be triggered when the 'inventory' section becomes visible.
    // We can add a simple observer or call this when showSection('inventory') is called.
    // For now, let's call it on DOMContentLoaded, and later optimize.
    loadProducts();
});


// Function to load products from Firestore and display them
export async function loadProducts() {
    const inventoryTableBody = document.querySelector('#inventory table tbody');
    if (!inventoryTableBody) return;

    inventoryTableBody.innerHTML = ''; // Clear existing rows

    try {
        const querySnapshot = await getDocs(productsCollection);
        if (querySnapshot.empty) {
            inventoryTableBody.innerHTML = `<tr><td colspan="11" class="text-center py-4 text-gray-500">لا توجد منتجات في المخزون.</td></tr>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id; // Document ID for update/delete

            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-4 py-3"><input type="checkbox" class="rounded"></td>
                <td class="px-4 py-3">
                    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div>
                        <p class="text-sm font-semibold text-gray-900">${product.name}</p>
                        <p class="text-xs text-gray-500">${product.activeIngredient || 'لا يوجد'}</p>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">${product.barcode}</td>
                <td class="px-4 py-3">
                    <div class="text-sm">
                        <p class="font-semibold ${product.quantity < 50 ? 'text-yellow-600' : ''}">${product.quantity} علبة</p>
                        <p class="text-xs text-gray-500">${product.quantity * 10} شريط</p>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">${product.unitType || 'علبة'}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${product.price.toFixed(2)} ريال</td>
                <td class="px-4 py-3 text-sm text-gray-900">${product.expiryDate ? new Date(product.expiryDate.toDate()).toLocaleDateString('ar-EG') : 'غير محدد'}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${product.supplierId || 'غير محدد'}</td>
                <td class="px-4 py-3">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.quantity < 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">${product.quantity < 50 ? 'مخزون منخفض' : 'متوفر'}</span>
                </td>
                <td class="px-4 py-3">
                    <div class="flex space-x-2 space-x-reverse">
                        <button onclick="editProduct('${productId}')" class="text-blue-600 hover:text-blue-800 text-sm">تعديل</button>
                        <button onclick="viewProduct('${productId}')" class="text-green-600 hover:text-green-800 text-sm">عرض</button>
                        <button onclick="deleteProduct('${productId}')" class="text-red-600 hover:text-red-800 text-sm">حذف</button>
                    </div>
                </td>
            `;
            inventoryTableBody.appendChild(row);
        });
    } catch (e) {
        showNotification('خطأ في تحميل المنتجات: ' + e.message, 'error');
        console.error("Error loading documents: ", e);
    }
}

// Mock functions for now, will implement with Firestore later
window.editProduct = (productId) => {
    showNotification(`تعديل المنتج برقم: ${productId}`, 'info');
    // Implement fetching product data and populating a modal for editing
};

window.viewProduct = (productId) => {
    showNotification(`عرض تفاصيل المنتج برقم: ${productId}`, 'info');
    // Implement fetching and displaying product details in a modal/separate view
};

window.deleteProduct = async (productId) => {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        try {
            await deleteDoc(doc(db, "products", productId));
            showNotification('تم حذف المنتج بنجاح!', 'success');
            loadProducts(); // Reload products after deletion
        } catch (e) {
            showNotification('خطأ في حذف المنتج: ' + e.message, 'error');
            console.error("Error deleting document: ", e);
        }
    }
};

window.importProducts = () => {
    showNotification('جاري استيراد المنتجات من Excel/CSV...', 'info');
    // Implement file parsing and batch writing to Firestore
};

window.printBarcodes = () => {
    showNotification('جاري تجهيز طباعة الباركود...', 'info');
    // Implement barcode generation and printing logic
};

// Make loadProducts globally accessible for initial load if needed
window.loadProducts = loadProducts;
