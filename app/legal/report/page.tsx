export default function Report() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <section className="space-y-4">
        <h1 className="text-2xl font-bold">Abuse/DMCA Report</h1>
        <p className="text-gray-700">
          Kindly contact us directly through this email:{" "}
          <a
            className="text-blue-600 hover:underline"
            href="mailto:solven@d4vss.net"
          >
            solven@d4vss.net
          </a>
        </p>
        <p className="text-gray-700">
          This is the fastest way and does not involve other parties and their
          time.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Disclaimer</h2>
        <p className="text-gray-700">
          Solven cannot be held liable for any illegal or copyrighted material
          that&apos;s uploaded by the users of this application under:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>
            The Online Copyright Infringement Liability Limitation Act § 512(c)
            in the USA
          </li>
          <li>The Electronic Commerce Directive 2000 Article 14 in the EU</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Prohibited Content</h2>
        <p className="text-gray-700">Solven does not tolerate the following:</p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>Copyright violations</li>
          <li>Terrorism</li>
          <li>Malware and computer viruses</li>
          <li>Doxing</li>
          <li>Gore</li>
          <li>Revenge porn</li>
          <li>Zoophilia</li>
          <li>Child pornography and underage content of sexual kind</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Content Moderation</h2>
        <p className="text-gray-700">
          When we get notification of such content, our support will act quickly
          to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>Remove such content</li>
          <li>Block the account of the user who uploaded such content</li>
          <li>
            Report such content to the National Center for Missing and Exploited
            Children and Cybertipline at{" "}
            <a
              className="text-blue-600 hover:underline"
              href="https://www.missingkids.org"
              rel="noopener noreferrer"
              target="_blank"
            >
              missingkids.com
            </a>
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Law Enforcement Cooperation</h2>
        <p className="text-gray-700">
          We reserve the right to cooperate and take actions, including
          cooperation with law enforcement agencies, to assist them in
          identifying and prosecuting individuals who are involved in the
          transmission or dissemination of content containing child pornography.
        </p>
      </section>
    </div>
  );
}
