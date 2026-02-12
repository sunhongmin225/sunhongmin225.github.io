---
title: "Perfectly Managing Our Company's Infrastructure Code with AI"
description: "A journey of reviving neglected infrastructure code with Claude Code — from resolving IaC Drift to establishing team conventions"
pubDate: 2026-02-10
tags: ["Infrastructure as Code", "Claude Code", "AWS", "Pulumi", "DevOps"]
---

> **Originally published** on the [DelightRoom Tech Blog](https://medium.com/delightroom/ai%EB%A1%9C-%EC%9A%B0%EB%A6%AC-%ED%9A%8C%EC%82%AC-%EC%9D%B8%ED%94%84%EB%9D%BC-%EC%BD%94%EB%93%9C-%EC%99%84%EB%B2%BD-%EA%B4%80%EB%A6%AC%ED%95%98%EA%B8%B0-c9f5cb7f2ef6). Republished here on the author's personal blog.

<!-- TODO: replace with actual image — hero image (generated with Google Gemini 3 Pro) -->

I work as an SRE in DelightRoom's Foundation group. The Foundation group is responsible for the infrastructure, data pipelines, and frontend foundations that support all of DelightRoom's products. We use **Pulumi** to manage our infrastructure as code. Among various IaC tools like Terraform and Ansible, we chose Pulumi because it lets us define infrastructure using general-purpose programming languages like TypeScript and Python.

<!-- TODO: replace with actual image — Pulumi logo -->

One of my key responsibilities is maintaining and improving a stable infrastructure environment. To do this effectively, it's crucial to understand how our current infrastructure is defined in code. One day, I ran `pulumi preview` to assess the state of our infrastructure code. This command compares the current code against actual cloud resources and shows what changes would occur if applied. I expected to see a message saying there were no updates needed, but instead the terminal was flooded with dozens of changes and warning messages.

```
+ aws:s3:Bucket ........... create
- aws:lambda:Function ..... delete
~ aws:ec2:SecurityGroup ... update
...
```

Resources either existed in code but not in AWS, or had different configuration values — this was **Drift**. Drift refers to a state where code and actual resources are out of sync, sometimes described as "broken IaC."

Nobody knew exactly when or why this drift had started. It was the accumulated result of quick console fixes and changes made without code updates over a long period of time.

Discovering this drift raised two concerns.

The first was **stability**. `pulumi up` applies the code-defined state to the actual cloud. Running it carelessly could delete or modify production resources, potentially causing service outages.

The second was **technical debt**. Left as-is, the infrastructure code could no longer serve as a blueprint. Since the code couldn't be trusted, people would work directly in the AWS console, and since console changes don't get recorded in code, drift would only grow — a vicious cycle.

But manually verifying dozens of drifts one by one, fixing the code, and re-validating seemed like it could take weeks.

After careful deliberation, I decided to tackle the problem head-on with three clear principles:

1. **Protect the production environment**: Never affect actual resources.
2. **Synchronize code and resources**: Make the code accurately reflect the current infrastructure state.
3. **Achieve zero preview changes**: The goal is `pulumi preview` showing no changes at all.

However, the repetitive work of analyzing each drift, taking appropriate action, and re-validating had clear limits in terms of time and focus. To solve this problem efficiently, I decided to leverage an AI Agent, and among several options, I chose Claude Code — a tool specialized for code-related work. In this post, I'll share the small insights gained during adoption and the improved results.

## The Core Value of IaC: The Trinity of Code, State, and Resources

The fundamental value of IaC isn't simply "creating infrastructure with scripts." The core is the promise of treating infrastructure like code. When everyone agrees to manage infrastructure as code, you can track change history through version control and prevent mistakes through code reviews. You can also reproduce identical environments at any time using the same code — and I believe this is the true value IaC provides.

For this value to be maintained, the following three elements must always be in sync:

<!-- TODO: replace with actual image — Code-State-Resource relationship diagram (generated with Google Gemini 3 Pro) -->

- **Code**: Defines the intended state of infrastructure.
- **State**: A snapshot of the current infrastructure managed by Pulumi.
- **Resources**: The actual infrastructure existing in the cloud.

The important point here is that code cannot directly affect resources. In the diagram above, only a dotted arrow exists between code and resources, meaning code must go through state before it can be reflected in resources.

When a developer defines the intended infrastructure state in code, Pulumi first compares it with the state file (Synchronize/Compare) to calculate what changes are needed. And because state is linked to resources (Link/Reflect), actual infrastructure changes become possible.

Because of this architecture, state serves as an essential bridge between code and resources. If state doesn't accurately reflect the current state of resources, no matter how well you write code, it won't behave as intended.

That's why operations like `pulumi refresh` (to reflect current resource state in the state file), `pulumi import` (to add existing resources to state), and `pulumi state delete` (to remove specific resources from state) are necessary.

When all three elements are aligned, code truly serves as a "blueprint." You can understand the current infrastructure state by reading the code, and modifying the code changes resources as intended. But when drift occurs, this balance breaks. If someone directly modifies a resource in the console, state and resources diverge. If state is manipulated without code changes, code and state diverge.

When these connections break, reading the code no longer tells you the actual infrastructure state, and running `pulumi up` carelessly could cause unintended changes. Ultimately, code can no longer function as a trustworthy document.

## Why This Problem Was Left Unresolved

So why was this problem left unresolved for so long? Drift is simple to fix the moment you discover it, but as time passes and the volume of drift grows, the situation becomes increasingly complex.

First, **root cause analysis** is extremely tedious. Even though you can track change records using services like CloudTrail when resources are modified in the AWS console, it's not as easy to scan history as with code and commits in GitHub. Each verification takes considerable time. And without understanding the intent behind changes, it's hard to judge how to fix the code.

Second, **the risk of forced synchronization** is significant. Force-applying the current code state to resources with `pulumi up` could delete or change production resources. For a service used by tens of millions of users monthly, that risk is unacceptable.

Third, **the burden of manual recovery** is heavy. Analyzing each drift, determining the appropriate action, modifying code, and validating — repeating this for dozens of resources while juggling daily responsibilities is simply not realistic.

Our team also fell into the thinking that "if it ain't broke, don't fix it" — the production resources were functioning normally despite the drift. We knew the code and actual resources didn't match, but the service was running fine, so nobody wanted to risk touching it. As this reasoning repeated, drift kept accumulating, and the scope of what needed to be fixed grew ever larger.

## The Core Design Principle: Protecting the Production Environment

There are two main approaches to resolving drift:

1. Change resources to match the code: run `pulumi up`
2. **Modify code to match the resources**: adjust code and state to reflect the current resources

**Source of Truth** means "when multiple data sources exist, which one do we treat as the standard?" I chose the second approach, making the actual resources the source of truth.

Production resources that are currently running prove their validity by the very fact that the service is operating normally. On the other hand, there's no guarantee that what the old code intended is still valid today. Since protecting the production environment is a non-negotiable top priority for a service serving tens of millions of users monthly, all work in this project was conducted under the principle of modifying only code and Pulumi state without changing any actual cloud resources.

## Why We Chose an AI Agent

Drift recovery is essentially a repetitive loop:

1. Check current drift list with `pulumi preview`
2. Analyze each drift type (create/delete/update)
3. Take appropriate action (`import`, `state delete`, code modification)
4. Verify again with `pulumi preview`
5. Repeat from step 1 if changes remain

It looks simple, but performing this manually for dozens of drifts introduces several problems. Repeating similar tasks makes it easy to mistype resource IDs in `import` commands or introduce typos when modifying code.

The constant context-switching between checking actual resource state in the AWS console, running Pulumi commands in the terminal, and modifying code in an editor also reduces efficiency. Additionally, when multiple people handle the same types of drift in their own ways without clear standards, code styles become mixed, and maintaining inconsistent patterns later causes confusion.

This repetitive "check → analyze → fix → verify" loop is exactly the kind of work well-suited for delegation to an AI Agent. However, the risk of entrusting IaC work to AI — potentially causing unintended impact to production resources — clearly exists.

To manage this risk, I reasoned that by clearly defining core principles like production resource protection as rules and carefully controlling the agent to operate only within established boundaries, we could safely leverage the AI Agent's strength of performing repetitive tasks without fatigue at consistent quality.

## Claude Code: Maximizing Agent Effectiveness While Ensuring Safety

<!-- TODO: replace with actual image — Claude Code logo -->

Our team chose **Claude Code** among various AI tools for this work, for the following reasons.

First, Claude Code is specialized for code work. The Claude model itself has strong capabilities in code understanding and generation, and Claude Code builds on this to handle file system exploration, code modification, and terminal command execution in a single workflow. This made it well-suited for our task, where reading and modifying infrastructure code and executing commands are the core operations.

Second, Claude Code provides a terminal-based UI. There's no need to switch to a separate web interface — you can use it directly in the terminal environment where you normally work, allowing it to naturally integrate into existing workflows.

Most importantly, Claude Code allows workflow customization through Rules, Skills, and Agents. This feature lets you explicitly define rules to protect production resources (like "never run `pulumi up`"), and template frequently used commands and procedures to efficiently handle repetitive tasks. The ability to maximize agent effectiveness while ensuring safety was the decisive factor for this project.

## Implementing Drift Recovery with an AI Agent

Here's the final directory structure we configured using Claude Code's Rules, Skills, and Agents:

```
.claude/
├── agents/
│   └── drift-resolver.md
├── rules/
│   ├── pulumi-safety.md
│   ├── code-conventions.md
│   └── drift-resolution.md
└── skills/
    ├── drift-status/SKILL.md
    ├── drift-import/SKILL.md
    ├── drift-remove/SKILL.md
    └── drift-fix/SKILL.md
```

Let me walk through how we configured and used each of these, with excerpts from the actual code.

### Rules: Defining Safety Guardrails

Rules define the constraints the Agent must always follow. We codified the most important principle — "protect production resources" — as Rules to ensure the Agent always complied.

Each Rule file uses `paths` frontmatter to specify which directories the rule applies to. This way, the rule is only loaded when the Agent works on files in relevant paths, using context efficiently.

```yaml
---
paths:
  - "clusters/*/pulumi/**"
  - "external-services/*/pulumi/**"
  - "modules/**"
---
```

We created three rule files for this project: `pulumi-safety.md` to enforce safe command usage, `drift-resolution.md` to define how to handle each drift type, and `code-conventions.md` to maintain consistent code style.

#### pulumi-safety.md

This is the most critical safety rule, defining three principles.

The first is **prohibiting `pulumi up`**. Since `pulumi up` applies code state to the actual cloud, we banned its use in this project and restricted verification to `pulumi preview` only.

The second is **treating actual resources as the Source of Truth**. Rather than changing resources to match code, we modify code to match the current production resource state — reinforcing the principle of not touching the stable production environment.

The third is **stack isolation**. Under the principle that dev and prod environments must never affect each other, we required running `preview` on both stacks after any code change to ensure modifications to one don't cause unintended effects on the other.

```markdown
# Pulumi Safety Rules

## Core Principles

1. **Never run `pulumi up`** - Only `pulumi preview` is allowed
2. **Actual resources are Source of Truth** - Modify code to match resources, not vice versa
3. **Bidirectional stack isolation** - Dev and Prod must never affect each other

| Command | Allowed | Notes |
|---------|---------|-------|
| `pulumi preview` | Yes | Always safe |
| `pulumi import` | Yes | No infrastructure impact |
| `pulumi state delete` | Caution | Verify resource deleted in AWS first |
| `pulumi up` | No | Requires explicit user confirmation |
| `pulumi destroy` | No | Forbidden |
```

#### drift-resolution.md

Next, we defined clear criteria for how to respond to each drift type. This provides guidelines so the Agent handles drift consistently using established strategies rather than making arbitrary decisions.

When `+` appears in `preview` results, it means the resource is defined in code but doesn't exist in AWS. In this case, first verify whether the resource actually exists in AWS, and if so, synchronize state with `pulumi import`.

When `-` appears, the resource exists in AWS but not in code. Verify whether the resource was actually deleted from AWS, and if so, remove it from state with `pulumi state delete`.

When `~` appears, configuration values differ between code and AWS. In this case, treat the current AWS value as the correct one and modify code to match.

```markdown
# Drift Resolution Rules

## Drift Types and Resolution

| Symbol | Type | Resolution |
|--------|------|------------|
| `+` create | Code exists, AWS doesn't | `pulumi import` or remove code |
| `-` delete | AWS exists, code doesn't | `pulumi state delete` or add code |
| `~` update | Values differ | Modify code to match AWS |

## Verification Checklist

- `+ create`: Does resource exist in AWS? If yes, import it
- `- delete`: Is resource deleted from AWS? If yes, remove from state
- `~ update`: Is AWS value correct? If yes, update code to match
```

#### code-conventions.md

Finally, we defined code convention rules to ensure code generated or modified by the Agent maintains consistency with the existing codebase. Stack-specific configuration values use environment-specific config files rather than hardcoding. Variable names follow `camelCase`, constants follow `UPPER_SNAKE_CASE`, and resource naming uses common helper functions from the project.

```typescript
// Stack Configuration
// Use environment-specific config files instead of hardcoding:

// Correct
const config = new pulumi.Config();
const instanceType = config.get("instanceType") || "t3.medium";

// Wrong
const instanceType = pulumi.getStack() === "prod" ? "t3.large" : "t3.medium";
```

```markdown
## Naming

- Use `autoname`, `pfname` from `modules/helper.ts`
- Variables: camelCase
- Constants: UPPER_SNAKE_CASE
```

One additional principle applied across all Rules: when the situation is ambiguous or needs verification, the Agent must always ask the user for confirmation rather than making arbitrary decisions.

Using Claude Code's `AskUserQuestion` tool, when modifying sensitive security settings like security groups or IAM policies, the Agent pauses and seeks the user's judgment. Similarly, when multiple resolution approaches exist or when AWS state differs from expectations, the user confirmation step ensures safety.

### Skills: Templating Repetitive Tasks

Skills define frequently used workflows as templates, helping the Agent perform tasks consistently. Well-designed Skills can guide even complex tasks through step-by-step procedures.

For this project, we created four Skills based on drift types: `drift-status` for analyzing current state, `drift-import` for importing resources, `drift-remove` for removing resources from state, and `drift-fix` for modifying code.

#### drift-status

This Skill serves as the starting point for all work. It runs `pulumi preview` on both dev and prod stacks, analyzes the results, and compiles a summary report of the current drift status.

The report organizes drift types (`+ create`, `- delete`, `~ update`) and corresponding resource lists by stack. It also recommends which Skill to apply for each type. The Agent uses this report to prioritize which drifts to address first and create a work plan.

If TypeScript compilation errors occur during `preview`, it indicates that code errors must be fixed before drift resolution can begin.

```markdown
## Output Format

## Drift Status Report

### Dev Stack

| Type | Count | Resources |
|------|-------|-----------|
| + create | N | resource1, resource2 |
| - delete | N | resource3 |
| ~ update | N | resource4 |

### Recommended Actions

+ create → drift-import skill
- delete → drift-remove skill
~ update → drift-fix skill
```

#### drift-import

This Skill resolves `+ create` drift. When a resource is defined in code but missing from Pulumi state, this workflow imports the actual AWS resource into Pulumi state.

First, use the AWS CLI to verify the resource actually exists in AWS — `aws s3 api head-bucket` for S3 buckets, `aws ec2 describe-instances` for EC2 instances, `aws lambda get-function` for Lambda functions, and so on.

Once existence is confirmed, run `pulumi import`. Since resource types and ID formats differ per resource, the Skill includes examples for common resource types. For instance, S3 buckets use the bucket name as the ID, while EC2 instances use the `i-xxxxxxxxx` format.

After import completes, integrate the auto-generated code into the existing codebase and run `preview` on both stacks to verify synchronization. If `preview` still shows changes after import, use the `drift-fix` Skill for additional code adjustments.

```markdown
## Common Resource Types

| Resource | Pulumi Type | ID Format |
|----------|-------------|-----------|
| S3 Bucket | `aws:s3/bucket:Bucket` | bucket-name |
| EC2 Instance | `aws:ec2/instance:Instance` | i-xxxxxxxxx |
| Security Group | `aws:ec2/securityGroup:SecurityGroup` | sg-xxxxxxxx |
| IAM Role | `aws:iam/role:Role` | role-name |
| Lambda | `aws:lambda/function:Function` | function-name |
```

#### drift-remove

This Skill resolves `- delete` drift. When a resource has already been deleted from AWS, this workflow removes it from Pulumi state to synchronize state with the actual environment.

The most critical step is confirming the resource was actually deleted from AWS before removing it from state. Removing from state without verification could sever the connection to a resource that actually exists, causing bigger problems. A resource is considered deleted only when the AWS CLI returns a 404 response or "not found" error.

Once deletion is confirmed, find the resource's URN using `pulumi stack --show-urns`. URNs follow the format `urn:pulumi:<stack>::<project>::<type>::<name>`. Then remove it from state with `pulumi state delete "<URN>"`.

After removal from state, delete the code that defined the resource and run `preview` on both stacks to confirm cleanup is complete.

```markdown
## Workflow

1. Find URN: `pulumi stack --show-urns | grep "resource-name"`
2. Verify resource is deleted in AWS (CLI should return not found)
3. Remove from state: `pulumi state delete "<urn>"`
4. Remove corresponding code
5. Verify with `pulumi preview` on both stacks
```

#### drift-fix

This Skill resolves `~ update` drift. When configuration values differ between code and AWS, this workflow modifies code to match the current AWS state.

First, use `pulumi preview --diff` to identify exactly which properties differ. Then query the resource's actual settings via AWS CLI to determine what values to apply in code.

Common drift patterns include missing tags (add the AWS-configured tags to code) and differing timeout or memory settings (update code with the current AWS values).

For fields managed by external systems like autoscalers, code modifications may cause recurring drift. In such cases, use the `ignoreChanges` option to have Pulumi ignore changes to those fields. However, this option must only be used for externally managed fields, and the reason must be documented in a comment.

After code modification, run `preview` on both stacks to verify the drift is resolved and no other resources are affected.

```markdown
## Decision Guide

| Scenario | Action |
|----------|--------|
| AWS value is intentional | Update code to match |
| Externally managed field | Use ignoreChanges with comment |
| Unclear which is correct | Escalate to user |
```

The final step of every Skill is the same: after changes, always run `preview` on both dev and prod stacks to verify there are no unintended side effects.

### Agents: Task Separation and Context Management

Agents define autonomous work units with specific purposes. For complex tasks, you can pre-configure which tools and Skills to use, in what order, and when to request user confirmation.

With dozens of drifts to resolve, handling everything in a single session hit context limits. As conversations grew longer, the Agent would lose track of earlier work context or become inconsistent. To address this, we designed a structure with a dedicated drift-resolution Agent that divides work into manageable units.

#### drift-resolver.md

This Agent's goal is clear and simple: analyze and resolve drift until `pulumi preview` shows zero changes. The Agent configuration specifies available tools (Bash, Grep, Read, Edit, Write, etc.) and the four Skills (`drift-status`, `drift-import`, `drift-remove`, `drift-fix`).

The workflow was defined as follows: first, use the `drift-status` Skill to survey current drift. Then create a todo list to track items. Apply the appropriate Skill for each drift type (`+ create` → `drift-import`, `- delete` → `drift-remove`, `~ update` → `drift-fix`), verifying on both stacks after each fix. Repeat until zero changes remain, then generate a final report.

```markdown
## Workflow

1. drift-status skill → Get current drift list
2. Create todo list for tracking
3. For each drift:
   + create → drift-import skill
   - delete → drift-remove skill
   ~ update → drift-fix skill
4. Verify both stacks after each fix
5. Repeat until 0 changes
6. Generate final report
```

We also specified situations where the Agent should stop and ask the user for confirmation: when changes to sensitive resources like security groups or IAM policies are detected, when multiple resolution approaches require a decision, when actual AWS state doesn't match expectations, or when unexpected changes appear in the prod stack.

```markdown
## Escalation Triggers

Stop and ask user when:

- Security group or IAM changes detected
- Multiple valid approaches exist
- AWS state doesn't match expectations
- Prod stack shows unexpected changes
```

Termination conditions were also defined in three categories. When both stacks show zero changes, the task completes as `SUCCESS`. When some drifts are resolved but others need user decisions, it terminates as `PARTIAL` with a report of remaining items. When progress is impossible without user input, it terminates as `BLOCKED` with guidance on what's needed.

```markdown
## Termination

| Status | Condition |
|--------|-----------|
| SUCCESS | Both stacks show 0 changes |
| PARTIAL | Some drifts resolved, others need user decision |
| BLOCKED | Cannot proceed without user input |
```

When multiple drifts existed in the same directory, subagents divided the work. For example, within one directory, Subagent 1 would handle `+ create` drifts while Subagent 2 handled `~ update` drifts.

However, since simultaneously modifying the same code could cause conflicts, subagents were forced to execute sequentially. The next subagent only started after the previous one completed its work and verification.

The main Agent orchestrated the entire process and coordinated between subagents. Even though subagents work independently, they can affect each other. For example, after Subagent 1 resolves drift A, Subagent 2's resolution of drift B might cause drift A to reappear. The main Agent checks the overall state after each subagent completes, detects new or recurring drifts, and issues additional instructions as needed.

## The Actual Work Loop with Claude Code

Based on the Rules, Skills, and Agents defined above, the actual work follows this loop:

<!-- TODO: replace with actual image — Drift resolution workflow flowchart (generated with Google Gemini 3 Pro) -->

### Step 1: Run `pulumi preview`

Use the `drift-status` Skill to check the current state of both dev and prod stacks. This step collects the full drift list and classifies each as `+ create`, `- delete`, or `~ update`.

The `preview` itself may fail due to TypeScript compilation errors, unset environment variables, module dependency issues, and other causes. Since these errors make drift classification impossible, the Agent first resolves these basic errors to get `preview` running normally before starting drift resolution.

Once `preview` runs successfully, the Agent creates a prioritized work list based on the collected information. Typically, independent resources without dependencies are processed first, while complex resources that reference others are handled later.

### Step 2: Analyze Changes

The Agent analyzes the details of each drift. Beyond simple type classification, it examines what role the resource plays, its dependency relationships with other resources, and exactly which values differ between code and actual AWS state. Based on this analysis, it determines which Skill to apply and whether additional verification is needed. For high-impact sensitive resources, user confirmation is requested at this stage.

### Step 3: Type-Specific Actions

Apply the previously defined Skills based on the classified type. `+ create` drift uses `drift-import` to bring AWS resources into Pulumi state, `- delete` drift uses `drift-remove` to clear deleted resources from state, and `~ update` drift uses `drift-fix` to update code to match AWS state.

Each Skill isn't just executing a single command — it includes a complete procedure of checking actual state via AWS CLI, running appropriate Pulumi commands, and cleaning up code. The Agent follows these procedures for each drift and requests user confirmation when encountering unexpected situations.

### Step 4: Verification

After taking action, run `pulumi preview` again to confirm the drift is resolved. Both dev and prod stacks must be verified. Checking only one stack could miss unintended impacts from shared module changes on the other stack. The task is considered complete only when both stacks show the drift resolved and no new drift has appeared. If unexpected changes are detected in either stack, the Agent analyzes the cause and presents it to the user.

### Step 5: Repeat

Repeat steps 1-4 until zero changes remain. In each cycle, the Agent refreshes the remaining drift list and checks for new drift caused by previous fixes. Once all drifts are resolved and both dev and prod stacks show `pulumi preview` reporting no updates needed, a final report is generated and the work concludes.

## No Agent Is Perfect: Growing Pains from Real-World Use

Not everything went smoothly from the start. Unexpected problems emerged when delegating work to the Agent and reviewing results, requiring continuous refinement of Rules and adjustment of work methods.

The most frequent issue was **cross-stack interference**. Initially, I instructed the Agent to resolve dev stack drift first, then prod stack. But after finishing the prod stack, drift would reappear in the already-fixed dev stack. This happened because modifying shared module code affects both stacks simultaneously.

To fix this, I added a rule to `pulumi-safety.md`: "After any code change, always run `preview` on both stacks, and if cross-stack interference is detected, stop immediately and fix it." After that, the Agent consistently verified both sides rather than checking just one stack.

Unexpected behavior patterns also emerged during complex drift resolution. The Agent initially resolved drift normally by modifying code, but at some point began **indiscriminately adding `ignoreChanges`**. While `ignoreChanges` makes drift disappear from `preview`, it doesn't actually solve the problem — it merely hides it.

<!-- TODO: replace with actual image — Agent indiscriminately adding ignoreChanges -->

To prevent this, I added to `code-conventions.md` that `ignoreChanges` should only be used for externally managed fields (e.g., `desiredCapacity` managed by an autoscaler) and must always include a comment documenting the reason. After explicitly adding the statement "ignoreChanges must never be used to hide unresolved drift," the Agent stopped attempting this shortcut.

**Module dependency issues** were another tricky challenge. Since the codebase had been neglected for a long time, installed Pulumi modules were quite outdated, and drift resolution sometimes required updates to newer versions. Updating one module could cause dependency conflicts with others, requiring cascading updates of multiple modules together.

Even more complex cases arose when existing code used modules that didn't yet support the latest AWS features. Since AWS had updated in the meantime and actual resources were already using new features, I had to instruct the Agent to replace the module entirely and rewrite the code. In such situations, having the Agent ask the user for direction rather than making autonomous decisions was critical.

## Eight Weeks of Work in Days: An Overwhelming Productivity Leap

Before starting the project, running `pulumi preview` on the infrastructure repository produced dozens of changes. I remember feeling overwhelmed seeing a mix of `+ create`, `- delete`, and `~ update` results, not knowing where to begin.

<!-- TODO: replace with actual image — Before: preview results showing dozens of drifts (one stack example) -->

After working with Claude Code, I could confirm all stacks showing the message that there were no updates needed. Here's one stack where both dev and prod environments show code and actual resources perfectly synchronized.

<!-- TODO: replace with actual image — After: preview results showing no updates needed (same stack) -->

The Before-After above shows a representative single stack. In practice, this process was repeated across multiple stacks.

The time savings were also significant. Manually resolving dozens of drifts — checking each resource's state, determining the appropriate action, modifying code, and validating — would take an average of 20-30 minutes per resource at a conservative estimate, totaling 6-8 weeks overall. Using the Agent, we compressed this to just a few days.

But the greater significance goes beyond time savings. While we can't pinpoint exactly when drift began, we resolved a problem that had been neglected for at least several months. Moreover, we established conventions to prevent future drift and built a system for rapid resolution when it does occur.

## Establishing a New IaC Convention for the Team

The Rules and Skills created in this project didn't end as individual work — they were documented as shared team assets. The configuration files organized in the `.claude` directory are now managed as part of the infrastructure repository, available to any team member.

<!-- TODO: replace with actual image — internal seminar -->

We also created guides on how to use AI Agents when creating or deleting resources. I held an internal seminar to share this experience and documented simple usage instructions in the repository README, ensuring all team members working with infrastructure could leverage AI Agents following established conventions. This reduced the problem of inconsistent coding styles across individuals, enabling consistent generation of clean, maintainable code.

The Foundation team's response was positive:

> _"I'm so glad we can confidently manage infrastructure as code again. Using the console only for verification and managing all infrastructure through code has made it much easier to revert settings or create backups when needed. This would have taken so much time and felt impossible to tackle before — it really saved us a tremendous amount of time and effort."_

## From Developer to Director: Working in the AI Era

Several lessons emerged from this project.

**IaC Drift costs less the faster you resolve it.** Right after drift occurs, the cause is clear and the impact scope is small, making resolution relatively straightforward. But over time, root cause analysis becomes difficult and complexity grows exponentially as drift intertwines with other changes. Building the habit of resolving even small drift immediately is important.

**AI Agents don't replace everything.** Agents excel at performing repetitive tasks within defined rules, but deciding what those rules should be and how to handle exceptions remains a human responsibility. The key isn't delegating everything to the Agent, but designing how to work together.

**Clear Rules and Skills determine Agent performance and reliability.** We started with simple instructions but continuously refined Rules after encountering unexpected situations like cross-stack interference and `ignoreChanges` abuse. Even when the Agent appears to work correctly, without clear guardrails it can veer off in unintended directions at any time.

Finally, **the developer's role is evolving.** Where writing code — even repetitive code — was previously the developer's primary task, I now find myself serving as a director who reviews AI-generated code and sets direction. Less time goes to typing code directly, and more focus goes to overall design and quality management.

As AI tools continue to advance, I believe the ability to define what to build, evaluate AI output, and steer it in the right direction will become increasingly important. This project was more than just a drift resolution experience — it was a catalyst for rethinking how I approach work itself.

## Beyond Management to Expansion: Infrastructure Operations with AI Agents

This project resolved existing drift, but there's no guarantee new drift won't occur. To prevent this, we plan to add drift detection automation to our CI/CD pipeline.

We'll also build a process that automatically runs `pulumi preview` when code is pushed to specific directories or infrastructure-related PRs are merged, checking for drift.

Periodic `preview` execution will also be necessary, since someone might urgently modify a resource in the console without updating the code.

By combining event-driven and periodic execution, we can detect and address drift early before it accumulates. When drift is detected, a Slack alert will be sent. Looking further ahead, we envision the Agent directly analyzing and resolving drift in the CI stage.

We also plan to further refine the Agent workflow. While the current setup focuses on drift resolution, infrastructure work encompasses many other types. We're envisioning an Agent that automatically applies security best practices when creating resources for new services, an Agent that guides migration procedures when moving resources to different regions or accounts, and an Agent that identifies security vulnerabilities or cost optimization opportunities in current infrastructure settings.

By developing additional Agents with dedicated Rules and Skills for each work type, we plan to expand safe and efficient handling of a broader range of IaC tasks.

IaC Drift is a problem that can occur in any organization, and once it starts accumulating, it becomes increasingly difficult to resolve. Through this project, we resolved months of neglected technical debt and established a management system to prevent the same problem from recurring.

AI Agents aren't a silver bullet, but with clear rules and proper collaboration practices, they can become reliable colleagues. I hope this post serves as a helpful reference for anyone facing similar challenges.
