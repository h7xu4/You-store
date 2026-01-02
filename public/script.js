// متغيرات عامة
let cart = [];
let products = [];
let currentUser = null;

// تحميل البيانات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    loadProducts();
    loadCartFromStorage();
});

// التحقق من حالة تسجيل الدخول
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();
        
        if (data.loggedIn) {
            currentUser = data;
            document.getElementById('loginBtn').style.display = 'none';
            document.getElementById('userInfo').style.display = 'flex';
            document.getElementById('welcomeText').textContent = `مرحباً ${data.username}`;
        } else {
            document.getElementById('loginBtn').style.display = 'block';
            document.getElementById('userInfo').style.display = 'none';
        }
    } catch (error) {
        console.error('خطأ في التحقق من حالة المصادقة:', error);
    }
}

// تحميل المنتجات
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('خطأ في تحميل المنتجات:', error);
    }
}

// عرض المنتجات مع الأيقونات
function displayProducts(productsToShow) {
    const productsGrid = document.getElementById('productsGrid');
    productsGrid.innerHTML = '';
    
    // أيقونات المنتجات
    const productIcons = {
        'book1.jpg': 'fas fa-book',
        'laptop1.jpg': 'fas fa-laptop',
        'shirt1.jpg': 'fas fa-tshirt',
        'watch1.jpg': 'fas fa-clock',
        'phone1.jpg': 'fas fa-mobile-alt',
        'bag1.jpg': 'fas fa-shopping-bag',
        'headphones1.jpg': 'fas fa-headphones',
        'cookbook1.jpg': 'fas fa-utensils'
    };
    
    // ألوان الأيقونات حسب الفئة
    const categoryColors = {
        'كتب': '#e74c3c',
        'إلكترونيات': '#3498db',
        'ملابس': '#2ecc71',
        'إكسسوارات': '#f39c12'
    };
    
    productsToShow.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        const iconClass = productIcons[product.image] || 'fas fa-box';
        const iconColor = categoryColors[product.category] || '#667eea';
        
        productCard.innerHTML = `
            <div class="product-image">
                <i class="${iconClass}" style="font-size: 4rem; color: ${iconColor};"></i>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-category">
                    <span class="category-badge" style="background-color: ${iconColor};">${product.category}</span>
                </div>
                <div class="product-price">${product.price} ريال</div>
                <div class="product-stock">
                    <small style="color: ${product.stock > 0 ? '#28a745' : '#dc3545'};">
                        ${product.stock > 0 ? `متوفر: ${product.stock} قطعة` : 'غير متوفر'}
                    </small>
                </div>
                <div class="product-actions">
                    <button class="btn-add-cart" onclick="addToCart(${product.id})" 
                            ${product.stock <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> 
                        ${product.stock > 0 ? 'إضافة للسلة' : 'غير متوفر'}
                    </button>
                </div>
            </div>
        `;
        productsGrid.appendChild(productCard);
    });
}

// إضافة منتج للسلة
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) {
        showNotification('هذا المنتج غير متوفر حالياً', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
        } else {
            showNotification('لا يمكن إضافة المزيد من هذا المنتج', 'warning');
            return;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            stock: product.stock,
            category: product.category
        });
    }
    
    updateCartDisplay();
    saveCartToStorage();
    showNotification('تم إضافة المنتج للسلة بنجاح', 'success');
}

// تحديث عرض السلة
function updateCartDisplay() {
    const cartCount = document.querySelector('.cart-count');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    // تحديث عدد العناصر
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // تحديث محتويات السلة
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">السلة فارغة</p>';
    } else {
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.price} ريال × ${item.quantity}</div>
                    <div class="cart-item-category">
                        <small style="color: #666;">${item.category}</small>
                    </div>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span style="margin: 0 10px; font-weight: bold;">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    <button class="quantity-btn remove-btn" onclick="removeFromCart(${item.id})" 
                            style="margin-right: 10px; color: #dc3545; border-color: #dc3545;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            cartItems.appendChild(cartItem);
        });
    }
    
    // تحديث المجموع
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = total.toFixed(2);
}

// تحديث كمية المنتج
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
    } else if (newQuantity <= item.stock) {
        item.quantity = newQuantity;
        updateCartDisplay();
        saveCartToStorage();
    } else {
        showNotification('لا يمكن إضافة المزيد من هذا المنتج', 'warning');
    }
}

