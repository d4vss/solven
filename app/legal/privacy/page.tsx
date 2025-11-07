export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
        <p className="mb-4 text-gray-700">
          At Solven, we take your privacy seriously. This Privacy Policy
          explains how we collect, use, disclose, and safeguard your information
          when you use our file hosting service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          2. Information We Collect
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-medium mb-2">
              2.1 Personal Information
            </h3>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Email address and username</li>
              <li>Account preferences</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-medium mb-2">2.2 Usage Data</h3>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Upload and download activity</li>
              <li>File metadata (size, type, creation date)</li>
              <li>IP address and browser information</li>
              <li>Device information</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          3. How We Use Your Information
        </h2>
        <ul className="list-disc pl-6 text-gray-700">
          <li className="mb-2">To provide and maintain our service</li>
          <li className="mb-2">To process your transactions</li>
          <li className="mb-2">
            To send you important updates and notifications
          </li>
          <li className="mb-2">To improve our service and user experience</li>
          <li className="mb-2">To detect and prevent fraud or abuse</li>
          <li className="mb-2">To comply with legal obligations</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          4. Data Storage and Security
        </h2>
        <div className="space-y-4 text-gray-700">
          <p>
            We implement appropriate technical and organizational measures to
            protect your personal information against unauthorized access,
            alteration, disclosure, or destruction.
          </p>
          <p>
            Your files are stored securely using industry-standard encryption
            methods. However, no method of transmission over the Internet or
            electronic storage is 100% secure.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
        <p className="text-gray-700">
          We retain your personal information for as long as your account is
          active or as needed to provide you services. We will delete or
          anonymize your information upon request or when it is no longer
          necessary for the purposes for which it was collected.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
        <ul className="list-disc pl-6 text-gray-700">
          <li className="mb-2">Access your personal information</li>
          <li className="mb-2">Correct inaccurate information</li>
          <li className="mb-2">Request deletion of your information</li>
          <li className="mb-2">Object to processing of your information</li>
          <li className="mb-2">Export your data</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking</h2>
        <p className="text-gray-700">
          We use cookies and similar tracking technologies to track activity on
          our service and hold certain information. You can instruct your
          browser to refuse all cookies or to indicate when a cookie is being
          sent.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">8. Third-Party Services</h2>
        <p className="text-gray-700">
          We may use third-party service providers to help us operate our
          service, such as hosting providers, payment processors, and analytics
          services. These providers have access to your information only to
          perform specific tasks on our behalf and are obligated not to disclose
          or use it for any other purpose.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          9. Children&apos;s Privacy
        </h2>
        <p className="text-gray-700">
          Our service is not intended for use by children under the age of 13.
          We do not knowingly collect personal information from children under
          13. If we become aware that we have collected personal information
          from a child under 13, we will take steps to delete such information.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          10. Changes to This Policy
        </h2>
        <p className="text-gray-700">
          We may update our Privacy Policy from time to time. We will notify you
          of any changes by posting the new Privacy Policy on this page and
          updating the &quot;Last updated&quot; date.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
        <p className="text-gray-700">
          If you have any questions about this Privacy Policy, please contact us
          at{" "}
          <a
            className="text-blue-600 hover:underline"
            href="mailto:solven@d4vss.net"
          >
            solven@d4vss.net
          </a>
          .
        </p>
      </section>

      <p className="text-sm text-gray-500 mt-8">
        Last updated: {new Date().toLocaleDateString()}
      </p>
    </div>
  );
}
