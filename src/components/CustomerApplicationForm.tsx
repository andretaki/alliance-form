"use client";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import DigitalSignature from './DigitalSignature';

// Form validation schema with enhanced validation
const formSchema = z.object({
  // Company Information - REQUIRED
  legalEntityName: z.string()
    .min(2, { message: "Legal Entity Name must be at least 2 characters" })
    .refine(val => !/(test|demo|example|fake|temp)/i.test(val), {
      message: "Please enter your actual company name (no test data)"
    }),
  dba: z.string().optional(),
  
  // Tax ID with format validation - REQUIRED
  taxEIN: z.string()
    .min(1, { message: "Tax EIN is required" })
    .regex(/^(\d{9}|\d{2}-\d{7})$/, { 
      message: "Tax EIN must be 9 digits (will be auto-formatted)" 
    }),
  
  // DUNS strongly recommended but optional
  dunsNumber: z.string()
    .optional()
    .refine(val => !val || /^\d{9}$/.test(val), {
      message: "DUNS Number must be exactly 9 digits"
    }),
  
  // Phone with format validation - REQUIRED
  phoneNo: z.string()
    .min(10, { message: "Phone Number is required" })
    .regex(/^[\(\)\d\s\-\+\.]+$/, { 
      message: "Please enter a valid phone number" 
    }),
  
  // Additional Authorized Purchasers
  hasAdditionalPurchasers: z.boolean().optional(),
  additionalPurchasers: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    title: z.string().optional(),
    email: z.string().email("Valid email is required"),
    phone: z.string().optional()
  })).optional(),
  
  // Business Information - ALL REQUIRED
  industry: z.string().min(1, { message: "Industry selection is required" }),
  companyType: z.string().min(1, { message: "Company type is required" }),
  numberOfEmployees: z.string().min(1, { message: "Number of employees is required" }),
  yearsSinceIncorporation: z.string().min(1, { message: "Years since incorporation is required" }),
  stateIncorporated: z.string().min(1, { message: "State of incorporation is required" }),
  companyValuation: z.string().optional(),
  businessWebsite: z.string()
    .optional()
    .refine(val => !val || /^https?:\/\/.+\..+/.test(val), {
      message: "Please enter a valid website URL"
    }),
  
  // Addresses - REQUIRED with format validation
  billToAddress: z.string()
    .min(5, { message: "Complete billing address is required" }),
  billToCityStateZip: z.string()
    .min(5, { message: "City, State, ZIP is required" })
    .regex(/.*,.*\d{5}/, { 
      message: "Format: City, State ZIP (e.g., Houston, TX 77002)" 
    }),
  shipToAddress: z.string()
    .min(5, { message: "Complete shipping address is required" }),
  shipToCityStateZip: z.string()
    .min(5, { message: "City, State, ZIP is required" })
    .regex(/.*,.*\d{5}/, { 
      message: "Format: City, State ZIP (e.g., Houston, TX 77002)" 
    }),
  
  // Credit Terms - REQUIRED
  requestedCreditAmount: z.number()
    .min(1000, { message: "Minimum credit amount is $1,000" })
    .max(1000000, { message: "Maximum initial credit request is $1,000,000" }),
  isTaxExempt: z.boolean({
    required_error: "Please indicate tax exempt status"
  }),
  usesPaymentPortal: z.boolean({
    required_error: "Please indicate if you use payment portals"
  }),
  
  // Contact Emails - REQUIRED (less strict validation)
  buyerNameEmail: z.string()
    .email({ message: "Valid buyer email is required" })
    .refine(val => !/(test|demo|example|fake|temp)/i.test(val), {
      message: "Please enter a real business email address"
    }),
  accountsPayableNameEmail: z.string()
    .email({ message: "Valid accounts payable email is required" })
    .refine(val => !/(test|demo|example|fake|temp)/i.test(val), {
      message: "Please enter a real business email address"
    }),
  wantInvoicesEmailed: z.boolean().optional(),
  invoiceEmail: z.string()
    .email({ message: "Valid invoice email is required" })
    .optional()
    .refine(val => !val || !/(test|demo|example|fake|temp)/i.test(val), {
      message: "Please enter a real business email address"
    }),
  
  // References
  referenceUploadMethod: z.enum(['upload', 'manual']).default('manual'),
  
  // Bank Reference - At least bank name required
  bankName: z.string()
    .min(1, { message: "Bank name is required for credit evaluation" }),
  bankAccountNumber: z.string().optional(),
  bankContactName: z.string().optional(),
  bankContactPhone: z.string().optional(),
  bankContactEmail: z.string().email().optional(),
  
  // Vendor Forms
  vendorForms: z.array(z.object({
    name: z.string(),
    url: z.string()
  })).optional(),
  
  // Trade References - At least one trade reference required
  trade1Name: z.string()
    .min(1, { message: "At least one trade reference is required" })
    .refine(val => !/(test|demo|example|fake|temp)/i.test(val), {
      message: "Please enter a real trade reference"
    }),
  trade1FaxNo: z.string().optional(),
  trade1Address: z.string().optional(),
  trade1Email: z.string().email().optional(),
  trade1CityStateZip: z.string().optional(),
  trade1Attn: z.string().optional(),
  trade1Phone: z.string()
    .min(1, { message: "Phone number is required for trade reference" }),
  
  trade2Name: z.string().optional(),
  trade2FaxNo: z.string().optional(),
  trade2Address: z.string().optional(),
  trade2Email: z.string().email().optional(),
  trade2CityStateZip: z.string().optional(),
  trade2Attn: z.string().optional(),
  trade2Phone: z.string().optional(),
  
  trade3Name: z.string().optional(),
  trade3FaxNo: z.string().optional(),
  trade3Address: z.string().optional(),
  trade3Email: z.string().email().optional(),
  trade3CityStateZip: z.string().optional(),
  trade3Attn: z.string().optional(),
  trade3Phone: z.string().optional(),
  
  // Business Description - REQUIRED but with relaxed validation
  businessDescription: z.string()
    .min(1, { message: "Business description is required" })
    .max(1000, { message: "Business description must be under 1000 characters" }),
  
  // Terms and conditions agreement - REQUIRED
  termsAgreed: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions to proceed"
  }),
});

