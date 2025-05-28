"use client";

import { useState, useRef } from 'react';
import SignaturePad from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface DigitalSignatureProps {
  applicationId: number;
  onSignatureComplete: (signatureData: {
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

  const generateSignatureHash = (signatureData: string): string => {
    // In a real implementation, you would use a proper cryptographic hash
    // This is just a placeholder for demonstration
    return btoa(signatureData);
  };

  const generateSignedPDF = async () => {
    if (!termsRef.current || !signaturePadRef.current) return null;

    try {
      // Create PDF
      const pdf = new jsPDF();
      
      // Capture terms content
      const termsCanvas = await html2canvas(termsRef.current);
      const termsImgData = termsCanvas.toDataURL('image/png');
      
      // Add terms to PDF
      pdf.addImage(termsImgData, 'PNG', 10, 10, 190, 0);
      
      // Capture signature
      const signatureData = signaturePadRef.current.toDataURL();
      pdf.addImage(signatureData, 'PNG', 10, pdf.internal.pageSize.height - 50, 100, 30);
      
      // Add metadata
      pdf.setProperties({
        title: 'Alliance Chemical Terms and Conditions',
        subject: 'Signed Terms and Conditions',
        author: 'Alliance Chemical',
        keywords: 'terms, conditions, signature, legal',
        creator: 'Alliance Chemical Digital Signature System'
      });

      // Add timestamp and IP (in a real implementation, this would be server-side)
      const timestamp = new Date().toISOString();
      pdf.text(`Signed on: ${timestamp}`, 10, pdf.internal.pageSize.height - 30);
      
      // Save PDF
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      return pdfUrl;
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate signed document');
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
      const signatureHash = generateSignatureHash(signatureData);

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
              <p className="text-gray-600">Should your account become delinquent and be placed for collection; you agree to pay a finance charge of 1.5% per month (18% per annum) on the unpaid balance. Additionally, you agree to reimburse Alliance Chemical for all costs of collection, including but not limited to collection agency fees, court costs, and reasonable attorney's fees.</p>
            </div>

            <div>
              <h3 className="font-bold text-gray-800 mb-2">4. Returned Payments</h3>
              <p className="text-gray-600">Any returned or dishonored payments, including checks and electronic transfers, will incur a $30.00 service charge. Alliance Chemical reserves the right to require alternative payment methods following a returned payment.</p>
            </div>

            <div>
              <h3 className="font-bold text-gray-800 mb-2">5. Product Returns</h3>
              <ul className="list-disc ml-6 space-y-2 text-gray-600">
                <li><strong>Return Authorization:</strong> No returns will be accepted without prior written authorization in the form of a Return Goods Authorization (RGA) issued by Alliance Chemical.</li>
                <li><strong>Restocking Fees:</strong> All authorized returns are subject to restocking fees and return freight charges, which will be determined at Alliance Chemical's sole discretion.</li>
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
                <li><strong>Proper Use:</strong> You agree to use the products in accordance with the manufacturer's guidelines and all applicable laws and regulations, including those related to health, safety, and the environment.</li>
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