// إزالة منتج من السلة
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartDisplay();
    saveCartToStorage();
    showNotification('تم إزالة المنتج من السلة', 'info');
}

// إفراغ السلة
function clearCart() {
    if (cart.length === 0) {
        showNotification('السلة فارغة بالفعل', 'info');
        return;
    }
    
    if (confirm('هل أنت متأكد من إفراغ السلة؟')) {
        cart = [];
        updateCartDisplay();
        saveCartToStorage();
        showNotification('تم إفراغ السلة', 'info');
    }
}

// إظهار/إخفاء السلة
function toggleCart() {
    const modal = document.getElementById('cartModal');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
}

// إتمام الشراء مع تقليل الكمية
async function checkout() {
    if (!currentUser) {
        showNotification('يجب تسجيل الدخول أولاً', 'error');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);
        return;
    }
    
    if (cart.length === 0) {
        showNotification('السلة فارغة', 'warning');
        return;
    }
    
    // التحقق من توفر الكميات
    for (let item of cart) {
        const product = products.find(p => p.id === item.id);
        if (!product || product.stock < item.quantity) {
            showNotification(`الكمية المطلوبة من ${item.name} غير متوفرة`, 'error');
            return;
        }
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderData = {
        items: cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price
        })),
        total: total
    };
    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification(`تم إنشاء الطلب بنجاح! رقم الطلب: ${result.orderId}`, 'success');
            
            // تحديث الكميات المحلية
            cart.forEach(cartItem => {
                const product = products.find(p => p.id === cartItem.id);
                if (product) {
                    product.stock -= cartItem.quantity;
                }
            });
            
            // إعادة عرض المنتجات بالكميات المحدثة
            displayProducts(products);
            
            // إفراغ السلة
            cart = [];
            updateCartDisplay();
            saveCartToStorage();
            toggleCart();
            
            // إظهار واجهة الدفع
            showPaymentModal(result.orderId, total);
        } else {
            showNotification(result.error || 'خطأ في إنشاء الطلب', 'error');
        }
    } catch (error) {
        showNotification('خطأ في الاتصال بالخادم', 'error');
        console.error('خطأ في الطلب:', error);
    }
}

// إظهار واجهة طرق الدفع
function showPaymentModal(orderId, total) {
    const paymentModal = document.createElement('div');
    paymentModal.className = 'modal';
    paymentModal.id = 'paymentModal';
    paymentModal.style.display = 'block';
    
    paymentModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>اختر طريقة الدفع</h3>
                <span class="close" onclick="closePaymentModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="payment-info">
                    <p><strong>رقم الطلب:</strong> ${orderId}</p>
                    <p><strong>المبلغ الإجمالي:</strong> ${total} ريال</p>
                </div>
                <div class="payment-methods">
                    <div class="payment-method" onclick="selectPayment('bank')">
                        <i class="fas fa-university"></i>
                        <h4>حوالة بنكية</h4>
                        <p>تحويل مصرفي مباشر</p>
                    </div>
                    <div class="payment-method" onclick="selectPayment('karimi')">
                        <i class="fas fa-credit-card"></i>
                        <h4>كريمي</h4>
                        <p>الدفع عبر كريمي</p>
                    </div>
                    <div class="payment-method" onclick="selectPayment('onecash')">
                        <i class="fas fa-mobile-alt"></i>
                        <h4>ون كاش</h4>
                        <p>الدفع عبر ون كاش</p>
                    </div>
                    <div class="payment-method" onclick="selectPayment('cash')">
                        <i class="fas fa-money-bill-wave"></i>
                        <h4>الدفع عند الاستلام</h4>
                        <p>ادفع عند وصول الطلب</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(paymentModal);
}

