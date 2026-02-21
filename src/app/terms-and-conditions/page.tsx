import type { Metadata } from "next";
import { ReaderExperience } from "@/components/custom/reader-experience";
import type { LibraryBlock } from "@/services/frontend-services/library-service";

type TermsSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

const PRODUCT_NAME = "Speed Reader";
const WEBSITE_DOMAIN = "quicky.now";
const CONTACT_EMAIL = "spahic.sabahudin1@gmail.com";
const LAST_UPDATED = "February 21, 2026";
const EFFECTIVE_DATE = "February 21, 2026";

const TERMS_SECTIONS: TermsSection[] = [
  {
    id: "agreement",
    title: "1. Agreement to These Terms",
    paragraphs: [
      "These Terms and Conditions form a legally binding agreement between you and the individual owner and operator of Speed Reader. By visiting quicky.now, creating an account, uploading content, using reading controls, saving files, or otherwise interacting with the Service, you acknowledge that you have read, understood, and agreed to these Terms.",
      "If you do not agree with every part of these Terms, you must stop using the Service immediately. Continued access or use after any update becomes effective means you accept the revised Terms as of the effective date shown on this page.",
      "These Terms apply to all users, including guests, registered users, and anyone accessing the Service through desktop, mobile, or other supported clients.",
    ],
  },
  {
    id: "operator",
    title: "2. Operator Identity and Product Scope",
    paragraphs: [
      "Speed Reader is operated by a private individual and not by a registered legal entity. References in these Terms to \"owner,\" \"operator,\" \"I,\" \"my,\" \"we,\" or \"us\" describe the same individual owner and operator of the Service.",
      "The Service currently includes a reading interface, library management features, file upload and extraction flow, inclusion or ignore controls for extracted sections, saved reading progress, and account-linked usage where authentication is available.",
      "The website for the Service is quicky.now, and users should rely only on official content published through the Service itself or direct communications from the contact email listed in these Terms.",
    ],
  },
  {
    id: "eligibility",
    title: "3. Eligibility and User Capacity",
    paragraphs: [
      "You may use the Service only if you can form a binding agreement under applicable law. If you are under the legal age required in your jurisdiction, you may use the Service only with the involvement and consent of a parent or legal guardian.",
      "You represent that your use of the Service does not violate any contract, court order, policy, sanction, export restriction, or other legal obligation that applies to you.",
      "You are responsible for confirming that use of an online reading and document processing service is lawful where you live and where you access the Service.",
    ],
  },
  {
    id: "accounts",
    title: "4. Accounts and Authentication",
    paragraphs: [
      "Some features may require sign-in. When authentication is used, you are responsible for maintaining the confidentiality of your account session and for all activity that occurs through your account, including activity performed by anyone who obtains access using your credentials or active session.",
      "You must provide truthful information, keep account details current, and promptly report suspected unauthorized access. The Service may rely on third-party authentication providers, and your use of those providers is also subject to their terms and privacy practices.",
      "Access may be suspended, limited, or terminated if account activity appears abusive, fraudulent, illegal, technically harmful, or inconsistent with these Terms.",
    ],
  },
  {
    id: "service-description",
    title: "5. Service Description and Functional Behavior",
    paragraphs: [
      "Speed Reader is designed to help users read text through paced visual presentation controls. Features may include one-word display, adjustable words-per-minute settings, configurable font size, start countdown, pacing ramp options, block-level progression, and stored reading position where available.",
      "Library functionality may allow users to upload supported document formats, extract text blocks, review extracted content, include or ignore selected blocks, and save processed reading material for later loading.",
      "The Service may include sample content when no file is selected. This sample content is informational only and may be changed or removed at any time.",
    ],
  },
  {
    id: "user-content",
    title: "6. Your Content, Rights, and Responsibility",
    paragraphs: [
      "You retain ownership of the files and text you upload. However, you are fully responsible for ensuring that you have all rights, permissions, legal bases, and licenses needed to upload, process, store, and read that content through the Service.",
      "You must not upload any material that infringes intellectual property rights, violates privacy rights, breaches confidentiality obligations, contains unlawful content, or otherwise creates legal risk for the Service or other users.",
      "You are solely responsible for reviewing extracted output and deciding whether content should be included or ignored for reading.",
    ],
  },
  {
    id: "license",
    title: "7. Limited License You Grant for Operation",
    paragraphs: [
      "By using the Service, you grant a limited, non-exclusive, worldwide, royalty-free license to host, copy, transform, process, transmit, and store your uploaded content only as necessary to operate, maintain, secure, debug, and improve the Service.",
      "This operational license includes technical actions needed for extraction, rendering, caching, synchronization, indexing, background processing, and delivery to your authenticated sessions.",
      "This license does not transfer ownership of your content and is limited to the scope required for service operation and compliance.",
    ],
  },
  {
    id: "extraction",
    title: "8. File Extraction and Parsing Limitations",
    paragraphs: [
      "Document extraction is a best-effort technical process. Output quality depends on source formatting, encoding, document structure, scanned image quality, and limitations of the extraction pipeline.",
      "No guarantee is made that extracted text will be complete, correctly ordered, properly classified, semantically accurate, or suitable for any legal, academic, business, or professional purpose.",
      "Automatic defaults may mark some extracted blocks as ignored. You are responsible for checking those decisions before reading or relying on output.",
    ],
  },
  {
    id: "storage",
    title: "9. Library Storage and Access Model",
    paragraphs: [
      "Saved library files and related metadata may be stored through third-party cloud storage and database infrastructure used by the Service. URLs, keys, and metadata are used to retrieve files and associate them with your account.",
      "Although reasonable steps are taken to provide secure operation, no internet-connected storage model can be guaranteed as perfectly secure. You should avoid uploading highly sensitive, regulated, or mission-critical information unless you have independently assessed the risk and accepted that risk.",
      "You acknowledge that third-party infrastructure behavior, availability, data handling, and policy changes are outside direct control of the individual operator.",
    ],
  },
  {
    id: "progress",
    title: "10. Reading Progress and State Persistence",
    paragraphs: [
      "The Service may save reading progress records, including selected file identifiers, block identifiers, offsets, and timestamps, in order to resume your reading session later.",
      "Progress saving is best-effort and may occur at intervals, on pause, on page transitions, or through other operational triggers. Progress can be delayed, missing, overwritten, or unavailable due to network issues, platform limitations, outages, or software changes.",
      "You are responsible for your own backup practices if your reading state is important to you.",
    ],
  },
  {
    id: "acceptable-use",
    title: "11. Acceptable Use",
    paragraphs: [
      "You agree to use the Service lawfully, responsibly, and in a way that does not interfere with system stability, other users, third-party infrastructure, or legal obligations.",
      "You must not upload malware, harmful payloads, exploit code, credential theft content, or any material designed to compromise systems, privacy, or data integrity.",
      "You must not attempt to bypass authentication, scrape protected content, overload endpoints, probe security weaknesses, or perform unauthorized automated traffic at abusive rates.",
    ],
  },
  {
    id: "prohibited-content",
    title: "12. Prohibited Content and Conduct",
    paragraphs: [
      "Prohibited uses include, without limitation, content or conduct that is illegal, fraudulent, defamatory, threatening, harassing, hateful, exploitative, invasive of privacy, or infringing on third-party rights.",
      "You may not use the Service to distribute spam, facilitate phishing, conduct social engineering attacks, impersonate individuals, or present false claims of affiliation, ownership, or authorization.",
      "Violations may result in immediate removal of content, account restrictions, termination, and reporting to relevant authorities where required by law.",
    ],
  },
  {
    id: "ip",
    title: "13. Intellectual Property in the Service",
    paragraphs: [
      "The Service software, user interface, visual assets, branding, and underlying implementation are protected by copyright and other intellectual property laws. Except as expressly allowed under these Terms, you may not reproduce, modify, distribute, sublicense, lease, sell, or reverse engineer the Service.",
      "No rights are granted to use the Service name, marks, or branding for commercial or public representations without prior written permission.",
      "All rights not expressly granted in these Terms are reserved.",
    ],
  },
  {
    id: "third-party",
    title: "14. Third-Party Services",
    paragraphs: [
      "The Service depends on third-party providers for authentication, storage, hosting, networking, and related infrastructure. Those providers operate under their own terms and privacy policies.",
      "The operator is not responsible for third-party outages, API changes, pricing changes, policy updates, account limitations, data retention policies, or service discontinuation by those providers.",
      "Any third-party issue may affect the Service without prior notice, and uptime or functionality cannot be guaranteed.",
    ],
  },
  {
    id: "privacy",
    title: "15. Privacy and Data Handling",
    paragraphs: [
      "Use of the Service involves processing account and usage data needed to provide functionality, including authentication state, file metadata, extracted text blocks, inclusion flags, and reader progress records.",
      "By using the Service, you consent to processing needed for operation, security, debugging, abuse prevention, and feature improvement, subject to applicable law.",
      "Do not upload personal information of others unless you have a valid legal basis and all required permissions.",
    ],
  },
  {
    id: "retention",
    title: "16. Data Retention and Deletion",
    paragraphs: [
      "Data may be retained as long as reasonably needed for operation, security, legal compliance, dispute resolution, abuse prevention, and service integrity. Deletion in active systems may not instantly remove all backup, replica, log, or cached copies.",
      "You may request account-related deletion by contacting the email listed in these Terms. Deletion requests will be handled in a reasonable timeframe, subject to technical constraints and legal obligations.",
      "If access is terminated, some records may still be retained where legally required or reasonably necessary to enforce these Terms.",
    ],
  },
  {
    id: "security",
    title: "17. Security and Risk Allocation",
    paragraphs: [
      "Reasonable security measures may be implemented, but no service can guarantee absolute protection against unauthorized access, data loss, interception, or misuse.",
      "You are responsible for your own endpoint security, account hygiene, session management, and local device protection.",
      "You accept that use of the Service occurs at your own risk and that you must independently determine whether the Service is appropriate for the sensitivity level of your content.",
    ],
  },
  {
    id: "availability",
    title: "18. Service Availability and Changes",
    paragraphs: [
      "The Service is provided on an \"as available\" basis. Features may change, be interrupted, degrade, or be removed without prior notice, including due to maintenance, infrastructure limits, third-party dependency changes, or operator decisions.",
      "No service-level guarantee is offered for uptime, latency, response speed, extraction completion time, progress synchronization timing, or long-term continuity.",
      "The operator may modify architecture, user interface, storage behavior, and technical implementation at any time.",
    ],
  },
  {
    id: "beta",
    title: "19. Experimental and Preview Features",
    paragraphs: [
      "Certain features may be experimental, incomplete, unstable, or offered only for evaluation. Experimental features may contain defects, limited safeguards, and reduced compatibility.",
      "You agree that preview functionality may be changed or removed at any time and that reliance on such features for critical workflows is solely your responsibility.",
      "Feedback may be used to improve the Service without obligation of compensation.",
    ],
  },
  {
    id: "fees",
    title: "20. Fees and Future Commercial Terms",
    paragraphs: [
      "If the Service is currently free to use, this does not guarantee that it will remain free. Paid tiers, usage limits, premium features, or billing requirements may be introduced later.",
      "If payment features are introduced, additional billing terms will apply before payment is required.",
      "You are responsible for taxes, fees, and charges imposed by your payment provider, internet provider, or local authorities in relation to your usage.",
    ],
  },
  {
    id: "termination",
    title: "21. Suspension and Termination",
    paragraphs: [
      "The operator may suspend, restrict, or terminate access at any time for legal, security, operational, or policy reasons, including suspected abuse, repeated violations, or technically harmful behavior.",
      "You may stop using the Service at any time. Termination does not erase obligations that accrued before termination and does not automatically remove retained records where lawful retention is required.",
      "Sections that are intended by nature to survive termination will survive, including intellectual property provisions, disclaimers, liability limitations, indemnity, dispute terms, and enforcement rights.",
    ],
  },
  {
    id: "disclaimer",
    title: "22. Disclaimer of Warranties",
    paragraphs: [
      "To the maximum extent allowed by law, the Service is provided \"as is\" and \"as available\" without warranties of any kind, whether express, implied, statutory, or otherwise.",
      "No warranty is provided for merchantability, fitness for a particular purpose, non-infringement, uninterrupted availability, data accuracy, extraction correctness, progress persistence, or compatibility with your specific hardware, software, or legal requirements.",
      "You assume full responsibility for evaluating output correctness, preserving your own backups, and deciding whether content produced or displayed through the Service is appropriate for your use case.",
    ],
  },
  {
    id: "liability",
    title: "23. Limitation of Liability",
    paragraphs: [
      "To the fullest extent permitted by law, the operator will not be liable for any indirect, incidental, special, consequential, punitive, or exemplary damages, including loss of data, loss of profits, loss of goodwill, business interruption, or procurement of substitute services.",
      "Where liability cannot be excluded, total aggregate liability related to the Service and these Terms is limited to the greater of one hundred U.S. dollars (USD $100) or the amount you paid directly for the Service in the twelve months preceding the event giving rise to the claim.",
      "Some jurisdictions do not allow certain limitations, so some parts of this section may not apply to you.",
    ],
  },
  {
    id: "indemnity",
    title: "24. Indemnification",
    paragraphs: [
      "You agree to defend, indemnify, and hold harmless the individual operator from and against any claims, liabilities, losses, damages, costs, and expenses, including reasonable legal fees, arising from or related to your content, your use of the Service, your breach of these Terms, or your violation of any law or third-party right.",
      "This indemnity obligation applies whether claims are brought by private parties, organizations, rightsholders, regulators, or governmental entities.",
      "The operator reserves the right to assume exclusive defense and control of any matter subject to indemnification, and you agree to cooperate with that defense.",
    ],
  },
  {
    id: "law",
    title: "25. Governing Law and Dispute Process",
    paragraphs: [
      "These Terms are governed by the laws applicable in the jurisdiction of the individual operator's residence, without regard to conflict-of-law principles, unless non-waivable local consumer law requires otherwise.",
      "Before filing formal legal action, you agree to first send a written description of the dispute to the contact email listed below and allow a reasonable period for informal resolution.",
      "If a dispute cannot be resolved informally, claims may be brought in a court of competent jurisdiction, subject to any mandatory legal rules in your location.",
    ],
  },
  {
    id: "changes",
    title: "26. Changes to the Terms",
    paragraphs: [
      "These Terms may be updated from time to time to reflect legal requirements, technical changes, feature changes, or operational needs.",
      "The latest version will be posted on this page with revised dates. You are responsible for checking this page periodically.",
      "Your continued use of the Service after updated Terms are posted constitutes acceptance of the updated Terms.",
    ],
  },
  {
    id: "communications",
    title: "27. Electronic Communications",
    paragraphs: [
      "By using the Service, you consent to receive legal notices, policy updates, and service communications electronically, including via website notices or email.",
      "Electronic communications satisfy any legal requirement that such communications be in writing, to the extent permitted by law.",
      "You are responsible for keeping your email access available and for reviewing notices published in the Service.",
    ],
  },
  {
    id: "severability",
    title: "28. Severability, Waiver, and Assignment",
    paragraphs: [
      "If any provision of these Terms is found invalid or unenforceable, the remaining provisions remain in full force and effect.",
      "Failure to enforce a provision is not a waiver of the right to enforce that provision later.",
      "You may not assign your rights or obligations under these Terms without prior consent. The operator may transfer rights and obligations as part of a reorganization, transfer, or sale of the Service.",
    ],
  },
  {
    id: "entire-agreement",
    title: "29. Entire Agreement",
    paragraphs: [
      "These Terms constitute the entire agreement between you and the operator regarding your use of the Service and supersede prior discussions, understandings, or statements on the same subject matter.",
      "No oral statements modify these Terms unless confirmed in a written update published by the operator.",
      "If a translated version exists, the English version controls to the extent allowed by law, unless mandatory local law requires otherwise.",
    ],
  },
  {
    id: "contact",
    title: "30. Contact",
    paragraphs: [
      "For legal notices, account-related questions, or Terms questions, contact: spahic.sabahudin1@gmail.com.",
      "Official website: quicky.now.",
      "No mailing address is provided for this Service. Email is the primary and official contact channel.",
    ],
  },
];

