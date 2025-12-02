import type { Metadata } from 'next';
import PreRegistrationClient from './PreRegistrationClient';

export const metadata: Metadata = {
  title: 'HPP Staking Pre-Registration | HPP Portal',
  description: 'Pre-register now to secure up to 20% APR on HPP Staking.',
};

export default function Page() {
  return <PreRegistrationClient />;
}
