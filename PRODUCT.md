# Envoy — Product definition

Documentation baseline: GitHub `main` at `ac90339e99b804223b934ee75a39cbfa0aba5d60`, reviewed on October 10, 2026, Pacific time. This document separates the current prototype from proposed changes. Updating documentation does not implement those changes.

## Purpose and audience

Envoy helps consultants, freelancers, agencies and small business teams turn company discovery and research into personalized client and partnership outreach. Users should leave with relevant companies, a supported reason to contact them and messages they have reviewed themselves.

The founding problem came from Adam Tang's consulting-club experience: preparing outreach to one company took more than an hour across Apollo, spreadsheets, Claude and GMass. This is a founder account, not a measured result showing how much time Envoy saves. Adam Tang and Jiwoo Jung built the prototype.

## Two current modes

| Mode | User's goal | Personalization |
|---|---|---|
| Client Prospecting | Find companies and relevant decision-makers for the sender's product or service. | Connect a supported company fact to the offering and a clear next step. Relevance does not establish buying intent. |
| Business Partnerships | Find companies with capabilities that could support a specific collaboration. | Connect documented activities to the proposed collaboration. Suggested mutual benefits remain hypotheses unless supported. |

Both modes use the same discovery, research, contact, template and sending pipeline. Neither is an optional cut from the demo scope.

## Current workflow

1. **Set criteria.** Save sender details and editable templates, choose a mode, describe the goal, set the company count and optionally narrow targeting. The app suggests organizations and roles; the user chooses companies for research.
2. **Review research.** Research the selected organizations. Read a brief, open sources, check available contacts and review the corresponding email. Edit or regenerate the personalized sections as needed.
3. **Send selected.** Review selected recipients and drafts, then approve queueing. The demo records simulated sends; a configured Google account submits through Gmail.

These are three conceptual stages. The current interface has separate **Find organizations** and research actions. A single **Find & draft** action is a proposed simplification, not the current button flow.

## Inputs and setup

Keep initial setup focused on the sender's name, organization, short description and message template. The current app also provides optional website/PDF assistance, logo, signature fields, attachments, exclusions and sending limits. None should become mandatory just to explore the demo.

The current campaign form uses a goal paragraph, company count, people-per-company count and optional geography, size and extra criteria. Structured mode-specific fields are a proposed refinement:

| Client Prospecting | Business Partnerships |
|---|---|
| Target industry | Target industry |
| Sender's offering | Partnership type |
| Desired decision-maker role | Benefit offered |
| Optional targeting specifications | Benefit sought; optional targeting specifications |

## Evidence and messages

Profiles contain a company summary, criteria marked **Supported**, **Not met** or **Unknown**, source links and missing information. Contacts show the information available and its source. Missing or unusable addresses must remain visible for research without becoming sendable.

Templates are editable text. The sender controls the introduction, offer, request and signature. Supported tokens fill sender details, company/contact names, an AI opening and optional AI ideas. The current ideas generator produces three ideas; users can omit that section from their template. There is no requirement for a fixed seven-block email.

The app currently displays numerical fit scores. They are prototype heuristics, not calibrated probabilities. The preferred simplified experience emphasizes role match, a short fit reason and criterion statuses rather than a prominent score.

## Demo boundaries

The built-in demo uses six fictional companies, sample source pages, scripted profiles/contacts and simulated sending. It requires no provider keys and does not demonstrate live research quality or email delivery. Configured live workflows use Claude, Exa, company websites, the current Hunter integration and Gmail.

Anymail Finder is the selected planned replacement for Hunter. The reviewed GitHub branch has not completed that migration. Automatic follow-ups, CRM integrations, billing, advertising and additional outreach modes are outside the implemented demo.

## Proposed pricing

| | Free | Business |
|---|---|---|
| Monthly price | $0 | $29 |
| Intended audience | Individuals exploring occasional outreach. | Businesses and recurring outreach users. |
| Ads | Ad-supported inside Envoy. | Ad-free. |
| Research allowance | Limited monthly credits; exact allowance to validate. | Proposed 200+ monthly research credits. |

One Envoy research credit means a completed company profile plus a personalized draft. It does not promise an email address, delivery or a reply. Vendor lookup credits are a different unit. Prices, allowances, ads and subscriptions are proposals; they are not active entitlements in the prototype. A precise enforceable quota and retry/refund policy must be defined before paid launch.

## Validation and expansion

Start with 3–5 interviews and two named testers. Compare completion time, match/role accuracy, source support, draft corrections, total cost per usable contact and willingness to pay against the user's existing process.

Future paid options may include Sales, Executive research, Teams and Agency workflows. Potential additional modes include recruiting, investor outreach, supplier sourcing and media outreach. Choose these from observed demand, not as requirements for the current MVP.

Implementation details are in [MVP-PLAN.md](docs/MVP-PLAN.md), operational instructions in [HANDOFF.md](docs/HANDOFF.md), and remaining work in [NEXT-STEPS.md](docs/NEXT-STEPS.md).
