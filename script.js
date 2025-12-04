// Supabase Configuration
const SUPABASE_URL = 'https://nmfbejzgsmpzyodftrka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZmJlanpnc21wenlvZGZ0cmthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2OTM3MjIsImV4cCI6MjA4MDI2OTcyMn0.w4Y2KSXPVtzlaQ1NnUSZcAq5PkSBvRbyBPEw9Cox414';

// ⚠️ IMPORTANT: Replace these with your actual EmailJS credentials
const EMAILJS_SERVICE_ID = 'service_81j7m3d';
const EMAILJS_TEMPLATE_BUYER_ID = 'template_edxa8cw';
const EMAILJS_TEMPLATE_SELLER_ID = 'template_4hqnmhh';
const EMAILJS_PUBLIC_KEY = '4vtMy7s-OdScRLaMp';
const SELLER_EMAIL = 'fk1924329@gmail.com';

const LOCAL_IMAGE_FALLBACKS = [
    // Tennis
    { keywords: ['tennis bat', 'racket', 'racquet'], path: 'images/Tennis-Bat.jpg' },
    { keywords: ['tennis ball', 'adidas tennis ball'], path: 'images/Adidas-tennis-ball.jpeg' },

    // Cricket bats / balls
    { keywords: ['ca bat', 'ca bats', 'ca cricket bat'], path: 'images/CA-balls.jpg' },

    // Gloves
    { keywords: ['gray nicolls glove', 'hard ball glove', 'glove', 'gloves'], path: 'images/GRAY-Nicolls-Hard-Ball-Gloves.jpeg' },
    { keywords: ['mrf glove'], path: 'images/MRF-Hard-Ball-Gloves.jpeg' },
    { keywords: ['keeper glove', 'wicket keeper'], path: 'images/Keeper-Gloves.jpeg' },

    // Protective gear
    { keywords: ['cricket pads', 'batting pads', 'pad', 'pads'], path: 'images/Cricket-Pads.jpg' },
    { keywords: ['thigh guard', 'thigh support'], path: 'images/Cricket-Thigh-Support.jpeg' },
    { keywords: ['helmet'], path: 'images/Star-Helmet.jpeg' },

    // Accessories
    { keywords: ['bat grip', 'bat grips', 'grip'], path: 'images/Bat-Grips.jpeg' },
    { keywords: ['shoe', 'sneaker', 'red tape'], path: 'images/Red-Tape.jpeg' },

    // Balls
    { keywords: ['white ball', 'gray nicolls ball'], path: 'images\White-Gray-Nicolls-Hard-Ball.jpeg' }
];

function getLocalProductImage(name = '') {
    const lower = name.toLowerCase();
    const match = LOCAL_IMAGE_FALLBACKS.find(entry =>
        entry.keywords.some(keyword => lower.includes(keyword))
    );
    return match ? match.path : null;
}

function resolveProductImage(product = {}, size = '300x400') {
    // 1) Try local folder based on product/category name (force your branded images)
    const local = getLocalProductImage(product.name || product.categories?.name || '');
    if (local) return local;

    // 2) Otherwise, use primary image from Supabase if available
    const primary = product.product_images?.find(img => img.is_primary)?.image_url;
    if (primary) return primary;

    // 3) Final fallback: Unsplash based on product name
    const query = encodeURIComponent((product.name || 'sports gear').toLowerCase());
    return `https://source.unsplash.com/${size}/?${query}`;
}

let supabaseClient;
let currentUser = null;

// Initialize Supabase
function initSupabase() {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase ready!');
        initAuthListeners();
        return true;
    } else {
        setTimeout(initSupabase, 200);
        return false;
    }
}

// Initialize EmailJS
function initEmailJS() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_PUBLIC_KEY);
        console.log('EmailJS initialized!');
        return true;
    } else {
        console.warn('EmailJS not loaded yet, retrying...');
        setTimeout(initEmailJS, 200);
        return false;
    }
}

