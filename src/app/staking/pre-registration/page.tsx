import type { Metadata } from 'next';
import PreRegistrationClient from './PreRegistrationClient';

export const metadata: Metadata = {
  title: 'HPP Staking Pre-Registration | HPP Portal',
  description: 'Pre-register now to secure up to 20% APR on HPP Staking.',
  openGraph: {
    title: 'HPP Staking Pre-Registration | HPP Portal',
    description: 'Pre-register now to secure up to 20% APR on HPP Staking.',
    images: ['/ogTwitter.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HPP Staking Pre-Registration | HPP Portal',
    description: 'Pre-register now to secure up to 20% APR on HPP Staking.',
    images: ['/ogTwitter.jpg'],
  },
};

export default function Page() {
  return <PreRegistrationClient />;
}
