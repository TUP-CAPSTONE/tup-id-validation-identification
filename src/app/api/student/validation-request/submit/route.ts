import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";
import { rateLimiters, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";
import { FieldValue } from "firebase-admin/firestore";

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'default-bucket-name';

// Helper: Convert base64 to Buffer
function base64ToBuffer(base64String: string): Buffer {
  const base64Data = base64String.includes(',') 
    ? base64String.split(',')[1] 
    : base64String;
  return Buffer.from(base64Data, 'base64');
}

// Helper: Extract MIME type from base64 data URI
function extractMimeType(base64String: string): string {
  const match = base64String.match(/data:([^;]+);base64,/);
  return match ? match[1] : 'image/jpeg';
}

// Helper: Upload base64 image to Firebase Storage
async function uploadBase64Image(
  base64Image: string,
  studentNumber: string,
  imageName: string
): Promise<string> {
  // Validate base64 format
  if (!base64Image || typeof base64Image !== 'string') {
    throw new Error(`${imageName} is not a valid string`);
  }

  const trimmedImage = base64Image.trim();

  // Check if it's already a URL (resubmission case)
  if (trimmedImage.startsWith('http://') || trimmedImage.startsWith('https://')) {
    console.log(`${imageName} is already a URL, returning: ${trimmedImage}`);
    return trimmedImage;
  }

  // Validate data URI format
  if (!trimmedImage.startsWith('data:') || !trimmedImage.includes(';base64,')) {
    throw new Error(`Invalid image format for ${imageName}. Expected data URI format (data:image/...;base64,...)`);
  }

  const parts = trimmedImage.split(';base64,');
  if (!parts[1] || parts[1].length === 0) {
    throw new Error(`Base64 data is empty for ${imageName}`);
  }

  try {
    const storage = getStorage();
    const bucket = storage.bucket(STORAGE_BUCKET);
    
    const mimeType = extractMimeType(trimmedImage);
    const buffer = base64ToBuffer(trimmedImage);
    
    // Validate buffer size
    if (buffer.length === 0) {
      throw new Error(`Generated buffer is empty for ${imageName}`);
    }
    
    console.log(`Processing ${imageName}:`, {
      bufferSize: `${buffer.length} bytes`,
      mimeType: mimeType,
      studentNumber: studentNumber
    });
    
    // Determine file extension
    const extension = mimeType.includes('png') ? 'png' : 'jpg';
    // ⭐ Add timestamp to filename for uniqueness
    const timestamp = Date.now();
    const fileName = `${studentNumber}_${imageName}_${timestamp}.${extension}`;
    const filePath = `ID_Validation_Files/${studentNumber}/${fileName}`;
    
    const file = bucket.file(filePath);
    
    console.log(`📤 Uploading ${imageName} to gs://${STORAGE_BUCKET}/${filePath}`);
    
    // Upload file with public access and cache control
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=300, must-revalidate', // ⭐ Cache for only 5 minutes
        metadata: {
          firebaseStorageDownloadTokens: Date.now().toString(),
        }
      },
      resumable: false,
    });

    // Make file publicly accessible
    await file.makePublic();

    // Generate public URL with cache-busting parameter
    const publicUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${filePath}?t=${timestamp}`;
    console.log(`✅ Successfully uploaded ${imageName}: ${publicUrl}`);
    
    return publicUrl;
  } catch (error: any) {
    console.error(`❌ Failed to upload ${imageName}:`, {
      error: error.message,
      code: error.code,
      details: error.details,
      studentNumber: studentNumber
    });
    throw new Error(`Failed to upload ${imageName}: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Starting validation request submission ===');
    
    // Get Authorization header
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Missing token" },
        { status: 401 }
      );
    }

    // Extract token
    const token = authHeader.split("Bearer ")[1];
    
    // Verify Firebase token
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

    // Rate limiting check (3 submissions per hour)
    const rateLimitResult = await checkRateLimit(
      rateLimiters.studentValidationSubmit,
      uid
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Rate limit exceeded. You can only submit 3 requests per hour. Please try again later.",
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset
        },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      studentNumber,
      studentName,
      email,
      phoneNumber,
      course,
      section,
      yearLevel,
      corFile, // base64 string
      corFileName,
      idPhoto, // base64 string
      faceFront, // base64 string
      faceLeft, // base64 string
      faceRight, // base64 string
    } = body;

    // Validation
    if (!studentNumber || !studentName || !email || !course || !section || !yearLevel) {
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

    console.log(`📋 Submission details:`, {
      studentNumber,
      studentName,
      email,
      course,
      section,
      yearLevel
    });

    // Log data format for debugging
    console.log('📊 Data format check:', {
      corFileType: typeof corFile,
      corFilePrefix: corFile.substring(0, 30) + '...',
      idPhotoType: typeof idPhoto,
      idPhotoPrefix: idPhoto.substring(0, 30) + '...',
      faceFrontType: typeof faceFront,
      faceFrontPrefix: faceFront.substring(0, 30) + '...',
    });

    // Check if already accepted (prevent resubmission)
    const validationRequestsRef = adminDB.collection("validation_requests2");
    const existingQuery = await validationRequestsRef
      .where("studentId", "==", uid)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      const existingRequest = existingQuery.docs[0].data();
      if (existingRequest.status === 'accepted') {
        console.log(`⚠️ Student ${studentNumber} already validated`);
        return NextResponse.json(
          { 
            success: false, 
            error: "You have already been validated. You cannot submit another request." 
          },
          { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
        );
      }
      console.log(`ℹ️ Found existing request for ${studentNumber} with status: ${existingRequest.status}`);
    }

    console.log(`\n🚀 Starting file uploads for student ${studentNumber}...`);

    // Upload COR file
    const storage = getStorage();
    const bucket = storage.bucket(STORAGE_BUCKET);
    
    let corUrl: string;
    const timestamp = Date.now();
    
    // Check if corFile is base64 or already a URL
    if (corFile.startsWith('http://') || corFile.startsWith('https://')) {
      corUrl = corFile;
      console.log('ℹ️ COR file is already a URL, skipping upload');
    } else {
      console.log('📄 Uploading COR file...');
      try {
        const corBuffer = base64ToBuffer(corFile);
        const corMimeType = extractMimeType(corFile);
        const corExtension = corMimeType === 'application/pdf' ? 'pdf' : 'jpg';
        // ⭐ Add timestamp to COR filename
        const corPath = `ID_Validation_Files/${studentNumber}/${studentNumber}_cor_${timestamp}.${corExtension}`;
        
        console.log(`COR details:`, {
          bufferSize: `${corBuffer.length} bytes`,
          mimeType: corMimeType,
          extension: corExtension
        });
        
        const corFileRef = bucket.file(corPath);
        await corFileRef.save(corBuffer, {
          metadata: { 
            contentType: corMimeType,
            cacheControl: 'public, max-age=300, must-revalidate', // ⭐ Cache for only 5 minutes
            metadata: {
              firebaseStorageDownloadTokens: Date.now().toString(),
            }
          },
          resumable: false,
        });
        
        await corFileRef.makePublic();
        
        // ⭐ Add cache-busting parameter
        corUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${corPath}?t=${timestamp}`;
        console.log(`✅ COR uploaded: ${corUrl}`);
      } catch (error: any) {
        console.error('❌ COR upload failed:', error);
        throw new Error(`Failed to upload COR file: ${error.message}`);
      }
    }

    // Upload images (ID and face photos) with detailed error handling
    console.log('\n📸 Uploading ID and face photos...');
    try {
      const uploadPromises = [
        uploadBase64Image(idPhoto, studentNumber, 'id_picture'),
        uploadBase64Image(faceFront, studentNumber, 'pose_front'),
        uploadBase64Image(faceLeft, studentNumber, 'pose_left'),
        uploadBase64Image(faceRight, studentNumber, 'pose_right'),
      ];

      const [idPictureUrl, faceFrontUrl, faceLeftUrl, faceRightUrl] = await Promise.all(uploadPromises);

      console.log('\n✅ All files uploaded successfully!');
      console.log('Uploaded URLs:', {
        cor: corUrl,
        idPicture: idPictureUrl,
        faceFront: faceFrontUrl,
        faceLeft: faceLeftUrl,
        faceRight: faceRightUrl
      });

      // Prepare validation request data
      const requestData = {
        studentId: uid,
        tupId: studentNumber,
        studentName: studentName,
        email: email,
        phoneNumber: phoneNumber || '',
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
        status: 'pending',
        requestTime: FieldValue.serverTimestamp(),
        rejectRemarks: null,
      };

      // Save to Firestore (use studentNumber as document ID)
      console.log('\n💾 Saving to Firestore...');
      const requestDocRef = adminDB.collection("validation_requests2").doc(studentNumber);
      await requestDocRef.set(requestData, { merge: true });
      console.log('✅ Saved to Firestore successfully');
      console.log('=== Validation request submission complete ===\n');

      return NextResponse.json(
        {
          success: true,
          message: "Validation request submitted successfully",
          data: requestData
        },
        { 
          status: 200,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    } catch (uploadError: any) {
      console.error("\n❌ Image upload error:", uploadError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Image upload failed: ${uploadError.message}`,
          details: process.env.NODE_ENV === 'development' ? uploadError.stack : undefined
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
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}