"use client";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { sendApplicationSummary } from '../lib/email';

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
  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    watch 
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      wantInvoicesEmailed: false,
      termsAgreed: false
    }
  });
  const wantInvoicesEmailed = watch("wantInvoicesEmailed");
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      // Save to database
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

      // Send email summary
      await sendApplicationSummary(data);
      
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('There was an error submitting your application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-green-600 mb-6">Application Submitted Successfully!</h1>
        <p className="text-center mb-6">Thank you for your application. We will review your information and contact you shortly.</p>
        <button 
          onClick={() => setIsSubmitted(false)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
        >
          Submit Another Application
        </button>
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">Alliance Chemical Customer Application</h1>
      {/* ...form code omitted for brevity, see previous message for full code... */}
    </div>
  );
} 