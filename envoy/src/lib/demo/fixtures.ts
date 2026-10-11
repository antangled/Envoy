/**
 * Scripted data for the demo account. Every company, page, and person here is fictional and lives on a reserved
 * .example domain, so the demo can show sourced briefs, contacts, and drafts without calling Claude, Exa, or Hunter.
 * Source pages are served by Envoy itself at /demo/source/<domain>/<slug>, so citations still open a real page.
 */
import type { BriefAndSlots, SearchSpec } from "@/lib/llm/schemas";

export const DEMO_EMAIL = "demo@envoy.local";

export const DEMO_GOAL =
  "We want three fall consulting projects with growth-stage clean-energy and robotics hardware companies in the Bay Area that are scaling manufacturing or launching a new product line.";

export function demoSpec(mode: "client" | "partnership"): SearchSpec {
  const roles =
    mode === "client"
      ? ["VP Operations", "Head of Strategy", "Chief of Staff", "Founder / CEO", "VP Business Development", "Head of Product", "Director of Supply Chain"]
      : ["Head of Partnerships", "VP Business Development", "Chief of Staff", "Founder / CEO", "Head of Product", "Director of Alliances"];
  return {
    target_description: "growth-stage clean-energy and robotics hardware companies in the San Francisco Bay Area that are scaling manufacturing or launching a product line",
    seed_examples: [],
    geography: "San Francisco Bay Area",
    size_hint: "20 to 500 employees",
    criteria: [
      { id: "c1", text: "Scaling manufacturing or launching a new product line" },
      { id: "c2", text: "Clean-energy or robotics hardware company based in the Bay Area" },
      { id: "c3", text: "Has an open strategic question an outside team could help answer" },
    ],
    roles: roles.map((title, i) => ({ title, checked: i < 3 })),
    offer_phrase: mode === "client" ? "a semester-long project" : "a partnership",
    season_label: "fall",
  };
}

export interface DemoPage {
  slug: string;
  kind: "home" | "about" | "news" | "careers" | "product";
  title: string;
  date?: string;
  text: string;
}

type Status = "v" | "r" | "u" | "n" | "g";
export interface DemoCompany {
  name: string;
  domain: string;
  reason: string;
  /** Slug of the page the reason came from. */
  reasonSlug: string;
  pages: DemoPage[];
  brief: BriefAndSlots;
  /** name, title, status: v verified, r risky (accept-all server), u unverified, n not looked up yet, g shared inbox */
  people: [string, string, Status][];
}

export const sourceUrl = (domain: string, slug: string) => `/demo/source/${domain}/${slug}`;

