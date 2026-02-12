---
title: "무중단으로 EKS 클러스터 버전 업그레이드하기"
description: "Blue-Green 배포 방식을 활용하여 서비스 중단 없이 EKS 클러스터 버전을 업그레이드하는 단계별 가이드를 다룹니다."
pubDate: 2024-08-12
heroImage: ../../../assets/eks-cluster-upgrade-hero.jpg
heroImageCaption: "썸네일 이미지"
tags: ["AWS", "Kubernetes", "EKS", "Zero-Downtime Deployment", "DevOps"]
---

> **원문:** 이 글은 [blux 기술 블로그](https://blog.blux.ai/%EB%AC%B4%EC%A4%91%EB%8B%A8%EC%9C%BC%EB%A1%9C-eks-%ED%81%B4%EB%9F%AC%EC%8A%A4%ED%84%B0-%EB%B2%84%EC%A0%84-%EC%97%85%EA%B7%B8%EB%A0%88%EC%9D%B4%EB%93%9C%ED%95%98%EA%B8%B0-25859)에 게시된 글을 저자의 개인 블로그에 재게시한 것입니다.

## EKS란 무엇인가요?

블럭스에서는 2023년 5월부터 대부분의 서비스를 쿠버네티스(Kubernetes) 환경에서 운영하기 시작했습니다.

특히 저희는 AWS 클라우드 서비스를 주로 사용하기 때문에 아마존 EKS(Amazon Elastic Kubernetes Service)를 통해 쿠버네티스 클러스터를 운영하였습니다.

EKS는 자체 쿠버네티스 컨트롤 플레인을 설치 및 운영할 필요 없이 쿠버네티스를 손쉽게 실행할 수 있도록 지원하는 관리형 서비스입니다. EKS는 복잡한 컨트롤 플레인의 관리를 사용자 대신 맡아주면서도 가격이 저렴한편이기 때문에 널리 사용되고 있습니다. 구체적으로, 클러스터 하나에 시간당 $0.10(한화 약 138원)의 비용이 부과되는데, 한 달 기준으로는 약 $72(한화 약 9만9,100원)입니다.

## 왜 EKS 클러스터 버전을 업그레이드해야 할까요?

EKS를 운영하는 사람이라면 누구나 14개월마다 한 번씩 찾아오는 중대 이벤트에 긴장하기 마련입니다. 바로 'EKS 클러스터 버전 업그레이드'입니다. 쿠버네티스는 지금 이 순간에도 커뮤니티에서 매우 빠른 속도로 개발되고 있는데, 평균적으로 4개월에 한 번씩 마이너 버전이 출시됩니다.

EKS도 기본적으로 이러한 출시 주기를 따르는데, 마이너 버전은 출시 후 처음 14개월 동안은 표준 지원(Standard Support) 하에서 저렴한 비용(클러스터 하나에 시간당 $0.10)으로 이용이 가능합니다. 그러나 해당 버전의 표준 지원이 종료된 이후에는 자동으로 다음 12개월 동안 추가 지원(Extended Support)을 받게 되는데, 이때는 더욱 비싼 비용(클러스터 하나에 시간당 $0.60, 한화 약 826원)을 지불해야 합니다. 그리고 추가 지원마저 종료된 다음에는 클러스터가 현재 추가 지원되는 버전 중 가장 오래된 버전으로 자동 업그레이드됩니다.

클러스터의 버전이 자동으로 업그레이드되면 기업에서 운영하는 서비스가 일시적으로 중단될 위험이 있기 때문에 이러한 강제 버전 업그레이드 혹은 비싼 추가 지원을 피하기 위해서는 표준 지원 종료일을 미리 파악하고 버전 업그레이드를 위한 준비 작업을 할 필요가 있습니다.

| 쿠버네티스 버전 | 업스트림 릴리스 | 아마존 EKS 릴리스 | 표준 지원 종료일 | 추가 지원 종료일 |
|---|---|---|---|---|
| 1.30 | 2024년 4월 17일 | 2024년 5월 23일 | 2025년 7월 23일 | 2026년 7월 23일 |
| 1.29 | 2023년 12월 13일 | 2024년 1월 23일 | 2025년 3월 23일 | 2026년 3월 23일 |
| 1.28 | 2023년 8월 15일 | 2023년 9월 26일 | 2024년 11월 26일 | 2025년 11월 26일 |
| 1.27 | 2023년 4월 11일 | 2023년 5월 24일 | 2024년 7월 24일 | 2025년 7월 24일 |
| 1.26 | 2022년 12월 9일 | 2023년 4월 11일 | 2024년 6월 11일 | 2025년 6월 11일 |
| 1.25 | 2022년 8월 23일 | 2023년 2월 22일 | 2024년 5월 1일 | 2025년 5월 1일 |

블럭스는 2023년 5월, 대부분의 애플리케이션을 쿠버네티스 환경으로 옮기면서 버전 1.26의 EKS 클러스터를 사용하고 있었습니다. 표에 나와 있듯이 버전 1.26의 표준 지원 종료일이 2024년 6월 11일이었습니다. 따라서 저희는 2024년 5월 23일 출시된 버전 1.30으로 미리 클러스터 업그레이드를 준비하고 있었습니다.

이미 저희는 클러스터 내 애플리케이션들을 통해 클라이언트들에게 활발하게 서비스를 제공하고 있었기 때문에, 이러한 서비스에 아무런 영향을 미치지 않고 버전을 업그레이드하는 것이 매우 중요했습니다.

이런 식으로 소프트웨어나 애플리케이션을 업데이트하거나 새로운 버전으로 업그레이드할 때 중단 없이 서비스를 계속 제공하는 배포 방식을 '**무중단 배포(Zero-downtime Deployment)**'라고 합니다.

## 무중단 업그레이드를 위한 블럭스의 선택, 'Blue-Green 배포'

EKS 클러스터 버전을 업그레이드하는 데에는 크게 두 가지 방법이 있습니다.

(1) 해당 클러스터의 버전을 직접 업그레이드합니다. 단, 버전 업그레이드는 한 번에 한 단계만 할 수 있기 때문에 순차적으로 1.26 -> 1.27 -> 1.28 -> 1.29 -> 1.30 로 업그레이드해야 합니다.

(2) 최신 버전(1.30)의 클러스터와 필요한 모든 애플리케이션 등을 새로 생성하고, 구버전의 클러스터로 향하던 트래픽을 새로운 클러스터로 향하게끔 전환합니다. 즉, 클러스터를 이사하는 방식입니다. 이후 구버전의 클러스터 및 애플리케이션 등의 자원은 정리합니다.

첫 번째 방법은 새로운 클러스터를 생성하지 않기 때문에 추가 비용이 들지 않고 별도로 트래픽을 건드릴 필요가 없습니다. 하지만 클러스터의 버전을 직접 업그레이드하는 과정에서 서비스의 안정성이 떨어질 우려가 있고, 버전 업그레이드를 한 번에 한 단계씩만 해야하기 때문에 같은 작업을 총 4번 반복해야 한다는 단점이 있습니다.

두 번째 방법은 새로운 클러스터를 생성하고 트래픽을 전부 옮길 때까지 관련 비용이 2배만큼 들긴 하지만, 서비스 안정성 측면에서 가장 좋습니다. 특히 배포 과정에서 문제가 발생할 경우, 손쉽게 롤백이 가능합니다. 고객 경험을 최우선으로 생각하는 블럭스에서는 클러스터 버전을 업그레이드하기 위해 클러스터 자체를 이사하는 두 번째 방법을 택하였습니다.

저희가 택한 두 번째 방법을 '**Blue-Green 배포(Blue-Green Deployment) 방식**'이라고 부릅니다. Blue-Green 배포 방식이란, 기존의 환경(Blue)과 구성은 동일하나 버전만 최신인 새로운 환경(Green)을 구축하고, Blue 환경으로 향하던 트래픽을 Green 환경으로 향하게끔 전환하는 형태의 배포 방식입니다.

이때 Green 환경의 구성을 Blue 환경과 완전히 동일하게 할 필요는 없고, 경우에 따라 내부적으로 사용되는 오픈 소스 등의 업데이트가 함께 진행될 때도 있습니다. 물론 최종적으로 여러 테스트와 검증을 통해 Green 환경에서도 모든 애플리케이션이 의도한 대로 작동하는지 확인해야 합니다.

<!-- TODO: replace with actual image -->
*블럭스 EKS 클러스터 아키텍처*

일반적으로 Blue-Green 배포 방식의 장점은 다음과 같습니다.

(1) **서비스 중단 최소화:** 트래픽을 전환하는 방식이기 때문에 서비스 중단 없이 새로운 버전을 배포할 수 있습니다.

(2) **신속한 롤백:** 문제가 발생할 경우 트래픽을 다시 이전 버전의 Blue 환경으로 빠르게 돌릴 수 있기 때문에 안전한 배포가 가능합니다.

(3) **안전한 테스트 및 검증:** Green 환경에서 실제 서비스가 제공되는 환경과 매우 유사한 조건 하에 새로운 버전을 테스트하고 검증할 수 있어서 배포 전에 미리 문제를 파악하고 수정할 수 있습니다.

(4) **점진적 전환:** 트래픽을 Green 환경으로 조금씩 이동시킴으로써 새로운 버전을 적용했을 때의 문제를 최소화할 수 있습니다.

이번 클러스터 버전 업그레이드 작업에서도 사전에 최대한 여러 테스트와 검증 작업을 거쳐 최신 버전의 클러스터에서 문제가 생기지 않도록 준비했습니다. 다만 혹시 문제가 생기더라도 신속하게 복구할 수 있어야 했기 때문에 저희는 비용이 더 많이 들더라도 이 방법을 선택하였습니다.

## 실제 블럭스 Blue-Green 배포 방식

이제 저희가 실제로 어떻게 Blue-Green 배포 방식을 적용해서 클러스터 버전 업그레이드 작업을 진행했는지 3단계로 나누어서 설명하겠습니다. 3단계는 각각 (1) 새로운 클러스터 및 애플리케이션을 생성하고 검증하는 단계, (2) 구버전의 클러스터에서 새로운 클러스터로 트래픽을 점진적으로 전환하는 단계, 그리고 (3) 구버전의 클러스터 및 애플리케이션 등의 자원을 정리하는 단계입니다.

### (1) 새로운 클러스터 및 애플리케이션을 생성하고 검증하는 단계

Green 환경에 해당하는 최신 버전(1.30)의 클러스터를 생성하는 단계입니다. 클러스터를 생성하는 방법에는 여러 가지가 있지만, 저희는 주요 자원들을 IaC로 관리하고 있기 때문에 테라폼(Terraform)이라는 툴을 사용했습니다.

테라폼은 인프라를 코드로 관리할 수 있게 해주는 오픈 소스 툴로, 이를 이용해 클라우드 인프라의 정의 및 버전 관리, 자동 프로비저닝 등을 할 수 있습니다.

아래 코드 1은 테라폼의 EKS 모듈을 활용하여 최신 버전의 클러스터를 프로비저닝하는 소스 코드 중 일부입니다.

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

코드 1을 보면 클러스터 이름, 클러스터 버전, VPC ID, Subnet IDs 등은 변수로 처리하는 것을 알 수 있습니다. 여기서 클러스터 버전에 해당하는 `k8s_version`이라는 변수에 `1.30`이라는 값을 넣어주면 됩니다.

다음으로 새로운 클러스터에 이미 사용 중인 클러스터와 동일한 구성을 갖추어야 합니다. 동일한 구성이란 배포되어 있는 블럭스의 서비스와 관련한 모든 애플리케이션은 물론이고 DevOps 및 MLOps 서비스에 필요한 모든 애플리케이션을 의미합니다.

블럭스 서비스와 관련한 애플리케이션에는 블럭스 상품추천 제품의 주요 API인 Collector API, ML API, Recommender API 등이 있고, DevOps 및 MLOps 서비스와 관련한 애플리케이션에는 머신러닝 파이프라인 구축과 시스템 모니터링 등에 필요한 Airflow, Jenkins, Argo CD, Prometheus, Grafana 등이 있습니다.

클러스터의 구성 요소는 각 회사마다 상이하기 때문에 **미리 담당자를 통해 어떤 애플리케이션이 클러스터에 배포되어 있는지 파악해 두는 것이 중요합니다.**

새로운 클러스터에 기존 클러스터와 동일한 구성을 갖추는 방법 역시 매우 다양합니다. 저희는 앞서 언급했듯이 주요 자원들을 IaC로 관리하고 있기 때문에, Argo CD를 활용한 깃옵스(GitOps) 전략을 택했습니다.

이 전략을 활용하면 Argo CD가 깃 저장소와 쿠버네티스 클러스터의 상태를 일정 주기마다 자동으로 동기화합니다. 구성 요소 관리의 일관성과 높은 자동화율 등의 이유로 이미 많은 회사가 이 방식을 택하고 있습니다. 그러나 이번 글의 주제는 무중단 클러스터 버전 업그레이드이기 때문에 여기서는 저희가 어떻게 이 전략을 적용하고 있는지 간단한 예시만 들고 넘어가겠습니다.

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

*코드 2: Argo CD가 일정 주기로 동기화하는 애플리케이션의 예시*

코드 2는 실제로 저희가 깃 저장소에 저장하여 사용 중인 YAML 파일에서 일부 정보만 지운 것입니다. Argo CD는 이 파일을 읽어서 클러스터에 자동으로 해당 애플리케이션을 배포해 줍니다. `.spec.source.repoURL`에 명시되어 있는 깃 저장소에서 `.spec.source.path`의 경로에 가보면, `Chart.yaml`, `values.yaml` 등을 갖춘 헬름 차트가 있고, 그 안에 필요한 자원이나 하위 차트 등이 선언적으로 정의되어 있습니다. 이런 식으로 헬름 차트를 이용하는 방법도 있고, 쿠버네티스 자원을 직접 선언한 매니페스트 파일을 이용하는 방법도 있습니다.

블럭스에서 사용하는 기존 클러스터에는 이미 Argo CD가 배포되어 있고, Argo CD가 `blux-architecture-v1` 라는 깃 저장소에 연결되어 있습니다. 이 깃 저장소에는 코드 2와 같은 파일들과 그에 대응하는 헬름 차트들이 애플리케이션의 개수만큼 존재합니다. 저희는 이 저장소를 복제하여 `blux-architecture-v2` 라는 새로운 저장소를 만들었고, 새로운 클러스터에 Argo CD를 배포한 후 이 저장소에 연결했습니다. 모든 애플리케이션을 동일하게 생성해야하기 때문에 이와 같은 방법을 택하였습니다.

다만 주의할 점은 외부에 URL로 노출되는 애플리케이션들의 경우, 동일한 URI를 사용할 수 없기 때문에 새로운 깃 저장소에서는 이 값을 수정해야 합니다.

그리고 저희처럼 쿠버네티스의 Ingress와 AWS의 ALB(Application Load Balancer)를 이용해서 외부 트래픽을 처리한다면, ALB 이름도 새로 정해야합니다.

예를 들어, 기존 클러스터에서 `example`이라는 애플리케이션을 서빙하기 위해 `example.blux.ai` 라는 URI와 `example-alb` 라는 이름의 ALB를 사용하고 있다면, 새로운 클러스터에서는 임시로 URI는 `example-temp.blux.ai` 를, ALB 이름은 `example-temp-alb` 를 사용하는 식입니다.

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

*코드 3: 기존 클러스터(위)와 새로운 클러스터(아래)의 Ingress에서 각기 다른 URI와 ALB 이름을 사용하는 예시*

모든 애플리케이션을 새로운 클러스터에도 동일하게 생성하고 나면, 각종 테스트를 통해 새로운 환경에서도 애플리케이션이 문제없이 작동하는지 검증해야 합니다. 이때 애플리케이션을 개발할 때 작성해 두었던 테스트 코드를 활용할 수 있습니다.

그리고 쿠버네티스 버전에 대한 검증도 해야 하는데, 체인지로그를 쿠버네티스 릴리스 히스토리에서 확인해 볼 수 있습니다.

여기에서 지원이 중단된 API 등을 확인할 수 있는데, 그 양이 너무 방대하다면 [Kube No Trouble](https://github.com/doitintl/kube-no-trouble)이라는 툴을 사용하는 것도 좋은 방법입니다. Kube No Trouble은 쿠버네티스 클러스터에서 사용 중인 API 중 더 이상 지원되지 않는 것을 손쉽게 감지할 수 있도록 돕는 툴입니다. 이렇게 애플리케이션, 쿠버네티스 버전 등에 대한 검증을 모두 마치고 나면, 트래픽을 전환하기 위한 준비가 거의 끝났습니다.

### (2) 구버전에서 새로운 클러스터로 트래픽을 점진적으로 전환하는 단계

본격적으로 트래픽을 전환하기에 앞서, 저희가 쿠버네티스 클러스터에서 DNS 관리를 간소화하고 자동화하기 위해 사용하고 있는 ExternalDNS라는 툴에 대해 설명하겠습니다.

ExternalDNS는 쿠버네티스 클러스터에서 외부 DNS 제공자(AWS 등)와 통합하여 DNS 레코드를 자동으로 관리하는 툴로, 이를 통해 쿠버네티스의 Service 객체와 Ingress 객체에 대한 DNS 레코드를 자동으로 생성, 업데이트, 삭제할 수 있습니다.

특히 블럭스에서는 쿠버네티스의 Ingress 객체와 ExternalDNS를 연동하여, 아마존 Route 53에 DNS 레코드를 자동으로 생성하거나 업데이트하는 데 이를 활용하고 있습니다. 코드 3에 작성한 것처럼 `.metadata.annotations`와 `.spec.rules[].host`에 적절한 값을 넣어서 이를 적용하면, ExternalDNS가 자동으로 Route 53의 미리 지정된 호스팅 영역에 레코드를 생성해 줍니다.

ExternalDNS는 클러스터 내 리소스와 외부 DNS의 상태를 일정 주기마다 자동으로 동기화하기 때문에 평소에는 매우 편리합니다. 하지만 트래픽 전환 작업 등을 할 때와 같이 사용자가 직접 DNS의 상태에 개입해야 할 때에는 오히려 불편합니다. 따라서 만약 클러스터에서 ExternalDNS를 사용 중이라면 트래픽 전환 작업을 하기에 앞서 양 클러스터에 배포되어 있는 ExternalDNS를 먼저 중단해야 합니다.

ExternalDNS를 중단하고 나서 트래픽 전환 작업을 하기 전에 새로운 클러스터에서 수정해야 할 것이 하나 더 있습니다. 바로 코드 3에 나타낸 Ingress의 `.spec.rules[].host` 에 들어갈 값입니다. 현재는 `example-temp.blux.ai`가 들어가 있는데, 이를 구버전의 클러스터에서와 같이 `example.blux.ai`로 변경해주어야합니다.

나중에 모든 트래픽 전환 작업이 끝난 뒤에 ExternalDNS를 새로운 클러스터에 다시 배포해야 하는데, 이때 ExternalDNS가 클러스터의 리소스와 DNS의 상태를 자동으로 동기화할 때 문제없도록 하기 위함입니다. 특히 저희는 궁극적으로 `example.blux.ai` 라는 DNS 레코드만을 Route 53 상에 남겨둘 것이기 때문입니다. 지금은 ExternalDNS가 배포되어 있지 않아서 Ingress의 해당 부분을 변경하여도 자동으로 Route 53에 반영이 되지 않기 때문에 걱정하지 않으셔도 됩니다.

여기까지 마치고 나면, 이제는 실제로 구버전의 클러스터로 향하던 트래픽을 새로운 클러스터로 향하게끔 옮길 차례입니다.

계속해서 코드 3에서와 같이 `example`이라는 애플리케이션을 서빙하기 위해 `example.blux.ai`라는 Route 53 레코드(새로운 클러스터에서는 `example-temp.blux.ai`)와 `example-alb`라는 ALB(새로운 클러스터에서는 `example-temp-alb`)를 사용하는 상황을 가정하겠습니다. 다른 애플리케이션도 이와 같은 절차로 진행하면 됩니다. 현재 상황을 표로 표현하면 아래와 같습니다.

| 구분 | Route 53 레코드 이름 | 연결되어 있는 ALB 이름 | 외부 트래픽이 향하고 있는지 여부 |
|---|---|---|---|
| 1 | example.blux.ai | example-alb | O |
| 2 | example-temp.blux.ai | example-temp-alb | X |

여러 번 언급했듯이, 1번 Route 53 레코드 및 ALB와 연결되어 있는 애플리케이션은 구버전의 클러스터에 배포되어 있는 것이고, 2번 Route 53 레코드 및 ALB와 연결되어 있는 애플리케이션은 새로운 클러스터에 배포되어 있는 것입니다. 저희의 최종적인 목표는, 구버전의 클러스터에 배포되어 있는 애플리케이션으로 향하는 외부 트래픽을 전부 새로운 버전의 클러스터에 배포되어 있는 애플리케이션으로 향하도록 옮기는 것입니다.

<!-- TODO: replace with actual image -->
*Blue-Green 배포 전략*

위 표의 상황처럼 동일한 일을 하는 애플리케이션에 연결된 Route 53 레코드의 이름이 다른데 이를 똑같이 맞춰주고 싶을 때 사용하기 적합한 기능이 있습니다. 바로 Route 53의 '**가중치 기반 라우팅(Weighted Routing)**'입니다. 가중치 기반 라우팅은 Route 53에서 제공하는 트래픽 관리 방식 중 하나로, 여러 애플리케이션에 대해 트래픽을 비율에 따라 분배할 수 있게 해줍니다. 이를 통해 사용자는 특정 애플리케이션에 더 많은 트래픽을 유도하거나 새로운 애플리케이션 버전으로 트래픽을 점진적으로 전환하는 등의 시나리오를 구현할 수 있습니다.

가중치 기반 라우팅의 구체적인 작동 방식은 다음과 같습니다. 사용자가 Route 53에서 각 애플리케이션에 대해 동일한 이름의 레코드를 생성하면, Route 53은 해당 레코드들의 가중치 합계에 비례하여 트래픽을 분산시킵니다.

예를 들어, 두 개의 애플리케이션에 연결된 레코드에 각각 1과 3의 가중치를 설정하면, 첫 번째 애플리케이션은 25%의 트래픽을 받고 두 번째 애플리케이션은 75%의 트래픽을 받게 됩니다. 각 레코드와 연결된 애플리케이션이 받는 트래픽을 수식으로 표현하면 다음과 같습니다.

> 각 레코드와 연결된 애플리케이션이 받는 트래픽 = (해당 레코드의 가중치 / 모든 레코드의 가중치 합계) × 100%

`example` 애플리케이션에 대해 가중치 기반 라우팅을 적용하는 방법은 다음과 같습니다. 우선, 기존 레코드인 `example.blux.ai`의 라우팅 정책을 단순 라우팅에서 가중치 기반 라우팅으로 수정하고, 가중치에는 0보다 큰 값(e.g., 100)을 입력합니다. 레코드 ID에는 고유한 식별자(e.g., `example-record-old`)를 입력합니다.

다음으로는 새로운 레코드인 `example-temp.blux.ai`의 레코드 이름을 `example.blux.ai`로 수정하고, 마찬가지로 라우팅 정책을 단순 라우팅에서 가중치 기반 라우팅으로 수정합니다. 이때 가중치에는 0을 입력합니다. 아직 외부 트래픽이 새로운 레코드로 전달되기를 원치 않기 때문입니다. 레코드 ID에는 역시 이 레코드를 가리키는 유일한 식별자(e.g., `example-record-new`)를 입력합니다.

현재까지는 아직 모든 외부 트래픽이 위 표에서와 같이 기존 레코드에 연결되어 있는 애플리케이션으로만 향하는 상태입니다. 이제 새로운 레코드의 가중치를 조정합니다. 0보다 큰 값을 입력하면 되는데, 기존 레코드에서 입력했던 가중치와의 비율대로 트래픽이 분산되어 전달되게 됩니다. 예를 들어 10을 입력하면, 계산대로 기존 레코드와 새로운 레코드에 각각 100/(100+10), 10/(100+10)의 비율대로 트래픽이 전달됩니다. 처음에는 새로운 레코드에 적은 비율의 트래픽이 향하게 하는 것이 안전하므로, 가중치에 상대적으로 작은 숫자를 입력합니다.

만약 문제가 없다면, 새로운 레코드의 가중치를 조금씩 늘려서 점진적으로 새로운 레코드로 향하는 트래픽의 비율을 늘리는 것이 좋습니다. 중요한 애플리케이션일수록 가중치를 천천히, 조금씩 늘리는 것이 안전합니다.

저희는 양쪽 클러스터를 계속 모니터링하면서 기존 레코드와 새로운 레코드로 향하는 트래픽의 비율을 1:0에서 시작하여 10:1, 10:2, …, 1:10으로 점진적으로 바꾸었습니다. 이렇게 해도 문제가 없다면 최종적으로 기존 레코드의 가중치에 0을 입력하여 기존 레코드로 향하는 트래픽을 전부 새로운 레코드로 향하게끔 전환해주면 됩니다.

그러나 기존 레코드의 가중치에 0을 입력했다고 해서 그곳으로 향하던 트래픽이 한 번에 전부 사라지는 것은 아닙니다. 이는 DNS 캐싱 때문입니다. 구체적으로 설명하자면 다음과 같습니다.

클라이언트와 DNS 리졸버는 DNS 쿼리 결과를 캐싱하여 성능을 최적화합니다.

이 경우, 이들은 레코드의 TTL(Time to Live) 기간 동안 이전의 DNS 응답을 캐싱하고 있기 때문에 기존 레코드로의 트래픽이 계속 유지될 수 있습니다. 즉, DNS 레코드의 TTL이 만료되기 전에는 캐시된 정보가 새롭게 갱신되지 않기 때문에 변경 사항이 즉시 반영되지 않을 수 있습니다.

일반적으로 DNS 변경 사항은 수 분에서 수 시간 이내에 전 세계적으로 반영되지만, 최악의 경우에는 최대 48시간까지도 걸릴 수 있습니다. 그래서 기존 레코드의 가중치를 0으로 변경했다고 해서 해당 레코드를 바로 삭제해서는 안 됩니다. 저희는 Prometheus, Grafana와 같은 모니터링 툴을 통해 수 시간 동안 기존 애플리케이션으로 요청이 전혀 들어오지 않는다는 것을 확실히 확인한 후 기존 레코드를 삭제했습니다. 만약 모니터링을 하기 어려운 상황이라면, 마음 편히 48시간 후에 기존 레코드를 삭제하는 것도 좋은 방법입니다.

기존 레코드를 삭제하였으면, 새로운 레코드의 라우팅 정책을 가중치 기반 라우팅에서 단순 라우팅으로 다시 수정합니다. 이제 이 레코드가 `example` 애플리케이션과 연결된 유일한 레코드입니다. 그 다음 첫 단계에서 잠시 내려두었던 ExternalDNS를 다시 새로운 클러스터에만 배포합니다. 앞서 설명했듯이 ExternalDNS는 클러스터 내 리소스와 외부 DNS의 상태를 일정 주기마다 자동으로 동기화하는데, 저희는 이미 앞서 새로운 클러스터 내 Ingress의 `.spec.rules[].host`에 최종적으로 원하는 URI(i.e., `example.blux.ai`)를 넣어준 바 있습니다. 또한 이에 해당하는 Route 53 레코드 역시 이미 만들어져있기 때문에 해당 클러스터에 ExternalDNS를 다시 배포하더라도 전혀 문제가 발생하지 않습니다.

### (3) 구버전의 클러스터 및 애플리케이션 등의 자원을 정리하는 단계

새로운 클러스터로 모든 트래픽을 옮긴 이후에는 한층 편안한 마음으로 구버전의 클러스터와 그 안에 배포되어 있는 애플리케이션을 정리하면 됩니다. 저희는 Ingress를 가장 먼저 삭제했고, 그 다음에는 Argo CD와 연결된 깃 저장소(`blux-architecture-v1`)에서 애플리케이션 파일들을 삭제했습니다. 그러면 깃옵스 전략에 따라 Argo CD가 자동으로 클러스터에서 해당 애플리케이션들을 삭제해줍니다.

마지막으로는 EC2 인스턴스와 EKS 클러스터를 삭제했는데, 혹시 스토리지 볼륨에서 백업해야 할 것들이 있다면 그 전에 미리 백업해 두시기 바랍니다.

## 무중단 업그레이드에 성공했나요?

지난 6월, 저희는 위에 나열한 세 단계를 거쳐 EKS 클러스터 버전을 무중단으로 1.26에서 1.30으로 업그레이드하는 데 성공했습니다. 저희는 B2B SaaS 기업인만큼, 만약 작업 중에 문제가 생긴다면 저희 클라이언트들의 수백만 명 고객들에게 직접적인 영향을 줄 수 있었기 때문에 다소 부담이 되었던 것도 사실입니다. 그러나 수행해야 할 작업과 그 순서를 명확히 파악했고, 본격적인 작업에 앞서 약 두 달 동안 IaC와 각종 테스트를 통해 준비했기 때문에 괜찮을 것이라고 판단했습니다.

결과적으로 미리 꼼꼼히 준비를 하고 실제 수행할 작업들을 구체적으로 목록화해 둔 덕분에 EKS 클러스터 버전 업그레이드 작업을 문제없이 마무리할 수 있었습니다. 서두에서 언급했듯이, 이 작업은 한 번만 하고 끝나는 작업이 아니라, 약 14개월마다 한 번씩 주기적으로 수행해야 하는 작업입니다.

따라서 코드의 재현 가능성을 높이기 위해 IaC와 깃옵스를 통한 인프라 및 애플리케이션 관리에 특히 신경을 썼습니다. 덕분에 또 업그레이드할 때가 되면, 더 효율적이고 안정적으로 수행할 수 있는 자신감이 생겼습니다.

앞으로도 이러한 체계적인 접근 방식을 통해 클라이언트들에게 최상의 서비스를 제공하기 위해 노력하겠습니다.
