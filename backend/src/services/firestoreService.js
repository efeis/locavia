import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
  });
}

const db = admin.firestore();
db.settings({ databaseId: "locavia-db" });

export async function reserveDailyUsage(counterName, dailyLimit) {
  const allowedCounters = ["searches", "photos"];
  if (!allowedCounters.includes(counterName) || !Number.isInteger(dailyLimit) || dailyLimit < 1) {
    throw new Error("Invalid daily usage counter configuration.");
  }

  const today = new Date().toISOString().slice(0, 10);
  const usageRef = db.collection("usageLimits").doc("publicApi");

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(usageRef);
    const usage = snapshot.exists && snapshot.data().day === today
      ? snapshot.data()
      : {};
    const currentCount = Number.isInteger(usage[counterName]) ? usage[counterName] : 0;

    if (currentCount >= dailyLimit) {
      return false;
    }

    transaction.set(
      usageRef,
      {
        day: today,
        searches: counterName === "searches" ? currentCount + 1 : usage.searches || 0,
        photos: counterName === "photos" ? currentCount + 1 : usage.photos || 0,
      },
      { merge: false }
    );
    return true;
  });
}

export async function saveQuery(queryData) {
  const docRef = await db.collection("queries").add(queryData);
  return docRef.id;
}

export async function saveResults(queryId, results) {
  const batch = db.batch();

  results.forEach((result) => {
    const docRef = db.collection("results").doc();
    batch.set(docRef, {
      queryId,
      ...result,
      fetchedAt: new Date().toISOString(),
    });
  });

  await batch.commit();
}

export async function getHistoricalQueries(normalizedCity, topic) {
  const snapshot = await db
    .collection("queries")
    .where("normalizedCity", "==", normalizedCity)
    .where("topic", "==", topic)
    .orderBy("searchedAt", "desc")
    .limit(5)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function getHistoricalResults(queryIds) {
  if (!queryIds.length) {
    return [];
  }

  const allResults = [];

  for (const queryId of queryIds) {
    const snapshot = await db
      .collection("results")
      .where("queryId", "==", queryId)
      .get();

    const results = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    allResults.push(...results);
  }

  return allResults;
}