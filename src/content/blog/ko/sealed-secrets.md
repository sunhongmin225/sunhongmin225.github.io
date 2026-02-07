---
title: "GitHub Public Repository에 올려도 되는 안전한 Kubernetes Secrets, 'Sealed Secrets'"
description: "Kubernetes Secrets의 Base64 인코딩 취약점과 이를 해결하는 Bitnami의 SealedSecrets 사용법, 그리고 Kubeseal Scope 옵션 활용법을 다룹니다."
pubDate: 2024-01-16
heroImage: ../../../assets/sealed-secrets-hero.png
---

> **원문:** 이 글은 [blux 기술 블로그](https://blog.blux.ai/sealed-secrets-github-public-repository%EC%97%90-%EC%98%AC%EB%A0%A4%EB%8F%84-%EB%90%98%EB%8A%94-%EC%95%88%EC%A0%84%ED%95%9C-kubernetes-secrets-17393)에 게시된 글을 저자의 개인 블로그에 재게시한 것입니다.

## Kubernetes Secrets 및 이와 연관된 보안상의 문제

쿠버네티스에 변수를 저장할 때, 민감하지 않은 정보는 ConfigMap에, 민감한 정보는 Secrets에 저장합니다. 기본적으로 ConfigMap에는 일반 문서(Plain Text)로 저장되고, Secrets에는 암호화된 데이터가 저장되기 때문입니다.

- ConfigMap: 서버의 이름, 피처 플래그 등
- Secrets: API keys, DB Passwords 등

저희 팀에서는 GitOps 전략을 적용하여 ArgoCD라는 툴을 이용해 쿠버네티스 클러스터 내의 모든 핵심적인 애플리케이션을 배포하고 있습니다. 때문에 애플리케이션의 그라운드 트루스가 되는 매니페스트 파일들을 GitHub 레파지토리에 올려서 관리하고 있습니다.

그렇다면 Secrets에는 일반 문서가 아닌 암호화된 데이터가 저장된다고 했으므로 매니페스트 YAML 파일을 레파지토리에 그대로 올려도 보안상 문제가 없을까요? 안타깝게도 그렇지 않습니다. 쿠버네티스의 Secrets에는 데이터가 단순히 base64로 인코딩되어 들어갑니다.

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

얼핏 보기에는 MY_PASSWORD의 값 자리에 알아보기 힘든 값이 있어 보안상 안전해보입니다. 그러나 이 값은 단순히 `an-ex@mple-p@ssw0rd`라는 값을 base64로 인코딩한 것에 불과합니다.

```bash
shawn@desktop:~$ echo YW4tZXhAbXBsZS1wQHNzdzByZA== | base64 -d
an-ex@mple-p@ssw0rd
```

위에서 생성한 `my-secrets.yaml` 파일을 GitHub 레파지토리와 같이 누구든지 접근할 수 있는 곳에 올리면, 누구나 손쉽게 Secrets에 저장된 값으로부터 원래의 값을 유추해 낼 수 있습니다.

퍼블릭 레파지토리에 올리면 말 그대로 **'누구든'** 접근할 수 있기 때문에 보안상 매우 취약하고, 프라이빗 레파지토리에 올린다고 하더라도 회사의 규모에 따라 사람들이 많이 접근할 수 있기 때문에 실수로 해당 파일을 외부로 유출할 수 있어서 보안상 좋지 않습니다.

## 보안 문제를 해결할 수 있는 SealedSecrets

이와 같은 쿠버네티스 Secrets의 보안상 취약점을 극복할 수 있는 방법은 HashiCorp Vault, AWS Secrets Manager, Azure Key Vault 등 다양한 대안이 존재합니다. 하지만 이번에는 클라우드 애그노스틱하고, CLI만 설치하면 누구나 쉽게 사용할 수 있는 SealedSecrets에 대해 알아보겠습니다.

SealedSecrets은 쿠버네티스 환경에서 민감한 데이터를 관리하기 위한 솔루션으로, Bitnami에서 개발되었습니다. 공식 GitHub Repository의 README를 보면 첫머리에 이렇게 쓰여 있습니다.

> "I can manage all my K8s config in git, except Secrets."
>
> Encrypt your Secret into a SealedSecret, which is safe to store - even inside a public repository.

즉, SealedSecrets은 쿠버네티스 클러스터에서 돌아가고 있는 컨트롤러에 의해서만 복호화가 가능합니다. 따라서 누군가가 SealedSecrets의 값만을 가지고 원래 Secrets의 값을 얻어내는 것은 불가능합니다. SealedSecrets은 클러스터에서 돌아가고 있는 컨트롤러와 클라이언트 사이드 유틸리티로 사용할 수 있는 Kubeseal로 구성되어 있는데, 이 Kubeseal 유틸리티가 Secrets을 암호화할 때 비대칭 암호화 방식을 사용하기 때문에 오직 컨트롤러만이 SealedSecrets을 복호화할 수 있습니다.

## SealedSecrets의 설치 및 사용

SealedSecrets을 사용하기 위해서는 (1) 쿠버네티스 클러스터에서 돌아갈 컨트롤러와 (2) 클라이언트 사이드 유틸리티로 사용할 Kubeseal CLI를 설치해야 합니다.

설치 방법은 [공식 GitHub repository](https://github.com/bitnami-labs/sealed-secrets)에 잘 나와 있습니다. 컨트롤러의 경우 Helm Chart를 이용하고, Kubeseal은 Homebrew를 활용해 설치할 수 있습니다.

`MY_PASSWORD=an-ex@mple-p@ssw0rd`라는 키 및 값을 갖는 `my-secrets`라는 Secrets을 `shawns-playground`라는 네임스페이스에 생성해 보겠습니다.

우선 `-o yaml` 및 `--dry-run=client` 옵션을 이용해서 Secrets의 YAML 매니페스트 파일을 생성합니다:

```bash
shawn@desktop:~$ kubectl create secret generic my-secrets \
  -n shawns-playground \
  --from-literal=MY_PASSWORD=an-ex@mple-p@ssw0rd \
  -o yaml --dry-run=client > my-secrets.yaml
```

그리고 나서, Kubeseal 명령어를 이용해서 위에서 생성한 Secrets을 SealedSecrets으로 암호화합니다:

```bash
shawn@desktop:~$ kubeseal -o yaml < my-secrets.yaml > my-sealedsecrets.yaml
```

위 명령어를 보면 `my-secrets.yaml` 파일을 인풋으로 받고 (`<`), Kubeseal로 암호화한 결과물을 `my-sealedsecrets.yaml`이라는 아웃풋 파일(`>`)로 내보낸다는 것을 알 수 있습니다.

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

`.spec.encryptedData`의 `MY_PASSWORD`에 담긴 복잡해 보이는 값이 바로 기존의 밸류인 `an-ex@mple-p@ssw0rd`를 SealedSecrets으로 암호화한 값입니다. 그리고 위에서 설명했듯이, 이 암호화된 값만을 가지고 원래 Secrets의 값을 얻어내는 것은 불가능합니다.

이제 원본 `my-secrets.yaml`을 삭제하고 SealedSecrets 매니페스트만으로 배포해 봅시다:

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

SealedSecrets 컨트롤러가 자동으로 SealedSecret을 복호화하여 Kubernetes Secret을 생성한 것을 확인할 수 있습니다:

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

이와 같이 SealedSecrets이 담겨있는 `my-sealedsecrets.yaml` 파일만을 이용해서 SealedSecrets은 물론, 쿠버네티스 Secrets까지 생성할 수 있습니다. 게다가 `my-sealedsecrets.yaml` 파일 안에 있는 값만으로는 원래의 Secrets 값을 유추해 낼 수도 없기 때문에, 이 파일을 GitHub 프라이빗 혹은 퍼블릭 레파지토리를 포함해 아무 곳에나 올려도 보안상으로 전혀 문제가 없습니다.

## 블럭스가 Kubeseal Scope를 활용하는 방법

실제로, 저희 팀이 운영 환경에서 쏠쏠하게 활용 중인 Kubeseal의 스코프 옵션에 대해 설명하고 글을 마무리하겠습니다.

SealedSecrets 생성을 위해 Kubeseal 명령어를 사용할 때, 다음 세 가지 Scope 옵션 중 하나를 선택할 수 있습니다:

- **strict (default)**: SealedSecrets을 생성할 때 미리 정한 Namespace 안에서 정해진 name으로 생성해야 합니다.
- **namespace-wide**: 주어진 Namespace 안에서는 SealedSecrets을 자유롭게 rename 할 수 있습니다.
- **cluster-wide**: SealedSecrets을 어떤 Namespace 안에서 어떤 name으로 생성하든 상관없습니다.

생성할 Secrets의 이름과 키 및 밸류 값은 미리 알고 있는데 해당 Secrets이 생성될 Namespace는 미리 알 수 없는 상황을 가정해봅시다. 그렇다면 해당 Secrets(SealedSecrets)은 Namespace가 정해질 때까지 기다렸다가 생성해야만 할까요? Secrets의 이름은 물론 키 및 밸류 값까지 미리 알고 있으니 그걸 이용해서 템플릿을 미리 만들어놨다가 생성될 Namespace가 정해지면 바로 SealedSecrets을 생성할 수는 없을까요?

물론 이 템플릿에는 Secrets의 밸류를 유추할 수 있는 보안 상 안전하지 않은 값이 들어있으면 안됩니다. 이런 상황에서 Kubeseal의 Scope 옵션을 적절히 활용한다면, Namespace나 Secrets의 이름을 미리 알지 못하더라도 SealedSecrets을 생성할 준비를 미리 할 수 있습니다.

위의 예시에서, Namespace를 별도로 지정해 주지 않고, Scope 옵션도 `cluster-wide`로 주고, SealedSecrets을 생성해 보겠습니다:

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

이렇게 만들어진 `my-cluster-wide-sealedsecrets.yaml`은 아무 Namespace에나 적용할 수 있습니다:

```bash
shawn@desktop:~$ kubectl apply -f my-cluster-wide-sealedsecrets.yaml
sealedsecret.bitnami.com/my-secrets created
shawn@desktop:~$ kubectl apply -f my-cluster-wide-sealedsecrets.yaml -n shawns-playground
sealedsecret.bitnami.com/my-secrets created
```

만약 Scope 옵션을 `strict`로 줬거나 아무것도 안 줬다면 (디폴트 옵션은 strict) 미리 정한 Namespace 안에서 정해진 이름으로 SealedSecrets을 생성해야 합니다:

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
# default namespace에 적용 — 성공
shawn@desktop:~$ kubectl apply -f my-strict-sealedsecrets.yaml
sealedsecret.bitnami.com/my-secrets created

# 다른 namespace에 적용 시도 — 실패
shawn@desktop:~$ kubectl apply -f my-strict-sealedsecrets.yaml -n shawns-playground
error: the namespace from the provided object "default" does not match
the namespace "shawns-playground". You must pass '--namespace=default'
to perform this operation.
```

이상으로 SealedSecrets의 사용법부터 이를 이용해서 어떻게 쿠버네티스 Secrets을 대체할 수 있는지, 그리고 Kubeseal의 Scope 옵션을 어떻게 활용할 수 있는지까지 살펴보았습니다. 이번 글이 쿠버네티스 Secrets을 보다 안전하게 관리하고 싶은 모든 개발자 분들에게 도움이 되었으면 좋겠습니다.

#### 참고 자료

- [SealedSecrets 공식 GitHub Repository](https://github.com/bitnami-labs/sealed-secrets)