export const DEMO_COMPANIES: DemoCompany[] = [
  {
    name: "Northwind Robotics",
    domain: "northwind.example",
    reason: "Opening a second assembly line for warehouse robots in Fremont this fall.",
    reasonSlug: "news-second-line",
    pages: [
      {
        slug: "home",
        kind: "home",
        title: "Northwind Robotics | Autonomous carts for busy warehouses",
        text: "Northwind Robotics builds autonomous carts that move totes between picking stations in mid-size warehouses. Our carts work alongside people, need no floor markers, and are running today in 40 distribution centers across North America. Designed and built in Fremont, California.",
      },
      {
        slug: "news-second-line",
        kind: "news",
        title: "Northwind opens a second Fremont assembly line",
        date: "September 2026",
        text: "Northwind Robotics will open a second assembly line at its Fremont facility this fall. The second line opens in November, and we expect to double warehouse-robot output by next spring, said Dana Whitfield, Northwind's chief operating officer. The company is also qualifying a second supplier for the drive motors used in every cart after delays earlier this year. Northwind has not said which customer segments the added capacity will serve first.",
      },
      {
        slug: "about",
        kind: "about",
        title: "About Northwind Robotics",
        text: "Founded in 2019, Northwind Robotics employs 180 people in Fremont, California. The company raised a Series B in 2025 to expand manufacturing. Our customers are third-party logistics providers, grocery distributors, and e-commerce fulfillment centers with 50,000 to 400,000 square feet of floor space.",
      },
      {
        slug: "careers",
        kind: "careers",
        title: "Careers at Northwind Robotics",
        text: "We are hiring a Supply Chain Manager to build a dual-source strategy for motors, sensors, and batteries, and a Market Analyst to size demand in new warehouse segments. Both roles report to our Head of Strategy and are based in Fremont.",
      },
    ],
    brief: {
      fit_score: 84,
      profile: "Northwind Robotics builds autonomous carts for mid-size warehouses and is opening a second assembly line in Fremont to double output by next spring.",
      criteria: [
        { id: "c1", status: "supported", evidence_ids: ["e2"], note: "A second Fremont line opens in November, aiming to double output by spring." },
        { id: "c2", status: "supported", evidence_ids: ["e1", "e3"], note: "Robotics hardware, designed and built in Fremont." },
        { id: "c3", status: "supported", evidence_ids: ["e2", "e4"], note: "Hasn't said which segments the new capacity will serve, and is hiring to dual-source motors." },
      ],
      mutual_benefit: [
        { claim: "Northwind needs a view of which warehouse segments to fill the new line with, which matches BEACN's market sizing work.", basis: "evidenced", evidence_ids: ["e2", "e4"] },
        { claim: "A student team could take on supplier research while the Supply Chain Manager role is open.", basis: "inferred", evidence_ids: [] },
      ],
      missing_information: [
        { question: "Who owns the plan for the second line's first customers?", why_it_matters: "That person is the natural sponsor for a project.", how_to_verify: "Ask in a first call, or check whether the Head of Strategy posts about it." },
      ],
      recommended_roles: ["Head of Strategy", "VP Operations"],
      hook: {
        text: "Northwind's second assembly line in Fremont and the plan to double warehouse-robot output by next spring",
        evidence_ids: ["e2"],
        quotes: ["we expect to double warehouse-robot output by next spring"],
      },
      ideas: [
        { title: "Segment sizing", sentence: "Estimate demand by warehouse segment so the new line's first year of output goes where it sells fastest.", service: "market sizing", evidence_ids: ["e2", "e3"] },
        { title: "Motor second source", sentence: "Map qualified drive-motor suppliers and their lead times to back up the dual-source plan.", service: "supply-chain analysis", evidence_ids: ["e2", "e4"] },
        { title: "Competitor map", sentence: "Compare autonomous-cart vendors serving third-party logistics providers on price, payload, and setup time.", service: "competitive landscaping", evidence_ids: ["e1", "e3"] },
      ],
      subject: "BEACN x Northwind Robotics collaboration?",
    },
    people: [
      ["Jordan Lee", "VP Operations", "v"],
      ["Casey Morgan", "Head of Strategy", "v"],
      ["Dana Whitfield", "Chief Operating Officer", "r"],
      ["Taylor Kim", "Director of Operations", "v"],
      ["Quinn Patel", "Chief of Staff", "n"],
      ["Riley Chen", "Director of Supply Chain", "n"],
      ["Morgan Diaz", "VP Business Development", "u"],
      ["", "", "g"],
    ],
  },
  {
    name: "Harbor Cell Works",
    domain: "harborcell.example",
    reason: "Piloting sodium-ion battery packs with two utility partners.",
    reasonSlug: "news-utility-pilots",
    pages: [
      {
        slug: "home",
        kind: "home",
        title: "Harbor Cell Works | Sodium-ion storage for the grid",
        text: "Harbor Cell Works makes sodium-ion battery packs for grid storage. Sodium-ion cells use no lithium, cobalt, or nickel, and our packs are designed for daily cycling at substations and solar farms. Our pilot line is in Oakland, California.",
      },
      {
        slug: "news-utility-pilots",
        kind: "news",
        title: "Harbor Cell Works begins pilots with two West Coast utilities",
        date: "August 2026",
        text: "Harbor Cell Works has installed pilot packs at substations operated by two West Coast utilities. The pilots run for twelve months and will compare cycle life and cold-weather performance against lithium iron phosphate systems. Harbor plans to choose a site for its first commercial factory in 2027 and is weighing federal and state incentives as part of that decision.",
      },
      {
        slug: "about",
        kind: "about",
        title: "About Harbor Cell Works",
        text: "Harbor Cell Works was founded in 2021 by battery researchers from national laboratories. The team of 65 is based in Oakland. Harbor raised a Series A in 2024 led by climate-focused investors.",
      },
    ],
    brief: {
      fit_score: 79,
      profile: "Harbor Cell Works makes sodium-ion grid storage in Oakland and is running twelve-month pilots with two utilities before siting its first factory.",
      criteria: [
        { id: "c1", status: "supported", evidence_ids: ["e2"], note: "Pilots underway, first commercial factory to be sited in 2027." },
        { id: "c2", status: "supported", evidence_ids: ["e1", "e3"], note: "Battery hardware with a pilot line in Oakland." },
        { id: "c3", status: "supported", evidence_ids: ["e2"], note: "Weighing federal and state incentives for its factory site." },
      ],
      mutual_benefit: [
        { claim: "Harbor's factory siting decision depends on incentives, which is BEACN's regulatory research work.", basis: "evidenced", evidence_ids: ["e2"] },
        { claim: "Pilot results could feed a market sizing study for utility storage buyers.", basis: "inferred", evidence_ids: [] },
      ],
      missing_information: [
        { question: "Which states are on the factory shortlist?", why_it_matters: "It sets the scope of an incentives comparison.", how_to_verify: "Ask in the first call." },
      ],
      recommended_roles: ["Head of Strategy", "Chief of Staff"],
      hook: {
        text: "Harbor's sodium-ion pilots with two West Coast utilities and the plan to site a first commercial factory in 2027",
        evidence_ids: ["e2"],
        quotes: ["Harbor plans to choose a site for its first commercial factory in 2027"],
      },
      ideas: [
        { title: "Incentive comparison", sentence: "Compare federal and state manufacturing incentives across the factory shortlist.", service: "regulatory research", evidence_ids: ["e2"] },
        { title: "Utility demand", sentence: "Size the substation storage market among utilities similar to the two pilot partners.", service: "market sizing", evidence_ids: ["e1", "e2"] },
        { title: "Chemistry landscape", sentence: "Benchmark sodium-ion against lithium iron phosphate suppliers on cost and cycle life.", service: "competitive landscaping", evidence_ids: ["e2"] },
      ],
      subject: "BEACN x Harbor Cell Works collaboration?",
    },
    people: [
      ["Avery Brooks", "Head of Strategy", "v"],
      ["Sam Rivera", "Chief of Staff", "r"],
      ["Jamie Ortiz", "VP Operations", "v"],
      ["Priya Raman", "Founder / CEO", "u"],
      ["Elliot Shaw", "Director of Policy", "n"],
      ["", "", "g"],
    ],
  },
  {
    name: "Lumen Grid",
    domain: "lumengrid.example",
    reason: "Hiring a first operations lead ahead of a Series A.",
    reasonSlug: "careers",
    pages: [
      {
        slug: "home",
        kind: "home",
        title: "Lumen Grid | Controllers that make buildings grid-friendly",
        text: "Lumen Grid makes a controller that shifts a commercial building's heating, cooling, and EV charging to cheaper, cleaner hours. One box per building, installed in an afternoon. Engineered in San Jose and manufactured with a contract partner in Milpitas.",
      },
      {
        slug: "careers",
        kind: "careers",
        title: "Careers at Lumen Grid",
        text: "We are hiring our first Head of Operations to scale production with our contract manufacturer from hundreds to thousands of controllers a year ahead of our Series A. You will own supplier relationships, quality, and our launch into two new utility territories next year.",
      },
      {
        slug: "news-territories",
        kind: "news",
        title: "Lumen Grid to launch in two new utility territories",
        date: "July 2026",
        text: "Lumen Grid will expand beyond PG&E territory next year. The company has not announced which territories, saying it is studying demand-response program rules and rebate levels before choosing.",
      },
    ],
    brief: {
      fit_score: 74,
      profile: "Lumen Grid sells a controller that shifts building energy use to off-peak hours and is scaling production ahead of a Series A.",
      criteria: [
        { id: "c1", status: "supported", evidence_ids: ["e2"], note: "Scaling from hundreds to thousands of controllers a year." },
        { id: "c2", status: "supported", evidence_ids: ["e1"], note: "Energy hardware engineered in San Jose." },
        { id: "c3", status: "supported", evidence_ids: ["e3"], note: "Still choosing which utility territories to enter." },
      ],
      mutual_benefit: [
        { claim: "Choosing new territories depends on program rules and rebates, which BEACN can research.", basis: "evidenced", evidence_ids: ["e3"] },
        { claim: "A small team could help the new operations lead with supplier research.", basis: "inferred", evidence_ids: [] },
      ],
      missing_information: [
        { question: "Has the Head of Operations role been filled?", why_it_matters: "That person would be the likely project sponsor.", how_to_verify: "Check the careers page before sending." },
      ],
      recommended_roles: ["Founder / CEO", "Head of Product"],
      hook: {
        text: "Lumen Grid's plan to launch in two new utility territories next year",
        evidence_ids: ["e3"],
        quotes: ["it is studying demand-response program rules and rebate levels before choosing"],
      },
      ideas: [
        { title: "Territory scan", sentence: "Compare demand-response rules and rebate levels across candidate utility territories.", service: "regulatory research", evidence_ids: ["e3"] },
        { title: "Building demand", sentence: "Estimate how many commercial buildings in each territory fit the controller's sweet spot.", service: "market sizing", evidence_ids: ["e1", "e3"] },
        { title: "Supplier risk", sentence: "Map component risks as production grows to thousands of units a year.", service: "supply-chain analysis", evidence_ids: ["e2"] },
      ],
      subject: "BEACN x Lumen Grid collaboration?",
    },
    people: [
      ["Noor Haddad", "Founder / CEO", "v"],
      ["Chris Alvarez", "Head of Product", "v"],
      ["Mei Tanaka", "Chief of Staff", "n"],
      ["", "", "g"],
    ],
  },
  {
    name: "Tidewater Motors",
    domain: "tidewater.example",
    reason: "Launching an electric outboard motor for commercial workboats.",
    reasonSlug: "news-launch",
    pages: [
      {
        slug: "home",
        kind: "home",
        title: "Tidewater Motors | Electric outboards for working boats",
        text: "Tidewater Motors designs electric outboard motors for harbor workboats, water taxis, and research vessels. Quiet, zero-emission, and built in Richmond, California.",
      },
      {
        slug: "news-launch",
        kind: "news",
        title: "Tidewater launches its first commercial outboard",
        date: "September 2026",
        text: "Tidewater Motors has started shipping the T-80, its first electric outboard rated for commercial use. The company is building a dealer network along the West Coast and says marina charging is the biggest question for its customers.",
      },
      {
        slug: "about",
        kind: "about",
        title: "About Tidewater Motors",
        text: "Tidewater Motors has 45 employees and assembles motors at its Richmond facility. The company was founded by marine engineers in 2020.",
      },
    ],
    brief: {
      fit_score: 71,
      profile: "Tidewater Motors builds electric outboards for commercial boats in Richmond and just started shipping its first commercial model.",
      criteria: [
        { id: "c1", status: "supported", evidence_ids: ["e2"], note: "Shipping its first commercial outboard, the T-80." },
        { id: "c2", status: "supported", evidence_ids: ["e1", "e3"], note: "Clean-energy hardware assembled in Richmond." },
        { id: "c3", status: "unknown", evidence_ids: [], note: "Marina charging is named as a customer question, not a company one." },
      ],
      mutual_benefit: [
        { claim: "A map of marina charging could help Tidewater's dealers answer the main customer question.", basis: "evidenced", evidence_ids: ["e2"] },
        { claim: "Dealer expansion may need market sizing by port.", basis: "inferred", evidence_ids: [] },
      ],
      missing_information: [
        { question: "Does Tidewater want outside help with charging, or is a partner already on it?", why_it_matters: "Decides whether this is a fit at all.", how_to_verify: "Ask the VP Business Development." },
      ],
      recommended_roles: ["VP Business Development"],
      hook: {
        text: "the launch of Tidewater's T-80 electric outboard for commercial boats",
        evidence_ids: ["e2"],
        quotes: ["has started shipping the T-80, its first electric outboard rated for commercial use"],
      },
      ideas: [
        { title: "Charging map", sentence: "Survey charging availability at West Coast marinas where workboats dock.", service: "data collection", evidence_ids: ["e2"] },
        { title: "Port demand", sentence: "Estimate workboat fleets by port to prioritize the dealer rollout.", service: "market sizing", evidence_ids: ["e2"] },
        { title: "Rival outboards", sentence: "Compare electric outboard makers on power, range, and price.", service: "competitive landscaping", evidence_ids: ["e1"] },
      ],
      subject: "BEACN x Tidewater Motors collaboration?",
    },
    people: [
      ["Grace Holloway", "VP Business Development", "v"],
      ["Ben Okafor", "VP Operations", "r"],
      ["Lena Fischer", "Head of Strategy", "n"],
      ["", "", "g"],
    ],
  },
  {
    name: "Copperline Labs",
    domain: "copperline.example",
    reason: "Building a pilot plant in Richmond to recover copper from e-waste.",
    reasonSlug: "news-pilot-plant",
    pages: [
      {
        slug: "home",
        kind: "home",
        title: "Copperline Labs | Copper recovered, not mined",
        text: "Copperline Labs recovers high-purity copper from electronic waste for EV wiring and motors. Our process uses less energy than smelting and produces no slag.",
      },
      {
        slug: "news-pilot-plant",
        kind: "news",
        title: "Copperline breaks ground on Richmond pilot plant",
        date: "June 2026",
        text: "Copperline Labs has broken ground on a pilot plant in Richmond, California, designed to process 2,000 tons of e-waste a year when it opens in 2027. The company is negotiating supply agreements with electronics recyclers across California.",
      },
    ],
    brief: {
      fit_score: 66,
      profile: "Copperline Labs recovers copper from e-waste and is building a pilot plant in Richmond that opens in 2027.",
      criteria: [
        { id: "c1", status: "supported", evidence_ids: ["e2"], note: "Pilot plant under construction, opening in 2027." },
        { id: "c2", status: "supported", evidence_ids: ["e2"], note: "Clean-tech materials company building in Richmond." },
        { id: "c3", status: "unknown", evidence_ids: [], note: "No public strategic question found." },
      ],
      mutual_benefit: [
        { claim: "Feedstock supply agreements could use a map of California e-waste recyclers.", basis: "evidenced", evidence_ids: ["e2"] },
      ],
      missing_information: [
        { question: "Who leads the recycler negotiations?", why_it_matters: "They would own a supply-side project.", how_to_verify: "Look for a business development lead." },
      ],
      recommended_roles: ["Head of Strategy"],
      hook: {
        text: "Copperline's Richmond pilot plant, set to process 2,000 tons of e-waste a year",
        evidence_ids: ["e2"],
        quotes: ["designed to process 2,000 tons of e-waste a year when it opens in 2027"],
      },
      ideas: [
        { title: "Recycler map", sentence: "List California e-waste recyclers by volume and contract terms.", service: "supply-chain analysis", evidence_ids: ["e2"] },
        { title: "Buyer demand", sentence: "Size demand for recycled copper among EV wiring makers.", service: "market sizing", evidence_ids: ["e1"] },
        { title: "Permit review", sentence: "Summarize state permitting steps for the pilot plant.", service: "regulatory research", evidence_ids: ["e2"] },
      ],
      subject: "BEACN x Copperline Labs collaboration?",
    },
    people: [
      ["Hana Suzuki", "Head of Strategy", "v"],
      ["Marcus Bell", "Founder / CEO", "u"],
      ["", "", "g"],
    ],
  },
  {
    name: "Solstice Thermal",
    domain: "solstice.example",
    reason: "First commercial install of an industrial heat pump at a food plant.",
    reasonSlug: "news-first-install",
    pages: [
      {
        slug: "home",
        kind: "home",
        title: "Solstice Thermal | Industrial heat pumps",
        text: "Solstice Thermal builds heat pumps that deliver process heat up to 200°C for food and beverage plants, replacing gas boilers. Headquartered in Sacramento, California.",
      },
      {
        slug: "news-first-install",
        kind: "news",
        title: "Solstice completes first commercial install",
        date: "May 2026",
        text: "Solstice Thermal has completed its first commercial installation at a tomato-processing plant in the Central Valley. The unit replaced one of the plant's three gas boilers.",
      },
    ],
    brief: {
      fit_score: 58,
      profile: "Solstice Thermal makes industrial heat pumps for food plants and finished its first commercial install this year.",
      criteria: [
        { id: "c1", status: "supported", evidence_ids: ["e2"], note: "First commercial installation completed." },
        { id: "c2", status: "not_met", evidence_ids: ["e1"], note: "Headquartered in Sacramento, outside the Bay Area." },
        { id: "c3", status: "unknown", evidence_ids: [], note: "No open question found in public pages." },
      ],
      mutual_benefit: [{ claim: "Food processors replacing boilers are a sizable market to estimate.", basis: "inferred", evidence_ids: [] }],
      missing_information: [
        { question: "Is Solstice open to working with a Bay Area team?", why_it_matters: "It fails the location criterion.", how_to_verify: "Skip unless you widen the geography." },
      ],
      recommended_roles: ["Founder / CEO"],
      hook: {
        text: "Solstice's first commercial heat-pump install at a Central Valley food plant",
        evidence_ids: ["e2"],
        quotes: ["has completed its first commercial installation at a tomato-processing plant in the Central Valley"],
      },
      ideas: [
        { title: "Boiler market", sentence: "Size the number of gas boilers in California food processing.", service: "market sizing", evidence_ids: ["e1"] },
        { title: "Incentive scan", sentence: "List rebates for replacing industrial gas boilers.", service: "regulatory research", evidence_ids: ["e2"] },
        { title: "Peer review", sentence: "Compare industrial heat pump makers by temperature range.", service: "competitive landscaping", evidence_ids: ["e1"] },
      ],
      subject: "BEACN x Solstice Thermal collaboration?",
    },
    people: [
      ["Owen Price", "Founder / CEO", "v"],
      ["", "", "g"],
    ],
  },
];

export const demoCompany = (domain: string) => DEMO_COMPANIES.find((c) => c.domain === domain) ?? null;