// FIXED: Buyer Email Function
async function sendBuyerEmail(buyerEmail, orderData, buyerName) {
    try {
        const itemsList = (orderData.items || [])
            .map(item => `${item.name} × ${item.quantity} — PKR ${Number(item.price_pkr || 0).toLocaleString()}`)
            .join('\n') || 'No items';

        const now = new Date();

        const templateParams = {
            // Make sure everything is a simple string for EmailJS
            to_email: String(buyerEmail || ''),
            to_name: String(buyerName || 'Elite Athlete'),
            order_id: String(orderData.order_id || ''),
            total: String((orderData.total_amount || 0).toLocaleString()),
            items: String(itemsList),
            order_date: now.toLocaleDateString('en-PK'),
            order_time: now.toLocaleTimeString('en-PK'),
            // For templates that use {{orders}} block / variable
            orders: '1',
            message: `Thank you for your Sportify order #${orderData.order_id || ''}.`
        };

        console.log('Buyer template params:', templateParams);

        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_BUYER_ID,
            templateParams
        );

        console.log('Buyer email sent:', response.status);
        return true;
    } catch (error) {
        console.error('Buyer email failed:', error);
        return false;
    }
}

async function sendSellerEmail(orderData, buyerData) {
    try {
        const itemsList = (orderData.items || [])
            .map(item => `${item.name} × ${item.quantity}`)
            .join('\n') || 'No items';

        const now = new Date();

        const templateParams = {
            to_email: String(SELLER_EMAIL || ''),
            customer_name: String(buyerData.name || ''),
            customer_phone: String(buyerData.phone || ''),
            customer_email: String(buyerData.email || ''),
            order_id: String(orderData.order_id || ''),
            total: String((orderData.total_amount || 0).toLocaleString()),
            items: String(itemsList),
            shipping_address: String(buyerData.address || ''),
            payment_method: String(buyerData.payment || ''),
            order_date: now.toLocaleDateString('en-PK'),
            order_time: now.toLocaleTimeString('en-PK'),
            orders: '1',
            message: `New order #${orderData.order_id || ''} from ${buyerData.name || 'Unknown'}.`
        };

        console.log('Seller template params:', templateParams);

        await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_SELLER_ID,
            templateParams
        );
        console.log('Seller notification sent');
        return true;
    } catch (error) {
        console.error('Seller email failed:', error);
        return false;
    }
}

// Auth Functions
async function signUp(email, password, name) {
    try {
        console.log('Attempting signUp for:', email);

        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { name } }
        });
        
        console.log('SignUp Response:', { data, error });

        if (error) {
            console.error('Signup error:', error);
            alert('Signup error: ' + error.message);
            throw error;
        }
        
        const user = data.user;
        console.log('Signed up user:', user.email, 'ID:', user.id, 'Confirmed:', user.confirmed_at);
        
        alert('Account created! ' + (user.confirmed_at ? 'Auto-confirmed – try login now!' : 'Check dashboard to confirm.'));
        closeAuthModal();
        
        if (user.confirmed_at) {
            await signIn(email, password);
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('Signup error: ' + error.message);
    }
}

async function signIn(email, password) {
    try {
        console.log('Attempting signIn for:', email);

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        
        console.log('Supabase Response:', { data: data ? 'User found' : 'No user', error: error });

        if (error) {
            console.error('Full Error Details:', error);
            if (error.message.includes('Invalid login credentials')) {
                alert('Invalid credentials. Check email/password. If new user, confirm in dashboard or reset password.');
            } else {
                alert('Login error: ' + error.message);
            }
            throw error;
        }
        
        currentUser = data.user;
        console.log('Logged in user:', currentUser.email, 'Confirmed:', currentUser.confirmed_at);
        updateAuthUI();
        closeAuthModal();
        
        alert(`Welcome back, ${currentUser.user_metadata?.name || 'Elite Athlete'}!`);
    } catch (error) {
        console.error('Login error:', error);
    }
}

