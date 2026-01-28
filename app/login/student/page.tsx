import { redirect } from 'next/navigation';

export default function LoginStudentRedirect() {
  redirect('/student/login');
}
