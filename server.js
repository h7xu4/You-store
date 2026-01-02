const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// إعداد قاعدة البيانات
const db = new sqlite3.Database('youstore.db');

// إعداد الجلسات
app.use(session({
    secret: 'youstore-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// إعداد المجلدات الثابتة - الطريقة الصحيحة
app.use(express.static('public'));

// إعداد معالجة البيانات
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// إنشاء الجداول
db.serialize(() => {
    // جدول المستخدمين
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // جدول المنتجات
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        image TEXT,
        category TEXT,
        stock INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // جدول الطلبات
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        total_amount DECIMAL(10,2),
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // جدول تفاصيل الطلبات
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER,
        price DECIMAL(10,2),
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
    )`);

    // إضافة منتجات تجريبية
    const sampleProducts = [
        ['كتاب البرمجة', 'كتاب تعليم البرمجة للمبتدئين', 50.00, 'book1.jpg', 'كتب', 10],
        ['لابتوب Dell', 'لابتوب Dell Inspiron 15', 2500.00, 'laptop1.jpg', 'إلكترونيات', 5],
        ['قميص قطني', 'قميص قطني عالي الجودة', 75.00, 'shirt1.jpg', 'ملابس', 20],
        ['ساعة ذكية', 'ساعة ذكية بمميزات متقدمة', 800.00, 'watch1.jpg', 'إلكترونيات', 8],
        ['هاتف ذكي', 'هاتف ذكي بكاميرا عالية الدقة', 1200.00, 'phone1.jpg', 'إلكترونيات', 15],
        ['حقيبة جلدية', 'حقيبة جلدية أنيقة للعمل', 150.00, 'bag1.jpg', 'إكسسوارات', 12],
        ['سماعات لاسلكية', 'سماعات بلوتوث عالية الجودة', 300.00, 'headphones1.jpg', 'إلكترونيات', 25],
        ['كتاب الطبخ', 'كتاب وصفات الطبخ العربي', 40.00, 'cookbook1.jpg', 'كتب', 18]
    ];

    const stmt = db.prepare(`INSERT OR IGNORE INTO products (name, description, price, image, category, stock) VALUES (?, ?, ?, ?, ?, ?)`);
    sampleProducts.forEach(product => {
        stmt.run(product);
    });
    stmt.finalize();
});

// الصفحات - بدون sendFile، استخدام express.static فقط
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

app.get('/login', (req, res) => {
    res.redirect('/login.html');
});

app.get('/register', (req, res) => {
    res.redirect('/register.html');
});

// API للحصول على المنتجات
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// API لتسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
    const { username, email, password, full_name, phone, address } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(
            'INSERT INTO users (username, email, password, full_name, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, full_name, phone, address],
            function(err) {
                if (err) {
                    res.status(400).json({ error: 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل' });
                    return;
                }
                res.json({ message: 'تم إنشاء الحساب بنجاح', userId: this.lastID });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// API لتسجيل الدخول
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            res.status(500).json({ error: 'خطأ في الخادم' });
            return;
        }
        
        if (!user) {
            res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
            return;
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
            return;
        }
        
        req.session.userId = user.id;
        req.session.username = user.username;
        res.json({ message: 'تم تسجيل الدخول بنجاح', user: { id: user.id, username: user.username, full_name: user.full_name } });
    });
});

// API لتسجيل الخروج
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

// API للتحقق من حالة تسجيل الدخول
app.get('/api/auth-status', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, userId: req.session.userId, username: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});

// API لإضافة طلب جديد
app.post('/api/orders', (req, res) => {
    if (!req.session.userId) {
        res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
        return;
    }
    
    const { items, total } = req.body;
    
    db.run(
        'INSERT INTO orders (user_id, total_amount) VALUES (?, ?)',
        [req.session.userId, total],
        function(err) {
            if (err) {
                res.status(500).json({ error: 'خطأ في إنشاء الطلب' });
                return;
            }
            
            const orderId = this.lastID;
            const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
            
            items.forEach(item => {
                stmt.run([orderId, item.productId, item.quantity, item.price]);
            });
            stmt.finalize();
            
            res.json({ message: 'تم إنشاء الطلب بنجاح', orderId: orderId });
        }
    );
});

app.listen(PORT, () => {
    console.log(`You Store يعمل على المنفذ ${PORT}`);
    console.log(`قم بزيارة: http://localhost:${PORT}`);
    console.log(`الموقع: أب، الجمهورية اليمنية`);
    console.log(`للتواصل: +967 77 259 3040`);
});
