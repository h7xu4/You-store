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

// عرض المنتجات
function displayProducts(productsToShow) {
    const productsGrid = document.getElementById('productsGrid');
    productsGrid.innerHTML = '';
    
    productsToShow.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-image">
                <img src="/images/${product.image}" alt="${product.name}" 
                     style="width: 100%; height: 100%; object-fit: cover;" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: #f0f0f0; color: #999; font-size: 2rem;">
                    <i class="fas fa-image"></i>
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">${product.price} ريال</div>
                <div class="product-actions">
                    <button class="btn-add-cart" onclick="addToCart(${product.id})">
                        <i class="fas fa-cart-plus"></i> إضافة للسلة
                    </button>
                </div>
                <div class="product-stock">
                    <small>متوفر: ${product.stock} قطعة</small>
                </div>
            </div>
        `;
        productsGrid.appendChild(productCard);
    });
}

// إضافة منتج للسلة
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
        } else {
            alert('لا يمكن إضافة المزيد من هذا المنتج');
            return;
        }
    } else {
        if (product.stock > 0) {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                stock: product.stock
            });
        } else {
            alert('هذا المنتج غير متوفر حالياً');
            return;
        }
    }
    
    updateCartDisplay();
    saveCartToStorage();
    
    // إظهار رسالة نجاح
    showNotification('تم إضافة المنتج للسلة بنجاح');
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
        cartItems.innerHTML = '<p style="text-align: center; color: #666;">السلة فارغة</p>';
    } else {
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.price} ريال</div>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span style="margin: 0 10px; font-weight: bold;">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    <button class="quantity-btn" onclick="removeFromCart(${item.id})" style="margin-right: 10px; color: #dc3545;">
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
        alert('لا يمكن إضافة المزيد من هذا المنتج');
    }
}

// إزالة منتج من السلة
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartDisplay();
    saveCartToStorage();
}

// إفراغ السلة
function clearCart() {
    if (confirm('هل أنت متأكد من إفراغ السلة؟')) {
        cart = [];
        updateCartDisplay();
        saveCartToStorage();
    }
}

// إظهار/إخفاء السلة
function toggleCart() {
    const modal = document.getElementById('cartModal');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
}

// إتمام الشراء
async function checkout() {
    if (!currentUser) {
        alert('يجب تسجيل الدخول أولاً');
        window.location.href = '/login';
        return;
    }
    
    if (cart.length === 0) {
        alert('السلة فارغة');
        return;
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
            alert(`تم إنشاء الطلب بنجاح! رقم الطلب: ${result.orderId}`);
            cart = [];
            updateCartDisplay();
            saveCartToStorage();
            toggleCart();
        } else {
            alert(result.error || 'خطأ في إنشاء الطلب');
        }
    } catch (error) {
        alert('خطأ في الاتصال بالخادم');
        console.error('خطأ في الطلب:', error);
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
            alert('تم تسجيل الخروج بنجاح');
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

// إظهار إشعار
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 3000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
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
`;
document.head.appendChild(style);

// إغلاق النافذة المنبثقة عند النقر خارجها
window.onclick = function(event) {
    const modal = document.getElementById('cartModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}