// اختيار طريقة الدفع
function selectPayment(method) {
    const paymentDetails = {
        'bank': {
            title: 'حوالة بنكية',
            details: `
                <p><strong>بيانات الحساب البنكي:</strong></p>
                <p>اسم البنك: البنك الأهلي اليمني</p>
                <p>رقم الحساب: 123456789</p>
                <p>اسم صاحب الحساب: You Store</p>
                <p>يرجى إرسال إيصال التحويل على الواتساب: +967 77 259 3040</p>
            `
        },
        'karimi': {
            title: 'كريمي',
            details: `
                <p><strong>بيانات الدفع عبر كريمي:</strong></p>
                <p>رقم كريمي: +967 77 259 3040</p>
                <p>اسم المستلم: You Store</p>
                <p>يرجى إرسال لقطة شاشة للعملية على الواتساب</p>
            `
        },
        'onecash': {
            title: 'ون كاش',
            details: `
                <p><strong>بيانات الدفع عبر ون كاش:</strong></p>
                <p>رقم ون كاش: +967 77 259 3040</p>
                <p>اسم المستلم: You Store</p>
                <p>يرجى إرسال رقم العملية على الواتساب</p>
            `
        },
        'cash': {
            title: 'الدفع عند الاستلام',
            details: `
                <p><strong>الدفع عند الاستلام:</strong></p>
                <p>سيتم التواصل معك لتأكيد العنوان</p>
                <p>ادفع المبلغ عند وصول الطلب</p>
                <p>رسوم التوصيل: 500 ريال (داخل المدينة)</p>
            `
        }
    };
    
    const selectedPayment = paymentDetails[method];
    
    const paymentModal = document.getElementById('paymentModal');
    paymentModal.querySelector('.modal-body').innerHTML = `
        <div class="payment-selected">
            <h3>${selectedPayment.title}</h3>
            ${selectedPayment.details}
            <div class="payment-actions">
                <button class="btn-primary" onclick="confirmPayment('${method}')">تأكيد الطلب</button>
                <button class="btn-secondary" onclick="showPaymentModal()">العودة</button>
            </div>
        </div>
    `;
}

// تأكيد الدفع
function confirmPayment(method) {
    showNotification('تم تأكيد طلبك! سيتم التواصل معك قريباً', 'success');
    closePaymentModal();
}

// إغلاق واجهة الدفع
function closePaymentModal() {
    const paymentModal = document.getElementById('paymentModal');
    if (paymentModal) {
        document.body.removeChild(paymentModal);
    }
}

// تسجيل الخروج
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            currentUser = null;
            checkAuthStatus();
            showNotification('تم تسجيل الخروج بنجاح', 'success');
        }
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
    }
}

// حفظ السلة في التخزين المحلي
function saveCartToStorage() {
    localStorage.setItem('youstore_cart', JSON.stringify(cart));
}

// تحميل السلة من التخزين المحلي
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('youstore_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartDisplay();
    }
}

// إظهار إشعار محسن
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    
    const colors = {
        'success': '#28a745',
        'error': '#dc3545',
        'warning': '#ffc107',
        'info': '#17a2b8'
    };
    
    const icons = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 3000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
        max-width: 300px;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    notification.innerHTML = `
        <i class="${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// إضافة أنيميشن CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .category-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 12px;
        color: white;
        font-size: 0.8rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
    }
    
    .payment-methods {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }
    
    .payment-method {
        border: 2px solid #e9ecef;
        border-radius: 8px;
        padding: 1.5rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .payment-method:hover {
        border-color: #667eea;
        background-color: #f8f9ff;
    }
    
    .payment-method i {
        font-size: 2rem;
        color: #667eea;
        margin-bottom: 0.5rem;
    }
    
    .payment-method h4 {
        margin: 0.5rem 0;
        color: #333;
    }
    
    .payment-method p {
        margin: 0;
        color: #666;
        font-size: 0.9rem;
    }
    
    .payment-info {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
    }
    
    .payment-selected {
        text-align: center;
    }
    
    .payment-actions {
        margin-top: 2rem;
        display: flex;
        gap: 1rem;
        justify-content: center;
    }
    
    .btn-add-cart:disabled {
        background-color: #6c757d;
        cursor: not-allowed;
        opacity: 0.6;
    }
    
    .remove-btn:hover {
        background-color: #dc3545 !important;
        color: white !important;
    }
`;
document.head.appendChild(style);

// إغلاق النافذة المنبثقة عند النقر خارجها
window.onclick = function(event) {
    const cartModal = document.getElementById('cartModal');
    const paymentModal = document.getElementById('paymentModal');
    
    if (event.target === cartModal) {
        cartModal.style.display = 'none';
    }
    
    if (event.target === paymentModal) {
        closePaymentModal();
    }
}
