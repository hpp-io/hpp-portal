import React from 'react';
import type { Metadata } from 'next';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: 'Home | HPP Portal',
  description:
    'Welcome to the HPP Portal, where you can migrate your assets, bridge across networks, and start building on AI-native Layer 2 infrastructure.',
};

export default function Home() {
  return <HomeClient />;
}
