import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Lock, CreditCard } from 'lucide-react';
import Button from './ui/Button';
import { createOrder, verifyPayment, hasUserPurchasedLead } from '../lib/payment';
import { sendPaymentConfirmationEmail, sendLeadDetailsEmail } from '../lib/email';

// Demo mode flag - set to true for testing without real payment
const DEMO_MODE = true;

export interface LeadData {
  id: string;
  title: string;
  description: string;
  category: string;
  company_name: string;
  budget: number;
  phone?: string;
  email?: string;
}

interface PaymentButtonProps {
  lead: LeadData;
  userId: string;
  userEmail: string;
  userName: string;
  onSuccess?: () => void;
}

export default function PaymentButton({ lead, userId, userEmail, userName, onSuccess }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [showContact, setShowContact] = useState(false);

  // Check if already purchased on mount
  useEffect(() => {
    checkPurchaseStatus();
  }, []);

  const checkPurchaseStatus = async () => {
    const isPurchased = await hasUserPurchasedLead(userId, lead.id);
    setPurchased(isPurchased);
    if (isPurchased) {
      setShowContact(true);
    }
  };

  const handlePurchase = async () => {
    setLoading(true);

    try {
      // Create order
      const orderData = await createOrder({
        leadId: lead.id,
        amount: lead.budget,
        userId,
        userEmail,
      });

      if (DEMO_MODE) {
        // Demo mode - simulate payment
        console.log('Demo mode: Simulating payment for lead:', lead.title);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simulate successful payment
        const demoPaymentId = `demo_pay_${Date.now()}`;
        
        // Verify payment (will succeed in demo mode)
        const verifyResult = await verifyPayment({
          razorpayOrderId: orderData.orderId,
          razorpayPaymentId: demoPaymentId,
          razorpaySignature: 'demo_signature',
          leadId: lead.id,
          userId,
        });

        if (verifyResult.success) {
          // Try to send confirmation emails (may fail if Resend not configured)
          try {
            await sendPaymentConfirmationEmail(
              userEmail,
              userName,
              lead.title,
              lead.company_name,
              lead.budget
            );
          } catch (e) {
            console.log('Email sending skipped in demo mode');
          }

          try {
            await sendLeadDetailsEmail(userEmail, userName, {
              title: lead.title,
              company_name: lead.company_name,
              phone: lead.phone || '',
              email: lead.email || '',
              description: lead.description,
              budget: lead.budget,
            });
          } catch (e) {
            console.log('Email sending skipped in demo mode');
          }

          toast.success('Lead purchased successfully! (Demo Mode)');
          setPurchased(true);
          setShowContact(true);
          onSuccess?.();
        } else {
          toast.error('Payment failed');
        }
      } else {
        // Real Razorpay payment
        // Load Razorpay script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        document.body.appendChild(script);

        await new Promise<void>((resolve) => {
          script.onload = () => resolve();
        });

        // Open Razorpay checkout
        const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;

        const options = {
          key: razorpayKeyId,
          name: 'CA Nexus Hub',
          description: `Purchase Lead: ${lead.title}`,
          amount: orderData.amount,
          currency: orderData.currency,
          order_id: orderData.orderId,
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            // Verify payment
            const verifyResult = await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              leadId: lead.id,
              userId,
            });

            if (verifyResult.success) {
              try {
                await sendPaymentConfirmationEmail(
                  userEmail,
                  userName,
                  lead.title,
                  lead.company_name,
                  lead.budget
                );
              } catch (e) {
                console.log('Email sending failed');
              }

              try {
                await sendLeadDetailsEmail(userEmail, userName, {
                  title: lead.title,
                  company_name: lead.company_name,
                  phone: lead.phone || '',
                  email: lead.email || '',
                  description: lead.description,
                  budget: lead.budget,
                });
              } catch (e) {
                console.log('Email sending failed');
              }

              toast.success('Lead purchased successfully!');
              setPurchased(true);
              setShowContact(true);
              onSuccess?.();
            } else {
              toast.error('Payment verification failed');
            }
          },
          prefill: {
            name: userName,
            email: userEmail,
          },
          theme: {
            color: '#4f46e5',
          },
        };

        // @ts-ignore - Razorpay is loaded via script
        const rzp1 = new window.Razorpay(options);
        rzp1.open();
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error?.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  // Show purchased contact details
  if (showContact || purchased) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-emerald-700 mb-3">
          <Lock className="w-4 h-4" />
          <span className="font-semibold">Lead Purchased</span>
        </div>
        <div className="space-y-2">
          <p className="text-sm">
            <span className="font-medium">Phone:</span>{' '}
            <a href={`tel:${lead.phone}`} className="text-indigo-600 hover:underline">
              {lead.phone}
            </a>
          </p>
          <p className="text-sm">
            <span className="font-medium">Email:</span>{' '}
            <a href={`mailto:${lead.email}`} className="text-indigo-600 hover:underline">
              {lead.email}
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Show purchase button
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">Price:</span>
        <span className="text-2xl font-bold text-slate-800">
          ₹{lead.budget.toLocaleString('en-IN')}
        </span>
      </div>
      
      <Button
        onClick={handlePurchase}
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Purchase Lead
          </>
        )}
      </Button>
      
      <p className="text-xs text-center text-slate-500">
        {DEMO_MODE ? 'Demo Mode - No actual payment' : 'Secure payment via Razorpay'}
      </p>
    </div>
  );
}
