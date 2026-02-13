---
title: "Zero-Downtime EKS Cluster Version Upgrade"
description: "A step-by-step guide to upgrading your EKS cluster version without service interruption using a Blue-Green deployment strategy."
pubDate: 2024-08-12
heroImage: ../../../assets/eks-cluster-upgrade-hero.jpg
heroImageCaption: "Thumbnail image"
tags: ["AWS", "Kubernetes", "EKS", "Deployment Strategy", "Cloud Architecture"]
---

> **Originally published** on the [blux Tech Blog](https://blog.blux.ai/%EB%AC%B4%EC%A4%91%EB%8B%A8%EC%9C%BC%EB%A1%9C-eks-%ED%81%B4%EB%9F%AC%EC%8A%A4%ED%84%B0-%EB%B2%84%EC%A0%84-%EC%97%85%EA%B7%B8%EB%A0%88%EC%9D%B4%EB%93%9C%ED%95%98%EA%B8%B0-25859). Republished here on the author's personal blog.

As demand for cloud-native applications surges, container orchestration platforms like Kubernetes have become essential components of modern infrastructure. Amazon EKS is one of the powerful services offered to meet this need, and many companies use it to manage their applications.

However, upgrading an EKS cluster version in a timely manner is not a simple process. Performing an upgrade without service interruption can be an even greater challenge. In this post, we'd like to share the steps blux took to successfully upgrade our cluster version with zero downtime. We hope this will be useful for those of you facing similar challenges.

---

## What is EKS?

At blux, we began running most of our services in a 'Kubernetes (an open-source platform that automates the deployment, management, and scaling of containerized applications)' environment starting May 2023.

Since we primarily use 'AWS (Amazon Web Services)' cloud services, as shown in <Figure 1>, we operated our 'Kubernetes cluster (a Kubernetes environment where multiple nodes work together as a single system, handling the deployment and management of containerized applications)' through 'Amazon EKS (Amazon Elastic Kubernetes Service, a managed Kubernetes service provided by AWS, hereafter EKS)'.

EKS is a managed service that lets you easily run Kubernetes without needing to install and operate your own 'Kubernetes control plane (a set of Kubernetes components that manage cluster state and perform all control operations to maintain the desired state)' — in fact, it's [a managed service that supports running Kubernetes easily without installation and operation](https://aws.amazon.com/ko/blogs/tech/blux-adopting-aws-saas-architecture/). EKS is widely used because it handles the complexity of control plane management at a low cost — specifically, [$0.10 per hour per cluster](https://aws.amazon.com/eks/pricing/), which comes out to roughly $72 per month.

<!-- TODO: replace with actual image -->
*<Figure 1: blux's EKS Cluster-Based Architecture>*

## Why Upgrade Your EKS Cluster Version?

Anyone operating EKS knows the recurring *high-stakes event* that comes around every 14 months: the EKS cluster version upgrade. Kubernetes is developed at a rapid pace by the community, with a new 'minor version (a software version representing small fixes or feature additions rather than major changes)' released roughly every 4 months.

EKS follows this release cycle. Each minor version receives Standard Support for 14 months after release at the base cost of $0.10/hour per cluster. After Standard Support ends, the cluster automatically enters Extended Support for the next 12 months at a [significantly higher cost](https://aws.amazon.com/eks/pricing/) of $0.60/hour per cluster. Once Extended Support also ends, the cluster is automatically upgraded to the oldest currently supported Extended Support version.

An automatic cluster version upgrade risks temporarily disrupting production services. To avoid forced upgrades or expensive Extended Support costs, you need to track Standard Support end dates and prepare your upgrade in advance.

| K8s Version | Upstream Release | Amazon EKS Release | Standard Support End | Extended Support End |
|---|---|---|---|---|
| 1.30 | Apr 17, 2024 | May 23, 2024 | Jul 23, 2025 | Jul 23, 2026 |
| 1.29 | Dec 13, 2023 | Jan 23, 2024 | Mar 23, 2025 | Mar 23, 2026 |
| 1.28 | Aug 15, 2023 | Sep 26, 2023 | Nov 26, 2024 | Nov 26, 2025 |
| 1.27 | Apr 11, 2023 | May 24, 2023 | Jul 24, 2024 | Jul 24, 2025 |
| 1.26 | Dec 9, 2022 | Apr 11, 2023 | Jun 11, 2024 | Jun 11, 2025 |
| 1.25 | Aug 23, 2022 | Feb 22, 2023 | May 1, 2024 | May 1, 2025 |

*<Table 1: [Amazon EKS Release Calendar](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html#kubernetes-release-calendar) by Kubernetes Version>*

When blux migrated most of its 'applications (software programs developed to perform specific functions or tasks)' to Kubernetes in May 2023, we were running EKS cluster version 1.26. As shown in <Table 1>, Standard Support for version 1.26 was ending on June 11, 2024. So we began preparing to upgrade to version 1.30, which was released on May 23, 2024.

Since we were already actively serving clients through applications running in the cluster, it was critical to upgrade the version without any impact on those services.

This approach of updating or upgrading software without service interruption is called **zero-downtime deployment**.

## blux's Choice for Zero-Downtime Upgrade: Blue-Green Deployment

There are two main approaches to upgrading an EKS cluster version:

(1) Upgrade the existing cluster's version directly. However, version upgrades can only be done one step at a time, so you'd need to go sequentially: 1.26 -> 1.27 -> 1.28 -> 1.29 -> 1.30.

(2) Create a new cluster at the latest version (1.30) with all required applications, switch traffic from the old cluster to the new one, and then decommission the old cluster's resources. In other words, this is a 'migration (the process of moving data, applications, or systems from one environment to another)' of the cluster itself. After that, clean up the old cluster's resources.

The first approach requires no additional cluster costs and doesn't involve touching traffic. However, directly upgrading a live cluster risks service instability, and having to repeat the same process 4 times (one step per minor version) is a significant drawback.

The second approach doubles infrastructure costs until the migration is complete, but it's the safest option from a service stability perspective. In particular, if problems occur during deployment, 'rollback (the operation of reverting a system or application to a previous version)' is straightforward. At blux, where customer experience is the top priority, we chose the second approach — migrating the cluster itself.

<!-- TODO: replace with actual image -->
*<Figure 2: Blue-Green Deployment Strategy>*

This second approach is known as **Blue-Green deployment**. In Blue-Green deployment, as shown in <Figure 2>, you build a new environment (Green) with the same configuration as the existing environment (Blue) but at the latest version, then switch traffic from Blue to Green.

The Green environment doesn't need to be an exact copy of Blue — sometimes internal open-source tools get updated during the process. Of course, thorough testing and validation are required to confirm that all applications work as intended in the Green environment.

The general advantages of Blue-Green deployment are:

(1) **Minimal service disruption:** Since you're switching traffic, new versions can be deployed without service interruption.

(2) **Fast rollback:** If problems arise, traffic can be quickly redirected back to the Blue environment, enabling safe deployment.

(3) **Safe testing and validation:** The Green environment closely mirrors production conditions, allowing you to test and verify the new version before go-live and catch issues early.

(4) **Gradual transition:** By incrementally shifting traffic to the Green environment, you can minimize the impact of applying a new version.

For this cluster version upgrade, we ran as many tests and validations as possible beforehand to ensure the latest version cluster would work without issues. However, since we needed the ability to recover quickly if problems did arise, we chose this more expensive approach.

## blux's Blue-Green Deployment in Practice

Let me walk through the three stages of how we actually applied Blue-Green deployment for our cluster version upgrade: (1) creating and validating the new cluster and applications, (2) gradually shifting traffic from the old cluster to the new one, and (3) cleaning up the old cluster's resources.

### (1) Creating and Validating the New Cluster and Applications

This stage involves creating the Green environment — a cluster at the latest version (1.30). There are many ways to create a cluster, but since we manage our key resources as 'IaC (Infrastructure-as-Code, a methodology for managing infrastructure as code and automating provisioning)', we used Terraform.

Terraform is an open-source tool that lets you manage 'infrastructure (the underlying hardware, software, network, and other foundational structures needed to operate systems or applications)' as code, enabling you to define, version-control, and automatically 'provision (the process of preparing and configuring resources for a system)' cloud infrastructure.

<Code 1> below shows a portion of the 'source code (the code used to write a software program)' that provisions the latest version cluster using Terraform's EKS 'module (an independently executable unit of code or functionality)':

```hcl
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.2" # Modify if necessary

  cluster_name    = var.infra_name
  cluster_version = var.k8s_version

  vpc_id                    = var.vpc_id
  subnet_ids                = var.private_subnets

  create_iam_role                        = true
  create_cluster_security_group          = true
  create_node_security_group             = true

  # ...
}
```

*<Code 1: Source code using Terraform's EKS module>*

As you can see in <Code 1>, the cluster name, cluster version, VPC ID, and subnet IDs are parameterized as variables. You simply set the `k8s_version` variable to `1.30`. You can find what other 'inputs (data needed for a system or application to process)' can be used at [this link](https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/latest#inputs).

Next, you need to replicate the same configuration on the new cluster as the existing one. This means not just the blux service applications, but also all the applications needed for 'DevOps (a methodology that combines software development and IT operations to improve efficiency and quality)' and 'MLOps (a methodology for efficiently managing the development, deployment, and operation of machine learning models)' services.

Service-related applications include blux's core product recommendation APIs such as Collector API, ML API, and Recommender API. DevOps and MLOps applications include Airflow, Jenkins, Argo CD, Prometheus, Grafana, and others needed for 'machine learning pipeline (an automated workflow for data collection, processing, model training, and deployment)' orchestration and 'system monitoring (the process of continuously checking and managing a system's performance, status, and availability)'. More details about blux's cluster components can be found in [this article](https://aws.amazon.com/ko/blogs/tech/blux-adopting-aws-saas-architecture/) published on the AWS tech blog.

Since cluster composition varies by organization, **it's important to work with the relevant teams to identify all applications deployed in the cluster ahead of time.**

There are many ways to replicate the existing cluster's configuration on the new one. Since we manage our key resources as IaC, we adopted a 'GitOps (an operational approach that declaratively defines application and infrastructure configurations in a Git repository and automatically deploys and manages them)' strategy using Argo CD.

With this strategy, Argo CD automatically synchronizes the state of the Git repository and the Kubernetes cluster at regular intervals. Many companies already use this approach for its consistency in configuration management and high degree of automation. Since the focus of this post is the zero-downtime cluster upgrade, I'll only provide a brief example of how we apply this strategy here.

*※ We will introduce in detail how blux uses Argo CD for its GitOps strategy in a separate article in the future.*

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: grafana-app
  namespace: argocd
  labels:
    app.kubernetes.io/name: grafana-app
spec:
  project: default
  source:
    repoURL: git@github.com:<REDACTED>
    path: infrastructure/mlops-stack/charts/grafana
    targetRevision: main
    helm:
      releaseName: grafana
      valuesObject:
        grafana:
          resources:
            limits:
              cpu: <REDACTED>
              memory: <REDACTED>
            requests:
              cpu: <REDACTED>
              memory: <REDACTED>
          persistence:
            type: statefulset
            enabled: true
            storageClassName: gp3
            accessModes:
              - ReadWriteOnce
            size: <REDACTED>
          ingress:
            enabled: true
            host: <REDACTED>
            certificateArn: <REDACTED>
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: false
      selfHeal: true
      allowEmpty: false
    syncOptions:
    - CreateNamespace=true
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 90s
  revisionHistoryLimit: 10
```

*<Code 2: Example of an application that Argo CD syncs at regular intervals>*

<Code 2> is an actual YAML file from our Git repository with some information redacted. Argo CD reads this file and automatically deploys the corresponding application to the cluster. At the path specified in `.spec.source.path` within the Git repository referenced in `.spec.source.repoURL`, you'll find a 'Helm chart (a collection of templates that define the deployment of a Kubernetes application)' complete with `Chart.yaml`, `values.yaml`, and declaratively defined resources and sub-charts. You can also use raw Kubernetes 'manifest files (files that define the configuration of resources in Kubernetes)' instead of Helm charts.

The existing cluster at blux already had Argo CD deployed and connected to a Git repository called `blux-architecture-v1`. This repository contained files like <Code 2> along with their corresponding Helm charts — one set per application. We cloned this repository to create a new one called `blux-architecture-v2`, deployed Argo CD to the new cluster, and connected it to this new repository. We chose this approach because we needed to create all applications identically.

One important caveat: for applications exposed externally via 'URLs (Uniform Resource Locator, an address indicating the location of a resource on the web, e.g., https://www.blux.ai/)', you can't use the same 'URIs (Uniform Resource Identifier, a string indicating the identifier of a resource, e.g., www.blux.ai)', so you need to modify these values in the new Git repository.

If you use Kubernetes 'Ingress (an API object that defines rules for routing external traffic to services within the cluster)' with AWS 'ALB (Application Load Balancer, a load balancer service that distributes traffic at the application layer)' for handling external traffic (as we do), you'll also need to assign new ALB names.

For example, if the existing cluster serves an application called `example` using the URI `example.blux.ai` and an ALB named `example-alb` for 'serving (providing a service in response to client requests)', then the new cluster would temporarily use `example-temp.blux.ai` as the URI and `example-temp-alb` as the ALB name, as shown in <Code 3>.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    alb.ingress.kubernetes.io/actions.target-group: <REDACTED>
    alb.ingress.kubernetes.io/certificate-arn: <REDACTED>
    alb.ingress.kubernetes.io/conditions.target-group: <REDACTED>
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS":443}]'
    alb.ingress.kubernetes.io/load-balancer-name: example-alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/ssl-redirect: "443"
    alb.ingress.kubernetes.io/target-type: ip
    external-dns.alpha.kubernetes.io/alias: "true"
  labels:
    app.kubernetes.io/name: example
  name: example-ingress
  namespace: example
spec:
  ingressClassName: alb
  rules:
  - host: example.blux.ai
    http:
      paths:
      - backend:
          service:
            name: target-group
            port:
              name: use-annotation
        path: /
        pathType: Prefix
```

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    alb.ingress.kubernetes.io/actions.target-group: <REDACTED>
    alb.ingress.kubernetes.io/certificate-arn: <REDACTED>
    alb.ingress.kubernetes.io/conditions.target-group: <REDACTED>
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS":443}]'
    alb.ingress.kubernetes.io/load-balancer-name: example-temp-alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/ssl-redirect: "443"
    alb.ingress.kubernetes.io/target-type: ip
    external-dns.alpha.kubernetes.io/alias: "true"
  labels:
    app.kubernetes.io/name: example
  name: example-ingress
  namespace: example
spec:
  ingressClassName: alb
  rules:
  - host: example-temp.blux.ai
    http:
      paths:
      - backend:
          service:
            name: target-group
            port:
              name: use-annotation
        path: /
        pathType: Prefix
```

*<Code 3: Example showing different URIs and ALB names in the existing cluster (top) vs. the new cluster (bottom)>*

Once all applications have been identically created in the new cluster, you need to validate through various tests that everything works correctly in the new environment. This is where 'test code (code written to verify the functionality and performance of software)' written during application development comes in handy.

You also need to validate against the Kubernetes version itself — 'changelogs (a document recording changes made to software)' are available in the [Kubernetes Release History](https://kubernetes.io/releases/).

You can check for 'deprecated APIs (an API that is no longer supported and scheduled for removal)' there, and if the volume of changes is too large, [Kube No Trouble](https://github.com/doitintl/kube-no-trouble) is a great tool. It helps you easily detect APIs in use that are no longer supported. Once you've completed validation of both applications and the Kubernetes version, you're nearly ready to switch traffic.

### (2) Gradually Shifting Traffic from the Old to the New Cluster

Before diving into the traffic switch, let me explain [ExternalDNS](https://github.com/kubernetes-sigs/external-dns) — a tool we use to simplify and automate 'DNS (Domain Name System, a system that translates domain names into IP addresses)' management in our Kubernetes cluster.

ExternalDNS integrates with external DNS providers (like AWS) to automatically manage 'DNS records (a record that stores mapping information between a domain name and an IP address)' for Kubernetes 'Service (a network service for communication between applications within a Kubernetes cluster)' and Ingress objects.

At blux, we use ExternalDNS in conjunction with Kubernetes Ingress objects to automatically create or update DNS records in 'Amazon Route 53 (a cloud DNS web service provided by AWS, hereafter Route 53)'. As shown in <Code 3>, by setting appropriate values in `.metadata.annotations` and `.spec.rules[].host`, ExternalDNS automatically creates records in a designated Route 53 'hosted zone (a collection of DNS records for a specific domain)'.

ExternalDNS is very convenient in normal operations because it automatically syncs cluster 'resources (hardware, software, or data used by a system or application)' with external DNS state at regular intervals. However, during traffic switching operations where you need to manually control DNS state, this auto-sync gets in the way. Therefore, if you're using ExternalDNS, you must stop it on both clusters before starting the traffic switch.

After stopping ExternalDNS, there's one more change needed in the new cluster before switching traffic: the `.spec.rules[].host` value in the Ingress shown in <Code 3>. Currently it's set to `example-temp.blux.ai`, and this needs to be changed to `example.blux.ai` — matching the old cluster.

This is necessary so that when ExternalDNS is redeployed to the new cluster after the traffic switch is complete, its auto-sync between cluster resources and DNS won't cause issues. Ultimately, we want only the `example.blux.ai` DNS record to remain in Route 53. Since ExternalDNS is currently not deployed, changing this Ingress value won't automatically propagate to Route 53.

With that done, it's time to actually move traffic from the old cluster to the new one.

Continuing with the example of serving the `example` application using the Route 53 record `example.blux.ai` (or `example-temp.blux.ai` in the new cluster) and the ALB `example-alb` (or `example-temp-alb` in the new cluster), the same procedure applies to other applications. The current state looks like this:

| # | Route 53 Record Name | Connected ALB Name | Receiving External Traffic? |
|---|---|---|---|
| 1 | example.blux.ai | example-alb | Yes |
| 2 | example-temp.blux.ai | example-temp-alb | No |

*<Table 2: Current serving status of the example application>*

As mentioned multiple times, the application connected to record #1 and its ALB is deployed in the old cluster, while the one connected to record #2 is in the new cluster. Our ultimate goal is to redirect all external traffic from the old cluster's application to the new cluster's application.

When you have two records with different names pointing to applications that do the same thing and want to unify them, as in <Table 2>, Route 53's [**Weighted Routing**](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-weighted.html) is the perfect feature. Weighted Routing is a traffic management method provided by Route 53 that lets you distribute traffic across multiple applications by proportion. This enables scenarios like directing more traffic to a specific application or gradually shifting traffic to a new application version.

Here's how Weighted Routing works: when you create records with the same name for each application in Route 53, it distributes traffic proportionally based on the sum of the records' 'weights (a relative proportion between resources when distributing traffic)'.

For example, if two records are set with weights of 1 and 3, the first application receives 25% of traffic and the second receives 75%. The formula is:

> Traffic per record = (Record's weight / Sum of all record weights) x 100%

*<Formula 1: Expression for traffic received by the application connected to each record>*

To apply Weighted Routing for the `example` application: first, as shown in <Figure 3>, change the existing record `example.blux.ai`'s 'routing policy (a rule for directing DNS traffic to specific resources)' from 'simple routing (a basic routing method that forwards traffic to a single resource)' to Weighted Routing, and set a 'weight (a relative proportion between resources when distributing traffic)' greater than 0 (e.g., 100). Set the Record ID to a unique identifier (e.g., `example-record-old`).

<!-- TODO: replace with actual image -->
*<Figure 3: Modifying the existing record>*

Next, as shown in <Figure 4>, rename the new record from `example-temp.blux.ai` to `example.blux.ai`, and similarly change its routing policy to Weighted Routing. Set its weight to 0 — we don't want external traffic going to the new record yet. Set the Record ID to another unique identifier (e.g., `example-record-new`).

<!-- TODO: replace with actual image -->
*<Figure 4: Modifying the new record>*

At this point, all external traffic still flows only to the application connected to the existing record, as in <Table 2>. Now adjust the new record's weight. Any value greater than 0 will distribute traffic proportionally between the two records. For example, setting it to 10 means traffic splits at 100/(100+10) and 10/(100+10), as per <Formula 1>. Start with a relatively small number to send only a small proportion of traffic to the new record.

If there are no issues, gradually increase the new record's weight to incrementally shift more traffic. For critical applications, increase weights slowly and in small increments.

We monitored both clusters continuously, gradually shifting the traffic ratio from 1:0 to 10:1, 10:2, ..., 1:10. If everything looks good, set the old record's weight to 0 to redirect all traffic to the new record.

<!-- TODO: replace with actual image -->
*<Figure 5: DNS Caching and TTL>*

However, setting the old record's weight to 0 doesn't immediately eliminate all traffic to it. This is due to 'DNS caching (the process of storing DNS query results for a period to optimize performance)', as shown in <Figure 5>.

'Clients (a computer or application that requests services from and receives responses from a server)' and 'DNS resolvers (a system that performs the process of translating domain names into IP addresses)' cache 'DNS query (the process of requesting an IP address for a domain name)' results to optimize performance. During the record's 'TTL (Time to Live, the time a DNS record is maintained in cache)' period, they continue using the cached previous DNS response, so traffic to the old record may persist. Changes won't be reflected until the TTL expires and the cache refreshes.

DNS changes typically propagate globally within minutes to hours, but in the worst case can take up to 48 hours. So don't delete the old record immediately after setting its weight to 0. We used monitoring tools like Prometheus and Grafana to confirm that absolutely no requests were reaching the old application over several hours before deleting the old record. If monitoring isn't feasible, waiting 48 hours before deleting is a safe approach.

After deleting the old record, change the new record's routing policy back from Weighted Routing to Simple Routing. This record is now the sole record for the `example` application. Then redeploy ExternalDNS to only the new cluster. As explained earlier, we already set the `.spec.rules[].host` in the new cluster's Ingress to the final desired URI (`example.blux.ai`), and the corresponding Route 53 record already exists, so redeploying ExternalDNS won't cause any issues.

### (3) Cleaning Up Old Cluster Resources

After migrating all traffic to the new cluster, you can comfortably clean up the old cluster and its deployed applications. We deleted the Ingress resources first, then removed the application files from the Git repository connected to Argo CD (`blux-architecture-v1`). Following the GitOps strategy, Argo CD automatically cleaned up those applications from the cluster.

Finally, we deleted the 'EC2 instances (virtual servers provided by AWS)' and the EKS cluster itself. If there's anything in your 'storage volumes (block storage or file storage for storing data)' that needs backing up, make sure to do that beforehand.

## Did the Zero-Downtime Upgrade Succeed?

Last June, we successfully upgraded our EKS cluster version from 1.26 to 1.30 with zero downtime following the three stages outlined above. As a B2B SaaS company, any issues during the process could have directly affected millions of our clients' customers, which was certainly a source of pressure. However, we had clearly identified the required tasks and their order, and spent about two months preparing with IaC and various tests, so we were confident it would go smoothly.

In the end, thorough preparation and detailed task checklists allowed us to complete the EKS cluster version upgrade without any issues. As mentioned at the beginning, this isn't a one-time task — it's something that needs to be performed roughly every 14 months.

That's why we paid special attention to infrastructure and application management through IaC and GitOps, maximizing 'reproducibility (the ability to consistently reproduce the same results under the same conditions)'. Thanks to this groundwork, we're now confident we can perform the next upgrade even more efficiently and reliably.

We'll continue applying this systematic approach to deliver the best possible service to our clients.
