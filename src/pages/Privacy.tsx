import LegalPage from "./LegalPage";

const Privacy = () => (
  <LegalPage title="Privacy Policy">
    <p className="text-xs uppercase tracking-wide font-bold text-muted-foreground/70">
      Placeholder — to be reviewed before launch.
    </p>
    <p>
      Power Club respects your privacy. This page explains, in plain language, what information we
      collect and how we use it. We will replace this placeholder with our full policy soon.
    </p>
    <h2>What we collect</h2>
    <p>
      Your account details (name and email), the workouts and weights you log, and basic usage data
      that helps us keep the app running.
    </p>
    <h2>How we use it</h2>
    <p>
      To run your training plan, show your progress and scorecard, and improve the product. We do
      not sell your personal data.
    </p>
    <h2>Contact</h2>
    <p>
      Questions? Email{" "}
      <a href="mailto:hello@caparicafoundersbreakfast.com" className="text-primary hover:underline">
        hello@caparicafoundersbreakfast.com
      </a>
      .
    </p>
  </LegalPage>
);

export default Privacy;
