"use client";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Form validation schema
const formSchema = z.object({
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

const countries = [
  "United States", "Canada", "United Kingdom", "Germany", "France", "Italy", "Spain", "Netherlands",
  "Belgium", "Switzerland", "Austria", "Sweden", "Norway", "Denmark", "Finland", "Australia",
  "New Zealand", "Japan", "South Korea", "Singapore", "Hong Kong", "Brazil", "Mexico", "Argentina",
  "India", "China", "Thailand", "Malaysia", "Philippines", "Indonesia", "Vietnam", "South Africa"
];

const shippingMethods = [
  "Standard International (7-14 days)",
  "Express International (3-5 days)",
  "Priority Express (1-3 days)",
  "Economy International (14-21 days)",
  "Freight Shipping (LTL)",
  "Air Freight",
  "Ocean Freight",
  "Other"
];

const purposeOptions = [
  "Chemical Manufacturing",
  "Laboratory Use",
  "Industrial Processing",
  "Research & Development",
  "Quality Control",
  "Other"
];

export default function InternationalShippingForm() {
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
      trackingRequired: true,
      insuranceRequired: false,
      termsAgreed: false
    }
  });
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/shipping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit shipping request');
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting shipping request:', error);
      alert('There was an error submitting your shipping request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-6">
        <div className="max-w-lg mx-auto">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
              Shipping Request Submitted!
            </h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Thank you for your international shipping request. We'll process your order and contact you with shipping details and tracking information within 24 hours.
            </p>
            <button 
              onClick={() => setIsSubmitted(false)}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 px-8 rounded-2xl font-semibold hover:from-emerald-700 hover:to-teal-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-8 mb-8">
            <div className="w-24 h-24 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
              International Shipping
            </h1>
            <p className="text-xl text-gray-600 font-medium">Worldwide Delivery Request</p>
          </div>
        </div>
        
        <div className="space-y-8">
          {/* Contact Information Section */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-white/30 p-8 transform hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Contact Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">First Name *</label>
                <input
                  type="text"
                  {...register("firstName")}
                  className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm flex items-center mt-1">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Last Name *</label>
                <input
                  type="text"
                  {...register("lastName")}
                  className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm flex items-center mt-1">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.lastName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Email Address *</label>
                <input
                  type="email"
                  {...register("email")}
                  className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                  placeholder="your@email.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm flex items-center mt-1">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Phone Number *</label>
                <input
                  type="tel"
                  {...register("phone")}
                  className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                  placeholder="+1 (555) 123-4567"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm flex items-center mt-1">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700">Company/Organization</label>
                <input
                  type="text"
                  {...register("company")}
                  className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                  placeholder="Optional company name"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address Section */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-white/30 p-8 transform hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Shipping Address</h2>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700">Street Address *</label>
                  <input
                    type="text"
                    {...register("shippingAddress")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="123 Main Street"
                  />
                  {errors.shippingAddress && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.shippingAddress.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700">Address Line 2</label>
                  <input
                    type="text"
                    {...register("addressLine2")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="Apartment, suite, unit, building, floor, etc."
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">City *</label>
                  <input
                    type="text"
                    {...register("city")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="City name"
                  />
                  {errors.city && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.city.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">State/Province *</label>
                  <input
                    type="text"
                    {...register("stateProvince")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="State or Province"
                  />
                  {errors.stateProvince && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.stateProvince.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Postal Code *</label>
                  <input
                    type="text"
                    {...register("postalCode")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="ZIP or Postal Code"
                  />
                  {errors.postalCode && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.postalCode.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Country *</label>
                  <select
                    {...register("country")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                  >
                    <option value="">Select Country</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  {errors.country && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.country.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Order Details Section */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-white/30 p-8 transform hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Order Details & Request</h2>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Product Description *</label>
                <textarea
                  {...register("productDescription")}
                  rows={3}
                  className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:bg-white/70 resize-none"
                  placeholder="Detailed description of products being shipped"
                />
                {errors.productDescription && (
                  <p className="text-red-500 text-sm flex items-center mt-1">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.productDescription.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Quantity *</label>
                  <input
                    type="text"
                    {...register("quantity")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="e.g., 10 units, 5 boxes, 2.5 kg"
                  />
                  {errors.quantity && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.quantity.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Estimated Value (USD) *</label>
                  <input
                    type="text"
                    {...register("estimatedValue")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="$0.00"
                  />
                  {errors.estimatedValue && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.estimatedValue.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Order Request Details *</label>
                <textarea
                  {...register("orderRequest")}
                  rows={4}
                  className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:bg-white/70 resize-none"
                  placeholder="Please provide specific details about your order request, including any special requirements, packaging preferences, delivery timeline, etc."
                />
                {errors.orderRequest && (
                  <p className="text-red-500 text-sm flex items-center mt-1">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.orderRequest.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Special Instructions</label>
                <textarea
                  {...register("specialInstructions")}
                  rows={3}
                  className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:bg-white/70 resize-none"
                  placeholder="Any special handling, delivery instructions, or other notes"
                />
              </div>
            </div>
          </div>

          {/* Shipping Preferences Section */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-white/30 p-8 transform hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Shipping Preferences</h2>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Shipping Method *</label>
                  <select
                    {...register("shippingMethod")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                  >
                    <option value="">Select Shipping Method</option>
                    {shippingMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                  {errors.shippingMethod && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.shippingMethod.message}
                    </p>
                  )}
                  {watch("shippingMethod") === "Other" && (
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700">Please specify your shipping method</label>
                      <input
                        type="text"
                        {...register("customShippingMethod")}
                        className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:bg-white/70 mt-2"
                        placeholder="Enter your preferred shipping method"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Urgency Level *</label>
                  <select
                    {...register("urgency")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                  >
                    <option value="">Select Urgency</option>
                    <option value="low">Low - Flexible timeline</option>
                    <option value="medium">Medium - Standard delivery</option>
                    <option value="high">High - Urgent delivery</option>
                    <option value="critical">Critical - Emergency shipping</option>
                  </select>
                  {errors.urgency && (
                    <p className="text-red-500 text-sm flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.urgency.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-100">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      {...register("trackingRequired")}
                      className="h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <label className="text-sm font-semibold text-gray-700">
                      Tracking Required
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Real-time tracking updates via email/SMS</p>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-100">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      {...register("insuranceRequired")}
                      className="h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <label className="text-sm font-semibold text-gray-700">
                      Insurance Required
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Full value insurance coverage</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customs & Declaration Section */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-white/30 p-8 transform hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Customs & Declaration</h2>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Purpose of Shipment</label>
                  <select
                    {...register("purposeOfShipment")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                  >
                    <option value="">Select Purpose (Optional)</option>
                    {purposeOptions.map(purpose => (
                      <option key={purpose} value={purpose}>{purpose}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Country of Origin</label>
                  <select
                    {...register("countryOfOrigin")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                  >
                    <option value="">Select Country of Origin (Optional)</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700">HS Code (Harmonized System)</label>
                  <input
                    type="text"
                    {...register("hsCode")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 hover:bg-white/70"
                    placeholder="Optional - 6-10 digit HS classification code"
                  />
                  <p className="text-xs text-gray-500">If known, provide the HS code for faster customs processing</p>
                </div>
              </div>

              {watch("purposeOfShipment") === "Other" && (
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700">Please specify the purpose</label>
                  <input
                    type="text"
                    {...register("customPurpose")}
                    className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 hover:bg-white/70 mt-2"
                    placeholder="Enter the specific purpose of shipment"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Terms and Conditions Section */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-white/30 p-8 transform hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Terms and Conditions</h2>
            </div>
            
            <div className="max-h-80 overflow-y-auto bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-inner">
              <div className="space-y-4 text-sm leading-relaxed">
                <div>
                  <h3 className="font-bold text-gray-800 mb-2">International Shipping Terms</h3>
                  <p className="text-gray-600">By submitting this request, you acknowledge and agree to the following terms for international shipping services.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">1. Customs and Duties</h4>
                  <p className="text-gray-600">You are responsible for all customs duties, taxes, and fees imposed by destination countries. These charges are not included in shipping costs and must be paid by the recipient.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">2. Prohibited Items</h4>
                  <p className="text-gray-600">You confirm that your shipment does not contain any prohibited or restricted items according to international shipping regulations and destination country laws.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">3. Documentation</h4>
                  <p className="text-gray-600">You agree to provide accurate and complete information for all required shipping and customs documentation.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">4. Delivery Times</h4>
                  <p className="text-gray-600">Delivery timeframes are estimates and may be affected by customs processing, weather, or other factors beyond our control.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">5. Liability</h4>
                  <p className="text-gray-600">Liability for loss or damage is limited to the declared value of the shipment unless additional insurance is purchased.</p>
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
                  I agree to the international shipping terms and conditions *
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
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="group relative inline-flex items-center justify-center px-12 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-lg rounded-2xl hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-3xl min-w-[300px]"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Request...
                </>
              ) : (
                <>
                  Submit Shipping Request
                  <svg className="ml-2 -mr-1 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}