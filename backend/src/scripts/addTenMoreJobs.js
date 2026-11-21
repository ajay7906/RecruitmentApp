'use strict';

require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env'),
});

const crypto = require('crypto');
const prisma = require('../config/prisma');

function computeJobHash(payload) {
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const normalized = [
    norm(payload.title),
    norm(payload.employmentType),
    norm(payload.workMode),
    norm(payload.city),
    norm(payload.country),
    norm(payload.description).slice(0, 600),
  ].join('|');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

const NEW_JOBS = [
  // NexusCloud Systems (Aarav Sharma)
  {
    recruiterEmail: 'aarav.sharma@nexuscloud.io',
    job: {
      title: 'Staff Kubernetes Systems Engineer',
      department: 'Infrastructure',
      category: 'DevOps & SRE',
      numberOfOpenings: 2,
      employmentType: 'Full Time',
      workMode: 'Remote',
      experienceLevel: 'Staff Level (6–9 Years)',
      minExperience: 6,
      maxExperience: 9,
      minSalary: 2200000,
      maxSalary: 3400000,
      salaryCurrency: 'INR',
      salaryPeriod: 'Yearly',
      discloseSalary: true,
      country: 'India',
      state: 'Karnataka',
      city: 'Bengaluru',
      officeLocation: 'Remote India',
      pincode: '560103',
      location: 'Bengaluru, Karnataka, India',
      summary:
        'Architect enterprise Kubernetes runtime clusters, CNI networking with Cilium/eBPF, and service mesh governance across high-scale cloud environments.',
      description: `## Role Overview
NexusCloud Systems is looking for a Staff Kubernetes Systems Engineer to build and optimize our high-throughput container control planes and networking layers.

## Key Responsibilities
- Design and operate multi-tenant Kubernetes clusters with strict resource isolation.
- Implement advanced container networking using Cilium and eBPF.
- Develop custom Kubernetes controllers and operators in Go.
- Automate cluster lifecycle operations using Cluster API and GitOps.

## Requirements
- 6+ years in systems programming and cloud infrastructure, with 4+ years dedicated to Kubernetes internals.
- Strong proficiency in Go, Linux kernel networking, and eBPF.
- Deep experience with service meshes (Istio/Linkerd) and container security.`,
      requiredSkills: ['Kubernetes', 'Go', 'Cilium', 'eBPF', 'Helm', 'Linux Kernel', 'Docker'],
      preferredSkills: ['Cluster API', 'Istio', 'Prometheus Operator'],
      educationalQualification: 'B.Tech / M.Tech in Computer Science',
      minEducationLevel: "Bachelor's Degree",
      responsibilities: [
        'Engineer and scale Kubernetes control planes across cloud regions.',
        'Implement eBPF observability and network security filtering.',
        'Author internal custom resource definitions (CRDs) and operators.',
      ],
      benefits: ['Top-tier Health Coverage', 'Annual Bonus', 'ESOPs'],
      perks: ['Fully Remote Work', 'High-end Hardware', 'Home Office Allowance'],
      applicationInstructions: 'Provide your GitHub profile or links to open-source contributions in Kubernetes/Go.',
    },
  },
  {
    recruiterEmail: 'aarav.sharma@nexuscloud.io',
    job: {
      title: 'FinOps Cloud Cost Specialist',
      department: 'Cloud Operations',
      category: 'Cloud & Finance',
      numberOfOpenings: 1,
      employmentType: 'Full Time',
      workMode: 'Hybrid',
      experienceLevel: 'Mid-Senior Level (4–7 Years)',
      minExperience: 4,
      maxExperience: 7,
      minSalary: 1500000,
      maxSalary: 2300000,
      salaryCurrency: 'INR',
      salaryPeriod: 'Yearly',
      discloseSalary: true,
      country: 'India',
      state: 'Karnataka',
      city: 'Bengaluru',
      officeLocation: 'Bellandur Campus',
      pincode: '560103',
      location: 'Bengaluru, Karnataka, India',
      summary:
        'Drive multi-million dollar cloud cost optimization, spot instance utilization, and automated FinOps telemetry across AWS and GCP workloads.',
      description: `## Role Overview
Help us build sustainable and cost-efficient cloud architectures by analyzing cloud consumption, establishing unit economics, and driving automated right-sizing.

## Key Responsibilities
- Monitor AWS and GCP spend using tools like Kubecost, AWS Cost Explorer, and Cloudability.
- Identify unused compute, oversized clusters, and unattached storage volumes.
- Partner with engineering teams to adopt Reserved Instances, Savings Plans, and Spot instances.
- Build cost anomaly detection alerts and executive spending dashboards.

## Requirements
- 4+ years in cloud cost governance or FinOps.
- FinOps Certified Practitioner (FOCP) preferred.
- Practical experience with AWS Cost Explorer, SQL, and Python automation.`,
      requiredSkills: ['FinOps', 'AWS Cost Explorer', 'CloudWatch', 'Python', 'SQL', 'Terraform', 'Kubecost'],
      preferredSkills: ['Savings Plans', 'GCP Billing', 'Looker'],
      educationalQualification: 'B.Tech / B.E. / MBA with technical background',
      minEducationLevel: "Bachelor's Degree",
      responsibilities: [
        'Establish unit economic metrics for cloud infrastructure usage.',
        'Lead monthly cloud cost reviews with engineering leads.',
        'Implement automated resource scheduling and shutdown scripts.',
      ],
      benefits: ['Health Insurance', 'Performance Incentive', 'PF Matching'],
      perks: ['Hybrid Schedule', 'Catered Lunch', 'Wellness Reimbursement'],
      applicationInstructions: 'Share details of cloud cost savings programs you have spearheaded.',
    },
  },

  // FinVerse Technologies (Priya Nair)
  {
    recruiterEmail: 'priya.nair@finverse.tech',
    job: {
      title: 'Blockchain & Smart Contract Developer',
      department: 'Decentralized Finance',
      category: 'Software Development',
      numberOfOpenings: 2,
      employmentType: 'Full Time',
      workMode: 'Remote',
      experienceLevel: 'Mid-Senior Level (3–6 Years)',
      minExperience: 3,
      maxExperience: 6,
      minSalary: 2000000,
      maxSalary: 3200000,
      salaryCurrency: 'INR',
      salaryPeriod: 'Yearly',
      discloseSalary: true,
      country: 'India',
      state: 'Maharashtra',
      city: 'Mumbai',
      officeLocation: 'Remote India',
      pincode: '400051',
      location: 'Mumbai, Maharashtra, India',
      summary:
        'Engineer secure Solidity smart contracts, decentralized payment escrow protocols, and Web3 integration middleware for digital asset settlement.',
      description: `## Role Overview
FinVerse is expanding into institutional cross-border settlements and asset tokenization. We are seeking a talented Smart Contract Developer to build audited blockchain primitives.

## Key Responsibilities
- Write secure, gas-optimized smart contracts in Solidity.
- Conduct automated unit testing and fuzz testing with Foundry / Hardhat.
- Integrate Web3 libraries with backend services (Node.js, ethers.js).
- Collaborate with top auditing firms during formal smart contract security reviews.

## Requirements
- 3+ years in blockchain development with Solidity.
- Deep knowledge of EVM internals, gas optimization, and reentrancy safeguards.
- Familiarity with Layer-2 scaling solutions (Polygon, Arbitrum).`,
      requiredSkills: ['Solidity', 'Ethereum', 'Web3.js', 'Hardhat', 'TypeScript', 'Foundry', 'EVM'],
      preferredSkills: ['Rust', 'DeFi Protocols', 'Smart Contract Auditing'],
      educationalQualification: 'B.Tech in Computer Science or Mathematics',
      minEducationLevel: "Bachelor's Degree",
      responsibilities: [
        'Develop secure Solidity smart contracts for settlement ledgers.',
        'Perform unit, fuzz, and invariant testing.',
        'Build backend integration services using Node.js and ethers.js.',
      ],
      benefits: ['Full Family Medical Cover', 'Crypto / Tech Learning Grant', 'Yearly Bonus'],
      perks: ['Work From Anywhere', 'Top-spec MacBook Pro', 'Flexible Time Off'],
      applicationInstructions: 'Provide verified GitHub or contract addresses deployed on Ethereum/Polygon.',
    },
  },
  {
    recruiterEmail: 'priya.nair@finverse.tech',
    job: {
      title: 'Lending Operations & Credit Risk Manager',
      department: 'Credit Risk',
      category: 'Finance & Risk',
      numberOfOpenings: 1,
      employmentType: 'Full Time',
      workMode: 'Hybrid',
      experienceLevel: 'Mid-Senior Level (5–8 Years)',
      minExperience: 5,
      maxExperience: 8,
      minSalary: 1800000,
      maxSalary: 2700000,
      salaryCurrency: 'INR',
      salaryPeriod: 'Yearly',
      discloseSalary: true,
      country: 'India',
      state: 'Maharashtra',
      city: 'Mumbai',
      officeLocation: 'One BKC Campus',
      pincode: '400051',
      location: 'Mumbai, Maharashtra, India',
      summary:
        'Oversee algorithmic loan underwriting policies, credit bureau bureau data integrations, and portfolio delinquency management.',
      description: `## Role Overview
Join FinVerse to direct credit underwriting guidelines and credit risk strategies for our consumer and MSME lending portfolios.

## Key Responsibilities
- Design and fine-tune credit scoring matrices using bureau (CIBIL/Experian) and alternative data.
- Monitor portfolio delinquency rates (NPA, PAR30/90) and implement corrective underwriting rules.
- Ensure 100% adherence to RBI digital lending guidelines and Fair Practices Code.
- Collaborate with data scientists to validate predictive credit default models.

## Requirements
- 5+ years in credit underwriting or risk management within NBFCs, banks, or fintechs.
- Strong analytical skillset with SQL and Excel modeling.
- Solid understanding of digital lending flows and collection strategies.`,
      requiredSkills: ['Credit Scoring', 'Risk Modeling', 'Underwriting', 'SQL', 'RBI Norms', 'Portfolio Management'],
      preferredSkills: ['Python', 'Tableau', 'NBFC Lending'],
      educationalQualification: 'MBA in Finance / CA / CFA',
      minEducationLevel: "Master's Degree",
      responsibilities: [
        'Manage portfolio credit risk and loan loss provisioning.',
        'Optimize automated underwriting rule engines.',
        'Deliver compliance reporting for institutional debt partners.',
      ],
      benefits: ['Executive Health Cover', 'Performance Bonus', 'Stock Options'],
      perks: ['BKC Office Perks', 'Transit Allowance', 'Executive Cafeteria'],
      applicationInstructions: 'Submit resume with details of lending book sizes and NPA metrics managed.',
    },
  },

  // HealthIQ AI (Rohan Verma)
  {
    recruiterEmail: 'rohan.verma@healthiq.ai',
    job: {
      title: 'MLOps & LLM Deployment Engineer',
      department: 'AI Platform',
      category: 'Artificial Intelligence',
      numberOfOpenings: 2,
      employmentType: 'Full Time',
      workMode: 'Hybrid',
      experienceLevel: 'Mid-Senior Level (4–7 Years)',
      minExperience: 4,
      maxExperience: 7,
      minSalary: 2200000,
      maxSalary: 3200000,
      salaryCurrency: 'INR',
      salaryPeriod: 'Yearly',
      discloseSalary: true,
      country: 'India',
      state: 'Telangana',
      city: 'Hyderabad',
      officeLocation: 'HITEC City Campus',
      pincode: '500081',
      location: 'Hyderabad, Telangana, India',
      summary:
        'Build low-latency LLM serving infrastructure, GPU cluster scheduling, and continuous model monitoring pipelines for clinical AI services.',
      description: `## Role Overview
Scale our healthcare AI deployment infrastructure using vLLM, Triton Inference Server, and Kubernetes to serve real-time diagnostic predictions to hundreds of hospitals.

## Key Responsibilities
- Deploy quantized Large Language Models (LLMs) and vision models using vLLM and TensorRT-LLM.
- Build automated retraining and continuous validation pipelines using Kubeflow / MLflow.
- Monitor model latency, throughput, and GPU utilization on NVIDIA A100/H100 clusters.
- Enforce strict clinical safety checks, prompt guardrails, and data sanitization.

## Requirements
- 4+ years of software/infrastructure engineering with 2+ years focused on MLOps.
- Strong proficiency in Docker, Kubernetes, Python, and Linux.
- Hands-on experience with LLM serving engines (vLLM, Ollama, Triton, or TGI).`,
      requiredSkills: ['MLOps', 'vLLM', 'Docker', 'Kubernetes', 'Triton Inference Server', 'Python', 'PyTorch'],
      preferredSkills: ['Kubeflow', 'MLflow', 'NVIDIA GPU Clustering'],
      educationalQualification: 'B.Tech / M.Tech in Computer Science or Software Engineering',
      minEducationLevel: "Bachelor's Degree",
      responsibilities: [
        'Scale inference serving for medical imaging and clinical LLM models.',
        'Implement automated model registry and canary deployment pipelines.',
        'Maintain zero-downtime GPU infrastructure operations.',
      ],
      benefits: ['Medical & Dental Cover', 'Performance Bonus', 'ESOP Grants'],
      perks: ['Access to Premier GPU Hardware', 'Hybrid Scheduling', 'Annual Learning Grant'],
      applicationInstructions: 'Provide CV with details of model serving frameworks you have used in production.',
    },
  },
  {
    recruiterEmail: 'rohan.verma@healthiq.ai',
    job: {
      title: 'Regulatory Affairs & Medical Device Compliance Lead',
      department: 'Regulatory & Clinical',
      category: 'Healthcare & Compliance',
      numberOfOpenings: 1,
      employmentType: 'Full Time',
      workMode: 'Remote',
      experienceLevel: 'Lead Level (6–10 Years)',
      minExperience: 6,
      maxExperience: 10,
      minSalary: 2000000,
      maxSalary: 3000000,
      salaryCurrency: 'INR',
      salaryPeriod: 'Yearly',
      discloseSalary: true,
      country: 'India',
      state: 'Telangana',
      city: 'Hyderabad',
      officeLocation: 'Remote India',
      pincode: '500081',
      location: 'Hyderabad, Telangana, India',
      summary:
        'Lead FDA 510(k), CE mark, and CDSCO regulatory clearance filings for Software as a Medical Device (SaMD) diagnostic products.',
      description: `## Role Overview
Guide our AI medical devices from clinical validation through regulatory approval with the US FDA, European EMA, and Indian CDSCO.

## Key Responsibilities
- Prepare 510(k) premarket notifications, technical dossiers, and clinical evaluation reports.
- Maintain ISO 13485 Quality Management System (QMS) across software engineering lifecycles.
- Coordinate with clinical investigation sites, institutional review boards (IRB), and auditors.
- Ensure risk management compliance in accordance with ISO 14971 and IEC 62304 standards.

## Requirements
- 6+ years in medical device regulatory affairs, specifically with Software as a Medical Device (SaMD).
- Demonstrated success filing and receiving FDA 510(k) clearance or CE marking for software.
- In-depth understanding of IEC 62304, ISO 13485, and HIPAA compliance.`,
      requiredSkills: ['FDA SaMD', 'ISO 13485', 'IEC 62304', 'HIPAA', 'Clinical Trials', 'Quality Management'],
      preferredSkills: ['CE Mark Filing', 'CDSCO Regulations', 'ISO 14971'],
      educationalQualification: 'Master / Bachelor in Biomedical Engineering, Pharmacy, or Life Sciences',
      minEducationLevel: "Bachelor's Degree",
      responsibilities: [
        'Lead regulatory submissions for AI diagnostic software.',
        'Oversee clinical trial documentation and audit readiness.',
        'Enforce software lifecycle quality standards.',
      ],
      benefits: ['Comprehensive Medical Cover', 'Annual Executive Bonus', 'Stock Options'],
      perks: ['Remote Flexibility', 'Travel Budget for Clinical Conferences', 'Wellness Grant'],
      applicationInstructions: 'Upload your CV citing specific regulatory filings (510k, CE mark) you have led.',
    },
  },

  // HyperKart E-Commerce (Neha Gupta)
  {
    recruiterEmail: 'neha.gupta@hyperkart.com',
    job: {
      title: 'Growth & Retention Marketing Manager',
      department: 'Marketing & Growth',
      category: 'Marketing & Communications',
      numberOfOpenings: 1,
      employmentType: 'Full Time',
      workMode: 'Hybrid',
      experienceLevel: 'Mid-Senior Level (4–7 Years)',
      minExperience: 4,
      maxExperience: 7,
      minSalary: 1600000,
      maxSalary: 2500000,
      salaryCurrency: 'INR',
      salaryPeriod: 'Yearly',
      discloseSalary: true,
      country: 'India',
      state: 'Haryana',
      city: 'Gurugram',
      officeLocation: 'Cyber City Campus',
      pincode: '122002',
      location: 'Gurugram, Haryana, India',
      summary:
        'Drive multi-channel customer lifecycle engagement, push notification strategies, and repeat purchase loyalty across 5M+ active quick-commerce users.',
      description: `## Role Overview
HyperKart is seeking a growth-focused Retention Marketing Manager to optimize user activation, reduce churn, and maximize monthly transacting users (MTU).

## Key Responsibilities
- Architect automated CRM funnels using tools like CleverTap, MoEngage, or Braze.
- Design targeted push notification, SMS, WhatsApp, and in-app banner campaigns.
- Run multivariate A/B testing on promotional incentives, discount pricing, and referral loops.
- Analyze cohort retention metrics, customer lifetime value (LTV), and CAC using SQL and Mixpanel.

## Requirements
- 4+ years in growth marketing or customer retention in high-frequency consumer apps or e-commerce.
- Strong analytical ability with SQL and data visualization dashboards.
- Proven track record increasing user repeat order frequency.`,
      requiredSkills: ['Growth Marketing', 'CleverTap', 'Mixpanel', 'SQL', 'A/B Testing', 'User Retention', 'CRM'],
      preferredSkills: ['Braze', 'MoEngage', 'Cohort Analysis'],
      educationalQualification: 'MBA in Marketing / B.Tech from leading institution',
      minEducationLevel: "Bachelor's Degree",
      responsibilities: [
        'Own customer retention and loyalty program KPIs.',
        'Deploy data-driven customer segmentation campaigns.',
        'Synthesize user funnel insights to inform product feature priorities.',
      ],
      benefits: ['Medical Insurance', 'Performance Bonus', 'HyperKart Grocery Credits'],
      perks: ['Cyber City Perks', 'Hybrid Work Scheduling', 'Gym Membership'],
      applicationInstructions: 'Share your CV and highlight retention campaigns that drove measurable MTU growth.',
    },
  },
  {
    recruiterEmail: 'neha.gupta@hyperkart.com',
    job: {
      title: 'Dark Store Fleet & IoT Operations Lead',
      department: 'Operations',
      category: 'Operations & Supply Chain',
      numberOfOpenings: 2,
      employmentType: 'Full Time',
      workMode: 'Onsite',
      experienceLevel: 'Mid Level (3–6 Years)',
      minExperience: 3,
      maxExperience: 6,
      minSalary: 1300000,
      maxSalary: 1900000,
      salaryCurrency: 'INR',
      salaryPeriod: 'Yearly',
      discloseSalary: true,
      country: 'India',
      state: 'Haryana',
      city: 'Gurugram',
      officeLocation: 'Cyber City Campus',
      pincode: '122002',
      location: 'Gurugram, Haryana, India',
      summary:
        'Lead IoT sensor telemetry, automated inventory scales, and delivery rider fleet charging infrastructure across quick-commerce dark stores.',
      description: `## Role Overview
Ensure high-efficiency dark store dispatch by integrating smart scales, thermal temperature sensors, barcode scanners, and electric vehicle fleet charging hubs.

## Key Responsibilities
- Oversee hardware maintenance and network reliability across 50+ localized dark stores.
- Deploy temperature monitoring IoT sensors for cold-chain dairy, produce, and frozen items.
- Optimize rider dispatch docking stations and battery swapping infrastructure.
- Analyze store fulfillment bottleneck metrics to reduce rider waiting times.

## Requirements
- 3+ years in supply chain operations, fleet logistics, or warehouse technology deployment.
- Experience with IoT sensors, barcode hardware, and real-time operations dashboards.
- Strong problem-solving and vendor coordination capabilities.`,
      requiredSkills: ['Fleet Management', 'IoT Sensors', 'Supply Chain', 'Logistics', 'Warehouse Management'],
      preferredSkills: ['Cold Chain Logistics', 'Hardware Troubleshooting', 'Vendor Management'],
      educationalQualification: 'B.Tech in Mechanical, Electrical, or Industrial Engineering',
      minEducationLevel: "Bachelor's Degree",
      responsibilities: [
        'Ensure 99.9% uptime for dark store scanning and dispatch hardware.',
        'Implement cold-chain temperature compliance monitoring.',
        'Supervise field technicians and battery charging hubs.',
      ],
      benefits: ['Comprehensive Medical Insurance', 'Onsite Meal Allowance', 'Provident Fund'],
      perks: ['Company Vehicle Allowance', 'Employee Shopping Discounts', 'Health Checkups'],
      applicationInstructions: 'Apply with CV highlighting your warehouse operations or IoT rollout experience.',
    },
  },

  // CyberDef Innovations (Vikram Malhotra)
  {
    recruiterEmail: 'vikram.malhotra@cyberdef.org',
    job: {
      title: 'Red Team Penetration Testing Specialist',
      department: 'Offensive Security',
      category: 'Cybersecurity',
      numberOfOpenings: 1,
      employmentType: 'Full Time',
      workMode: 'Remote',
      experienceLevel: 'Senior Level (5–8 Years)',
      minExperience: 5,
      maxExperience: 8,
      minSalary: 2400000,
      maxSalary: 3600000,
      salaryCurrency: 'INR',
      salaryPeriod: 'Yearly',
      discloseSalary: true,
      country: 'India',
      state: 'Uttar Pradesh',
      city: 'Noida',
      officeLocation: 'Remote India',
      pincode: '201304',
      location: 'Noida, Uttar Pradesh, India',
      summary:
        'Conduct full-scope red teaming, Active Directory compromise, defense evasion, and adversary emulation simulations against enterprise perimeters.',
      description: `## Role Overview
Execute simulated real-world cyber attacks against high-profile enterprise clients to test their defensive detection, threat containment, and response maturity.

## Key Responsibilities
- Conduct black-box penetration testing and physical/social engineering operations.
- Execute Active Directory attack chains (Kerberoasting, BloodHound path analysis, DCSync).
- Develop custom Command & Control (C2) implants and evasion tools.
- Deliver executive briefings and blue-team remediation debriefs.

## Requirements
- 5+ years of offensive cybersecurity and red team experience.
- Top certifications such as OSEP, CRTO, CRTE, or OSCP.
- Deep expertise in Windows and Linux privilege escalation, network pivoting, and EDR bypass.`,
      requiredSkills: ['Red Teaming', 'Active Directory', 'Cobalt Strike', 'OSCP / OSEP', 'BloodHound', 'C2'],
      preferredSkills: ['EDR Bypass', 'Payload Obfuscation', 'PowerShell / C#'],
      educationalQualification: 'B.Tech in Cybersecurity or Computer Science',
      minEducationLevel: "Bachelor's Degree",
      responsibilities: [
        'Lead covert adversary emulation operations.',
        'Develop custom loaders and evasion techniques.',
        'Provide purple-team training and mitigation roadmaps.',
      ],
      benefits: ['Medical Insurance (Self + Family)', 'Annual Incentive Bonus', 'Training Allowance'],
      perks: ['Fully Remote Work', 'High-end Lab Hardware', 'Conference Sponsorship'],
      applicationInstructions: 'Provide proof of relevant offensive security certifications or public research.',
    },
  },
  {
    recruiterEmail: 'vikram.malhotra@cyberdef.org',
    job: {
      title: 'Cyber Threat Intelligence (CTI) Analyst',
      department: 'Threat Intelligence',
      category: 'Cybersecurity',
      numberOfOpenings: 1,
      employmentType: 'Full Time',
      workMode: 'Hybrid',
      experienceLevel: 'Mid Level (3–6 Years)',
      minExperience: 3,
      maxExperience: 6,
      minSalary: 1500000,
      maxSalary: 2300000,
      salaryCurrency: 'INR',
      salaryPeriod: 'Yearly',
      discloseSalary: true,
      country: 'India',
      state: 'Uttar Pradesh',
      city: 'Noida',
      officeLocation: 'Sector 132 Campus',
      pincode: '201304',
      location: 'Noida, Uttar Pradesh, India',
      summary:
        'Track advanced persistent threat (APT) campaigns, monitor dark web forums, and produce actionable intelligence reports mapped to MITRE ATT&CK.',
      description: `## Role Overview
Join our Cyber Threat Intelligence team to identify emerging adversary tactics, monitor dark web credential leaks, and publish proactive threat advisories.

## Key Responsibilities
- Collect and analyze threat data from commercial feeds, open-source intelligence (OSINT), and darknet channels.
- Track nation-state and cybercrime APT groups, documenting their tactics, techniques, and procedures (TTPs).
- Maintain Threat Intelligence Platforms (MISP, OpenCTI) and enrich automated IOC feeds.
- Write executive threat bulletins and tactical briefing documents.

## Requirements
- 3+ years in cyber threat intelligence, geopolitical intelligence, or malware intelligence.
- Familiarity with the Diamond Model, Cyber Kill Chain, and MITRE ATT&CK framework.
- Experience with OSINT tooling, YARA rules, and MISP platform.`,
      requiredSkills: ['Threat Intelligence', 'OSINT', 'MISP', 'Dark Web Monitoring', 'YARA', 'MITRE ATT&CK'],
      preferredSkills: ['OpenCTI', 'Malware Triage', 'Python'],
      educationalQualification: 'B.Tech / BCA in Information Security or International Relations',
      minEducationLevel: "Bachelor's Degree",
      responsibilities: [
        'Produce strategic and operational threat intelligence reports.',
        'Manage threat indicators in MISP platform.',
        'Monitor illicit marketplaces for corporate asset exposure.',
      ],
      benefits: ['Health Care Insurance', 'Annual Performance Incentive', 'Provident Fund'],
      perks: ['State-of-the-Art Threat Lab', 'Hybrid Scheduling', 'Certification Sponsorship'],
      applicationInstructions: 'Submit resume accompanied by sample threat intelligence analysis or writing sample.',
    },
  },
];

async function addJobs() {
  console.log('=== Adding 10 More Jobs on Current Recruiters (No Candidates/Recruiters Added) ===\n');
  const now = new Date();
  const deadline = new Date(Date.now() + 75 * 24 * 60 * 60 * 1000); // 75 days out

  let createdCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < NEW_JOBS.length; i++) {
    const { recruiterEmail, job } = NEW_JOBS[i];
    const cleanEmail = recruiterEmail.trim().toLowerCase();

    // Find recruiter
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        ownedCompanies: true,
      },
    });

    if (!user) {
      console.error(`Recruiter with email "${cleanEmail}" not found. Skipping.`);
      continue;
    }

    const company = user.ownedCompanies[0];
    if (!company) {
      console.error(`Company for recruiter "${cleanEmail}" not found. Skipping.`);
      continue;
    }

    const contentHash = computeJobHash({
      title: job.title,
      employmentType: job.employmentType,
      workMode: job.workMode,
      city: job.city,
      country: job.country,
      description: job.description,
    });

    const applicationQuestions = [
      {
        id: `q_rel_exp_${i + 1}`,
        type: 'SHORT_TEXT',
        question: 'How many years of relevant experience do you have with this specialization?',
        required: true,
        options: [],
      },
      {
        id: `q_avail_${i + 1}`,
        type: 'SHORT_TEXT',
        question: 'What is your current notice period and earliest availability to join?',
        required: true,
        options: [],
      },
      {
        id: `q_sample_${i + 1}`,
        type: 'SHORT_TEXT',
        question: 'Please share your portfolio, GitHub, or relevant project references.',
        required: false,
        options: [],
      },
    ];

    const existing = await prisma.job.findFirst({
      where: {
        companyId: company.id,
        title: job.title,
      },
    });

    if (existing) {
      await prisma.job.update({
        where: { id: existing.id },
        data: {
          ...job,
          companyId: company.id,
          createdById: user.id,
          updatedById: user.id,
          contactEmail: cleanEmail,
          applicationDeadline: deadline,
          allowAfterDeadline: false,
          requireResume: true,
          requireCoverLetter: false,
          maxApplications: 300,
          applicationQuestions,
          status: 'PUBLISHED',
          moderationStatus: 'CLEARED',
          moderationScore: 0,
          moderationFlags: [],
          contentHash,
          publishedAt: now,
          submittedAt: now,
        },
      });
      updatedCount++;
      console.log(`[Job ${i + 1}/10] Updated: "${job.title}" for ${user.fullName} (${company.name})`);
    } else {
      await prisma.job.create({
        data: {
          ...job,
          companyId: company.id,
          createdById: user.id,
          updatedById: user.id,
          contactEmail: cleanEmail,
          applicationDeadline: deadline,
          allowAfterDeadline: false,
          requireResume: true,
          requireCoverLetter: false,
          maxApplications: 300,
          applicationQuestions,
          status: 'PUBLISHED',
          moderationStatus: 'CLEARED',
          moderationScore: 0,
          moderationFlags: [],
          contentHash,
          publishedAt: now,
          submittedAt: now,
        },
      });
      createdCount++;
      console.log(`[Job ${i + 1}/10] Created: "${job.title}" for ${user.fullName} (${company.name})`);
    }
  }

  const [totalRecruiters, totalCandidates, totalJobs] = await Promise.all([
    prisma.user.count({ where: { role: 'recruiter' } }),
    prisma.user.count({ where: { role: 'candidate' } }),
    prisma.job.count({ where: { status: 'PUBLISHED' } }),
  ]);

  console.log('\n======================================================');
  console.log('            JOB ADDITION COMPLETED SUCCESSFULLY       ');
  console.log('======================================================');
  console.log(`Jobs Newly Created      : ${createdCount}`);
  console.log(`Jobs Updated            : ${updatedCount}`);
  console.log(`Total Recruiter Accounts: ${totalRecruiters} (unchanged)`);
  console.log(`Total Candidate Accounts: ${totalCandidates} (unchanged)`);
  console.log(`Total Published Jobs    : ${totalJobs}`);
  console.log('======================================================\n');
}

addJobs()
  .catch((err) => {
    console.error('Job creation failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
