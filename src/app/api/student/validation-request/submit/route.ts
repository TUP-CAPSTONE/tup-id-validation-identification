import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";
import { rateLimiters, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";
import { FieldValue } from "firebase-admin/firestore";

// ✅ Increase Vercel body size limit to 16MB for base64 image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "16mb",
    },
  },
};

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'default-bucket-name';

// Helper: Convert base64 to Buffer
function base64ToBuffer(base64String: string): Buffer {
  const base64Data = base64String.includes(',')
    ? base64String.split(',')[1]
    : base64String;
  return Buffer.from(base64Data, "base64");
}

// Helper: Extract MIME type from base64 data URI
function extractMimeType(base64String: string): string {
  const match = base64String.match(/data:([^;]+);base64,/);
  return match ? match[1] : "image/jpeg";
}

// Helper: Delete old files for a student from Firebase Storage
async function deleteOldFilesForStudent(studentNumber: string): Promise<void> {
  try {
    const storage = getStorage();
    const bucket = storage.bucket(STORAGE_BUCKET);
    const folderPath = `ID_Validation_Files/${studentNumber}/`;

    console.log(`🗑️ Deleting old files for student ${studentNumber}...`);

    const [files] = await bucket.getFiles({ prefix: folderPath });

    if (files.length === 0) {
      console.log(`ℹ️ No old files found for student ${studentNumber}`);
      return;
    }

    console.log(`Found ${files.length} old files to delete`);

    await Promise.all(
      files.map((file) => {
        console.log(`  - Deleting: ${file.name}`);
        return file.delete();
      })
    );

    console.log(
      `✅ Successfully deleted ${files.length} old files for student ${studentNumber}`
    );
  } catch (error: any) {
    console.error(
      `⚠️ Error deleting old files for student ${studentNumber}:`,
      error.message
    );
    // Don't throw - continue with upload even if deletion fails
  }
}

