'use client';

import Footer from '@/src/components/layout/Footer';
import Header from '@/src/components/layout/Header';
import React from 'react';

export default function TermsOfService() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-24 max-w-4xl">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold mb-10 text-center">Terms of Service</h1>
          
          <div className="space-y-6 text-lg leading-relaxed">
            <p>Last Updated: August 15, 2025</p>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">1. Acceptance of Terms</h2>
            
            <p>
              Welcome to askexperts.io. These Terms of Service ("Terms") constitute a legally binding agreement between you and NostrCorp, Inc. ("we," "our," or "us") governing your access to and use of the askexperts.io website and services (collectively, the "Service").
            </p>
            
            <p>
              By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service.
            </p>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">2. Changes to Terms</h2>
            
            <p>
              We reserve the right to modify these Terms at any time. We will provide notice of any material changes by posting the updated Terms on this page with a new "Last Updated" date. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.
            </p>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">3. Using Our Service</h2>
            
            <h3 className="text-2xl font-bold mt-8 mb-4">3.1 Eligibility</h3>
            
            <p>
              You must be at least 13 years old to use the Service. By using the Service, you represent and warrant that you meet this requirement.
            </p>
            
            <h3 className="text-2xl font-bold mt-8 mb-4">3.2 User Accounts</h3>
            
            <p>
              When you create an account with us, you must provide accurate, complete, and current information. You are responsible for safeguarding your account credentials and for any activity that occurs under your account.
            </p>
            
            <h3 className="text-2xl font-bold mt-8 mb-4">3.3 Prohibited Conduct</h3>
            
            <p>
              You agree not to:
            </p>
            
            <ul className="list-disc pl-10 space-y-2">
              <li>Use the Service in any way that violates any applicable law or regulation.</li>
              <li>Use the Service for any harmful, fraudulent, or deceptive purpose.</li>
              <li>Attempt to interfere with, compromise the system integrity or security, or decipher any transmissions to or from the servers running the Service.</li>
              <li>Collect or harvest any personally identifiable information from the Service.</li>
              <li>Impersonate any person or entity or misrepresent your affiliation with a person or entity.</li>
              <li>Upload or transmit viruses, malware, or other types of malicious software.</li>
            </ul>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">4. Intellectual Property Rights</h2>
            
            <p>
              The Service and its original content, features, and functionality are owned by NostrCorp, Inc. and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
            </p>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">5. User Content</h2>
            
            <p>
              You retain all rights to any content you submit, post, or display on or through the Service ("User Content"). By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, and distribute your User Content in any existing or future media.
            </p>
            
            <p>
              You represent and warrant that you own or have the necessary rights to the User Content you submit and that the User Content does not violate the rights of any third party.
            </p>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">6. Third-Party Links</h2>
            
            <p>
              The Service may contain links to third-party websites or services that are not owned or controlled by NostrCorp, Inc. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites or services.
            </p>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">7. Termination</h2>
            
            <p>
              We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach these Terms.
            </p>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">8. Limitation of Liability</h2>
            
            <p>
              In no event shall NostrCorp, Inc., nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
            </p>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">9. Disclaimer</h2>
            
            <p>
              Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
            </p>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">10. Governing Law</h2>
            
            <p>
              These Terms shall be governed and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
            </p>
            
            <h2 className="text-3xl font-bold mt-12 mb-6">11. Contact Us</h2>
            
            <p>
              If you have any questions about these Terms, please contact us at:
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