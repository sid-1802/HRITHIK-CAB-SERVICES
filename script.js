from pathlib import Path

src = Path("/mnt/data/script.js")
dst = Path("/mnt/data/script-fixed.js")
text = src.read_text(encoding="utf-8")

old_load = """  async function loadSharedVehicles() {
    if (!isFirebaseReady()) return;

    try {
      const doc = await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_VEHICLES).get();
      if (!doc.exists) {
        console.info('Shared vehicles document does not exist yet.');
        return;
      }

      const data = doc.data() || {};
      console.info('Loaded shared vehicles from Firebase:', data);
      if (Array.isArray(data.items)) {
        remoteVehicles = data.items;
        renderVehicles();
      }
    } catch (error) {
      console.error('Unable to load shared vehicles from Firebase:', error);
    }
  }
"""

new_load = """  // Vehicle data compatibility:
  // 1) New/old site format: sharedData/vehicles -> { items: [...] }
  // 2) Firestore collection format: vehicles/{vehicleId} -> one vehicle per document
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
      // First try the format used by the current website.
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

      // If the vehicles were created as a normal Firestore collection,
      // read vehicles/{documentId} instead.
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
"""

old_listener = """  function listenToSharedVehicles() {
    if (!isFirebaseReady()) return;

    db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_VEHICLES)
      .onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data() || {};
        if (Array.isArray(data.items)) {
          remoteVehicles = data.items;
          renderVehicles();
        }
      }, (error) => {
        console.error('Shared vehicles listener error:', error);
      });
  }
"""

new_listener = """  function listenToSharedVehicles() {
    if (!isFirebaseReady()) return;

    // Keep the website live when using the original sharedData/vehicles document.
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

    // Also listen to a normal Firestore "vehicles" collection.
    db.collection('vehicles')
      .onSnapshot((snapshot) => {
        const collectionVehicles = snapshot.docs
          .map((doc) => normalizeVehicleRecord(doc.data(), doc.id));

        // Only replace the display when the collection actually contains vehicles.
        // This prevents an empty collection from hiding vehicles stored in sharedData.
        if (collectionVehicles.length) {
          remoteVehicles = collectionVehicles;
          renderVehicles();
        }
      }, (error) => {
        console.warn('Firestore vehicles collection listener error:', error);
      });
  }
"""

old_save = """  async function saveVehicles(vehicles) {
    remoteVehicles = vehicles;
    if (isFirebaseReady()) {
      try {
        await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_VEHICLES).set({ items: vehicles }, { merge: true });
        console.info('Saved vehicles to Firebase:', vehicles);
      } catch (error) {
        console.error('Unable to save vehicles to Firebase:', error);
      }
    }

    renderVehicles();
  }
"""

new_save = """  async function saveVehicles(vehicles) {
    remoteVehicles = normalizeVehicleArray(vehicles);

    if (isFirebaseReady()) {
      try {
        // Preserve compatibility with the existing website format.
        await db.collection(FIREBASE_COLLECTION)
          .doc(FIREBASE_DOC_VEHICLES)
          .set({ items: remoteVehicles }, { merge: true });

        console.info('Saved vehicles to sharedData/vehicles:', remoteVehicles);
      } catch (error) {
        console.error('Unable to save vehicles to sharedData/vehicles:', error);
      }

      // Also write each vehicle to the normal "vehicles" collection.
      // This makes the site compatible with vehicles already stored there.
      try {
        const existing = await db.collection('vehicles').get();
        const existingIds = new Set(existing.docs.map((doc) => doc.id));
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

        // Remove old collection documents that are no longer in the current list.
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
"""

for old, new, label in [
    (old_load, new_load, "loadSharedVehicles"),
    (old_listener, new_listener, "listenToSharedVehicles"),
    (old_save, new_save, "saveVehicles"),
]:
    if old not in text:
        raise RuntimeError(f"Could not find exact {label} block")
    text = text.replace(old, new, 1)

dst.write_text(text, encoding="utf-8")
print(f"Created: {dst}")
print("The fixed script now reads both sharedData/vehicles and the normal Firestore vehicles collection.")
