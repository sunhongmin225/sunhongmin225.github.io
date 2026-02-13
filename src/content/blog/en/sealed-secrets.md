---
title: "Sealed Secrets: Safe Kubernetes Secrets You Can Push to a Public GitHub Repository"
description: "Learn how Bitnami's SealedSecrets solves the Base64 encoding vulnerability in Kubernetes Secrets, with a hands-on walkthrough of installation, usage, and Kubeseal scope options."
pubDate: 2024-01-16
heroImage: ../../../assets/sealed-secrets-hero.png
heroImageCaption: "Thumbnail image"
tags: ["Kubernetes", "Security", "GitOps", "Secrets Management", "DevOps"]
---

> **Originally published** on the [blux Tech Blog](https://blog.blux.ai/sealed-secrets-github-public-repository%EC%97%90-%EC%98%AC%EB%A0%A4%EB%8F%84-%EB%90%98%EB%8A%94-%EC%95%88%EC%A0%84%ED%95%9C-kubernetes-secrets-17393). Republished here on the author's personal blog.

If you're a developer running servers in a Kubernetes environment — an open-source platform that automates the deployment, management, and scaling of containerized applications — you've almost certainly encountered the Secrets resource, which stores sensitive information such as passwords, OAuth tokens, and SSH keys.

Today, we'll look at the security issues surrounding Kubernetes Secrets and introduce SealedSecrets — a tool that encrypts and manages sensitive data in Kubernetes environments — as one way to overcome them. We'll walk through how to use SealedSecrets effectively to manage your Kubernetes Secrets securely.

## Kubernetes Secrets and Their Security Problem

When storing variables in Kubernetes, non-sensitive data goes into ConfigMaps (objects for storing and managing application configuration data in Kubernetes) and sensitive data goes into Secrets. This is because ConfigMaps store data as plain text, while Secrets are supposed to store encrypted data. Here are some representative values that can be stored in ConfigMaps and Secrets:

- ConfigMaps: server names, feature flags (flags that toggle specific features on or off in software development), etc.
- Secrets: API keys, DB passwords, etc.

Our team follows a GitOps strategy — an operational approach that manages infrastructure and application deployments through Git repositories — using [ArgoCD](https://argo-cd.readthedocs.io/en/stable/) to deploy all critical applications in our Kubernetes cluster. This means the manifest files (YAML or JSON configuration files for creating and managing resources in a Kubernetes cluster) — the ground truth (accurate and reliable actual data) for our applications — live in a GitHub repository (a storage location on GitHub for managing source code, files, and project history). In other words, YAML files like the following are uploaded to our GitHub repository:

```yaml
# my-configmaps.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-configmaps
  namespace: shawns-playground
data:
  STAGE: "dev"
  SERVER_ADDRESS: "https://my-server.blux.ai"
```

So if Secrets store encrypted data rather than plain text, is it safe to push the manifest YAML files directly to the repository? Unfortunately, no. Surprisingly, Kubernetes Secrets are simply Base64-encoded.

As an example, let's create a Secret using a kubectl (a command-line interface for interacting with Kubernetes clusters) command and examine the YAML file:

```bash
shawn@desktop:~$ kubectl create secret generic my-secrets \
  -n shawns-playground \
  --from-literal=MY_PASSWORD=an-ex@mple-p@ssw0rd \
  -o yaml --dry-run=client > my-secrets.yaml && cat my-secrets.yaml
apiVersion: v1
data:
  MY_PASSWORD: YW4tZXhAbXBsZS1wQHNzdzByZA==
kind: Secret
metadata:
  creationTimestamp: null
  name: my-secrets
  namespace: shawns-playground
```

Note that the `-o yaml` option outputs the result in YAML format, and the `--dry-run=client` option means we're simulating the Secret creation without actually creating it.

At first glance, the value for `MY_PASSWORD` looks unreadable — seemingly secure. But as explained above, it's just `an-ex@mple-p@ssw0rd` encoded in Base64. Therefore, decoding this value with Base64 gives you the original string:

```bash
shawn@desktop:~$ echo YW4tZXhAbXBsZS1wQHNzdzByZA== | base64 -d
an-ex@mple-p@ssw0rd
```

In other words, if you upload `my-secrets.yaml` to a location anyone can access, such as a GitHub repository, anyone can trivially decode the original values stored in the Secrets.

If you push it to a public repository, literally **everyone** can access it, making it extremely vulnerable. Even in a private repository, depending on the organization's size, many people may have access — and someone could accidentally leak the file externally. Furthermore, even with a private repository, if an SSH key used to access it is stolen by a malicious actor, that too becomes a serious problem.

## SealedSecrets: The Solution

Several alternatives exist for overcoming this Kubernetes Secrets vulnerability: [HashiCorp Vault](https://www.vaultproject.io/), [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/), [Azure Key Vault](https://azure.microsoft.com/en-us/products/key-vault), and others. However, as mentioned earlier, we'll focus on [SealedSecrets](https://github.com/bitnami-labs/sealed-secrets) — a cloud-agnostic solution (a service that isn't tied to any specific cloud provider and works identically across multiple cloud environments) that anyone can use simply by installing a CLI (Command Line Interface, a user interface for controlling programs through typed commands).

SealedSecrets is a solution for managing sensitive data in Kubernetes environments, developed by Bitnami (a company that provides software application packages for easy installation and deployment). The [official GitHub Repository](https://github.com/bitnami-labs/sealed-secrets) README opens with:

> **Problem:** "I can manage all my K8s config in git, except Secrets."
>
> **Solution:** Encrypt your Secret into a SealedSecret, which is safe to store - even inside a public repository. The SealedSecret can be decrypted only by the controller running in the target cluster and nobody else (not even the original author) is able to obtain the original Secret from the SealedSecret.

In other words, SealedSecrets can only be decrypted by the controller (a control or management component) running in the Kubernetes cluster. This means it's impossible for anyone to recover the original secret values from a SealedSecret alone. SealedSecrets consists of a controller running in the cluster and a client-side utility called Kubeseal (a tool used to create and manage SealedSecrets in Kubernetes environments). Because Kubeseal uses asymmetric cryptography (a method of encryption using different keys for encryption and decryption) to encrypt Secrets, only the controller can decrypt SealedSecrets.

Now let's get into the main topic: how to create SealedSecrets and how to use them to replace Kubernetes Secrets.

## Installing and Using SealedSecrets

To use SealedSecrets, as explained above, you need to install two components: (1) the controller that runs in your Kubernetes cluster, and (2) the Kubeseal CLI as a client-side utility.

Installation instructions are available in the [official GitHub repository](https://github.com/bitnami-labs/sealed-secrets#installation). I used Helm Charts (templates used by the Helm package manager for defining and deploying applications in Kubernetes) for the controller, and installed Kubeseal via Homebrew (a package manager for installing and managing software packages on macOS and Linux). Assuming both are successfully installed, let me show you how to create SealedSecrets using the Kubeseal command.

As in the example above, let's create a Secret called `my-secrets` in the `shawns-playground` namespace (a scope in computing that groups and uniquely identifies objects or resources) with the key-value pair `MY_PASSWORD=an-ex@mple-p@ssw0rd`.

First, generate the Secret YAML manifest using the same `-o yaml` and `--dry-run=client` options as before:

```bash
shawn@desktop:~$ kubectl create secret generic my-secrets \
  -n shawns-playground \
  --from-literal=MY_PASSWORD=an-ex@mple-p@ssw0rd \
  -o yaml --dry-run=client > my-secrets.yaml
```

Then encrypt it into a SealedSecret using Kubeseal:

```bash
shawn@desktop:~$ kubeseal -o yaml < my-secrets.yaml > my-sealedsecrets.yaml
```

This command takes `my-secrets.yaml` as input (`<`), encrypts it with Kubeseal, and writes the result to `my-sealedsecrets.yaml` as output (`>`).

```bash
shawn@desktop:~$ cat my-sealedsecrets.yaml
---
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  creationTimestamp: null
  name: my-secrets
  namespace: shawns-playground
spec:
  encryptedData:
    MY_PASSWORD: AyAcxqU55B/Er+ZpcUzKHy3FZEKYpgcNayYCRa4GjJmx4fcZcbcT1YJimbx+EF4dAqpKBF+C/iUGxk4WOO+A2gqu1XIGCHUhhAcIS60ziHHjnma6cKjiS02DMoeUBT1jDPEgrHRzOgF8XjMPbNY7At+7LuGPvBac20RnR0tSecpfNT8Dk9sB8M2XaQQC/VpXLL5osPpmGllu4SdnGB6a97dl+U+nelbB4Nh7kiFwabK3U/D3AwM4N7NJfye/lsyqQvlwPIP22nADI/YhJjg/YhwGcEb/bYhU3/RODNMLeF8GWR8gjMoPTP22nADI/YhJjg/YhwGcEb/bHuTRWD/cYUBe7jKINMCspfQLclj8Zmdiu4nI5/eFexc+av4TwhHy5OTCnoxzBfn4g+sUcUmqJB2ETl9qDTDl7VWkpSgB2lP1FfgJFxj3XyllFi3f4zkJvC8Sq3wNFEAlJv7+euiSzThORGTAJI4W+egf6zqCMvAsfy39gMw55lwHRgebnNT1DV5P5/4KjCcdgAvp2UVIBgyBO/ioN3WkMzZXSeSaeyW98A0JI+wNtpDj+4CHM5fnj1Hffuq72Y4TaE83MFIxGesjwWehEHXQ3uLmje6HjeAnZwPeQbOGe4mfyejeix5GlrRTsapQHfVDAcIS60ziHHjnma6cKjiS02DMoeUBT1jDPEgrHRrlbZMH6Xo2QSoNwVMMSXu6XrXp4szqPLwi6IEBoo4A0719lA9GIiME=
  template:
    metadata:
      creationTimestamp: null
      name: my-secrets
      namespace: shawns-playground
```

The very complex-looking value under `.spec.encryptedData.MY_PASSWORD` is the SealedSecrets-encrypted version of `an-ex@mple-p@ssw0rd`. As explained above, it's impossible to recover the original secret values from this encrypted data alone. The commands below demonstrate how SealedSecrets can replace Kubernetes Secrets:

```bash
# There are currently no Secrets in the shawns-playground namespace.
# If the namespace doesn't exist, create it with: kubectl create namespace shawns-playground
shawn@desktop:~$ kubectl get secrets -n shawns-playground
No resources found in shawns-playground namespace.
shawn@desktop:~$ ls
my-secrets.yaml my-sealedsecrets.yaml
# Since we'll replace Kubernetes Secrets with Sealed Secrets only, delete my-secrets.yaml.
shawn@desktop:~$ rm my-secrets.yaml
shawn@desktop:~$ kubectl apply -f my-sealedsecrets.yaml
sealedsecret.bitnami.com/my-secrets created
# The Kubernetes Secrets that didn't exist before has now been created.
shawn@desktop:~$ kubectl get secrets -n shawns-playground
NAME        TYPE     DATA   AGE
my-secrets  Opaque   1      13s
# The Sealed Secrets has also been created. A few seconds after creating Sealed Secrets, Kubernetes Secrets are automatically generated.
shawn@desktop:~$ kubectl get sealedsecrets -n shawns-playground
NAME        AGE
my-secrets  15s
# Looking at the Secrets, the Base64-encoded value YW4tZXhAbXBsZS1wQHNzdzByZA==
# (which is an-ex@mple-p@ssw0rd from my-secrets.yaml) is in the MY_PASSWORD value field.
# This shows how Sealed Secrets can replace Kubernetes Secrets.
shawn@desktop:~$ kubectl get secrets -n shawns-playground my-secrets -o yaml
apiVersion: v1
data:
  MY_PASSWORD: YW4tZXhAbXBsZS1wQHNzdzByZA==
kind: Secret
metadata:
  creationTimestamp: "2024-01-30T05:45:05Z"
  name: my-secrets
  namespace: shawns-playground
  ownerReferences:
  - apiVersion: bitnami.com/v1alpha1
    controller: true
    kind: SealedSecret
    name: my-secrets
type: Opaque
```

Using just the `my-sealedsecrets.yaml` file, we confirmed that we can create both the SealedSecret and the Kubernetes Secret. Since the values in `my-sealedsecrets.yaml` cannot be used to recover the original secret values, it's completely safe to push this file to any repository — public or private.

## How We Use Kubeseal Scopes in Production

Let me wrap up by explaining the Kubeseal scope (range) options that our team actively uses in production.

When creating SealedSecrets with Kubeseal, you can choose one of three scope options:

- **strict (default)**: The SealedSecret must be created with a predetermined namespace and name.
- **namespace-wide**: The SealedSecret can be freely renamed within a given namespace.
- **cluster-wide**: The SealedSecret can be created in any namespace with any name.

Imagine a scenario where you already know the Secret's name, key, and value, but you don't yet know which namespace it will be deployed to. Do you have to wait until the namespace is decided before creating the SealedSecret? Since you already know the name and key-value pairs, couldn't you prepare a template in advance and deploy it as soon as the namespace is determined?

Of course, this template must not contain any values that could reveal the original secrets. By using Kubeseal's scope options appropriately, you can prepare SealedSecrets in advance even without knowing the namespace or Secret name — you can *prepare* everything ahead of time.

Let's create a SealedSecret without specifying a namespace and with the `cluster-wide` scope:

```bash
# .metadata does not specify a namespace.
shawn@desktop:~$ kubectl create secret generic my-secrets \
  --from-literal=MY_PASSWORD=an-ex@mple-p@ssw0rd \
  -o yaml --dry-run=client > my-secrets.yaml && cat my-secrets.yaml
apiVersion: v1
data:
  MY_PASSWORD: YW4tZXhAbXBsZS1wQHNzdzByZA==
kind: Secret
metadata:
  creationTimestamp: null
  name: my-secrets
```

```bash
# .metadata.annotations specifies the cluster-wide option, and like the Secrets, no separate namespace is specified.
shawn@desktop:~$ kubeseal --scope cluster-wide -o yaml \
  < my-secrets.yaml > my-cluster-wide-sealedsecrets.yaml \
  && cat my-cluster-wide-sealedsecrets.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  annotations:
    sealedsecrets.bitnami.com/cluster-wide: "true"
  creationTimestamp: null
  name: my-secrets
spec:
  encryptedData:
    MY_PASSWORD: AgAaNcutTBBdjdfkjfsk1j/dfjsJFJFsli+zgIjL1HYRpvNw/uDN2CLtRCnrJhMk/BhbNjIWBr5m5PQVyzQV3sT18yfkpw3Vx+w5LCsAQG7449NzuxyfPewrI+cNZACRwQ7TscTjD1RSkPnPfI4/0a0+8zrrs5b1S8LLXZl/VCwTuslYetutTfqAXWd2twkP1BRC6dz0asrE1CQ56F0iNsJ9bS2hnVp6f7AoCtuR3QgaEKIrmMsZklG2S8S3KanNPAwrF6PvzpZyIq/RiZSyHWPO+mwuRL8TRZ4Np5B3VtwsnOG/Zt31H/yd0c+zZVhI1WJuXSCa+iAo3GqgBz18yyGIaPPGxe2MRtWXCTRqxQ0sPO+5AFg6ZU9VZmFDUIr/ondrIdOsy2pfEeV0ngGXeGOhAgdfjasj23jFdsfsdf+dfTUXNylfKBWsvaVPMa+s7uzl7rBQ+Xdyz2QG5iaQwAQ8YZN7PZIYcI/NBGUI6inraGY4kOU1SxHkzSHqKafchjB3+q9qRSrL+VxNl7WsdY/hqKODhNV7bfytLxpwPArlz5HR1WfA5h0HcpC+SbSYH2hajIbMbg5Tl0hlKcNgRRiDqHDcTC/nVL8Bhcf65f9vfd6a/sd+sdSSB2jTe+8XPjtFUoY/TjoX/T4/jTV3KlsNKvebEfNyrdBVvT3+RuTnFf/lclScCgbYRI2H
  template:
    metadata:
      annotations:
        sealedsecrets.bitnami.com/cluster-wide: "true"
      creationTimestamp: null
      name: my-secrets
```

The resulting `my-cluster-wide-sealedsecrets.yaml` can be applied to any namespace:

```bash
shawn@desktop:~$ kubectl apply -f my-cluster-wide-sealedsecrets.yaml
sealedsecret.bitnami.com/my-secrets created
shawn@desktop:~$ kubectl apply -f my-cluster-wide-sealedsecrets.yaml -n shawns-playground
sealedsecret.bitnami.com/my-secrets created
```

If you set the scope to strict (or don't specify one, since strict is the default), the SealedSecret must be created with a predetermined namespace and name:

```bash
# Since no namespace was specified when creating my-secrets.yaml, it was automatically assigned to the default namespace.
shawn@desktop:~$ kubeseal --scope strict -o yaml \
  < my-secrets.yaml > my-strict-sealedsecrets.yaml \
  && cat my-strict-sealedsecrets.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  creationTimestamp: null
  name: my-secrets
  namespace: default
spec:
  encryptedData:
    MY_PASSWORD: AgBh7/gwLlMJhtYOjP+CtLkuyraNeYAzY1g7oD5bnEnkRby3JDiG601GOmETX3TilZ/whpNJxV8ZXnIDzce/2foVhTl+KL9PCqZoPEruIcmOMwzDcE/lE3JHYZqgid198suGiLtIAzocz9+eY3jqO6MzvaGWQJZPiKLvCqz5MPUG2G6iQCkB40OvGcSTdiFyzUhkLnB3wASh9oZ1SthyMp9TLrrUUVs34xFAWDgW/ac9R16RXoAlmP17e9OhUx/qxSnaNH28+cr+/zpyI9Ko6OHG4rb1+eL2bKJxEq/qDRNDUNEwRhPNvT7oqQhJWE9ZIncVKb0thM3xFAe2E4XvqwvIW94shHmLmx9ylNR2kBBlB+fbn62ZhlWgRtaUTFjWHpZUToWaOirFTkZzY3B/OHJVbBdDBReldIQgz87UYbQRFNsIJ5E4OfLxvIuVYcCe1IJqcT6/UAeAm4lS+lrDXwp65V8S+TaenvcyVL8Y/JARUccRG8VBvqG3IAflw4bcY3fiJazukkZfh+WIyei78ySdYI+MP5AVf4Ohy6GSZ7BMeAWyqM3Po2zUyPYCPO/LQqqqyKogYyTH+FPI39kA/HirYmX4Yh7gQz+d30pFPVjAh3gFIB08FrxXdOPy1wGmtYMQM/PyRJZpXWAh8M39oqHr8qS1EXKNfpvKW96DUr39Dk7YHe6GTdCR5DxbgYqkqLEZbyVBD8jF/cu/kTv4xR+M+JFh
  template:
    metadata:
      creationTimestamp: null
      name: my-secrets
      namespace: default
```

```bash
# The Sealed Secret is successfully created in the default namespace.
shawn@desktop:~$ kubectl apply -f my-strict-sealedsecrets.yaml
sealedsecret.bitnami.com/my-secrets created
# Attempting to apply to a different namespace fails.
shawn@desktop:~$ kubectl apply -f my-strict-sealedsecrets.yaml -n shawns-playground
error: the namespace from the provided object "default" does not match
the namespace "shawns-playground". You must pass '--namespace=default'
to perform this operation.
```

We've covered how to use SealedSecrets to replace Kubernetes Secrets securely, and how to leverage Kubeseal's scope options for flexible deployments. I hope this post helps anyone looking to manage Kubernetes Secrets more safely.

Thank you for reading!

#### References

- [SealedSecrets Official GitHub Repository](https://github.com/bitnami-labs/sealed-secrets)
