const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// 🔹 1. Initialize Firebase Admin
const serviceAccount = require("./tup-id-verification-firebase-adminsdk-fbsvc-e60592d188.json"); 
// Download this from Firebase Console → Project Settings → Service Accounts

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 🔹 2. Read JSON file
const studentsFilePath = path.join(__dirname, "students.json");
const students = JSON.parse(fs.readFileSync(studentsFilePath, "utf8"));

// 🔹 3. Target collection name
const COLLECTION_NAME = "testing_student_list"; // change if needed

async function importStudents() {
  console.log(`🚀 Starting import of ${students.length} students...`);

  const batchSize = 500; // Firestore max batch limit
  let batch = db.batch();
  let operationCount = 0;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];

    // Convert createdAt to Firestore Timestamp
    if (student.createdAt && student.createdAt._seconds) {
      student.createdAt = new admin.firestore.Timestamp(
        student.createdAt._seconds,
        student.createdAt._nanoseconds || 0
      );
    }

    const docRef = db.collection(COLLECTION_NAME).doc(student.uid);
    batch.set(docRef, student);

    operationCount++;

    if (operationCount === batchSize) {
      await batch.commit();
      console.log(`✅ Committed ${operationCount} records`);
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
    console.log(`✅ Final commit of ${operationCount} records`);
  }

  console.log("🎉 Import completed successfully!");
  process.exit(0);
}

importStudents().catch((error) => {
  console.error("❌ Error importing students:", error);
  process.exit(1);
});