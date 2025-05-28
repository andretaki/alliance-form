import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@/lib/db';
import { vendorForms } from '@/lib/schema';

const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const applicationId = formData.get('applicationId') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Generate a unique file name
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const key = `vendor-forms/${fileName}`;

    // Create a presigned URL for uploading
    const command = new PutObjectCommand({
      Bucket: 'credit-app-andre',
      Key: key,
      ContentType: file.type,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Upload the file
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to S3');
    }

    // Get the public URL of the uploaded file
    const fileUrl = `https://credit-app-andre.s3.amazonaws.com/${key}`;

    // Store file information in the database
    const [vendorForm] = await db.insert(vendorForms).values({
      applicationId: applicationId ? parseInt(applicationId) : null,
      fileName: file.name,
      fileUrl: fileUrl,
      fileType: file.type,
      fileSize: file.size,
    }).returning();

    return NextResponse.json({ 
      url: fileUrl,
      vendorForm 
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 