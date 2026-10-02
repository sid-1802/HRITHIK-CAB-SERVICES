// Replaced with actual JavaScript functions that are compatible with the site's existing Firebase structures.

function normalizeVehicleRecord(data, id) {
  const v = data || {};
  const images = Array.isArray(v.images)
    ? v.images.filter(Boolean)
    : (Array.isArray(v.imageUrls) ? v.imageUrls.filter(Boolean) : []);

  const singleImage = v.image || v.imageUrl || v.photo || v.photoUrl || '';
  if (!images.length && singleImage) images.push(singleImage);

  return {
    id: v.id || id || '',
    name: v.name || v.vehicleName || v.title || 'Vehicle',
    description: v.description || v.vehicleDescription || v.details || '',
    images
  };
}

function normalizeVehicleArray(items) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => normalizeVehicleRecord(item, item && item.id ? item.id : String(index)))
    .filter((item) => item.name || item.images.length);
}

async function loadSharedVehicles() {
  if (!isFirebaseReady()) return;

  try {
    const sharedDoc = await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_VEHICLES).get();
    if (sharedDoc.exists) {
      const data = sharedDoc.data() || {};
      if (Array.isArray(data.items) && data.items.length) {
        remoteVehicles = normalizeVehicleArray(data.items);
        console.info('Loaded vehicles from sharedData/vehicles:', remoteVehicles);
        renderVehicles();
        return;
      }
    }

    const snapshot = await db.collection('vehicles').get();
    const collectionVehicles = snapshot.docs.map((doc) => normalizeVehicleRecord(doc.data(), doc.id));

    if (collectionVehicles.length) {
      remoteVehicles = collectionVehicles;
      console.info('Loaded vehicles from Firestore collection "vehicles":', remoteVehicles);
    } else {
      remoteVehicles = [];
      console.info('No vehicles found in either Firebase vehicle format.');
    }

    renderVehicles();
  } catch (error) {
    console.error('Unable to load vehicles from Firebase:', error);
    showToast('Could not load vehicles from Firebase. Check Firestore rules.');
  }
}

function listenToSharedVehicles() {
  if (!isFirebaseReady()) return;

  db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_VEHICLES)
    .onSnapshot((doc) => {
      if (!doc.exists) return;
      const data = doc.data() || {};
      if (Array.isArray(data.items) && data.items.length) {
        remoteVehicles = normalizeVehicleArray(data.items);
        renderVehicles();
      }
    }, (error) => {
      console.error('Shared vehicles listener error:', error);
    });

  db.collection('vehicles')
    .onSnapshot((snapshot) => {
      const collectionVehicles = snapshot.docs.map((doc) => normalizeVehicleRecord(doc.data(), doc.id));

      if (collectionVehicles.length) {
        remoteVehicles = collectionVehicles;
        renderVehicles();
      }
    }, (error) => {
      console.warn('Firestore vehicles collection listener error:', error);
    });
}

async function saveVehicles(vehicles) {
  remoteVehicles = normalizeVehicleArray(vehicles);

  if (isFirebaseReady()) {
    try {
      await db.collection(FIREBASE_COLLECTION)
        .doc(FIREBASE_DOC_VEHICLES)
        .set({ items: remoteVehicles }, { merge: true });

      console.info('Saved vehicles to sharedData/vehicles:', remoteVehicles);
    } catch (error) {
      console.error('Unable to save vehicles to sharedData/vehicles:', error);
    }

    try {
      const existing = await db.collection('vehicles').get();
      const batch = db.batch();
      const usedIds = new Set();

      remoteVehicles.forEach((vehicle, index) => {
        const baseId = String(vehicle.id || `vehicle-${index + 1}`)
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, '-')
          .slice(0, 100) || `vehicle-${index + 1}`;

        let docId = baseId;
        let n = 2;
        while (usedIds.has(docId)) {
          docId = `${baseId}-${n++}`;
        }
        usedIds.add(docId);

        const ref = db.collection('vehicles').doc(docId);
        batch.set(ref, { ...vehicle, id: docId }, { merge: true });
      });

      existing.docs.forEach((doc) => {
        if (!usedIds.has(doc.id)) batch.delete(doc.ref);
      });

      await batch.commit();
      console.info('Saved vehicles to Firestore collection "vehicles".');
    } catch (error) {
      console.warn('Could not mirror vehicles to Firestore collection "vehicles":', error);
    }
  }

  renderVehicles();
}


