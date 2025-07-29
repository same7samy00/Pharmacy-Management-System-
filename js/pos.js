// js/pos.js
import { db } from './firebase-init.js';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { showNotification } from './utils.js';

let cart = []; // سلة المبيعات الحالية
let savedInvoices = []; // الفواتير المحفوظة مؤقتاً (للاستكمال)
const productsCollection = collection(db, "products");
const salesCollection = collection(db, "sales");
const customersCollection = collection(db, "customers");
const debtsCollection = collection(db, "debts");

document.addEventListener('DOMContentLoaded', async () => {
    // Initial load for customers in the select dropdown
    await loadCustomersForPOS();
    updateCartDisplay(); // Make sure cart display is initialized
    updateTotals(); // Make sure totals are calculated
});

// Function to add product to cart (updated to fetch from Firestore)
window.addToCart = async (productId, quantityToAdd = 1) => {
    try {
        const productDocRef = doc(db, "products", productId);
        const productDocSnap = await getDoc(productDocRef);

        if (!productDocSnap.exists()) {
            showNotification('المنتج غير موجود في قاعدة البيانات!', 'error');
            return;
        }

        const product = { ...productDocSnap.data(), id: productDocSnap.id };

        if (product.quantity < quantityToAdd) {
            showNotification(`الكمية المتوفرة من ${product.name} غير كافية. المتوفر: ${product.quantity}`, 'error');
            return;
        }

        const existingItemIndex = cart.findIndex(item => item.id === productId);

        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity += quantityToAdd;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                code: product.barcode,
                quantity: quantityToAdd,
                unit: product.unitType || 'علبة' // Default unit
            });
        }

        updateCartDisplay();
        updateTotals();
        showNotification(`تم إضافة ${product.name} إلى الفاتورة`, 'success');

    } catch (error) {
        showNotification('خطأ في إضافة المنتج للسلة: ' + error.message, 'error');
        console.error("Error adding to cart:", error);
    }
};

window.removeFromCart = (index) => {
    const item = cart[index];
    cart.splice(index, 1);
    updateCartDisplay();
    updateTotals();
    showNotification(`تم حذف ${item.name} من الفاتورة`, 'info');
};

window.updateQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
        removeFromCart(index);
    } else {
        const productId = cart[index].id;
        // In a real scenario, you'd re-check inventory here before allowing update
        cart[index].quantity = newQuantity;
        updateCartDisplay();
        updateTotals();
    }
};

window.updateCartDisplay = () => {
    const cartContainer = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartItemCount');

    if (!cartContainer || !cartCount) return;

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="text-gray-500 text-center py-8">لا توجد منتجات في الفاتورة</p>';
        cartCount.textContent = '0';
        return;
    }

    cartCount.textContent = cart.length;

    cartContainer.innerHTML = cart.map((item, index) => `
        <div class="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div class="flex-1">
                <div class="flex items-center justify-between mb-2">
                    <p class="font-semibold text-gray-900">${item.name}</p>
                    <p class="text-sm text-gray-500">${item.code}</p>
                </div>
                <div class="flex items-center justify-between">
                    <p class="text-sm text-gray-600">${item.price.toFixed(2)} ريال × ${item.quantity} ${item.unit}</p>
                    <p class="font-bold text-blue-600">${(item.price * item.quantity).toFixed(2)} ريال</p>
                </div>
            </div>
            <div class="flex items-center space-x-2 space-x-reverse mr-4">
                <button onclick="updateQuantity(${index}, ${item.quantity - 1})" class="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm font-bold transition-colors">-</button>
                <span class="text-lg font-semibold min-w-[2rem] text-center">${item.quantity}</span>
                <button onclick="updateQuantity(${index}, ${item.quantity + 1})" class="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-full text-sm font-bold transition-colors">+</button>
                <button onclick="removeFromCart(${index})" class="text-red-600 hover:text-red-800 text-sm font-semibold mr-2">حذف</button>
            </div>
        </div>
    `).join('');
};

window.updateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const discountAmountInput = document.getElementById('discountAmount');
    const discountTypeSelect = document.getElementById('discountType');

    const discountAmount = parseFloat(discountAmountInput?.value || 0);
    const discountType = discountTypeSelect?.value || 'amount';
    let discount = 0;
    
    if (discountType === 'percent') {
        discount = subtotal * (discountAmount / 100);
    } else {
        discount = discountAmount;
    }
    
    const afterDiscount = subtotal - discount;
    const taxRate = 0.15; // From settings
    const tax = afterDiscount * taxRate;
    const total = afterDiscount + tax;
    
    document.getElementById('subtotal').textContent = subtotal.toFixed(2) + ' ريال';
    document.getElementById('discountDisplay').textContent = discount.toFixed(2) + ' ريال';
    document.getElementById('tax').textContent = tax.toFixed(2) + ' ريال';
    document.getElementById('total').textContent = total.toFixed(2) + ' ريال';
};

