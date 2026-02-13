---
title: "Managing Kubernetes Resources with Argo CD and GitOps at blux"
description: "How blux leveraged Argo CD and GitOps to improve the efficiency and reliability of Kubernetes resource management."
pubDate: 2025-02-06
heroImage: ../../../assets/argocd-gitops-kubernetes-hero.png
heroImageCaption: "Thumbnail image"
tags: ["Kubernetes", "GitOps", "Argo CD", "CI/CD", "DevOps"]
---

> **Originally published** on the [blux Tech Blog](https://blog.blux.ai/argo-cd%EC%99%80-%EA%B9%83%EC%98%B5%EC%8A%A4%EB%A5%BC-%ED%99%9C%EC%9A%A9%ED%95%9C-%EB%B8%94%EB%9F%AD%EC%8A%A4%EC%9D%98-%EC%BF%A0%EB%B2%84%EB%84%A4%ED%8B%B0%EC%8A%A4-%EC%9E%90%EC%9B%90-%EA%B4%80%EB%A6%AC-%EB%85%B8%ED%95%98%EC%9A%B0-41764). Republished here on the author's personal blog.

Operating reliable and scalable systems in a rapidly changing business environment has become a core challenge for many technology organizations. This is especially true for services that need to process large volumes of data and optimize in real-time.

blux (Blux) built a Kubernetes-based operational environment to address these challenges and aimed to maximize development and deployment efficiency by adopting a CI/CD system from the early stages.

The importance of a CI/CD system was clear.

Applications needed to be deployed quickly and reliably without repetitive manual work, errors occurring during operations needed to be automatically detected and addressed, and an environment was needed that could facilitate smooth collaboration between development and operations teams to continuously improve service quality. To this end, blux reviewed various technical options before adopting deployment automation using Argo CD.

In this post, we will share the strategies blux established during the CI/CD build process and the practical know-how on how we maximized operational efficiency using Argo CD.

---

## How Did blux Come to Adopt Argo CD?

In May 2023, blux began running its core product recommendation services on Kubernetes. Kubernetes is an open-source container orchestration platform that automates deployment, scaling, and operations of containerized applications, providing the flexibility to respond to rapidly changing business requirements.

![CI/CD System](../../../assets/argocd-gitops-kubernetes-1.png)
*CI/CD System (Source: https://www.blackduck.com/glossary/what-is-cicd.html)*

We invested heavily in building a CI/CD system (Continuous Integration and Continuous Delivery System, a system that automates the continuous integration and deployment of applications) from the very beginning of setting up the Kubernetes environment.

Building a CI/CD system means creating a system that enables more efficient and frequent delivery of applications to users through automation across all stages from development to deployment. The reasons we invested so much effort in building a CI/CD system from the early stages are as follows.

### (1) Faster Development Velocity

- We believed that automated pipelines were needed to deploy application code quickly and reliably.

- We wanted to support developers in focusing on actual development by minimizing manual tasks during the deployment process.

### (2) Improved Operational Stability

- We believed that automated testing and deployment processes were essential to proactively detect and respond to errors that could occur during deployment.

- We considered it important to simplify rollback procedures to increase service availability and ensure operational environment stability.

### (3) Better Cross-Team Collaboration

- We aimed to facilitate smooth collaboration between development and operations teams through CI/CD pipelines and make it easier to track and manage changes.

- We sought to enhance overall team productivity by strengthening transparency and reliability in the deployment process.

blux chose Argo CD as the CD tool for efficient and automated management of Kubernetes resources. The reason we chose Argo CD among various tools is that Argo CD automatically synchronizes Git (a distributed version control system and tool for effectively managing code change history) and Kubernetes cluster state, reducing manual deployment errors and supporting various deployment strategies, which greatly helped improve operational stability and flexibility. Above all, Argo CD was already one of the most widely used CD tools in Kubernetes environments, so it was a natural choice.

## What Are Argo CD and GitOps?

![Argo CD](../../../assets/argocd-gitops-kubernetes-2.png)
*Argo CD Logo (Source: https://techicons.dev/icons/argocd)*

Argo CD is a declarative application management tool for Kubernetes that automatically syncs and manages cluster state based on a Git repository (a space for storing and managing source code and related files).

Its key features are as follows.

### (1) Automatic Synchronization

- Ensures management consistency by synchronizing the Kubernetes resource state defined in a Git repository with the actual cluster state.

### (2) User-Friendly UI and CLI

- Enables visual inspection and management of application deployment status through a web-based UI and CLI (Command Line Interface, an interface for interacting with the system through commands entered at the command line).

### (3) Support for Various Deployment Strategies

- Easily configure blue-green deployments (Blue-Green Deployment, a strategy that enables zero-downtime deployments by alternating between two environments), canary deployments (Canary Deployment, an approach where a new version is first deployed to a small subset of users to verify stability before proceeding with a full deployment), and more.

### (4) Helm Chart and Kustomize Integration

- Integrates with tools like Helm charts (Helm Chart, a tool for packaging Kubernetes applications for deployment and management) and Kustomize (Kustomize, a tool for reducing duplication in Kubernetes manifests and easily managing environment-specific configurations) for more flexible Kubernetes resource management.

As mentioned above, Argo CD is already the most widely used CD tool in Kubernetes environments worldwide, maintained and developed as open source, which means developers around the world are continuously working to improve Argo CD's performance and resolve issues even as we speak.

![Argo CD declarative tool](../../../assets/argocd-gitops-kubernetes-3.png)
*Argo CD is a declarative, GitOps continuous delivery tool for Kubernetes (Source: https://github.com/argoproj/argo-cd?tab=readme-ov-file#what-is-argo-cd)*

If you visit [Argo CD's official GitHub repository](https://github.com/argoproj/argo-cd?tab=readme-ov-file#argo-cd---declarative-continuous-delivery-for-kubernetes), you'll find the phrase shown in the image above at the very top of the documentation.

This translates to "Argo CD is a declarative, GitOps continuous delivery tool for Kubernetes." So what does GitOps mean here?

GitOps is a declarative methodology for managing applications and infrastructure through Git repositories. A declarative methodology refers to a configuration and management approach that focuses on the desired end result.

Users simply define the desired state of the system, and the system implements it on its own. Since users specify the final state that the system should achieve rather than the specific procedures of "how," this is particularly useful in environments like Kubernetes that automatically deploy and manage containerized applications.

GitOps operates based on the following core principles.

### (1) Git as the Single Source of Truth

- Stores the current state and change history of all resources in a Git repository as a single source of truth (SSOT; Single Source Of Truth, a concept that ensures consistency and reliability through a single data source referenced by all systems), improving traceability and reliability.

### (2) Automated Deployment and Synchronization

- When changes are committed to Git, they are automatically reflected onto the cluster, reducing manual work and minimizing the possibility of errors.

### (3) Declarative Configuration

- Defines all configurations declaratively for predictable outcomes.

Re-interpreting the phrase at the top of the Argo CD official GitHub repository documentation, its meaning is as follows:

> "Argo CD is a tool that, when users define the desired state of a system, automatically delivers it to the system through the GitOps methodology. Here, the system refers to the Kubernetes environment, specifically the cluster."

blux chose GitHub (a platform that hosts Git repositories and provides collaboration and CI/CD features) as its SSOT because GitHub's powerful version control and collaboration tools perfectly aligned with the requirements for Kubernetes resource management.

By storing Kubernetes resource definition files (YAML) in GitHub, all change history is automatically recorded, and each change can be tracked through a unique commit hash. This serves as an important foundation for quickly rolling back to a previous state when issues arise during deployment.

Additionally, GitHub's PR (Pull Request, a process for requesting review before merging code changes in a Git repository) feature enabled systematic collaboration management by ensuring that all resource changes go through review and approval before being applied. In particular, the transparency of code reviews, opinion exchanges, and approval processes within PRs was effective in building trust and productivity across teams.

Another reason for choosing GitHub was its extensive ecosystem and tool integration. Integration with CI/CD pipelines was straightforward using workflow (a series of defined steps and processes for automating specific tasks) automation tools like GitHub Actions (a CI/CD automation feature provided by GitHub that enables build, test, and deployment tasks when code changes occur), and the natural integration with Argo CD simplified the workflow of automatically reflecting Git changes onto the Kubernetes cluster.

For these reasons, blux chose GitHub as the SSOT for Kubernetes resources, and through this, fully realized declarative configuration, change tracking, and automation, significantly improving the operational efficiency and reliability of the Kubernetes environment.

## blux's Kubernetes Architecture with Argo CD and GitOps

![blux Kubernetes Architecture](../../../assets/argocd-gitops-kubernetes-4.png)
*blux's Kubernetes Architecture Using Argo CD and GitOps (Source: author)*

The diagram above is a simplified representation of blux's Kubernetes architecture using Argo CD and GitOps. It shows the entire process, in order, from blux software engineers developing the application to it being deployed to the production Kubernetes cluster.

The first process is engineers developing the Collector API application. Engineers modify the Collector API code and push it to GitHub's source code repository (Source Code Repository, a repository for storing and managing the application's source code and related files) using PRs. When code changes are merged into a specific branch of the repository, the build and deployment process is automatically triggered through GitHub Actions.

The second process is the GitHub Actions workflow execution stage. As explained earlier, when code is pushed to a specific branch in GitHub, GitHub Actions runs automatically. At this stage, the application is built into a container image, necessary tests are performed, and if all tests pass, the process moves to the next stage. If tests fail, the entire process is halted and engineers are notified.

```yaml
name: Build and push image to Amazon ECR

on:
  push:
    branches:
      - <REDACTED>
      - ...
    paths:
      - <REDACTED>
      - ...

env:
  AWS_ACCOUNT_ID: <REDACTED>
  AWS_REGION: <REDACTED>
  AWS_ECR_REPOSITORY: <REDACTED>
  AWS_IAM_ROLE_TO_ASSUME: <REDACTED>

jobs:
  build_and_push_image:
    runs-on: ubuntu-22.04
    permissions:
      id-token: write
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        id: aws-credentials
        with:
          disable-retry: true
          aws-region: ${{ env.AWS_REGION }}
          role-to-assume: arn:aws:iam::${{ env.AWS_ACCOUNT_ID }}:role/${{ env.AWS_IAM_ROLE_TO_ASSUME }}
          inline-session-policy: >-
            {
              "Version": "2012-10-17",
              "Statement": [
                {
                  "Sid": "WriteImage",
                  "Effect": "Allow",
                  "Action": [
                      "ecr:CompleteLayerUpload",
                      "ecr:UploadLayerPart",
                      "ecr:InitiateLayerUpload",
                      "ecr:BatchCheckLayerAvailability",
                      "ecr:PutImage"
                  ],
                  "Resource": "arn:aws:ecr:${{ env.AWS_REGION }}:${{ env.AWS_ACCOUNT_ID }}:repository/${{ env.AWS_ECR_REPOSITORY }}"
                },
                {
                  "Sid": "ReadImage",
                  "Effect": "Allow",
                  "Action": [
                      "ecr:DescribeImages"
                  ],
                  "Resource": "arn:aws:ecr:${{ env.AWS_REGION }}:${{ env.AWS_ACCOUNT_ID }}:repository/${{ env.AWS_ECR_REPOSITORY }}"
                },
                {
                  "Sid": "AuthOnly",
                  "Effect": "Allow",
                  "Action": [
                      "ecr:GetAuthorizationToken"
                  ],
                  "Resource": [
                      "*"
                  ]
                }
              ]
            }
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      - name: Read Version
        run: |
          echo "VERSION=$(cat VERSION | tr -d '\n')" >> $GITHUB_ENV
      - name: Build image
        run: |
          docker build -t ${{ env.AWS_ACCOUNT_ID }}.dkr.ecr.${{ env.AWS_REGION }}.amazonaws.com/${{ env.AWS_ECR_REPOSITORY }}:${{ env.VERSION }} .
      - name: Push image to Amazon ECR
        run: |
          docker push ${{ env.AWS_ACCOUNT_ID }}.dkr.ecr.${{ env.AWS_REGION }}.amazonaws.com/${{ env.AWS_ECR_REPOSITORY }}:${{ env.VERSION }}
```

*Code for building images and uploading to Amazon ECR using GitHub Actions (partially redacted) (Source: blux)*

The third step, as shown in the code above, is storing the container image in Amazon ECR (Elastic Container Registry, a container image registry provided by AWS). After GitHub Actions builds the Collector API container image, it uploads it to Amazon ECR (Elastic Container Registry).

Amazon ECR serves as blux's container image registry, managing all images used by Kubernetes. At this stage, container images with specific tags (e.g., 0.1.2, etc.) are stored.

The fourth step is GitHub Actions updating the config repository (Config Repository, a repository for storing application configuration and deployment manifests that serves as the SSOT in GitOps).

Once a new Collector API container image is uploaded to ECR, GitHub Actions updates the Kubernetes manifests (in YAML format) in the config repository, i.e., the application manifests (Application Manifests, a collection of YAML files that define applications in Kubernetes) repository.

At this point, it updates fields like `image: ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/${ECR_REPOSITORY_NAME}:0.1.1` in the target file to point to the new container image. These changes can either be committed directly to GitHub or submitted as a PR to go through an additional human review. We use the latter approach for safer deployments.

The fifth step is Argo CD detecting changes and preparing for deployment. When an engineer directly reviews the PR created by GitHub Actions and merges the changes into the final codebase, the config repository state changes. Since Argo CD periodically monitors the config repository, Argo CD automatically detects these changes without any manual action.

As explained earlier, Argo CD uses a declarative deployment approach to synchronize the config repository's settings with the actual Kubernetes cluster state. Therefore, engineers don't need to manually run `kubectl apply` — changes are automatically applied to the cluster.

![Pod Rolling Update Process](../../../assets/argocd-gitops-kubernetes-5.png)
*Pod Rolling Update Process (Source: author)*

The sixth and seventh steps are where Argo CD actually deploys the new Collector API version to Kubernetes. Argo CD deploys the new Collector API version to the Kubernetes cluster based on the updated manifests.

In this example, the Deployment (a Kubernetes resource for deploying and updating applications that defines a desired state and automatically maintains it) resource is updated, and as shown in the diagram above, existing Pods (the basic unit for running containers in Kubernetes, containing one or more containers with shared networking and storage) undergo a rolling update (Rolling Update, an approach that enables zero-downtime deployments by progressively replacing existing applications with new versions) to the new image.

New pods in the cluster pull the updated container image from Amazon ECR and start running. Once the deployment completes successfully, the latest version of the Collector API is running in the Kubernetes cluster, ready to handle external requests.

Through this process, blux operates an automated CI/CD system where engineers simply push application code changes to GitHub and new versions are automatically deployed to the Kubernetes cluster. This enabled blux to achieve a reliable yet fast deployment process.

## Key Features of blux's Management Process with the New System

With the adoption of Argo CD and GitOps, blux's Kubernetes resource management evolved into a systematic and automated approach. In particular, by tracking and managing all changes consistently on a code basis, blux was able to maintain a transparent and efficient deployment process. The key features of blux's management process are summarized as follows.

### (1) Linking GitHub Repositories to Kubernetes Resources

blux manages application code and Kubernetes manifests in separate GitHub repositories.

- Applications are managed in a source code repository, and container images are built and deployed through GitHub Actions when code changes are made.

- Kubernetes resource manifests (YAML) are stored in a config repository, and Argo CD monitors this repository to automatically apply changes to the cluster.

- Declarative Kubernetes configuration became possible, and infrastructure changes could be clearly recorded and tracked through Git.

### (2) PR-Based Change Management

blux manages all Kubernetes resource changes through PRs to improve safety.

- When engineers deploy new features or modify configurations, they create PRs in the config repository rather than making direct changes, going through review and approval processes.

- Code review, approval processes, and change history tracking became possible, preventing the risk of incorrect configuration changes being immediately reflected in the production environment.

- Thanks to the PR-based management approach, the deployment process could be operated more transparently and systematically.

### (3) Automated Deployment Pipeline

blux built deployment automation using Argo CD based on a GitOps workflow.

- When engineers push new code to GitHub, GitHub Actions builds it and uploads the container image to Amazon ECR.

- When the config repository manifests are updated, Argo CD detects the changes and automatically syncs with the Kubernetes cluster to reflect them.

- In this process, deployments can be configured for Fully Automatic Sync or Manual Sync (deployed after a specific PR is approved).

- blux is able to maintain a consistent deployment process while increasing development velocity and strengthening deployment reliability.

### (4) Repeatable Resource Management with Helm Charts

blux actively uses Helm Charts to efficiently manage Kubernetes resource definitions.

- All application and infrastructure configurations are composed as Helm charts, allowing easy adjustment of environment variables or deployment parameters without code changes.

- Helm charts enable templated YAML configurations, making it possible to deploy and maintain multiple applications in a consistent manner.

- By combining Helm charts with Argo CD, blux was able to simplify repetitive deployment tasks and effectively manage environment-specific configurations.

By building a GitOps-based automated Kubernetes management process using GitHub, Argo CD, and Helm charts, blux increased deployment velocity and significantly improved operational reliability. This approach contributed to reducing operational burden while maximizing the efficiency of team collaboration and change management.

## Future Improvements for blux's Architecture

Since adopting Argo CD and GitOps, blux has seen benefits across multiple areas including faster deployment velocity, higher operational reliability, and stronger team collaboration. However, there are things we were unable to apply during this architecture build that we would like to improve or add in the future.

![Argo CD Notifications Example](../../../assets/argocd-gitops-kubernetes-6.png)
*Argo CD Notifications Example (Source: author)*

### (1) Enhanced Real-Time Monitoring with Argo CD Notifications

Currently, Argo CD deployment status is often checked manually through the dashboard or kubectl commands. The plan is to leverage the Argo CD Notifications feature to receive real-time alerts through collaboration tools like Slack. This will enable rapid response when deployment failures or sync errors occur.

### (2) Automated Deployment Approval and Strengthened Testing Processes

Currently, changes are approved through PRs and then manually merged into the final codebase. The plan is to improve the CI/CD pipeline so that changes can be automatically approved and deployed when certain conditions are met.

For example, when automated E2E tests (End-to-End Tests, a process of testing the entire application workflow to verify that features work as expected) pass, Argo CD will be configured to automatically reflect the changes. This is expected to increase deployment velocity while maintaining a more stable deployment process.

Through the adoption of Argo CD and GitOps, blux has been able to systematically operate and manage Kubernetes resources. The key features are fast deployment velocity, high stability, and smooth collaboration between development and operations teams.

blux continues to pursue technical challenges, constantly seeking better infrastructure and operational practices. Going forward, we will build a more sophisticated deployment environment with enhanced real-time monitoring and automated deployment approval processes. This will enable engineers to deploy code faster and more reliably, while operations teams can manage services more systematically.

We will continue to build a more efficient and flexible deployment environment, and we look forward to showing you the ever-evolving blux. Thank you for your support!

---

**Author**

**Shawn Min (민선홍), blux Information Security and DevOps Lead**
I believe that good services cannot be built without a high level of security and a robust infrastructure. I constantly strive to create products that customers can trust and use with confidence.
