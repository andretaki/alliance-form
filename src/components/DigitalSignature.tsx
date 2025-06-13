"use client";

import { useState, useRef } from 'react';
import SignaturePad from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface DigitalSignatureProps {
  applicationId: number;
  onSignatureComplete: (data: {
    signatureHash: string;
    signedDocumentUrl: string;
  }) => void;
}

export default function DigitalSignature({ applicationId, onSignatureComplete }: DigitalSignatureProps) {
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signaturePadRef = useRef<SignaturePad>(null);
  const termsRef = useRef<HTMLDivElement>(null);

  const clearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const generateSignatureHash = async (signatureData: string): Promise<string> => {
    // Create a proper SHA-256 hash of the signature data
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const generateSignedPDF = async () => {
    if (!signaturePadRef.current) return null;

    try {
      // Create professional PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let currentY = margin;

      // Header with company logo area
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Alliance Chemical', margin, currentY);
      currentY += 8;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Credit Application Terms & Conditions Agreement', margin, currentY);
      currentY += 15;

      // Date and application info
      pdf.setFontSize(10);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, margin, currentY);
      pdf.text(`Application ID: ${applicationId}`, pageWidth - margin - 40, currentY);
      currentY += 15;

      // Terms and Conditions Content
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TERMS AND CONDITIONS', margin, currentY);
      currentY += 10;

      // Professional terms content
      const termsContent = [
        '1. CREDIT TERMS',
        'Payment terms will be established based on credit approval and may include Net 15, Net 30, or COD requirements.',
        '',
        '2. LIABILITY AND INSURANCE',
        'Customer acknowledges responsibility for proper handling, storage, and use of all chemical products purchased.',
        'Customer must maintain appropriate insurance coverage for chemical handling and storage.',
        '',
        '3. COMPLIANCE',
        'Customer agrees to comply with all applicable federal, state, and local regulations regarding chemical',
        'handling, storage, transportation, and disposal.',
        '',
        '4. ORDER FULFILLMENT',
        'Orders are subject to product availability and credit approval. Alliance Chemical reserves the right',
        'to modify or cancel orders based on availability or creditworthiness.',
        '',
        '5. RETURNS AND EXCHANGES',
        'Chemical products may not be returned unless defective or shipped in error. All returns must be',
        'pre-approved and comply with safety regulations.',
        '',
        '6. PRICING',
        'Prices are subject to change without notice. Current pricing will be confirmed at time of order.',
        '',
        '7. FORCE MAJEURE',
        'Alliance Chemical shall not be liable for delays or failures in performance resulting from acts',
        'beyond our reasonable control.',
        '',
        '8. GOVERNING LAW',
        'This agreement shall be governed by the laws of the State of Texas.',
        '',
        '9. ENTIRE AGREEMENT',
        'This agreement constitutes the entire agreement between the parties and supersedes all prior',
        'negotiations, representations, or agreements relating to the subject matter herein.'
      ];

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      termsContent.forEach((line) => {
        if (currentY > pageHeight - 40) {
          pdf.addPage();
          currentY = margin;
        }

        if (line === '') {
          currentY += 4;
        } else if (line.match(/^\d+\./)) {
          // Section headers
          pdf.setFont('helvetica', 'bold');
          pdf.text(line, margin, currentY);
          currentY += 6;
          pdf.setFont('helvetica', 'normal');
        } else {
          // Regular content with text wrapping
          const splitText = pdf.splitTextToSize(line, maxWidth);
          pdf.text(splitText, margin, currentY);
          currentY += splitText.length * 4;
        }
      });

      // Add signature section
      if (currentY > pageHeight - 80) {
        pdf.addPage();
        currentY = margin;
      }

      currentY += 15;
      
      // Signature section header
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DIGITAL SIGNATURE', margin, currentY);
      currentY += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('By signing below, I acknowledge that I have read, understood, and agree to be bound by', margin, currentY);
      currentY += 4;
      pdf.text('the terms and conditions set forth above.', margin, currentY);
      currentY += 15;

      // Signature box
      const signatureBoxWidth = 80;
      const signatureBoxHeight = 30;
      
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, currentY, signatureBoxWidth, signatureBoxHeight);

      // Add signature image
      const signatureData = signaturePadRef.current.toDataURL('image/png', 1.0);
      pdf.addImage(signatureData, 'PNG', margin + 2, currentY + 2, signatureBoxWidth - 4, signatureBoxHeight - 4);

      // Signature details
      currentY += signatureBoxHeight + 8;
      
      pdf.setFontSize(8);
      pdf.text('Signature', margin, currentY);
      
      const timestamp = new Date().toLocaleString();
      const signatureHash = await generateSignatureHash(signatureData);
      
      // Right column for signature details - ensure proper spacing
      const rightColumnX = margin + signatureBoxWidth + 10;
      const rightColumnWidth = pageWidth - rightColumnX - margin;
      
      pdf.text(`Date/Time: ${timestamp}`, rightColumnX, currentY - 8);
      
      const ipAddress = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
      pdf.text(`IP Address: ${ipAddress}`, rightColumnX, currentY - 4);
      
      // Handle long signature hash with text wrapping
      const hashText = `Digital Signature Hash: ${signatureHash}`;
      const wrappedHashText = pdf.splitTextToSize(hashText, rightColumnWidth);
      pdf.text(wrappedHashText, rightColumnX, currentY);

      // Footer
      const footerY = pageHeight - 15;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      const footerText = 'This document was digitally signed and is legally binding.';
      const footerWidth = pdf.getTextWidth(footerText);
      pdf.text(footerText, (pageWidth - footerWidth) / 2, footerY);

      // Add metadata
      pdf.setProperties({
        title: 'Alliance Chemical Credit Agreement - Digitally Signed',
        subject: 'Credit Application Terms and Conditions Agreement',
        author: 'Alliance Chemical',
        keywords: 'credit, terms, conditions, signature, legal, agreement, alliance chemical',
        creator: 'Alliance Chemical Credit Application System'
      });

      // Generate and return blob URL
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      return pdfUrl;
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate signed document. Please try again.');
      return null;
    }
  };

  const handleSign = async () => {
    if (!signaturePadRef.current) return;

    try {
      setIsSigning(true);
      setError(null);

      // Get signature data
      const signatureData = signaturePadRef.current.toDataURL();
      const signatureHash = await generateSignatureHash(signatureData);

      // Generate signed PDF
      const signedDocumentUrl = await generateSignedPDF();
      if (!signedDocumentUrl) {
        throw new Error('Failed to generate signed document');
      }

      // Call the completion handler
      onSignatureComplete({
        signatureHash,
        signedDocumentUrl
      });

    } catch (err) {
      console.error('Error signing document:', err);
      setError('Failed to sign document. Please try again.');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Digital Signature</h2>
        
        {/* Terms and Conditions Display */}
        <div 
          ref={termsRef}
          className="max-h-96 overflow-y-auto bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-inner"
        >
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
              <p className="font-semibold text-gray-800">
                By signing below, you acknowledge that you have read and agree to the terms and conditions. Your signature will be recorded with a timestamp and IP address for verification purposes.
              </p>
              <p className="text-gray-600">
                Please use your mouse or touch screen to sign in the box below. Click &quot;Clear&quot; to start over if needed.
              </p>
            </div>
          </div>
        </div>

        {/* Signature Pad */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Please sign below
          </label>
          <div className="border-2 border-gray-200 rounded-xl bg-white">
            <SignaturePad
              ref={signaturePadRef}
              canvasProps={{
                className: 'w-full h-48 rounded-xl'
              }}
            />
          </div>
          <button
            onClick={clearSignature}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            Clear Signature
          </button>
        </div>

        {error && (
          <div className="text-red-500 text-sm mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleSign}
          disabled={isSigning}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-8 rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSigning ? 'Signing...' : 'Sign Document'}
        </button>
      </div>
    </div>
  );
} 