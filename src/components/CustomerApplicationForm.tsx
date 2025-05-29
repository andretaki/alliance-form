"use client";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import DigitalSignature from './DigitalSignature';

// Form validation schema
const formSchema = z.object({
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
  // Vendor Forms
  vendorForms: z.array(z.object({
    name: z.string(),
    url: z.string()
  })).optional(),
  // References
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
  // Terms and conditions agreement
  termsAgreed: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions"
  }),
});

export default function CustomerApplicationForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<{ id: number } | null>(null);
  const [signatureData, setSignatureData] = useState<{
    signatureHash: string;
    signedDocumentUrl: string;
  } | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    watch,
    setValue
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      wantInvoicesEmailed: false,
      termsAgreed: false,
      vendorForms: []
    }
  });
  const wantInvoicesEmailed = watch("wantInvoicesEmailed");
  
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
        </div>

        {!showSignature ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
                    Tax EIN *
                  </label>
                  <input
                    type="text"
                    {...register("taxEIN")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="XX-XXXXXXX"
                  />
                  {errors.taxEIN && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.taxEIN.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    DUNS Number
                  </label>
                  <input
                    type="text"
                    {...register("dunsNumber")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="9-digit number"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
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
              </div>
            </div>

            {/* W9 Download Section */}
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8 transform hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-rose-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Required Documents</h2>
              </div>
              
              <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-6 border border-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">W-9 Form</h3>
                    <p className="text-gray-600">Download our W-9 form for tax purposes</p>
                  </div>
                  <a
                    href="/W9-2025.pdf"
                    download="Alliance-Chemical-W9-2025.pdf"
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold rounded-xl hover:from-red-700 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-red-500/50 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download W-9
                  </a>
                </div>
              </div>
            </div>

            {/* Billing Address Section */}
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8 transform hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Billing Address</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Bill To Address *
                  </label>
                  <input
                    type="text"
                    {...register("billToAddress")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="Street address"
                  />
                  {errors.billToAddress && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.billToAddress.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    City, State, Zip *
                  </label>
                  <input
                    type="text"
                    {...register("billToCityStateZip")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="City, State ZIP"
                  />
                  {errors.billToCityStateZip && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.billToCityStateZip.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Shipping Address Section */}
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8 transform hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Shipping Address</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Ship To Address *
                  </label>
                  <input
                    type="text"
                    {...register("shipToAddress")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="Street address"
                  />
                  {errors.shipToAddress && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.shipToAddress.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    City, State, Zip *
                  </label>
                  <input
                    type="text"
                    {...register("shipToCityStateZip")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="City, State ZIP"
                  />
                  {errors.shipToCityStateZip && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.shipToCityStateZip.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8 transform hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Contact Information</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Buyer Name/Email *
                  </label>
                  <input
                    type="text"
                    {...register("buyerNameEmail")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="John Doe / john@company.com"
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
                    Accounts Payable Name/Email *
                  </label>
                  <input
                    type="text"
                    {...register("accountsPayableNameEmail")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="Jane Smith / ap@company.com"
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

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      {...register("wantInvoicesEmailed")}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="text-sm font-semibold text-gray-700">
                      Do you want your invoices emailed?
                    </label>
                  </div>

                  {wantInvoicesEmailed && (
                    <div className="mt-4 space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Invoice Email Address
                      </label>
                      <input
                        type="email"
                        {...register("invoiceEmail")}
                        className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        placeholder="invoices@company.com"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Trade References Section */}
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8 transform hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Trade References</h2>
              </div>
              
              {/* Reference 1 */}
              <div className="mb-8 p-6 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl border border-cyan-100">
                <h3 className="text-lg font-semibold mb-4 text-cyan-800">Reference 1</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Company Name</label>
                    <input
                      type="text"
                      {...register("trade1Name")}
                      className="w-full px-4 py-3 bg-white border border-cyan-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
                      placeholder="Company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Fax No</label>
                    <input
                      type="text"
                      {...register("trade1FaxNo")}
                      className="w-full px-4 py-3 bg-white border border-cyan-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
                      placeholder="Fax number"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Address</label>
                    <input
                      type="text"
                      {...register("trade1Address")}
                      className="w-full px-4 py-3 bg-white border border-cyan-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
                      placeholder="Street address"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Email</label>
                    <input
                      type="email"
                      {...register("trade1Email")}
                      className="w-full px-4 py-3 bg-white border border-cyan-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
                      placeholder="Email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">City, State, Zip</label>
                    <input
                      type="text"
                      {...register("trade1CityStateZip")}
                      className="w-full px-4 py-3 bg-white border border-cyan-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
                      placeholder="City, State ZIP"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Attention</label>
                    <input
                      type="text"
                      {...register("trade1Attn")}
                      className="w-full px-4 py-3 bg-white border border-cyan-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
                      placeholder="Contact person"
                    />
                  </div>
                </div>
              </div>

              {/* Reference 2 */}
              <div className="mb-8 p-6 bg-gradient-to-r from-teal-50 to-green-50 rounded-2xl border border-teal-100">
                <h3 className="text-lg font-semibold mb-4 text-teal-800">Reference 2</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Company Name</label>
                    <input
                      type="text"
                      {...register("trade2Name")}
                      className="w-full px-4 py-3 bg-white border border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300"
                      placeholder="Company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Fax No</label>
                    <input
                      type="text"
                      {...register("trade2FaxNo")}
                      className="w-full px-4 py-3 bg-white border border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300"
                      placeholder="Fax number"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Address</label>
                    <input
                      type="text"
                      {...register("trade2Address")}
                      className="w-full px-4 py-3 bg-white border border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300"
                      placeholder="Street address"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Email</label>
                    <input
                      type="email"
                      {...register("trade2Email")}
                      className="w-full px-4 py-3 bg-white border border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300"
                      placeholder="Email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">City, State, Zip</label>
                    <input
                      type="text"
                      {...register("trade2CityStateZip")}
                      className="w-full px-4 py-3 bg-white border border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300"
                      placeholder="City, State ZIP"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Attention</label>
                    <input
                      type="text"
                      {...register("trade2Attn")}
                      className="w-full px-4 py-3 bg-white border border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300"
                      placeholder="Contact person"
                    />
                  </div>
                </div>
              </div>

              {/* Reference 3 */}
              <div className="mb-6 p-6 bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border border-violet-100">
                <h3 className="text-lg font-semibold mb-4 text-violet-800">Reference 3</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Company Name</label>
                    <input
                      type="text"
                      {...register("trade3Name")}
                      className="w-full px-4 py-3 bg-white border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-300"
                      placeholder="Company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Fax No</label>
                    <input
                      type="text"
                      {...register("trade3FaxNo")}
                      className="w-full px-4 py-3 bg-white border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-300"
                      placeholder="Fax number"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Address</label>
                    <input
                      type="text"
                      {...register("trade3Address")}
                      className="w-full px-4 py-3 bg-white border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-300"
                      placeholder="Street address"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Email</label>
                    <input
                      type="email"
                      {...register("trade3Email")}
                      className="w-full px-4 py-3 bg-white border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-300"
                      placeholder="Email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">City, State, Zip</label>
                    <input
                      type="text"
                      {...register("trade3CityStateZip")}
                      className="w-full px-4 py-3 bg-white border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-300"
                      placeholder="City, State ZIP"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Attention</label>
                    <input
                      type="text"
                      {...register("trade3Attn")}
                      className="w-full px-4 py-3 bg-white border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-300"
                      placeholder="Contact person"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions Section */}
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8 transform hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Terms and Conditions</h2>
              </div>
              
              <div className="max-h-96 overflow-y-auto bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-inner">
                <div className="space-y-6 text-sm leading-relaxed">
                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">1. Use of Information</h3>
                    <p className="text-gray-600">The information you provide will be used to: (a) Establish an account with Alliance Chemical, and (b) Assess your creditworthiness if you request credit terms. You expressly authorize Alliance Chemical to contact all provided references and credit agencies to verify your credit and financial responsibility.</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">2. Payment Terms</h3>
                    <p className="text-gray-600">All invoices are due and payable according to the terms specified therein. If your account becomes past due, Alliance Chemical reserves the right, at its sole discretion, to suspend or cancel any future orders until your account is brought current. Alliance Chemical may also terminate any agreements or arrangements without further notice.</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">3. Late Payments and Collection Costs</h3>
                    <p className="text-gray-600">Should your account become delinquent and be placed for collection; you agree to pay a finance charge of 1.5% per month (18% per annum) on the unpaid balance. Additionally, you agree to reimburse Alliance Chemical for all costs of collection, including but not limited to collection agency fees, court costs, and reasonable attorney&apos;s fees.</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">4. Returned Payments</h3>
                    <p className="text-gray-600">Any returned or dishonored payments, including checks and electronic transfers, will incur a $30.00 service charge. Alliance Chemical reserves the right to require alternative payment methods following a returned payment.</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">5. Product Returns</h3>
                    <ul className="list-disc ml-6 space-y-2 text-gray-600">
                      <li><strong>Return Authorization:</strong> No returns will be accepted without prior written authorization in the form of a Return Goods Authorization (RGA) issued by Alliance Chemical.</li>
                      <li><strong>Restocking Fees:</strong> All authorized returns are subject to restocking fees and return freight charges, which will be determined at Alliance Chemical&apos;s sole discretion.</li>
                      <li><strong>Condition of Products:</strong> Returned products must be in their original, unopened containers and in resalable condition. Alliance Chemical reserves the right to reject any returns that do not meet these criteria.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">6. Compliance with Laws and Regulations</h3>
                    <p className="text-gray-600">You are responsible for complying with all applicable federal, state, and local laws and regulations related to the purchase, storage, handling, and use of chemical products supplied by Alliance Chemical. This includes obtaining any necessary permits or licenses required for the possession and use of such chemicals.</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">7. Product Handling and Safety</h3>
                    <ul className="list-disc ml-6 space-y-2 text-gray-600">
                      <li><strong>Assessment of Suitability:</strong> It is your sole responsibility to determine the suitability and safety of the chemical products and containers supplied by Alliance Chemical for your intended use.</li>
                      <li><strong>Safety Data Sheets (SDS):</strong> You acknowledge receipt of, or access to, Safety Data Sheets for all chemical products purchased and agree to review and understand all safety information prior to use.</li>
                      <li><strong>Proper Use:</strong> You agree to use the products in accordance with the manufacturer&apos;s guidelines and all applicable laws and regulations, including those related to health, safety, and the environment.</li>
                      <li><strong>Indemnification:</strong> You agree to indemnify and hold harmless Alliance Chemical from any and all claims, damages, or liabilities arising from your handling, storage, or use of the products.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">8. Limitation of Liability</h3>
                    <p className="text-gray-600">Alliance Chemical shall not be liable for any indirect, incidental, consequential, or special damages arising out of or in connection with the products or services provided, including but not limited to damages for loss of profits, business interruption, or any other commercial damages or losses.</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">9. Force Majeure</h3>
                    <p className="text-gray-600">Alliance Chemical shall not be responsible for any delays or failures in performance resulting from acts beyond its reasonable control, including but not limited to natural disasters, acts of war, terrorism, labor disputes, or governmental regulations.</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">10. Governing Law</h3>
                    <p className="text-gray-600">These terms and conditions shall be governed by and construed in accordance with the laws of the state in which Alliance Chemical is headquartered, without regard to its conflict of law provisions.</p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-300">
                    <p className="font-semibold text-gray-800">Your signature below indicates your acceptance of and agreement to the terms and conditions as stated above.</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-6 border border-rose-100">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    {...register("termsAgreed")}
                    className="h-5 w-5 text-rose-600 focus:ring-rose-500 border-gray-300 rounded"
                  />
                  <label className="text-sm font-semibold text-gray-700">
                    I agree to the terms and conditions stated above *
                  </label>
                </div>
                {errors.termsAgreed && (
                  <p className="text-red-500 text-sm flex items-center mt-3">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.termsAgreed.message}
                  </p>
                )}
              </div>
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

        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600">
              Your application has been submitted successfully! We will review it and contact you shortly.
            </p>
            {signatureData && (
              <div className="mt-4">
                <p className="text-green-600">
                  Your digital signature has been recorded. You can download a copy of the signed document below.
                </p>
                <a
                  href={signatureData.signedDocumentUrl}
                  download="alliance-chemical-terms-signed.pdf"
                  className="mt-2 inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Download Signed Document
                </a>
              </div>
            )}

            {/* File Upload Section - Only shown after successful signature */}
            <div className="mt-8 bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Upload Additional Documents (Optional)</h2>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-100">
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
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Uploaded Files:</h3>
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

                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> You can now upload any additional documents such as vendor forms, certifications, or other supporting materials for your application.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}