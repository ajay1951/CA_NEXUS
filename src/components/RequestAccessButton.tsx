import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Hand, Lock, Clock, CheckCircle, CreditCard } from 'lucide-react';
import Button from './ui/Button';
import { requestLeadAccess, getUserRequestForLead } from '../lib/leadRequests';

export interface LeadData {
  id: string;
  title: string;
  description: string;
  category: string;
  company_name: string;
  budget: number;
  phone?: string;
  email?: string;
  status?: string;
}

interface RequestAccessButtonProps {
  lead: LeadData;
  userId: string;
  onSuccess?: () => void;
}

export default function RequestAccessButton({ lead, userId, onSuccess }: RequestAccessButtonProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  // Check if user already has a request for this lead
  useEffect(() => {
    checkRequestStatus();
  }, [lead.id, userId]);

  const checkRequestStatus = async () => {
    try {
      const existingRequest = await getUserRequestForLead(lead.id, userId);
      if (existingRequest) {
        setRequested(true);
        if (existingRequest.status === 'approved') {
          setRequestStatus('approved');
        } else if (existingRequest.status === 'pending') {
          setRequestStatus('pending');
        } else {
          setRequestStatus('rejected');
        }
      }
    } catch (error) {
      console.error('Error checking request status:', error);
    }
  };

  const handleRequest = async () => {
    setLoading(true);

    try {
      const result = await requestLeadAccess(lead.id, userId);

      if (result.success) {
        setRequested(true);
        setRequestStatus('pending');
        toast.success('Request submitted! Admin will review shortly.');
        onSuccess?.();
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      console.error('Request error:', error);
      toast.error(error?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  // Already requested - show status
  if (requested && requestStatus === 'pending') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-center gap-3 text-amber-700 mb-3">
          <Clock className="w-5 h-5" />
          <span className="font-semibold">Request Pending</span>
        </div>
        <p className="text-amber-600 text-sm">
          Your request for this lead is being reviewed by admin. 
          You'll be notified once approved.
        </p>
      </div>
    );
  }

  if (requested && requestStatus === 'approved') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
        <div className="flex items-center gap-3 text-emerald-700 mb-3">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold">Access Approved!</span>
        </div>
        <p className="text-emerald-600 text-sm mb-4">
          Your request is approved. Complete payment to unlock lead contact details.
        </p>
        <Button
          onClick={() => navigate(`/payment/${lead.id}`, { state: { lead } })}
          className="w-full"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Pay Now To Unlock
        </Button>
      </div>
    );
  }

  // Default - show request button
  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-indigo-600" />
          <div>
            <p className="font-medium text-indigo-800">Exclusive Access</p>
            <p className="text-sm text-indigo-600">
              Once approved, this lead is yours alone. Never shared with competitors.
            </p>
          </div>
        </div>
      </div>
      
      <Button
        onClick={handleRequest}
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting Request...
          </>
        ) : (
          <>
            <Hand className="w-4 h-4 mr-2" />
            Request Access
          </>
        )}
      </Button>
      
      <p className="text-xs text-center text-slate-500">
        Your request will be reviewed by admin. Approved leads are locked exclusively to you.
      </p>
    </div>
  );
}
