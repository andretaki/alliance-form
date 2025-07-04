import { z } from 'zod';

// Customer Application Validation Schema
export const customerApplicationSchema = z.object({
  legalEntityName: z.string().min(1, { message: "Legal Entity Name is required" }),
  dba: z.string().optional(),
  taxEIN: z.string()
    .min(1, { message: "Tax EIN is required" })
    .regex(/^(\d{9}|\d{2}-\d{7})$/, { 
      message: "Tax EIN must be 9 digits or XX-XXXXXXX format" 
    }),
  dunsNumber: z.string().optional(),
  phoneNo: z.string().min(1, { message: "Phone Number is required" }),
  billToAddress: z.string().min(1, { message: "Billing Address is required" }),
  billToCity: z.string().min(1, { message: "Billing City is required" }),
  billToState: z.string().min(1, { message: "Billing State is required" }),
  billToZip: z.string().min(1, { message: "Billing ZIP code is required" }),
  shipToAddress: z.string().min(1, { message: "Shipping Address is required" }),
  shipToCity: z.string().min(1, { message: "Shipping City is required" }),
  shipToState: z.string().min(1, { message: "Shipping State is required" }),
  shipToZip: z.string().min(1, { message: "Shipping ZIP code is required" }),
  buyerNameEmail: z.string().min(1, { message: "Buyer Name/Email is required" }),
  accountsPayableNameEmail: z.string().min(1, { message: "Accounts Payable Name/Email is required" }),
  wantInvoicesEmailed: z.boolean().optional(),
  invoiceEmail: z.string().optional(),
  // Trade references - updated to separate fields
  trade1Name: z.string().optional(),
  trade1FaxNo: z.string().optional(),
  trade1Address: z.string().optional(),
  trade1Email: z.string().optional(),
  trade1City: z.string().optional(),
  trade1State: z.string().optional(),
  trade1Zip: z.string().optional(),
  trade1Attn: z.string().optional(),
  trade1Phone: z.string().optional(),
  trade2Name: z.string().optional(),
  trade2FaxNo: z.string().optional(),
  trade2Address: z.string().optional(),
  trade2Email: z.string().optional(),
  trade2City: z.string().optional(),
  trade2State: z.string().optional(),
  trade2Zip: z.string().optional(),
  trade2Attn: z.string().optional(),
  trade2Phone: z.string().optional(),
  trade3Name: z.string().optional(),
  trade3FaxNo: z.string().optional(),
  trade3Address: z.string().optional(),
  trade3Email: z.string().optional(),
  trade3City: z.string().optional(),
  trade3State: z.string().optional(),
  trade3Zip: z.string().optional(),
  trade3Attn: z.string().optional(),
  trade3Phone: z.string().optional(),
  // Terms
  termsAgreed: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions"
  }),
});



// Digital Signature Validation Schema
export const digitalSignatureSchema = z.object({
  signatureHash: z.string().min(1, { message: "Signature hash is required" }),
  applicationId: z.number().int().positive({ message: "Valid application ID is required" }),
  ipAddress: z.string().min(1, { message: "IP address is required" }),
  userAgent: z.string().min(1, { message: "User agent is required" }),
  signedDocumentUrl: z.string().min(1, { message: "Valid document URL is required" }).refine(
    (url) => url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:'),
    { message: "Document URL must be a valid URL, blob URL, or data URL" }
  ),
});

// File Upload Validation Schema (for form data)
export const fileUploadSchema = z.object({
  applicationId: z.string().refine(val => !isNaN(parseInt(val)), {
    message: "Valid application ID is required"
  }),
});

// Type exports for better TypeScript support
export type CustomerApplicationData = z.infer<typeof customerApplicationSchema>;

export type DigitalSignatureData = z.infer<typeof digitalSignatureSchema>;
export type FileUploadData = z.infer<typeof fileUploadSchema>; 