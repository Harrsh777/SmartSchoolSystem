import * as React from 'react';

export function EmailTemplate({ firstName }: { firstName: string }) {
  return (
    <div>
      <h2>Hey {firstName},</h2>
      <p>We’ve received your information.</p>
      <p>Our experts will get back to you shortly.</p>
      <br />
      <p>— Team</p>
    </div>
  );
}