function logout() {
    supabaseClient.auth.signOut();
    currentUser = null;
    updateAuthUI();
    console.log('User logged out');
    alert('You have been logged out successfully.');
}

function initAuthListeners() {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
        updateAuthUI();
        
        if (event === 'SIGNED_IN') {
            console.log('User session active');
        } else if (event === 'SIGNED_OUT') {
            console.log('User session ended');
        }
    });
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userWelcome = document.getElementById('user-welcome');

    if (currentUser) {
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        userWelcome.textContent = `Welcome, ${currentUser.user_metadata?.name || currentUser.email}`;
        userWelcome.style.display = 'inline';
    } else {
        loginBtn.style.display = 'inline-block';
        signupBtn.style.display = 'none';
        logoutBtn.style.display = 'none';
        userWelcome.style.display = 'none';
    }
}

function showLoginModal() {
    document.getElementById('login-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function showSignupModal() {
    document.getElementById('signup-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('signup-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function switchToSignup() {
    closeAuthModal();
    showSignupModal();
}

function switchToLogin() {
    closeAuthModal();
    showLoginModal();
}

// Globals
let allProducts = [];
let allCategories = [];
let cart = JSON.parse(localStorage.getItem('sportify-cart')) || [];

// DOM Elements
const elements = {
    collectionsGrid: document.querySelector('.collections-grid'),
    productsGrid: document.getElementById('products-grid'),
    searchInput: document.getElementById('search-input'),
    categoryFilter: document.getElementById('category-filter'),
    sortFilter: document.getElementById('sort-filter'),
    productModal: document.getElementById('product-modal'),
    modalBody: document.getElementById('modal-body'),
    cartModal: document.getElementById('cart-modal'),
    checkoutModal: document.getElementById('checkout-modal'),
    cartItems: document.getElementById('cart-items'),
    cartTotal: document.getElementById('cart-total'),
    cartBadge: document.getElementById('cart-badge'),
    proceedBtn: document.getElementById('proceed-btn'),
    checkoutForm: document.getElementById('checkout-form')
};

// Cart Functions
function addToCart(productId, quantity = 1) {
    console.log('Adding to cart:', productId, quantity);
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        const product = allProducts.find(p => p.id === productId);
        if (product) {
            cart.push({ ...product, quantity });
            console.log('Product added:', product.name);
        } else {
            console.error('Product not found:', productId);
            alert('Product not found! Refresh and try again.');
            return;
        }
    }
    localStorage.setItem('sportify-cart', JSON.stringify(cart));
    updateCartBadge();
    updateCartDisplay();
    
    const btn = event?.target;
    if (btn) {
        const originalText = btn.textContent;
        btn.textContent = 'Added!';
        btn.style.background = '#45a049';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '#4CAF50';
        }, 1000);
    }
    alert('Added to cart!');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('sportify-cart', JSON.stringify(cart));
    updateCartBadge();
    updateCartDisplay();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            localStorage.setItem('sportify-cart', JSON.stringify(cart));
            updateCartBadge();
            updateCartDisplay();
        }
    }
}

function updateCartBadge() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    elements.cartBadge.textContent = totalItems;
    elements.proceedBtn.style.display = totalItems > 0 ? 'block' : 'none';
}