window.clearCart = () => {
    cart = [];
    updateCartDisplay();
    updateTotals();
    showNotification('تم مسح الفاتورة', 'info');
};

window.processSale = async () => {
    if (cart.length === 0) {
        showNotification('الفاتورة فارغة! يرجى إضافة منتجات أولاً.', 'error');
        return;
    }
    
    const paymentMethod = document.getElementById('paymentMethod').value;
    const customerId = document.getElementById('customerSelect').value;
    const total = parseFloat(document.getElementById('total').textContent.replace(' ريال', ''));
    
    // Generate invoice number (Firestore will generate doc ID, but we need a user-friendly number)
    const invoiceNumber = 'INV-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6); // Example
    
    try {
        // 1. Save sale to Firestore
        const saleDocRef = await addDoc(salesCollection, {
            invoiceNumber: invoiceNumber,
            saleDate: new Date(),
            items: cart.map(item => ({ // Save a copy of cart items
                id: item.id,
                name: item.name,
                price: item.price,
                code: item.code,
                quantity: item.quantity,
                unit: item.unit
            })),
            subtotal: parseFloat(document.getElementById('subtotal').textContent.replace(' ريال', '')),
            discount: parseFloat(document.getElementById('discountDisplay').textContent.replace(' ريال', '')),
            tax: parseFloat(document.getElementById('tax').textContent.replace(' ريال', '')),
            totalAmount: total,
            paymentMethod: paymentMethod,
            customerId: customerId || null, // Null if no customer selected
            status: paymentMethod === 'credit_sale' ? 'debt' : 'paid',
            sellerId: firebase.auth().currentUser ? firebase.auth().currentUser.uid : null // Assuming Firebase Auth user is available
        });

        // 2. Update product quantities in inventory
        for (const item of cart) {
            const productRef = doc(db, "products", item.id);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
                const currentQuantity = productSnap.data().quantity;
                await updateDoc(productRef, {
                    quantity: currentQuantity - item.quantity
                });
            }
        }

        // 3. Handle debts if payment method is 'credit_sale'
        if (paymentMethod === 'credit_sale' && customerId) {
            await addDoc(debtsCollection, {
                customerId: customerId,
                invoiceId: saleDocRef.id,
                invoiceNumber: invoiceNumber,
                amount: total,
                amountPaid: 0,
                remainingAmount: total,
                debtDate: new Date(),
                status: 'outstanding' // 'outstanding', 'partially_paid', 'paid'
            });
            // You might also update totalDebt on the customer document
            const customerDocRef = doc(db, "customers", customerId);
            const customerSnap = await getDoc(customerDocRef);
            if (customerSnap.exists()) {
                const currentTotalDebt = customerSnap.data().totalDebt || 0;
                await updateDoc(customerDocRef, {
                    totalDebt: currentTotalDebt + total
                });
            }
        }
        
        showNotification(`تم إتمام البيع بنجاح!\nرقم الفاتورة: ${invoiceNumber}\nالمبلغ: ${total.toFixed(2)} ريال`, 'success');
        
        // Save last invoice for printing
        localStorage.setItem('lastInvoice', JSON.stringify({ ...invoice, id: saleDocRef.id }));
        clearCart(); // Clear cart after successful sale

    } catch (error) {
        showNotification('خطأ في إتمام عملية البيع: ' + error.message, 'error');
        console.error("Error processing sale:", error);
    }
};

window.saveInvoiceTemporary = () => {
    if (cart.length === 0) {
        showNotification('لا توجد منتجات لحفظها', 'error');
        return;
    }
    
    const tempInvoice = {
        id: 'TEMP-' + Date.now(),
        items: [...cart],
        date: new Date().toISOString()
    };
    
    localStorage.setItem('tempInvoice', JSON.stringify(tempInvoice));
    showNotification('تم حفظ الفاتورة مؤقتاً', 'success');
};

window.loadSavedInvoice = () => {
    const tempInvoice = localStorage.getItem('tempInvoice');
    if (tempInvoice) {
        cart = JSON.parse(tempInvoice).items;
        updateCartDisplay();
        updateTotals();
        showNotification('تم استعادة الفاتورة المحفوظة', 'success');
        localStorage.removeItem('tempInvoice'); // Clear it after loading
    } else {
        showNotification('لا توجد فاتورة محفوظة', 'info');
    }
};

