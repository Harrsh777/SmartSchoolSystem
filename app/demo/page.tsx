'use client';

import { supabase } from '@/lib/supabase';
import { useState } from 'react';


const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => {
  const totalMinutes = 9 * 60 + i * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${hour.toString().padStart(2, '0')}:${minute === 0 ? '00' : minute}`;
});

// Generate next 7 days
const getNextDays = () => {
  return Array.from({ length: 9 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
};

export default function RequestDemoPage() {
  const [step, setStep] = useState(1);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
  });

  const submitDemo = async () => {
    if (!date || !time) return;

    setLoading(true);

    const { error } = await supabase.from('demo_requests').insert({
      name: form.name,
      phone: form.phone,
      email: form.email,
      demo_date: date.toISOString().split('T')[0],
      demo_time: time,
    });

    setLoading(false);
    if (!error) setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#667eea]/10 via-[#764ba2]/10 to-[#f093fb]/10 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-10 text-center">
          <h2 className="text-3xl font-bold gradient-text mb-4">
            🎉 Demo Scheduled
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            An <span className="font-semibold text-[#667eea]">EduCore Executive</span> will contact you shortly.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            📅 {date?.toDateString()} · ⏰ {time}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea]/10 via-[#764ba2]/10 to-[#f093fb]/10 flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text">Request a Demo</h1>
          <p className="text-gray-500 mt-2">
            Schedule a quick walkthrough with our experts
          </p>
        </div>

        {/* STEP 1 – Calendar */}
        {step === 1 && (
          <>
            <p className="font-semibold mb-4">Select a date</p>

            <div className="grid grid-cols-3 gap-4">
              {getNextDays().map((d) => {
                const isSelected =
                  date?.toDateString() === d.toDateString();

                return (
                  <button
                    key={d.toDateString()}
                    onClick={() => setDate(d)}
                    className={`p-4 rounded-2xl border text-center transition-all
                      ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-lg scale-105'
                          : 'hover:border-[#667eea]'
                      }`}
                  >
                    <p className="text-sm opacity-80">
                      {d.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-2xl font-bold">{d.getDate()}</p>
                    <p className="text-xs opacity-70">
                      {d.toLocaleDateString('en-US', { month: 'short' })}
                    </p>
                  </button>
                );
              })}
            </div>

            <button
              disabled={!date}
              onClick={() => setStep(2)}
              className="w-full mt-8 py-3 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-semibold disabled:opacity-50"
            >
              Continue
            </button>
          </>
        )}

        {/* STEP 2 – Time */}
        {step === 2 && (
          <>
            <p className="font-semibold mb-4">Select a time slot</p>

            <div className="grid grid-cols-3 gap-3">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setTime(slot)}
                  className={`py-2 rounded-xl border text-sm transition
                    ${
                      time === slot
                        ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow'
                        : 'hover:border-[#667eea]'
                    }`}
                >
                  {slot}
                </button>
              ))}
            </div>

            <button
              disabled={!time}
              onClick={() => setStep(3)}
              className="w-full mt-8 py-3 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-semibold disabled:opacity-50"
            >
              Continue
            </button>
          </>
        )}

        {/* STEP 3 – Details */}
        {step === 3 && (
          <>
            <p className="font-semibold mb-4">Your details</p>

            {(['name', 'phone', 'email'] as const).map((field) => (
              <input
                key={field}
                placeholder={`Your ${field}`}
                value={form[field]}
                onChange={(e) =>
                  setForm({ ...form, [field]: e.target.value })
                }
                className="w-full mb-4 px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#667eea] outline-none"
              />
            ))}

            <button
              onClick={submitDemo}
              disabled={loading}
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#f093fb] text-white font-semibold shadow-xl hover:scale-105 transition"
            >
              {loading ? 'Scheduling...' : 'Schedule Demo 🚀'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