function updateCartDisplay() {
    if (!elements.cartItems) return;
    elements.cartItems.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price_pkr * item.quantity;
        total += itemTotal;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${resolveProductImage(item, '50x50')}" alt="${item.name}">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p>PKR ${item.price_pkr.toLocaleString()} x ${item.quantity}</p>
                <p>Subtotal: PKR ${itemTotal.toLocaleString()}</p>
            </div>
            <div class="quantity-controls">
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
            </div>
            <button class="remove-btn" onclick="removeFromCart('${item.id}')">Remove</button>
        `;
        elements.cartItems.appendChild(div);
    });
    
    elements.cartTotal.textContent = total.toLocaleString();
}

function openCartModal() {
    updateCartDisplay();
    elements.cartModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeCartModal() {
    elements.cartModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function proceedToCheckout() {
    if (cart.length === 0) {
        alert('Your cart is empty! Add some elite gear first.');
        return;
    }
    if (!currentUser) {
        alert('Please login to proceed to checkout.');
        showLoginModal();
        return;
    }
    closeCartModal();
    elements.checkoutModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeCheckoutModal() {
    elements.checkoutModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function closeProductModal() {
    elements.productModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// FIXED: placeOrder — total_amount → total (tumhare table ke hisab se)
async function placeOrder(formData) {
    const submitBtn = elements.checkoutForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing Order...';

    try {
        const totalAmount = cart.reduce((sum, item) => sum + (item.price_pkr * item.quantity), 0);

        const { data, error } = await supabaseClient
            .from('orders')
            .insert({
                user_id: currentUser?.id || null,
                customer_name: formData.name,
                customer_email: formData.email,
                customer_phone: formData.phone,
                shipping_address: formData.address,
                payment_method: formData.payment || 'Cash on Delivery',
                total: totalAmount,
                items: cart
            })
            .select()
            .single();

        if (error) throw error;

        // Prefer sequential order_number if available, otherwise fallback to short UUID
        let displayId;
        if (data.order_number !== undefined && data.order_number !== null) {
            displayId = String(data.order_number).padStart(8, '0'); // 00000001, 00000002, ...
        } else {
            const rawId = String(data.id || '');
            displayId = rawId.replace(/-/g, '').slice(-8).toUpperCase(); // fallback e.g. 86DF9061
        }

        const emailOrderData = {
            order_id: displayId,
            items: cart,
            total_amount: totalAmount
        };

        const buyerEmailSent = await sendBuyerEmail(formData.email, emailOrderData, formData.name);
        const sellerEmailSent = await sendSellerEmail(emailOrderData, formData);

        // Success message + WhatsApp fallback
        let msg = `Order Placed Successfully!\n\n`;
        msg += `Order ID: ${displayId}\n`;
        msg += `Total: PKR ${totalAmount.toLocaleString()}\n\n`;

        if (buyerEmailSent) {
            msg += `Confirmation email sent to ${formData.email}\n`;
        } else {
            msg += `Email failed – don’t worry!\nOpening WhatsApp confirmation...`;
        }

        msg += `\nWe’ll contact you soon via WhatsApp`;

        alert(msg);

        // Agar email fail ho to WhatsApp khud khul jaye
        if (!buyerEmailSent) {
            const waText = encodeURIComponent(
`*Sportify – Order Confirmed*\n\n` +
`Hi ${formData.name},\n\n` +
`Your order is confirmed!\n\n` +
`Order ID: ${displayId}\n` +
`Total: PKR ${totalAmount.toLocaleString()}\n\n` +
`Items:\n` +
cart.map(i => `• ${i.name} × ${i.quantity} = PKR ${(i.price_pkr * i.quantity).toLocaleString()}`).join('\n') +
`\n\nWe will contact you shortly.\nThank you!\nhttps://sportify.pk`
            );
            window.open(`https://wa.me/${formData.phone.replace(/[^\d]/g, '')}?text=${waText}`, '_blank');
        }

        // Clear cart
        cart = [];
        localStorage.removeItem('sportify-cart');
        updateCartBadge();
        updateCartDisplay();
        closeCheckoutModal();
        elements.checkoutForm.reset();

    } catch (error) {
        console.error('Order error:', error);
        alert('Error: ' + error.message + '\nPlease contact via WhatsApp');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

// Load Categories & Products & Rest of your code (unchanged)
async function loadCategories() {
    const { data, error } = await supabaseClient
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    if (error) return console.error('Categories error:', error);

    allCategories = data;
    if (!elements.collectionsGrid) return;

    elements.collectionsGrid.innerHTML = '';
    data.slice(0, 3).forEach((cat, index) => {
        let imgPath = `https://source.unsplash.com/400x500/?${cat.slug},sports`;

        const card = document.createElement('div');
        card.className = 'collection-card rotate-card';
        card.style.animationDelay = `${index * 0.2}s`;
        card.innerHTML = `
            <div class="card-front">
                <img src="${imgPath}" alt="${cat.name}" loading="lazy">
                <h3>${cat.name}</h3>
            </div>
            <div class="card-back">
                <p>${cat.description || 'Premium gear for peak performance.'}</p>
                <span class="price">From PKR ${cat.min_price || '10,000'}</span>
                <button class="add-to-vault" onclick="filterByCategory('${cat.slug}')">Explore</button>
            </div>
        `;
        elements.collectionsGrid.appendChild(card);
    });

    if (elements.categoryFilter) {
        elements.categoryFilter.innerHTML = '<option value="">All Sports</option>';
        data.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.slug;
            opt.textContent = cat.name;
            elements.categoryFilter.appendChild(opt);
        });
    }
    console.log('Categories loaded:', data.length);
}

