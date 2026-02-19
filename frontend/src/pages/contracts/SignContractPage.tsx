import { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '@/config/api';
import { Contract } from '@/types';
import {  
  PencilIcon, 
  ArrowPathIcon,
  DocumentTextIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { 
  CheckCircleIcon as CheckCircleSolid, 
  XCircleIcon as XCircleSolid 
} from '@heroicons/react/24/solid';

// --- Comprehensive Legal Terms (15 Detailed Clauses) ---
const CONTRACT_TERMS = [
  '1. DEFINITIONS AND INTERPRETATION. In this Agreement, unless the context otherwise requires: "Client" refers to the individual or entity signing this contract; "Provider" refers to Dewlons Ltd, a company registered under the laws of Kenya; "Services" means the professional services described in the Contract Details section; "Effective Date" is the date this Agreement is fully executed by both parties. Headings are for convenience only and do not affect interpretation.',
  
  '2. SCOPE OF SERVICES. The Provider agrees to deliver the Services described in the Contract Details section with reasonable skill, care, and diligence, in accordance with industry standards and applicable laws. Any additional services requested by the Client beyond the agreed scope shall be subject to a separate written agreement and additional fees. The Provider reserves the right to subcontract portions of the Services with prior written notice to the Client.',
  
  '3. PAYMENT TERMS. The Client agrees to pay the total amount specified in the Contract Details within seventy-two (72) hours of invoice receipt. Payment shall be made via the agreed method (bank transfer, mobile money, or card payment). Late payments shall incur interest at a rate of 2% per month or the maximum rate permitted by law, whichever is lower. The Provider reserves the right to suspend Services until all outstanding invoices are settled in full.',
  
  '4. COMMENCEMENT AND DELIVERY. Services shall commence only after (a) this Agreement is fully executed by both parties, (b) the initial payment or deposit is received and confirmed, and (c) the Client has provided all necessary information, access, and materials required for service delivery. The Provider shall use commercially reasonable efforts to meet agreed timelines but does not guarantee specific delivery dates unless expressly stated in writing.',
  
  '5. CLIENT OBLIGATIONS. The Client agrees to: (a) provide accurate and complete information necessary for service delivery; (b) respond to Provider inquiries within reasonable timeframes; (c) grant necessary access to systems, accounts, or premises as required; (d) designate a single point of contact for project coordination; and (e) comply with all applicable laws and regulations in their use of the Services. Failure to meet these obligations may result in delays for which the Provider is not liable.',
  
  '6. INTELLECTUAL PROPERTY RIGHTS. All intellectual property created by the Provider in the course of delivering Services, including but not limited to designs, code, documentation, and reports, shall remain the exclusive property of the Provider until full payment is received. Upon full payment, the Client receives a non-exclusive, non-transferable license to use the deliverables for their intended business purpose. Pre-existing intellectual property of either party remains their sole property.',
  
  '7. CONFIDENTIALITY. Both parties agree to maintain the confidentiality of all proprietary information disclosed during the engagement, including business strategies, technical data, customer lists, and financial information. Confidential information shall not be disclosed to third parties without prior written consent, except as required by law. This obligation survives termination of this Agreement for a period of three (3) years.',
  
  '8. DATA PROTECTION AND PRIVACY. The Provider shall process any personal data provided by the Client in accordance with the Kenya Data Protection Act, 2019, and applicable international standards. The Client warrants that they have obtained all necessary consents for sharing personal data with the Provider. Both parties agree to implement appropriate technical and organizational measures to protect data against unauthorized access, loss, or destruction.',
  
  '9. LIMITATION OF LIABILITY. To the maximum extent permitted by law, the Provider shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, revenue, data, or business opportunities, arising from or related to this Agreement. The Provider total aggregate liability shall not exceed the total fees paid by the Client under this Agreement. This limitation does not apply to liability for gross negligence, willful misconduct, or breach of confidentiality obligations.',
  
  '10. TERM AND TERMINATION. This Agreement commences on the Effective Date and continues until completion of the Services, unless terminated earlier. Either party may terminate this Agreement with seven (7) days written notice for material breach by the other party, provided the breach remains uncured after the notice period. The Provider may terminate immediately for non-payment. Upon termination, the Client shall pay for all Services rendered and expenses incurred up to the termination date.',
  
  '11. FORCE MAJEURE. Neither party shall be liable for failure or delay in performing obligations under this Agreement due to circumstances beyond their reasonable control, including but not limited to acts of God, war, civil unrest, government actions, pandemics, natural disasters, or widespread infrastructure failures. The affected party shall notify the other promptly and use reasonable efforts to mitigate the impact.',
  
  '12. DISPUTE RESOLUTION. Any dispute arising from this Agreement shall first be addressed through good-faith negotiation between the parties. If unresolved within fourteen (14) days, the dispute shall be submitted to mediation under the rules of the Chartered Institute of Arbitrators, Kenya Branch. If mediation fails, the dispute shall be finally resolved by binding arbitration in Nairobi, Kenya, under Kenyan law. Each party bears its own legal costs unless the arbitrator awards otherwise.',
  
  '13. GOVERNING LAW AND JURISDICTION. This Agreement shall be governed by and construed in accordance with the laws of the Republic of Kenya. The parties submit to the exclusive jurisdiction of the courts of Kenya for any matters not subject to arbitration under Clause 12. Any legal notices shall be sent to the addresses provided during contract execution or as subsequently updated in writing.',
  
  '14. AMENDMENTS AND ENTIRE AGREEMENT. This Agreement constitutes the entire understanding between the parties regarding the subject matter and supersedes all prior discussions, proposals, or agreements. Any amendment or modification must be in writing, signed by authorized representatives of both parties, and expressly reference this Agreement. No waiver of any provision shall be effective unless in writing and signed by the waiving party.',
  
  '15. ELECTRONIC SIGNATURES AND COUNTERPARTS. The parties acknowledge that electronic signatures, including digital images of handwritten signatures, are legally binding under the Kenya Information and Communications Act and the Electronic Transactions Act. This Agreement may be executed in counterparts, each of which shall be deemed an original, and all of which together constitute one instrument. Transmission of a signed copy by email or other electronic means shall be sufficient to evidence execution.'
];

export function SignContractPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [placeOfSigning, setPlaceOfSigning] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsExpanded, setTermsExpanded] = useState(false);
  
  // Auto-redirect after successful signing
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        window.location.href = 'https://dewlons.com';
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);
  
  // Fetch contract on mount
  useEffect(() => {
    if (token) {
      fetchContract();
    }
  }, [token]);
  
  // Initialize canvas drawing context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1a4d2e';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);
  
  const fetchContract = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<Contract>(`/contracts/sign/${token}/`);
      setContract(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load contract';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    return { x: clientX - rect.left, y: clientY - rect.top };
  };
  
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCanvasCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };
  
  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.closePath();
  };
  
  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  
  const getSignatureBase64 = (): string => {
    const canvas = canvasRef.current;
    return canvas ? canvas.toDataURL('image/png') : '';
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!agreed) {
      setError('You must agree to the terms before signing');
      return;
    }
    if (!placeOfSigning.trim()) {
      setError('Please enter the place of signing');
      return;
    }
    
    const signatureData = getSignatureBase64();
    if (!signatureData || signatureData === 'image/png;base64,') {
      setError('Please provide your signature');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await apiService.post(`/contracts/sign/${token}/submit/`, {
        signature_image: signatureData,
        place_of_signing: placeOfSigning,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign contract';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground-muted">Loading contract...</p>
        </div>
      </div>
    );
  }
  
  // Error State
  if (error && !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary py-12 px-4">
        <div className="max-w-md w-full text-center">
          <XCircleSolid className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Contract Not Found</h1>
          <p className="text-foreground-muted mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-primary text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }
  
  // Success State — Auto-redirect after 5 seconds
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-background to-green-50 dark:from-green-900/20 dark:to-gray-900 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="relative mx-auto mb-6">
            <CheckCircleSolid className="h-20 w-20 text-green-500 mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Contract Signed Successfully</h1>
          <p className="text-foreground-muted mb-6">
            Thank you for signing. Both you and the service provider will receive copies via email.
          </p>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-left mb-6">
            <p className="text-sm text-foreground-muted">Contract Reference</p>
            <p className="font-mono text-primary font-semibold">{contract?.reference_code}</p>
          </div>
          <div className="text-sm text-foreground-muted">
            Redirecting to dewlons.com in{' '}
            <span className="font-bold">5</span> seconds...
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto h-16 w-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <DocumentTextIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Service Agreement</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Reference: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{contract?.reference_code}</span>
          </p>
        </div>
        
        {/* Contract Details */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-primary" />
            Contract Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-foreground-muted">Client</p>
              <p className="font-medium text-foreground">{contract?.client_name}</p>
            </div>
            <div>
              <p className="text-foreground-muted">Amount</p>
              <p className="font-medium text-foreground">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(contract?.amount || 0))}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-foreground-muted">Service</p>
              <p className="text-foreground mt-1">{contract?.service_description}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-foreground-muted">Status</p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500 bg-opacity-10 text-blue-700 dark:text-blue-400 mt-1">
                <CheckIcon className="h-3.5 w-3.5" />
                {contract?.status === 'VIEWED' ? 'Ready for Signature' : contract?.status}
              </span>
            </div>
          </div>
        </div>
        
        {/* Signing Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Sign Contract</h2>
          
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <XCircleSolid className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Error</p>
                <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Terms & Conditions — Scrollable, Expandable */}
            <div className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <InformationCircleIcon className="h-4 w-4 text-foreground-muted" />
                  Terms and Conditions
                </h3>
                <button
                  type="button"
                  onClick={() => setTermsExpanded(!termsExpanded)}
                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                >
                  {termsExpanded ? (
                    <>
                      <ChevronUpIcon className="h-3 w-3" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="h-3 w-3" />
                      Read All 15 Terms
                    </>
                  )}
                </button>
              </div>
              
              <div className={`text-sm text-foreground-muted space-y-3 overflow-y-auto transition-all duration-300 ${termsExpanded ? 'max-h-96' : 'max-h-32'}`}>
                {CONTRACT_TERMS.map((term) => (
                  <p key={term} className="leading-relaxed text-justify">
                    {term}
                  </p>
                ))}
              </div>
              
              <label className="flex items-start gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="h-4 w-4 mt-0.5 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <span className="text-sm text-foreground">
                  I have read, understood, and agree to all <strong>15 terms and conditions</strong> above
                </span>
              </label>
            </div>
            
            {/* Place of Signing */}
            <div>
              <label htmlFor="place_of_signing" className="block text-sm font-medium text-foreground mb-1.5">
                Place of Signing
              </label>
              <input
                id="place_of_signing"
                type="text"
                value={placeOfSigning}
                onChange={(e) => setPlaceOfSigning(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="e.g., Nairobi, Kenya"
                required
              />
            </div>
            
            {/* Signature Pad */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Your Signature</label>
              <div className="border-2 border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden bg-white dark:bg-gray-700">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={220}
                  className="w-full h-52 cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={clearSignature}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-foreground-muted hover:text-primary transition-colors"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  Clear
                </button>
              </div>
              <p className="text-xs text-foreground-muted mt-1">Draw your signature using mouse or finger</p>
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !agreed}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing...
                </>
              ) : (
                <>
                  <PencilIcon className="h-5 w-5" />
                  Sign Contract
                </>
              )}
            </button>
          </form>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-foreground-muted">
            Secure signing page. Your electronic signature is legally binding under Kenyan law.
          </p>
        </div>
      </div>
    </div>
  );
}