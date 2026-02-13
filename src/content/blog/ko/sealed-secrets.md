---
title: "GitHub Public Repository에 올려도 되는 안전한 Kubernetes Secrets, 'Sealed Secrets'"
description: "Kubernetes Secrets의 Base64 인코딩 취약점과 이를 해결하는 Bitnami의 SealedSecrets 사용법, 그리고 Kubeseal Scope 옵션 활용법을 다룹니다."
pubDate: 2024-01-16
heroImage: ../../../assets/sealed-secrets-hero.png
heroImageCaption: "썸네일 이미지"
tags: ["Kubernetes", "Security", "GitOps", "Secrets Management", "DevOps"]
---

> **원문:** 이 글은 [blux 기술 블로그](https://blog.blux.ai/sealed-secrets-github-public-repository%EC%97%90-%EC%98%AC%EB%A0%A4%EB%8F%84-%EB%90%98%EB%8A%94-%EC%95%88%EC%A0%84%ED%95%9C-kubernetes-secrets-17393)에 게시된 글을 저자의 개인 블로그에 재게시한 것입니다.

쿠버네티스(Kubernetes, 컨테이너화된 애플리케이션의 배포, 관리, 확장을 자동화하는 오픈 소스 플랫폼) 환경에서 서버를 운영하는 개발자라면 누구나 한 번쯤 '시크릿(Secrets, 비밀번호, OAuth 토큰, SSH 키 등의 민감한 정보)'이라는 리소스에 대해 알고 계실 겁니다.

오늘은 쿠버네티스 Secrets의 보안상의 문제와 이를 극복하기 위한 수단 중 하나인 '실드시크릿(SealedSecrets, 쿠버네티스 환경에서 민감한 데이터를 암호화하여 저장하고 관리하는 도구)'을 소개하고, SealedSecrets을 잘 활용하여 안전하게 쿠버네티스 Secrets을 관리할 수 있는 방법에 대해 소개해 보겠습니다.

## Kubernetes Secrets 및 이와 연관된 보안상의 문제

쿠버네티스에 변수를 저장하고 싶을 때, 상대적으로 민감하지 않은 정보는 '컨피그맵(ConfigMaps, 쿠버네티스에서 애플리케이션 설정 데이터를 저장하고 관리하는 개체)'에, 민감한 정보는 Secrets에 저장을 합니다. 기본적으로 ConfigMaps에는 데이터가 '일반 문서(Plain Text)'로 저장되고, Secrets에는 암호화된 데이터가 저장되기 때문입니다. ConfigMaps과 Secrets으로 저장할 수 있는 대표적인 값들은 다음과 같습니다.

- ConfigMaps: 서버의 이름, '피처 플래그(Feature Flags, 소프트웨어 개발에서 특정 기능을 켜고 끌 수 있는 플래그)' 등
- Secrets: API keys, DB Passwords 등

저희 팀에서는 '깃옵스(GitOps, 인프라 및 애플리케이션 배포를 깃 저장소를 통해 관리하는 운영 방식)' 전략을 적용하여 [ArgoCD](https://argo-cd.readthedocs.io/en/stable/)라는 툴을 이용해 쿠버네티스 클러스터 내의 모든 핵심적인 애플리케이션을 배포하고 있습니다. 때문에 애플리케이션의 '그라운드 트루스(Ground Truth, 정확하고 신뢰할 수 있는 실제 데이터)'가 되는 '매니페스트(Manifest, 쿠버네티스 클러스터에서 리소스를 생성하고 관리하기 위한 YAML 또는 JSON 형식의 설정 파일)' 파일들을 '깃허브 레파지토리(GitHub Repository, 깃허브에서 소스 코드, 파일 및 프로젝트 히스토리를 저장하고 관리하는 저장소)'에 올려서 관리하고 있습니다. 즉, 다음과 같은 YAML 파일들이 깃허브 레파지토리에 올라가는 것입니다.

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

그렇다면 Secrets에는 일반 문서가 아닌 암호화된 데이터가 저장된다고 했으므로 매니페스트 YAML 파일을 레파지토리에 그대로 올려도 보안상 문제가 없을까요? 안타깝게도 그렇지 않습니다. 놀랍게도, 쿠버네티스의 Secrets에는 데이터가 단순히 base64로 인코딩되어 들어갑니다.

예시로, 다음과 같이 '쿠브컨트롤(Kubectl, 쿠버네티스 클러스터와 상호 작용하기 위한 명령줄 인터페이스)' 명령어로 Secrets을 생성한 뒤 YAML 파일을 살펴보겠습니다.

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

참고로 `-o yaml` 옵션은 '아웃풋(Output)'을 YAML 형태로 내보내기 위한 것이고, `--dry-run=client` 옵션은 실제로 Secrets을 생성하진 않고 시뮬레이션해 보겠다는 의미로 해석하시면 됩니다.

얼핏 보기에는 MY_PASSWORD의 값 자리에 알아보기 힘든 값이 있어 보안상 안전해보입니다. 그러나 앞서 설명드렸듯이, 이 값은 단순히 `an-ex@mple-p@ssw0rd`라는 값을 base64로 인코딩한 것에 불과합니다. 따라서, 반대로 이 값을 base64로 디코딩하면 원래의 문자열을 얻을 수도 있습니다.

```bash
shawn@desktop:~$ echo YW4tZXhAbXBsZS1wQHNzdzByZA== | base64 -d
an-ex@mple-p@ssw0rd
```

즉, 위에서 생성한 `my-secrets.yaml` 파일을 깃허브 레파지토리와 같이 누구든지 접근할 수 있는 곳에 올리면, 누구나 손쉽게 Secrets에 저장된 값으로부터 원래의 값을 유추해 낼 수 있습니다.

'퍼블릭 레파지토리(Public Repository)'에 올리면 말 그대로 **'누구든'** 접근할 수 있기 때문에 보안상 매우 취약하고, '프라이빗 레파지토리(Private Repository)'에 올린다고 하더라도 회사의 규모에 따라 사람들이 많이 접근할 수 있기 때문에 실수로 해당 파일을 외부로 유출할 수 있어서 보안상 좋지 않습니다. 또한 프라이빗 레파지토리라고 하더라도 이에 접근할 수 있는 SSH key 등이 악의적인 사용자에 의해 탈취되었다면, 그것 역시 큰 문제라고 할 수 있습니다.

## 보안 문제를 해결할 수 있는 SealedSecrets

이와 같은 쿠버네티스 Secrets의 보안상 취약점을 극복할 수 있는 방법은 [HashiCorp Vault](https://www.vaultproject.io/), [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/), [Azure Key Vault](https://azure.microsoft.com/en-us/products/key-vault) 등 다양한 대안이 존재합니다. 하지만 이번에는 앞서 언급했듯이 '클라우드 애그노스틱(Cloud Agnostic, 특정 클라우드 서비스 제공 업체에 종속되지 않고, 여러 클라우드 환경에서 동일하게 작동할 수 있는 서비스)'하고, '커맨드라인인터페이스(Command Line Interface, 명령어를 입력하여 컴퓨터 프로그램을 제어하는 사용자 인터페이스, CLI)'만 설치하면 누구나 쉽게 사용할 수 있는 '실드시크릿([SealedSecrets](https://github.com/bitnami-labs/sealed-secrets))'에 대해 알아보겠습니다.

SealedSecrets은 쿠버네티스 환경에서 민감한 데이터를 관리하기 위한 솔루션으로, 'Bitnami(소프트웨어 애플리케이션 패키지를 제공하여 쉽게 설치하고 배포할 수 있도록 지원하는 회사)'에서 개발되었습니다. SealedSecrets의 [공식 GitHub Repository](https://github.com/bitnami-labs/sealed-secrets)의 README를 보면 첫머리에 이렇게 쓰여 있습니다.

> **Problem:** "I can manage all my K8s config in git, except Secrets."
>
> **Solution:** Encrypt your Secret into a SealedSecret, which is safe to store - even inside a public repository. The SealedSecret can be decrypted only by the controller running in the target cluster and nobody else (not even the original author) is able to obtain the original Secret from the SealedSecret.

> 문제: "쿠버네티스 설정을 깃으로 관리할 수 있지만, Secrets은 예외입니다."
>
> 해결책: Secrets을 암호화하여 SealedSecrets으로 변환하십시오. SealedSecrets은 안전하게 저장할 수 있으며, 심지어 공개 저장소에서도 안전합니다. SealedSecrets은 대상 클러스터에서 실행 중인 컨트롤러만 복호화할 수 있으며, 원본 작성자조차도 SealedSecrets에서 원본 데이터를 복구할 수 없습니다.

즉, SealedSecrets은 쿠버네티스 클러스터에서 돌아가고 있는 '컨트롤러(Controller, 제어 장치나 관리 장치)'에 의해서만 복호화가 가능합니다. 따라서 누군가가 SealedSecrets의 값만을 가지고 원래 Secrets의 값을 얻어내는 것은 불가능합니다. SealedSecrets은 클러스터에서 돌아가고 있는 컨트롤러와 '클라이언트 사이드 유틸리티(Client-Side Utility)'로 사용할 수 있는 '쿠베실(Kubeseal, 쿠버네티스 환경에서 SealedSecrets을 생성하고 관리하는 데 사용되는 도구)'로 구성되어 있는데, 이 Kubeseal 유틸리티가 Secrets을 암호화할 때 '어시메트릭 크립토(Asymmetric Crypto, 비대칭 암호화)' 방식을 사용하기 때문에 오직 컨트롤러만이 SealedSecrets을 복호화할 수 있습니다.

이제 본론으로 들어가서, 어떻게 SealedSecrets을 생성할 수 있는지, 그리고 이것으로 어떻게 쿠버네티스 Secrets을 대체할 수 있는지 알아보겠습니다.

## SealedSecrets의 설치 및 사용

SealedSecrets을 사용하기 위해서는 위에 설명한 것과 같이 (1) 쿠버네티스 클러스터에서 돌아갈 컨트롤러와 (2) 클라이언트 사이드 유틸리티로 사용할 Kubeseal CLI를 설치해야 합니다.

설치 방법은 [공식 GitHub repository](https://github.com/bitnami-labs/sealed-secrets#installation)에 잘 나와 있습니다. 저는 컨트롤러의 경우, '헬름 차트(Helm Chart, 쿠버네티스에서 애플리케이션을 정의하고 배포하기 위한 패키지 매니저 헬름에서 사용하는 템플릿)'를 이용했고, Kubeseal은 '홈브루(Homebrew, macOS와 리눅스에서 소프트웨어 패키지를 설치하고 관리하는 패키지 관리자)'를 활용해 설치했습니다. 이 두 가지가 성공적으로 설치되어있다고 가정하고, Kubeseal 명령어를 이용해서 SealedSecrets을 생성하는 방법을 알려드리겠습니다.

위의 예시에서와 같이 `MY_PASSWORD=an-ex@mple-p@ssw0rd`라는 '키(Key)' 및 '밸류(Value)' 값을 갖는 `my-secrets`라는 Secrets을 `shawns-playground`라는 '네임스페이스(namespace, 컴퓨팅에서 객체나 리소스를 그룹화하여 고유하게 식별할 수 있는 범위)'에 생성해 보겠습니다.

우선 위에서 사용했던 것과 같은 `-o yaml` 및 `--dry-run=client` 옵션을 이용해서 Secrets의 YAML 매니페스트 파일을 생성합니다.

```bash
shawn@desktop:~$ kubectl create secret generic my-secrets \
  -n shawns-playground \
  --from-literal=MY_PASSWORD=an-ex@mple-p@ssw0rd \
  -o yaml --dry-run=client > my-secrets.yaml
```

그리고 나서, Kubeseal 명령어를 이용해서 위에서 생성한 Secrets을 SealedSecrets으로 암호화합니다.

```bash
shawn@desktop:~$ kubeseal -o yaml < my-secrets.yaml > my-sealedsecrets.yaml
```

위 명령어를 보면 `my-secrets.yaml` 파일을 '인풋(Input)'으로 받고 (`<`), Kubeseal로 암호화한 결과물을 `my-sealedsecrets.yaml`이라는 '아웃풋(Output)' 파일(`>`)로 내보낸다는 것을 알 수 있습니다.

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

`.spec.encryptedData`의 `MY_PASSWORD`에 담긴 매우 복잡해 보이는 값이 바로 기존의 밸류인 `an-ex@mple-p@ssw0rd`를 SealedSecrets으로 암호화한 값입니다. 그리고 위에서 설명했듯이, 이 암호화된 값만을 가지고 원래 Secrets의 값을 얻어내는 것은 불가능합니다. 아래 명령어들을 통해 SealedSecrets으로 쿠버네티스 Secrets을 대체할 수 있다는 것을 보여드리겠습니다.

```bash
# 현재 shawns-playground namespace에는 아무런 Secrets도 생성되어 있지 않습니다.
# 만약 해당 namespace가 없다면 kubectl create namespace shawns-playground 명령어로 생성해주시기 바랍니다.
shawn@desktop:~$ kubectl get secrets -n shawns-playground
No resources found in shawns-playground namespace.
shawn@desktop:~$ ls
my-secrets.yaml my-sealedsecrets.yaml
# Kubernetes Secrets을 사용하지 않고 Sealed Secrets만으로 이를 대체할 것이므로 my-secrets.yaml 파일을 삭제합니다.
shawn@desktop:~$ rm my-secrets.yaml
shawn@desktop:~$ kubectl apply -f my-sealedsecrets.yaml
sealedsecret.bitnami.com/my-secrets created
# 이전에는 없었던 Kubernetes Secrets이 생겼습니다.
shawn@desktop:~$ kubectl get secrets -n shawns-playground
NAME        TYPE     DATA   AGE
my-secrets  Opaque   1      13s
# Sealed Secrets 역시 생겼습니다. Sealed Secrets을 생성하면 수 초 뒤에 Kubernetes Secrets이 자동으로 생성됩니다.
shawn@desktop:~$ kubectl get sealedsecrets -n shawns-playground
NAME        AGE
my-secrets  15s
# Secrets을 살펴보니, my-secrets.yaml에 담겨 있었던 an-ex@mple-p@ssw0rd가
# base64로 encoding된 값인 YW4tZXhAbXBsZS1wQHNzdzByZA==가 MY_PASSWORD의 value 자리에 들어가 있습니다.
# 이와 같이 Sealed Secrets을 통해 Kubernetes Secrets을 대체할 수 있습니다.
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

이와 같이 SealedSecrets이 담겨있는 `my-sealedsecrets.yaml` 파일만을 이용해서 SealedSecrets은 물론, 쿠버네티스 Secrets까지 생성할 수 있음을 확인했습니다. 게다가 `my-sealedsecrets.yaml` 파일 안에 있는 값만으로는 원래의 Secrets 값을 유추해 낼 수도 없기 때문에, 이 파일을 깃허브 프라이빗 혹은 퍼블릭 레파지토리를 포함해 아무 곳에나 올려도 보안상으로 전혀 문제가 없습니다.

## 블럭스가 Kubeseal Scope를 활용하는 방법

실제로, 저희 팀이 운영 환경에서 쏠쏠하게 활용 중인 Kubeseal의 '스코프(Scope, 범위)' 옵션에 대해 설명하고 글을 마무리하겠습니다.

SealedSecrets 생성을 위해 Kubeseal 명령어를 사용할 때, 다음 세 가지 Scope 옵션 중 하나를 선택할 수 있습니다.

- **strict (default)**: SealedSecrets을 생성할 때 미리 정한 Namespace 안에서 정해진 name으로 생성해야 합니다.
- **namespace-wide**: 주어진 Namespace 안에서는 SealedSecrets을 자유롭게 rename 할 수 있습니다.
- **cluster-wide**: SealedSecrets을 어떤 Namespace 안에서 어떤 name으로 생성하든 상관없습니다.

생성할 Secrets의 이름과 키 및 밸류 값은 미리 알고 있는데 해당 Secrets이 생성될 Namespace는 미리 알 수 없는 상황을 가정해봅시다. 그렇다면 해당 Secrets(SealedSecrets)은 Namespace가 정해질 때까지 기다렸다가 생성해야만 할까요? Secrets의 이름은 물론 키 및 밸류 값까지 미리 알고 있으니 그걸 이용해서 '템플릿(Template)'을 미리 만들어놨다가 생성될 Namespace가 정해지면 바로 SealedSecrets을 생성할 수는 없을까요?

물론 이 템플릿에는 Secrets의 밸류를 유추할 수 있는 보안 상 안전하지 않은 값이 들어있으면 안됩니다. 이런 상황에서 Kubeseal의 Scope 옵션을 적절히 활용한다면, Namespace나 Secrets의 이름을 미리 알지 못하더라도 SealedSecrets을 생성할 *준비*를 미리 할 수 있습니다.

위의 예시에서, Namespace를 별도로 지정해 주지 않고, Scope 옵션도 `cluster-wide`로 주고, SealedSecrets을 생성해 보겠습니다.

```bash
# .metadata에 namespace가 명시되어 있지 않습니다.
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
# .metadata.annotations에 cluster-wide 옵션임이 명시되고, Secrets와 마찬가지로 별도의 namespace는 명시되어 있지 않습니다.
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

이렇게 만들어진 `my-cluster-wide-sealedsecrets.yaml`은 아무 Namespace에나 적용할 수 있습니다.

```bash
shawn@desktop:~$ kubectl apply -f my-cluster-wide-sealedsecrets.yaml
sealedsecret.bitnami.com/my-secrets created
shawn@desktop:~$ kubectl apply -f my-cluster-wide-sealedsecrets.yaml -n shawns-playground
sealedsecret.bitnami.com/my-secrets created
```

만약 Scope 옵션을 '스트릭트(Strict)'로 줬거나 아무것도 안 줬다면 (디폴트 옵션은 스트릭트) 미리 정한 Namespace 안에서 정해진 이름으로 SealedSecrets을 생성해야 합니다.

```bash
# my-secrets.yaml 파일을 만들 때 별도의 namespace를 지정해주지 않았기 때문에 자동으로 default namespace로 적용되었습니다.
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
# default namespace에서는 Sealed Secrets이 잘 생성됩니다.
shawn@desktop:~$ kubectl apply -f my-strict-sealedsecrets.yaml
sealedsecret.bitnami.com/my-secrets created
# 그 외의 namespace에서는 Sealed Secrets이 생성되지 않습니다.
shawn@desktop:~$ kubectl apply -f my-strict-sealedsecrets.yaml -n shawns-playground
error: the namespace from the provided object "default" does not match
the namespace "shawns-playground". You must pass '--namespace=default'
to perform this operation.
```

이상으로 SealedSecrets의 사용법부터 이를 이용해서 어떻게 쿠버네티스 Secrets을 대체할 수 있는지, 그리고 Kubeseal의 Scope 옵션을 어떻게 활용할 수 있는지까지 살펴보았습니다. 이번 글이 쿠버네티스 Secrets을 보다 안전하게 관리하고 싶은 모든 개발자 분들에게 이 글이 도움이 되었으면 좋겠습니다.

긴 글 읽어주셔서 감사합니다!

#### 참고 자료

- [SealedSecrets 공식 GitHub Repository](https://github.com/bitnami-labs/sealed-secrets)
