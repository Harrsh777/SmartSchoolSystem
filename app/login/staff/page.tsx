import { redirect } from 'next/navigation';

export default function LoginStaffRedirect() {
  redirect('/staff/login');
}
