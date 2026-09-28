---
title: "How to Keep AI Agents from Overstepping Human Permissions"
description: "Anyone can ask, but not for just anything"
pubDate: 2026-09-28
heroImage: ../../../assets/ai-agent-authorization-hero.png
heroImageCaption: "Thumbnail image (Generated using the GPT-6 Astra model)"
tags: ["Security", "AI Agents", "MCP", "Access Control", "Secrets Management"]
---

> **Originally published** on the [DelightRoom Product Blog](https://delightroom.com/blog/321146). Republished here on the author's personal blog.

I'm Dan (Sunhong Min), an SRE (Site Reliability Engineer) in the Foundation group at DelightRoom. The Foundation group is the team responsible for the areas that underpin every DelightRoom product, such as infrastructure and data pipelines. Recently, we have also taken on building the shared foundation for the AI agents used across the company.

At DelightRoom, anyone can give an AI agent a task from an internal Slack channel. An AI agent is a program that, when a person asks for something in plain language, picks the tools it needs on its own and runs them. For example, if you write "Show me Alarmy's recent DAU trend" in a Slack channel, the agent queries the daily active users (DAU) from the database and answers.

Agents that handle deployments, agents that operate infrastructure, and agents integrated with external services are used this way across multiple teams. You don't have to be a developer: anyone who can post in Slack can use them, and it's convenient because you no longer need to ask the data team or the infrastructure owner separately.

**The problem was that the agents never checked whether the person was allowed to ask for that task.**

So, in theory, anyone could use an agent to do things beyond their own permissions. Requests to change the configuration of a service managed by another team, or to query data they had no permission to view, were not filtered out either. Nowhere in the code was there a step that checked "does the person who made this request have permission to do this?"

This post starts with how we came to recognize this problem and then looks at where, and by what criteria, we decided to control the agents' permissions. After that, it walks through, in order, the architecture we built to implement those criteria and how we reclaimed the keys left on the agent side so that the architecture could not be bypassed.

## What Is the Problem with AI Agents That Have More Permissions Than People?

DelightRoom's AI agents were not planned and built by any single team. Over the course of this year, each team built the agents it needed, one by one, and connected them to Slack. That is how an agent that helps with deployments, an agent that checks and remediates infrastructure status, and an agent that pulls data from external services came to be, but there was no list that showed at a glance what permissions each agent had.

So the very first thing we did when we started looking into this problem was a full inventory of the agents. A new agent appeared even while the inventory was under way, and there were agents whose existence we learned of for the first time during the inventory. It turned out that five or six agents had been built separately by different teams and were running. The problem was not so much the number of agents as the structure they all shared.

![The path a Slack request takes. A person writes in Slack, and the agent calls the integrated services with the keys stored on its own machine](../../../assets/ai-agent-authorization-1.png)
*Figure 1: The path a Slack request takes. A person writes in Slack, and the agent calls the integrated services with the keys stored on its own machine (Generated using the GPT-6 Astra model)*

If you have used a tool like Claude Code in the terminal, you know the scene: before running a dangerous command, such as deleting files or deploying, the tool pauses, asks the person "Do you want to run this command?", and only moves on once the person approves.

But Slack is a place for exchanging messages, not a terminal, and no one can sit beside the bot approving every step, so Slack bots don't have this screen.

As a result, every internal agent was being operated with this confirmation step turned off, executing whatever it was told right away. Typically, the keys an agent uses to actually call services are stored on the computer the agent runs on. In this post I'll call that computer the "agent machine." These keys had permissions to do a great deal, writes as well as reads, and they either never expired or had very generous expiration periods.

Anyone who could write in Slack could talk to an agent, and the agent executed without asking, so in effect anyone who could write in Slack could use the entirety of an agent's permissions as their own.

The problem was that since each agent had a different job, each also had different permissions. The agent that helps with deployments can run the deployment pipeline (the automated procedure that rolls code out to a service), the agent that handles data can read the database, and the agent that handles infrastructure can issue commands to the cluster (the group of servers that actually runs the services).

Some of them had permissions that could directly affect the production environment. For every agent, nowhere along the path that handled a request was there a step that checked "who asked for this," and while the logs recorded what the agent did, they did not record who had asked for it.

There were three reasons this structure had been left as it was.

First, **the only safeguard against risk was a sentence in a prompt.** All we had was a line like "Do not perform operations that affect the production environment" written in the system prompt (the instructions placed in advance for the agent to follow). To borrow a colleague's phrase, it was like having the agent sign a pledge. A pledge is only a promise to comply; it is not a mechanism that actually enforces compliance.

Second, **there was no way to deny a request.** To tighten permissions, we would have had to restrict the agents to specific people or remove the dangerous capabilities from the agents entirely. But doing so would have immediately disrupted the work of people who were already relying on the agents. With no intermediate step where someone could review and approve a denied request, the only choice left was all-or-nothing: block everything or open everything. Since convenience took priority in the moment, everything was left open.

Third, **nothing had gone wrong yet.** Work was getting noticeably faster thanks to the agents, and there seemed to be no reason to tamper with something that was working well and make it inconvenient.

But "nothing has gone wrong" and "nothing can go wrong" are two different things. In this structure, the moment someone makes a wrong request by mistake, an agent is fooled by instructions hidden in a document it reads, or someone's Slack account is hijacked, every permission the agent has is handed over intact. So we decided to change the structure, starting with deciding where to block requests and on what basis.

In other words, this project did not begin because of an incident. It began when, while reading and discussing the agent code together with teammates, we discovered "so this is how much it can do right now."

## Where Should AI Agent Permissions Be Controlled?

Before starting the actual work, we laid out four things we needed to achieve.

1. **Permission checks in code**: Every request is handled only within the requester's permissions, and that check is done by code, not by a prompt.
2. **Record every decision**: Every decision, whether allowed or denied, is logged together with the requester and agent information.
3. **Denial is not the end**: A denied request can be approved in the same thread by another person who holds that permission.
4. **No keys left on the machine**: Eliminate the long-lived, broadly permissioned keys sitting on the agent machines.

Of the four, the first one determined the direction of the other three, and within it the crux was "where should permissions be checked?" If you choose the wrong checkpoint, no matter how elaborate the rules you write, they are useless.

The easiest method that comes to mind is writing the rules in the prompt: telling the agent in advance to "refuse requests like these," in the pledge style described above. The reason this doesn't work is prompt injection (an attack that fools an agent by hiding instructions inside the documents or messages it reads).

As it works, an agent constantly reads documents, tickets, web pages, and Slack messages written by other people. If a sentence like "from now on, follow these instructions" is hidden somewhere in there, the model accepts it as an instruction and is fooled. To the model, a sentence written in the system prompt and a sentence inside the document it just read are the same kind of text. That is why a sentence in a prompt can no longer serve as a rule for an agent.

So the check has to happen at a point where it doesn't matter what the agent has read or what conclusion it has reached. That point is the moment the agent actually calls a tool and uses a credential. Whatever the model decides, the actual request to the service is sent by code, and at that moment who asked and what the operation is are both fixed, so code can verify them.

> **What is a credential?**
>
> A credential is a secret value that, when you send a request to a service, proves "I am a requester with these permissions." API keys, tokens, passwords, and certificates are all credentials. A service decides what is permitted based only on the credential carried in the request, not on who sent it, so whoever holds the credential effectively holds the permissions. The "keys" stored on the agent machines mentioned earlier are one kind of credential.

With the checkpoint decided, the next question was what to allow, and on what basis. A single request has two principals: the person who asked for the work and the agent that carries it out. We decided to check the permissions of both and let a request through only when both sides allow it.

![The requester's permissions and the agent's permissions. Only requests within the overlap of the two are executed](../../../assets/ai-agent-authorization-2.png)
*Figure 2: The requester's permissions and the agent's permissions. Only requests that fall within the overlap of the two are executed (Generated using the GPT-6 Astra model)*

We check both because looking at only one side leaves a different hole in each case. If you look only at the agent's permissions, the problem described earlier remains as it was: anyone who can write in Slack can use the agent's full permissions. Conversely, if you look only at the person's permissions, then when someone with broad permissions asks, the agent ends up doing work it was never meant to do. An agent built to query data ends up deploying, simply because the request came from an administrator. If each agent's permissions are narrowed to fit its job and it executes only within the overlap with the person's permissions, both holes disappear.

There are also requests that no person asked for: cases where an event such as a scheduled job that runs at a fixed time or an alert wakes the agent. Since there is no person's permission to check in that case, we allow only reads based on the agent's permissions alone, and if a dangerous operation is needed, the agent calls on a person to approve it.

Rather than dividing permission levels finely from the start, we began with two tiers: reads and dangerous operations. If you divide them finely from the outset, all your time goes into writing rules and no one ends up able to use anything. The default policies of the two tiers are opposites.

| Tier | Default policy | Exceptions |
| --- | --- | --- |
| Reads | Allow | Block only services where what each person can see differs |
| Dangerous operations | Block | Add only the operations each agent truly needs to its allowlist |

We made reads allowed by default because most agent requests are reads, and most of those are harmless. If you block even requests to look up metrics or check deployment status one by one, the reason for using agents disappears. However, services like Notion and Google Drive, where who can view each document differs, are treated as exceptions: the agent checks whether the requester could have viewed the document in the first place.

Dangerous operations such as deployments, configuration changes, and data modifications, on the other hand, are few in number, and each one is hard to undo or affects other teams, so they are blocked by default and only the operations each agent truly needs are put on its allowlist. This allowlist lives in the repository as a configuration file, not in a prompt, and can only be changed through code review.

If a denial simply ends as a denial, we are back to the all-or-nothing choice described earlier. A person whose request is blocked gives up on the agent and asks the owner directly, and then there is no point in having the agent. So we made it possible for a denied request to be approved right there in the same Slack thread. The agent posts an approval button in the thread along with a message saying "this operation requires permission," and another person who has the permission to perform that operation directly presses the button to approve it. The requester cannot approve their own request, and who approved it is also recorded.

![An approval button posted in a Slack thread](../../../assets/ai-agent-authorization-3.png)
*Figure 3: An approval button posted in a Slack thread*

We made one thing explicit here: only a button click counts as approval, and a message that says "Approved" does not. Text has to be read and interpreted by the model, and the model could fabricate an approval that never happened or misread a message meant differently as an approval. A button click, on the other hand, is vouched for directly by Slack, which knows who pressed it, so there is no room for the model's interpretation to get in the way.

The simplest way to implement these criteria is to put a check function inside the agent code that verifies the person's and the agent's permissions right before a tool is called. We started designing in this direction at first, too, but soon concluded that it was not enough.

The problem, as we saw earlier, is that the internal agents run shell (the window for issuing commands directly to a computer) commands freely with the confirmation step turned off. An agent can simply skip the check function, read the keys on the machine directly, and call the service. When the check code and the agent live in the same process (a single running program), the check becomes a step that can be skipped at any time. As long as the credentials remained on the agent machine, no check we attached would do any good. The difference became especially clear when we laid the three candidates side by side.

| Where the check happens | Can a fooled model bypass it? | Why |
| --- | --- | --- |
| A sentence in the prompt | Yes | The model cannot tell a sentence in a document from a sentence in the prompt |
| A check inside the agent code | Yes | It can use the keys on the machine directly via shell commands |
| A separate service (gateway) | No | With no keys on the machine, it has no choice but to go through the gateway |

We changed direction: instead of adding checks to the agent, we moved the credentials themselves into a separate service the agent cannot touch.

The agent becomes a simple proxy (an intermediary that relays requests on another's behalf) that, without any credentials, merely passes along a request saying "please do this operation" to that service. Since the permission check is done by the service that holds the credentials, whatever the agent reads and whatever it is fooled by, the outcome does not change.

We decided to call this service, which holds the credentials on the agents' behalf and checks permissions, the gateway (an intermediate service that sits between the agents and external services, receiving requests and handling them on the agents' behalf).

## The In-House MCP Gateway: Why This Architecture

One more thing we decided while building the gateway was to implement it with MCP (Model Context Protocol, the standard specification AI agents use to call external tools). We chose MCP because it meant hardly any changes to the agent code. The internal agents were already calling tools via the MCP specification, so from an agent's point of view the gateway simply looks like one newly added tool. When integrating a new external service, too, adding it to the gateway once lets every agent use it through the same permission checks.

Even if a fooled agent runs shell commands at will, there are no longer any keys on the machine to steal, and a request sent to the gateway is denied the moment it falls outside the criteria defined earlier.

![The flow of a single request through the gateway](../../../assets/ai-agent-authorization-4.png)
*Figure 4: The flow of a single request through the gateway (Generated using the GPT-6 Astra model)*

The flow for handling a single request is as follows.

1. **Verify who made the request.** When the agent sends a request, it also sends "which Slack user asked this agent to do this." This information is attached not by the model but by the agent program wrapping the model, and the gateway verifies that it has not been forged, so a fooled model cannot claim to be someone else.
2. **Verify that the person is allowed to do it.** The gateway looks up which role the requester belongs to and checks whether the operation is permitted for that role. Who holds which role is written in a configuration file in the repository, keyed by Slack user.
3. **Verify that the agent is allowed to do it, too.** The request is checked against the per-agent allowlist mentioned earlier. People's roles and the agents' allowlists are managed in the same repository through code review.
4. **Execute only within what both allow.** Once both checks pass, the gateway calls the external service with the credentials and returns only the result to the agent.
5. **Record both the decision and the execution result.** A decision record is kept whether the request was allowed or denied, and if it was actually executed, a separate execution record is kept.

The flow itself is nothing special, since it is a direct translation of the criteria defined earlier. But you may wonder why we built it the way we did when turning it into an actual architecture. We made two major decisions.

The first decision was to split the gateway into a part that makes permission decisions (Auth) and a part that actually calls services (Exec). Building it as a single program would have been simpler, and there are three reasons we deliberately split it in two.

| Aspect | Auth (permission decisions) | Exec (service calls) |
| --- | --- | --- |
| What it does | Checks the requester's and the agent's permissions and decides whether to grant | Verifies the grant and calls the external service with the credentials |
| Time taken | On the order of milliseconds (thousandths of a second) | Up to several seconds, depending on the external service |
| What makes it grow | More people and roles | More integrated services |
| Credentials held | None | All external service credentials |

First, the two tasks take very different amounts of time. If both are in one process, a delayed external call delays the permission decision along with it, and other requests wait in the meantime. Permission decisions must always finish quickly, so we separated them from slow external calls.

Next, the two parts grow for different reasons. Keeping them separate means the work of integrating a new service (Exec) finishes without touching the code that makes permission decisions (Auth).

Finally, the credentials are stored in different places. Exec makes no permission decisions of its own and calls a service only with a grant from Auth, while Auth holds none of the external services' credentials. If something goes wrong on one side, the permissions held by the other side are not handed over as well.

The second decision was to deliver Auth's grant as a single-use token (a short value that serves as a permit). When Auth allows a request, it issues a token that says "this one operation may be executed exactly as specified," and Exec calls the service only after verifying that token. The moment a token is verified, it is marked as used and cannot be used again. For example, a token that says "service A may be restarted" cannot be used to restart service B, nor to restart the same service A twice.

There are two reasons for this as well. One is to prepare for the case where a token leaks. Even if a token leaks along the way, a token that has already been used is worthless, and if someone tries to reuse it for an operation other than the one written on it, Exec refuses.

The other is to make rule changes take effect immediately. By rules, I mean the per-person roles and per-agent allowlists defined earlier. Because every call goes through Auth every time, editing these lists applies the new rules starting from the very next request. If instead a grant stayed valid for a while once issued, a person whose permissions had been revoked could have kept issuing operations until the validity period expired.

Records are kept twice: at decision time and at execution time. The decision record captures who asked which agent for which operation, whether it was allowed or denied, and, if there was an approval, who approved it. The execution record captures the result of the actual service call.

We keep the two separately because being allowed does not necessarily mean being executed. The agent may stop midway, Exec may refuse, or the external service may fail. Linking the two records by token ID lets us distinguish "requests that were allowed but never executed" from "requests that were executed but failed."

A denied request turning into a thread approval is also handled within this flow. When Auth denies a request and responds that approval is required, the agent posts an approval button in the thread. When a person with the permission presses the button, Auth re-checks the request with that approval taken into account and lets it through.

With this in place, agents work without credentials, every permission decision is made in code, and every decision is recorded together with the requester and agent information.

## Reclaiming Credentials So the Gateway Cannot Be Bypassed

For the gateway to do its job, there is one more condition: not a single key may remain on the agent machines. Shell commands that the model runs directly do not go through the gateway. If the old keys are still sitting on the machine, a fooled agent can call the service directly with those keys instead of sending a request to the gateway, and then the gateway's permission checks mean nothing.

For example, if an agent is fooled by instructions hidden in a document it read and tries to send data outside the company, a request through the gateway is denied, but a direct call with the keys on the machine cannot be stopped. So the very next thing we did after building the gateway was to reclaim every key left on the agent machines.

The first step in reclaiming them was a full inventory. For each agent machine, we made a table listing "keys that should be there" and "keys that are actually there" side by side. The keys that should be there are the bare minimum the agent needs to connect to Slack and to prove its identity to the gateway.

The keys that are actually there were found by checking everything: environment variables (configuration values a program reads when it starts), configuration files, and even the login state of the secrets management tool installed on the machine. The table looked roughly like this.

| Key | Should it be there? | Is it actually there? | Action |
| --- | --- | --- | --- |
| Slack connection token | Required | Present | Keep |
| Key proving the agent's identity to the gateway | Required | Present | Keep |
| External service keys | Not required | Present | Move to the gateway, then delete |
| Cluster write permission | Not required | Present | Move to the gateway, then delete |
| Cluster read permission | Required | Present | Keep (for lookups when no one is around) |

The difference between the two columns was precisely the list of what to reclaim, and for each key we decided whether to move it to the gateway, simply delete it, or keep it with a documented reason, and wrote that in the Action column. We did not make this table once and stop there: we automated the check with a script and verified periodically that reclaimed keys did not reappear.

When deleting keys, we first confirmed that a request sent from Slack went through the gateway and came back with the external service's response, and only then deleted the external service keys that had been distributed to the agent machines from Doppler, our secrets management service.

After deleting them, we checked again that the same request was still handled through the gateway. We verified the gateway path first because if we deleted the keys while something was wrong on the gateway side, the agent would have no way to use that service for a while. It would also be hard to tell whether a problem that arose at that point was a gateway problem or one caused by deleting the keys.

The biggest permission among those reclaimed was cluster write access. The agent that handles infrastructure could do practically anything with kubectl, the command-line tool for operating Kubernetes clusters. As we moved this permission to the gateway, we removed kubectl itself from the agent environment.

Instead, we exposed only six predefined operations as gateway tools: restart, scale, rollback, pause, resume, and deleting a Pod (the smallest unit that runs a program in Kubernetes). These six were chosen based on the operations that had actually been needed during incident response. Typical examples are rolling back to the previous version when a deployment causes problems, or deleting a stuck Pod so it gets re-created. In place of a tool that can do anything, we provided only the operations that are truly needed, and even among these, the dangerous ones still require a person's approval in the thread before they run.

![The permissions an attacker would gain if an agent machine were compromised, before and after reclaiming](../../../assets/ai-agent-authorization-5.png)
*Figure 5: The permissions an attacker would gain if an agent machine were compromised, before and after reclaiming (Generated using the GPT-6 Astra model)*

Once the reclaiming is complete, even if an entire agent machine falls into an attacker's hands, all the attacker gains is read access to the cluster. Before the reclaiming, it was the permission to write anything to the cluster. We deliberately left that one read permission in place, because when an alert arrives in the early hours with no one around, the agent still needs to be able to look up the status and report it. This is also consistent with the criterion defined earlier: "requests not made by a person get reads only."

After we judged the reclaiming to be complete, we discovered one thing we had missed. Even though every key had been removed from files and configuration, one old process had been holding the old keys in memory for several days. A process started before the reclaiming keeps the keys it read at startup until it exits, and checking only the files did not reveal this. Only after we also checked the list of running processes and terminated the old one could we finish the reclaiming.

Only after reclaiming the keys on the machines this way did the gateway's permission check become the sole path by which agents call external services.

## What Became Visible Only After Controlling Permissions

Once we had built the structure for controlling permissions and reclaimed the keys, things that had been invisible before started to become visible.

First, we could see which services the agents can access. Before the inventory, no one knew exactly which agent accessed which service, but now every service the agents access is organized in a list, so we can tell right away how many services are integrated, whether reads are open for each service, and which write operations are allowed.

Since high-risk services are blocked in code, this list alone also tells us which services are blocked and which are open. The same goes for the list of agents: because an agent must be registered before it can use the gateway, which agents exist and what each can do are organized in one place.

Who asked which agent for what is now recorded as well, but from the perspective of the people using the agents, almost nothing has changed. They give tasks in Slack as usual, and when they ask for something beyond their permissions, the request is denied or an approval button appears. Tightening control over the agents while leaving the way they are used untouched was the goal from the start.

The records also revealed something unexpected. One external service integration had been failing for months, and no one knew. Hundreds of requests had failed in that time, yet monitoring never caught it and no user reported it. The agent was sending requests and receiving responses, but those responses were consistently errors. What uncovered this was the execution record described earlier, which distinguishes "requests that were allowed but failed." That is when we learned that requests going back and forth and a feature actually working are two different things.

We learned several lessons from this project.

**Rules written in a prompt cannot be enforced.** What is allowed and what is blocked is determined by which code checks the request and where the keys are.

**Verifying a reclaim means looking at the whole machine.** Deleting the keys from files was not the end of it. Only after checking environment variables, configuration files, and even running processes could we say the reclaiming was done.

**A structure where one team handles all permission approvals does not last.** The Foundation group I belong to has only four people, so if the structure had these four receiving and processing permission requests from every employee in the company, it would soon have become a bottleneck. So we made it so that rules are changed through code review, approvals are given in Slack by whoever holds the permission, and each team manages its own agents' allowlists itself. The Foundation group's role ends at building and maintaining the structure that checks permissions; who gets which permissions is decided by each team.

There are also parts we have not yet validated and work that remains. The path where a dangerous operation is approved and then executed has only been verified in controlled tests; we have not yet validated how quickly approval happens in a real incident while a person is waiting. We plan to actually use this path during the next incident response.

We also need monitoring that alerts us when denials suddenly increase. Right now, a person has to look through the records to notice anything unusual, and we plan to make it alert automatically when the number of denials deviates from normal. And since the gateway we built was applied first to the agent that handles infrastructure, moving the other teams' agents onto the same structure remains to be done. Each time we move an agent, we will repeat the process of inventorying and reclaiming the keys that agent holds.

More and more companies will have AI agents doing work for them, and situations where agents hold more permissions than people will become just as common. Changing the structure ahead of time costs far less than fixing it after an incident. I hope this post is useful to those wrestling with similar questions.