async function loadProducts(filters = {}, sort = 'newest') {
    if (!supabaseClient) return;
    let query = supabaseClient
        .from('products')
        .select('*, product_images(image_url, is_primary), categories(name, slug)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (filters.category) {
        const { data: cat } = await supabaseClient.from('categories').select('id').eq('slug', filters.category).single();
        if (cat) query.eq('category_id', cat.id);
    }
    if (filters.search) query.ilike('name', `%${filters.search}%`);

    if (sort === 'price-asc') query.order('price_pkr', { ascending: true });
    if (sort === 'price-desc') query.order('price_pkr', { ascending: false });

    const { data, error } = await query;
    if (error) return console.error('Products error:', error);

    allProducts = data;
    renderProducts(data);
    console.log('Products loaded:', data.length);
}

function renderProducts(products) {
    if (!elements.productsGrid) return;
    elements.productsGrid.innerHTML = '';
    products.forEach(product => {
        const primaryImg = resolveProductImage(product, '300x400');
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => openProductModal(product.id);
        card.style.cursor = 'pointer';
        card.innerHTML = `
            <img src="${primaryImg}" alt="${product.name}" loading="lazy">
            <h3>${product.name}</h3>
            <p class="brand">${product.brand || 'Elite Series'}</p>
            <p>${product.description?.slice(0, 80)}...</p>
            <span class="price">PKR ${product.price_pkr.toLocaleString()}</span>
            ${product.stock_quantity === 0 ? '<span class="out-of-stock">Limited Edition</span>' : ''}
            <button class="add-btn" onclick="event.stopPropagation(); addToCart('${product.id}')">Add to Cart</button>
        `;
        elements.productsGrid.appendChild(card);
    });
}

function filterByCategory(slug) {
    const filtered = allProducts.filter(p => p.categories?.slug === slug);
    renderProducts(filtered);
    if (elements.categoryFilter) elements.categoryFilter.value = slug;
    scrollToSection('products');
}

function setupEventListeners() {
    if (elements.searchInput) {
        let timer;
        elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(timer);
            timer = setTimeout(() => loadProducts({ search: e.target.value }), 500);
        });
    }
    if (elements.categoryFilter) {
        elements.categoryFilter.addEventListener('change', e => loadProducts({ category: e.target.value }));
    }
    if (elements.sortFilter) {
        elements.sortFilter.addEventListener('change', e => loadProducts({}, e.target.value));
    }
    
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', e => {
            e.preventDefault();
            alert('Welcome to the Elite Circle!');
            newsletterForm.reset();
        });
    }
}

