const admin = require("firebase-admin");
const fs = require("fs");

// You must download serviceAccountKey.json from Firebase > Project Settings > Service Accounts
admin.initializeApp({
  credential: admin.credential.cert("C:/Users/Kyle/Desktop/Thesis/thesis-system/tup-id-verification-firebase-adminsdk-fbsvc-e86976f242.json")
});

const db = admin.firestore();

const data = JSON.parse(fs.readFileSync("dummyData.json", "utf8"));

async function upload() {
  for (const student of data) {
    const docId = student.id || db.collection("validation_requests").doc().id;
    await db.collection("validation_requests").doc(docId).set(student);
    console.log(`Uploaded: ${docId}`);
  }
}

upload();
