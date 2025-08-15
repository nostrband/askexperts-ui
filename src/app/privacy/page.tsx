'use client';

import Footer from '@/src/components/layout/Footer';
import Header from '@/src/components/layout/Header';
import React from 'react';

export default function Privacy() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-24 max-w-4xl">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold mb-10 text-center">Privacy Policy</h1>
          
          <div className="space-y-6 text-lg leading-relaxed">
            <p>Last Updated: August 15, 2025</p>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">Introduction</h2>
            
            <p>
              NostrCorp, Inc. ("we," "our," or "us") respects your privacy and is committed to protecting it through our compliance with this policy. This Privacy Policy describes the types of information we may collect from you or that you may provide when you visit askexperts.io (our "Website") and our practices for collecting, using, maintaining, protecting, and disclosing that information.
            </p>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">Information We Collect</h2>
            
            <p>We collect several types of information from and about users of our Website, including:</p>
            
            <ul className="list-disc pl-10 space-y-2">
              <li>Information you provide to us directly, such as when you create an account, contact us, or use our services.</li>
              <li>Information we collect automatically as you navigate through the site, including usage details, IP addresses, and information collected through cookies and other tracking technologies.</li>
              <li>Information about your device and internet connection, including your device's unique device identifier, IP address, operating system, browser type, and mobile network information.</li>
            </ul>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">How We Use Your Information</h2>
            
            <p>We use information that we collect about you or that you provide to us, including any personal information:</p>
            
            <ul className="list-disc pl-10 space-y-2">
              <li>To present our Website and its contents to you.</li>
              <li>To provide you with information, products, or services that you request from us.</li>
              <li>To fulfill any other purpose for which you provide it.</li>
              <li>To improve our Website and services.</li>
              <li>To personalize your experience and deliver content relevant to your interests.</li>
              <li>For analytics purposes to understand how our users interact with our Website.</li>
            </ul>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">Cookies and Tracking Technologies</h2>
            
            <p>
              We use cookies and similar tracking technologies to track the activity on our Website and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier. These are sent to your browser from a website and stored on your device.
            </p>
            
            <p>
              We use cookies for essential website functionality, analytics, and to improve your experience. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            </p>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">Data Sharing and Disclosure</h2>
            
            <p>
              We do not sell or rent your personal information to third parties. We do not share your personal information with third parties except as described in this Privacy Policy.
            </p>
            
            <p>We may disclose your personal information:</p>
            
            <ul className="list-disc pl-10 space-y-2">
              <li>To comply with any court order, law, or legal process, including to respond to any government or regulatory request.</li>
              <li>To enforce or apply our terms of service and other agreements.</li>
              <li>If we believe disclosure is necessary or appropriate to protect the rights, property, or safety of NostrCorp, Inc., our customers, or others.</li>
            </ul>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">Data Security</h2>
            
            <p>
              We have implemented measures designed to secure your personal information from accidental loss and from unauthorized access, use, alteration, and disclosure. However, the transmission of information via the internet is not completely secure. Although we do our best to protect your personal information, we cannot guarantee the security of your personal information transmitted to our Website.
            </p>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">Changes to Our Privacy Policy</h2>
            
            <p>
              We may update our Privacy Policy from time to time. If we make material changes to how we treat our users' personal information, we will notify you through a notice on the Website home page. The date the Privacy Policy was last revised is identified at the top of the page.
            </p>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">Contact Information</h2>
            
            <p>
              To ask questions or comment about this Privacy Policy and our privacy practices, contact us at:
            </p>
            
            <p className="mt-4">
              <strong>NostrCorp, Inc.</strong><br />
              Email: admin@nostr.band<br />
              Address: 2810 North Church Street<br />
              PMB 60879<br />
              Wilmington, DE 19802<br />
              United States
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}