window.printLastInvoice = () => {
    const lastInvoice = localStorage.getItem('lastInvoice');
    if (lastInvoice) {
        const invoiceData = JSON.parse(lastInvoice);
        showNotification(`جاري طباعة الفاتورة ${invoiceData.invoiceNumber}...`, 'info');
        // Implement actual printing logic here (e.g., open a new window with print-friendly view)
    } else {
        showNotification('لا توجد فاتورة حديثة للطباعة.', 'error');
    }
};

// Barcode Scanner Functions (These can be in a separate js/barcode.js if more complex)
window.openBarcodeScanner = () => {
    document.getElementById('barcodeModal').classList.remove('hidden');
    document.getElementById('manualBarcode').focus();
    // In a real app, you'd initialize a barcode scanner library here (e.g., QuaggaJS)
};

window.closeBarcodeModal = () => {
    document.getElementById('barcodeModal').classList.add('hidden');
    document.getElementById('manualBarcode').value = '';
};

window.processBarcodeInput = async () => {
    const barcode = document.getElementById('manualBarcode').value.trim();
    if (!barcode) {
        showNotification('يرجى إدخال رقم الباركود', 'error');
        return;
    }
    
    try {
        const q = query(productsCollection, where("barcode", "==", barcode));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const productDoc = querySnapshot.docs[0];
            await addToCart(productDoc.id); // Add by Firestore Document ID
            closeBarcodeModal();
            showSection('pos'); // Ensure POS section is visible
        } else {
            showNotification('المنتج غير موجود في قاعدة البيانات', 'error');
        }
    } catch (error) {
        showNotification('خطأ في البحث عن الباركود: ' + error.message, 'error');
        console.error("Barcode lookup error:", error);
    }
};

window.handleProductSearch = async (event) => {
    const searchTerm = event.target.value.trim();
    const searchSuggestions = document.getElementById('searchSuggestions');

    if (event.key === 'Enter' && searchTerm) {
        await processBarcodeInput(); // Treat Enter as direct barcode input for now
        event.target.value = ''; // Clear input after processing
        searchSuggestions.classList.add('hidden');
    } else if (searchTerm.length > 2) { // Show suggestions after 2 characters
        try {
            const q1 = query(productsCollection, where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'));
            const q2 = query(productsCollection, where('barcode', '>=', searchTerm), where('barcode', '<=', searchTerm + '\uf8ff'));
            
            const [nameMatches, barcodeMatches] = await Promise.all([getDocs(q1), getDocs(q2)]);
            
            let results = [];
            nameMatches.forEach(doc => results.push({ ...doc.data(), id: doc.id }));
            barcodeMatches.forEach(doc => {
                // Avoid duplicates if a product matches by name and barcode
                if (!results.some(r => r.id === doc.id)) {
                    results.push({ ...doc.data(), id: doc.id });
                }
            });

            if (results.length > 0) {
                searchSuggestions.innerHTML = results.map(product => `
                    <div class="p-3 cursor-pointer hover:bg-gray-100 border-b border-gray-200" 
                         onclick="selectProductFromSearch('${product.id}')">
                        <p class="font-semibold text-gray-900">${product.name}</p>
                        <p class="text-sm text-gray-600">${product.barcode} - ${product.price.toFixed(2)} ريال</p>
                    </div>
                `).join('');
                searchSuggestions.classList.remove('hidden');
            } else {
                searchSuggestions.innerHTML = '<div class="p-3 text-gray-500 text-center">لا توجد نتائج مطابقة.</div>';
                searchSuggestions.classList.remove('hidden');
            }

        } catch (error) {
            console.error("Error searching products:", error);
            searchSuggestions.classList.add('hidden');
        }
    } else {
        searchSuggestions.classList.add('hidden');
    }
};

window.selectProductFromSearch = async (productId) => {
    document.getElementById('posProductSearch').value = '';
    document.getElementById('searchSuggestions').classList.add('hidden');
    await addToCart(productId);
};

// Load customers for the POS dropdown
async function loadCustomersForPOS() {
    const customerSelect = document.getElementById('customerSelect');
    if (!customerSelect) return;

    customerSelect.innerHTML = '<option value="">عميل عادي</option>'; // Default option

    try {
        const querySnapshot = await getDocs(customersCollection);
        querySnapshot.forEach((doc) => {
            const customer = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = customer.name;
            customerSelect.appendChild(option);
        });
    } catch (error) {
        showNotification('خطأ في تحميل العملاء لنقطة البيع: ' + error.message, 'error');
        console.error("Error loading customers for POS:", error);
    }
}
window.loadCustomersForPOS = loadCustomersForPOS; // Make globally accessible

// Mock function for adding new customer from POS
window.openAddCustomerModal = () => {
    showNotification('سيتم فتح نافذة إضافة عميل جديد...', 'info');
    // You would open a modal/form for adding a new customer here
    // And after adding, call loadCustomersForPOS() again.
};
