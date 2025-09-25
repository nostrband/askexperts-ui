'use client';

import React from 'react';
// import { useRouter } from 'next/navigation';
// import { useAuth } from '@clerk/nextjs';
import Header from '../components/layout/Header';
import HeroSection from '../components/sections/HeroSection';
import Footer from '../components/layout/Footer';
// import Header from '@/components/layout/Header';
// import Footer from '@/components/layout/Footer';
// import HeroSection from '@/components/sections/HeroSection';
// Commented out sections for closed beta
// import HowItWorksSection from '@/components/sections/HowItWorksSection';
// import FeaturesSection from '@/components/sections/FeaturesSection';
// import ForBuildersSection from '@/components/sections/ForBuildersSection';
// import CommunitySection from '@/components/sections/CommunitySection';
// import CTASection from '@/components/sections/CTASection';
// import AudienceSection from '@/components/sections/AudienceSection';

export default function Home() {
  // const router = useRouter();
  // const { isSignedIn } = useAuth();

  // Redirection to /home disabled as per requirement
  // useEffect(() => {
  //   if (isSignedIn) {
  //     router.push('/home');
  //   }
  // }, [isSignedIn, router]);

  return (
    <>
      <Header />
      <main>
        <HeroSection />
        {/* Commented out for closed beta
        <HowItWorksSection />
        <FeaturesSection />
        <ForBuildersSection />
        <CTASection />
        <AudienceSection />
        <CommunitySection />
        */}
      </main>
      <Footer />
    </>
  );
}
