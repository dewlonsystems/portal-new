import { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '@/config/api';
import { Contract } from '@/types';
import {  
  PencilIcon, 
  ArrowPathIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { 
  CheckCircleIcon as CheckCircleSolid, 
  XCircleIcon as XCircleSolid 
} from '@heroicons/react/24/solid';

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
  
  useEffect(() => {
    if (token) {
      fetchContract();
    }
  }, [token]);
  
  useEffect(() => {
    // Initialize canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1a4d2e'; // Primary color
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
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };
  
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const { x, y } = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };
  
  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
  };
  
  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  
  const getSignatureBase64 = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    return canvas.toDataURL('image/png');
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
    if (!signatureData || signatureData === 'data:image/png;base64,') {
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
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground-muted">Loading contract...</p>
        </div>
      </div>
    );
  }
  
  if (error && !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary py-12 px-4">
        <div className="max-w-md w-full text-center">
          <XCircleSolid className="h-16 w-16 text-error mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Contract Not Found</h1>
          <p className="text-foreground-muted mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }
  
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary py-12 px-4">
        <div className="max-w-md w-full text-center">
          <CheckCircleSolid className="h-16 w-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Contract Signed Successfully!</h1>
          <p className="text-foreground-muted mb-6">
            Thank you for signing. Both you and the service provider will receive copies via email.
          </p>
          <div className="card p-6 text-left">
            <p className="text-sm text-foreground-muted">Contract Reference:</p>
            <p className="font-mono text-primary font-semibold">{contract?.reference_code}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg">
            <DocumentTextIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Service Agreement</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Contract Reference: <span className="font-mono">{contract?.reference_code}</span>
          </p>
        </div>
        
        {/* Contract Details Card */}
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-foreground">Contract Details</h2>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-foreground-muted">Client Name</p>
                <p className="font-medium text-foreground">{contract?.client_name}</p>
              </div>
              <div>
                <p className="text-sm text-foreground-muted">Amount</p>
                <p className="font-medium text-foreground">KES {contract?.amount}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-foreground-muted">Service Description</p>
              <p className="text-foreground mt-1">{contract?.service_description}</p>
            </div>
            
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm text-foreground-muted">Contract Status</p>
              <p className="font-medium text-primary mt-1">
                {contract?.status === 'VIEWED' ? 'Ready for Signature' : contract?.status}
              </p>
            </div>
          </div>
        </div>
        
        {/* Terms and Signature Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-foreground">Sign Contract</h2>
          </div>
          <div className="card-body">
            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg flex items-start gap-3">
                <XCircleSolid className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-error font-medium">Error</p>
                  <p className="text-sm text-error/80">{error}</p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Terms Agreement */}
              <div className="p-4 bg-secondary rounded-lg">
                <h3 className="font-semibold text-foreground mb-3">Terms and Conditions</h3>
                <div className="text-sm text-foreground-muted space-y-2 mb-4 max-h-40 overflow-y-auto">
                  <p>1. By signing this contract, you agree to the service terms outlined above.</p>
                  <p>2. Payment is due within 72 hours of invoice receipt.</p>
                  <p>3. Service will commence upon payment confirmation.</p>
                  <p>4. Both parties agree to the terms specified in this agreement.</p>
                  <p>5. This is a legally binding document once signed.</p>
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                  />
                  <span className="text-sm text-foreground">
                    I have read and agree to the terms and conditions
                  </span>
                </label>
              </div>
              
              {/* Place of Signing */}
              <div>
                <label htmlFor="place_of_signing" className="input-label">
                  Place of Signing
                </label>
                <input
                  id="place_of_signing"
                  type="text"
                  value={placeOfSigning}
                  onChange={(e) => setPlaceOfSigning(e.target.value)}
                  className="input"
                  placeholder="e.g., Nairobi, Kenya"
                  required
                />
              </div>
              
              {/* Signature Pad */}
              <div>
                <label className="input-label">Your Signature</label>
                <div className="border-2 border-border rounded-lg overflow-hidden bg-white">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full h-48 cursor-crosshair touch-none"
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
                    className="btn btn-sm btn-secondary"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Clear Signature
                  </button>
                </div>
                <p className="input-helper mt-2">
                  Draw your signature using your mouse or finger
                </p>
              </div>
              
              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !agreed}
                className="w-full btn btn-primary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <PencilIcon className="h-5 w-5" />
                    <span>Sign Contract</span>
                  </div>
                )}
              </button>
            </form>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-foreground-muted">
            This is a secure signing page. Your signature is legally binding.
          </p>
        </div>
      </div>
    </div>
  );
}