import LegalPage from "./LegalPage";

const Terms = () => (
  <LegalPage title="Terms of Service">
    <p className="text-xs uppercase tracking-wide font-bold text-muted-foreground/70">
      Placeholder — to be reviewed before launch.
    </p>
    <p>
      These terms govern your use of Power Club. By creating an account you agree to them. We will
      replace this placeholder with our full terms soon.
    </p>
    <h2>Your membership</h2>
    <p>
      Power Club costs €10/month after a 2-week free trial. You can cancel anytime; cancel before
      the trial ends and you pay nothing.
    </p>
    <h2>Using the app</h2>
    <p>
      Power Club provides general fitness guidance, not medical advice. Train within your limits and
      consult a professional if you have health concerns.
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

export default Terms;
