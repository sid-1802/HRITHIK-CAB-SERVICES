(function () {
  const STORAGE_KEY = 'hrithikCabPhoneNumber';
  const WHATSAPP_KEY = 'hrithikCabWhatsAppNumber';
  const BOOKINGS_KEY = 'hrithikCabBookings';
  const INVOICES_KEY = 'hrithikCabInvoices';
  const INVOICE_ADDRESS_KEY = 'hrithikCabInvoiceAddress';
  const EMAIL_KEY = 'hrithikCabEmail';
  const SERVICES_KEY = 'hrithikCabServices';
  const LOGO_KEY = 'hrithikCabLogoUrl';
  const DEFAULT_PHONE = '+919876543210';
  const DEFAULT_WHATSAPP = '+919876543210';
  const DEFAULT_EMAIL = 'info@hrithikcabservices.com';
  const DEFAULT_INVOICE_ADDRESS = '123, Main Street, City Name, State';
  const DEFAULT_LOGO = 'https://kommodo.ai/i/TV6Tgqh5XAHTZ5oA1Nqf';
  const DEFAULT_SERVICES = [
    {
      title: 'Local City Ride',
      description: 'Quick and dependable rides for daily travel, shopping, and short-distance trips.',
      price: 'Starting from â‚¹199',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80'
    },
    {
      title: 'Airport Transfer',
      description: 'Punctual pickups and drop-offs for flights, terminals, and travel schedules.',
      price: 'Starting from â‚¹899',
      image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80'
    },
    {
      title: 'Outstation Trip',
      description: 'Comfortable long-distance travel for family trips, events, and weekend getaways.',
      price: 'Starting from â‚¹2,499',
      image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=900&q=80'
    },
    {
      title: 'Hourly Rental',
      description: 'Flexible hourly rentals for meetings, sightseeing, and multiple stop travel.',
      price: 'Starting from â‚¹999',
      image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=900&q=80'
    }
  ];

  const ADMIN_EMAIL = 'sidlok1.sl@gmail.com';
  const PROTECTED_PAGES = ['admin.html', 'services.html', 'billing.html'];

  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyC8NsU1zKhlcWCyM5GnbJ34p4Z2t1q-RrY',
    authDomain: 'hrithik-cabs.firebaseapp.com',
    projectId: 'hrithik-cabs',
    storageBucket: 'hrithik-cabs.firebasestorage.app',
    messagingSenderId: '591069481752',
    appId: '1:591069481752:web:dffb67cd1cf5f21f22ac6d',
    measurementId: 'G-PSJ1XDQVK2'
  };

  const FIREBASE_DOC_SETTINGS = 'settings';
  const FIREBASE_DOC_BOOKINGS = 'bookings';
  const FIREBASE_DOC_INVOICES = 'invoices';
  const FIREBASE_DOC_SERVICES = 'services';
  const FIREBASE_DOC_VEHICLES = 'vehicles';
  const FIREBASE_COLLECTION = 'sharedData';

  let db = null;
  let auth = null;
  let remoteServices = null;
  let remoteVehicles = null;
  let remoteBookings = null;
  let remoteInvoices = null;
  let remoteSettings = null;

  async function initFirebase() {
    if (!window.firebase || !window.firebase.firestore) {
      console.warn('Firebase SDK not loaded. Shared sync is disabled.');
      showToast('Firebase SDK not loaded. Sync disabled.');
      return;
    }

    const missingConfig = Object.values(FIREBASE_CONFIG).some((value) => value.includes('YOUR_'));
    if (missingConfig) {
      console.warn('Firebase config is not configured. Shared sync is disabled until Firebase credentials are added.');
      showToast('Firebase config missing. Sync disabled.');
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      db = firebase.firestore();

      if (firebase.auth) {
        auth = firebase.auth();
        await new Promise((resolve, reject) => {
          let unsubscribe = () => {};
          unsubscribe = auth.onAuthStateChanged(
            () => {
              unsubscribe();
              resolve();
            },
            (error) => {
              unsubscribe();
              reject(error);
            }
          );
        });
      }

      console.info('Firebase client initialized.');
      console.info('Firestore read/write access is confirmed only after a successful database operation.');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      showToast('Firebase failed to initialize. Check console.');
      db = null;
    }
  }

  function isFirebaseReady() {
    return db !== null;
  }

  async function saveSharedSettings(settings) {
    // Always include current seal HTML/URL when saving settings so callers don't need to pass them explicitly
    try {
      settings = settings || {};
      if (!settings.hasOwnProperty('sealHtml')) {
        settings.sealHtml = getSealHtml();
      }
      if (!settings.hasOwnProperty('sealUrl')) {
        settings.sealUrl = getSealUrl();
      }
    } catch (err) {
      // ignore
    }

    if (!isFirebaseReady()) return;
    try {
      await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_SETTINGS).set(settings, { merge: true });
      console.info('Shared settings saved to Firebase:', settings);
    } catch (error) {
      console.error('Unable to save shared settings to Firebase:', error);
    }
  }

  async function loadSharedSettings() {
    if (!isFirebaseReady()) return;

    try {
      const doc = await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_SETTINGS).get();
      if (!doc.exists) {
        console.info('Shared settings document does not exist yet.');
        return;
      }

      const data = doc.data() || {};
      console.info('Loaded shared settings from Firebase:', data);
      if (data.phone) setPhoneNumber(data.phone);
      if (data.whatsapp) setWhatsAppNumber(data.whatsapp);
      if (data.logoUrl) setLogoUrl(data.logoUrl);
      if (data.invoiceAddress) setInvoiceAddress(data.invoiceAddress);
      if (data.email) setEmail(data.email);
    } catch (error) {
      console.error('Unable to load shared settings from Firebase:', error);
    }
  }

  async function loadSharedServices() {
    if (!isFirebaseReady()) return;

    try {
      const doc = await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_SERVICES).get();
      if (!doc.exists) {
        console.info('Shared services document does not exist yet.');
        const localServices = readStoredList(SERVICES_KEY, DEFAULT_SERVICES);
        if (localServices.length) {
          await saveServices(localServices);
        }
        return;
      }

      const data = doc.data() || {};
      console.info('Loaded shared services from Firebase:', data);
      if (Array.isArray(data.items)) {
        const localServices = readStoredList(SERVICES_KEY, DEFAULT_SERVICES);
        if (!data.items.length && localServices.length) {
          console.warn('Firebase services are empty; restoring the saved browser copy.');
          await saveServices(localServices);
          return;
        }
        remoteServices = data.items;
        writeStoredList(SERVICES_KEY, data.items);
        renderServices();
        renderHomeServices();
      }
    } catch (error) {
      console.error('Unable to load shared services from Firebase:', error);
      showToast('Services could not load from Firestore. Check Firebase database read permissions.');
    }
  }

  async function loadSharedVehicles() {
    if (!isFirebaseReady()) return;

    try {
      const doc = await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_VEHICLES).get();
      if (!doc.exists) {
        console.info('Shared vehicles document does not exist yet.');
        const localVehicles = readStoredList(VEHICLES_KEY, DEFAULT_VEHICLES);
        if (localVehicles.length) {
          await saveVehicles(localVehicles);
        }
        return;
      }

      const data = doc.data() || {};
      console.info('Loaded shared vehicles from Firebase:', data);
      if (Array.isArray(data.items)) {
        const localVehicles = readStoredList(VEHICLES_KEY, DEFAULT_VEHICLES);
        if (!data.items.length && localVehicles.length) {
          console.warn('Firebase vehicles are empty; restoring the saved browser copy.');
          await saveVehicles(localVehicles);
          return;
        }
        remoteVehicles = data.items;
        writeStoredList(VEHICLES_KEY, data.items);
        renderVehicles();
      }
    } catch (error) {
      console.error('Unable to load shared vehicles from Firebase:', error);
      showToast('Vehicles could not load from Firestore. Check Firebase database read permissions.');
    }
  }

  function listenToSharedSettings() {
    if (!isFirebaseReady()) return;

    db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_SETTINGS)
      .onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data() || {};
        if (data.phone) setPhoneNumber(data.phone);
        if (data.whatsapp) setWhatsAppNumber(data.whatsapp);
        if (data.logoUrl) setLogoUrl(data.logoUrl);
        if (data.invoiceAddress) setInvoiceAddress(data.invoiceAddress);
        if (data.email) setEmail(data.email);
      }, (error) => {
        console.error('Shared settings listener error:', error);
      });
  }

  function listenToSharedServices() {
    if (!isFirebaseReady()) return;

    db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_SERVICES)
      .onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data() || {};
        if (Array.isArray(data.items)) {
          const localServices = readStoredList(SERVICES_KEY, DEFAULT_SERVICES);
          if (!data.items.length && localServices.length) {
            console.warn('Ignoring empty Firebase services snapshot while a browser copy exists.');
            return;
          }
          remoteServices = data.items;
          writeStoredList(SERVICES_KEY, data.items);
          renderServices();
          renderHomeServices();
        }
      }, (error) => {
        console.error('Shared services listener error:', error);
        showToast('Live services sync failed. Check Firebase database read permissions.');
      });
  }

  function listenToSharedVehicles() {
    if (!isFirebaseReady()) return;

    db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_VEHICLES)
      .onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data() || {};
        if (Array.isArray(data.items)) {
          const localVehicles = readStoredList(VEHICLES_KEY, DEFAULT_VEHICLES);
          if (!data.items.length && localVehicles.length) {
            console.warn('Ignoring empty Firebase vehicles snapshot while a browser copy exists.');
            return;
          }
          remoteVehicles = data.items;
          writeStoredList(VEHICLES_KEY, data.items);
          renderVehicles();
        }
      }, (error) => {
        console.error('Shared vehicles listener error:', error);
        showToast('Live vehicle sync failed. Check Firebase database read permissions.');
      });
  }

  function listenToSharedBookings() {
    if (!isFirebaseReady()) return;

    db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_BOOKINGS)
      .onSnapshot((doc) => {
        if (!doc.exists) {
          remoteBookings = [];
          renderBookings();
          return;
        }
        const data = doc.data() || {};
        remoteBookings = normalizeRemoteData(data.items);
        renderBookings();
      }, (error) => {
        console.error('Shared bookings listener error:', error);
      });
  }

  function listenToSharedInvoices() {
    if (!isFirebaseReady()) return;

    db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_INVOICES)
      .onSnapshot((doc) => {
        if (!doc.exists) {
          remoteInvoices = [];
          renderInvoices();
          return;
        }
        const data = doc.data() || {};
        remoteInvoices = normalizeRemoteData(data.items);
        renderInvoices();
      }, (error) => {
        console.error('Shared invoices listener error:', error);
      });
  }

  async function loadSharedBookings() {
    if (!isFirebaseReady()) return;

    try {
      const doc = await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_BOOKINGS).get();
      if (!doc.exists) {
        remoteBookings = [];
        return;
      }

      remoteBookings = normalizeRemoteData(doc.data().items);
    } catch (error) {
      console.error('Unable to load shared bookings from Firebase:', error);
    }
  }

  async function loadSharedInvoices() {
    if (!isFirebaseReady()) return;

    try {
      const doc = await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_INVOICES).get();
      if (!doc.exists) {
        remoteInvoices = [];
        return;
      }

      remoteInvoices = normalizeRemoteData(doc.data().items);
    } catch (error) {
      console.error('Unable to load shared invoices from Firebase:', error);
    }
  }

  function normalizeRemoteData(value) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value;
  }

  function normalizePhone(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) return DEFAULT_PHONE;
    return trimmed.startsWith('tel:') ? trimmed : `tel:${trimmed}`;
  }

  function getPhoneNumber() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_PHONE;
  }

  const SEAL_KEY = 'hrithikCabSealHtml';
  const SEAL_URL_KEY = 'hrithikCabSealUrl';

  function getSealHtml() {
    return localStorage.getItem(SEAL_KEY) || '';
  }

  function setSealHtml(value) {
    const html = (value || '').trim();
    localStorage.setItem(SEAL_KEY, html);
    return html;
  }

  function getSealUrl() {
    return localStorage.getItem(SEAL_URL_KEY) || '';
  }

  function setSealUrl(value) {
    const url = (value || '').trim();
    localStorage.setItem(SEAL_URL_KEY, url);
    return url;
  }

  // Try to extract image src from seal HTML (simple heuristic)
  function extractSealImageSrc(sealHtml) {
    if (!sealHtml) return null;
    const m = sealHtml.match(/<img[^>]+src=["']?([^"' >]+)["']?[^>]*>/i);
    return m ? m[1] : null;
  }

  async function fetchImageAsDataURL(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch image');
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn('Could not fetch seal image for PDF:', err);
      return null;
    }
  }

  function setPhoneNumber(value) {
    const phone = (value || '').trim() || DEFAULT_PHONE;
    localStorage.setItem(STORAGE_KEY, phone);
    updatePhoneLinks(phone);
    return phone;
  }

  function getWhatsAppNumber() {
    return localStorage.getItem(WHATSAPP_KEY) || DEFAULT_WHATSAPP;
  }

  function setWhatsAppNumber(value) {
    const number = (value || '').trim() || DEFAULT_WHATSAPP;
    localStorage.setItem(WHATSAPP_KEY, number);
    updateWhatsAppLinks(number);
    return number;
  }

  function getLogoUrl() {
    return localStorage.getItem(LOGO_KEY) || DEFAULT_LOGO;
  }

  function setLogoUrl(value) {
    const logo = (value || '').trim() || DEFAULT_LOGO;
    localStorage.setItem(LOGO_KEY, logo);
    updateLogo(logo);
    return logo;
  }

  function getInvoiceAddress() {
    return localStorage.getItem(INVOICE_ADDRESS_KEY) || DEFAULT_INVOICE_ADDRESS;
  }

  function setInvoiceAddress(value) {
    const address = (value || '').trim() || DEFAULT_INVOICE_ADDRESS;
    localStorage.setItem(INVOICE_ADDRESS_KEY, address);
    return address;
  }

  function getEmail() {
    return localStorage.getItem(EMAIL_KEY) || DEFAULT_EMAIL;
  }

  function setEmail(value) {
    const email = (value || '').trim() || DEFAULT_EMAIL;
    localStorage.setItem(EMAIL_KEY, email);
    updateEmailLinks(email);
    return email;
  }

  function updateEmailLinks(email) {
    document.querySelectorAll('[data-email-display]').forEach((element) => {
      element.textContent = email;
    });

    document.querySelectorAll('[data-email-href]').forEach((element) => {
      if (element instanceof HTMLAnchorElement) {
        element.href = `mailto:${email}`;
      }
    });
  }

  function hideProtectedNavLinks() {
    const protectedLinks = document.querySelectorAll('.site-nav a[href="admin.html"], .site-nav a[href="services.html"], .site-nav a[href="billing.html"]');
    const isAdmin = isAdminAuthenticated();
    protectedLinks.forEach((link) => {
      link.hidden = !isAdmin;
    });
  }

  function renderAdminLoginLink() {
    const nav = document.querySelector('.site-nav');
    if (!nav || isAdminAuthenticated() || nav.querySelector('.login-link')) return;

    const loginLink = document.createElement('a');
    loginLink.href = 'login.html';
    loginLink.className = 'login-link';
    loginLink.textContent = 'Admin login';
    nav.appendChild(loginLink);
  }

  function renderAdminLogout() {
    if (!isAdminAuthenticated()) return;

    const nav = document.querySelector('.site-nav');
    if (!nav || nav.querySelector('.logout-link')) return;

    const logoutLink = document.createElement('a');
    logoutLink.href = '#';
    logoutLink.className = 'logout-link';
    logoutLink.textContent = 'Logout';
    logoutLink.addEventListener('click', (event) => {
      event.preventDefault();
      logoutAdmin();
    });
    nav.appendChild(logoutLink);
  }

  function initLoginPage() {
    const loginForm = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('adminEmailInput');
    const passwordInput = document.getElementById('adminPasswordInput');
    const errorMessage = document.getElementById('loginError');

    if (isAdminAuthenticated()) {
      const returnUrl = getReturnUrlFromQuery();
      if (!returnUrl.includes('login.html')) {
        window.location.href = returnUrl;
        return;
      }
    }

    if (!loginForm || !emailInput || !passwordInput || !errorMessage) {
      return;
    }

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!auth) {
        errorMessage.textContent = 'Firebase Authentication is unavailable. Please try again later.';
        return;
      }

      try {
        const credential = await auth.signInWithEmailAndPassword(
          emailInput.value.trim(),
          passwordInput.value
        );
        if (!credential.user || !credential.user.email ||
            credential.user.email.toLowerCase() !== ADMIN_EMAIL) {
          await auth.signOut();
          errorMessage.textContent = 'Use the administrator email configured for this site.';
          passwordInput.value = '';
          return;
        }
        if (!credential.user.emailVerified) {
          await credential.user.sendEmailVerification();
          await auth.signOut();
          errorMessage.textContent = 'A verification email was sent. Verify the administrator email, then sign in again.';
          passwordInput.value = '';
          return;
        }
        const returnUrl = getReturnUrlFromQuery();
        window.location.href = returnUrl;
      } catch (error) {
        console.error('Admin Firebase sign-in failed:', error);
        errorMessage.textContent = 'Sign-in failed. Check the email and password, and confirm Email/Password sign-in is enabled in Firebase.';
        passwordInput.value = '';
        passwordInput.focus();
      }
    });
  }

  function isAdminAuthenticated() {
    return Boolean(auth && auth.currentUser && auth.currentUser.email &&
      auth.currentUser.email.toLowerCase() === ADMIN_EMAIL &&
      auth.currentUser.emailVerified);
  }

  function isProtectedPage(pageName) {
    return PROTECTED_PAGES.includes(pageName);
  }

  function getReturnUrlFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get('returnUrl') || 'admin.html';
  }

  function logoutAdmin() {
    if (!auth) {
      window.location.href = 'login.html';
      return;
    }
    auth.signOut()
      .then(() => {
        window.location.href = 'login.html';
      })
      .catch((error) => {
        console.error('Unable to sign out admin:', error);
        showToast('Unable to sign out. Please try again.');
      });
  }

  function updatePhoneLinks(phone) {
    const telHref = normalizePhone(phone);
    document.querySelectorAll('.phone-link').forEach((link) => {
      link.href = telHref;
    });

    document.querySelectorAll('[data-phone-display]').forEach((element) => {
      element.textContent = phone;
    });
  }

  function updateWhatsAppLinks(number) {
    const whatsappHref = `https://wa.me/${number.replace(/[^0-9]/g, '')}`;
    document.querySelectorAll('.whatsapp-link').forEach((link) => {
      link.href = whatsappHref;
    });

    document.querySelectorAll('[data-whatsapp-display]').forEach((element) => {
      element.textContent = number;
    });
  }

  function updateLogo(url) {
    const logoUrl = url || DEFAULT_LOGO;
    document.querySelectorAll('.logo-badge').forEach((image) => {
      if (image instanceof HTMLImageElement) {
        image.src = logoUrl;
        image.alt = 'Hrithik Cab Services logo';
      }
    });
  }

  function showToast(message) {
    const toast = document.getElementById('bookingToast');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => {
      toast.hidden = true;
    }, 2600);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  }

  function buildInvoice() {
    const nameInput = document.getElementById('customerName');
    const phoneInput = document.getElementById('customerPhone');
    const rows = Array.from(document.querySelectorAll('#invoiceItems .invoice-item-row'));

    if (!nameInput || !phoneInput || rows.length === 0) {
      return null;
    }

    const customerName = nameInput.value.trim() || 'Customer';
    const customerPhone = phoneInput.value.trim();
    const invoiceDate = document.getElementById('invoiceDate')?.value || new Date().toISOString().slice(0, 10);
    const pickupLocation = document.getElementById('pickupLocation')?.value.trim() || 'Pickup location not provided';
    const destinationLocation = document.getElementById('destinationLocation')?.value.trim() || 'Destination location not provided';
    const vehicleName = document.getElementById('vehicleName')?.value.trim() || 'Vehicle name not provided';
    const vehicleNumber = document.getElementById('vehicleNumber')?.value.trim() || 'Vehicle number not provided';
    const items = [];

    rows.forEach((row) => {
      const itemName = row.querySelector('input[name="itemName"]')?.value.trim() || '';
      const price = Number(row.querySelector('input[name="itemPrice"]')?.value || 0);
      if (!itemName && price <= 0) return;
      items.push({
        name: itemName || 'Item',
        price,
        total: price
      });
    });

    if (items.length === 0) {
      return null;
    }

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal;

    return {
      customerName,
      customerPhone,
      invoiceDate,
      pickupLocation,
      destinationLocation,
      vehicleName,
      vehicleNumber,
      items,
      subtotal,
      total,
      createdAt: new Date().toLocaleString()
    };
  }

  function renderInvoice(invoice) {
    const preview = document.getElementById('invoicePreview');
    const actions = document.getElementById('invoiceActions');
    if (!preview || !actions) return;

    const invoiceLogo = getLogoUrl();
    const sealHtml = getSealHtml();
    const sealUrl = getSealUrl();
    const lines = [
      `<div class="printable-area">`,
      `  <div class="invoice-content">`,
      `    <div class="invoice-header"><div class="invoice-company"><img src="${invoiceLogo}" alt="Hrithik Cab Services logo" class="invoice-logo" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://kommodo.ai/i/TV6Tgqh5XAHTZ5oA1Nqf';" /><div><h2>Hrithik Cab Services</h2><p>Professional cab invoice</p><p class="invoice-address">Address: ${getInvoiceAddress()}</p></div></div><div class="invoice-meta"><p><strong>Invoice date:</strong> ${formatDate(invoice.invoiceDate)}</p></div></div>`,
      `    <div class="invoice-details"><p><strong>Customer:</strong> ${invoice.customerName}</p><p><strong>Phone:</strong> ${invoice.customerPhone}</p><p><strong>Pickup:</strong> ${invoice.pickupLocation}</p><p><strong>Destination:</strong> ${invoice.destinationLocation}</p><p><strong>Vehicle:</strong> ${invoice.vehicleName}</p><p><strong>Vehicle no:</strong> ${invoice.vehicleNumber}</p></div>`,
      '    <table class="invoice-table">',
      '    <thead><tr><th>#</th><th>Description</th><th>Rate</th><th>Total</th></tr></thead>',
      '    <tbody>'
    ];

    invoice.items.forEach((item, index) => {
      lines.push(
        `      <tr><td>${index + 1}</td><td>${item.name}</td><td>${formatCurrency(item.price)}</td><td>${formatCurrency(item.total)}</td></tr>`
      );
    });

    lines.push('    </tbody></table>');
    lines.push(`    <div class="invoice-summary"><p>Subtotal: ${formatCurrency(invoice.subtotal)}</p><p><strong>Total: ${formatCurrency(invoice.total)}</strong></p></div>`);
    lines.push('    <p class="invoice-note">Thank you for choosing Hrithik Cab Services.</p>');
    lines.push(`    <p class="invoice-contact">Phone: ${getPhoneNumber()} | Email: ${getEmail()}</p>`);
    lines.push('  </div>');

    if (sealUrl) {
      lines.push(`  <div class="invoice-seal"><img src="${sealUrl}" alt="Seal" crossorigin="anonymous" referrerpolicy="no-referrer" /></div>`);
    } else if (sealHtml) {
      lines.push(`  <div class="invoice-seal">${sealHtml}</div>`);
    }

    lines.push('</div>');

    preview.innerHTML = lines.join('\n');
    actions.hidden = false;
    preview.classList.add('printable-area');
    window.currentInvoice = invoice;

    try {
      const printable = preview.querySelector('.printable-area');
      if (printable) {
        if (preview.querySelector('.invoice-seal')) printable.classList.add('has-seal');
        else printable.classList.remove('has-seal');
      }
    } catch (err) {
      // ignore
    }

    try {
      const toggleBtn = document.getElementById('toggleSealBtn');
      if (toggleBtn) {
        const hasSeal = !!preview.querySelector('.invoice-seal');
        toggleBtn.textContent = hasSeal ? 'Hide Seal' : 'Show Seal';
      }
    } catch (err) {
      // ignore
    }
  }

  async function createInvoicePdf(invoice) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const startX = 40;
    let y = 40;

    // Header (tighter sizes to help single-page print)
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Hrithik Cab Services', startX, y);
    y += 18;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Address: ${getInvoiceAddress()}`, startX, y);
    y += 12;
    doc.text('Professional cab invoice', startX, y);
    y += 14;

    // Invoice meta
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text(`Invoice date:`, startX, y);
    doc.setFont(undefined, 'normal');
    doc.text(`${formatDate(invoice.invoiceDate)}`, startX + 80, y);
    y += 14;

    // Customer details box
    doc.setFont(undefined, 'bold');
    doc.text('Customer', startX, y);
    doc.setFont(undefined, 'normal');
    y += 12;
    doc.text(`Name: ${invoice.customerName}`, startX, y);
    y += 10;
    doc.text(`Phone: ${invoice.customerPhone}`, startX, y);
    y += 10;
    doc.text(`Pickup: ${invoice.pickupLocation}`, startX, y);
    y += 10;
    doc.text(`Destination: ${invoice.destinationLocation}`, startX, y);
    y += 10;
    doc.text(`Vehicle: ${invoice.vehicleName} (${invoice.vehicleNumber})`, startX, y);
    y += 14;

    // Table header
    const tableStartX = startX;
    const colDescX = tableStartX;
    const colRateX = 340;
    const colTotalX = 460;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('Description', colDescX, y);
    doc.text('Rate', colRateX, y);
    doc.text('Total', colTotalX, y);
    y += 8;
    doc.setLineWidth(0.5);
    doc.line(tableStartX, y, 540, y);
    y += 10;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    invoice.items.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.name}`, colDescX, y);
      doc.text(formatCurrency(item.price), colRateX, y);
      doc.text(formatCurrency(item.total), colTotalX, y);
      y += 12; // tighter row spacing
      // Avoid adding new page by reducing spacing; if still overflows, allow break to next page
      const pageHeight = doc.internal.pageSize.getHeight();
      if (y > pageHeight - 140) {
        doc.addPage();
        y = 40;
      }
    });

    y += 6;
    doc.line(tableStartX, y, 540, y);
    y += 10;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text(`Subtotal: ${formatCurrency(invoice.subtotal)}`, colTotalX, y);
    y += 12;
    doc.text(`Total: ${formatCurrency(invoice.total)}`, colTotalX, y);
    y += 14;

    doc.setFont(undefined, 'normal');
    const companyPhone = getPhoneNumber();
    doc.setFontSize(9);
    doc.text(`Contact: ${companyPhone} | ${getEmail()}`, startX, y);
    y += 10;

    // Footer note
    doc.setFontSize(9);
    doc.text('Thank you for choosing Hrithik Cab Services.', startX, y);

    // Ensure we have space below for the seal before finishing the page
    try {
      const pageHeight = doc.internal.pageSize.getHeight();
      const sealHeight = 72; // pts
      const reserved = sealHeight + 40; // extra margin
      if (y > pageHeight - reserved) {
        doc.addPage();
        y = 40;
        // re-write small footer on new page
        doc.setFontSize(9);
        doc.text('Thank you for choosing Hrithik Cab Services.', startX, y);
        y += 10;
      }
    } catch (err) {
      // ignore
    }

    // Attempt to embed seal image (prefer seal URL, fallback to HTML <img>)
    try {
      const sealUrl = getSealUrl();
      let sealImgSrc = sealUrl;
      if (!sealImgSrc) {
        const sealHtml = getSealHtml();
        sealImgSrc = extractSealImageSrc(sealHtml);
      }

      if (sealImgSrc) {
        const dataUrl = await fetchImageAsDataURL(sealImgSrc);
        if (dataUrl) {
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const sealWidth = 72; // points - match logo
          const sealHeight = 72;
          const xPos = pageWidth - sealWidth - 24;
          const yPos = pageHeight - sealHeight - 40;
          const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
          let fmt = 'PNG';
          if (m && m[1]) {
            const mime = m[1].toLowerCase();
            if (mime.indexOf('jpeg') >= 0 || mime.indexOf('jpg') >= 0) fmt = 'JPEG';
            else if (mime.indexOf('png') >= 0) fmt = 'PNG';
            else fmt = 'PNG';
          }
          try {
            doc.addImage(dataUrl, fmt, xPos, yPos, sealWidth, sealHeight);
          } catch (err) {
            console.warn('Failed to add seal image to PDF:', err);
          }
        }
      }
    } catch (err) {
      console.warn('Error while embedding seal into PDF:', err);
    }

      // Attempt to embed seal image (if seal contains an <img src="...">)
      try {
        const sealHtml = getSealHtml();
        const sealImgSrc = extractSealImageSrc(sealHtml);
        if (sealImgSrc) {
          const dataUrl = await fetchImageAsDataURL(sealImgSrc);
          if (dataUrl) {
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const sealWidth = 120; // points
            const sealHeight = 120;
            const xPos = pageWidth - sealWidth - 40;
            const yPos = pageHeight - sealHeight - 80;
            const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
            let fmt = 'PNG';
            if (m && m[1]) {
              const mime = m[1].toLowerCase();
              if (mime.indexOf('jpeg') >= 0 || mime.indexOf('jpg') >= 0) fmt = 'JPEG';
              else if (mime.indexOf('png') >= 0) fmt = 'PNG';
              else fmt = 'PNG';
            }
            try {
              doc.addImage(dataUrl, fmt, xPos, yPos, sealWidth, sealHeight);
            } catch (err) {
              console.warn('Failed to add seal image to PDF:', err);
            }
          }
        }
      } catch (err) {
        console.warn('Error while embedding seal into PDF:', err);
      }

      return doc;
    }

  async function shareInvoicePdf(invoice) {
    try {
      const doc = await createInvoicePdfFromPreview(invoice);
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `invoice-${invoice.customerName.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Invoice PDF',
          text: `Invoice for ${invoice.customerName}`
        });
        showToast('Share dialog opened. Choose WhatsApp to send the PDF.');
        return;
      }

      doc.save(file.name);
      showToast('PDF downloaded. Open WhatsApp and share it manually.');
    } catch (error) {
      console.error(error);
      showToast('Unable to create PDF. Please try again.');
    }
  }

  async function createInvoicePdfFromPreview(invoice) {
    const { jsPDF } = window.jspdf;
    try {
      const previewEl = document.getElementById('invoicePreview');
      const printable = previewEl?.querySelector('.printable-area') || previewEl;
      if (!printable) throw new Error('Printable area not found');

      const imgs = Array.from(printable.querySelectorAll('img'));
      await Promise.all(imgs.map(img => new Promise((resolve) => {
        if (img.complete) return resolve();
        img.onload = img.onerror = () => resolve();
      })));

      const canvas = await html2canvas(printable, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const scaleX = pageWidth / imgWidth;
      const scaleY = pageHeight / imgHeight;
      const scale = Math.min(scaleX, scaleY);
      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;
      const x = (pageWidth - drawWidth) / 2;
      const y = (pageHeight - drawHeight) / 2;

      doc.addImage(imgData, 'PNG', x, y, drawWidth, drawHeight);
      return doc;
    } catch (err) {
      console.warn('createInvoicePdfFromPreview failed, falling back to createInvoicePdf text flow:', err);
      return await createInvoicePdf(invoice);
    }
  }

  function getInvoiceWhatsAppUrl(invoice) {
    const customerNumber = invoice.customerPhone.replace(/[^0-9]/g, '');
    const toNumber = customerNumber || getWhatsAppNumber().replace(/[^0-9]/g, '');
    const itemLines = invoice.items
      .map((item, index) => `${index + 1}. ${item.name} - ${formatCurrency(item.total)}`)
      .join('\n');

    const message = `Hrithik Cab Services invoice\nInvoice date: ${invoice.invoiceDate || ''}\nCustomer: ${invoice.customerName}\nPhone: ${invoice.customerPhone}\nPickup: ${invoice.pickupLocation}\nDestination: ${invoice.destinationLocation}\nVehicle: ${invoice.vehicleName}\nVehicle number: ${invoice.vehicleNumber}\n\n${itemLines}\n\nSubtotal: ${formatCurrency(invoice.subtotal)}\nTotal: ${formatCurrency(invoice.total)}\n\nThank you for your business.`;
    return `https://wa.me/${toNumber}?text=${encodeURIComponent(message)}`;
  }

  function addInvoiceItemRow() {
    const container = document.getElementById('invoiceItems');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'invoice-item-row';
    row.innerHTML = `
      <input type="text" name="itemName" placeholder="Item description" />
      <input type="number" name="itemPrice" placeholder="Rate" min="0" value="0" step="0.01" />
      <button type="button" class="remove-item-btn" aria-label="Remove item">Ã—</button>
    `;
    container.appendChild(row);
  }

  function removeInvoiceItemRow(button) {
    const row = button.closest('.invoice-item-row');
    if (row) {
      row.remove();
    }
  }

  async function getInvoices() {
    if (remoteInvoices !== null) {
      return remoteInvoices;
    }

    if (isFirebaseReady()) {
      try {
        const snapshot = await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_INVOICES).get();
        if (snapshot.exists) {
          remoteInvoices = normalizeRemoteData(snapshot.data().items);
          return remoteInvoices;
        }
      } catch (error) {
        console.error('Unable to load invoices from Firebase:', error);
      }
    }

    return [];
  }

  async function saveInvoices(invoices) {
    remoteInvoices = invoices;
    if (isFirebaseReady()) {
      try {
        await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_INVOICES).set({ items: invoices }, { merge: true });
      } catch (error) {
        console.error('Unable to save invoices to Firebase:', error);
      }
    }

    renderInvoices();
  }

  async function renderInvoices() {
    const list = document.getElementById('savedInvoicesList');
    if (!list) return;

    const invoices = await getInvoices();
    if (!invoices.length) {
      list.innerHTML = '<div class="empty-state">No invoices saved yet.</div>';
      return;
    }

    list.innerHTML = '';
    invoices.forEach((invoice, index) => {
      const card = document.createElement('article');
      card.className = 'saved-invoice';
      card.innerHTML = `
        <div class="saved-invoice-top">
          <div>
            <p class="saved-invoice-title">${invoice.customerName || 'Customer'}</p>
            <p class="saved-invoice-meta">Invoice date: ${formatDate(invoice.invoiceDate)}</p>
          </div>
          <div class="saved-invoice-total">${formatCurrency(invoice.total)}</div>
        </div>
        <p class="saved-invoice-route">${invoice.pickupLocation} â†’ ${invoice.destinationLocation}</p>
        <div class="saved-invoice-actions">
          <button type="button" class="button button-secondary" data-edit-invoice="${index}">Edit</button>
          <button type="button" class="button button-secondary" data-delete-invoice="${index}">Delete</button>
        </div>
      `;
      list.appendChild(card);
    });
  }

  function formatDate(value) {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  async function editInvoice(index) {
    const invoices = await getInvoices();
    const invoice = invoices[index];
    if (!invoice) return;
    editingInvoiceIndex = index;
    const dateInput = document.getElementById('invoiceDate');
    const nameInput = document.getElementById('customerName');
    const phoneInput = document.getElementById('customerPhone');
    const pickupInput = document.getElementById('pickupLocation');
    const destinationInput = document.getElementById('destinationLocation');
    const vehicleNameInput = document.getElementById('vehicleName');
    const vehicleNumberInput = document.getElementById('vehicleNumber');

    if (dateInput) dateInput.value = invoice.invoiceDate || '';
    if (nameInput) nameInput.value = invoice.customerName || '';
    if (phoneInput) phoneInput.value = invoice.customerPhone || '';
    if (pickupInput) pickupInput.value = invoice.pickupLocation || '';
    if (destinationInput) destinationInput.value = invoice.destinationLocation || '';
    if (vehicleNameInput) vehicleNameInput.value = invoice.vehicleName || '';
    if (vehicleNumberInput) vehicleNumberInput.value = invoice.vehicleNumber || '';

    const itemsContainer = document.getElementById('invoiceItems');
    if (itemsContainer) {
      itemsContainer.innerHTML = '';
      invoice.items.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'invoice-item-row';
        row.innerHTML = `
          <input type="text" name="itemName" placeholder="Item description" value="${item.name}" />
          <input type="number" name="itemPrice" placeholder="Rate" min="0" value="${item.price}" step="0.01" />
          <button type="button" class="remove-item-btn" aria-label="Remove item">Ã—</button>
        `;
        itemsContainer.appendChild(row);
      });
    }

    renderInvoice(invoice);
    showToast('Loaded invoice for editing. Save to update it.');
  }

  async function deleteInvoice(index) {
    const invoices = await getInvoices();
    invoices.splice(index, 1);
    await saveInvoices(invoices);
    showToast('Invoice deleted.');
  }

  async function saveCurrentInvoice() {
    const invoice = window.currentInvoice || buildInvoice();
    if (!invoice) {
      showToast('Create an invoice before saving.');
      return;
    }

    invoice.savedAt = new Date().toLocaleString();
    invoice.id = invoice.id || `${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

    const invoices = await getInvoices();
    if (editingInvoiceIndex !== null && invoices[editingInvoiceIndex]) {
      invoices[editingInvoiceIndex] = invoice;
      showToast('Invoice updated.');
    } else {
      invoices.unshift(invoice);
      showToast('Invoice saved.');
    }

    await saveInvoices(invoices);
    editingInvoiceIndex = null;
    window.currentInvoice = invoice;
  }

  async function getBookings() {
    if (remoteBookings !== null) {
      return remoteBookings;
    }

    if (isFirebaseReady()) {
      try {
        const snapshot = await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_BOOKINGS).get();
        if (snapshot.exists) {
          remoteBookings = normalizeRemoteData(snapshot.data().items);
          return remoteBookings;
        }
      } catch (error) {
        console.error('Unable to load bookings from Firebase:', error);
      }
    }

    return [];
  }

  async function saveBookings(bookings) {
    remoteBookings = bookings;
    let synced = false;
    if (isFirebaseReady()) {
      try {
        await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_BOOKINGS).set({ items: bookings }, { merge: true });
        synced = true;
      } catch (error) {
        console.error('Unable to save bookings to Firebase:', error);
      }
    }

    renderBookings();
    return synced;
  }

  function readStoredList(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
      console.warn(`Unable to read ${key} from localStorage:`, error);
      return fallback;
    }
  }

  function writeStoredList(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
      return true;
    } catch (error) {
      console.warn(`Unable to write ${key} to localStorage:`, error);
      return false;
    }
  }

  function getServices() {
    if (remoteServices !== null) {
      return remoteServices;
    }

    return readStoredList(SERVICES_KEY, DEFAULT_SERVICES);
  }

  async function saveServices(services) {
    const nextServices = Array.isArray(services) ? services : [];
    remoteServices = nextServices;
    writeStoredList(SERVICES_KEY, nextServices);
    let synced = false;
    if (isFirebaseReady()) {
      try {
        await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_SERVICES).set({ items: nextServices }, { merge: true });
        console.info('Saved services to Firebase:', nextServices);
        synced = true;
      } catch (error) {
        console.error('Unable to save services to Firebase:', error);
      }
    }

    renderServices();
    renderHomeServices();
    return synced;
  }

  // Vehicles storage and rendering (separate from services)
  const VEHICLES_KEY = 'hrithikCabVehicles';
  const DEFAULT_VEHICLES = [];

  function getVehicles() {
    if (remoteVehicles !== null) {
      return remoteVehicles;
    }

    return readStoredList(VEHICLES_KEY, DEFAULT_VEHICLES);
  }

  async function saveVehicles(vehicles) {
    const nextVehicles = Array.isArray(vehicles) ? vehicles : [];
    remoteVehicles = nextVehicles;
    writeStoredList(VEHICLES_KEY, nextVehicles);
    let synced = false;
    if (isFirebaseReady()) {
      try {
        await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_VEHICLES).set({ items: nextVehicles }, { merge: true });
        console.info('Saved vehicles to Firebase:', nextVehicles);
        synced = true;
      } catch (error) {
        console.error('Unable to save vehicles to Firebase:', error);
      }
    }

    renderVehicles();
    return synced;
  }

  function renderVehicles() {
    const list = document.getElementById('vehiclesList');
    if (!list) return;
    const vehicles = getVehicles();
    if (!vehicles.length) {
      list.innerHTML = '<div class="empty-state">No vehicles uploaded yet.</div>';
      return;
    }

    list.innerHTML = '';
    vehicles.forEach((vehicle, index) => {
      const card = document.createElement('article');
      card.className = 'service-card';
      const primary = (vehicle.images && vehicle.images.length) ? vehicle.images[0] : (vehicle.image || '');
      card.innerHTML = `
        <div class="service-media">
          <img src="${primary}" alt="${vehicle.name}" loading="lazy" decoding="async" />
          <div class="vehicle-thumbs">
            ${ (vehicle.images && vehicle.images.length) ? vehicle.images.map((img, i) => `<img class="vehicle-thumb" data-vehicle-index="${index}" data-image-index="${i}" src="${img}" alt="${vehicle.name} thumbnail ${i+1}" loading="lazy" decoding="async" />`).join('') : '' }
          </div>
        </div>
        <div class="service-content">
          <h3>${vehicle.name}</h3>
          <p>${vehicle.description || ''}</p>
          <div class="service-footer">
            <a href="#bookingPanel" class="small-link">Book now</a>
          </div>
          <div class="service-card-actions">
            <button type="button" class="edit-btn" data-edit-vehicle="${index}">Edit</button>
            <button type="button" class="delete-btn" data-delete-vehicle="${index}">Delete</button>
          </div>
        </div>
      `;
      list.appendChild(card);
    });
  }

  // helper: open modal to view full image
  function openImageModal(src) {
    let modal = document.getElementById('imageModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'imageModal';
      modal.className = 'image-modal';
      modal.innerHTML = `<div class="image-modal-inner"><button class="image-modal-close" aria-label="Close">Ã—</button><img src="" alt="Vehicle image" /></div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('image-modal-close')) {
          modal.classList.remove('open');
        }
      });
    }
    const img = modal.querySelector('img');
    img.src = src || '';
    modal.classList.add('open');
  }

  function fillVehicleForm(vehicle, index) {
    const nameEl = document.getElementById('vehicleName');
    const descEl = document.getElementById('vehicleDescription');
    const imagesEl = document.getElementById('vehicleImages');
    const editIndexEl = document.getElementById('vehicleEditIndex');
    if (nameEl) nameEl.value = vehicle.name || '';
    if (descEl) descEl.value = vehicle.description || '';
    if (imagesEl) imagesEl.value = (vehicle.images && vehicle.images.length) ? vehicle.images.join('\n') : (vehicle.image ? vehicle.image : '');
    if (editIndexEl) editIndexEl.value = String(index);
  }

  function resetVehicleForm() {
    const form = document.getElementById('vehicleUploadForm');
    if (form) form.reset();
    const editIndexEl = document.getElementById('vehicleEditIndex');
    if (editIndexEl) editIndexEl.value = '';
  }

  function renderHomeServices() {
    const homeList = document.querySelector('[data-home-services]');
    if (!homeList) return;

    const services = getServices();
    homeList.innerHTML = '';
    services.forEach((service) => {
      const card = document.createElement('article');
      card.className = 'service-card';
      card.innerHTML = `
        <img src="${service.image}" alt="${service.title}" />
        <div class="service-content">
          <h3>${service.title}</h3>
          <p>${service.description}</p>
          <div class="service-footer">
            <span class="price">${service.price}</span>
            <a href="#bookingPanel" class="small-link">Book now</a>
          </div>
        </div>
      `;
      homeList.appendChild(card);
    });
  }

  function renderServices() {
    const list = document.getElementById('servicesList');
    if (!list) return;

    const services = getServices();
    list.innerHTML = '';
    services.forEach((service, index) => {
      const card = document.createElement('article');
      card.className = 'service-card';
      card.innerHTML = `
        <img src="${service.image}" alt="${service.title}" />
        <div class="service-content">
          <h3>${service.title}</h3>
          <p>${service.description}</p>
          <div class="service-footer">
            <span class="price">${service.price}</span>
          </div>
          <div class="service-card-actions">
            <button type="button" class="edit-btn" data-edit-service="${index}">Edit</button>
            <button type="button" class="delete-btn" data-delete-service="${index}">Delete</button>
          </div>
        </div>
      `;
      list.appendChild(card);
    });
  }

  async function renderBookings() {
    const list = document.getElementById('savedBookingsList');
    if (!list) return;

    const bookings = await getBookings();
    if (!bookings.length) {
      list.innerHTML = '<div class="empty-state">No bookings saved yet.</div>';
      return;
    }

    list.innerHTML = '';
    bookings.forEach((booking, index) => {
      const card = document.createElement('article');
      card.className = 'saved-booking';
      const statusText = booking.confirmed ? 'Confirmed' : 'Pending';
      card.innerHTML = `
        <p><strong>${booking.name || 'Customer'}</strong></p>
        <p>${booking.service || 'General booking'}</p>
        <p>Pickup: ${booking.pickup || 'Not added'}</p>
        <p>Destination: ${booking.destination || 'Not added'}</p>
        <p>Status: <span class="booking-status ${booking.confirmed ? 'confirmed' : 'pending'}">${statusText}</span></p>
        <div class="saved-booking-actions">
          <button type="button" class="call-btn" data-call-booking="${index}">Call now</button>
          <button type="button" class="confirm-btn" data-confirm-booking="${index}">${booking.confirmed ? 'Confirmed' : 'Confirm'}</button>
          <button type="button" class="delete-btn" data-delete-booking="${index}">Remove</button>
        </div>
      `;
      list.appendChild(card);
    });
  }

  async function addBooking(formData) {
    const booking = {
      name: formData.get('name') || 'Customer',
      phone: formData.get('phone') || '',
      pickup: formData.get('pickup') || '',
      destination: formData.get('destination') || '',
      service: formData.get('service') || 'General booking',
      confirmed: false,
      createdAt: new Date().toLocaleString(),
      id: `${Date.now()}.${Math.random().toString(36).slice(2, 8)}`
    };

    const bookings = await getBookings();
    bookings.unshift(booking);
    const synced = await saveBookings(bookings);
    showToast(synced
      ? `Saved ${booking.service} for ${booking.name}.`
      : 'Booking could not be sent to the office. Please call us directly.');
  }

  async function callBooking(index) {
    const bookings = await getBookings();
    const booking = bookings[index];
    if (!booking) return;
    const phoneNumber = booking.phone || getPhoneNumber();
    const telHref = normalizePhone(phoneNumber);
    window.location.href = telHref;
    showToast(`Calling ${booking.name || 'the customer'} now.`);
  }

  async function removeBooking(index) {
    const bookings = await getBookings();
    bookings.splice(index, 1);
    await saveBookings(bookings);
    showToast('Booking removed.');
  }

  async function confirmBooking(index) {
    const bookings = await getBookings();
    if (!bookings[index]) return;
    bookings[index].confirmed = true;
    await saveBookings(bookings);
    showToast('Booking confirmed.');
  }

  let editingInvoiceIndex = null;
  let editingServiceIndex = null;

  function fillServiceForm(service, index) {
    editingServiceIndex = index;
    const titleInput = document.getElementById('serviceTitle');
    const descInput = document.getElementById('serviceDescription');
    const priceInput = document.getElementById('servicePrice');
    const imageInput = document.getElementById('serviceImage');
    if (titleInput) titleInput.value = service.title || '';
    if (descInput) descInput.value = service.description || '';
    if (priceInput) priceInput.value = service.price || '';
    if (imageInput) imageInput.value = service.image || '';
  }

  function resetServiceForm() {
    editingServiceIndex = null;
    const titleInput = document.getElementById('serviceTitle');
    const descInput = document.getElementById('serviceDescription');
    const priceInput = document.getElementById('servicePrice');
    const imageInput = document.getElementById('serviceImage');
    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    if (priceInput) priceInput.value = '';
    if (imageInput) imageInput.value = '';
  }

  function focusServiceForm() {
    resetServiceForm();
    const titleInput = document.getElementById('serviceTitle');
    if (titleInput) {
      titleInput.focus();
      titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = window.location.pathname.split('/').pop();
    await initFirebase();
    hideProtectedNavLinks();
    renderAdminLoginLink();

    if (currentPage === 'login.html') {
      initLoginPage();
      return;
    }

    if (isProtectedPage(currentPage) && !isAdminAuthenticated()) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `login.html?returnUrl=${returnUrl}`;
      return;
    }

    if (isAdminAuthenticated()) {
      renderAdminLogout();
    }

    const phone = getPhoneNumber();
    const whatsapp = getWhatsAppNumber();
    const logoUrl = getLogoUrl();
    updatePhoneLinks(phone);
    updateWhatsAppLinks(whatsapp);
    updateLogo(logoUrl);

    if (isFirebaseReady()) {
      listenToSharedSettings();
      listenToSharedServices();
      listenToSharedVehicles();
      await loadSharedSettings();
      await loadSharedServices();
      await loadSharedVehicles();
      renderServices();
      renderHomeServices();
      renderVehicles();
      if (isAdminAuthenticated()) {
        listenToSharedBookings();
        listenToSharedInvoices();
        await loadSharedBookings();
        await loadSharedInvoices();
        await renderBookings();
        await renderInvoices();
      }
    } else {
      renderServices();
      renderHomeServices();
      renderVehicles();
      if (isAdminAuthenticated()) {
        renderInvoices();
        renderBookings().catch((error) => console.error(error));
      }
    }

    if (document.getElementById('savedBookingsList')) {
      setInterval(() => {
        renderBookings().catch((error) => console.error(error));
      }, 10000);
    }

    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
      bookingForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(bookingForm);
        await addBooking(formData);
        bookingForm.reset();
      });
    }

    const clearButton = document.getElementById('clearBookingForm');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        if (bookingForm) bookingForm.reset();
      });
    }

    const addInvoiceItemButton = document.getElementById('addInvoiceItem');
    const invoiceItems = document.getElementById('invoiceItems');
    const generateInvoiceButton = document.getElementById('generateInvoiceBtn');
    const sendWhatsappButton = document.getElementById('sendWhatsappBtn');
    const printInvoiceButton = document.getElementById('printInvoiceBtn');

    if (addInvoiceItemButton) {
      addInvoiceItemButton.addEventListener('click', addInvoiceItemRow);
    }

    if (invoiceItems) {
      invoiceItems.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.classList.contains('remove-item-btn')) {
          removeInvoiceItemRow(target);
        }
      });
    }

    const saveInvoiceButton = document.getElementById('saveInvoiceBtn');
    const savedInvoicesList = document.getElementById('savedInvoicesList');

    if (generateInvoiceButton) {
      generateInvoiceButton.addEventListener('click', () => {
        const invoice = buildInvoice();
        if (!invoice) {
          showToast('Please add at least one item with quantity and rate.');
          return;
        }
        renderInvoice(invoice);
      });
    }

    if (saveInvoiceButton) {
      saveInvoiceButton.addEventListener('click', saveCurrentInvoice);
    }

    if (savedInvoicesList) {
      savedInvoicesList.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const editIndex = target.getAttribute('data-edit-invoice');
        const deleteIndex = target.getAttribute('data-delete-invoice');
        if (editIndex !== null) {
          editInvoice(Number(editIndex));
          return;
        }
        if (deleteIndex !== null) {
          deleteInvoice(Number(deleteIndex));
        }
      });
    }

    const sharePdfButton = document.getElementById('sharePdfBtn');

    if (sendWhatsappButton) {
      sendWhatsappButton.addEventListener('click', () => {
        const invoice = window.currentInvoice;
        if (!invoice) {
          showToast('Generate the invoice before sending.');
          return;
        }
        const url = getInvoiceWhatsAppUrl(invoice);
        window.open(url, '_blank');
      });
    }

    if (sharePdfButton) {
      sharePdfButton.addEventListener('click', async () => {
        const invoice = window.currentInvoice;
        if (!invoice) {
          showToast('Generate the invoice before sharing.');
          return;
        }
        await shareInvoicePdf(invoice);
      });
    }

    if (printInvoiceButton) {
      printInvoiceButton.addEventListener('click', () => {
        // Scale printable area to fit a single A4 page when possible (width+height aware)
        const preview = document.getElementById('invoicePreview');
        const printable = preview?.querySelector('.printable-area') || preview;
        if (!printable) { window.print(); return; }

        // Clear previous transform
        printable.style.transform = '';
        printable.style.width = '';

        // Page dimensions in CSS px (approx @96dpi)
        const a4WidthPx = 8.27 * 96; // ~794px
        const a4HeightPx = 11.69 * 96; // ~1122px
        // Subtract margins (in px). Using small margins to maximize space.
        const marginPxW = 24; // left+right margin total estimate
        const marginPxH = 80; // top+bottom (header/footer & printer margins)

        const pageAvailableW = Math.max(400, a4WidthPx - marginPxW);
        const pageAvailableH = Math.max(400, a4HeightPx - marginPxH);

        // Measure content size
        const contentWidth = printable.scrollWidth;
        const contentHeight = printable.scrollHeight;

        // Compute scale to fit both width and height using bounding rect
        const rect = printable.getBoundingClientRect();
        const contentW = rect.width || contentWidth;
        const contentH = rect.height || contentHeight;

        let scaleW = pageAvailableW / contentW;
        let scaleH = pageAvailableH / contentH;
        let scale = Math.min(scaleW, scaleH, 1);

        // Allow more aggressive scaling if necessary, but keep legible
        const MIN_SCALE = 0.35;
        if (scale < MIN_SCALE) scale = MIN_SCALE;

        if (scale < 0.995) {
          printable.style.transformOrigin = 'top left';
          printable.style.transform = `scale(${scale})`;
          // Do NOT change width â€” transform alone should handle fitting
        }

        // Clean up after print
        const cleanup = () => {
          printable.style.transform = '';
          printable.style.width = '';
          window.removeEventListener('afterprint', cleanup);
          setTimeout(() => {
            printable.style.transform = '';
            printable.style.width = '';
          }, 300);
        };

        window.addEventListener('afterprint', cleanup);

        // Trigger print
        window.print();
      });
    }

    // Toggle seal via delegated click handler â€” works even if the button is added dynamically
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.id !== 'toggleSealBtn') return;

      const toggleBtn = target;
      const preview = document.getElementById('invoicePreview');
      if (!preview) return;
      const existing = preview.querySelector('.invoice-seal');
      if (existing) {
        existing.remove();
        const printable = preview.querySelector('.printable-area') || preview;
        if (printable) printable.classList.remove('has-seal');
        toggleBtn.textContent = 'Show Seal';
        return;
      }

      const sealUrl = getSealUrl();
      const sealHtml = getSealHtml();
      if (!sealUrl && !sealHtml) {
        showToast('No seal saved in Admin settings.');
        return;
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'invoice-seal';
      if (sealUrl) {
        const img = document.createElement('img');
        img.src = sealUrl;
        img.alt = 'Seal';
        wrapper.appendChild(img);
      } else {
        wrapper.innerHTML = sealHtml;
      }

      const printable = preview.querySelector('.printable-area') || preview;
      printable.appendChild(wrapper);
      if (printable) printable.classList.add('has-seal');
      toggleBtn.textContent = 'Hide Seal';
    });

    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) {
      serviceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const title = document.getElementById('serviceTitle').value.trim();
        const description = document.getElementById('serviceDescription').value.trim();
        const price = document.getElementById('servicePrice').value.trim();
        const image = document.getElementById('serviceImage').value.trim();

        if (!title || !description || !price || !image) {
          showToast('Please fill in all service fields.');
          return;
        }

        const services = getServices();
        const service = { title, description, price, image };
        const wasEditing = editingServiceIndex !== null;

        if (wasEditing) {
          services[editingServiceIndex] = service;
        } else {
          services.push(service);
        }

        const synced = await saveServices(services);
        showToast(synced
          ? (wasEditing ? 'Service updated and synced for all visitors.' : 'Service added and synced for all visitors.')
          : 'Saved only in this browser. Firestore sync failed or is unavailable; customers on other devices will not see this service.');
        resetServiceForm();
      });
    }

    // Admin: seal save/reset wiring (HTML and URL)
    const adminSealInput = document.getElementById('admin-seal-input');
    const saveSealBtn = document.getElementById('save-seal-btn');
    const resetSealBtn = document.getElementById('reset-seal-btn');

    const adminSealUrlInput = document.getElementById('admin-seal-url-input');
    const saveSealUrlBtn = document.getElementById('save-seal-url-btn');
    const resetSealUrlBtn = document.getElementById('reset-seal-url-btn');

    const sealStatus = document.getElementById('seal-status');

    if (adminSealInput) adminSealInput.value = getSealHtml();
    if (adminSealUrlInput) adminSealUrlInput.value = getSealUrl();
    if (sealStatus) {
      const url = getSealUrl();
      const html = getSealHtml();
      if (url) sealStatus.textContent = `Current seal: URL (${url})`;
      else if (html) sealStatus.textContent = 'Current seal: saved (HTML)';
      else sealStatus.textContent = 'Current seal: (not set)';
    }

    if (saveSealBtn && adminSealInput) {
      saveSealBtn.addEventListener('click', async () => {
        const html = adminSealInput.value || '';
        setSealHtml(html);
        // clear URL when HTML provided (user preference)
        if (adminSealUrlInput && adminSealUrlInput.value) {
          adminSealUrlInput.value = '';
          setSealUrl('');
        }
        if (sealStatus) sealStatus.textContent = html ? 'Current seal: saved (HTML)' : 'Current seal: (not set)';
        showToast('Seal HTML saved.');
        try { await saveSharedSettings({ sealHtml: getSealHtml(), sealUrl: getSealUrl() }); } catch (err) { /* ignore */ }
      });
    }

    if (resetSealBtn && adminSealInput) {
      resetSealBtn.addEventListener('click', async () => {
        setSealHtml('');
        if (adminSealInput) adminSealInput.value = '';
        if (sealStatus) sealStatus.textContent = 'Current seal: (not set)';
        showToast('Seal HTML reset.');
        try { await saveSharedSettings({ sealHtml: '', sealUrl: getSealUrl() }); } catch (err) { /* ignore */ }
      });
    }

    if (saveSealUrlBtn && adminSealUrlInput) {
      saveSealUrlBtn.addEventListener('click', async () => {
        const url = adminSealUrlInput.value || '';
        setSealUrl(url);
        // clear HTML when URL provided (prefer URL)
        if (adminSealInput && adminSealInput.value) {
          adminSealInput.value = '';
          setSealHtml('');
        }
        if (sealStatus) sealStatus.textContent = url ? `Current seal: URL (${url})` : 'Current seal: (not set)';
        showToast('Seal URL saved.');
        try { await saveSharedSettings({ sealHtml: getSealHtml(), sealUrl: getSealUrl() }); } catch (err) { /* ignore */ }
      });
    }

    if (resetSealUrlBtn && adminSealUrlInput) {
      resetSealUrlBtn.addEventListener('click', async () => {
        setSealUrl('');
        if (adminSealUrlInput) adminSealUrlInput.value = '';
        if (sealStatus) sealStatus.textContent = 'Current seal: (not set)';
        showToast('Seal URL reset.');
        try { await saveSharedSettings({ sealHtml: getSealHtml(), sealUrl: '' }); } catch (err) { /* ignore */ }
      });
    }

    // helper: read a File to dataURL
    function readFileAsDataURL(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }

    // helper: upload files (array of {name, data}) to server /api/upload which accepts JSON { files: [{name, data}] }
    async function uploadFilesToServer(filesPayload) {
      try {
        const resp = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: filesPayload })
        });
        if (!resp.ok) throw new Error(`Upload endpoint returned HTTP ${resp.status}`);
        const data = await resp.json();
        if (data.ok !== true || !Array.isArray(data.urls) || data.urls.length === 0) {
          throw new Error('Upload endpoint did not return image URLs.');
        }
        return data.urls;
      } catch (err) {
        console.error('Upload error', err);
        showToast('Image files need an active upload server. On GitHub Pages, use hosted image URLs instead.');
        return [];
      }
    }

    const vehicleUploadForm = document.getElementById('vehicleUploadForm');
    if (vehicleUploadForm) {
      vehicleUploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = document.getElementById('vehicleName').value.trim();
        const description = document.getElementById('vehicleDescription').value.trim();
        const imagesRaw = document.getElementById('vehicleImages').value.trim();
        const fileInput = document.getElementById('vehicleFiles');
        const editIndex = document.getElementById('vehicleEditIndex').value;

        // collect URLs from textarea
        const imagesFromTextarea = imagesRaw ? imagesRaw.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [];

        // upload selected files (if any)
        let uploadedUrls = [];
        if (fileInput && fileInput.files && fileInput.files.length) {
          const files = Array.from(fileInput.files);
          const payload = [];
          for (const f of files) {
            try {
              const dataUrl = await readFileAsDataURL(f);
              payload.push({ name: f.name, data: dataUrl });
            } catch (err) {
              console.error('Read file error', err);
            }
          }
          if (payload.length) {
            uploadedUrls = await uploadFilesToServer(payload);
          }
        }

        const finalImages = [...uploadedUrls, ...imagesFromTextarea];

        if (!name || !finalImages.length) {
          showToast('Please enter a vehicle name and at least one image (file or URL).');
          return;
        }

        const vehicles = getVehicles();
        const vehicleObj = { name, description, images: finalImages };
        if (editIndex) {
          vehicles[Number(editIndex)] = vehicleObj;
        } else {
          vehicles.push(vehicleObj);
        }

        const synced = await saveVehicles(vehicles);
        showToast(synced
          ? (editIndex ? 'Vehicle updated and synced for all visitors.' : 'Vehicle uploaded and synced for all visitors.')
          : 'Saved only in this browser. Firestore sync failed or is unavailable; customers on other devices will not see this vehicle.');
        resetVehicleForm();
      });

      // wire cancel edit button
      const cancelVehicleEdit = document.getElementById('cancelVehicleEdit');
      if (cancelVehicleEdit) cancelVehicleEdit.addEventListener('click', resetVehicleForm);
    }

    const cancelServiceEditButton = document.getElementById('cancelServiceEdit');
    if (cancelServiceEditButton) {
      cancelServiceEditButton.addEventListener('click', resetServiceForm);
    }

    const addServiceButton = document.getElementById('addServiceBtn');
    if (addServiceButton) {
      addServiceButton.addEventListener('click', focusServiceForm);
    }

    const servicesList = document.getElementById('servicesList');
    if (servicesList) {
      servicesList.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const editIndex = target.getAttribute('data-edit-service');
        if (editIndex !== null) {
          const services = getServices();
          fillServiceForm(services[Number(editIndex)], Number(editIndex));
          return;
        }

        const deleteIndex = target.getAttribute('data-delete-service');
        if (deleteIndex !== null) {
          const services = getServices();
          services.splice(Number(deleteIndex), 1);
          saveServices(services).then((synced) => {
            showToast(synced
              ? 'Service deleted and synced for all visitors.'
              : 'Deleted only in this browser. Firestore sync failed or is unavailable.');
          });
        }
      });
    }

    const vehiclesListElement = document.getElementById('vehiclesList');
    if (vehiclesListElement) {
      vehiclesListElement.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

          const editIndex = target.getAttribute('data-edit-vehicle');
          if (editIndex !== null) {
          const vehicles = getVehicles();
            fillVehicleForm(vehicles[Number(editIndex)], Number(editIndex));
            return;
          }

          const deleteIndex = target.getAttribute('data-delete-vehicle');
          if (deleteIndex !== null) {
            const vehicles = getVehicles();
            vehicles.splice(Number(deleteIndex), 1);
            const synced = await saveVehicles(vehicles);
            showToast(synced
              ? 'Vehicle removed and synced for all visitors.'
              : 'Removed only in this browser. Firestore sync failed or is unavailable.');
            return;
          }

          const imgVehicleIndex = target.getAttribute('data-vehicle-index');
          const imgIndex = target.getAttribute('data-image-index');
          if (imgVehicleIndex !== null && imgIndex !== null) {
            const vehicles = getVehicles();
            const v = vehicles[Number(imgVehicleIndex)];
            const imgUrl = (v && v.images && v.images.length) ? v.images[Number(imgIndex)] : (v.image || '');
            if (imgUrl) openImageModal(imgUrl);
            return;
          }
        });
      }

    const bookingsList = document.getElementById('savedBookingsList');
    if (bookingsList) {
      bookingsList.addEventListener('click', (event) => {
        const target = event.target;
        if (target instanceof HTMLElement) {
          const callIndex = target.getAttribute('data-call-booking');
          if (callIndex !== null) {
            callBooking(Number(callIndex));
            return;
          }

          const confirmIndex = target.getAttribute('data-confirm-booking');
          if (confirmIndex !== null) {
            confirmBooking(Number(confirmIndex));
            return;
          }

          const deleteIndex = target.getAttribute('data-delete-booking');
          if (deleteIndex !== null) {
            removeBooking(Number(deleteIndex));
          }
        }
      });
    }

    const input = document.querySelector('#admin-phone-input');
    const saveButton = document.querySelector('#save-phone-btn');
    const resetButton = document.querySelector('#reset-phone-btn');
    const status = document.querySelector('#phone-status');
    const whatsappInput = document.querySelector('#admin-whatsapp-input');
    const saveWhatsAppButton = document.querySelector('#save-whatsapp-btn');
    const resetWhatsAppButton = document.querySelector('#reset-whatsapp-btn');
    const whatsappStatus = document.querySelector('#whatsapp-status');
    const emailInput = document.querySelector('#admin-email-input');
    const saveEmailButton = document.querySelector('#save-email-btn');
    const resetEmailButton = document.querySelector('#reset-email-btn');
    const emailStatus = document.querySelector('#email-status');
    const invoiceAddressInput = document.querySelector('#admin-invoice-address-input');
    const saveInvoiceAddressButton = document.querySelector('#save-invoice-address-btn');
    const resetInvoiceAddressButton = document.querySelector('#reset-invoice-address-btn');
    const invoiceAddressStatus = document.querySelector('#invoice-address-status');
    const logoInput = document.querySelector('#admin-logo-input');
    const saveLogoButton = document.querySelector('#save-logo-btn');
    const resetLogoButton = document.querySelector('#reset-logo-btn');
    const logoStatus = document.querySelector('#logo-status');

    if (input) {
      input.value = phone;
    }

    if (emailInput) {
      emailInput.value = getEmail();
    }
    if (emailStatus) {
      emailStatus.textContent = `Current email: ${getEmail()}`;
    }

    if (saveButton) {
      saveButton.addEventListener('click', () => {
        const nextPhone = setPhoneNumber(input ? input.value : '');
        if (status) {
          status.textContent = `Phone number updated to ${nextPhone}`;
        }
        saveSharedSettings({
          phone: nextPhone,
          whatsapp: getWhatsAppNumber(),
          logoUrl: getLogoUrl(),
          invoiceAddress: getInvoiceAddress(),
          email: getEmail()
        }).catch((error) => console.error(error));
      });
    }

    if (resetButton) {
      resetButton.addEventListener('click', () => {
        const nextPhone = setPhoneNumber(DEFAULT_PHONE);
        if (input) input.value = nextPhone;
        if (status) {
          status.textContent = `Phone number reset to ${nextPhone}`;
        }
        saveSharedSettings({
          phone: nextPhone,
          whatsapp: getWhatsAppNumber(),
          logoUrl: getLogoUrl(),
          invoiceAddress: getInvoiceAddress(),
          email: getEmail()
        }).catch((error) => console.error(error));
      });
    }

    if (whatsappInput) {
      whatsappInput.value = whatsapp;
    }

    const currentInvoiceAddress = getInvoiceAddress();
    if (invoiceAddressInput) {
      invoiceAddressInput.value = currentInvoiceAddress;
    }
    if (invoiceAddressStatus) {
      invoiceAddressStatus.textContent = `Current invoice address: ${currentInvoiceAddress}`;
    }

    if (saveWhatsAppButton) {
      saveWhatsAppButton.addEventListener('click', () => {
        const nextNumber = setWhatsAppNumber(whatsappInput ? whatsappInput.value : '');
        if (whatsappStatus) {
          whatsappStatus.textContent = `Current WhatsApp: ${nextNumber}`;
        }
        saveSharedSettings({
          phone: getPhoneNumber(),
          whatsapp: nextNumber,
          logoUrl: getLogoUrl(),
          invoiceAddress: getInvoiceAddress(),
          email: getEmail()
        }).catch((error) => console.error(error));
      });
    }

    if (saveEmailButton) {
      saveEmailButton.addEventListener('click', () => {
        const nextEmail = setEmail(emailInput ? emailInput.value : '');
        if (emailStatus) {
          emailStatus.textContent = `Current email: ${nextEmail}`;
        }
        showToast('Support email updated.');
        saveSharedSettings({
          phone: getPhoneNumber(),
          whatsapp: getWhatsAppNumber(),
          logoUrl: getLogoUrl(),
          invoiceAddress: getInvoiceAddress(),
          email: nextEmail
        }).catch((error) => console.error(error));
      });
    }

    if (saveInvoiceAddressButton) {
      saveInvoiceAddressButton.addEventListener('click', () => {
        const nextAddress = setInvoiceAddress(invoiceAddressInput ? invoiceAddressInput.value : '');
        if (invoiceAddressStatus) {
          invoiceAddressStatus.textContent = `Current invoice address: ${nextAddress}`;
        }
        showToast('Invoice address updated.');
        saveSharedSettings({
          phone: getPhoneNumber(),
          whatsapp: getWhatsAppNumber(),
          logoUrl: getLogoUrl(),
          invoiceAddress: nextAddress,
          email: getEmail()
        }).catch((error) => console.error(error));
      });
    }

    if (resetEmailButton) {
      resetEmailButton.addEventListener('click', () => {
        const nextEmail = setEmail(DEFAULT_EMAIL);
        if (emailInput) emailInput.value = nextEmail;
        if (emailStatus) {
          emailStatus.textContent = `Current email: ${nextEmail}`;
        }
        showToast('Support email reset.');
        saveSharedSettings({
          phone: getPhoneNumber(),
          whatsapp: getWhatsAppNumber(),
          logoUrl: getLogoUrl(),
          invoiceAddress: getInvoiceAddress(),
          email: nextEmail
        }).catch((error) => console.error(error));
      });
    }

    if (resetInvoiceAddressButton) {
      resetInvoiceAddressButton.addEventListener('click', () => {
        const nextAddress = setInvoiceAddress(DEFAULT_INVOICE_ADDRESS);
        if (invoiceAddressInput) invoiceAddressInput.value = nextAddress;
        if (invoiceAddressStatus) {
          invoiceAddressStatus.textContent = `Current invoice address: ${nextAddress}`;
        }
        showToast('Invoice address reset.');
        saveSharedSettings({
          phone: getPhoneNumber(),
          whatsapp: getWhatsAppNumber(),
          logoUrl: getLogoUrl(),
          invoiceAddress: nextAddress,
          email: getEmail()
        }).catch((error) => console.error(error));
      });
    }

    if (resetWhatsAppButton) {
      resetWhatsAppButton.addEventListener('click', () => {
        const nextNumber = setWhatsAppNumber(DEFAULT_WHATSAPP);
        if (whatsappInput) whatsappInput.value = nextNumber;
        if (whatsappStatus) {
          whatsappStatus.textContent = `Current WhatsApp: ${nextNumber}`;
        }
      });
    }

    if (logoInput) {
      logoInput.value = getLogoUrl();
    }

    updateEmailLinks(getEmail());

    if (saveLogoButton) {
      saveLogoButton.addEventListener('click', () => {
        const nextLogo = setLogoUrl(logoInput ? logoInput.value : '');
        if (logoStatus) {
          logoStatus.textContent = `Current logo URL: ${nextLogo}`;
        }
        showToast('Logo updated.');
        saveSharedSettings({
          phone: getPhoneNumber(),
          whatsapp: getWhatsAppNumber(),
          logoUrl: nextLogo,
          invoiceAddress: getInvoiceAddress(),
          email: getEmail()
        }).catch((error) => console.error(error));
      });
    }

    if (resetLogoButton) {
      resetLogoButton.addEventListener('click', () => {
        const nextLogo = setLogoUrl(DEFAULT_LOGO);
        if (logoInput) logoInput.value = nextLogo;
        if (logoStatus) {
          logoStatus.textContent = `Current logo URL: ${nextLogo}`;
        }
        showToast('Logo reset.');
        saveSharedSettings({
          phone: getPhoneNumber(),
          whatsapp: getWhatsAppNumber(),
          logoUrl: nextLogo,
          invoiceAddress: getInvoiceAddress(),
          email: getEmail()
        }).catch((error) => console.error(error));
      });
    }
  });

  window.HrithikCabPhone = {
    getPhoneNumber,
    setPhoneNumber,
    getWhatsAppNumber,
    setWhatsAppNumber,
    updatePhoneLinks,
    updateWhatsAppLinks,
    isAdminAuthenticated,
    logoutAdmin
  };
  // Expose global aliases so older or cached pages that call global functions still work
  window.isAdminAuthenticated = isAdminAuthenticated;
  window.logoutAdmin = logoutAdmin;
})();
