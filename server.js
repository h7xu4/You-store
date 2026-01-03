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

// إعداد المجلدات الثابتة
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
        payment_method TEXT,
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
        ['كتاب الطبخ', 'كتاب وصفات الطبخ العربي', 40.00, 'cookbook1.jpg', 'كتب', 18],
        ['لابتوب Dell', 'لابتوب Dell Inspiron 15', 2500.00, 'laptop1.jpg', 'إلكترونيات', 5],
        ['هاتف ذكي', 'هاتف ذكي بكاميرا عالية الدقة', 1200.00, 'phone1.jpg', 'إلكترونيات', 15],
        ['ساعة ذكية', 'ساعة ذكية بمميزات متقدمة', 800.00, 'watch1.jpg', 'إلكترونيات', 8],
        ['سماعات لاسلكية', 'سماعات بلوتوث عالية الجودة', 300.00, 'headphones1.jpg', 'إلكترونيات', 25],
        ['قميص قطني', 'قميص قطني عالي الجودة', 75.00, 'shirt1.jpg', 'ملابس', 20],
        ['حقيبة جلدية', 'حقيبة جلدية أنيقة للعمل', 150.00, 'bag1.jpg', 'إكسسوارات', 12]
    ];

    const stmt = db.prepare(`INSERT OR IGNORE INTO products (name, description, price, image, category, stock) VALUES (?, ?, ?, ?, ?, ?)`);
    sampleProducts.forEach(product => {
        stmt.run(product);
    });
    stmt.finalize();
});

// الصفحات الرئيسية
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

app.get('/login', (req, res) => {
    res.redirect('/login.html');
});

app.get('/register', (req, res) => {
    res.redirect('/register.html');
});

// صفحات الأقسام
app.get('/books', (req, res) => {
    res.redirect('/books.html');
});

app.get('/electronics', (req, res) => {
    res.redirect('/electronics.html');
});

app.get('/clothes', (req, res) => {
    res.redirect('/clothes.html');
});

app.get('/accessories', (req, res) => {
    res.redirect('/accessories.html');
});

// API للحصول على جميع المنتجات
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// API للحصول على المنتجات حسب الفئة
app.get('/api/products/category/:category', (req, res) => {
    const category = req.params.category;
    db.all('SELECT * FROM products WHERE category = ? ORDER BY created_at DESC', [category], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// API للحصول على منتج واحد
app.get('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    db.get('SELECT * FROM products WHERE id = ?', [productId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'المنتج غير موجود' });
            return;
        }
        res.json(row);
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

// API لإضافة طلب جديد مع تقليل الكمية
app.post('/api/orders', (req, res) => {
    if (!req.session.userId) {
        res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
        return;
    }
    
    const { items, total, payment_method } = req.body;
    
    // بدء معاملة قاعدة البيانات
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // التحقق من توفر الكميات
        let stockCheckPromises = items.map(item => {
            return new Promise((resolve, reject) => {
                db.get('SELECT stock FROM products WHERE id = ?', [item.productId], (err, row) => {
                    if (err) {
                        reject(err);
                    } else if (!row || row.stock < item.quantity) {
                        reject(new Error(`الكمية المطلوبة غير متوفرة للمنتج ${item.productId}`));
                    } else {
                        resolve();
                    }
                });
            });
        });
        
        Promise.all(stockCheckPromises)
            .then(() => {
                // إنشاء الطلب
                db.run(
                    'INSERT INTO orders (user_id, total_amount, payment_method) VALUES (?, ?, ?)',
                    [req.session.userId, total, payment_method || 'غير محدد'],
                    function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: 'خطأ في إنشاء الطلب' });
                            return;
                        }
                        
                        const orderId = this.lastID;
                        
                        // إضافة تفاصيل الطلب وتقليل الكميات
                        let completed = 0;
                        let hasError = false;
                        
                        items.forEach(item => {
                            // إضافة تفاصيل الطلب
                            db.run(
                                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                                [orderId, item.productId, item.quantity, item.price],
                                (err) => {
                                    if (err && !hasError) {
                                        hasError = true;
                                        db.run('ROLLBACK');
                                        res.status(500).json({ error: 'خطأ في إضافة تفاصيل الطلب' });
                                        return;
                                    }
                                    
                                    // تقليل الكمية
                                    db.run(
                                        'UPDATE products SET stock = stock - ? WHERE id = ?',
                                        [item.quantity, item.productId],
                                        (err) => {
                                            if (err && !hasError) {
                                                hasError = true;
                                                db.run('ROLLBACK');
                                                res.status(500).json({ error: 'خطأ في تحديث الكمية' });
                                                return;
                                            }
                                            
                                            completed++;
                                            if (completed === items.length && !hasError) {
                                                db.run('COMMIT');
                                                res.json({ 
                                                    message: 'تم إنشاء الطلب بنجاح', 
                                                    orderId: orderId,
                                                    total: total,
                                                    itemsCount: items.length
                                                });
                                            }
                                        }
                                    );
                                }
                            );
                        });
                    }
                );
            })
            .catch((error) => {
                db.run('ROLLBACK');
                res.status(400).json({ error: error.message });
            });
    });
});

// API للحصول على طلبات المستخدم
app.get('/api/orders', (req, res) => {
    if (!req.session.userId) {
        res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
        return;
    }
    
    db.all(
        `SELECT o.*, GROUP_CONCAT(p.name || ' (x' || oi.quantity || ')') as items
         FROM orders o 
         LEFT JOIN order_items oi ON o.id = oi.order_id 
         LEFT JOIN products p ON oi.product_id = p.id 
         WHERE o.user_id = ? 
         GROUP BY o.id 
         ORDER BY o.created_at DESC`,
        [req.session.userId],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// API للحصول على إحصائيات المتجر
app.get('/api/stats', (req, res) => {
    const stats = {};
    
    // عدد المنتجات
    db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        stats.products = row.count;
        
        // عدد المستخدمين
        db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            stats.users = row.count;
            
            // عدد الطلبات
            db.get('SELECT COUNT(*) as count FROM orders', (err, row) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                stats.orders = row.count;
                
                // إجمالي المبيعات
                db.get('SELECT SUM(total_amount) as total FROM orders', (err, row) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    stats.totalSales = row.total || 0;
                    
                    res.json(stats);
                });
            });
        });
    });
});

// API للحصول على الفئات
app.get('/api/categories', (req, res) => {
    db.all('SELECT DISTINCT category FROM products ORDER BY category', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const categories = rows.map(row => row.category);
        res.json(categories);
    });
});

// معالج الأخطاء العام
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
});

// معالج الصفحات غير الموجودة
app.use((req, res) => {
    res.status(404).redirect('/');
});

app.listen(PORT, () => {
    console.log(`You Store يعمل على المنفذ ${PORT}`);
    console.log(`قم بزيارة: http://localhost:${PORT}`);
    console.log(`الموقع: أب، الجمهورية اليمنية`);
    console.log(`للتواصل: +967 77 259 3040`);
});
