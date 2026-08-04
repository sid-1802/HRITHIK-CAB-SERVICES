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
      price: 'Starting from ₹199',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80'
    },
    {
      title: 'Airport Transfer',
      description: 'Punctual pickups and drop-offs for flights, terminals, and travel schedules.',
      price: 'Starting from ₹899',
      image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80'
    },
    {
      title: 'Outstation Trip',
      description: 'Comfortable long-distance travel for family trips, events, and weekend getaways.',
      price: 'Starting from ₹2,499',
      image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=900&q=80'
    },
    {
      title: 'Hourly Rental',
      description: 'Flexible hourly rentals for meetings, sightseeing, and multiple stop travel.',
      price: 'Starting from ₹999',
      image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=900&q=80'
    }
  ];

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

  function initFirebase() {
    if (!window.firebase || !window.firebase.firestore) {
      console.warn('Firebase SDK not loaded. Shared sync is disabled.');
      return;
    }

    const missingConfig = Object.values(FIREBASE_CONFIG).some((value) => value.includes('YOUR_'));
    if (missingConfig) {
      console.warn('Firebase config is not configured. Shared sync is disabled until Firebase credentials are added.');
      return;
    }

    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
      console.info('Firebase initialized. Shared data sync enabled.');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      db = null;
    }
  }

  function isFirebaseReady() {
    return db !== null;
  }

  async function saveSharedSettings(settings) {
    if (!isFirebaseReady()) return;
    try {
      await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_SETTINGS).set(settings, { merge: true });
    } catch (error) {
      console.error('Unable to save shared settings to Firebase:', error);
    }
  }

  async function loadSharedSettings() {
    if (!isFirebaseReady()) return;

    try {
      const doc = await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_SETTINGS).get();
      if (!doc.exists) return;

      const data = doc.data() || {};
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
      if (!doc.exists) return;

      const data = doc.data() || {};
      if (Array.isArray(data.items) && data.items.length) {
        localStorage.setItem(SERVICES_KEY, JSON.stringify(data.items));
        renderServices();
        renderHomeServices();
      }
    } catch (error) {
      console.error('Unable to load shared services from Firebase:', error);
    }
  }

  async function loadSharedVehicles() {
    if (!isFirebaseReady()) return;

    try {
      const doc = await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_VEHICLES).get();
      if (!doc.exists) return;

      const data = doc.data() || {};
      if (Array.isArray(data.items) && data.items.length) {
        localStorage.setItem(VEHICLES_KEY, JSON.stringify(data.items));
        renderVehicles();
      }
    } catch (error) {
      console.error('Unable to load shared vehicles from Firebase:', error);
    }
  }

  async function normalizeRemoteData(value) {
    if (!Array.isArray(value)) return [];
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
    const lines = [
      `<div class="printable-area">`,
      `<div class="invoice-header"><div class="invoice-company"><img src="${invoiceLogo}" alt="Hrithik Cab Services logo" class="invoice-logo" onerror="this.onerror=null;this.src='https://kommodo.ai/i/TV6Tgqh5XAHTZ5oA1Nqf';" /><div><h2>Hrithik Cab Services</h2><p>Professional cab invoice</p><p class="invoice-address">Address: ${getInvoiceAddress()}</p></div></div><div class="invoice-meta"><p><strong>Invoice date:</strong> ${formatDate(invoice.invoiceDate)}</p></div></div>`,
      `<div class="invoice-details"><p><strong>Customer:</strong> ${invoice.customerName}</p><p><strong>Phone:</strong> ${invoice.customerPhone}</p><p><strong>Pickup:</strong> ${invoice.pickupLocation}</p><p><strong>Destination:</strong> ${invoice.destinationLocation}</p><p><strong>Vehicle:</strong> ${invoice.vehicleName}</p><p><strong>Vehicle no:</strong> ${invoice.vehicleNumber}</p></div>`,
      '<table class="invoice-table">',
      '<thead><tr><th>#</th><th>Description</th><th>Rate</th><th>Total</th></tr></thead>',
      '<tbody>'
    ];

    invoice.items.forEach((item, index) => {
      lines.push(
        `<tr><td>${index + 1}</td><td>${item.name}</td><td>${formatCurrency(item.price)}</td><td>${formatCurrency(item.total)}</td></tr>`
      );
    });

    lines.push(`</tbody></table>`);
    lines.push(`<div class="invoice-summary"><p>Subtotal: ${formatCurrency(invoice.subtotal)}</p><p><strong>Total: ${formatCurrency(invoice.total)}</strong></p></div>`);
    lines.push(`<p class="invoice-note">Thank you for choosing Hrithik Cab Services.</p>`);
    lines.push(`<p class="invoice-contact">Phone: +91 98765 43210 | Email: ${getEmail()}</p>`);
    lines.push(`</div>`);

    preview.innerHTML = lines.join('');
    actions.hidden = false;
    preview.classList.add('printable-area');
    window.currentInvoice = invoice;
  }

  function createInvoicePdf(invoice) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const startX = 40;
    let y = 40;

    doc.setFontSize(18);
    doc.text('Hrithik Cab Services', startX, y);
    y += 16;
    doc.setFontSize(9);
    doc.text(`Address: ${getInvoiceAddress()}`, startX, y);
    y += 18;
    doc.setFontSize(11);
    doc.text('Professional cab invoice', startX, y);
    y += 24;
    doc.setFontSize(10);
    doc.text(`Invoice date: ${formatDate(invoice.invoiceDate)}`, startX, y);
    y += 24;

    doc.setFontSize(12);
    doc.text('Customer', startX, y);
    y += 14;
    doc.setFontSize(10);
    doc.text(`Name: ${invoice.customerName}`, startX, y);
    y += 14;
    doc.text(`Phone: ${invoice.customerPhone}`, startX, y);
    y += 14;
    doc.text(`Pickup: ${invoice.pickupLocation}`, startX, y);
    y += 14;
    doc.text(`Destination: ${invoice.destinationLocation}`, startX, y);
    y += 14;
    doc.text(`Vehicle: ${invoice.vehicleName}`, startX, y);
    y += 14;
    doc.text(`Vehicle no: ${invoice.vehicleNumber}`, startX, y);
    y += 24;

    doc.setFontSize(11);
    doc.text('Description', startX, y);
    doc.text('Rate', 360, y);
    doc.text('Total', 460, y);
    y += 12;
    doc.setLineWidth(0.5);
    doc.line(startX, y, 540, y);
    y += 18;

    invoice.items.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.name}`, startX, y);
      doc.text(formatCurrency(item.price), 360, y);
      doc.text(formatCurrency(item.total), 460, y);
      y += 18;
      if (y > 740) {
        doc.addPage();
        y = 40;
      }
    });

    y += 14;
    doc.line(startX, y, 540, y);
    y += 20;
    doc.text(`Subtotal: ${formatCurrency(invoice.subtotal)}`, 360, y);
    y += 18;
    doc.setFontSize(12);
    doc.text(`Total: ${formatCurrency(invoice.total)}`, 360, y);
    y += 24;
    doc.setFontSize(9);
    doc.text(`Phone: +91 98765 43210 | Email: ${getEmail()}`, startX, y);

    return doc;
  }

  async function shareInvoicePdf(invoice) {
    try {
      const doc = createInvoicePdf(invoice);
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
      <button type="button" class="remove-item-btn" aria-label="Remove item">×</button>
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
    if (isFirebaseReady()) {
      try {
        const snapshot = await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_INVOICES).get();
        if (snapshot.exists) {
          return normalizeRemoteData(snapshot.data().items);
        }
      } catch (error) {
        console.error('Unable to load invoices from Firebase:', error);
      }
    }

    try {
      return JSON.parse(localStorage.getItem(INVOICES_KEY) || '[]');
    } catch (parseError) {
      return [];
    }
  }

  async function saveInvoices(invoices) {
    if (isFirebaseReady()) {
      try {
        await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_INVOICES).set({ items: invoices }, { merge: true });
      } catch (error) {
        console.error('Unable to save invoices to Firebase:', error);
      }
    }

    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
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
        <p class="saved-invoice-route">${invoice.pickupLocation} → ${invoice.destinationLocation}</p>
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
          <button type="button" class="remove-item-btn" aria-label="Remove item">×</button>
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
    if (isFirebaseReady()) {
      try {
        const snapshot = await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_BOOKINGS).get();
        if (snapshot.exists) {
          return normalizeRemoteData(snapshot.data().items);
        }
      } catch (error) {
        console.error('Unable to load bookings from Firebase:', error);
      }
    }

    try {
      return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
    } catch (error) {
      return [];
    }
  }

  async function saveBookings(bookings) {
    if (isFirebaseReady()) {
      try {
        await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_BOOKINGS).set({ items: bookings }, { merge: true });
      } catch (error) {
        console.error('Unable to save bookings to Firebase:', error);
      }
    }

    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    renderBookings();
  }

  function getServices() {
    try {
      const saved = JSON.parse(localStorage.getItem(SERVICES_KEY) || 'null');
      return Array.isArray(saved) && saved.length ? saved : DEFAULT_SERVICES;
    } catch (error) {
      return DEFAULT_SERVICES;
    }
  }

  async function saveServices(services) {
    if (isFirebaseReady()) {
      try {
        await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_SERVICES).set({ items: services }, { merge: true });
      } catch (error) {
        console.error('Unable to save services to Firebase:', error);
      }
    }

    localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
    renderServices();
    renderHomeServices();
  }

  // Vehicles storage and rendering (separate from services)
  const VEHICLES_KEY = 'hrithikCabVehicles';
  const DEFAULT_VEHICLES = [];

  function getVehicles() {
    try {
      const saved = JSON.parse(localStorage.getItem(VEHICLES_KEY) || 'null');
      return Array.isArray(saved) && saved.length ? saved : DEFAULT_VEHICLES;
    } catch (error) {
      return DEFAULT_VEHICLES;
    }
  }

  async function saveVehicles(vehicles) {
    if (isFirebaseReady()) {
      try {
        await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_VEHICLES).set({ items: vehicles }, { merge: true });
      } catch (error) {
        console.error('Unable to save vehicles to Firebase:', error);
      }
    }

    localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));
    renderVehicles();
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
      card.innerHTML = `
        <img src="${vehicle.image}" alt="${vehicle.name}" />
        <div class="service-content">
          <h3>${vehicle.name}</h3>
          <p>${vehicle.description || ''}</p>
          <div class="service-footer">
            <a href="#bookingPanel" class="small-link">Book now</a>
          </div>
          <div class="service-card-actions">
            <button type="button" class="delete-btn" data-delete-vehicle="${index}">Delete</button>
          </div>
        </div>
      `;
      list.appendChild(card);
    });
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
    await saveBookings(bookings);
    showToast(`Saved ${booking.service} for ${booking.name}.`);
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

  document.addEventListener('DOMContentLoaded', () => {
    initFirebase();
    const phone = getPhoneNumber();
    const whatsapp = getWhatsAppNumber();
    const logoUrl = getLogoUrl();
    updatePhoneLinks(phone);
    updateWhatsAppLinks(whatsapp);
    updateLogo(logoUrl);

    renderInvoices();
    renderServices();
    renderHomeServices();
    renderVehicles();

    if (isFirebaseReady()) {
      Promise.all([
        loadSharedSettings(),
        loadSharedServices(),
        loadSharedVehicles(),
        renderBookings()
      ]).catch((error) => console.error(error));
    } else {
      renderBookings().catch((error) => console.error(error));
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
        window.print();
      });
    }

    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) {
      serviceForm.addEventListener('submit', (event) => {
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

        if (editingServiceIndex !== null) {
          services[editingServiceIndex] = service;
          showToast('Service updated.');
        } else {
          services.push(service);
          showToast('Service added.');
        }

        saveServices(services);
        resetServiceForm();
      });
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
          saveServices(services);
          showToast('Service deleted.');
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
    updateWhatsAppLinks
  };
})();
