/**
 * Privacy policy and data-deletion instructions. Meta requires both URLs before an app can
 * switch to Live mode, which is needed to receive leadgen webhooks.
 */
// Set at build time so no personal address is hard-coded in the repository.
const contactEmail = import.meta.env.VITE_PRIVACY_CONTACT_EMAIL as string | undefined;

export function PrivacyRoute() {
  return (
    <article className="max-w-2xl space-y-4 leading-relaxed">
      <h1 className="text-2xl font-semibold">Privacy policy</h1>
      <p>
        Lead Intake is a demonstration project. It receives leads submitted through Meta (Facebook
        and Instagram) lead forms connected to its Page and stores them so they can be reviewed and
        followed up.
      </p>
      <h2 className="pt-2 text-lg font-semibold">What we collect</h2>
      <p>
        The answers you submit in the lead form (such as your name, email address and phone number),
        any consent checkboxes you tick, and the ad and form the lead came from.
      </p>
      <h2 className="pt-2 text-lg font-semibold">How it is used</h2>
      <p>
        Only to review and follow up on your enquiry. The data is not sold or shared with third
        parties.
      </p>
      <h2 id="data-deletion" className="pt-2 text-lg font-semibold">
        Deleting your data
      </h2>
      <p>
        To have your lead data deleted, contact the project owner
        {contactEmail ? (
          <>
            {' at '}
            <a className="text-accent underline" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
          </>
        ) : (
          ' through the contact details in the project repository'
        )}{' '}
        with the email address or phone number you submitted. It will be removed within 30 days.
      </p>
    </article>
  );
}
