import { NextResponse, type NextRequest } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@/lib/db';
import { vendorForms, customerApplications } from '@/lib/schema';
import { fileUploadSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import { 
  AWS_ACCESS_KEY_ID, 
  AWS_SECRET_ACCESS_KEY, 
  AWS_REGION, 
  AWS_S3_BUCKET_NAME 
} from '@/lib/config';

// Initialize S3 client only if credentials are provided
let s3Client: S3Client | null = null;
if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_REGION && AWS_S3_BUCKET_NAME) {
  try {
    s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
    console.log(`S3 client initialized with region: ${AWS_REGION}`);
  } catch (error) {
    console.error('Failed to initialize S3 client:', error);
  }
} else {
  console.warn("AWS S3 credentials or region/bucket not fully configured. File upload API will not function.");
}

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export async function POST(request: NextRequest) {
  if (!s3Client || !AWS_S3_BUCKET_NAME) {
    console.error('S3 client or bucket name is not configured.');
    return NextResponse.json(
      { error: 'File upload service is not configured correctly.' },
      { status: 503 } // Service Unavailable
    );
  }

  if (!db) {
    console.error('Database connection is not available in /api/upload');
    return NextResponse.json(
      { error: 'Database connection not available. Service temporarily unavailable.' },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const applicationIdStr = formData.get('applicationId') as string | null;

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large', details: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type', details: `Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate application ID using Zod schema
    const validationResult = fileUploadSchema.safeParse({ applicationId: applicationIdStr });
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      );
    }

    const applicationId = parseInt(validationResult.data.applicationId, 10);

    // Verify that the application exists
    const [existingApplication] = await db
      .select()
      .from(customerApplications)
      .where(eq(customerApplications.id, applicationId))
      .limit(1);

    if (!existingApplication) {
      return NextResponse.json(
        { error: 'Invalid application ID', details: 'The specified application does not exist' },
        { status: 404 }
      );
    }

    // Generate a unique file name
    const fileExtension = file.name.split('.').pop() || 'bin';
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const uniqueFileName = `${timestamp}-${randomString}.${fileExtension}`;
    const s3Key = `vendor-forms/${applicationId}/${uniqueFileName}`;

    // Upload file to S3
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: AWS_S3_BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: file.type || 'application/octet-stream',
        // Add metadata for better tracking
        Metadata: {
          'original-filename': file.name,
          'application-id': applicationId.toString(),
          'upload-timestamp': timestamp.toString(),
        },
        // For private files, don't set public read ACL
        // ServerSideEncryption: 'AES256', // Optional: encrypt files at rest
      }));
    } catch (s3Error) {
      console.error('S3 upload error:', s3Error);
      if (s3Error instanceof Error) {
        if (s3Error.name === 'NoSuchBucket') {
          return NextResponse.json(
            { 
              error: 'S3 bucket does not exist', 
              details: `Bucket ${AWS_S3_BUCKET_NAME} not found in region ${AWS_REGION}` 
            },
            { status: 500 }
          );
        }
        if (s3Error.name === 'InvalidAccessKeyId' || s3Error.name === 'SignatureDoesNotMatch') {
          return NextResponse.json(
            { 
              error: 'AWS credentials error', 
              details: 'Invalid AWS credentials or region mismatch' 
            },
            { status: 500 }
          );
        }
      }
      throw s3Error; // Re-throw to be caught by outer catch
    }

    // Store S3 key instead of public URL for security
    // This allows for generating pre-signed URLs when needed
    const fileUrl = `s3://${AWS_S3_BUCKET_NAME}/${s3Key}`;

    // Store file metadata in the database
    const [vendorFormRecord] = await db.insert(vendorForms).values({
      applicationId: applicationId,
      fileName: file.name,
      fileUrl: fileUrl,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
    }).returning();

    if (!vendorFormRecord) {
      throw new Error('Failed to create vendor form record');
    }

    return NextResponse.json({
      success: true,
      message: 'File uploaded and metadata stored successfully.',
      vendorForm: {
        id: vendorFormRecord.id,
        applicationId: vendorFormRecord.applicationId,
        fileName: vendorFormRecord.fileName,
        fileType: vendorFormRecord.fileType,
        fileSize: vendorFormRecord.fileSize,
        createdAt: vendorFormRecord.createdAt,
        // Don't expose the actual S3 URL for security
        // fileUrl: vendorFormRecord.fileUrl,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      // Handle database-specific errors
      if (error.message.includes('foreign key constraint')) {
        return NextResponse.json(
          { error: 'Invalid application ID', details: 'The specified application ID does not exist' },
          { status: 400 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 