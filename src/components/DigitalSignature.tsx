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

export default function DigitalSignature({ onSignatureComplete }: DigitalSignatureProps) {
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
    if (!termsRef.current || !signaturePadRef.current) return null;

    try {
      // Create PDF
      const pdf = new jsPDF();
      
      // Create a temporary clone of the terms content without height restrictions
      // This ensures we capture the complete content, not just the visible portion
      const originalTermsElement = termsRef.current;
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = originalTermsElement.innerHTML;
      
      // Apply the same styling but remove height/overflow restrictions
      tempContainer.style.cssText = `
        width: ${originalTermsElement.offsetWidth}px;
        padding: 24px;
        background: linear-gradient(to bottom right, rgb(249, 250, 251), white);
        border-radius: 16px;
        border: 1px solid rgb(229, 231, 235);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
        position: absolute;
        top: -9999px;
        left: -9999px;
        visibility: hidden;
      `;
      
      // Add to document temporarily
      document.body.appendChild(tempContainer);
      
      try {
        // Capture the complete terms content
        const termsCanvas = await html2canvas(tempContainer, {
          useCORS: true,
          allowTaint: true,
          scale: 2, // Higher scale for better quality
          height: tempContainer.scrollHeight,
          windowHeight: tempContainer.scrollHeight
        });
        const termsImgData = termsCanvas.toDataURL('image/png');
        
        // Calculate if we need multiple pages
        const pageHeight = pdf.internal.pageSize.height;
        const imgHeight = (termsCanvas.height * 190) / termsCanvas.width;
        const remainingHeight = pageHeight - 80; // Leave space for signature and timestamp
        
        if (imgHeight > remainingHeight) {
          // Split content across multiple pages if needed
          const imgWidth = 190;
          const ratio = termsCanvas.width / termsCanvas.height;
          let currentY = 10;
          let sourceY = 0;
          const sourceHeight = termsCanvas.height;
          
          while (sourceY < sourceHeight) {
            const pageRemainingHeight = pageHeight - currentY - 80; // Leave space for signature
            const sectionHeight = Math.min(pageRemainingHeight, (sourceHeight - sourceY) * imgWidth / termsCanvas.width);
            const sourceSectionHeight = (sectionHeight * termsCanvas.width) / imgWidth;
            
            // Create a canvas for this section
            const sectionCanvas = document.createElement('canvas');
            sectionCanvas.width = termsCanvas.width;
            sectionCanvas.height = sourceSectionHeight;
            const sectionCtx = sectionCanvas.getContext('2d');
            
            if (sectionCtx) {
              sectionCtx.drawImage(
                termsCanvas, 
                0, sourceY, termsCanvas.width, sourceSectionHeight,
                0, 0, termsCanvas.width, sourceSectionHeight
              );
              
              const sectionImgData = sectionCanvas.toDataURL('image/png');
              pdf.addImage(sectionImgData, 'PNG', 10, currentY, imgWidth, sectionHeight);
            }
            
            sourceY += sourceSectionHeight;
            
            // Add new page if there's more content
            if (sourceY < sourceHeight) {
              pdf.addPage();
              currentY = 10;
            } else {
              currentY += sectionHeight + 10;
            }
          }
        } else {
          // Single page - add the complete terms image
          pdf.addImage(termsImgData, 'PNG', 10, 10, 190, imgHeight);
        }
        
        // Add signature on the last page
        const signatureData = signaturePadRef.current.toDataURL();
        pdf.addImage(signatureData, 'PNG', 10, pdf.internal.pageSize.height - 50, 100, 30);
        
        // Add timestamp
        const timestamp = new Date().toISOString();
        pdf.text(`Signed on: ${timestamp}`, 10, pdf.internal.pageSize.height - 30);
        
      } finally {
        // Clean up the temporary element
        document.body.removeChild(tempContainer);
      }
      
      // Add metadata
      pdf.setProperties({
        title: 'Alliance Chemical Terms and Conditions',
        subject: 'Signed Terms and Conditions',
        author: 'Alliance Chemical',
        keywords: 'terms, conditions, signature, legal',
        creator: 'Alliance Chemical Digital Signature System'
      });
      
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