// Helper: Upload base64 image to Firebase Storage
async function uploadBase64Image(
  base64Image: string,
  studentNumber: string,
  imageName: string
): Promise<string> {
  if (!base64Image || typeof base64Image !== "string") {
    throw new Error(`${imageName} is not a valid string`);
  }

  const trimmedImage = base64Image.trim();

  // Already a URL (resubmission case — image unchanged)
  if (
    trimmedImage.startsWith("http://") ||
    trimmedImage.startsWith("https://")
  ) {
    console.log(`${imageName} is already a URL, skipping upload`);
    return trimmedImage;
  }

  if (!trimmedImage.startsWith("data:") || !trimmedImage.includes(";base64,")) {
    throw new Error(
      `Invalid image format for ${imageName}. Expected data URI format (data:image/...;base64,...)`
    );
  }

  const parts = trimmedImage.split(";base64,");
  if (!parts[1] || parts[1].length === 0) {
    throw new Error(`Base64 data is empty for ${imageName}`);
  }

  try {
    const storage = getStorage();
    const bucket = storage.bucket(STORAGE_BUCKET);

    const mimeType = extractMimeType(trimmedImage);
    const buffer = base64ToBuffer(trimmedImage);

    if (buffer.length === 0) {
      throw new Error(`Generated buffer is empty for ${imageName}`);
    }

    console.log(`Processing ${imageName}:`, {
      bufferSize: `${buffer.length} bytes`,
      mimeType,
      studentNumber,
    });

    const extension = mimeType.includes("png") ? "png" : "jpg";
    const fileName = `${studentNumber}_${imageName}.${extension}`;
    const filePath = `ID_Validation_Files/${studentNumber}/${fileName}`;

    const file = bucket.file(filePath);

    console.log(
      `📤 Uploading ${imageName} to gs://${STORAGE_BUCKET}/${filePath}`
    );

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          firebaseStorageDownloadTokens: Date.now().toString(),
        },
      },
      resumable: false,
    });

    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${filePath}`;
    console.log(`✅ Successfully uploaded ${imageName}: ${publicUrl}`);

    return publicUrl;
  } catch (error: any) {
    console.error(`❌ Failed to upload ${imageName}:`, {
      error: error.message,
      code: error.code,
      details: error.details,
      studentNumber,
    });
    throw new Error(`Failed to upload ${imageName}: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== Starting validation request submission ===");

    // ✅ Safe body parse — catches "Request Entity Too Large" plain-text errors
    let body: any;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error("❌ Failed to parse request body:", parseError.message);
      return NextResponse.json(
        {
          success: false,
          error:
            "Request body is too large or malformed. Please ensure images are properly compressed before submitting.",
        },
        { status: 413 }
      );
    }

    // Auth
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Missing token" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error: any) {
      console.error("Token verification error:", error.message);
      return NextResponse.json(
        { success: false, error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;
    console.log(`✓ Authenticated user: ${uid}`);

    // Rate limiting
    const rateLimitResult = await checkRateLimit(
      rateLimiters.studentValidationSubmit,
      uid
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Rate limit exceeded. You can only submit 3 requests per hour. Please try again later.",
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
        },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const {
      studentNumber,
      studentName,
      email,
      phoneNumber,
      course,
      section,
      yearLevel,
      corFile,
      corFileName,
      idPhoto,
      faceFront,
      faceLeft,
      faceRight,
    } = body;

    // Validation
    if (
      !studentNumber ||
      !studentName ||
      !email ||
      !course ||
      !section ||
      !yearLevel
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    if (!corFile || !idPhoto || !faceFront || !faceLeft || !faceRight) {
      return NextResponse.json(
        { success: false, error: "Missing required images or COR file" },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // ✅ Server-side image-only guard — reject PDFs and non-image files
    const corMimeTypeCheck = corFile.match(/^data:([^;]+);base64,/)?.[1] || "";
    if (!corMimeTypeCheck.startsWith("image/")) {
      return NextResponse.json(
        {
          success: false,
          error: "Only image files are accepted for COR (JPG, PNG, WEBP). PDF files are not allowed.",
        },
        { status: 415, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // ✅ Server-side COR size guard (2MB) — catches any attempt to bypass client-side check
    const MAX_COR_SIZE = 2 * 1024 * 1024; // 2MB in bytes
    // base64 encodes ~4/3x the original size, so decode length ≈ base64Length * 0.75
    const base64Data = corFile.includes(",") ? corFile.split(",")[1] : corFile;
    const estimatedBytes = Math.ceil((base64Data.length * 3) / 4);
    if (estimatedBytes > MAX_COR_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `COR file is too large (approximately ${(estimatedBytes / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 2MB.`,
        },
        { status: 413, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    console.log(`📋 Submission details:`, {
      studentNumber,
      studentName,
      email,
      course,
      section,
      yearLevel,
    });

    // Check if already accepted
    const validationRequestsRef = adminDB.collection("validation_requests2");
    const existingQuery = await validationRequestsRef
      .where("studentId", "==", uid)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      const existingRequest = existingQuery.docs[0].data();
      if (existingRequest.status === "accepted") {
        console.log(`⚠️ Student ${studentNumber} already validated`);
        return NextResponse.json(
          {
            success: false,
            error:
              "You have already been validated. You cannot submit another request.",
          },
          { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
        );
      }
      console.log(
        `ℹ️ Found existing request for ${studentNumber} with status: ${existingRequest.status}`
      );
    }

    // Delete old files before re-uploading
    await deleteOldFilesForStudent(studentNumber);

    console.log(`\n🚀 Starting file uploads for student ${studentNumber}...`);

    // Upload COR image
    const storage = getStorage();
    const bucket = storage.bucket(STORAGE_BUCKET);

    let corUrl: string;

    if (corFile.startsWith("http://") || corFile.startsWith("https://")) {
      corUrl = corFile;
      console.log("ℹ️ COR file is already a URL, skipping upload");
    } else {
      console.log("📄 Uploading COR image...");
      try {
        const corBuffer = base64ToBuffer(corFile);
        const corMimeType = extractMimeType(corFile);
        const corExtension = corMimeType.includes("png") ? "png" : corMimeType.includes("webp") ? "webp" : "jpg";
        const corPath = `ID_Validation_Files/${studentNumber}/${studentNumber}_cor.${corExtension}`;

        console.log(`COR details:`, {
          bufferSize: `${corBuffer.length} bytes`,
          mimeType: corMimeType,
          extension: corExtension,
        });

        const corFileRef = bucket.file(corPath);
        await corFileRef.save(corBuffer, {
          metadata: {
            contentType: corMimeType,
            metadata: {
              firebaseStorageDownloadTokens: Date.now().toString(),
            },
          },
          resumable: false,
        });

        await corFileRef.makePublic();

        corUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${corPath}`;
        console.log(`✅ COR uploaded: ${corUrl}`);
      } catch (error: any) {
        console.error("❌ COR upload failed:", error);
        throw new Error(`Failed to upload COR image: ${error.message}`);
      }
    }

    // Upload images
    console.log("\n📸 Uploading ID and face photos...");
    try {
      const [idPictureUrl, faceFrontUrl, faceLeftUrl, faceRightUrl] =
        await Promise.all([
          uploadBase64Image(idPhoto, studentNumber, "id_picture"),
          uploadBase64Image(faceFront, studentNumber, "pose_front"),
          uploadBase64Image(faceLeft, studentNumber, "pose_left"),
          uploadBase64Image(faceRight, studentNumber, "pose_right"),
        ]);

      console.log("\n✅ All files uploaded successfully!");

      const requestData = {
        studentId: uid,
        tupId: studentNumber,
        studentName,
        email,
        phoneNumber: phoneNumber || "",
        course: course.trim(),
        section: section.trim(),
        yearLevel: yearLevel.trim(),
        cor: corUrl,
        idPicture: idPictureUrl,
        selfiePictures: {
          front: faceFrontUrl,
          left: faceLeftUrl,
          back: faceRightUrl,
        },
        status: "pending",
        requestTime: FieldValue.serverTimestamp(),
        rejectRemarks: null,
      };

      console.log("\n💾 Saving to Firestore...");
      const requestDocRef = adminDB
        .collection("validation_requests2")
        .doc(studentNumber);
      await requestDocRef.set(requestData, { merge: true });
      console.log("✅ Saved to Firestore successfully");
      console.log("=== Validation request submission complete ===\n");

      return NextResponse.json(
        {
          success: true,
          message: "Validation request submitted successfully",
          data: requestData,
        },
        {
          status: 200,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    } catch (uploadError: any) {
      console.error("\n❌ Image upload error:", uploadError);
      return NextResponse.json(
        {
          success: false,
          error: `Image upload failed: ${uploadError.message}`,
          details:
            process.env.NODE_ENV === "development"
              ? uploadError.stack
              : undefined,
        },
        { status: 500, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }
  } catch (error: any) {
    console.error("\n❌ Error submitting validation request:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}