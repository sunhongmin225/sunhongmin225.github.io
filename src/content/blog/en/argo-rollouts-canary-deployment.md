---
title: "Building a Fearless Deployment Culture: Automating Canary Deployments with Argo Rollouts"
description: "How we built an automated canary deployment pipeline with Argo Rollouts and Datadog to protect 99.9% availability and eliminate deployment anxiety."
pubDate: 2025-12-17
heroImage: ../../../assets/argo-rollouts-canary-deployment-hero.jpeg
---

> **Originally published** on the [DelightRoom Tech Blog](https://medium.com/delightroom/%EB%B0%B0%ED%8F%AC%EA%B0%80-%EB%91%90%EB%A0%B5%EC%A7%80-%EC%95%8A%EC%9D%80-%ED%8C%80-%EB%A7%8C%EB%93%A4%EA%B8%B0-argo-rollouts%EB%A1%9C-%EC%B9%B4%EB%82%98%EB%A6%AC-%EB%B0%B0%ED%8F%AC-%EC%9E%90%EB%8F%99%ED%99%94%ED%95%98%EA%B8%B0-c60a23a46da3). Republished here on the author's personal blog.

### Hi, I'm Dan (Sunhong Min), SRE at DelightRoom.

I joined DelightRoom as a Site Reliability Engineer in August 2025. DelightRoom is a startup that operates [Alarmy](https://alar.my/), an alarm app used by 3.5 million people worldwide every day, and [DARO](https://daro.so/), a B2B ad monetization solution with a combined MAU exceeding 40 million. The opportunity to own service reliability in such a high-traffic environment is what drew me to the team.

SRE is a discipline that applies software engineering practices to manage the reliability and availability of large-scale services. It goes beyond just responding to incidents — encompassing operational automation, observability, incident response protocols, and performance optimization.

Today, I want to share my very first project after joining: **automating canary deployments with Argo Rollouts**. I'll walk through the limitations we faced with our existing deployment approach, why we chose canary deployments and Argo Rollouts, and how we actually implemented and rolled it out. I hope this helps teams facing similar challenges.

### Why did we need to improve the deployment pipeline?

Every SRE initiative is planned and executed under **SLO (Service Level Objective)** targets. An SLO is a quantitative goal for performance and availability that a service must achieve over a given period, and the **Error Budget** is the total amount of allowable failure under that SLO.

DelightRoom's SLO is set at "99.9% or higher service availability over the past month." What does 99.9% actually mean? Let's calculate the error budget:

<!-- TODO: replace with actual image — Formula 1: Error budget calculation -->

A 0.1% failure allowance per month works out to roughly 43.2 minutes. That's our team's entire monthly error budget. Put another way, **just 5 minutes of downtime consumes about 4 days' worth of error budget**. For a service used by millions of users worldwide, that number carries serious weight. A few deployment mishaps could threaten the entire month's stability target.

When I joined, DelightRoom's server deployments used Kubernetes' built-in Deployment resource with a rolling update strategy.

This approach had several structural limitations. New versions would receive 100% of traffic within 1–2 minutes, so if buggy code was deployed, it would instantly affect all users. From spotting an error rate spike on the monitoring dashboard to identifying the cause, deciding to rollback, and actually executing it, the process took anywhere from a few minutes to over 10 minutes. On top of that, every judgment and action depended on humans, so if the responsible engineer was away when a problem occurred, response times would inevitably lag.

In this environment, every deployment was a tense affair. After a release with significant changes, engineers had to watch the monitoring dashboard for several minutes to confirm that error rates and latency metrics stayed stable. They couldn't move on to other work until they verified no unexpected edge cases or API performance degradation had occurred. This tension repeated with every major deployment, driving up fatigue for the engineers involved.

To solve this, I kicked off a deployment pipeline improvement project as my first task after joining. The goal was defined as follows:

> Build a deployment pipeline where server deployments proceed gradually and safely, and where anomalies during deployment trigger automatic rollbacks without human intervention.

Specifically, we aimed to achieve three things:

(1) **Gradual traffic shifting**: Instead of sending 100% of traffic to the new version immediately, shift it in stages — 5% → 20% → 50% → 100%.

(2) **Automated anomaly detection**: Monitor key metrics like error rate and latency in real time, automatically detecting when thresholds are exceeded.

(3) **Unattended rollback**: When anomalies are detected, immediately roll back to the previous version without human intervention.

The solution we chose to achieve these goals was canary deployment automation using Argo Rollouts integrated with Datadog.

### What is canary deployment?

DelightRoom manages all its servers in a Kubernetes environment. There are several strategies for deploying new application versions in Kubernetes, with the most common being **Rolling Update**, **Blue/Green**, and **Canary** deployments.

<!-- TODO: replace with actual image — Photo 1: Three deployment strategies compared -->

**Rolling Update** is Kubernetes' default deployment strategy, requiring no additional configuration. However, as mentioned earlier, since the rollout happens quickly, a buggy version can spread rapidly. Rollbacks also take longer since Pods need to be recreated.

**Blue/Green deployment** fully provisions a new version (Green) environment and then switches traffic all at once. While rollbacks are fast, it requires maintaining two complete sets of infrastructure until the deployment is finalized, making it resource-expensive. Since traffic switching is all-or-nothing (0% or 100%), any issues with the new version immediately affect all users upon switching.

**Canary deployment** first routes only a fraction of total traffic (e.g., 10%) to the new version. After confirming there are no issues, it gradually increases the traffic ratio. The name "canary" comes from the historical practice of miners bringing canary birds into tunnels to detect toxic gases early. Similarly, canary deployment sends a small amount of traffic to the new version first to catch problems early.

<!-- TODO: replace with actual image — Photo 2: Canary bird -->

The key advantage of this approach is minimizing the blast radius. Even if the new version has issues, only a small subset of users is affected in the early stages. When anomalies are detected, traffic can be immediately redirected back to the stable version.

The reason DelightRoom chose canary deployment was clear. It was the best strategy to implement our project goals: **gradual traffic shifting**, **automated anomaly detection**, and **unattended rollback**. The structure of verifying a new version with 5% of traffic, automatically rolling back if error rates or latency anomalies are detected, and expanding traffic to the next stage if everything looks good was the core element for creating the *fearless deployment environment* we wanted.

### What is Argo Rollouts?

<!-- TODO: replace with actual image — Photo 3: Argo Rollouts logo -->

Argo Rollouts is an open-source tool that enables progressive delivery strategies in Kubernetes environments. It provides a custom resource called Rollout that replaces the standard Kubernetes Deployment resource, allowing you to declaratively define and execute canary and blue/green deployments.

The Rollout resource is designed as a drop-in replacement for Deployment. It supports all existing Deployment functionality while **adding advanced deployment features that are difficult to achieve with Deployment alone**.

Key capabilities include blue/green and canary deployment strategy support, fine-grained traffic routing through integration with Ingress controllers or service meshes, deployment analysis through integration with metric providers like Datadog and Prometheus, and automatic promotion or rollback based on analysis results.

Additionally, the rolling update strategy that DelightRoom had been using could also be configured via the strategy option in the Rollout resource, which meant we could maintain compatibility with our existing deployment approach while gradually introducing canary deployments.

While there are other tools for implementing canary deployments — Flagger, Spinnaker, and more — each had trade-offs. Flagger offers simple initial setup and easy migration, but lacks a UI or dashboard for visually monitoring deployment status. Spinnaker provides powerful features for multi-cloud environments, but requires heavy infrastructure and significant resources for initial setup and operations.

Argo Rollouts was the optimal choice for DelightRoom's environment for the following reasons:

(1) DelightRoom uses Nginx Ingress Controller without a service mesh, and Argo Rollouts supports **percentage-based fine-grained traffic splitting using Nginx Ingress Controller alone**, without requiring a service mesh.

(2) DelightRoom uses Datadog for monitoring, and Argo Rollouts offers **flexible automatic rollback logic based on Datadog metrics** through its AnalysisTemplate resource.

(3) **Installation and operations are relatively simple**, and it provides a **dedicated dashboard UI for visually monitoring deployment status**.

For these reasons, we chose Argo Rollouts as our tool for implementing canary deployments.

### Architecture overview

Let's examine the overall structure and key components of DelightRoom's canary deployment architecture using Argo Rollouts.

<!-- TODO: replace with actual image — Photo 4: DelightRoom's Argo Rollouts architecture -->

(1) **Argo Rollouts Controller**: Watches for changes to Rollout resources in the cluster and automatically adjusts the cluster state according to the defined deployment strategy. DelightRoom operates multiple EKS clusters, and since the Argo Rollouts controller doesn't support multi-cluster, we install and operate a controller independently in each cluster.

(2) **Stable/Canary ReplicaSets**: When a Rollout resource is created, the controller manages two ReplicaSets — a Stable ReplicaSet handling the current version and a Canary ReplicaSet handling the new version. During a canary deployment, both ReplicaSets exist simultaneously, with requests distributed to each set of Pods based on the traffic ratio.

(3) **Nginx Ingress Controller**: Handles traffic routing. While not a required component of Argo Rollouts, integration with an Ingress controller or service mesh is needed for percentage-based traffic splitting. DelightRoom already used Nginx Ingress Controller, so we leveraged it.

External traffic entering through the Ingress is distributed to the Stable and Canary ReplicaSets via Services. Argo Rollouts uses Nginx Ingress's canary annotations to split traffic by percentage. For example, at the start of a deployment, only 5% of total traffic goes to the Canary ReplicaSet while the remaining 95% stays with the Stable ReplicaSet.

(4) **AnalysisTemplate and AnalysisRun**: Components responsible for metric-based automated analysis and rollback. AnalysisTemplate defines which metrics to query and under what conditions to judge success or failure. When a deployment starts, an AnalysisRun is created from this template to perform the actual metric analysis. DelightRoom integrates Datadog as the metric provider to analyze error rates, latency, and other metrics in real time. If the analysis results are healthy, the deployment automatically promotes to the next stage; if thresholds are exceeded, a rollback executes immediately.

### The Argo Rollouts build process

As mentioned, DelightRoom was already deploying and managing applications using Kubernetes Deployments. The safest way to introduce Argo Rollouts in this environment was to first set up all components including the Argo Rollouts controller, then safely transition traffic from the existing Deployments to Rollouts.

DelightRoom manages applications using a GitOps strategy with Argo CD, and we followed this strategy throughout the Argo Rollouts build process. GitOps uses a Git repository as the single source of truth, automatically synchronizing the declared state in the repository with the actual cluster state.

In simple terms, when you commit a resource's YAML file to a Git repository, Argo CD detects the change and automatically applies it to the cluster.

**The Argo Rollouts controller and dashboard were deployed using the [official Helm chart](https://github.com/argoproj/argo-helm).** The official chart is well-structured, so most settings could be used as-is. We only customized a few things for our environment: PDB settings for high availability, Ingress settings for dashboard access, and Slack notification configuration. For Slack notifications, we configured Notification Templates following the [official documentation](https://argo-rollouts.readthedocs.io/en/stable/generated/notification-services/slack/). To avoid notification noise, we only set up alerts for important events like `analysis-run-error`, `analysis-run-failed`, `rollout-aborted`, and `rollout-completed`.

After installing the controller, we **authored the Rollout and AnalysisTemplate resources** to apply to our actual applications. To deploy Argo Rollouts across the multiple applications we manage, we templatized these resources. This way, by simply filling in `values.yaml`, we could apply the same structure to multiple applications with minimal effort. Let's look at the key parts of the Rollout and AnalysisTemplate as applied to our B2B ad monetization solution, DARO.

First, the Rollout resource:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: daro-api
  namespace: daro
spec:
  strategy:
    canary:
      canaryService: daro-api-canary-svc
      stableService: daro-api-stable-svc
      steps:
        - setWeight: 1
        - analysis:
            templates:
              - templateName: daro-api-step1-analysistemplate
        - setWeight: 5
        - analysis:
            templates:
              - templateName: daro-api-step2-analysistemplate
        - setWeight: 15
        - analysis:
            templates:
              - templateName: daro-api-step3-analysistemplate
        - setWeight: 85
        - pause:
            duration: 1m
      trafficRouting:
        nginx:
          stableIngress: daro-api-ingress-nginx
  template:
    # Same as a standard Deployment's pod template
```

The core of the Rollout resource is the `strategy.canary` section, which defines how the canary deployment behaves.

- `canaryService` and `stableService` specify the Services that route traffic to the new version (canary) and current version (stable) Pods respectively. During a canary deployment, both versions coexist, and these two Services allow Argo Rollouts to distribute traffic appropriately to each version.
- `steps` defines the sequence of stages the canary deployment will go through. `setWeight` sets the percentage of traffic to route to the new version. For example, `setWeight: 1` means only 1% of total traffic goes to the new version while the remaining 99% is handled by the current version. `analysis` specifies the AnalysisTemplate to run at that stage — the analysis must succeed before proceeding to the next stage. According to the configuration above, deployment shifts traffic in the order 1% → 5% → 15% → 85% → 100%, with AnalysisTemplate verification at each stage. The final `pause.duration: 1m` is a 1-minute wait before final promotion, providing a brief window to verify the state even after all validations have passed.
- `trafficRouting.nginx.stableIngress` specifies the Nginx Ingress resource used for traffic splitting. The code snippet above shows the final-state Ingress (`daro-api-ingress-nginx`) after migration was complete, but during the actual build phase, the existing Deployment was already receiving live traffic, so it was important to verify the Rollout environment first. We initially created and connected a temporary test Ingress rather than the live traffic Ingress.

The `template` section has the same structure as a standard Deployment's Pod template. It defines the Pod spec — container images, environment variables, resource limits, etc. — and you can bring over the existing Deployment's configuration directly.

Next, the AnalysisTemplate resource. It defines the analysis logic executed at each stage of the Rollout. As shown in the Rollout configuration above, we use three AnalysisTemplates (`daro-api-step1-analysistemplate` through `daro-api-step3-analysistemplate`). Since they have similar structures, let's look at just the first one:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: daro-api-step1-analysistemplate
  namespace: daro
spec:
  metrics:
    - initialDelay: 3m
      count: 2
      interval: 3m
      failureLimit: 0
      name: datadog-error-rate-metric
      provider:
        datadog:
          apiVersion: v2
          formula: a / max(b, 1)
          interval: 3m
          queries:
            a: sum:trace.http.request.errors.by_http_status{service:daro-api, env:prod, http.status_class:5xx}.as_count().rollup(sum, 60).fill(zero)
            b: sum:trace.http.request.hits.by_http_status{service:daro-api, env:prod}.as_count().rollup(sum, 60).fill(zero)
          successCondition: default(result, 0) <= 0.001
```

AnalysisTemplate defines "which metrics to query and what conditions determine success."

- `initialDelay` is the wait time before analysis begins. Right after a new version's Pods are created, initialization work may interfere with analysis. We set a 3-minute wait to let the Pods stabilize before starting analysis.
- `count` and `interval` define how many times and at what intervals to measure metrics. The configuration above measures twice (`count: 2`) at 3-minute intervals (`interval: 3m`).
- `failureLimit` is the number of allowed failures. Setting it to 0 means a single failure triggers an immediate rollback. We set this strictly to 0 to minimize blast radius.
- The `provider.datadog` section defines how to query metrics from Datadog. The queries fetch two metrics: query `a` gets the count of 5xx error responses, and query `b` gets the total HTTP request count. The `formula` calculates the error rate as `a / max(b, 1)`. We use `max(b, 1)` to prevent division-by-zero errors when there are no requests (`b = 0`).
- `successCondition` is the success criteria. `default(result, 0) <= 0.001` means the analysis succeeds when the error rate is 0.1% or below. `default(result, 0)` treats missing results (no requests) as 0, counting them as successful. If this condition isn't met, a rollback executes according to `failureLimit`.

Once this build is complete, Pods from both the existing Deployment and the new Rollout coexist. However, since the live traffic Ingress's backend service still points to the Deployment's Pods, no actual user traffic reaches the Rollout Pods yet.

### Zero-downtime migration from Deployment to Rollout

With the Rollout environment built, it was time to transition traffic from the existing Deployment to the Rollout. The most critical aspect of this process was **zero-downtime migration**. With live user traffic flowing in the production environment, not even a moment of downtime was acceptable.

The Argo Rollouts [official documentation](https://argo-rollouts.readthedocs.io/en/stable/migrating/) provides several migration approaches. Following the recommendation that **"when migrating a Deployment that is handling live production traffic, you should run the Rollout in parallel with the Deployment before deleting or scaling down the Deployment,"** we chose to keep the existing Deployment intact while creating a separate Rollout with identical specs. We then gradually transitioned traffic at the Ingress level to complete the migration.

The full migration process went as follows:

<!-- TODO: replace with actual image — Photo 5: DelightRoom's Deployment-to-Rollout migration process -->

**Step 0: Initial state**

The starting state before migration. Only the existing Deployment and its connected Ingress (hereafter "existing Ingress"), Service, and Pods exist. All traffic flows through this path.

**Step 1: Create Rollout and canary Ingress**

Create a Rollout with the same specs as the existing Deployment. The important thing here is that the Rollout's `spec.strategy.canary` subfields (`canaryService`, `stableService`, `steps`, `trafficRouting`) are not yet enabled. The focus at this point is moving traffic from Deployment to Rollout, not using the Rollout's canary deployment features. We took the approach of solving one problem at a time to reduce complexity.

Simultaneously, create a Rollout Ingress (hereafter "canary Ingress"). This Ingress uses the same host address as the existing Ingress but leverages [Nginx Ingress Controller's canary annotation](https://kubernetes.github.io/ingress-nginx/examples/canary/) feature. By setting `nginx.ingress.kubernetes.io/canary: "true"` and `nginx.ingress.kubernetes.io/canary-weight: "0"`, 0% of traffic to that host address gets routed to the canary Ingress. In this state, all traffic still flows through the existing Ingress to the Deployment.

**Step 2: Gradually shift traffic to canary Ingress**

Incrementally increase the canary Ingress's `canary-weight` value: 0% → 5% → 15% → ... → 100%, monitoring error rates, latency, and other key metrics at each stage. If everything looks good, proceed to the next stage; if issues arise, immediately revert the weight to 0%. Once the weight reaches 100%, all traffic for that host address flows through the canary Ingress to the Rollout's Pods instead of the existing Ingress.

**Step 3: Change the existing Ingress's backend service**

With all traffic flowing through the canary Ingress, change the existing Ingress's backend service to the Rollout's Service. Since the existing Ingress isn't receiving traffic at this point, this change has no impact on users.

**Step 4: Return traffic to the existing Ingress**

Gradually decrease the canary Ingress's `canary-weight` value: 100% → ... → 15% → 5% → 0%. Traffic begins flowing through the existing Ingress again. Since we changed the backend service in Step 3, traffic through the existing Ingress now also reaches the Rollout's Pods.

**Step 5: Delete canary Ingress and complete migration**

Once the canary Ingress weight is at 0%, delete the canary Ingress. The traffic path is now: existing Ingress → Rollout Service → Rollout Pods. Clean up the old Deployment and its related resources (Deployment Service, ReplicaSet, etc.) to complete the migration from Deployment to Rollout.

**Step 6: Enable canary deployment features**

Migration is complete, but we can't yet use the Rollout's core canary deployment features. Enable the `spec.strategy.canary` subfields (`canaryService`, `stableService`, `steps`, `trafficRouting`) that were disabled in Step 1. Refer to the Rollout code snippet from the earlier section.

Once this configuration is applied, the existing Service and Ingress are recognized as the stable version's resources, and canary version Service and Ingress are automatically created. From this point forward, when a deployment is triggered (e.g., image update), traffic gradually shifts to the canary version according to the `steps` definition. AnalysisTemplate verification runs at each stage, and once all verifications pass and traffic has shifted 100% to the canary version, promotion occurs — meaning the canary version becomes the new stable version.

The Canary ReplicaSet that was just the new version now becomes the Stable ReplicaSet handling the stable version, and the previous Stable ReplicaSet is scaled down and cleaned up. This completes one deployment cycle.

Safe zero-downtime migration like this requires careful, step-by-step work. We **continuously sent traffic in the development environment, validated each step multiple times, and then applied it to production**.

### What happened after adopting Argo Rollouts?

Following the process outlined above, we started applying Argo Rollouts to all production environments beginning in early September 2025. The most common feedback was that **the psychological burden of deployments had decreased**. When engineers who frequently deploy came to me personally to share this change, I felt genuinely rewarded for having taken on this project. Of course, testing in development environments is still thorough, but there's no longer a need to nervously watch the monitoring dashboard after pressing the deploy button.

**There was even a case where automatic rollback kicked in.** An error that wasn't reproducible in development occurred in production. During the early canary deployment stage, when only a small amount of traffic was shifted to the new version, the error rate anomaly was detected immediately. When the error rate exceeded the threshold, automatic rollback executed as defined in the AnalysisTemplate, resolving the issue without any human intervention. Had we deployed using the previous all-at-once approach, it could have escalated into a major outage affecting all users.

We continued to iterate based on team feedback after adoption.

First, we **added a deployment strategy selection option**. Initially, all deployments were configured as canary deployments. We received feedback that even very simple changes had to go through all validation stages, making deployment times too long. While you can instantly promote during a canary deployment via the dashboard or CLI with `kubectl argo rollouts promote --full`, we decided that an option to deploy as a rolling update from the start was also necessary.

We updated the CI/CD pipeline (built with GitHub Actions) so that engineers could choose between rolling update and canary strategies when triggering the workflow. The Rollout template also renders differently based on the selected option.

<!-- TODO: replace with actual image — Photo 6: Deployment strategy selection in the GitHub workflow -->

Second, we **improved Slack notifications**. Initially, we only sent notifications for major events. Based on team feedback, we refined them to be more useful: we added links to jump directly to the dashboard, organized each deployment stage's progress in threads to reduce notification fatigue, and configured only major changes like deployment completion or rollback to appear as channel posts.

<!-- TODO: replace with actual image — Photo 7: DelightRoom's Argo Rollouts Slack notification -->

Through these improvements, engineers have quickly adapted to the new deployment pipeline and now deploy with confidence. The fact that the Rollout resource is fully compatible with the existing Deployment meant that from a deploying developer's perspective, not much changed — which was a major driver of quick adoption.

### Lessons learned and future challenges

Shortly after joining, I took on a large project that changed the team's entire deployment workflow. Since the deployment process is something the whole team uses, I approached it with a strong sense of responsibility.

The two things I considered most important during this project were: first, **handling massive traffic reliably**, and second, **reducing fatigue and improving convenience for the engineers who actually perform deployments**. No matter how technically excellent a system is, if the people using it find it inconvenient, it's not a successful adoption.

To this end, I put significant effort into **documentation for engineers**. I wrote and shared an "Argo Rollouts Usage Guide and Considerations" document on Notion, covering the background of the transition from Deployment to Argo Rollouts, how the deployment process changes, how deployment monitoring and control differ, along with a troubleshooting guide and FAQ.

<!-- TODO: replace with actual image — Photo 8: Documentation for engineers on Argo Rollouts usage -->

**Communication between team members is highly valued at DelightRoom.** The culture places great emphasis on documentation and alignment, and I wanted to prepare my documentation accordingly.

As mentioned earlier, we continued to iterate based on engineer feedback even after the production rollout. The production deployment was completed in early September, but improvement work continued for several more weeks. And I expect there will always be more to improve.

There were also some regrets. In the development environment, traffic was too low to adequately validate whether the AnalysisTemplate thresholds were actually working correctly. It would have been better if we had prepared a way to simulate production-like traffic in the development environment beforehand.

I also think it would have been smoother if we had offered the rolling update option from the start. While I believed it was ideal to apply the canary strategy to all deployments, in practice, even simple changes incurred long deployment times, causing inconvenience. The lesson learned was that we should have more closely examined engineers' actual workflows before designing the system.

For future improvements, we're considering the following: First, to address the regret mentioned above, we want to **establish a way to simulate production-like traffic in the development environment**. This will allow us to thoroughly validate AnalysisTemplate thresholds before production deployment. We also plan to further optimize the current production thresholds based on actual operational data.

Additionally, while we currently use error rate as the primary metric, we're **exploring adding other effective metrics like latency to improve verification accuracy**. Finally, we plan to **templatize more variables within the deployment pipeline** so that engineers can directly adjust traffic shift ratios and other parameters. Currently, only the deployment strategy (canary vs. rolling update) is selectable, and we intend to extend this with more fine-grained control.

Through this project, we've taken one step closer to becoming a **"team where deployments aren't scary."** Of course, there's still room for improvement, but instead of nervously watching a dashboard after pressing the deploy button, we can now trust that the system will detect and respond to problems on its own. I hope this post helps teams facing similar challenges. Thank you for reading.
