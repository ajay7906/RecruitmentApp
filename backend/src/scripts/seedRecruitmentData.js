'use strict';

require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env'),
});

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = require('../config/prisma');

const DEFAULT_PASSWORD = 'TestPassword#2026';

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

const RECRUITERS = [
  {
    fullName: 'Aarav Sharma',
    email: 'aarav.sharma@nexuscloud.io',
    phone: '+91 98765 43210',
    designation: 'Head of Talent Acquisition',
    linkedinUrl: 'https://linkedin.com/in/aarav-sharma-nexuscloud',
    company: {
      name: 'NexusCloud Systems',
      website: 'https://nexuscloud.io',
      email: 'careers@nexuscloud.io',
      contactNumber: '+91 80 4123 9000',
      industry: 'Cloud Infrastructure & DevOps',
      companySize: '201-500 employees',
      companyType: 'Private Limited',
      foundedYear: 2017,
      country: 'India',
      state: 'Karnataka',
      city: 'Bengaluru',
      address: 'Tower B, Outer Ring Road, Bellandur',
      location: 'Bengaluru, Karnataka, India',
      description:
        'NexusCloud Systems provides next-generation hybrid cloud orchestration, DevOps infrastructure automation, and enterprise Kubernetes governance platforms.',
      linkedinUrl: 'https://linkedin.com/company/nexuscloud-systems',
    },
    jobs: [
      {
        title: 'Senior Cloud Architect',
        department: 'Cloud Solutions',
        category: 'Architecture',
        numberOfOpenings: 2,
        employmentType: 'Full Time',
        workMode: 'Remote',
        experienceLevel: 'Senior Level (7–10 Years)',
        minExperience: 7,
        maxExperience: 10,
        minSalary: 2400000,
        maxSalary: 3600000,
        salaryCurrency: 'INR',
        salaryPeriod: 'Yearly',
        discloseSalary: true,
        country: 'India',
        state: 'Karnataka',
        city: 'Bengaluru',
        officeLocation: 'Remote / Bengaluru HQ',
        pincode: '560103',
        location: 'Bengaluru, Karnataka, India',
        summary:
          'Lead multi-cloud enterprise architectural designs across AWS and GCP, establishing cloud-native resiliency, cost-efficiency, and security benchmarks.',
        description: `## Role Overview
NexusCloud Systems is seeking a visionary Senior Cloud Architect to drive cloud transformation initiatives for Fortune 500 enterprise clients. You will architect resilient, multi-region distributed cloud topologies on AWS and GCP.

## Key Responsibilities
- Architect zero-trust multi-cloud platforms using AWS and Google Cloud Platform.
- Define Terraform modules and enterprise Infrastructure-as-Code (IaC) governance standards.
- Collaborate with executive stakeholders and lead architectural review boards.
- Guide engineering pods on high-availability cloud strategies, disaster recovery, and FinOps practices.

## Requirements
- 7+ years of experience designing mission-critical cloud infrastructure.
- Professional AWS Certified Solutions Architect or GCP Cloud Architect credentials.
- Deep hands-on proficiency in Terraform, Kubernetes, and container security.
- Exceptional analytical problem-solving and consultative communication skills.

## What We Offer
- Top-tier compensation and equity participation.
- Complete work-from-anywhere flexibility.
- Generous annual continuous learning and conference stipend.`,
        requiredSkills: ['AWS', 'GCP', 'Terraform', 'Kubernetes', 'Cloud Architecture', 'FinOps'],
        preferredSkills: ['Vault', 'Terragrunt', 'Go', 'Service Mesh'],
        educationalQualification: 'B.Tech / M.Tech in Computer Science or equivalent',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Design scalable cloud infrastructure architectures across AWS and GCP.',
          'Formulate IaC standards and CI/CD deployment governance.',
          'Conduct architectural evaluations, cost optimizations, and disaster recovery audits.',
        ],
        benefits: ['Health Insurance (Family coverage)', 'Performance Bonus', 'Stock Options / ESOPs'],
        perks: ['Remote Work Stipend', 'Gym Membership Reimbursement', 'Annual Learning Budget'],
        applicationInstructions: 'Submit your resume and details of large-scale cloud architectures you have built.',
      },
      {
        title: 'DevOps Platform Engineer',
        department: 'Infrastructure',
        category: 'DevOps & SRE',
        numberOfOpenings: 3,
        employmentType: 'Full Time',
        workMode: 'Hybrid',
        experienceLevel: 'Mid-Senior Level (4–7 Years)',
        minExperience: 4,
        maxExperience: 7,
        minSalary: 1500000,
        maxSalary: 2400000,
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
          'Design and scale automated deployment pipelines, maintain production Kubernetes clusters, and empower developer efficiency across 40+ microservices.',
        description: `## Role Overview
Join our Core Platform Engineering team to build developer platforms that automate continuous delivery, zero-downtime deployments, and telemetry observability.

## Key Responsibilities
- Build and maintain production EKS clusters and automated service catalogs.
- Maintain GitLab CI / GitHub Actions workflows for continuous delivery.
- Implement GitOps workflows using ArgoCD and Helm charts.
- Collaborate with developer teams to reduce build and deployment cycle times.

## Requirements
- 4+ years of dedicated DevOps or Platform Engineering experience.
- Strong proficiency in Docker, Kubernetes, Helm, and Linux systems internals.
- Proven experience with GitHub Actions / GitLab CI pipelines and ArgoCD.
- Scripting fluency in Python or Bash.`,
        requiredSkills: ['Docker', 'Kubernetes', 'CI/CD', 'Linux', 'Terraform', 'ArgoCD'],
        preferredSkills: ['Prometheus', 'Helm', 'Python', 'AWS EKS'],
        educationalQualification: 'B.E. / B.Tech in Computer Science or IT',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Maintain production Kubernetes clusters and developer tooling.',
          'Implement GitOps pipelines for automated canary deployments.',
          'Automate cloud resource provisioning via Terraform.',
        ],
        benefits: ['Comprehensive Medical Cover', 'Paid Vacation Days', 'Life & Accidental Insurance'],
        perks: ['Free Catered Lunch', 'Company Transport / Cab Allowance', 'Latest MacBook Pro M3'],
        applicationInstructions: 'Include your GitHub or portfolio link with examples of IaC or CI/CD pipelines.',
      },
      {
        title: 'Site Reliability Engineer (SRE)',
        department: 'Operations',
        category: 'DevOps & SRE',
        numberOfOpenings: 2,
        employmentType: 'Full Time',
        workMode: 'Remote',
        experienceLevel: 'Mid-Senior Level (3–6 Years)',
        minExperience: 3,
        maxExperience: 6,
        minSalary: 1600000,
        maxSalary: 2500000,
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
          'Champion system resilience, uptime SLAs, and observability frameworks across distributed microservices through automated incident remediation.',
        description: `## Role Overview
As a Site Reliability Engineer at NexusCloud, you will maintain high availability (99.99%) across high-throughput distributed cloud services.

## Key Responsibilities
- Define and track SLIs, SLOs, and Error Budgets with product teams.
- Architect centralized observability stacks using Prometheus, Grafana, OpenTelemetry, and Jaeger.
- Participate in on-call incident response and run blameless post-mortem investigations.
- Write Go and Python automation to self-heal infrastructure failures.

## Requirements
- 3+ years in SRE or production operations.
- Strong systems knowledge of Linux networking, TCP/IP, and kernel tuning.
- Hands-on experience with Prometheus, Grafana, OpenTelemetry, and Alertmanager.`,
        requiredSkills: ['Go', 'Python', 'Prometheus', 'Grafana', 'OpenTelemetry', 'Linux', 'SRE'],
        preferredSkills: ['Chaos Engineering', 'eBPF', 'Kafka'],
        educationalQualification: 'B.Tech in Computer Science / Information Science',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Monitor system health, error budgets, and SLA/SLO metrics.',
          'Lead incident mitigation and root-cause analysis.',
          'Build self-healing operational automations.',
        ],
        benefits: ['Health & Dental Insurance', 'On-call Allowance', 'Provident Fund Matching'],
        perks: ['Home Office Setup Grant', 'Internet Reimbursement', 'Flexible Working Hours'],
        applicationInstructions: 'Apply with your resume detailing past incident management experience.',
      },
      {
        title: 'Cloud Security Specialist',
        department: 'Information Security',
        category: 'Security',
        numberOfOpenings: 1,
        employmentType: 'Full Time',
        workMode: 'Hybrid',
        experienceLevel: 'Mid-Senior Level (5–8 Years)',
        minExperience: 5,
        maxExperience: 8,
        minSalary: 1800000,
        maxSalary: 2800000,
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
          'Safeguard enterprise cloud assets, implement zero-trust identity architectures, and ensure SOC2 and ISO27001 compliance standards.',
        description: `## Role Overview
Join as our Cloud Security Specialist to safeguard our cloud infrastructure, container workloads, and API perimeters against emerging cyber threats.

## Key Responsibilities
- Configure CSPM and CWPP tools (Prisma Cloud, Wiz, AWS GuardDuty).
- Perform cloud posture assessments and container image security scanning.
- Design IAM policies following the principle of least privilege.
- Coordinate with external auditors for SOC2 Type II and ISO 27001 certifications.

## Requirements
- 5+ years of dedicated cloud and infrastructure security experience.
- Relevant certifications such as CCSP, AWS Certified Security Specialty, or CISSP.
- Practical experience with IAM, KMS, Secrets Manager, and network microsegmentation.`,
        requiredSkills: ['Cloud Security', 'AWS IAM', 'SOC2', 'Prisma Cloud', 'KMS', 'Compliance'],
        preferredSkills: ['CISSP', 'Wiz', 'Penetration Testing'],
        educationalQualification: 'B.Tech / B.E. in Cybersecurity or Computer Science',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Enforce Cloud Security Posture Management policies.',
          'Audit and streamline IAM roles and service account permissions.',
          'Lead remediation of cloud security vulnerabilities.',
        ],
        benefits: ['Executive Health Insurance', 'Annual Certification Sponsorship', 'Wellness Allowance'],
        perks: ['Hybrid Work Model', 'Ergonomic Workspace', 'Subsidized Meals'],
        applicationInstructions: 'Please upload your CV highlighting cloud security audits you have spearheaded.',
      },
      {
        title: 'Infrastructure Automation Engineer',
        department: 'Infrastructure',
        category: 'DevOps & SRE',
        numberOfOpenings: 2,
        employmentType: 'Full Time',
        workMode: 'Onsite',
        experienceLevel: 'Entry-Mid Level (2–4 Years)',
        minExperience: 2,
        maxExperience: 4,
        minSalary: 1200000,
        maxSalary: 1800000,
        salaryCurrency: 'INR',
        salaryPeriod: 'Yearly',
        discloseSalary: true,
        country: 'India',
        state: 'Karnataka',
        city: 'Bengaluru',
        officeLocation: 'Bellandur Tech Park',
        pincode: '560103',
        location: 'Bengaluru, Karnataka, India',
        summary:
          'Accelerate bare-metal and virtualized cloud infrastructure configuration using Ansible, Terraform, and Python automation scripts.',
        description: `## Role Overview
Looking for a proactive Automation Engineer to eliminate manual operations and automate operating system configurations, patch management, and server provisioning.

## Key Responsibilities
- Develop Ansible playbooks for server hardening and software deployments.
- Build internal automation tools using Python and CLI utilities.
- Maintain base OS images (AMIs) using HashiCorp Packer.
- Troubleshoot Linux kernel parameters, storage volumes, and network interfaces.

## Requirements
- 2–4 years of experience in systems administration and infrastructure automation.
- Proficient in Linux system administration (RHEL, Ubuntu).
- Solid coding skills in Python and Bash.
- Experience with Ansible, Packer, and Terraform.`,
        requiredSkills: ['Ansible', 'Terraform', 'Python', 'Bash', 'Linux', 'Packer'],
        preferredSkills: ['Git', 'AWS EC2', 'Monitoring'],
        educationalQualification: 'B.E. in Computer Science or Information Technology',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Create and maintain automated Ansible playbooks.',
          'Build standardized cloud machine images with Packer.',
          'Automate recurring IT and DevOps operational tasks.',
        ],
        benefits: ['Health Insurance', 'Overtime / On-call Allowance', 'Provident Fund'],
        perks: ['Office Game Room', 'Catered Breakfast & Snacks', 'Commuter Shuttles'],
        applicationInstructions: 'Apply with resume detailing your scripting and configuration management projects.',
      },
    ],
  },
  {
    fullName: 'Priya Nair',
    email: 'priya.nair@finverse.tech',
    phone: '+91 98123 45678',
    designation: 'Senior Technical Recruiter',
    linkedinUrl: 'https://linkedin.com/in/priya-nair-finverse',
    company: {
      name: 'FinVerse Technologies',
      website: 'https://finverse.tech',
      email: 'hiring@finverse.tech',
      contactNumber: '+91 22 6123 4500',
      industry: 'Fintech & Digital Banking',
      companySize: '501-1000 employees',
      companyType: 'Private Limited',
      foundedYear: 2019,
      country: 'India',
      state: 'Maharashtra',
      city: 'Mumbai',
      address: 'Level 14, One BKC, Bandra Kurla Complex',
      location: 'Mumbai, Maharashtra, India',
      description:
        'FinVerse Technologies builds high-throughput payment rails, micro-lending algorithms, and digital banking platforms serving millions of transactions daily.',
      linkedinUrl: 'https://linkedin.com/company/finverse-technologies',
    },
    jobs: [
      {
        title: 'Principal Backend Engineer - Payments',
        department: 'Payment Gateway',
        category: 'Software Development',
        numberOfOpenings: 2,
        employmentType: 'Full Time',
        workMode: 'Hybrid',
        experienceLevel: 'Senior-Lead Level (8–12 Years)',
        minExperience: 8,
        maxExperience: 12,
        minSalary: 2800000,
        maxSalary: 4200000,
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
          'Design sub-second payment settlement pipelines, distributed ledger reconciliations, and fault-tolerant financial microservices.',
        description: `## Role Overview
Lead the engineering architecture of our next-generation unified payment rails handling ₹500+ Cr in monthly transaction volume.

## Key Responsibilities
- Architect high-throughput, low-latency transaction processing microservices.
- Ensure strict transactional ACID compliance, idempotent API designs, and double-entry ledger integrity.
- Mentor senior software engineers and conduct high-level design reviews.
- Collaborate with partner banks and NPCI for protocol integrations (UPI, IMPS, RTGS).

## Requirements
- 8+ years building high-concurrency backend services.
- Deep expertise in Node.js, Go, or Java with PostgreSQL and Redis.
- Proven experience with distributed event architectures (Apache Kafka).
- Strong domain knowledge of payment switches, banking protocols, or card networks.`,
        requiredSkills: ['Node.js', 'PostgreSQL', 'Apache Kafka', 'Redis', 'Distributed Systems', 'Microservices'],
        preferredSkills: ['Go', 'Docker', 'UPI Integration', 'Financial Ledger'],
        educationalQualification: 'B.Tech / M.Tech in Computer Science',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Architect resilient payment processing services.',
          'Ensure 99.999% uptime and zero data discrepancy across payment ledgers.',
          'Drive architectural standards for concurrency and fault tolerance.',
        ],
        benefits: ['Top-tier Health Insurance', 'Annual Executive Bonus', 'ESOPs Grant'],
        perks: ['BKC Office Amenities', 'Flexible Hybrid Scheduling', 'Wellness Stipend'],
        applicationInstructions: 'Submit your resume and details of transaction volumes handled in your previous roles.',
      },
      {
        title: 'Fintech Frontend Lead',
        department: 'Frontend Engineering',
        category: 'Software Development',
        numberOfOpenings: 1,
        employmentType: 'Full Time',
        workMode: 'Hybrid',
        experienceLevel: 'Senior Level (6–9 Years)',
        minExperience: 6,
        maxExperience: 9,
        minSalary: 2200000,
        maxSalary: 3200000,
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
          'Drive the UI architecture of our merchant dashboard and consumer checkout flows using React, TypeScript, Next.js, and modern state machines.',
        description: `## Role Overview
We are looking for a visionary Frontend Lead to craft delightful, accessible, and ultra-fast user experiences for merchant checkout and analytics dashboards.

## Key Responsibilities
- Architect modern React & Next.js web applications with lightning-fast load times.
- Build design system components adhering to WCAG 2.1 accessibility guidelines.
- Optimize web vitals (LCP, FID, CLS) and establish end-to-end testing with Playwright.
- Guide and mentor a team of 6 frontend developers.

## Requirements
- 6+ years of modern JavaScript/TypeScript frontend engineering experience.
- Deep mastery of React, Next.js, state management, and modern CSS frameworks (Tailwind).
- Passion for animations, micro-interactions, and pixel-perfect design translation.`,
        requiredSkills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Redux / Zustand', 'Playwright'],
        preferredSkills: ['Design Systems', 'Web Vitals Optimization', 'GraphQL'],
        educationalQualification: 'B.Tech / B.E. in Computer Science or equivalent',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Lead frontend architecture across merchant portal and checkout flows.',
          'Maintain shared UI component libraries with Storybook.',
          'Ensure exceptional mobile web responsiveness and top Core Web Vitals.',
        ],
        benefits: ['Comprehensive Medical Insurance', 'Parental Health Coverage', 'Yearly Bonus'],
        perks: ['Latest Apple Hardware', 'Skill Development Budget', 'Gym Membership'],
        applicationInstructions: 'Share your portfolio link, GitHub profile, and recent live web applications.',
      },
      {
        title: 'Financial Risk & Compliance Analyst',
        department: 'Risk & Compliance',
        category: 'Finance & Compliance',
        numberOfOpenings: 2,
        employmentType: 'Full Time',
        workMode: 'Onsite',
        experienceLevel: 'Mid Level (3–5 Years)',
        minExperience: 3,
        maxExperience: 5,
        minSalary: 1200000,
        maxSalary: 1800000,
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
          'Monitor AML / KYC compliance, evaluate credit risk matrices, and prepare regulatory audit reports for RBI and financial regulators.',
        description: `## Role Overview
Ensure strict adherence to regulatory standards (RBI guidelines, PMLA, KYC/AML norms) and analyze customer transaction patterns to mitigate credit and operational risks.

## Key Responsibilities
- Monitor automated transaction monitoring alerts for suspicious activities (STR/CTR).
- Conduct enhanced due diligence (EDD) on high-risk merchants and partners.
- Build risk intelligence dashboards using SQL, Tableau, and Excel models.
- Support internal and statutory regulatory audits.

## Requirements
- 3+ years in banking compliance, risk management, or fintech audit.
- Thorough understanding of RBI fintech guidelines, AML regulations, and KYC procedures.
- Strong SQL querying skills and data analytics capabilities.`,
        requiredSkills: ['AML Compliance', 'KYC', 'RBI Guidelines', 'SQL', 'Risk Management', 'Tableau'],
        preferredSkills: ['CAMS Certification', 'Python', 'Fraud Investigation'],
        educationalQualification: 'MBA in Finance / Chartered Accountant / Master in Economics',
        minEducationLevel: "Master's Degree",
        responsibilities: [
          'Execute daily transaction monitoring and AML screening.',
          'Prepare regulatory filings and compliance audits.',
          'Evaluate merchant creditworthiness and transaction limits.',
        ],
        benefits: ['Full Family Medical Insurance', 'Annual Incentive Program', 'Retirement Gratuity'],
        perks: ['Metro / Transit Pass Allowance', 'Subsidized Cafeteria', 'Continuing Education Support'],
        applicationInstructions: 'Apply with CV highlighting your compliance monitoring background.',
      },
      {
        title: 'Core Banking Microservices Developer',
        department: 'Engineering',
        category: 'Software Development',
        numberOfOpenings: 3,
        employmentType: 'Full Time',
        workMode: 'Hybrid',
        experienceLevel: 'Mid-Senior Level (4–7 Years)',
        minExperience: 4,
        maxExperience: 7,
        minSalary: 1600000,
        maxSalary: 2400000,
        salaryCurrency: 'INR',
        salaryPeriod: 'Yearly',
        discloseSalary: true,
        country: 'India',
        state: 'Maharashtra',
        city: 'Pune',
        officeLocation: 'Kalyani Nagar Office',
        pincode: '411006',
        location: 'Pune, Maharashtra, India',
        summary:
          'Build scalable Spring Boot and Kafka microservices powering digital loan origination, ledger accounting, and partner bank APIs.',
        description: `## Role Overview
Develop resilient backend microservices that integrate with core banking solutions (CBS) and financial clearinghouses.

## Key Responsibilities
- Develop event-driven microservices using Java 17+, Spring Boot, and Kafka.
- Implement database models and queries in PostgreSQL with Flyway migrations.
- Write unit, integration, and contract tests with JUnit 5 and Testcontainers.
- Optimize SQL queries and caching mechanisms using Redis.

## Requirements
- 4+ years in backend software engineering with Java and Spring Boot.
- Solid understanding of microservices design patterns (Circuit Breaker, Saga, CQRS).
- Hands-on expertise with Kafka, relational databases, and Docker.`,
        requiredSkills: ['Java', 'Spring Boot', 'Kafka', 'PostgreSQL', 'Microservices', 'Redis'],
        preferredSkills: ['Docker', 'Kubernetes', 'Testcontainers', 'gRPC'],
        educationalQualification: 'B.Tech / B.E. in Computer Science',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Design and maintain Spring Boot microservices.',
          'Implement event streaming pipelines for asynchronous accounting.',
          'Collaborate with QA engineers to automate integration test suites.',
        ],
        benefits: ['Health and Accident Insurance', 'Performance Bonus', 'Stock Options'],
        perks: ['Hybrid Work Mode', 'Meal Vouchers', 'Learning Allowance'],
        applicationInstructions: 'Please provide links to your code samples or GitHub repositories.',
      },
      {
        title: 'Fraud Detection Data Scientist',
        department: 'AI & Analytics',
        category: 'Data Science & Analytics',
        numberOfOpenings: 1,
        employmentType: 'Full Time',
        workMode: 'Remote',
        experienceLevel: 'Senior Level (5–8 Years)',
        minExperience: 5,
        maxExperience: 8,
        minSalary: 2000000,
        maxSalary: 3000000,
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
          'Build real-time machine learning inference engines to detect payment anomalies, identity theft, and card-not-present fraud.',
        description: `## Role Overview
Help us protect millions of transactions each day by designing unsupervised and supervised anomaly detection models running in real time.

## Key Responsibilities
- Build machine learning classifiers for transaction fraud detection and risk scoring.
- Deploy low-latency ML models into production using FastAPI and Docker.
- Build feature stores (Feast) and data pipelines on Snowflake and Spark.
- Perform A/B testing on model thresholds to balance false positives vs. fraud prevention.

## Requirements
- 5+ years building and deploying production ML models.
- Strong proficiency in Python, Scikit-learn, XGBoost, and PyTorch.
- Experience with real-time inference latency constraints (<50ms).`,
        requiredSkills: ['Python', 'Machine Learning', 'XGBoost', 'PyTorch', 'SQL', 'FastAPI'],
        preferredSkills: ['Feature Stores', 'Kafka Streaming', 'Anomaly Detection'],
        educationalQualification: 'Master / B.Tech in Data Science, Statistics, or Computer Science',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Develop real-time fraud scoring predictive models.',
          'Analyze feature distributions and detect model drift in production.',
          'Collaborate with engineering teams to minimize inference latencies.',
        ],
        benefits: ['Comprehensive Health Coverage', 'Annual Bonus', 'Continuous Education Fund'],
        perks: ['Fully Remote Work', 'High-end Laptop', 'Wellness Reimbursement'],
        applicationInstructions: 'Share your resume along with summaries of past ML models deployed in production.',
      },
    ],
  },
  {
    fullName: 'Rohan Verma',
    email: 'rohan.verma@healthiq.ai',
    phone: '+91 97654 32109',
    designation: 'Director of People & Culture',
    linkedinUrl: 'https://linkedin.com/in/rohan-verma-healthiq',
    company: {
      name: 'HealthIQ AI',
      website: 'https://healthiq.ai',
      email: 'talent@healthiq.ai',
      contactNumber: '+91 40 4890 1200',
      industry: 'Healthtech & AI Diagnostics',
      companySize: '51-200 employees',
      companyType: 'Private Limited',
      foundedYear: 2021,
      country: 'India',
      state: 'Telangana',
      city: 'Hyderabad',
      address: 'Plot 22, HITEC City, Madhapur',
      location: 'Hyderabad, Telangana, India',
      description:
        'HealthIQ AI pioneers clinical decision-support systems, medical imaging AI diagnostics, and predictive health monitoring solutions for hospitals worldwide.',
      linkedinUrl: 'https://linkedin.com/company/healthiq-ai',
    },
    jobs: [
      {
        title: 'Senior Machine Learning Engineer - Diagnostics',
        department: 'AI Diagnostics',
        category: 'Artificial Intelligence',
        numberOfOpenings: 2,
        employmentType: 'Full Time',
        workMode: 'Hybrid',
        experienceLevel: 'Senior Level (5–8 Years)',
        minExperience: 5,
        maxExperience: 8,
        minSalary: 2500000,
        maxSalary: 3800000,
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
          'Train, fine-tune, and deploy deep learning computer vision models on CT, MRI, and X-ray medical imaging datasets.',
        description: `## Role Overview
HealthIQ AI is seeking a Senior ML Engineer to develop state-of-the-art diagnostic models assisting radiologists and oncologists with early lesion detection.

## Key Responsibilities
- Develop 2D/3D Convolutional Neural Networks and Vision Transformers for radiology scan segmentation.
- Optimize neural network inference via TensorRT and ONNX runtime on edge GPUs.
- Oversee dataset curation, annotation pipelines, and DICOM preprocessing workflows.
- Ensure compliance with HIPAA and FDA medical device software guidelines (SaMD).

## Requirements
- 5+ years of experience in computer vision and deep learning.
- Strong mastery of PyTorch, MONAI / OpenCV, and Python.
- Proven experience with distributed multi-GPU model training.`,
        requiredSkills: ['PyTorch', 'Computer Vision', 'Deep Learning', 'Python', 'FastAPI', 'TensorRT'],
        preferredSkills: ['MONAI', 'DICOM Processing', 'Vision Transformers', 'CUDA'],
        educationalQualification: 'M.Tech / Ph.D. / B.Tech in Computer Science or Electrical Engineering',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Train deep learning models for medical image segmentation.',
          'Optimize model inference for sub-second deployment on hospital edge servers.',
          'Maintain rigorous experiment tracking with Weights & Biases.',
        ],
        benefits: ['Comprehensive Medical Coverage', 'Generous Equity (ESOPs)', 'Annual Incentive Bonus'],
        perks: ['GPU Cloud Credits for Research', 'Conference Sponsorship', 'Flexible Working Arrangement'],
        applicationInstructions: 'Provide your Google Scholar profile, GitHub repository, and CV.',
      },
      {
        title: 'Healthcare Full Stack Developer',
        department: 'Engineering',
        category: 'Software Development',
        numberOfOpenings: 3,
        employmentType: 'Full Time',
        workMode: 'Remote',
        experienceLevel: 'Mid Level (3–6 Years)',
        minExperience: 3,
        maxExperience: 6,
        minSalary: 1500000,
        maxSalary: 2300000,
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
          'Build secure clinical web portals and electronic health record (EHR) dashboards connecting physicians with AI triage recommendations.',
        description: `## Role Overview
Develop intuitive and responsive web applications for doctors, nurses, and hospital administrators interacting with our AI diagnostic platform.

## Key Responsibilities
- Build responsive frontend interfaces in React.js and TypeScript.
- Implement RESTful and GraphQL APIs using Python (FastAPI / Django).
- Integrate with FHIR / HL7 clinical health data exchange protocols.
- Implement role-based access control and strict data privacy protections.

## Requirements
- 3+ years of full stack software engineering experience.
- Strong proficiency in React, TypeScript, Python, and PostgreSQL.
- Understanding of healthcare data privacy (HIPAA) is a plus.`,
        requiredSkills: ['React', 'TypeScript', 'Python', 'FastAPI', 'PostgreSQL', 'Docker'],
        preferredSkills: ['HL7 / FHIR', 'GraphQL', 'Tailwind CSS'],
        educationalQualification: 'B.Tech / B.E. in Computer Science',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Develop web portal features for clinical review.',
          'Build performant backend endpoints for patient data queries.',
          'Ensure strict HIPAA data isolation across patient records.',
        ],
        benefits: ['Health Insurance with OPD Coverage', 'Paid Parental Leave', 'Performance Bonus'],
        perks: ['Home Office Allowance', 'Flexible Working Hours', 'Learning Stipend'],
        applicationInstructions: 'Apply with your portfolio and previous web development project links.',
      },
      {
        title: 'Clinical Data Engineer',
        department: 'Data Platform',
        category: 'Data Science & Analytics',
        numberOfOpenings: 2,
        employmentType: 'Full Time',
        workMode: 'Hybrid',
        experienceLevel: 'Mid-Senior Level (4–7 Years)',
        minExperience: 4,
        maxExperience: 7,
        minSalary: 1700000,
        maxSalary: 2600000,
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
          'Design robust clinical ETL/ELT pipelines ingesting unstructured electronic health records, lab reports, and vitals into Snowflake data warehouses.',
        description: `## Role Overview
Construct resilient data ingestion pipelines converting heterogeneous hospital datasets into standardized clinical models (OMOP CDM).

## Key Responsibilities
- Architect scalable ETL workflows using Apache Spark, Airflow, and dbt.
- Build automated de-identification pipelines removing Protected Health Information (PHI).
- Manage data lakehouse architecture on AWS and Snowflake.
- Ensure high data quality through automated dbt testing suites.

## Requirements
- 4+ years in data engineering with Python and SQL.
- Strong hands-on experience with Apache Spark, Airflow, and Snowflake.
- Familiarity with clinical data structures or medical terminologies (SNOMED, ICD-10).`,
        requiredSkills: ['Python', 'SQL', 'Apache Spark', 'Airflow', 'Snowflake', 'dbt'],
        preferredSkills: ['OMOP CDM', 'AWS S3', 'Data Governance'],
        educationalQualification: 'B.Tech in Computer Science / Information Technology',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Design and maintain automated clinical ETL pipelines.',
          'Implement HIPAA-compliant data masking and anonymization.',
          'Collaborate with AI researchers to provide clean training datasets.',
        ],
        benefits: ['Family Health Care', 'Annual Performance Incentive', 'PF & Gratuity'],
        perks: ['HITEC City Office Gym', 'Subsidized Food', 'Conference Travel Budget'],
        applicationInstructions: 'Submit resume detailing past data pipelines and data warehouse designs.',
      },
      {
        title: 'Healthtech Product Designer',
        department: 'Product & Design',
        category: 'UI/UX Design',
        numberOfOpenings: 1,
        employmentType: 'Full Time',
        workMode: 'Remote',
        experienceLevel: 'Mid Level (3–6 Years)',
        minExperience: 3,
        maxExperience: 6,
        minSalary: 1300000,
        maxSalary: 2000000,
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
          'Create high-fidelity wireframes, medical UI design systems, and workflow user experiences that reduce cognitive load for clinical staff.',
        description: `## Role Overview
Design software experiences for surgeons, radiologists, and clinicians where clarity and speed save lives.

## Key Responsibilities
- Conduct user research and usability testing with practicing doctors and hospital staff.
- Design accessible, clean, and intuitive interfaces in Figma.
- Maintain and expand our design system "Pulse UI".
- Work closely with frontend engineers to ensure design fidelity.

## Requirements
- 3+ years in product design (UI/UX) with a compelling portfolio.
- Proficiency with Figma, component libraries, and interactive prototyping.
- Experience designing complex B2B SaaS or healthcare products.`,
        requiredSkills: ['Figma', 'UI/UX Design', 'User Research', 'Wireframing', 'Design Systems', 'Prototyping'],
        preferredSkills: ['Healthcare UX', 'Design Tokens', 'Accessibility'],
        educationalQualification: 'Bachelor in Design (B.Des) / Human-Computer Interaction or equivalent',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Conduct user interviews with healthcare professionals.',
          'Produce high-fidelity mockups and interactive Figma prototypes.',
          'Maintain consistency across all product interfaces.',
        ],
        benefits: ['Medical Insurance', 'Flexible Leave Policy', 'Annual Bonus'],
        perks: ['Figma Pro License & Hardware of Choice', 'Remote Setup Allowance', 'Wellness Days'],
        applicationInstructions: 'Portfolio URL is mandatory. Applications without design portfolios will not be reviewed.',
      },
      {
        title: 'Biomedical NLP Specialist',
        department: 'AI Diagnostics',
        category: 'Artificial Intelligence',
        numberOfOpenings: 1,
        employmentType: 'Full Time',
        workMode: 'Hybrid',
        experienceLevel: 'Senior Level (5–8 Years)',
        minExperience: 5,
        maxExperience: 8,
        minSalary: 2200000,
        maxSalary: 3400000,
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
          'Extract structured clinical insights, medications, and ICD codes from physician clinical notes using state-of-the-art transformer LLMs.',
        description: `## Role Overview
Fine-tune and deploy Large Language Models (LLMs) on medical documentation to automate clinical summarization and coding.

## Key Responsibilities
- Fine-tune transformer architectures (BioBERT, ClinicalBERT, Llama 3) for medical Named Entity Recognition (NER).
- Implement Retrieval-Augmented Generation (RAG) over medical literature and clinical guidelines.
- Evaluate model halluncination rates and factual grounding against verified clinical benchmarks.

## Requirements
- 5+ years of NLP experience with PyTorch and Hugging Face Transformers.
- Practical experience with LangChain / LlamaIndex and vector databases (Qdrant, Milvus).
- Strong track record in NLP fine-tuning and evaluation.`,
        requiredSkills: ['Python', 'NLP', 'Transformers', 'Hugging Face', 'PyTorch', 'RAG'],
        preferredSkills: ['BioBERT', 'LangChain', 'Vector Databases'],
        educationalQualification: 'Master / Ph.D. in Computer Science or Computational Linguistics',
        minEducationLevel: "Master's Degree",
        responsibilities: [
          'Develop biomedical NLP extraction models.',
          'Build RAG pipelines over clinical research guidelines.',
          'Quantize models for high-throughput batch inference.',
        ],
        benefits: ['Top-tier Medical Cover', 'Research Publication Rewards', 'Stock Options'],
        perks: ['H100 GPU Cluster Access', 'Flexible Hybrid Work', 'Annual Learning Grant'],
        applicationInstructions: 'Please include links to any NLP publications, GitHub repos, or Hugging Face spaces.',
      },
    ],
  },
  {
    fullName: 'Neha Gupta',
    email: 'neha.gupta@hyperkart.com',
    phone: '+91 99234 56789',
    designation: 'Staff Recruitment Partner',
    linkedinUrl: 'https://linkedin.com/in/neha-gupta-hyperkart',
    company: {
      name: 'HyperKart E-Commerce',
      website: 'https://hyperkart.com',
      email: 'careers@hyperkart.com',
      contactNumber: '+91 124 456 7800',
      industry: 'E-Commerce & Quick Commerce',
      companySize: '1000+ employees',
      companyType: 'Public Limited',
      foundedYear: 2018,
      country: 'India',
      state: 'Haryana',
      city: 'Gurugram',
      address: 'Cyber City, Tower 10, DLF Phase 2',
      location: 'Gurugram, Haryana, India',
      description:
        'HyperKart is a leading hyper-growth quick-commerce platform delivering groceries, electronics, and daily essentials to millions of homes in under 15 minutes.',
      linkedinUrl: 'https://linkedin.com/company/hyperkart-ecommerce',
    },
    jobs: [
      {
        title: 'Lead Mobile Engineer (React Native)',
        department: 'Consumer Apps',
        category: 'Mobile App Development',
        numberOfOpenings: 2,
        employmentType: 'Full Time',
        workMode: 'Hybrid',
        experienceLevel: 'Lead Level (6–9 Years)',
        minExperience: 6,
        maxExperience: 9,
        minSalary: 2400000,
        maxSalary: 3500000,
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
          'Architect and elevate the HyperKart consumer mobile app on iOS and Android for over 5 million active shoppers with 60 FPS performance.',
        description: `## Role Overview
Lead mobile application architecture for our flagship consumer app, ensuring rapid startup times, real-time rider tracking, and fluid checkout experiences.

## Key Responsibilities
- Architect high-performance cross-platform features using React Native and native bridges (Swift/Kotlin).
- Optimize app launch time, memory footprint, and network payload caching.
- Implement real-time WebSocket channels for order and rider location tracking.
- Manage CI/CD distribution pipelines using Fastlane, App Store Connect, and Google Play Console.

## Requirements
- 6+ years in mobile software engineering with 4+ years in React Native.
- Deep familiarity with native iOS (Swift) or Android (Kotlin) development.
- Experience scaling consumer mobile apps with millions of active users.`,
        requiredSkills: ['React Native', 'JavaScript', 'TypeScript', 'Redux', 'iOS', 'Android', 'Fastlane'],
        preferredSkills: ['Kotlin', 'Swift', 'WebSocket', 'Mapbox SDK'],
        educationalQualification: 'B.Tech / B.E. in Computer Science',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Lead mobile engineering best practices and code reviews.',
          'Optimize app rendering performance and memory management.',
          'Coordinate app store releases and crash analytics.',
        ],
        benefits: ['Complete Family Health Insurance', 'Annual Incentive Program', 'Generous ESOPs'],
        perks: ['Cyber City Office Perks', 'HyperKart Monthly Grocery Credit', 'Latest Flagship Devices'],
        applicationInstructions: 'Provide Google Play / Apple App Store links to apps you have published or led.',
      },
      {
        title: 'High-Scale Distributed Systems Architect',
        department: 'Core Infrastructure',
        category: 'Software Development',
        numberOfOpenings: 1,
        employmentType: 'Full Time',
        workMode: 'Onsite',
        experienceLevel: 'Principal Level (9–13 Years)',
        minExperience: 9,
        maxExperience: 13,
        minSalary: 3200000,
        maxSalary: 4800000,
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
          'Design extreme low-latency distributed order management, real-time inventory allocation, and dispatch engines in Go and gRPC.',
        description: `## Role Overview
Direct the core distributed systems powering 500,000+ instant grocery orders during daily peak flash-sales without dropping a single order.

## Key Responsibilities
- Design distributed systems capable of handling 50,000+ QPS with sub-15ms p99 latency.
- Solve distributed synchronization, distributed locking, and inventory racing conditions.
- Design event-driven pipelines using Apache Kafka and Redis cluster.
- Mentor staff and principal software engineers across our order and fulfillment pods.

## Requirements
- 9+ years architecting distributed systems.
- Masterful command of Go, C++, or Java and gRPC communication protocols.
- Hands-on experience with RocksDB, Redis, Kafka, and sharded PostgreSQL.`,
        requiredSkills: ['Go', 'gRPC', 'Distributed Systems', 'Apache Kafka', 'Redis', 'PostgreSQL'],
        preferredSkills: ['RocksDB', 'Raft Consensus', 'Kubernetes'],
        educationalQualification: 'B.Tech / M.Tech in Computer Science from premier institute',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Architect distributed order fulfillment and inventory state machines.',
          'Eliminate latency bottlenecks across network and storage layers.',
          'Lead technical strategy for company-wide architecture.',
        ],
        benefits: ['Comprehensive Medical Cover', 'Executive ESOP Package', 'Performance Bonus'],
        perks: ['Reserved Parking in Cyber City', 'Premium Equipment', 'Executive Wellness Program'],
        applicationInstructions: 'Apply with CV describing your distributed systems and scalability accomplishments.',
      },
      {
        title: 'Supply Chain Optimisation Lead',
        department: 'Logistics & Supply Chain',
        category: 'Operations & Supply Chain',
        numberOfOpenings: 1,
        employmentType: 'Full Time',
        workMode: 'Hybrid',
        experienceLevel: 'Mid-Senior Level (5–8 Years)',
        minExperience: 5,
        maxExperience: 8,
        minSalary: 2000000,
        maxSalary: 3000000,
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
          'Optimize dark-store stocking, batch routing, and rider dispatch models using linear programming, operations research, and Python.',
        description: `## Role Overview
Apply mathematical modeling and algorithm design to cut last-mile delivery times and minimize food spoilage across 400+ fulfillment centers.

## Key Responsibilities
- Formulate vehicle routing problems (VRP) and dynamic order batching algorithms.
- Build demand forecasting and automated warehouse replenishment models.
- Analyze warehouse pick-and-pack metrics to optimize physical shelf layouts.
- Collaborate with operations teams to implement algorithmic improvements.

## Requirements
- 5+ years in supply chain analytics, operations research, or algorithmic logistics.
- Proficient in Python, Gurobi / OR-Tools, and SQL.
- Deep mathematical background in optimization, queuing theory, and statistics.`,
        requiredSkills: ['Python', 'Operations Research', 'Linear Programming', 'SQL', 'Supply Chain', 'OR-Tools'],
        preferredSkills: ['Gurobi', 'Simulation Modeling', 'Tableau'],
        educationalQualification: 'Master / B.Tech in Industrial Engineering, Mathematics, or Computer Science',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Formulate and solve real-time rider batching algorithms.',
          'Drive dark-store inventory optimization algorithms.',
          'Benchmark operational KPIs and delivery speed metrics.',
        ],
        benefits: ['Health Insurance', 'Annual Incentive Program', 'ESOPs'],
        perks: ['Hybrid Work Environment', 'HyperKart Shopping Discounts', 'Learning Budget'],
        applicationInstructions: 'Upload resume highlighting real-world optimization problems you have formulated.',
      },
      {
        title: 'Senior QA Automation Engineer',
        department: 'Quality Engineering',
        category: 'Quality Assurance',
        numberOfOpenings: 3,
        employmentType: 'Full Time',
        workMode: 'Remote',
        experienceLevel: 'Mid Level (4–7 Years)',
        minExperience: 4,
        maxExperience: 7,
        minSalary: 1200000,
        maxSalary: 1800000,
        salaryCurrency: 'INR',
        salaryPeriod: 'Yearly',
        discloseSalary: true,
        country: 'India',
        state: 'Haryana',
        city: 'Gurugram',
        officeLocation: 'Remote India',
        pincode: '122002',
        location: 'Gurugram, Haryana, India',
        summary:
          'Build end-to-end automated testing frameworks across web checkout, mobile apps, and backend APIs using Cypress, Appium, and Jest.',
        description: `## Role Overview
Help us maintain bulletproof stability across critical consumer purchasing flows, payment gateways, and inventory services through comprehensive test automation.

## Key Responsibilities
- Develop automated regression test suites using Cypress and Playwright.
- Implement mobile automation test scripts using Appium for Android and iOS.
- Integrate automated tests into CI/CD build pipelines (GitHub Actions).
- Perform API testing and performance benchmarking using Postman and k6.

## Requirements
- 4+ years in software quality assurance automation.
- Strong proficiency in JavaScript/TypeScript or Python.
- Proven experience with Cypress/Playwright, Appium, and API automation.`,
        requiredSkills: ['Cypress', 'Playwright', 'Appium', 'JavaScript', 'Jest', 'API Testing', 'Git'],
        preferredSkills: ['k6', 'Docker', 'Postman'],
        educationalQualification: 'B.Tech / B.E. / BCA in Computer Science',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Build and maintain web and mobile automated test frameworks.',
          'Execute automated performance and load tests prior to major sales.',
          'Track defects, report metrics, and maintain test documentation.',
        ],
        benefits: ['Health Insurance', 'Performance Bonus', 'Paid Time Off'],
        perks: ['Fully Remote Flexibility', 'Home Office Gear', 'Internet Allowance'],
        applicationInstructions: 'Submit resume with examples of automation frameworks you have architected.',
      },
      {
        title: 'Search & Recommendations Engineer',
        department: 'Search & Personalization',
        category: 'Data Science & Analytics',
        numberOfOpenings: 2,
        employmentType: 'Full Time',
        workMode: 'Hybrid',
        experienceLevel: 'Mid-Senior Level (4–8 Years)',
        minExperience: 4,
        maxExperience: 8,
        minSalary: 2200000,
        maxSalary: 3200000,
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
          'Build semantic catalog search, vector similarity retrieval, and collaborative personalization algorithms in Elasticsearch and Python.',
        description: `## Role Overview
Design real-time search ranking and personalized product recommendation algorithms that increase conversion rates for 100,000+ SKU catalogs.

## Key Responsibilities
- Tune Elasticsearch cluster configurations for phonetic search, typo tolerance, and multilingual queries.
- Build vector search retrieval using embeddings and Approximate Nearest Neighbor (ANN) indices (Faiss).
- Train ranking models (Learning-to-Rank) incorporating past user affinities and popularity signals.
- Execute rigorous online A/B tests to measure search recall, click-through-rates, and GMV uplift.

## Requirements
- 4+ years building search or recommendation engines.
- Strong expertise in Elasticsearch/OpenSearch, Python, and SQL.
- Solid background in NLP, ranking algorithms, and embedding models.`,
        requiredSkills: ['Elasticsearch', 'Python', 'Vector Search', 'Faiss', 'Learning to Rank', 'SQL'],
        preferredSkills: ['OpenSearch', 'PyTorch', 'Kafka'],
        educationalQualification: 'B.Tech / M.Tech in Computer Science',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Improve search relevance and query understanding.',
          'Deploy real-time personalized carousel recommendations.',
          'Design A/B test experiments on search result ordering.',
        ],
        benefits: ['Medical Insurance', 'Annual Incentive Scheme', 'ESOPs'],
        perks: ['Hybrid Schedule', 'Catered Lunch & Snacks', 'Tech Equipment Grant'],
        applicationInstructions: 'Share your CV and details of search or recommendation systems you have worked on.',
      },
    ],
  },
  {
    fullName: 'Vikram Malhotra',
    email: 'vikram.malhotra@cyberdef.org',
    phone: '+91 98345 67890',
    designation: 'Talent Sourcing Lead',
    linkedinUrl: 'https://linkedin.com/in/vikram-malhotra-cyberdef',
    company: {
      name: 'CyberDef Innovations',
      website: 'https://cyberdef.org',
      email: 'security-careers@cyberdef.org',
      contactNumber: '+91 120 491 8800',
      industry: 'Cybersecurity & Threat Intelligence',
      companySize: '51-200 employees',
      companyType: 'Private Limited',
      foundedYear: 2020,
      country: 'India',
      state: 'Uttar Pradesh',
      city: 'Noida',
      address: 'Express Trade Towers, Sector 132',
      location: 'Noida, Uttar Pradesh, India',
      description:
        'CyberDef Innovations delivers enterprise defense automation, cloud penetration testing, managed SIEM/SOC response, and offensive cyber intelligence.',
      linkedinUrl: 'https://linkedin.com/company/cyberdef-innovations',
    },
    jobs: [
      {
        title: 'Senior Application Security Engineer',
        department: 'Offensive Security',
        category: 'Cybersecurity',
        numberOfOpenings: 2,
        employmentType: 'Full Time',
        workMode: 'Remote',
        experienceLevel: 'Mid-Senior Level (5–8 Years)',
        minExperience: 5,
        maxExperience: 8,
        minSalary: 2200000,
        maxSalary: 3400000,
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
          'Perform deep application penetration testing, threat modeling, and secure code review across enterprise SaaS, web, and mobile software.',
        description: `## Role Overview
Protect client codebases by hunting for business logic vulnerabilities, authorization bypasses, and OWASP Top 10 flaws before malicious actors do.

## Key Responsibilities
- Conduct manual penetration testing on web applications, REST APIs, and mobile apps.
- Perform secure source code reviews (SAST) in Java, Python, JavaScript, and Go.
- Embed automated security tooling into developer CI/CD pipelines (Semgrep, SonarQube, Snyk).
- Deliver remediation guidance and developer security training sessions.

## Requirements
- 5+ years of dedicated Application Security or Penetration Testing experience.
- Recognized certifications such as OSCP, OSWE, or Burp Suite Certified Practitioner.
- Deep technical mastery of web vulnerabilities (SSRF, IDOR, SQLi, XSS, CSRF, JWT attacks).`,
        requiredSkills: ['AppSec', 'Penetration Testing', 'OWASP Top 10', 'Burp Suite', 'SAST / DAST', 'Code Review'],
        preferredSkills: ['OSCP / OSWE', 'Semgrep', 'Reverse Engineering'],
        educationalQualification: 'B.Tech / B.E. in Cybersecurity or Computer Science',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Conduct comprehensive penetration tests and deliver clear remediation reports.',
          'Lead threat modeling exercises with software architects.',
          'Integrate automated security scanners in continuous delivery pipelines.',
        ],
        benefits: ['Full Family Medical Cover', 'Certification & Training Sponsorship', 'Annual Bonus'],
        perks: ['Fully Remote Work', 'High-end Lab Equipment', 'Paid Bug Bounty Research Days'],
        applicationInstructions: 'Provide your CVEs, bug bounty profiles (HackerOne/Bugcrowd), or CV.',
      },
      {
        title: 'SOC Threat Hunting Specialist',
        department: 'Defensive Operations',
        category: 'Cybersecurity',
        numberOfOpenings: 2,
        employmentType: 'Full Time',
        workMode: 'Onsite',
        experienceLevel: 'Mid Level (3–6 Years)',
        minExperience: 3,
        maxExperience: 6,
        minSalary: 1400000,
        maxSalary: 2100000,
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
          'Proactively identify advanced persistent threats (APT), analyze suspicious network anomalies, and engineer automated SIEM detection rules.',
        description: `## Role Overview
Join our 24x7 Security Operations Center to investigate security telemetry, execute threat hunts, and mitigate active adversarial attempts.

## Key Responsibilities
- Analyze alerts from SIEM (Splunk, Microsoft Sentinel) and EDR (CrowdStrike Falcon).
- Craft Sigma rules, YARA rules, and custom detection alerts mapped to MITRE ATT&CK.
- Perform root cause investigations for security incidents and malware outbreaks.
- Coordinate with client response teams during critical breach containment.

## Requirements
- 3+ years in a Tier 2/3 SOC or Threat Hunting role.
- Strong knowledge of Windows internals, Linux logs, and network traffic analysis (Wireshark, Zeek).
- Practical experience with MITRE ATT&CK framework and Splunk SPL.`,
        requiredSkills: ['SOC', 'SIEM', 'Splunk', 'Threat Hunting', 'EDR', 'MITRE ATT&CK', 'Wireshark'],
        preferredSkills: ['CrowdStrike', 'Sigma Rules', 'Python Scripting'],
        educationalQualification: 'B.Tech / BCA / B.Sc in Information Security or CS',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Perform proactive hypothesis-driven threat hunting.',
          'Investigate and escalate critical security incidents.',
          'Author detection rules for emerging zero-day vulnerabilities.',
        ],
        benefits: ['Health & Accident Insurance', 'Shift Allowances', 'Performance Bonus'],
        perks: ['State-of-the-art SOC Facility', 'Catered Meals & Transport', 'Certification Grants'],
        applicationInstructions: 'Apply with CV detailing incident investigations and SIEM tools used.',
      },
      {
        title: 'DevSecOps Engineer',
        department: 'Security Engineering',
        category: 'DevOps & SRE',
        numberOfOpenings: 2,
        employmentType: 'Full Time',
        workMode: 'Hybrid',
        experienceLevel: 'Mid-Senior Level (4–7 Years)',
        minExperience: 4,
        maxExperience: 7,
        minSalary: 1800000,
        maxSalary: 2700000,
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
          'Automate security gates into Kubernetes deployment pipelines, secure software supply chains, and enforce container compliance policies.',
        description: `## Role Overview
Bridge the gap between DevOps and Security by automating vulnerability discovery and policy enforcement directly inside CI/CD workflows.

## Key Responsibilities
- Integrate container scanning (Trivy, Grype) and Software Bill of Materials (SBOM) generation into GitHub Actions.
- Implement Kubernetes admission controllers (Kyverno, OPA Gatekeeper) to enforce container security standards.
- Manage secrets rotation using HashiCorp Vault.
- Conduct continuous vulnerability management and automate patching workflows.

## Requirements
- 4+ years in DevOps and cloud security engineering.
- Deep hands-on proficiency in Docker, Kubernetes, Terraform, and Linux.
- Practical experience with HashiCorp Vault, OPA/Kyverno, and CI/CD security.`,
        requiredSkills: ['DevSecOps', 'Kubernetes', 'Docker', 'Trivy', 'HashiCorp Vault', 'CI/CD', 'Terraform'],
        preferredSkills: ['OPA Gatekeeper', 'Kyverno', 'Cosign'],
        educationalQualification: 'B.Tech in Computer Science or IT',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Embed automated vulnerability scanners in build pipelines.',
          'Enforce Kubernetes security standards via admission controllers.',
          'Manage enterprise secrets management infrastructure.',
        ],
        benefits: ['Family Medical Cover', 'Certification Incentives', 'Annual Bonus'],
        perks: ['Hybrid Working Schedule', 'Top-spec Developer Machine', 'Wellness Program'],
        applicationInstructions: 'Submit your resume along with examples of automated DevSecOps pipelines built.',
      },
      {
        title: 'Cryptography & Zero-Knowledge Researcher',
        department: 'R&D',
        category: 'Engineering & R&D',
        numberOfOpenings: 1,
        employmentType: 'Full Time',
        workMode: 'Remote',
        experienceLevel: 'Senior Level (5–9 Years)',
        minExperience: 5,
        maxExperience: 9,
        minSalary: 2600000,
        maxSalary: 4000000,
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
          'Research and implement cutting-edge cryptographic protocols, zero-knowledge proofs (zk-SNARKs), and post-quantum encryption standards.',
        description: `## Role Overview
Advance privacy-preserving computation by researching and engineering production zero-knowledge proof circuits and quantum-resistant cryptographic libraries.

## Key Responsibilities
- Implement cryptographic algorithms in Rust, C++, and Circom.
- Design zk-SNARK / zk-STARK proof verification protocols for confidential data verification.
- Audit cryptographic primitives and verify mathematical proofs against side-channel vulnerabilities.
- Publish research papers and represent CyberDef at premier cryptography symposiums.

## Requirements
- 5+ years of research or applied engineering in cryptography.
- Deep mastery of modern applied cryptography (elliptic curves, pairing-friendly curves, lattice-based cryptography).
- Fluent programming in Rust or C++.`,
        requiredSkills: ['Cryptography', 'Rust', 'Zero-Knowledge Proofs', 'C++', 'zk-SNARKs', 'Mathematics'],
        preferredSkills: ['Circom', 'Post-Quantum Cryptography', 'Formal Verification'],
        educationalQualification: 'M.Tech / Ph.D. in Mathematics, Cryptography, or Computer Science',
        minEducationLevel: "Master's Degree",
        responsibilities: [
          'Develop zero-knowledge proof circuits.',
          'Audit cryptographic implementations for vulnerabilities.',
          'Design privacy-preserving identity verification architectures.',
        ],
        benefits: ['Comprehensive Medical Coverage', 'Research Grants', 'Substantial Equity Package'],
        perks: ['Global Conference Travel', 'Complete Work Flexibility', 'Academic Sabbatical Support'],
        applicationInstructions: 'Share your published papers, cryptographic code repositories, and CV.',
      },
      {
        title: 'Incident Response Lead',
        department: 'Defensive Operations',
        category: 'Cybersecurity',
        numberOfOpenings: 1,
        employmentType: 'Full Time',
        workMode: 'Hybrid',
        experienceLevel: 'Lead Level (6–10 Years)',
        minExperience: 6,
        maxExperience: 10,
        minSalary: 2000000,
        maxSalary: 3100000,
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
          'Lead high-stakes digital forensics and incident response (DFIR) engagements, malware reverse-engineering, and breach containment operations.',
        description: `## Role Overview
Take command during enterprise cyber crises, leading forensic investigations, eradicating threat actor footholds, and restoring operational stability.

## Key Responsibilities
- Lead emergency digital forensics and incident response (DFIR) for clients experiencing ransomware or data breaches.
- Perform disk, memory, and network forensic investigations (Volatilty, EnCase, FTK).
- Reverse-engineer malicious executables and extract indicators of compromise (IoCs).
- Author detailed post-incident forensic reports and brief C-suite executives.

## Requirements
- 6+ years in digital forensics and incident handling.
- Prestigious credentials such as GCIH, GCFA, GNFA, or EnCE.
- Proven track record leading live crisis response and breach containment.`,
        requiredSkills: ['DFIR', 'Digital Forensics', 'Incident Response', 'Malware Analysis', 'Memory Forensics', 'SIEM'],
        preferredSkills: ['GCIH / GCFA', 'Volatility', 'Reverse Engineering'],
        educationalQualification: 'B.Tech in Computer Science / Cyber Forensics',
        minEducationLevel: "Bachelor's Degree",
        responsibilities: [
          'Command enterprise incident response engagements.',
          'Execute memory and disk forensic analyses.',
          'Produce executive forensic reports with actionable hardening recommendations.',
        ],
        benefits: ['Executive Health Insurance', 'Incident Readiness Bonus', 'Provident Fund Matching'],
        perks: ['DFIR Investigation Lab Access', 'Hybrid Work Arrangement', 'Wellness Allowance'],
        applicationInstructions: 'Please upload your CV and summarize complex cyber incidents you have led containment for.',
      },
    ],
  },
];

