import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
  });
}

const db = admin.firestore();
db.settings({ databaseId: "locavia-db" });

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