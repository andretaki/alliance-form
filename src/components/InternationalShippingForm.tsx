"use client";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Form validation schema
const formSchema = z.object({
  companyName: z.string().min(1, { message: "Company name is required" }),
  contactName: z.string().min(1, { message: "Contact name is required" }),
  email: z.string().email({ message: "Valid email is required" }),
  phone: z.string().min(1, { message: "Phone number is required" }),
  originAddress: z.string().min(1, { message: "Origin address is required" }),
  originCity: z.string().min(1, { message: "City is required" }),
  originState: z.string().min(1, { message: "State/Province is required" }),
  originZip: z.string().min(1, { message: "Postal/ZIP code is required" }),
  originCountry: z.string().min(1, { message: "Country is required" }),
  destinationAddress: z.string().min(1, { message: "Destination address is required" }),
  destinationCity: z.string().min(1, { message: "City is required" }),
  destinationState: z.string().min(1, { message: "State/Province is required" }),
  destinationZip: z.string().min(1, { message: "Postal/ZIP code is required" }),
  destinationCountry: z.string().min(1, { message: "Country is required" }),
  shipmentType: z.enum(["documents", "package", "pallet", "container"], {
    message: "Please select a shipment type"
  }),
  packageCount: z.string().transform(val => parseInt(val) || 0),
  packageDetails: z.array(z.object({
    length: z.string().transform(val => parseFloat(val) || 0),
    width: z.string().transform(val => parseFloat(val) || 0),
    height: z.string().transform(val => parseFloat(val) || 0),
    weight: z.string().transform(val => parseFloat(val) || 0),
    unitOfMeasure: z.enum(["in", "cm"], { message: "Please select unit of measure" }),
    weightUnit: z.enum(["lb", "kg"], { message: "Please select weight unit" }),
  })).min(1, { message: "At least one package is required" }),
  declaredValue: z.string().transform(val => parseFloat(val) || 0),
  currency: z.string().min(1, { message: "Currency is required" }),
  contentsDescription: z.string().min(1, { message: "Description of contents is required" }),
  harmonizedCode: z.string().optional(),
  serviceLevel: z.enum(["standard", "express", "priority"], {
    message: "Please select a service level"
  }),
  requiresInsurance: z.boolean().optional(),
  requiresSignature: z.boolean().optional(),
  isDangerous: z.boolean(),
  isHazardous: z.boolean(),
  specialInstructions: z.string().optional(),
  termsAgreed: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions"
  }),
});

export default function InternationalShippingForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [packageCount, setPackageCount] = useState(1);
  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    watch,
    setValue
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shipmentType: "package",
      serviceLevel: "standard",
      isDangerous: false,
      isHazardous: false,
      requiresInsurance: false,
      requiresSignature: false,
      termsAgreed: false,
      packageDetails: [{ 
        length: "", 
        width: "", 
        height: "", 
        weight: "",
        unitOfMeasure: "in",
        weightUnit: "lb"
      }],
      packageCount: "1",
    }
  });
  const watchShipmentType = watch("shipmentType");
  const watchIsDangerous = watch("isDangerous");
  const watchIsHazardous = watch("isHazardous");
  const handlePackageCountChange = (e) => {
    const count = parseInt(e.target.value) || 1;
    setPackageCount(count);
    setValue("packageCount", e.target.value);
    const currentDetails = watch("packageDetails") || [];
    if (count > currentDetails.length) {
      const newPackages = Array(count - currentDetails.length).fill({
        length: "",
        width: "",
        height: "",
        weight: "",
        unitOfMeasure: "in",
        weightUnit: "lb"
      });
      setValue("packageDetails", [...currentDetails, ...newPackages]);
    } else if (count < currentDetails.length) {
      setValue("packageDetails", currentDetails.slice(0, count));
    }
  };
  const onSubmit = (data) => {
    console.log(data);
    setIsSubmitted(true);
  };
  if (isSubmitted) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-green-600 mb-6">Shipping Quote Request Submitted!</h1>
        <p className="text-center mb-6">Thank you for your international shipping quote request. Our team will review your information and provide pricing options shortly.</p>
        <button 
          onClick={() => setIsSubmitted(false)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
        >
          Submit Another Request
        </button>
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">International Shipping Quote Request</h1>
      {/* ...form code omitted for brevity, see previous message for full code... */}
    </div>
  );
} 