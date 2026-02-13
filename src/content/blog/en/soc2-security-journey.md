---
title: "blux's SOC 2 Security Journey and the Record We Left Behind"
description: "Not sure where to start with SOC 2 preparation? Here are real-world insights from blux's experience that you won't find through a simple search."
pubDate: 2025-03-31
heroImage: ../../../assets/soc2-security-journey-hero.png
heroImageCaption: "Thumbnail image"
tags: ["Security", "DevOps", "Compliance", "SOC 2", "SaaS"]
---

> **Originally published** on the [blux Tech Blog](https://blog.blux.ai/%EB%B8%94%EB%9F%AD%EC%8A%A4%EC%9D%98-soc-2-%EB%B3%B4%EC%95%88-%EC%97%AC%EC%A0%95%EA%B3%BC-%EC%9A%B0%EB%A6%AC%EA%B0%80-%EB%82%A8%EA%B8%B4-%EA%B8%B0%EB%A1%9D-49217). Republished here on the author's personal blog.

For B2B SaaS companies, security certification is no longer a choice — it's practically a requirement. Especially during meetings with enterprise customers, questions about security often come before questions about product features or performance.

blux also realized the importance of security during sales meetings, and began exploring 'Service Organization Control 2 (SOC 2),' one of the major international security certifications, to address this.

We started preparations in earnest in the second half of last year. At first, we thought it would be a simple process — just submit a few documents and we'd be done. However, once we actually began, we encountered far more obstacles than expected: requirements that couldn't be found through searches alone, criteria open to interpretation, and varying levels of security awareness within the team.

Many SaaS companies are likely facing similar challenges in comparable situations. In this article, we'll address common misconceptions that arise during security standard certification processes — with a focus on SOC 2 — and candidly share blux's journey to passing SOC 2 certification along with the insights we gained along the way.

---

## Common Misconceptions About Security Standard Certification

Many companies fall into several misconceptions when preparing for security standard audits. Typically, these misconceptions hinder a proper understanding of the actual security certification process.

Here are the most common misconceptions:

> **1. You can pass the security certification with just one month of preparation.**
>
> **2. You can outsource the entire certification process to an external vendor.**
>
> **3. Once you pass the certification, it's valid forever.**
>
> **4. You need a large security team to pass the certification.**
>
> **5. You must hire a security specialist to pass the certification.**

Looking back now, most of the anxiety and concerns we had at the time were rooted in baseless misconceptions. But when we first started preparing for the security standard audit, we couldn't help but get caught up in doubt before we even began, faced with all this misinformation.

At blux, we corrected these misconceptions one by one during our preparation, turning the SOC 2 certification process into an opportunity to fundamentally review and improve our security posture — not just check a box.

Various misconceptions about security standard certification still persist. Given that many SaaS companies go through similar trial and error, we believe our experience can serve as practical reference material beyond just a personal struggle story.

---

## What Is SOC 2, and Why Does It Matter?

'SOC 2' is one of the Service Organization Controls (System and Organization Controls) reports established by the American Institute of Certified Public Accountants (AICPA). It is specifically a voluntary compliance standard for evaluating data security and privacy compliance of cloud service providers and service organizations that process data.

For today's B2B SaaS companies, SOC 2 is no longer a simple choice but has become **the de facto required security standard for entering the US and global markets**. This is because enterprise customers frequently require SOC 2 as a benchmark to objectively verify whether a service they're adopting has a trustworthy level of customer data protection.

In particular, cloud-based service providers and companies that process customer data can demonstrate their security posture through SOC 2 and build trust with large enterprises and overseas customers.

![SOC 2 security standard](../../../assets/soc2-security-journey-1.png)
*SOC 2 Has Become the De Facto Required Security Standard for Entering the US and Global Markets (Source: AICPA)*

### The 5 Trust Service Criteria of SOC 2

SOC 2 evaluates an organization's security and data protection through the following five Trust Services Criteria (TSC):

> **1. Security** – System protection, access control, security incident response
>
> **2. Availability** – Service performance, monitoring, disaster recovery
>
> **3. Processing Integrity** – Data processing accuracy and error management
>
> **4. Confidentiality** – Sensitive information protection, data access restrictions, encryption
>
> **5. Privacy** – Personal data collection, retention, disposal, and policy compliance

Among these, 'Security' is mandatory, while the rest are optionally applied based on the organization's needs. blux selected 'Security,' 'Availability,' and 'Confidentiality' for this certification.

### SOC 2 Report Types

SOC 2 verification is based on 3–12 months of actual operational data and is divided into two types: Type I and Type II.

| | SOC 2 Type I | SOC 2 Type II |
|---|---|---|
| **Evaluation Criteria** | Assesses the design adequacy of security controls at a **specific point in time (Point-in-time)** | Evaluates the operational effectiveness of security controls over a **defined period (3–12 months)** |
| **Key Question** | Are the security controls properly designed? | Are the security controls actually operating effectively? |
| **Customer Trust Level** | Limited (design only) | High (operational effectiveness) |
| **Use Cases** | Internal process review, initial trust building | Service reliability assurance for enterprise and global customers |

When people say "passed SOC 2," they typically mean "passed SOC 2 Type II." SOC 2 Type II is the standard that proves an organization continuously maintains its security controls, and is the core standard required by large enterprises and overseas customers.

As such, SOC 2 serves to demonstrate that an organization has appropriate internal controls in place across data security, availability, confidentiality, and privacy. This guarantees the reliability of services to customers and acts as an important factor in business partnerships and contract negotiations.

---

## Why B2B SaaS Companies Need SOC 2

For B2B SaaS companies, passing security standard certification is no longer something that's 'nice to have' — it's becoming a **'must-have'** without which you can't even get a foot in the door. SOC 2, in particular, serves as a critical foundation for building trust in the global market and growing business with large enterprises. From this perspective, I've organized the reasons why B2B SaaS companies need SOC 2 into the following three points.

### Building Customer Trust and Entering Global Markets

Many enterprise customers — especially large corporations and global companies — require SOC 2 or equivalent security certifications as a prerequisite for adopting SaaS products.

As confirmed in a LinkedIn post by Seungho Choi, Head of Business at Rtzr (ReturnZero), "there are real cases where companies are eliminated during the evaluation stage simply because they haven't passed any security standard."

blux also experienced, early in our security standard audit preparation, that passing SOC 2 or equivalent security certifications was requested as a precondition for enterprise partnerships. This clearly demonstrates that passing a security standard certification is not just an internal achievement — it plays a crucial role in building trust with external customers.

<!-- TODO: replace with actual image — LinkedIn post about security certifications as B2B SaaS prerequisite -->

### A Key Driver for Business Growth

SOC 2 goes beyond simply proving security — it becomes a powerful tool for **accelerating the sales process** and **gaining a competitive edge**.

Enterprise customers always go through a security review process when adopting new solutions. SOC 2 serves as strong evidence in itself that a company is verified and trustworthy. In particular, whether a company has passed security standard certification has become such an important factor that it can determine whether a contract is actually signed.

In the fiercely competitive B2B SaaS market, SOC 2 enables differentiation in security posture while shortening the time to build trust with customers.

### Strengthening Actual Security Posture

Along with this, the SOC 2 preparation process becomes a catalyst for **meaningfully elevating the entire organization's security posture**.

This is because it doesn't stop at simply preparing for an external audit — internally, it extends to establishing security policies, building risk assessment frameworks, and implementing technical measures within cloud infrastructure. The fruits of these efforts go beyond short-term security certification and extend to laying the foundation for a sustainable security operations program.

In this way, for B2B SaaS companies, SOC 2 **carries significance far beyond simply 'passing a security certification' — it can be seen as a strategic tool for simultaneously achieving the three pillars of trust, growth, and security enhancement**.

---

## blux's SOC 2 Certification Journey

We began preparing for SOC 2 in earnest from August 2024 and completed everything through Type I and Type II by March 2025. We've compiled this approximately seven-month security journey in hopes of providing even a little help to companies preparing for SOC 2. We've documented what happened and what decisions were made along the timeline, as detailed and fact-based as possible.

### August 2024 – Selecting a Compliance SaaS Platform

The very first task we undertook for SOC 2 was **selecting a compliance (the practice of adhering to relevant laws and regulations) SaaS tool** that would effectively support us.

Since our human resources were limited for manually handling security management and audit response, we determined that adopting a SaaS tool would be a great help in running efficient and systematic compliance operations.

We held meetings with a total of three vendors and compared them using the following criteria:

> **1. Startup-friendliness:** Availability of real-time support channels like Slack Connect
>
> **2. Onboarding speed:** Overall timeline proposed by the vendor, customer responsiveness
>
> **3. Cost-effectiveness:** Whether the pricing structure allows sustainable operation within budget

Through this process, we found that the global vendor **'Drata'** stood out particularly in its level of automation, UI/UX, and real-time communication environment with expert consultants, and we ultimately selected them.

### August 29, 2024 – Kickoff Meeting with Drata

<!-- TODO: replace with actual image — Drata GRC platform logo/interface -->

Drata is a GRC (Governance, Risk, Compliance — a framework for integrated management of organizational governance, risk, and regulatory compliance) platform designed by security and compliance experts. It supports companies in running audit-ready security organizations through AI-powered automation.

Drata's key capabilities can be summarized in three areas:

- Compliance automation: Up to 90% automation of security framework tasks like SOC 2 and ISO 27001 using AI
- GRC management: Risk assessment and automated audit response
- Security verification: Real-time monitoring and automated evidence collection

In practice, as we prepared for SOC 2 certification using the Drata platform, we found that many aspects were conveniently **automated**. We also appreciated that **real-time monitoring** could be configured to send alerts to the company's Slack channel when anomalies were detected, enabling rapid response when issues arose.

### September – October 2024 – Executing Security Requirements

During this period, blux performed various tasks based on SOC 2 requirements, including establishing security policies, applying technical controls, and reviewing and improving internal security posture. Here's a summary of the specific tasks we performed.

#### Connecting Business Services

<!-- TODO: replace with actual image — blux's connected services to Drata platform -->

First, we **connected various business collaboration services we use — including Slack, Google Workspace, AWS, MongoDB Atlas, and GitHub — to Drata**. Afterward, we were able to leverage automation capabilities through Drata's monitoring tab.

For example, we could automatically verify through Drata's monitoring tab whether MFA (Multi-factor Authentication — a method that enhances security by requiring two or more different authentication factors during user verification) was properly configured for all AWS users.

#### Device Security Verification

<!-- TODO: replace with actual image — Drata agent device security verification -->

Second, we installed the Drata agent on each team member's device (computer) and reviewed their security environment. The Drata agent is a program that automatically verifies whether each team member's device has (1) a password manager installed, (2) hard disk encryption enabled, (3) antivirus software installed, (4) automatic updates configured, and (5) a screen saver set up.

Using this, we could **track and monitor in real-time whether each team member's device was properly protected**. We configured Slack channel alerts for cases where a team member's device protection was inadequate, enabling quick remediation.

#### Writing Security Policies

<!-- TODO: replace with actual image — blux's security policies list -->

Third, we **wrote and organized essential security policies**. Security policies include the 'Asset Management Policy' defining management standards and responsibilities for organizational assets (devices, software, etc.), the 'Backup Policy' specifying backup procedures and recovery criteria in case of incidents, and the 'Business Continuity Plan' containing plans for maintaining business continuity during emergencies such as outages and disasters.

Depending on which of the five Trust Service Criteria introduced earlier you select, the policies you must prepare will differ. We selected three Trust Service Criteria — 'Security,' 'Availability,' and 'Confidentiality' — and organized a total of approximately 23 policies.

#### Risk Assessment and Mitigation

Fourth, we **performed the task of assessing various risks and their corresponding mitigation strategies**. Here, risks refer to all situations that could potentially (or immediately) threaten the company, and we needed to enumerate these various risks and evaluate mitigation strategies for each.

Risks come in many forms. There could be a situation where a fire at the company causes asset loss, or situations where critical information like passwords is stolen by malicious actors can also be treated as risks. In this manner, we assessed a total of approximately 60 risks across various categories along with their corresponding mitigation strategies.

#### Leveraging AWS Security Services

| Service | Description | blux's Use Case |
|---|---|---|
| AWS CloudTrail | An audit service that provides records of user activity and API calls within AWS accounts | - Tracking who did what, when within AWS accounts<br/>- Analyzing historical records to identify root causes during security incidents |
| Amazon Inspector | A security assessment service that automatically analyzes vulnerabilities and misconfigurations in AWS environments | - Automated vulnerability scanning and remediation for EC2 instances and container images |
| Amazon GuardDuty | A security monitoring service that automatically detects threats in AWS environments | - Detecting abnormal login attempts and malicious activity<br/>- Identifying suspicious access to EKS clusters, S3 buckets, etc. |

Next, we performed various measures related to cloud security. In addition to leveraging AWS's representative security services — AWS CloudTrail, Amazon Inspector, Amazon GuardDuty, and AWS WAF — we enabled versioning (the practice of assigning version numbers to track and manage the change history of systems or files) on all S3 buckets for backup purposes.

We also worked hard to protect blux's various web applications through **AWS WAF (Web Application Firewall, hereafter WAF)**. WAF is a firewall service that protects web applications from malicious traffic and security threats, capable of protecting ALB, API Gateway, CloudFront, and more.

Among WAF's various features, blux actively utilizes AWS Managed Rule Groups, specific IP restrictions, and Rate Limiting capabilities. AWS Managed Rule Groups are collections of rules provided by AWS by default to protect applications from various common threats, including Core Rule Set, Known Bad Inputs, Anonymous IP List, and others.

For the Rate Limiting feature, we use the rule that 'if requests exceed a certain level within a given time period, they are blocked' to protect applications from excessive and malicious requests.

### November 13, 2024 – Pre-audit with Drata

After completing most essential security-related measures by October, we **conducted a pre-audit with Drata before officially entering the audit period**. The pre-audit is a stage where all items are internally reviewed to ensure everything is prepared just before the actual audit.

At this point, we verified whether the Drata platform's monitoring tab coverage was approaching 100%, whether key vendors (external suppliers or sellers who provide products or services) were properly defined, and whether architecture diagrams (visual representations showing system components and their relationships) were well-prepared.

Through this pre-audit, we were able to reduce unnecessary rework and proactively address multiple items during the subsequent main audit with the audit firm.

### November 29, 2024 – Kickoff Meeting with AssuranceLab

<!-- TODO: replace with actual image — AssuranceLab audit partner organization -->

**'AssuranceLab,'** introduced to us as a partner audit firm by Drata, is a trusted audit partner that has conducted security certification audits for over 800 technology companies across more than 30 countries.

Beyond SOC 2, they support audits for various international security standards including ISO 27001, ISO 42001, CSA STAR, and HIPAA, with deep familiarity with AWS-based cloud infrastructure environments. Notably, having a team in Australia meant our time zones aligned well, making communication remarkably smooth.

### November 29 – December 18, 2024 – SOC 2 Type I Audit

<!-- TODO: replace with actual image — Google Sheet tracking Type I audit progress -->

After initiating the audit, AssuranceLab **diagnosed blux's current security control status and provided detailed explanations of areas needing improvement**. We didn't realize this until we actually began the formal audit, but international security standards like SOC 2 are not simply one-time pass/fail evaluations. We were impressed that the audit firm worked alongside us to help meet the criteria and provided specific improvement directions.

We were able to communicate and verify in real-time through a Google Sheet provided by AssuranceLab, tracking requirement items, inquiry contents, and evidence submission status for each item. With all mandatory items managed in a single sheet, we could communicate with the audit firm clearly and efficiently.

### December 18, 2024 – SOC 2 Type I Report Issued

<!-- TODO: replace with actual image — SOC 2 Type I certification report -->

After approximately four months of preparation, we **successfully passed the Type I certification**.

The SOC 2 Type I report evaluates whether security controls have been properly designed. Following the issuance of this report, we immediately began the Type II audit.

### December 19, 2024 – March 19, 2025 – SOC 2 Type II Audit

The Type II audit uses the same control items as Type I, but evaluates whether those **controls have been actually operating effectively for at least three months**.

During this period, we reviewed and addressed gaps in various response procedures and tests, including incident response (organizational procedures and activities for detecting, responding to, and recovering from security incidents) scenarios and business continuity and disaster recovery tests (BC/DR tests — tests that simulate system failures or disaster scenarios to verify that business continuity and recovery procedures work properly).

This process went beyond simply preparing documents — it became **an opportunity to review the organization's actual security protocols and culture, and to elevate the overall security posture**.

### March 21, 2025 – SOC 2 Type II Report Issued

<!-- TODO: replace with actual image — SOC 2 Type II certification badge -->

Upon successfully passing the SOC 2 Type II certification, a report is issued along with a badge that can be used as a marketing asset across various channels including websites and proposals.

blux completed the entire process, safely passing through to Type II certification after a roughly seven-month SOC 2 security journey.

---

## Insights from the SOC 2 Preparation Process

While preparing for the SOC 2 audit, blux gained many insights not only in security process improvement but also in work practices, attitudes toward security, and communication approaches. Among these, we derived two key lessons.

### Collaborating with Global Audit Firms and External Stakeholders: Diligence and Proactivity

SOC 2 requires collaboration with various external stakeholders including global audit firms, security consulting companies, and AWS. From my experience of continuously communicating directly with multiple external stakeholders, I felt that this process was **a marathon, not a sprint**.

Scheduling delays are somewhat unavoidable in a process involving extensive communications. What matters is how much you can minimize those delays. I approached this with the mindset of letting go of things I couldn't control, like external stakeholders' schedules, and **at minimum, always meeting internal deadlines**.

In other words, even when delays occurred, staying diligent and responsive on the parts I was responsible for was the key to keeping the overall process on track.

Additionally, not glossing over even seemingly trivial questions and proactively asking about and confirming ambiguous points helped build trust with stakeholders.

<!-- TODO: replace with actual image — Drata remote access for real-time problem resolution -->

Particularly with Drata usage, whenever large or small issues arose, we requested help by describing our situation to the support team in as much detail as possible, and throughout the entire journey, they responded very quickly and thoroughly.

When issues were difficult to resolve immediately, they proactively offered solutions like enabling remote access for real-time troubleshooting. Going through this process, we realized that **proactivity beyond basic task handling is the key to gaining cooperation** from external partners.

### Never Compromise on Quality

When preparing for SOC 2, it's natural to be tempted to think 'let's just pass the certification.' However, through our SOC 2 process, blux reconfirmed that genuinely improving security posture ultimately brings greater benefits.

<!-- TODO: replace with actual image — Rising cyber attack trends -->

Cyber threats, in particular, have been rapidly increasing worldwide in recent years.

In an environment where cyber threats targeting enterprises are continuously growing, superficial security measures are no longer sufficient. We didn't just apply security measures to meet the minimum criteria — we continuously sought the best ways to actually reduce security threats.

For the audit item checking response to external threats, simply applying WAF with default settings would have been sufficient, but for real protection, we conducted various experiments and analyses to design and implement WAF policies optimized for blux's service environment.

While this may increase workload in the short term, we were long-term convinced that **a security architecture based on best practices would become the core asset protecting our product and organization**.

<!-- TODO: replace with actual image — AWS FTR certification badge -->

Performing these tasks without compromising on quality can be a considerable burden for companies attempting global security standard certifications like SOC 2 for the first time. For such companies, we recommend starting with AWS FTR before embarking on full-scale global security certification.

**AWS FTR (Foundational Technical Review)** is a process that reviews whether a service is being operated securely according to AWS's security and architecture best practices. blux obtained it in April 2024, prior to embarking on the SOC 2 journey.

FTR is one of the standards for operating cloud-based services provided by AWS more securely, and since blux already had the experience of establishing security measures based on AWS best practices through this, our SOC 2 preparation process was significantly smoother.

SOC 2 is not merely a security standard certification — it is **a process of substantively strengthening your security operations system**.

Active communication with various stakeholders was a key element in making the security standard certification process run smoothly. Moreover, we were able to experience firsthand through this process that strengthening security quality leads to securing long-term corporate competitiveness.

Building on the experience gained from preparing for FTR and SOC 2, we plan to continue steadily elevating our security posture and moving in the direction of strengthening practical protective measures.

---

## Beyond SOC 2: blux's Continuing Security Story

blux isn't stopping at SOC 2 — our next goal is to **continuously strengthen our actual security posture**.

First, we plan to sequentially address security improvement tasks that were deferred to the backlog based on priority during the certification process. For example, we'll proactively remediate items discovered by Amazon Inspector that had relatively low severity scores and weren't immediately addressed at the time, and internally, we'll optimize incident response procedures and strengthen our overall security processes.

Additionally, blux plans to soon take on the challenge of **'ISO 27001,' the International Information Security Management System (ISMS) standard**. While SOC 2 primarily focuses on verifying security control levels for B2B SaaS and cloud service provider companies, ISO 27001 provides a systematic management framework for identifying, assessing, and continuously improving information security risks regardless of industry or organization type.

After completing ISO 27001, we also plan to take on the domestic information security certification ISMS-P. **ISMS-P (Information Security and Personal Information Protection Management System Certification) is a nationally accredited certification managed by the Korea Internet & Security Agency (KISA)**, officially certifying that a company safely protects customer personal information.

It integrates information security (ISMS) and personal information protection (PIMS) standards, and has become an essential requirement particularly for SaaS companies serving customers in finance, healthcare, and the public sector.

Through these two additional security standards, blux aims to build the foundation for expanding into strictly regulated industries and to continuously grow as a SaaS company with world-class security capabilities trusted by both domestic and international customers.

We sincerely hope that this article can provide at least some practical insights and direction to the many companies struggling to prepare for security standard audits like SOC 2 with limited resources.

---

**Author**

**Shawn Min — Information Security and DevOps Lead at blux**

I believe great services cannot exist without a high level of security and robust infrastructure. I constantly strive to build products that customers can trust and rely on.
