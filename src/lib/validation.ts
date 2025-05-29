import { z } from 'zod';

// Customer Application Validation Schema
export const customerApplicationSchema = z.object({
  legalEntityName: z.string().min(1, { message: "Legal Entity Name is required" }),
  dba: z.string().optional(),
  taxEIN: z.string().min(1, { message: "Tax EIN is required" }),
  dunsNumber: z.string().optional(),
  phoneNo: z.string().min(1, { message: "Phone Number is required" }),
  billToAddress: z.string().min(1, { message: "Billing Address is required" }),
  billToCityStateZip: z.string().min(1, { message: "Billing City, State, Zip is required" }),
  shipToAddress: z.string().min(1, { message: "Shipping Address is required" }),
  shipToCityStateZip: z.string().min(1, { message: "Shipping City, State, Zip is required" }),
  buyerNameEmail: z.string().min(1, { message: "Buyer Name/Email is required" }),
  accountsPayableNameEmail: z.string().min(1, { message: "Accounts Payable Name/Email is required" }),
  wantInvoicesEmailed: z.boolean().optional(),
  invoiceEmail: z.string().optional(),
  // Trade references
  trade1Name: z.string().optional(),
  trade1FaxNo: z.string().optional(),
  trade1Address: z.string().optional(),
  trade1Email: z.string().optional(),
  trade1CityStateZip: z.string().optional(),
  trade1Attn: z.string().optional(),
  trade2Name: z.string().optional(),
  trade2FaxNo: z.string().optional(),
  trade2Address: z.string().optional(),
  trade2Email: z.string().optional(),
  trade2CityStateZip: z.string().optional(),
  trade2Attn: z.string().optional(),
  trade3Name: z.string().optional(),
  trade3FaxNo: z.string().optional(),
  trade3Address: z.string().optional(),
  trade3Email: z.string().optional(),
  trade3CityStateZip: z.string().optional(),
  trade3Attn: z.string().optional(),
  // Terms
  termsAgreed: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions"
  }),
});

// International Shipping Request Validation Schema
export const shippingRequestSchema = z.object({
  // Contact Information
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Valid email is required" }),
  phone: z.string().min(1, { message: "Phone number is required" }),
  company: z.string().optional(),
  
  // Shipping Address
  shippingAddress: z.string().min(1, { message: "Shipping address is required" }),
  addressLine2: z.string().optional(),
  city: z.string().min(1, { message: "City is required" }),
  stateProvince: z.string().min(1, { message: "State/Province is required" }),
  postalCode: z.string().min(1, { message: "Postal code is required" }),
  country: z.string().min(1, { message: "Country is required" }),
  
  // Order Details
  productDescription: z.string().min(1, { message: "Product description is required" }),
  quantity: z.string().min(1, { message: "Quantity is required" }),
  estimatedValue: z.string().min(1, { message: "Estimated value is required" }),
  orderRequest: z.string().min(1, { message: "Order request details are required" }),
  specialInstructions: z.string().optional(),
  
  // Shipping Preferences
  shippingMethod: z.string().min(1, { message: "Shipping method is required" }),
  customShippingMethod: z.string().optional(),
  urgency: z.string().min(1, { message: "Urgency level is required" }),
  trackingRequired: z.boolean().optional(),
  insuranceRequired: z.boolean().optional(),
  
  // Customs & Declaration
  purposeOfShipment: z.string().optional(),
  customPurpose: z.string().optional(),
  hsCode: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  
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
  signedDocumentUrl: z.string().url({ message: "Valid document URL is required" }),
});

// File Upload Validation Schema (for form data)
export const fileUploadSchema = z.object({
  applicationId: z.string().refine(val => !isNaN(parseInt(val)), {
    message: "Valid application ID is required"
  }),
});

// Type exports for better TypeScript support
export type CustomerApplicationData = z.infer<typeof customerApplicationSchema>;
export type ShippingRequestData = z.infer<typeof shippingRequestSchema>;
export type DigitalSignatureData = z.infer<typeof digitalSignatureSchema>;
export type FileUploadData = z.infer<typeof fileUploadSchema>; 