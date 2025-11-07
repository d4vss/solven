export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
        <p className="text-gray-700">
          By accessing and using Solven&apos;s file hosting service, you agree
          to be bound by these Terms of Service. If you do not agree to these
          terms, please do not use our service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
        <p className="text-gray-700">
          Solven provides users with the ability to upload, store, and share
          files. We reserve the right to modify, suspend, or discontinue any
          aspect of the service at any time.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          3. User Responsibilities
        </h2>
        <ul className="list-disc pl-6 text-gray-700">
          <li className="mb-2">
            You are responsible for maintaining the confidentiality of your
            account information
          </li>
          <li className="mb-2">
            You must not upload or share illegal, harmful, or inappropriate
            content
          </li>
          <li className="mb-2">
            You must not use the service for any unlawful purposes
          </li>
          <li className="mb-2">
            You must not attempt to disrupt or interfere with the service
          </li>
          <li className="mb-2">
            You are responsible for all activities that occur under your account
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">4. Prohibited Content</h2>
        <p className="mb-4 text-gray-700">
          Users are prohibited from uploading or sharing content that:
        </p>
        <ul className="list-disc pl-6 text-gray-700">
          <li className="mb-2">
            Contains viruses, malware, or other harmful code
          </li>
          <li className="mb-2">
            Is illegal, threatening, or promotes illegal activities
          </li>
          <li className="mb-2">Infringes on intellectual property rights</li>
          <li className="mb-2">Contains explicit or adult content</li>
          <li className="mb-2">Is discriminatory or promotes hate speech</li>
          <li className="mb-2">
            Contains personal information of others without consent
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          5. Data Storage and Privacy
        </h2>
        <p className="text-gray-700">
          We take reasonable measures to protect your data, but we cannot
          guarantee absolute security. We reserve the right to remove or delete
          files that violate these terms or pose a security risk. Please refer
          to our Privacy Policy for detailed information about how we handle
          your data.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">6. Service Limitations</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-medium mb-2">6.1 Storage Limits</h3>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Maximum file size: 4.99 GiB</li>
              <li>Total storage space: Unlimited</li>
              <li>
                Files will be automatically deleted after 7 days of inactivity
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-medium mb-2">6.2 Usage Limits</h3>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Bandwidth usage: Unlimited</li>
              <li>Number of concurrent uploads: Unlimited</li>
              <li>Number of files per account: Unlimited</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">7. Account Termination</h2>
        <p className="text-gray-700">
          We reserve the right to terminate or suspend your account and access
          to the service at our sole discretion, without notice, for conduct
          that we believe violates these Terms of Service or is harmful to other
          users, us, or third parties, or for any other reason.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">8. Changes to Terms</h2>
        <p className="text-gray-700">
          We may modify these Terms of Service at any time. We will notify users
          of any material changes. Your continued use of the service after such
          changes constitutes your acceptance of the new terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          9. Disclaimer of Warranties
        </h2>
        <p className="text-gray-700">
          The service is provided &quot;as is&quot; without any warranties,
          express or implied. We do not guarantee that the service will be
          uninterrupted, timely, secure, or error-free.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          10. Limitation of Liability
        </h2>
        <p className="text-gray-700">
          We shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages resulting from your use of or
          inability to use the service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">11. Contact Information</h2>
        <p className="text-gray-700">
          If you have any questions about these Terms of Service, please contact
          us at{" "}
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
