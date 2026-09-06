import LegalPageLayout from '../features/legal/components/LegalPageLayout';

const SECTIONS = [
  {
    heading: '1. About this policy',
    body: 'ConstructEst is an academic capstone project (Tarlac State University, BSIT–Web and Mobile Applications), not a commercial company, so this policy describes what a student research system actually does with your data rather than a general corporate privacy statement.',
  },
  {
    heading: '2. What we collect',
    body: 'Account information you provide at sign-up (name, Employee ID, email, password). The DXF floor plan files you upload and the project details you enter (location, budget ceiling, storeys, calibration/design settings). Basic activity such as which pages you use and when, to help us evaluate the system during the capstone\'s testing phase.',
  },
  {
    heading: '3. How we use it',
    body: 'To run the rule-based engine against your floor plan and compute your material estimate, cost comparison, and Bill of Materials. To let you sign in and manage your own projects. If you\'re one of the study\'s evaluation participants, your usage and feedback may be analyzed (without being sold or published with your name attached) as part of the paper\'s accuracy and usability evaluation.',
  },
  {
    heading: '4. What we don\'t do',
    body: 'We don\'t sell your data. We don\'t share it with advertisers or third-party services. Your password is never stored in plain text — it\'s hashed before it\'s saved, so even the development team can\'t read it back.',
  },
  {
    heading: '5. How long we keep it',
    body: 'Your account and project data are kept for as long as this capstone project is in active development and evaluation. You can contact the development team at any time to request that your account and associated data be removed.',
  },
  {
    heading: '6. Your choices',
    body: 'You can review and update your account details from your Profile page at any time. To request account deletion or ask what data is held about you, reach the development team through your capstone panel or research adviser\'s usual channel of contact.',
  },
];

function PrivacyPage() {
  return <LegalPageLayout title="Privacy Policy" updatedLabel="Last updated: September 2026" sections={SECTIONS} />;
}

export default PrivacyPage;
