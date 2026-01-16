'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { X, DollarSign, Calendar, FileText, Download, CheckCircle, XCircle } from 'lucide-react';
import { getString } from '@/lib/type-utils';

interface AddFeeModalProps {
  student: {
    id: string;
    admission_no: string;
    student_name: string;
    class: string;
    section: string;
  };
  accountant: {
    id: string;
    staff_id: string;
    full_name: string;
    school_code: string;
  };
  school: {
    id: string;
    school_name: string;
    school_code: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddFeeModal({
  student,
  accountant,
  school,
  onClose,
  onSuccess,
}: AddFeeModalProps) {
  const [formData, setFormData] = useState({
    amount: '',
    transport_fee: '',
    payment_mode: 'cash' as 'cash' | 'online' | 'cheque' | 'card' | 'bank_transfer',
    receipt_no: '',
    payment_date: new Date().toISOString().split('T')[0],
    remarks: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  interface SubmittedFee {
    id: string;
    [key: string]: unknown;
  }
  interface SubmittedFormData {
    [key: string]: unknown;
  }
  const [submittedFee, setSubmittedFee] = useState<SubmittedFee | null>(null);
  const [submittedFormData, setSubmittedFormData] = useState<SubmittedFormData | null>(null);

  const generateReceiptNo = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RCP-${school.school_code}-${timestamp}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      setLoading(false);
      return;
    }

    if (!formData.receipt_no.trim()) {
      setError('Receipt number is required');
      setLoading(false);
      return;
    }

    try {
      const totalAmount = parseFloat(formData.amount) + (formData.transport_fee ? parseFloat(formData.transport_fee) : 0);
      
      const response = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: school.school_code,
          student_id: student.id,
          admission_no: student.admission_no,
          amount: parseFloat(formData.amount),
          transport_fee: formData.transport_fee ? parseFloat(formData.transport_fee) : null,
          total_amount: totalAmount,
          payment_mode: formData.payment_mode,
          receipt_no: formData.receipt_no,
          payment_date: formData.payment_date,
          collected_by: accountant.id,
          remarks: formData.remarks || null,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setSuccess(true);
        setSubmittedFee(result.data);
        setSubmittedFormData({ ...formData });
        setError('');
        // Call onSuccess after a delay to show success message
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setSuccess(false);
        const errorMessage = result.error || 'Failed to record fee payment';
        const errorDetails = result.details ? `: ${result.details}` : '';
        const errorHint = result.hint ? ` (${result.hint})` : '';
        setError(`${errorMessage}${errorDetails}${errorHint}`);
        console.error('Fee submission error:', result);
      }
    } catch (err) {
      console.error('Error recording fee:', err);
      setSuccess(false);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = () => {
    if (!submittedFee) return;

    // Extract all values using getString to safely handle unknown types
    const receiptNo = getString(submittedFee.receipt_no) || 'N/A';
    const paymentDate = getString(submittedFee.payment_date);
    const paymentMode = getString(submittedFee.payment_mode) || 'cash';
    const remarks = getString(submittedFee.remarks);
    const accountantName = (submittedFee.accountant && typeof submittedFee.accountant === 'object' && 'full_name' in submittedFee.accountant)
      ? getString(submittedFee.accountant.full_name)
      : null;
    
    const formAmount = submittedFormData ? getString(submittedFormData.amount) || '0' : '0';
    const formTransportFee = submittedFormData ? getString(submittedFormData.transport_fee) : null;

    // Fetch student parent information
    fetch(`/api/students/${student.id}?school_code=${school.school_code}`)
      .then(res => res.json())
      .then(result => {
        const studentData = result.data || {};
        const parentName = getString(studentData.parent_name) || 'N/A';
        
        // Format payment date
        const formattedPaymentDate = paymentDate 
          ? new Date(paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
          : 'N/A';
        
        // Format payment mode
        const formattedPaymentMode = paymentMode.charAt(0).toUpperCase() + paymentMode.slice(1).replace('_', ' ');
        
        // Calculate amounts
        const amount = parseFloat(formAmount) || 0;
        const transportFee = formTransportFee ? parseFloat(formTransportFee) : 0;
        const totalAmount = amount + transportFee;
        
        // Create PDF content
        const receiptContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Fee Receipt - ${receiptNo}</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  max-width: 800px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  text-align: center;
                  border-bottom: 3px solid #000;
                  padding-bottom: 20px;
                  margin-bottom: 30px;
                }
                .school-name {
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 10px;
                }
                .receipt-title {
                  font-size: 20px;
                  margin-top: 10px;
                }
                .details {
                  margin: 30px 0;
                }
                .detail-row {
                  display: flex;
                  justify-content: space-between;
                  padding: 10px 0;
                  border-bottom: 1px solid #ddd;
                }
                .detail-label {
                  font-weight: bold;
                  width: 200px;
                }
                .detail-value {
                  flex: 1;
                }
                .amount-section {
                  background: #f5f5f5;
                  padding: 20px;
                  margin: 20px 0;
                  border-radius: 5px;
                }
                .total {
                  font-size: 18px;
                  font-weight: bold;
                  text-align: right;
                  margin-top: 10px;
                }
                .footer {
                  margin-top: 40px;
                  text-align: center;
                  border-top: 2px solid #000;
                  padding-top: 20px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="school-name">${school.school_name}</div>
                <div class="receipt-title">FEE RECEIPT</div>
              </div>
              
              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Receipt Number:</span>
                  <span class="detail-value">${receiptNo}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Payment Date:</span>
                  <span class="detail-value">${formattedPaymentDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Student Name:</span>
                  <span class="detail-value">${student.student_name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Admission Number:</span>
                  <span class="detail-value">${student.admission_no}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Class:</span>
                  <span class="detail-value">${student.class}-${student.section}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Parent Name:</span>
                  <span class="detail-value">${parentName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Payment Mode:</span>
                  <span class="detail-value">${formattedPaymentMode}</span>
                </div>
              </div>

              <div class="amount-section">
                <div class="detail-row">
                  <span class="detail-label">Fee Amount:</span>
                  <span class="detail-value">₹${amount.toLocaleString('en-IN')}</span>
                </div>
                ${transportFee > 0 ? `
                <div class="detail-row">
                  <span class="detail-label">Transport Fee:</span>
                  <span class="detail-value">₹${transportFee.toLocaleString('en-IN')}</span>
                </div>
                ` : ''}
                <div class="total">
                  Total Amount: ₹${totalAmount.toLocaleString('en-IN')}
                </div>
              </div>

              ${remarks ? `
              <div class="details">
                <div class="detail-label">Remarks:</div>
                <div>${remarks}</div>
              </div>
              ` : ''}

              <div class="footer">
                <div>Collected by: ${accountantName || accountant.full_name}</div>
                <div style="margin-top: 20px;">This is a computer-generated receipt.</div>
              </div>
            </body>
          </html>
        `;

        // Create blob and download
        const blob = new Blob([receiptContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Receipt-${receiptNo}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Also try to print as PDF if possible
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(receiptContent);
          printWindow.document.close();
          printWindow.print();
        }
      })
      .catch(err => {
        console.error('Error fetching student data:', err);
        // Still generate receipt without parent name
        alert('Receipt downloaded, but parent information could not be fetched.');
      });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <Card className="relative max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Add Fee Payment</h2>
              <p className="text-sm text-gray-600 mt-1">Record fee payment for student</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Student Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Student Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Student Name</p>
                <p className="text-sm font-medium text-gray-900">{student.student_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Admission No</p>
                <p className="text-sm font-medium text-gray-900">{student.admission_no}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Class</p>
                <p className="text-sm font-medium text-gray-900">{student.class}-{student.section}</p>
              </div>
            </div>
          </div>

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg"
            >
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle size={20} />
                <span className="font-semibold">Fees submitted successfully!</span>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <div className="flex items-center gap-2 text-red-800">
                <XCircle size={20} />
                <span className="font-semibold">Fees not submitted: {error}</span>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <DollarSign size={16} />
                Fee Amount (₹) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <DollarSign size={16} />
                Transport Fee (₹) <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.transport_fee}
                onChange={(e) => setFormData({ ...formData, transport_fee: e.target.value })}
                placeholder="Enter transport fee (optional)"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                Payment Mode
              </label>
              <select
                value={formData.payment_mode}
                onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value as 'cash' | 'cheque' | 'online' | 'card' | 'bank_transfer' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              >
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText size={16} />
                Receipt Number
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={formData.receipt_no}
                  onChange={(e) => setFormData({ ...formData, receipt_no: e.target.value.toUpperCase() })}
                  placeholder="RCP-XXX-XXXXXX"
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData({ ...formData, receipt_no: generateReceiptNo() })}
                >
                  Generate
                </Button>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} />
                Payment Date
              </label>
              <Input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">Remarks (Optional)</label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              {success && submittedFee && (
                <Button
                  type="button"
                  onClick={downloadReceipt}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download size={18} className="mr-2" />
                  Download Receipt
                </Button>
              )}
              <div className="flex gap-3 ml-auto">
                <Button type="button" variant="outline" onClick={onClose}>
                  {success ? 'Close' : 'Cancel'}
                </Button>
                {!success && (
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Recording...' : 'Record Payment'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

