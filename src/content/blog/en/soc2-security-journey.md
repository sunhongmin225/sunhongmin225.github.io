---
title: "blux's SOC 2 Security Journey and the Record We Left Behind"
description: "Not sure where to start with SOC 2 preparation? Here are real-world insights from blux's experience that you won't find through a simple search."
pubDate: 2025-03-31
heroImage: ../../../assets/soc2-security-journey-hero.png
heroImageCaption: "Thumbnail image"
tags: ["Security", "DevOps", "Compliance", "SOC 2", "SaaS"]
---

> **Originally published** on the [blux Tech Blog](https://blog.blux.ai/%EB%B8%94%EB%9F%AD%EC%8A%A4%EC%9D%98-soc-2-%EB%B3%B4%EC%95%88-%EC%97%AC%EC%A0%95%EA%B3%BC-%EC%9A%B0%EB%A6%AC%EA%B0%80-%EB%82%A8%EA%B8%B4-%EA%B8%B0%EB%A1%9D-49217). Republished here on the author's personal blog.

## Common Misconceptions About Security Standard Certification

Many SaaS companies fall into five common misconceptions when preparing for security standard audits:

1. "You can pass the security certification with just one month of preparation"
2. "You can outsource the entire certification process to an external vendor"
3. "Once you pass the certification, it's valid forever"
4. "You need a large security team to pass the certification"
5. "You must hire a security specialist to pass the certification"

At blux, we corrected these misconceptions one by one during our preparation, turning the SOC 2 certification process into an opportunity to review and improve our overall security posture — not just check a box.

## What Is SOC 2, and Why Does It Matter?

SOC 2 is a service organization control report established by the American Institute of Certified Public Accountants (AICPA). It evaluates the security and privacy compliance of cloud services and data processing organizations as a "voluntary compliance standard." For today's B2B SaaS companies, SOC 2 is no longer optional — it has become the de facto required security standard for entering the US and global markets.

![SOC 2 security standard](../../../assets/soc2-security-journey-1.png)

### The 5 Trust Service Criteria of SOC 2

- **Security** – System protection, access control, security incident response
- **Availability** – Service performance, monitoring, disaster recovery
- **Processing Integrity** – Data processing accuracy and error management
- **Confidentiality** – Sensitive information protection, data access restrictions, encryption
- **Privacy** – Personal data collection, retention, disposal, and policy compliance

Security is mandatory, while the rest are optionally applied based on the organization's needs. blux selected Security, Availability, and Confidentiality.

### SOC 2 Report Types

| Category | SOC 2 Type I | SOC 2 Type II |
|----------|-------------|--------------|
| Evaluation Criteria | Assesses the design adequacy of security controls at a specific point in time | Evaluates the operational effectiveness of security controls over 3–12 months |
| Key Question | Are the security controls properly designed? | Are the security controls actually operating effectively? |
| Customer Trust Level | Limited (design only) | High (operational effectiveness) |
| Use Cases | Internal process review, initial trust building | Service reliability assurance for enterprise and global customers |

When people say "passed SOC 2," they typically mean SOC 2 Type II.

## Why B2B SaaS Companies Need SOC 2

### Building Customer Trust and Entering Global Markets

Many enterprise customers — especially large corporations and global companies — require SOC 2 or equivalent security certifications as a prerequisite for adopting SaaS products. blux also experienced SOC 2 certification being a precondition for enterprise partnerships, demonstrating that passing a security standard certification is not just an internal achievement — it plays a crucial role in building trust with external customers.

<!-- TODO: replace with actual image — LinkedIn post about security certifications as B2B SaaS prerequisite -->

### A Key Driver for Business Growth

SOC 2 is a powerful tool for accelerating the sales process and gaining a competitive edge. Enterprise customers always go through a security review when adopting new solutions, and SOC 2 serves as strong evidence that a company is verified and trustworthy.

### Strengthening Actual Security Posture

The SOC 2 preparation process becomes a catalyst for meaningfully elevating the entire organization's security posture. It includes establishing security policies, building risk assessment frameworks, and implementing technical measures within cloud infrastructure — laying the foundation for a sustainable security operations program.

## blux's SOC 2 Certification Journey

### August 2024 – Selecting a Compliance SaaS Platform

blux began by selecting a compliance SaaS tool for SOC 2 preparation. Our evaluation criteria included:

- **Startup-friendliness**: Real-time support channels like Slack Connect
- **Onboarding speed**: Timeline and customer responsiveness
- **Cost-effectiveness**: Sustainable operation within budget

**Drata** was selected for its superior automation capabilities, UI/UX, and real-time communication environment with expert consultants.

### August 29, 2024 – Kickoff Meeting with Drata

<!-- TODO: replace with actual image — Drata GRC platform logo/interface -->

Drata is a GRC (Governance, Risk, Compliance) platform that supports audit-ready security operations through AI-powered automation. Key capabilities:

- Compliance automation: Up to 90% automation of security framework tasks like SOC 2 and ISO 27001
- GRC management: Risk assessment and automated audit response
- Security verification: Real-time monitoring and automated evidence collection

### September – October 2024 – Executing Security Requirements

#### Connecting Business Services

<!-- TODO: replace with actual image — blux's connected services to Drata platform -->

We connected various business collaboration services to Drata — including Slack, Google Workspace, AWS, MongoDB Atlas, and GitHub — to leverage automation capabilities.

#### Device Security Verification

<!-- TODO: replace with actual image — Drata agent device security verification -->

We installed the Drata agent on each team member's device to automatically verify:
- Password manager installation
- Hard disk encryption
- Antivirus software installation
- Automatic update settings
- Screen saver configuration

#### Writing Security Policies

<!-- TODO: replace with actual image — blux's security policies list -->

We established 23 security policies. Key policies included:
- Asset Management Policy: Standards for managing organizational assets
- Backup Policy: Backup procedures and recovery criteria
- Business Continuity Plan: Plans for maintaining business continuity during emergencies

#### Risk Assessment and Mitigation

We identified approximately 60 risks and evaluated mitigation strategies for each. For example, to defend against DoS attacks, we assessed impact and likelihood using AWS WAF rate-based rules.

#### Leveraging AWS Security Services

| Service | Description | blux's Use Case |
|---------|-------------|----------------|
| AWS CloudTrail | Records user activity and API calls within AWS accounts | Tracking who did what, when; identifying root causes of security incidents |
| Amazon Inspector | Automatically analyzes vulnerabilities and misconfigurations in AWS environments | Automated vulnerability scanning for EC2 instances and container images |
| Amazon GuardDuty | Automatically detects threats in AWS environments | Detecting abnormal login attempts and malicious activity |

We also enabled versioning on all S3 buckets and configured AWS WAF with Managed Rule Groups, IP restrictions, and Rate Limiting.

### November 13, 2024 – Pre-audit with Drata

Before the formal audit, we reviewed the following with Drata:
- Whether monitoring tab coverage was approaching 100%
- Whether key vendors were properly defined
- Whether architecture diagrams were adequate

This pre-audit allowed us to reduce unnecessary rework and proactively address issues before the main audit.

### November 29, 2024 – Kickoff Meeting with AssuranceLab

<!-- TODO: replace with actual image — AssuranceLab audit partner organization -->

**AssuranceLab** is a trusted audit firm that has conducted security certification audits for over 800 technology companies across more than 30 countries. Beyond SOC 2, they support ISO 27001, ISO 42001, CSA STAR, HIPAA, and more, with deep familiarity with AWS-based cloud infrastructure.

### November 29 – December 18, 2024 – SOC 2 Type I Audit

<!-- TODO: replace with actual image — Google Sheet tracking Type I audit progress -->

AssuranceLab diagnosed blux's current security control status and detailed areas needing improvement. We communicated in real-time through Google Sheets, tracking requirement items, inquiries, and evidence submission status. For example, we submitted GitHub Actions and ArgoCD implementations as evidence for CI/CD environment controls.

### December 18, 2024 – SOC 2 Type I Report Issued

<!-- TODO: replace with actual image — SOC 2 Type I certification report -->

After approximately four months of preparation, we successfully passed the Type I certification. The Type I report evaluates whether security controls are properly designed.

### December 19, 2024 – March 19, 2025 – SOC 2 Type II Audit

The Type II audit uses the same control items as Type I, but evaluates whether those controls have been operating effectively for at least three months. We reviewed incident response scenarios, business continuity, and disaster recovery tests, addressing any gaps we found.

### March 21, 2025 – SOC 2 Type II Report Issued

<!-- TODO: replace with actual image — SOC 2 Type II certification badge -->

After a seven-month journey, we successfully passed the SOC 2 Type II certification and earned a badge that we can use as a marketing asset on our website and proposals.

## Insights from the SOC 2 Preparation Process

### Collaborating with Global Audit Firms: Diligence and Proactivity

SOC 2 certification is a marathon. While scheduling delays with external parties are inevitable, it's critical to maintain the mindset of "always meeting internal deadlines." Staying diligent and responsive on the things within your control is what keeps the entire process on track.

<!-- TODO: replace with actual image — Drata remote access for real-time problem resolution -->

We also provided detailed descriptions when requesting help from Drata's support team. When issues were difficult to resolve, they proactively offered solutions like enabling remote access for real-time troubleshooting. Going beyond basic task handling — showing genuine initiative — is the key to gaining cooperation from external partners.

### Never Compromise on Quality

It's tempting to think "let's just pass the certification," but through our SOC 2 preparation, blux confirmed that genuinely improving security posture ultimately brings greater benefits.

<!-- TODO: replace with actual image — Rising cyber attack trends -->

In a world where cyber threats are rapidly increasing globally, superficial security measures are no longer enough. We didn't just apply security measures to meet the minimum criteria — we continuously sought the best ways to actually reduce security threats.

For example, basic WAF settings would have been sufficient for the external threat response requirements, but for real protection, we conducted various experiments and analyses to design and implement WAF policies optimized for blux's environment. We were convinced that "a security architecture based on best practices will become the core asset protecting our product and organization."

<!-- TODO: replace with actual image — AWS FTR certification badge -->

For companies attempting SOC 2 for the first time, we recommend starting with AWS FTR (Foundational Technical Review). blux obtained AWS FTR in April 2024, and the experience of establishing AWS best-practice security measures made our SOC 2 preparation significantly smoother.

## Beyond SOC 2: blux's Continuing Security Story

blux isn't stopping at SOC 2 — our next goal is to continuously strengthen our actual security posture.

First, we plan to sequentially address security improvement tasks that were deferred based on priority during the certification process. We'll proactively remediate items discovered by Amazon Inspector that had low severity scores, optimize incident response procedures, and strengthen our overall security processes.

Additionally, blux plans to pursue **ISO 27001** (International Information Security Management System Standard). While SOC 2 primarily focuses on verifying security control levels for B2B SaaS and cloud service companies, ISO 27001 provides a systematic management framework for identifying, assessing, and continuously improving information security risks regardless of industry or organization type.

After completing ISO 27001, we also plan to pursue **ISMS-P** (Information Security and Personal Information Protection Management System Certification). ISMS-P is a nationally accredited certification managed by the Korea Internet & Security Agency (KISA), officially certifying that a company safely protects customer personal information. It integrates information security (ISMS) and personal information protection (PIMS) standards, and has become an essential requirement for SaaS companies serving customers in finance, healthcare, and the public sector.

Through these two additional security standards, blux aims to build the foundation for expanding into strictly regulated industries and to continuously grow as a SaaS company with world-class security capabilities trusted by both domestic and international customers.

---

**Author: Shawn Min — Information Security and DevOps Lead at blux**

"I believe great services cannot exist without a high level of security and robust infrastructure. I constantly strive to build products that customers can trust and rely on."
