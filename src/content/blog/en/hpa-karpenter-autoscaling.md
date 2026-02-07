---
title: "Building an Autoscaling System with HPA and Karpenter in Kubernetes"
description: "How to build an autoscaling system using HPA and Karpenter to automatically handle traffic fluctuations in a Kubernetes environment."
pubDate: 2024-01-22
heroImage: ../../../assets/hpa-karpenter-autoscaling-hero.webp
---

> **Originally published** on the [blux Tech Blog](https://blog.blux.ai/kubernetes-%ED%99%98%EA%B2%BD%EC%97%90%EC%84%9C-hpa%EC%99%80-karpenter%EB%A5%BC-%EC%9D%B4%EC%9A%A9%ED%95%98%EC%97%AC-autoscaling-%EC%8B%9C%EC%8A%A4%ED%85%9C-%EA%B5%AC%EC%B6%95%ED%95%98%EA%B8%B0-17394). Republished here on the author's personal blog.

Running applications reliably and efficiently in Kubernetes requires a system that can automatically respond to traffic fluctuations. HPA (Horizontal Pod Autoscaler) and Karpenter are powerful tools that meet this need.

HPA automatically adjusts the number of Pods based on application load — scaling up or down as needed. Karpenter dynamically creates and removes nodes to optimize the cluster according to its requirements.

In this post, we'll walk through how to use HPA and Karpenter to autoscale when traffic suddenly spikes on applications running in a Kubernetes environment.

---

## When Do You Need Autoscaling?

Below is a graph showing the resource usage of one of our Blux applications. The horizontal axis represents 24 hours, and the vertical axis shows vCPU usage normalized against the minimum.

<!-- TODO: replace with actual image - Blux resource usage graph -->

As you can see, resource usage is low during sleeping hours (2 AM–8 AM), gradually increases throughout the day, and drops again after midnight.

Traffic — the amount of data transmitted by a server — is never constant. It fluctuates based on time of day, as shown in the graph, and is also affected by specific events like push notifications.

To operate applications reliably, you need to: (1) handle a baseline level of traffic without issues, and (2) respond appropriately when traffic unexpectedly surges. "Responding appropriately" means the system automatically provisions additional servers without human intervention, so end users experience no difference even during traffic spikes.

This practice of automatically increasing server capacity or count in response to temporary traffic surges is called **autoscaling**. Since we run all applications in Kubernetes, autoscaling for us means increasing the number of Pods or the resources allocated to each Pod.

There are two main approaches to Pod autoscaling: **HPA (Horizontal Pod Autoscaler)** and **VPA (Vertical Pod Autoscaler)**. HPA scales horizontally by adding more Pod replicas, as shown below.

<!-- TODO: replace with actual image - HPA operation diagram -->

VPA, on the other hand, scales vertically by allocating more resources to existing Pods.

<!-- TODO: replace with actual image - VPA operation diagram -->

Pod autoscaling typically operates based on CPU or memory metrics, but you can also configure it with custom or external metrics. We'll cover the triggers and thresholds in more detail below. The [Kubernetes Autoscaler GitHub Repository](https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler#known-limitations) explicitly states that VPA and HPA should not be used together when scaling based on CPU or memory. We chose HPA for our production environment for the following reasons:

**(1) Well-suited for stateless applications.** We follow a microservices architecture where all applications are stateless, making it easy to scale by adding more instances. HPA works by adjusting the number of Pods hosting the application, which is a natural fit for stateless workloads.

**(2) Better scalability.** In theory, HPA has no upper limit unlike VPA. VPA can only allocate resources up to the node's capacity, while HPA can schedule Pods on other nodes when the current node runs out of resources or hits its Pod limit. From a cluster-wide perspective, this leads to more efficient resource utilization.

**(3) Easier to implement.** Applying VPA generally requires deeper understanding of an application's resource usage patterns and may need fine-tuning. HPA is relatively simpler to set up and operate.

HPA increases the number of Pods when resource usage exceeds a certain threshold, distributing the traffic, and reduces them when the extra capacity is no longer needed. To do this, it needs to know how much resources each Pod is using — this is where the **Kubernetes Metrics Server** comes in.

The [Kubernetes Metrics Server](https://github.com/kubernetes-sigs/metrics-server) collects resource usage data across the cluster. On AWS, the prerequisites are: (1) a Kubernetes cluster, (2) the Kubernetes Metrics Server, and (3) the kubectl client.

HPA is implemented as a Kubernetes API resource and controller. The HPA controller running in the Kubernetes Control Plane periodically checks the target's resource usage. For more details on how it works, see [the official documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/).

Let's look at a practical example of HPA in action.

Assume we deploy an application using the following YAML. The file has been simplified for brevity, showing only the `Deployment` and `HorizontalPodAutoscaler`.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blux-sample-api
  labels:
    app: blux-sample-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: blux-sample-api
  template:
    metadata:
      labels:
        app: blux-sample-api
    spec:
      containers:
        - name: blux-sample-api-base
          image: ${BLUX_AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/blux-sample-api:0.0.1
          ports:
            - containerPort: ${BLUX_SAMPLE_API_PORT}
          resources:
            requests:
              memory: 2Gi
              cpu: 1000m
            limits:
              memory: 4Gi
              cpu: 2000m
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: blux-sample-api
spec:
  minReplicas: 1
  maxReplicas: 10
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: blux-sample-api
  metrics:
  - type: resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 150
  - type: resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 100
```

The key section here is `resources` under `spec.template.spec.containers`. The application requests `2GiB` of memory and `1` vCPU, with limits of `4GiB` memory and `2` vCPUs. The `HorizontalPodAutoscaler` is configured to trigger when memory reaches `150%` and CPU reaches `100%` of the requested amounts. In other words, HPA triggers when memory exceeds `3GiB` (150% of 2GiB) or CPU exceeds `1000m` (100% of 1000m).

After the initial deployment, running `kubectl get hpa` shows:

```
shawn@desktop:~$ kubectl get hpa
NAME             REFERENCE                   TARGETS               MINPODS   MAXPODS   REPLICAS   AGE
blux-sample-api   Deployment/blux-sample-api   39%/150%, 1%/100%     1         10        1          2h
```

We then used our custom load testing tool to deliberately send a large number of requests to the application. After sustained load, `kubectl get hpa` shows increased CPU usage (in `TARGETS`, the first value is memory and the second is CPU):

```
shawn@desktop:~$ kubectl get hpa
NAME             REFERENCE                   TARGETS               MINPODS   MAXPODS   REPLICAS   AGE
blux-sample-api   Deployment/blux-sample-api   47%/150%, 166%/100%   1         10        2          2h
shawn@desktop:~$ kubectl get deployment blux-sample-api
NAME             READY   UP-TO-DATE   AVAILABLE   AGE
blux-sample-api   1/1     2            2           2h
```

CPU usage hit `166%`, exceeding the `100%` threshold, so HPA kicked in and scaled from 1 to 2 Pods. After the load test ended, the Pod count dropped back to 1:

```
shawn@desktop:~$ kubectl get hpa
NAME             REFERENCE                   TARGETS               MINPODS   MAXPODS   REPLICAS   AGE
blux-sample-api   Deployment/blux-sample-api   38%/150%, 2%/100%     1         10        1          3h
```

So far we've seen that when resource usage exceeds the configured threshold, HPA creates more Pods to bring utilization back below that threshold. But there's a limit to how many Pods you can create.

Nodes have finite resources, and there's a maximum number of Pods per node. For example, an AWS m5.2xlarge instance has 8 vCPUs and 32GiB of memory, with a maximum of 58 Pods.

What happens when all nodes in the cluster are packed with as many Pods as they can hold, but traffic keeps pouring in? This is where **Karpenter** comes in — automating node provisioning. In Karpenter's terminology, adding nodes through autoscaling is called **"provisioning nodes."**

Karpenter is an open-source node provisioning project for Kubernetes, originally built for AWS. It's now cloud-agnostic, so it works with other cloud providers as well.

## Advantages of Karpenter for Autoscaling

Here are some key advantages of Karpenter based on my experience:

**(1) It's remarkably fast.** From the moment Karpenter decides a new node is needed to actual provisioning, it takes only _tens of seconds to a few minutes_ — including network setup and full node readiness. That's impressively fast considering that manually adding nodes in a typical cloud environment takes considerably longer.

**(2) It's cost-efficient.** When provisioning, Karpenter examines the user-defined pool of instance types and _automatically selects the cheapest instance_ that can serve the required resources. It also deprovisions nodes after a configured idle period, preventing unnecessary costs.

**(3) It's easy to install and operate.** Installation is straightforward by following the [official documentation](https://karpenter.sh/docs/getting-started/), and there's minimal ongoing operational overhead. The biggest advantage is that Karpenter handles everything _autonomously_ — from deciding whether to add or remove nodes to actually doing it. Once you set reasonable resource Requests and Limits across the cluster and deploy a well-configured Karpenter Provisioner, it takes care of itself.

Here's the YAML we use to define the Karpenter Provisioner and AWSNodeTemplate, assuming AWS EC2 instances. Comments explain each configuration element.

```yaml
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: sample
spec:
  providerRef:
    name: sample
  # Labels applied to all nodes provisioned by Karpenter.
  labels:
    type: karpenter

  # Annotations applied to all nodes provisioned by Karpenter.
  annotations:
    maintainer: "blux"

  # Requirements for nodes to be provisioned.
  requirements:
    - key: "node.kubernetes.io/instance-type"
      operator: In
      values: ["m5.large", "m5.xlarge", "r5.large", "r5.xlarge"]
    - key: "kubernetes.io/arch"
      operator: In
      values: ["amd64"]
    - key: "kubernetes.io/os"
      operator: In
      values: ["linux"]
    - key: "karpenter.sh/capacity-type"
      operator: In
      values: ["on-demand"]

  # Total resource limits across all nodes this provisioner can create.
  limits:
    resources:
      cpu: "256"
      memory: 1Ti

  # Setting "consolidation.enabled" to "true" makes Karpenter deprovision unnecessary nodes.
  # If deprovisioning isn't possible, it attempts to replace them with cheaper nodes.
  # consolidation:
  #   enabled: true

  # Nodes are deprovisioned after being empty for this many seconds.
  # Cannot be used together with consolidation.enabled=true.
  ttlSecondsAfterEmpty: 30

  # Priority weight when multiple provisioners match.
  # Higher weight means higher priority.
  # weight: 10
---
apiVersion: karpenter.k8s.aws/v1alpha1
kind: AWSNodeTemplate
metadata:
  name: sample
spec:
  subnetSelector:
    karpenter.sh/discovery: blux-cluster
  securityGroupSelector:
    karpenter.sh/discovery: blux-cluster
  # amiFamily: AL2
  # blockDeviceMappings:
  #   - deviceName: /dev/xvda
  #     ebs:
  #       volumeSize: 10Gi
  #       volumeType: gp2
  #       iops: 3000
  #       deleteOnTermination: true
  #       throughput: 125
```

We've walked through how we use HPA combined with Karpenter for autoscaling in production. While this is a commonly used pattern, VPA might be a better fit depending on your situation. Similarly, Cluster Autoscaler or other node provisioners might be preferable over Karpenter in certain cases.

The right choice depends on your Kubernetes cluster environment and application characteristics. But from an operator's perspective, building an autoscaling system is essential for handling unpredictable traffic reliably and safely.

If you're considering using HPA and Karpenter together like we do, I hope this post has been helpful.

**References**

- [https://docs.aws.amazon.com/eks/latest/userguide/horizontal-pod-autoscaler.html](https://docs.aws.amazon.com/eks/latest/userguide/horizontal-pod-autoscaler.html)
- [https://github.com/kubernetes/autoscaler/](https://github.com/kubernetes/autoscaler/)
- [https://github.com/kubernetes-sigs/metrics-server/](https://github.com/kubernetes-sigs/metrics-server/)
- [https://karpenter.sh/docs/](https://karpenter.sh/docs/)
- [https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
