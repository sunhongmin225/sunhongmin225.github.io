---
title: "Sealed Secrets: Safe Kubernetes Secrets You Can Push to a Public GitHub Repository"
description: "Learn how Bitnami's SealedSecrets solves the Base64 encoding vulnerability in Kubernetes Secrets, with a hands-on walkthrough of installation, usage, and Kubeseal scope options."
pubDate: 2024-01-16
heroImage: ../../../assets/sealed-secrets-hero.png
---

> **Originally published** on the [blux Tech Blog](https://blog.blux.ai/sealed-secrets-github-public-repository%EC%97%90-%EC%98%AC%EB%A0%A4%EB%8F%84-%EB%90%98%EB%8A%94-%EC%95%88%EC%A0%84%ED%95%9C-kubernetes-secrets-17393). Republished here on the author's personal blog.

## Kubernetes Secrets and Their Security Problem

When storing variables in Kubernetes, non-sensitive data goes into ConfigMaps and sensitive data goes into Secrets. ConfigMaps store values as plain text, while Secrets are supposed to store encrypted data.

- ConfigMap: server names, feature flags, etc.
- Secrets: API keys, database passwords, etc.

Our team follows a GitOps strategy, using ArgoCD to deploy all critical applications in our Kubernetes cluster. This means the manifest files — the ground truth for our applications — live in a GitHub repository.

So if Secrets store encrypted data rather than plain text, is it safe to push the manifest YAML files directly to the repository? Unfortunately, no. Kubernetes Secrets are simply Base64-encoded.

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

At first glance, the value for `MY_PASSWORD` looks unreadable — seemingly secure. But it's just `an-ex@mple-p@ssw0rd` encoded in Base64:

```bash
shawn@desktop:~$ echo YW4tZXhAbXBsZS1wQHNzdzByZA== | base64 -d
an-ex@mple-p@ssw0rd
```

If you push `my-secrets.yaml` to a public GitHub repository, anyone can trivially decode the original secret values.

In a public repository, the secrets are exposed to **everyone**. Even in a private repository, depending on the size of the organization, many people may have access — and someone could accidentally leak the file externally.

## SealedSecrets: The Solution

Several alternatives exist for overcoming this Kubernetes Secrets vulnerability: HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, and others. In this post, we'll focus on SealedSecrets — a cloud-agnostic solution that anyone can use simply by installing a CLI tool.

SealedSecrets is a solution for managing sensitive data in Kubernetes environments, developed by Bitnami. The official GitHub repository's README opens with:

> "I can manage all my K8s config in git, except Secrets."
>
> Encrypt your Secret into a SealedSecret, which is safe to store - even inside a public repository.

SealedSecrets can only be decrypted by the controller running in the Kubernetes cluster. This means it's impossible for anyone to recover the original secret values from a SealedSecret alone. SealedSecrets consists of a cluster-side controller and a client-side utility called Kubeseal. Because Kubeseal uses asymmetric encryption, only the controller can decrypt SealedSecrets.

## Installing and Using SealedSecrets

To use SealedSecrets, you need to install two components: (1) the controller that runs in your Kubernetes cluster, and (2) the Kubeseal CLI as a client-side utility.

Installation instructions are available in the [official GitHub repository](https://github.com/bitnami-labs/sealed-secrets). You can install the controller via Helm Charts and Kubeseal via Homebrew.

Let's create a Secret called `my-secrets` in the `shawns-playground` namespace with the key-value pair `MY_PASSWORD=an-ex@mple-p@ssw0rd`.

First, generate the Secret YAML manifest using the `-o yaml` and `--dry-run=client` options:

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

This command takes `my-secrets.yaml` as input (`<`), encrypts it with Kubeseal, and writes the result to `my-sealedsecrets.yaml` (`>`).

```yaml
# my-sealedsecrets.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  creationTimestamp: null
  name: my-secrets
  namespace: shawns-playground
spec:
  encryptedData:
    MY_PASSWORD: AyAcxqU55B/Er+ZpcUzKHy3FZEKYpgcNayYCRa4GjJmx4fcZcb...
  template:
    metadata:
      creationTimestamp: null
      name: my-secrets
      namespace: shawns-playground
```

The complex-looking value under `.spec.encryptedData.MY_PASSWORD` is the SealedSecrets-encrypted version of `an-ex@mple-p@ssw0rd`. As explained above, it's impossible to recover the original secret value from this encrypted data alone.

Now let's delete the original `my-secrets.yaml` and deploy using only the SealedSecrets manifest:

```bash
shawn@desktop:~$ kubectl get secrets -n shawns-playground
No resources found in shawns-playground namespace.
shawn@desktop:~$ rm my-secrets.yaml
shawn@desktop:~$ kubectl apply -f my-sealedsecrets.yaml
sealedsecret.bitnami.com/my-secrets created
shawn@desktop:~$ kubectl get secrets -n shawns-playground
NAME        TYPE     DATA   AGE
my-secrets  Opaque   1      13s
shawn@desktop:~$ kubectl get sealedsecrets -n shawns-playground
NAME        AGE
my-secrets  15s
```

The SealedSecrets controller automatically decrypted the SealedSecret and created the corresponding Kubernetes Secret:

```bash
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

Using just the `my-sealedsecrets.yaml` file, we created both the SealedSecret and the Kubernetes Secret. Since the values in `my-sealedsecrets.yaml` cannot be used to recover the original secret values, it's completely safe to push this file to any repository — public or private.

## How We Use Kubeseal Scopes in Production

Let me wrap up by explaining the Kubeseal scope options that our team actively uses in production.

When creating SealedSecrets with Kubeseal, you can choose one of three scope options:

- **strict (default)**: The SealedSecret must be created with a predetermined namespace and name.
- **namespace-wide**: The SealedSecret can be freely renamed within a given namespace.
- **cluster-wide**: The SealedSecret can be created in any namespace with any name.

Imagine a scenario where you already know the Secret's name, key, and value, but you don't yet know which namespace it will be deployed to. Do you have to wait until the namespace is decided before creating the SealedSecret? Since you already know the name and key-value pairs, couldn't you prepare a template in advance and deploy it as soon as the namespace is determined?

Of course, this template must not contain any values that could reveal the original secrets. By using Kubeseal's scope options appropriately, you can prepare SealedSecrets in advance even without knowing the namespace or Secret name.

Let's create a SealedSecret without specifying a namespace and with the `cluster-wide` scope:

```bash
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
    MY_PASSWORD: AgAaNcutTBBdjdfkjfsk1j/dfjsJFJFsli+zgIjL1HYRpvNw...
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

If you set the scope to `strict` (or don't specify one, since strict is the default), the SealedSecret must be created with a predetermined namespace and name:

```bash
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
    MY_PASSWORD: AgBh7/gwLlMJhtYOjP+CtLkuyraNeYAzY1g7oD5bnEnkRby3...
  template:
    metadata:
      creationTimestamp: null
      name: my-secrets
      namespace: default
```

```bash
# Applying to the default namespace — success
shawn@desktop:~$ kubectl apply -f my-strict-sealedsecrets.yaml
sealedsecret.bitnami.com/my-secrets created

# Attempting to apply to a different namespace — fails
shawn@desktop:~$ kubectl apply -f my-strict-sealedsecrets.yaml -n shawns-playground
error: the namespace from the provided object "default" does not match
the namespace "shawns-playground". You must pass '--namespace=default'
to perform this operation.
```

We've covered how to use SealedSecrets to replace Kubernetes Secrets securely, and how to leverage Kubeseal's scope options for flexible deployments. I hope this post helps anyone looking to manage Kubernetes Secrets more safely.

#### References

- [SealedSecrets Official GitHub Repository](https://github.com/bitnami-labs/sealed-secrets)