const CANDIDATES = [
  {
    fullName: 'Ananya Sen',
    email: 'ananya.sen@candidate.test',
    phone: '+91 91234 50001',
    headline: 'Senior Full Stack Engineer | React, TypeScript, Node.js & PostgreSQL',
    bio: 'Passionate software engineer with 4.5+ years building performant web applications, RESTful microservices, and design systems.',
    careerSummary:
      'Proven expertise in architecting frontend applications using React and Next.js alongside backend services in Node.js and PostgreSQL. Passionate about clean code, unit testing, and developer experience.',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    yearsOfExperience: 4.5,
    relevantExperience: 4.5,
    currentJobTitle: 'Full Stack Engineer',
    currentCompany: 'TechMatrix Solutions',
    employmentStatus: 'Employed',
    expectedSalary: 1800000,
    currentSalary: 1350000,
    noticePeriod: '30 Days',
    preferredLocations: ['Bengaluru', 'Remote'],
    preferredEmploymentType: 'Full Time',
    preferredWorkMode: 'Hybrid',
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Next.js', 'Docker', 'GraphQL', 'Tailwind CSS'],
    linkedinUrl: 'https://linkedin.com/in/ananya-sen-dev',
    githubUrl: 'https://github.com/ananya-sen',
    education: {
      degree: 'B.Tech in Computer Science & Engineering',
      fieldOfStudy: 'Computer Science',
      institutionName: 'PES University, Bengaluru',
      educationLevel: "Bachelor's Degree",
      startDate: new Date('2018-08-01'),
      endDate: new Date('2022-05-30'),
      grade: '8.8 CGPA',
    },
    experience: {
      jobTitle: 'Full Stack Engineer',
      companyName: 'TechMatrix Solutions',
      employmentType: 'Full Time',
      workLocation: 'Bengaluru',
      startDate: new Date('2022-06-01'),
      currentlyWorking: true,
      description: 'Building customer-facing dashboards and microservices handling 2M+ active monthly queries.',
      responsibilities: [
        'Built reusable React component library reducing UI development time by 30%.',
        'Implemented scalable REST APIs in Node.js/Express with PostgreSQL.',
        'Migrated monolithic frontend to Next.js with server-side rendering for improved SEO.',
      ],
      skillsUsed: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
    },
  },
  {
    fullName: 'Kabir Mehta',
    email: 'kabir.mehta@candidate.test',
    phone: '+91 91234 50002',
    headline: 'DevOps & Cloud Infrastructure Engineer | AWS, Kubernetes, Terraform & CI/CD',
    bio: 'DevOps engineer with 5 years experience automating multi-cloud platforms, building GitOps pipelines, and maintaining production Kubernetes.',
    careerSummary:
      'Specialized in AWS cloud governance, Docker containerization, Kubernetes cluster orchestration, and automated Terraform infrastructure.',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    yearsOfExperience: 5.0,
    relevantExperience: 5.0,
    currentJobTitle: 'Cloud Engineer',
    currentCompany: 'CloudScale Labs',
    employmentStatus: 'Employed',
    expectedSalary: 2100000,
    currentSalary: 1600000,
    noticePeriod: '15 Days',
    preferredLocations: ['Pune', 'Bengaluru', 'Remote'],
    preferredEmploymentType: 'Full Time',
    preferredWorkMode: 'Remote',
    skills: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD', 'Linux', 'ArgoCD', 'Python'],
    linkedinUrl: 'https://linkedin.com/in/kabir-mehta-cloud',
    githubUrl: 'https://github.com/kabir-mehta',
    education: {
      degree: 'B.E. in Information Technology',
      fieldOfStudy: 'Information Technology',
      institutionName: 'Pune Institute of Computer Technology (PICT)',
      educationLevel: "Bachelor's Degree",
      startDate: new Date('2017-08-01'),
      endDate: new Date('2021-05-30'),
      grade: '8.5 CGPA',
    },
    experience: {
      jobTitle: 'Cloud & DevOps Engineer',
      companyName: 'CloudScale Labs',
      employmentType: 'Full Time',
      workLocation: 'Pune',
      startDate: new Date('2021-06-15'),
      currentlyWorking: true,
      description: 'Orchestrating AWS multi-account infrastructure and EKS clusters for SaaS applications.',
      responsibilities: [
        'Maintained production EKS clusters across 3 regions with zero downtime.',
        'Automated CI/CD deployments using GitHub Actions and ArgoCD.',
        'Cut annual cloud infrastructure spend by 25% through FinOps optimizations.',
      ],
      skillsUsed: ['AWS', 'Kubernetes', 'Terraform', 'Helm', 'ArgoCD'],
    },
  },
  {
    fullName: 'Deepika Joshi',
    email: 'deepika.joshi@candidate.test',
    phone: '+91 91234 50003',
    headline: 'Machine Learning Engineer | PyTorch, Computer Vision & Deep Learning',
    bio: 'ML practitioner with 3.5 years researching and deploying deep learning models in healthcare and autonomous systems.',
    careerSummary:
      'Passionate about computer vision, PyTorch model optimization, and TensorRT inference acceleration. Experienced in building end-to-end training pipelines.',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    yearsOfExperience: 3.5,
    relevantExperience: 3.5,
    currentJobTitle: 'ML Engineer',
    currentCompany: 'VisionAI Innovations',
    employmentStatus: 'Employed',
    expectedSalary: 1900000,
    currentSalary: 1400000,
    noticePeriod: '30 Days',
    preferredLocations: ['Hyderabad', 'Bengaluru', 'Remote'],
    preferredEmploymentType: 'Full Time',
    preferredWorkMode: 'Hybrid',
    skills: ['Python', 'PyTorch', 'Computer Vision', 'OpenCV', 'FastAPI', 'TensorRT', 'Docker'],
    linkedinUrl: 'https://linkedin.com/in/deepika-joshi-ai',
    githubUrl: 'https://github.com/deepika-joshi',
    education: {
      degree: 'M.Tech in Artificial Intelligence',
      fieldOfStudy: 'Artificial Intelligence & Machine Learning',
      institutionName: 'IIT Hyderabad',
      educationLevel: "Master's Degree",
      startDate: new Date('2020-08-01'),
      endDate: new Date('2022-06-30'),
      grade: '9.1 CGPA',
    },
    experience: {
      jobTitle: 'Machine Learning Engineer',
      companyName: 'VisionAI Innovations',
      employmentType: 'Full Time',
      workLocation: 'Hyderabad',
      startDate: new Date('2022-07-01'),
      currentlyWorking: true,
      description: 'Developing high-accuracy object detection and image segmentation pipelines.',
      responsibilities: [
        'Trained vision transformer models achieving 94.2% mAP on target benchmark.',
        'Optimized model deployment with TensorRT reducing inference latency by 45%.',
        'Implemented automated dataset versioning and experiment tracking in MLflow.',
      ],
      skillsUsed: ['Python', 'PyTorch', 'OpenCV', 'FastAPI', 'TensorRT'],
    },
  },
  {
    fullName: 'Siddharth Rao',
    email: 'siddharth.rao@candidate.test',
    phone: '+91 91234 50004',
    headline: 'Backend Developer | Java, Spring Boot, Microservices & Kafka',
    bio: 'Backend software engineer with 4 years specializing in distributed systems, financial switches, and transaction processing.',
    careerSummary:
      'Experienced in designing event-driven Java microservices, PostgreSQL schema optimization, and asynchronous queue management using Apache Kafka.',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    yearsOfExperience: 4.0,
    relevantExperience: 4.0,
    currentJobTitle: 'Software Engineer - Backend',
    currentCompany: 'FinServ Systems',
    employmentStatus: 'Employed',
    expectedSalary: 1750000,
    currentSalary: 1300000,
    noticePeriod: '60 Days',
    preferredLocations: ['Bengaluru', 'Hyderabad'],
    preferredEmploymentType: 'Full Time',
    preferredWorkMode: 'Hybrid',
    skills: ['Java', 'Spring Boot', 'Microservices', 'Kafka', 'PostgreSQL', 'Redis', 'Docker', 'JUnit'],
    linkedinUrl: 'https://linkedin.com/in/siddharth-rao-backend',
    githubUrl: 'https://github.com/siddharth-rao',
    education: {
      degree: 'B.Tech in Computer Science',
      fieldOfStudy: 'Computer Science',
      institutionName: 'BMS College of Engineering, Bengaluru',
      educationLevel: "Bachelor's Degree",
      startDate: new Date('2018-08-01'),
      endDate: new Date('2022-05-30'),
      grade: '8.4 CGPA',
    },
    experience: {
      jobTitle: 'Backend Software Engineer',
      companyName: 'FinServ Systems',
      employmentType: 'Full Time',
      workLocation: 'Bengaluru',
      startDate: new Date('2022-06-15'),
      currentlyWorking: true,
      description: 'Developing core banking microservices for digital loan processing.',
      responsibilities: [
        'Engineered high-throughput event consumers in Kafka processing 5M events daily.',
        'Designed idempotent payment APIs with Redis distributed locks.',
        'Wrote robust unit and integration tests using Testcontainers and JUnit 5.',
      ],
      skillsUsed: ['Java', 'Spring Boot', 'Kafka', 'PostgreSQL', 'Redis'],
    },
  },
  {
    fullName: 'Meera Iyer',
    email: 'meera.iyer@candidate.test',
    phone: '+91 91234 50005',
    headline: 'Frontend Developer | React, Next.js, Redux & Tailwind CSS',
    bio: 'Frontend specialist with 3 years experience building responsive, accessible, and fast consumer web interfaces.',
    careerSummary:
      'Focused on React ecosystem, state management with Zustand/Redux, and design system engineering. Advocate for web accessibility and responsive micro-interactions.',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    yearsOfExperience: 3.0,
    relevantExperience: 3.0,
    currentJobTitle: 'UI Developer',
    currentCompany: 'CreativeEdge Studio',
    employmentStatus: 'Employed',
    expectedSalary: 1200000,
    currentSalary: 900000,
    noticePeriod: '15 Days',
    preferredLocations: ['Chennai', 'Bengaluru', 'Remote'],
    preferredEmploymentType: 'Full Time',
    preferredWorkMode: 'Hybrid',
    skills: ['React', 'JavaScript', 'HTML5', 'CSS3', 'Next.js', 'Tailwind CSS', 'Redux', 'TypeScript'],
    linkedinUrl: 'https://linkedin.com/in/meera-iyer-ui',
    githubUrl: 'https://github.com/meera-iyer',
    education: {
      degree: 'B.Tech in Information Technology',
      fieldOfStudy: 'Information Technology',
      institutionName: 'SSN College of Engineering, Chennai',
      educationLevel: "Bachelor's Degree",
      startDate: new Date('2019-08-01'),
      endDate: new Date('2023-05-30'),
      grade: '8.9 CGPA',
    },
    experience: {
      jobTitle: 'Frontend Developer',
      companyName: 'CreativeEdge Studio',
      employmentType: 'Full Time',
      workLocation: 'Chennai',
      startDate: new Date('2023-06-01'),
      currentlyWorking: true,
      description: 'Crafting responsive user interfaces for global consumer e-commerce clients.',
      responsibilities: [
        'Developed performant frontend layouts using React and Tailwind CSS.',
        'Maintained 100% test coverage for critical cart checkout user journeys.',
        'Improved Lighthouse accessibility score from 68 to 96.',
      ],
      skillsUsed: ['React', 'Next.js', 'Tailwind CSS', 'TypeScript'],
    },
  },
  {
    fullName: 'Rahul Verma',
    email: 'rahul.verma@candidate.test',
    phone: '+91 91234 50006',
    headline: 'Site Reliability Engineer | Go, Python, Prometheus, Kubernetes & Linux',
    bio: 'SRE with 6 years experience running high-traffic infrastructure, improving system availability, and automating incident handling.',
    careerSummary:
      'Deep background in Linux internals, Prometheus/Grafana observability, SLA governance, and automated disaster recovery operations.',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    yearsOfExperience: 6.0,
    relevantExperience: 6.0,
    currentJobTitle: 'SRE Specialist',
    currentCompany: 'NetCore Systems',
    employmentStatus: 'Employed',
    expectedSalary: 2300000,
    currentSalary: 1750000,
    noticePeriod: '30 Days',
    preferredLocations: ['Mumbai', 'Pune', 'Remote'],
    preferredEmploymentType: 'Full Time',
    preferredWorkMode: 'Hybrid',
    skills: ['Go', 'Python', 'Kubernetes', 'Prometheus', 'Grafana', 'Linux', 'AWS', 'Terraform'],
    linkedinUrl: 'https://linkedin.com/in/rahul-verma-sre',
    githubUrl: 'https://github.com/rahul-verma-sre',
    education: {
      degree: 'B.E. in Computer Engineering',
      fieldOfStudy: 'Computer Engineering',
      institutionName: 'Veermata Jijabai Technological Institute (VJTI), Mumbai',
      educationLevel: "Bachelor's Degree",
      startDate: new Date('2016-08-01'),
      endDate: new Date('2020-05-30'),
      grade: '8.6 CGPA',
    },
    experience: {
      jobTitle: 'Senior SRE',
      companyName: 'NetCore Systems',
      employmentType: 'Full Time',
      workLocation: 'Mumbai',
      startDate: new Date('2020-06-15'),
      currentlyWorking: true,
      description: 'Managing production infrastructure reliability for messaging and push services.',
      responsibilities: [
        'Maintained 99.99% availability for API gateways processing 1B+ monthly requests.',
        'Built automated alerting rules and SLO dashboards in Prometheus and Grafana.',
        'Developed custom Kubernetes operator in Go for automated database failovers.',
      ],
      skillsUsed: ['Go', 'Kubernetes', 'Prometheus', 'Grafana', 'Linux'],
    },
  },
  {
    fullName: 'Pooja Patel',
    email: 'pooja.patel@candidate.test',
    phone: '+91 91234 50007',
    headline: 'QA Automation Engineer | Cypress, Selenium, Playwright & Jest',
    bio: 'Quality engineering enthusiast with 4 years designing end-to-end automated testing pipelines for web and API platforms.',
    careerSummary:
      'Passionate about shift-left testing, continuous automated regressions, and performance benchmarking using Cypress, Playwright, and Postman.',
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
    yearsOfExperience: 4.0,
    relevantExperience: 4.0,
    currentJobTitle: 'Senior QA Automation Engineer',
    currentCompany: 'QualityWorks Labs',
    employmentStatus: 'Employed',
    expectedSalary: 1500000,
    currentSalary: 1100000,
    noticePeriod: '30 Days',
    preferredLocations: ['Ahmedabad', 'Pune', 'Remote'],
    preferredEmploymentType: 'Full Time',
    preferredWorkMode: 'Remote',
    skills: ['Cypress', 'Playwright', 'Selenium', 'JavaScript', 'Python', 'Jest', 'Git', 'Postman'],
    linkedinUrl: 'https://linkedin.com/in/pooja-patel-qa',
    githubUrl: 'https://github.com/pooja-patel-qa',
    education: {
      degree: 'B.Tech in Computer Science',
      fieldOfStudy: 'Computer Science',
      institutionName: 'Nirma University, Ahmedabad',
      educationLevel: "Bachelor's Degree",
      startDate: new Date('2018-08-01'),
      endDate: new Date('2022-05-30'),
      grade: '8.7 CGPA',
    },
    experience: {
      jobTitle: 'QA Automation Engineer',
      companyName: 'QualityWorks Labs',
      employmentType: 'Full Time',
      workLocation: 'Ahmedabad',
      startDate: new Date('2022-06-01'),
      currentlyWorking: true,
      description: 'Designing end-to-end automation suites for B2B SaaS web applications.',
      responsibilities: [
        'Created modular Cypress test framework covering 400+ critical test scenarios.',
        'Integrated regression testing into GitLab CI, catching bugs pre-production.',
        'Authored automated API integration tests validating payload contracts.',
      ],
      skillsUsed: ['Cypress', 'Playwright', 'JavaScript', 'Postman', 'Git'],
    },
  },
  {
    fullName: 'Arjun Das',
    email: 'arjun.das@candidate.test',
    phone: '+91 91234 50008',
    headline: 'Data Engineer | Apache Spark, Airflow, SQL & Snowflake',
    bio: 'Data engineer with 5.5 years designing large-scale batch and streaming data pipelines, lakehouses, and analytical warehouses.',
    careerSummary:
      'Skilled in building scalable data pipelines with PySpark, orchestrating Airflow DAGs, and modeling analytical tables in Snowflake and dbt.',
    city: 'Kolkata',
    state: 'West Bengal',
    country: 'India',
    yearsOfExperience: 5.5,
    relevantExperience: 5.5,
    currentJobTitle: 'Data Engineer',
    currentCompany: 'DataStream Analytics',
    employmentStatus: 'Employed',
    expectedSalary: 2000000,
    currentSalary: 1550000,
    noticePeriod: '45 Days',
    preferredLocations: ['Kolkata', 'Bengaluru', 'Remote'],
    preferredEmploymentType: 'Full Time',
    preferredWorkMode: 'Remote',
    skills: ['Python', 'SQL', 'Apache Spark', 'Airflow', 'Snowflake', 'dbt', 'AWS', 'Kafka'],
    linkedinUrl: 'https://linkedin.com/in/arjun-das-data',
    githubUrl: 'https://github.com/arjun-das-data',
    education: {
      degree: 'B.Tech in Information Technology',
      fieldOfStudy: 'Information Technology',
      institutionName: 'Jadavpur University, Kolkata',
      educationLevel: "Bachelor's Degree",
      startDate: new Date('2017-08-01'),
      endDate: new Date('2021-05-30'),
      grade: '8.8 CGPA',
    },
    experience: {
      jobTitle: 'Lead Data Engineer',
      companyName: 'DataStream Analytics',
      employmentType: 'Full Time',
      workLocation: 'Kolkata',
      startDate: new Date('2021-06-01'),
      currentlyWorking: true,
      description: 'Building automated data warehouse pipelines for analytics and BI reporting.',
      responsibilities: [
        'Developed Spark batch processing jobs ingesting 100GB+ daily transaction logs.',
        'Orchestrated 50+ modular Airflow DAGs with automated alerting and retries.',
        'Transformed raw data into star schemas using Snowflake and dbt models.',
      ],
      skillsUsed: ['Python', 'SQL', 'Apache Spark', 'Airflow', 'Snowflake'],
    },
  },
  {
    fullName: 'Shweta Kulkarni',
    email: 'shweta.kulkarni@candidate.test',
    phone: '+91 91234 50009',
    headline: 'Cybersecurity Analyst | SOC, SIEM, Penetration Testing & OWASP',
    bio: 'Security analyst with 3.5 years monitoring threat vectors, conducting web penetration testing, and analyzing digital security events.',
    careerSummary:
      'Strong expertise in SIEM log analysis with Splunk, vulnerability assessments using Burp Suite, and incident response containment.',
    city: 'Noida',
    state: 'Uttar Pradesh',
    country: 'India',
    yearsOfExperience: 3.5,
    relevantExperience: 3.5,
    currentJobTitle: 'Security Analyst',
    currentCompany: 'CyberShield Inc',
    employmentStatus: 'Employed',
    expectedSalary: 1400000,
    currentSalary: 1050000,
    noticePeriod: '30 Days',
    preferredLocations: ['Noida', 'Gurugram', 'Delhi NCR', 'Remote'],
    preferredEmploymentType: 'Full Time',
    preferredWorkMode: 'Hybrid',
    skills: ['SIEM', 'Splunk', 'Penetration Testing', 'OWASP Top 10', 'Burp Suite', 'Python', 'Network Security'],
    linkedinUrl: 'https://linkedin.com/in/shweta-kulkarni-sec',
    githubUrl: 'https://github.com/shweta-kulkarni',
    education: {
      degree: 'B.Tech in Computer Science & Cybersecurity',
      fieldOfStudy: 'Cybersecurity',
      institutionName: 'Amity University, Noida',
      educationLevel: "Bachelor's Degree",
      startDate: new Date('2019-08-01'),
      endDate: new Date('2023-05-30'),
      grade: '8.3 CGPA',
    },
    experience: {
      jobTitle: 'Cybersecurity Analyst',
      companyName: 'CyberShield Inc',
      employmentType: 'Full Time',
      workLocation: 'Noida',
      startDate: new Date('2023-06-15'),
      currentlyWorking: true,
      description: 'Monitoring SOC security feeds and performing application penetration testing.',
      responsibilities: [
        'Investigated 150+ escalated security alerts in Splunk and CrowdStrike.',
        'Executed manual web application penetration tests uncovering 12 high-severity flaws.',
        'Formulated company-wide phishing simulation campaigns improving awareness by 40%.',
      ],
      skillsUsed: ['Splunk', 'Burp Suite', 'OWASP Top 10', 'Python'],
    },
  },
  {
    fullName: 'Tanya Kapoor',
    email: 'tanya.kapoor@candidate.test',
    phone: '+91 91234 50010',
    headline: 'Product & UI/UX Designer | Figma, User Research, Wireframing & Design Systems',
    bio: 'Product designer with 4 years creating intuitive, user-centric mobile and web experiences for digital product companies.',
    careerSummary:
      'Expert in translating complex user flows into simple, beautiful Figma interfaces. Proficient in user interviews, wireframing, interactive prototyping, and design system governance.',
    city: 'Gurugram',
    state: 'Haryana',
    country: 'India',
    yearsOfExperience: 4.0,
    relevantExperience: 4.0,
    currentJobTitle: 'Product Designer',
    currentCompany: 'AppCraft Studios',
    employmentStatus: 'Employed',
    expectedSalary: 1600000,
    currentSalary: 1200000,
    noticePeriod: '30 Days',
    preferredLocations: ['Gurugram', 'Delhi NCR', 'Remote'],
    preferredEmploymentType: 'Full Time',
    preferredWorkMode: 'Hybrid',
    skills: ['Figma', 'UI/UX Design', 'User Research', 'Wireframing', 'Prototyping', 'Design Systems', 'Micro-interactions'],
    linkedinUrl: 'https://linkedin.com/in/tanya-kapoor-design',
    githubUrl: 'https://github.com/tanya-kapoor-design',
    education: {
      degree: 'Bachelor of Design (B.Des) in Interaction Design',
      fieldOfStudy: 'Interaction Design',
      institutionName: 'National Institute of Design (NID)',
      educationLevel: "Bachelor's Degree",
      startDate: new Date('2018-08-01'),
      endDate: new Date('2022-05-30'),
      grade: '8.9 CGPA',
    },
    experience: {
      jobTitle: 'Senior Product Designer',
      companyName: 'AppCraft Studios',
      employmentType: 'Full Time',
      workLocation: 'Gurugram',
      startDate: new Date('2022-06-01'),
      currentlyWorking: true,
      description: 'Designing end-to-end B2B SaaS workflows and consumer mobile app experiences.',
      responsibilities: [
        'Led redesign of customer onboarding flow, increasing completion rate by 28%.',
        'Built comprehensive design system with 150+ responsive components in Figma.',
        'Facilitated weekly usability testing sessions with core client personas.',
      ],
      skillsUsed: ['Figma', 'User Research', 'Wireframing', 'Prototyping'],
    },
  },
];