export default function CustomerApplicationForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [formData, setFormData] = useState<{ id: number } | null>(null);
  const [signatureData, setSignatureData] = useState<{
    signatureHash: string;
    signedDocumentUrl: string;
  } | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showAdditionalPurchasers, setShowAdditionalPurchasers] = useState(false);
  const [additionalPurchasers, setAdditionalPurchasers] = useState([{ name: '', title: '', email: '', phone: '' }]);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    watch,
    setValue
  } = useForm({
    resolver: zodResolver(formSchema),
    shouldFocusError: true, // Allow normal form focus behavior
    defaultValues: {
      wantInvoicesEmailed: false,
      termsAgreed: false,
      vendorForms: [],
      hasAdditionalPurchasers: false,
      additionalPurchasers: [],
      isTaxExempt: false,
      usesPaymentPortal: false,
      referenceUploadMethod: 'manual' as const
    }
  });
  
  const wantInvoicesEmailed = watch("wantInvoicesEmailed");
  const referenceUploadMethod = watch("referenceUploadMethod");
  
  // Auto-format EIN with dash
  const formatEIN = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Limit to 9 digits
    const limitedDigits = digits.slice(0, 9);
    
    // Add dash after 2nd digit if we have more than 2 digits
    if (limitedDigits.length > 2) {
      return `${limitedDigits.slice(0, 2)}-${limitedDigits.slice(2)}`;
    }
    
    return limitedDigits;
  };

  const handleEINChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatEIN(e.target.value);
    setValue("taxEIN", formatted);
  };
  
  // Industry options
  const industries = [
    'Manufacturing', 'Healthcare', 'Education', 'Research & Development',
    'Automotive', 'Electronics', 'Food & Beverage', 'Pharmaceuticals',
    'Chemical Processing', 'Environmental Services', 'Agriculture', 'Other'
  ];
  
  // Company type options
  const companyTypes = [
    'Corporation', 'LLC', 'Partnership', 'Sole Proprietorship', 
    'Non-Profit', 'Government Entity', 'Other'
  ];
  
  // Employee count options
  const employeeCounts = [
    '1-10', '11-50', '51-100', '101-500', '501-1000', '1000+'
  ];
  
  // Years since incorporation options
  const incorporationYears = [
    'Less than 1 year', '1-2 years', '3-5 years', '6-10 years', 
    '11-20 years', 'More than 20 years'
  ];
  
  // Company valuation ranges
  const valuationRanges = [
    'Under $1M', '$1M - $5M', '$5M - $10M', '$10M - $50M', 
    '$50M - $100M', 'Over $100M', 'Prefer not to disclose'
  ];
  
  // US States
  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  const addAdditionalPurchaser = () => {
    setAdditionalPurchasers([...additionalPurchasers, { name: '', title: '', email: '', phone: '' }]);
  };

  const removeAdditionalPurchaser = (index: number) => {
    const updated = additionalPurchasers.filter((_, i) => i !== index);
    setAdditionalPurchasers(updated);
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // First, submit the application
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit application');
      }

      const result = await response.json();
      console.log('📥 API Response:', result);
      setFormData(result.application); // Extract the application object from the response
      
      // Show signature component after successful submission
      setShowSignature(true);
      
    } catch (err) {
      console.error('Error submitting application:', err);
      setError('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignatureComplete = async (signatureData: {
    signatureHash: string;
    signedDocumentUrl: string;
  }) => {
    try {
      console.log('📝 Submitting signature for application ID:', formData!.id);

      // Get a more appropriate IP address or use a fallback
      const getClientIP = () => {
        // In a real application, you might want to get this from the server
        // For now, we'll use a fallback that works with the validation
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return '127.0.0.1';
        }
        // For production, you might want to call an API to get the real IP
        return '0.0.0.0'; // Fallback IP
      };

      const signaturePayload = {
        applicationId: formData!.id,
        signatureHash: signatureData.signatureHash,
        signedDocumentUrl: signatureData.signedDocumentUrl,
        ipAddress: getClientIP(),
        userAgent: navigator.userAgent,
      };

      console.log('📤 Sending signature payload:', JSON.stringify(signaturePayload, null, 2));

      // Store the signature
      const response = await fetch('/api/signatures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signaturePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Signature API error:', errorData);
        throw new Error(`Failed to store signature: ${errorData.details || errorData.error}`);
      }

      console.log('✅ Signature stored successfully');
      setSignatureData(signatureData);
      setSuccess(true);
      setIsComplete(true);
    } catch (err) {
      console.error('❌ Error storing signature:', err);
      setError('Failed to store signature. Please try again.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Check if we have an application ID
    if (!formData?.id) {
      setError('Please submit your application first before uploading files.');
      return;
    }

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('applicationId', formData.id.toString());

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Upload API error:', errorData);
          throw new Error(`Failed to upload file: ${errorData.details || errorData.error}`);
        }

        const data = await response.json();
        const newFile = {
          name: file.name,
          url: data.vendorForm?.fileUrl || data.url || '#'
        };

        setUploadedFiles(prev => [...prev, newFile]);
        setValue('vendorForms', [...uploadedFiles, newFile]);
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
        <div className="max-w-lg mx-auto">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 text-center transform animate-pulse">
            <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
              Application Submitted Successfully!
            </h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Thank you for your application. We will review your information and contact you shortly.
            </p>
            <button 
              onClick={() => setIsSubmitted(false)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-8 rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Submit Another Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Image
            src="/WIDE - Color on Transparent _RGB-01.png"
            alt="Alliance Chemical Logo"
            width={400}
            height={100}
            className="mx-auto"
          />
          <h1 className="mt-8 text-3xl font-bold text-gray-900">
            Customer Application Form
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Please fill out the form below to apply for credit terms with Alliance Chemical.
          </p>
          
          {/* Requirements Notice */}
          <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-amber-800 mb-2">📋 Required Information</h3>
                <div className="text-sm text-amber-700 space-y-1">
                  <p><strong>Business Details:</strong> Legal company name, Tax EIN (XX-XXXXXXX format), industry, incorporation details</p>
                  <p><strong>Contact Information:</strong> Business emails only (no personal Gmail/Yahoo accounts)</p>
                  <p><strong>Business Description:</strong> Minimum 50 characters describing your business and chemical needs</p>
                  <p><strong>Addresses:</strong> Complete billing and shipping addresses with proper City, State ZIP format</p>
                  <p><strong>References:</strong> At least one trade reference with phone number + bank name required</p>
                  <p><strong>Credit Amount:</strong> Between $1,000 - $1,000,000 initial request</p>
                </div>
                <div className="mt-3 p-3 bg-amber-100 rounded-lg border border-amber-300">
                  <p className="text-sm text-amber-800">
                    <strong>⚠️ Note:</strong> Test data (companies with "test", "demo", "example" in the name) will be automatically rejected. 
                    Please provide real business information for credit evaluation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!showSignature ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Error Summary */}
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">⚠️ Please Fix These Issues</h3>
                    <p className="text-sm text-red-700 mb-3">Please review and correct the following fields to continue:</p>
                    <div className="space-y-1">
                      {Object.entries(errors).map(([field, error]) => {
                        const fieldNames: Record<string, string> = {
                          'legalEntityName': 'Legal Entity Name',
                          'taxEIN': 'Tax EIN',
                          'phoneNo': 'Phone Number',
                          'industry': 'Industry',
                          'companyType': 'Company Type',
                          'numberOfEmployees': 'Number of Employees',
                          'yearsSinceIncorporation': 'Years Since Incorporation',
                          'stateIncorporated': 'State of Incorporation',
                          'billToAddress': 'Billing Address',
                          'billToCityStateZip': 'Billing City, State, ZIP',
                          'shipToAddress': 'Shipping Address',
                          'shipToCityStateZip': 'Shipping City, State, ZIP',
                          'requestedCreditAmount': 'Requested Credit Amount',
                          'isTaxExempt': 'Tax Exempt Status',
                          'usesPaymentPortal': 'Payment Portal Usage',
                          'buyerNameEmail': 'Buyer Email',
                          'accountsPayableNameEmail': 'Accounts Payable Email',
                          'bankName': 'Bank Name',
                          'trade1Name': 'Trade Reference #1 Company Name',
                          'trade1Phone': 'Trade Reference #1 Phone',
                          'businessDescription': 'Business Description',
                          'termsAgreed': 'Terms and Conditions Agreement'
                        };
                        
                        const fieldName = fieldNames[field] || field;
                        const errorMessage = (error as any)?.message || 'Required field';
                        
                        return (
                          <div key={field} className="flex items-start text-sm text-red-700">
                            <span className="font-medium mr-2">•</span>
                            <span><strong>{fieldName}:</strong> {errorMessage}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 p-3 bg-red-100 rounded-lg">
                      <p className="text-sm text-red-800">
                        <strong>💡 Tip:</strong> Scroll down to find the highlighted fields in red and correct the information. 
                        All required fields must be completed to submit your application.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PDF Download Options - Forms Available */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Forms & Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Credit Application PDF */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                  <div className="flex items-start space-x-3">
                    <svg className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-1">Credit Application</h4>
                      <p className="text-sm text-gray-600 mb-3">Download and complete the PDF version</p>
                      <a
                        href="/Alliance Chemical Credit Applicaiton.pdf"
                        download="Alliance-Chemical-Credit-Application.pdf"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download PDF
                      </a>
                    </div>
                  </div>
                </div>

                {/* W9 Form */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                  <div className="flex items-start space-x-3">
                    <svg className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-1">IRS Form W-9</h4>
                      <p className="text-sm text-gray-600 mb-3">Tax form for business transactions</p>
                      <a
                        href="/W9-2025.pdf"
                        download="W9-2025.pdf"
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download W-9
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Complete and email forms to <a href="mailto:sales@alliancechemical.com" className="text-amber-900 underline">sales@alliancechemical.com</a> if you prefer not to use the online form.
                </p>
              </div>
            </div>





            {/* Company Information Section */}
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8 transform hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Company Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Legal Entity Name *
                  </label>
                  <input
                    type="text"
                    {...register("legalEntityName")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="Enter legal entity name"
                  />
                  {errors.legalEntityName && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.legalEntityName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    DBA
                  </label>
                  <input
                    type="text"
                    {...register("dba")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="Doing business as"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Industry *
                  </label>
                  <select
                    {...register("industry")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                  >
                    <option value="">Select Industry</option>
                    {industries.map((industry) => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                  {errors.industry && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.industry.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Company Type *
                  </label>
                  <select
                    {...register("companyType")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                  >
                    <option value="">Select Company Type</option>
                    {companyTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.companyType && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.companyType.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Number of Employees *
                  </label>
                  <select
                    {...register("numberOfEmployees")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                  >
                    <option value="">Select Number of Employees</option>
                    {employeeCounts.map((count) => (
                      <option key={count} value={count}>{count}</option>
                    ))}
                  </select>
                  {errors.numberOfEmployees && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.numberOfEmployees.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Years Since Incorporation *
                  </label>
                  <select
                    {...register("yearsSinceIncorporation")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                  >
                    <option value="">Select Years Since Incorporation</option>
                    {incorporationYears.map((years) => (
                      <option key={years} value={years}>{years}</option>
                    ))}
                  </select>
                  {errors.yearsSinceIncorporation && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.yearsSinceIncorporation.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    State Incorporated *
                  </label>
                  <select
                    {...register("stateIncorporated")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                  >
                    <option value="">Select State</option>
                    {states.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  {errors.stateIncorporated && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.stateIncorporated.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Company Valuation
                  </label>
                  <select
                    {...register("companyValuation")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                  >
                    <option value="">Select Valuation Range</option>
                    {valuationRanges.map((range) => (
                      <option key={range} value={range}>{range}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Tax EIN *
                  </label>
                  <input
                    type="text"
                    {...register("taxEIN")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="123456789 (Enter 9 digits - dash added automatically)"
                    onChange={handleEINChange}
                  />
                  {errors.taxEIN && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.taxEIN.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">Enter 9 digits - we'll automatically format as XX-XXXXXXX</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    DUNS Number
                  </label>
                  <input
                    type="text"
                    {...register("dunsNumber")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="123456789 (9 digits - helps with approval)"
                  />
                  {errors.dunsNumber && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.dunsNumber.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">Optional but recommended for faster approval</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Business Website
                  </label>
                  <input
                    type="url"
                    {...register("businessWebsite")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="https://www.example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    {...register("phoneNo")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="(XXX) XXX-XXXX"
                  />
                  {errors.phoneNo && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.phoneNo.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Business Description *
                  </label>
                  <textarea
                    {...register("businessDescription")}
                    rows={4}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="Describe your business, industry, and why you need chemical products from Alliance Chemical. Include details about your facility, production volumes, and specific chemical needs."
                  />
                  {errors.businessDescription && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.businessDescription.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">Provide detailed information about your business and chemical needs (up to 1000 characters)</p>
                </div>
              </div>
            </div>

            {/* Enhanced Credit Terms & Financial Information */}
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8 transform hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Credit Terms & Financial Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Requested Credit Amount ($) *
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    {...register("requestedCreditAmount", { valueAsNumber: true })}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="5000"
                  />
                  {errors.requestedCreditAmount && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.requestedCreditAmount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Tax Exempt Status *
                  </label>
                  <div className="flex space-x-4 pt-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="true"
                        {...register("isTaxExempt", { setValueAs: (value) => value === "true" })}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Yes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="false"
                        {...register("isTaxExempt", { setValueAs: (value) => value === "true" })}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">No</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Does your company use a payment portal? *
                  </label>
                  <div className="flex space-x-4 pt-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="true"
                        {...register("usesPaymentPortal", { setValueAs: (value) => value === "true" })}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Yes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="false"
                        {...register("usesPaymentPortal", { setValueAs: (value) => value === "true" })}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">No</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Primary Buyer Email *
                  </label>
                  <input
                    type="email"
                    {...register("buyerNameEmail")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="buyer@company.com"
                  />
                  {errors.buyerNameEmail && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.buyerNameEmail.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Accounts Payable Email *
                  </label>
                  <input
                    type="email"
                    {...register("accountsPayableNameEmail")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="ap@company.com"
                  />
                  {errors.accountsPayableNameEmail && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.accountsPayableNameEmail.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Invoice Email Address
                  </label>
                  <input
                    type="email"
                    {...register("invoiceEmail")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="invoices@company.com (optional)"
                  />
                  {errors.invoiceEmail && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.invoiceEmail.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Bank & Trade References */}
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8 transform hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Bank & Trade References</h2>
              </div>

              {/* Reference Upload Method Selection */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">How would you like to provide references?</h3>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="upload"
                      {...register("referenceUploadMethod")}
                      className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Upload Reference Documents</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="manual"
                      {...register("referenceUploadMethod")}
                      className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enter Details Manually</span>
                  </label>
                </div>
              </div>

              {referenceUploadMethod === 'upload' ? (
                <div className="space-y-6">
                  {/* Bank Reference Upload */}
                  <div className="p-6 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Bank Reference</h3>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-amber-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-amber-50">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="mb-2 text-sm text-amber-700">
                            <span className="font-semibold">Click to upload bank reference</span>
                          </p>
                          <p className="text-xs text-amber-600">PDF, DOC, DOCX (MAX. 10MB)</p>
                        </div>
                        <input type="file" className="hidden" accept=".pdf,.doc,.docx" />
                      </label>
                    </div>
                  </div>

                  {/* Trade Reference Upload */}
                  <div className="p-6 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Trade References (minimum 3 required)</h3>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-amber-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-amber-50">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="mb-2 text-sm text-amber-700">
                            <span className="font-semibold">Click to upload trade references</span>
                          </p>
                          <p className="text-xs text-amber-600">PDF, DOC, DOCX (MAX. 10MB each)</p>
                        </div>
                        <input type="file" className="hidden" multiple accept=".pdf,.doc,.docx" />
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Bank Reference Manual Entry */}
                  <div className="p-6 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Bank Reference (Required)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        {...register("bankName")}
                        placeholder="Bank Name *"
                        className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="text"
                        {...register("bankAccountNumber")}
                        placeholder="Account Number (optional)"
                        className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="text"
                        {...register("bankContactName")}
                        placeholder="Bank Contact Name (optional)"
                        className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="tel"
                        {...register("bankContactPhone")}
                        placeholder="Bank Contact Phone (optional)"
                        className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="email"
                        {...register("bankContactEmail")}
                        placeholder="Contact Email"
                        className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 md:col-span-2"
                      />
                    </div>
                  </div>

                  {/* Trade References Manual Entry */}
                  <div className="p-6 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Trade References (minimum 3 required)</h3>
                    
                    {/* Trade Reference 1 */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-700 mb-3">Trade Reference #1</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          {...register("trade1Name")}
                          placeholder="Company Name"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          {...register("trade1Phone")}
                          placeholder="Phone Number"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          {...register("trade1Address")}
                          placeholder="Address"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          {...register("trade1CityStateZip")}
                          placeholder="City, State, ZIP"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="email"
                          {...register("trade1Email")}
                          placeholder="Email"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          {...register("trade1Attn")}
                          placeholder="Attention To"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {/* Trade Reference 2 */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-700 mb-3">Trade Reference #2</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          {...register("trade2Name")}
                          placeholder="Company Name"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          {...register("trade2Phone")}
                          placeholder="Phone Number"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          {...register("trade2Address")}
                          placeholder="Address"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          {...register("trade2CityStateZip")}
                          placeholder="City, State, ZIP"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="email"
                          {...register("trade2Email")}
                          placeholder="Email"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          {...register("trade2Attn")}
                          placeholder="Attention To"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {/* Trade Reference 3 */}
                    <div>
                      <h4 className="font-medium text-gray-700 mb-3">Trade Reference #3</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          {...register("trade3Name")}
                          placeholder="Company Name"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          {...register("trade3Phone")}
                          placeholder="Phone Number"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          {...register("trade3Address")}
                          placeholder="Address"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          {...register("trade3CityStateZip")}
                          placeholder="City, State, ZIP"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="email"
                          {...register("trade3Email")}
                          placeholder="Email"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          {...register("trade3Attn")}
                          placeholder="Attention To"
                          className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="text-center pb-8">
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative inline-flex items-center justify-center px-12 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-2xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-3xl min-w-[280px]"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting Application...
                  </>
                ) : (
                  <>
                    Submit Application
                    <svg className="ml-2 -mr-1 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : isComplete ? (
          // Application Complete Screen
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-12 text-center max-w-2xl mx-auto">
            {/* Success Animation */}
            <div className="mb-8">
              <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
                Application Complete! ✨
              </h1>
              <p className="text-xl text-gray-700 mb-8">
                Thank you for your submission. Your credit application has been successfully processed.
              </p>
            </div>

            {/* Application Details */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-8 border border-green-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">What Happens Next?</h2>
              <div className="space-y-4 text-left">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Application Review</h3>
                    <p className="text-gray-600">Our credit team will review your application and trade references.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Credit Decision</h3>
                    <p className="text-gray-600">You'll receive our credit decision within 2-3 business days.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Account Setup</h3>
                    <p className="text-gray-600">Upon approval, we'll set up your account and provide ordering information.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Application Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Application Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-gray-600">Application ID</p>
                  <p className="font-semibold text-gray-800">#{formData?.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Submission Date</p>
                  <p className="font-semibold text-gray-800">{new Date().toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Digital Signature</p>
                  <p className="font-semibold text-green-600">✓ Completed</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold text-blue-600">Under Review</p>
                </div>
              </div>
            </div>

            {/* Download Signed Document */}
            {signatureData && (
              <div className="mb-8">
                <a
                  href={signatureData.signedDocumentUrl}
                  download="alliance-chemical-terms-signed.pdf"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Signed Document
                </a>
              </div>
            )}

            {/* Contact Information */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Questions?</h3>
              <p className="text-gray-600 mb-4">
                If you have any questions about your application or need assistance, please contact us:
              </p>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Email:</strong> sales@alliancechemical.com</p>
                <p><strong>Phone:</strong> (512) 365-6838</p>
                <p><strong>Hours:</strong> Monday - Friday, 8:00 AM - 5:00 PM EST</p>
              </div>
            </div>

            {/* Optional File Upload */}
            <div className="mt-8 text-left">
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
                  Upload Additional Documents (Optional)
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-amber-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-amber-50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mb-2 text-sm text-amber-700">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-amber-600">PDF, DOC, DOCX (MAX. 10MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Uploaded Files:</h4>
                      <ul className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <li key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-amber-200">
                            <span className="text-sm text-gray-600">{file.name}</span>
                            <span className="text-sm text-green-600 font-medium">✓ Uploaded</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {isUploading && (
                    <div className="flex items-center justify-center mt-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                      <span className="ml-2 text-sm text-amber-700">Uploading...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          formData?.id ? (
            <DigitalSignature
              applicationId={formData.id}
              onSignatureComplete={handleSignatureComplete}
            />
          ) : (
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading signature form...</p>
            </div>
          )
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}