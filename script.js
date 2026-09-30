from pathlib import Path
import re

p = Path("/mnt/data/script.js")
t = p.read_text(encoding="utf-8")

# Repair the accidental text that was inserted into the invoice template.
t = re.sub(
    r"`}</json>Given that the edit tool.*?Let's call functions\.edit with correct old_str matching previous version: `<div class=,",
    "`",
    t,
    count=1,
    flags=re.S
)

# Replace ONLY the two vehicle Firebase functions.
t = re.sub(
    r"  async function loadSharedVehicles\(\) \{.*?\n  \}\n\n  function listenToSharedSettings",
    """  async function loadSharedVehicles() {
    if (!isFirebaseReady()) return;

    try {
      const sharedDoc = await db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_VEHICLES).get();

      if (sharedDoc.exists) {
        const data = sharedDoc.data() || {};
        if (Array.isArray(data.items) && data.items.length) {
          remoteVehicles = data.items;
          renderVehicles();
          return;
        }
      }

      // Also support a normal Firestore collection: vehicles/{vehicleId}
      const snapshot = await db.collection('vehicles').get();
      remoteVehicles = snapshot.docs.map((doc) => {
        const v = doc.data() || {};
        let images = Array.isArray(v.images) ? v.images.filter(Boolean) : [];
        if (!images.length) {
          const image = v.image || v.imageUrl || v.photo || v.photoUrl || '';
          if (image) images = [image];
        }

        return {
          id: doc.id,
          name: v.name || v.vehicleName || v.title || 'Vehicle',
          description: v.description || v.vehicleDescription || v.details || '',
          images
        };
      }).filter((v) => v.name || v.images.length);

      renderVehicles();
    } catch (error) {
      console.error('Unable to load vehicles from Firebase:', error);
      renderVehicles();
    }
  }

  function listenToSharedSettings""",
    t,
    count=1,
    flags=re.S
)

t = re.sub(
    r"  function listenToSharedVehicles\(\) \{.*?\n  \}\n\n  function listenToSharedBookings",
    """  function listenToSharedVehicles() {
    if (!isFirebaseReady()) return;

    db.collection(FIREBASE_COLLECTION).doc(FIREBASE_DOC_VEHICLES)
      .onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data() || {};
        if (Array.isArray(data.items) && data.items.length) {
          remoteVehicles = data.items;
          renderVehicles();
        }
      }, (error) => {
        console.error('Shared vehicles listener error:', error);
      });

    db.collection('vehicles')
      .onSnapshot((snapshot) => {
        const vehicles = snapshot.docs.map((doc) => {
          const v = doc.data() || {};
          let images = Array.isArray(v.images) ? v.images.filter(Boolean) : [];
          if (!images.length) {
            const image = v.image || v.imageUrl || v.photo || v.photoUrl || '';
            if (image) images = [image];
          }

          return {
            id: doc.id,
            name: v.name || v.vehicleName || v.title || 'Vehicle',
            description: v.description || v.vehicleDescription || v.details || '',
            images
          };
        }).filter((v) => v.name || v.images.length);

        if (vehicles.length) {
          remoteVehicles = vehicles;
          renderVehicles();
        }
      }, (error) => {
        console.warn('Firestore vehicles collection listener error:', error);
      });
  }

  function listenToSharedBookings""",
    t,
    count=1,
    flags=re.S
)

out = Path("/mnt/data/script-FINAL-FIX.js")
out.write_text(t, encoding="utf-8")

print(f"Created: {out}")