async function seedData() {
  console.log('=== Starting Seeding of Recruiters, Companies, Jobs & Candidates ===\n');
  const now = new Date();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  // 1. Seed Recruiters, Companies, and Jobs
  console.log('--- 1. Seeding 5 Recruiters & Companies & 25 Jobs ---');
  for (let rIdx = 0; rIdx < RECRUITERS.length; rIdx++) {
    const rData = RECRUITERS[rIdx];
    const cleanEmail = rData.email.trim().toLowerCase();

    // Create or update recruiter user
    const user = await prisma.user.upsert({
      where: { email: cleanEmail },
      update: {
        fullName: rData.fullName,
        passwordHash,
        role: 'recruiter',
        status: 'active',
        emailVerifiedAt: now,
      },
      create: {
        email: cleanEmail,
        fullName: rData.fullName,
        passwordHash,
        role: 'recruiter',
        status: 'active',
        emailVerifiedAt: now,
      },
    });

    console.log(`\n[Recruiter ${rIdx + 1}/5] User: ${user.fullName} (${user.email})`);

    // Create or find Company
    const compData = rData.company;
    let company = await prisma.company.findFirst({
      where: { name: compData.name },
    });

    if (company) {
      company = await prisma.company.update({
        where: { id: company.id },
        data: {
          ...compData,
          ownerId: user.id,
          status: 'APPROVED',
          approvedAt: now,
        },
      });
      console.log(`  Updated Company: "${company.name}" (Status: APPROVED)`);
    } else {
      company = await prisma.company.create({
        data: {
          ...compData,
          ownerId: user.id,
          status: 'APPROVED',
          approvedAt: now,
          submittedAt: now,
        },
      });
      console.log(`  Created Company: "${company.name}" (Status: APPROVED)`);
    }

    // Ensure CompanyMembership
    await prisma.companyMembership.upsert({
      where: {
        companyId_userId: {
          companyId: company.id,
          userId: user.id,
        },
      },
      update: {
        role: 'OWNER',
        membershipStatus: 'ACTIVE',
      },
      create: {
        companyId: company.id,
        userId: user.id,
        role: 'OWNER',
        membershipStatus: 'ACTIVE',
      },
    });

    // Ensure RecruiterProfile
    await prisma.recruiterProfile.upsert({
      where: { userId: user.id },
      update: {
        companyId: company.id,
        phone: rData.phone,
        designation: rData.designation,
        linkedinUrl: rData.linkedinUrl,
      },
      create: {
        userId: user.id,
        companyId: company.id,
        phone: rData.phone,
        designation: rData.designation,
        linkedinUrl: rData.linkedinUrl,
      },
    });

    // Create 5 jobs for this recruiter
    console.log(`  Creating 5 jobs for "${company.name}"...`);
    for (let jIdx = 0; jIdx < rData.jobs.length; jIdx++) {
      const jobData = rData.jobs[jIdx];
      const deadline = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days from now

      const contentHash = computeJobHash({
        title: jobData.title,
        employmentType: jobData.employmentType,
        workMode: jobData.workMode,
        city: jobData.city,
        country: jobData.country,
        description: jobData.description,
      });

      const applicationQuestions = [
        {
          id: `q_exp_${jIdx + 1}`,
          type: 'SHORT_TEXT',
          question: 'How many years of relevant experience do you have with the required tech stack?',
          required: true,
          options: [],
        },
        {
          id: `q_notice_${jIdx + 1}`,
          type: 'SHORT_TEXT',
          question: 'What is your current notice period / earliest availability to join?',
          required: true,
          options: [],
        },
        {
          id: `q_portfolio_${jIdx + 1}`,
          type: 'SHORT_TEXT',
          question: 'Please share your GitHub, portfolio, or recent technical projects link.',
          required: false,
          options: [],
        },
      ];

      // Check if job with same title and company exists
      const existingJob = await prisma.job.findFirst({
        where: {
          companyId: company.id,
          title: jobData.title,
        },
      });

      let job;
      if (existingJob) {
        job = await prisma.job.update({
          where: { id: existingJob.id },
          data: {
            ...jobData,
            companyId: company.id,
            createdById: user.id,
            updatedById: user.id,
            contactEmail: cleanEmail,
            applicationDeadline: deadline,
            allowAfterDeadline: false,
            requireResume: true,
            requireCoverLetter: false,
            maxApplications: 250,
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
        console.log(`    [Job ${jIdx + 1}/5] Updated: "${job.title}" (${job.employmentType}, ${job.workMode})`);
      } else {
        job = await prisma.job.create({
          data: {
            ...jobData,
            companyId: company.id,
            createdById: user.id,
            updatedById: user.id,
            contactEmail: cleanEmail,
            applicationDeadline: deadline,
            allowAfterDeadline: false,
            requireResume: true,
            requireCoverLetter: false,
            maxApplications: 250,
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
        console.log(`    [Job ${jIdx + 1}/5] Created: "${job.title}" (${job.employmentType}, ${job.workMode})`);
      }
    }
  }

  // 2. Seed 10 Candidates
  console.log('\n--- 2. Seeding 10 Candidate Accounts & Profiles ---');
  for (let cIdx = 0; cIdx < CANDIDATES.length; cIdx++) {
    const cData = CANDIDATES[cIdx];
    const cleanEmail = cData.email.trim().toLowerCase();

    const user = await prisma.user.upsert({
      where: { email: cleanEmail },
      update: {
        fullName: cData.fullName,
        passwordHash,
        role: 'candidate',
        status: 'active',
        emailVerifiedAt: now,
      },
      create: {
        email: cleanEmail,
        fullName: cData.fullName,
        passwordHash,
        role: 'candidate',
        status: 'active',
        emailVerifiedAt: now,
      },
    });

    // CandidateProfile
    await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      update: {
        phone: cData.phone,
        headline: cData.headline,
        bio: cData.bio,
        careerSummary: cData.careerSummary,
        city: cData.city,
        state: cData.state,
        country: cData.country,
        location: `${cData.city}, ${cData.state}, ${cData.country}`,
        yearsOfExperience: cData.yearsOfExperience,
        relevantExperience: cData.relevantExperience,
        currentJobTitle: cData.currentJobTitle,
        currentCompany: cData.currentCompany,
        employmentStatus: cData.employmentStatus,
        expectedSalary: cData.expectedSalary,
        currentSalary: cData.currentSalary,
        salaryCurrency: 'INR',
        noticePeriod: cData.noticePeriod,
        preferredLocations: cData.preferredLocations,
        preferredEmploymentType: cData.preferredEmploymentType,
        preferredWorkMode: cData.preferredWorkMode,
        skills: cData.skills,
        linkedinUrl: cData.linkedinUrl,
        githubUrl: cData.githubUrl,
      },
      create: {
        userId: user.id,
        phone: cData.phone,
        headline: cData.headline,
        bio: cData.bio,
        careerSummary: cData.careerSummary,
        city: cData.city,
        state: cData.state,
        country: cData.country,
        location: `${cData.city}, ${cData.state}, ${cData.country}`,
        yearsOfExperience: cData.yearsOfExperience,
        relevantExperience: cData.relevantExperience,
        currentJobTitle: cData.currentJobTitle,
        currentCompany: cData.currentCompany,
        employmentStatus: cData.employmentStatus,
        expectedSalary: cData.expectedSalary,
        currentSalary: cData.currentSalary,
        salaryCurrency: 'INR',
        noticePeriod: cData.noticePeriod,
        preferredLocations: cData.preferredLocations,
        preferredEmploymentType: cData.preferredEmploymentType,
        preferredWorkMode: cData.preferredWorkMode,
        skills: cData.skills,
        linkedinUrl: cData.linkedinUrl,
        githubUrl: cData.githubUrl,
      },
    });

    // Seed Skills
    for (const skillName of cData.skills) {
      const normalizedName = skillName.trim().toLowerCase();
      await prisma.candidateSkill.upsert({
        where: {
          userId_normalizedName: {
            userId: user.id,
            normalizedName,
          },
        },
        update: {
          name: skillName,
          experienceYears: cData.yearsOfExperience,
          proficiencyLevel: 'Advanced',
        },
        create: {
          userId: user.id,
          name: skillName,
          normalizedName,
          experienceYears: cData.yearsOfExperience,
          proficiencyLevel: 'Advanced',
          category: 'Technical',
        },
      });
    }

    // Seed Education (if not already existing)
    const existingEdu = await prisma.candidateEducation.findFirst({
      where: { userId: user.id, degree: cData.education.degree },
    });
    if (!existingEdu) {
      await prisma.candidateEducation.create({
        data: {
          userId: user.id,
          ...cData.education,
        },
      });
    }

    // Seed Experience (if not already existing)
    const existingExp = await prisma.candidateExperience.findFirst({
      where: { userId: user.id, companyName: cData.experience.companyName },
    });
    if (!existingExp) {
      await prisma.candidateExperience.create({
        data: {
          userId: user.id,
          ...cData.experience,
        },
      });
    }

    console.log(`[Candidate ${cIdx + 1}/10] Created/Updated: ${user.fullName} (${user.email}) - ${cData.currentJobTitle}`);
  }

  // Summary counts
  const [totalRecruiters, totalCandidates, totalCompanies, totalJobs] = await Promise.all([
    prisma.user.count({ where: { role: 'recruiter' } }),
    prisma.user.count({ where: { role: 'candidate' } }),
    prisma.company.count(),
    prisma.job.count({ where: { status: 'PUBLISHED' } }),
  ]);

  console.log('\n======================================================');
  console.log('              SEEDING COMPLETED SUCCESSFULLY          ');
  console.log('======================================================');
  console.log(`Total Recruiter Accounts : ${totalRecruiters}`);
  console.log(`Total Candidate Accounts : ${totalCandidates}`);
  console.log(`Total Companies          : ${totalCompanies}`);
  console.log(`Total Published Jobs     : ${totalJobs}`);
  console.log(`Standard Password for all: ${DEFAULT_PASSWORD}`);
  console.log('======================================================\n');
}

seedData()
  .catch((err) => {
    console.error('Seeding failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