async function openProductModal(id) {
    document.body.style.overflow = 'hidden';
    const { data } = await supabaseClient
        .from('products')
        .select('*, product_images(image_url, is_primary), categories(name), promotions(title, discount_percentage)')
        .eq('id', id)
        .single();
    if (!data) return;

    const img = resolveProductImage(data, '400x300');
    
    const disc = data.promotions?.[0]?.discount_percentage || 0;
    const price = data.price_pkr - (data.price_pkr * disc / 100);

    elements.modalBody.innerHTML = `
        <div class="modal-image-container">
            <img src="${img}" alt="${data.name}" loading="lazy" class="modal-img">
        </div>
        <h2 class="modal-title">${data.name}</h2>
        <p><strong>Category:</strong> ${data.categories?.name || 'Elite'}</p>
        <p><strong>Brand:</strong> ${data.brand || 'Sportify Signature'}</p>
        <p class="modal-desc">${data.description}</p>
        <p><strong>Original Price:</strong> PKR ${data.price_pkr.toLocaleString()}</p>
        ${disc > 0 ? `<p class="discount"><strong>Exclusive Discount:</strong> ${disc}% - Final: PKR ${price.toLocaleString()}</p>` : ''}
        <p><strong>Availability:</strong> ${data.stock_quantity > 0 ? `${data.stock_quantity} in Stock` : 'Limited Edition'}</p>
        <button class="add-btn" onclick="addToCart('${data.id}')" style="width: 100%; margin-bottom: 0.5rem;">Add to Cart</button>
        <button class="order-btn whatsapp-order" onclick="orderViaWhatsApp('${data.name}', ${price})">Order via WhatsApp</button>
        <button class="order-btn instagram-order" onclick="orderViaInstagram('${data.name}', ${price})">Order via Instagram</button>
    `;
    
    elements.productModal.style.display = 'block';
}

function orderViaWhatsApp(name, price) {
    const message = `Greetings Sportify Elite! I'd like to acquire the ${name} for PKR ${price.toLocaleString()}. Please guide me through this legendary purchase.`;
    const whatsappLink = `https://wa.me/923013631261?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
}

function orderViaInstagram(name, price) {
    const instagramLink = `https://www.instagram.com/sportify_cart`;
    window.open(instagramLink, '_blank');
}

function scrollToSection(id) {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
}

async function initApp() {
    if (!supabaseClient) return console.error('Supabase not ready.');
    console.log('Initializing Sportify app...');
    
    if (elements.productsGrid) {
        elements.productsGrid.innerHTML = '<div class="loading">Elevating your gear...</div>';
    }
    
    await loadCategories();
    await loadProducts();
    setupEventListeners();
    updateCartBadge();
    
    console.log('App fully loaded!');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            await signIn(email, password);
        });
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            await signUp(email, password, name);
        });
    }

    if (elements.checkoutForm) {
        elements.checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const formData = {
                name: fd.get('name') || '',
                email: fd.get('email') || '',
                phone: fd.get('phone') || '',
                address: fd.get('address') || '',
                payment: fd.get('payment') || 'Cash on Delivery'
            };
            console.log('Form Data:', formData);
            await placeOrder(formData);
        });
    }

    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    };

    document.querySelectorAll('.close').forEach(btn => {
        btn.onclick = () => {
            btn.closest('.modal').style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    });

    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            scrollToSection(targetId);

            // Close mobile menu after click
            const navMenu = document.querySelector('.nav-menu');
            const hamburger = document.querySelector('.hamburger');
            if (navMenu && hamburger && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                hamburger.classList.remove('open');
            }
        });
    });

    const cartIcon = document.querySelector('.cart-icon');
    if (cartIcon) cartIcon.addEventListener('click', openCartModal);
    if (elements.proceedBtn) elements.proceedBtn.addEventListener('click', proceedToCheckout);

    // Mobile hamburger menu
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            navMenu.classList.toggle('active');
        });
    }

    if (initSupabase()) {
        setTimeout(initApp, 500);
    }
    
    initEmailJS();
});