const ACCEPTABLE_USE_LIST = [
  "Do not upload content you do not own or have permission to process.",
  "Do not upload malware, exploit payloads, or harmful scripts.",
  "Do not run abusive automation or endpoint flooding.",
  "Do not bypass access controls or security boundaries.",
  "Do not use the Service to violate intellectual property rights.",
  "Do not use the Service for harassment, fraud, or impersonation.",
  "Do not upload highly sensitive regulated data without independent risk review.",
  "Do not rely on extracted output without your own verification.",
];

const TERMS_READER_BLOCKS: LibraryBlock[] = (() => {
  const blocks: LibraryBlock[] = [];
  let blockIndex = 1;
  const nextId = () => `terms-${blockIndex++}`;
  const appendBlock = (text: string, type: LibraryBlock["type"] = "paragraph") => {
    blocks.push({
      id: nextId(),
      text,
      type,
      page: 1,
    });
  };

  appendBlock("Terms & Conditions", "heading");
  appendBlock(`Product: ${PRODUCT_NAME}.`);
  appendBlock(`Website: ${WEBSITE_DOMAIN}.`);
  appendBlock(`Contact: ${CONTACT_EMAIL}.`);
  appendBlock(`Last Updated: ${LAST_UPDATED}.`);
  appendBlock(`Effective Date: ${EFFECTIVE_DATE}.`);
  appendBlock("If you do not agree to these Terms, do not use the Service.");

  for (const section of TERMS_SECTIONS) {
    appendBlock(section.title, "heading");
    for (const paragraph of section.paragraphs) {
      appendBlock(paragraph);
    }
  }

  appendBlock("Appendix A. Acceptable Use Checklist", "heading");
  appendBlock("The following checklist is part of these Terms and is included to clarify expected behavior.");
  for (const item of ACCEPTABLE_USE_LIST) {
    appendBlock(item);
  }

  appendBlock("Appendix B. Date and Contact Confirmation", "heading");
  appendBlock(
    `Last Updated: ${LAST_UPDATED}. Effective Date: ${EFFECTIVE_DATE}. Product: ${PRODUCT_NAME}. Website: ${WEBSITE_DOMAIN}. Contact Email: ${CONTACT_EMAIL}. Operator Type: private citizen and individual owner.`,
  );
  appendBlock(
    "This page intentionally does not publish a mailing address. Email is the sole official contact channel for legal and support communication related to these Terms.",
  );

  return blocks;
})();

export const metadata: Metadata = {
  title: "Terms & Conditions | Speed Reader",
  description: "Terms and Conditions for Speed Reader on quicky.now.",
};

export default function TermsAndConditionsPage() {
  return <ReaderExperience initialBlocks={TERMS_READER_BLOCKS} />;
}
