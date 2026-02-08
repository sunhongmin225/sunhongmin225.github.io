---
title: "Argo CD와 깃옵스를 활용한 블럭스의 쿠버네티스 자원 관리 노하우"
description: "Argo CD와 GitOps를 활용하여 블럭스가 어떻게 쿠버네티스 자원 관리의 효율성과 안정성을 향상시켰는지 알아보세요."
pubDate: 2025-02-06
heroImage: ../../../assets/argocd-gitops-kubernetes-hero.png
heroImageCaption: "썸네일 이미지"
---

> **원문:** 이 글은 [blux 기술 블로그](https://blog.blux.ai/argo-cd%EC%99%80-%EA%B9%83%EC%98%B5%EC%8A%A4%EB%A5%BC-%ED%99%9C%EC%9A%A9%ED%95%9C-%EB%B8%94%EB%9F%AD%EC%8A%A4%EC%9D%98-%EC%BF%A0%EB%B2%84%EB%84%A4%ED%8B%B0%EC%8A%A4-%EC%9E%90%EC%9B%90-%EA%B4%80%EB%A6%AC-%EB%85%B8%ED%95%98%EC%9A%B0-41764)에 게시된 글을 저자의 개인 블로그에 재게시한 것입니다.

## 블럭스에서는 어떻게 Argo CD를 도입하게 되었나요?

2023년 5월, 블럭스는 상품 추천과 관련한 주요 서비스를 쿠버네티스 환경에서 운영하기 시작했습니다. 쿠버네티스는 컨테이너화된 애플리케이션을 자동으로 배포, 확장 및 운영할 수 있도록 해주는 오픈소스 오케스트레이션 플랫폼으로, 빠르게 변화하는 비즈니스 요구 사항에 대응할 수 있는 유연성을 제공했습니다.

블럭스는 초기에 쿠버네티스 환경을 세팅할 때부터 CI/CD 시스템 구축에 많은 집중을 했습니다. CI/CD 시스템을 구축한다는 것은 애플리케이션 개발 단계부터 배포 때까지의 모든 단계를 자동화를 통해 효율적이고 빠르게 사용자에게 배포할 수 있는 시스템을 의미합니다.

![CI/CD 시스템](../../../assets/argocd-gitops-kubernetes-1.png)

### (1) 개발 속도 향상

- 애플리케이션 코드를 빠르고 안정적으로 배포하기 위해 자동화된 파이프라인이 필요
- 개발자들이 배포 과정의 수동 작업을 최소화하여 실제 개발에 집중

### (2) 운영 안정성 강화

- 자동화된 테스트와 배포 프로세스를 통해 배포 중 발생 가능한 오류를 사전에 감지
- 롤백 절차를 간소화하여 서비스 가용성 증대 및 운영 환경 안정성 확보

### (3) 팀 간 협업 효율화

- CI/CD 파이프라인을 통해 개발팀과 운영팀의 협업을 원활하게 하고 변경 사항 추적
- 배포 과정에서의 투명성과 신뢰성 강화로 팀 전체의 생산성 향상

블럭스는 쿠버네티스 자원의 효율적이고 자동화된 관리를 위해 Argo CD를 선택했습니다. Argo CD가 깃과 쿠버네티스 클러스터의 상태를 자동으로 동기화해 수동 배포의 오류를 줄여주고, 다양한 배포 전략을 지원하기 때문입니다.

## Argo CD와 깃옵스란 무엇인가요?

![Argo CD](../../../assets/argocd-gitops-kubernetes-2.png)

Argo CD는 쿠버네티스를 위한 선언적 애플리케이션 관리 도구로 깃 리포지토리를 기반으로 클러스터의 상태를 자동으로 동기화하고 관리할 수 있습니다.

### (1) 자동 동기화

- Git 리포지토리에 정의된 쿠버네티스 자원 상태와 실제 클러스터 상태를 동기화하여 관리 일관성 보장

### (2) 사용자 친화적인 UI와 CLI

- 웹 기반 UI와 CLI를 통해 애플리케이션 배포 상태를 시각적으로 확인 및 관리

### (3) 다양한 배포 전략 지원

- 블루-그린 배포, 카나리 배포 등 다양한 배포 전략을 손쉽게 설정

### (4) 헬름 차트 및 커스토마이즈 통합

- 헬름 차트와 커스토마이즈 같은 도구와 통합하여 쿠버네티스 자원을 더욱 유연하게 관리

![Argo CD declarative tool](../../../assets/argocd-gitops-kubernetes-3.png)

Argo CD는 전 세계적으로 쿠버네티스 환경에서 가장 널리 쓰이는 CD 도구로 오픈 소스 형태로 관리되고 있습니다.

### 깃옵스의 핵심 원칙

깃옵스는 애플리케이션과 인프라를 깃 리포지토리를 통해 관리하는 선언적 방법론입니다. 선언적 방법론이란 결과물에 초점을 맞춘 설정 및 관리 방식을 의미합니다.

#### (1) 깃을 단일 정보 소스로 사용

- 모든 자원의 현재 상태와 변경 내역을 깃 리포지토리에 저장하여 추적 가능성과 신뢰성 향상

#### (2) 자동화된 배포 및 동기화

- 깃에 커밋된 변경 사항을 자동으로 클러스터에 반영하여 수동 작업 감소

#### (3) 선언적 구성

- 모든 설정을 선언적으로 정의하여 예측 가능한 결과 획득

블럭스가 깃허브를 SSOT(Single Source Of Truth)로 선택한 이유는 깃허브가 제공하는 강력한 버전 관리 및 협업 도구가 쿠버네티스 자원 관리의 요구 사항과 완벽히 부합했기 때문입니다.

쿠버네티스 자원 정의 파일(YAML)을 깃허브에 저장하면 모든 변경 내역이 자동으로 기록되며, 각 변경 사항은 고유한 커밋 해시를 통해 추적 가능합니다. PR 기능은 모든 자원의 변경 사항이 리뷰와 승인을 거친 뒤 반영되도록 만들어 협업 과정을 체계적으로 관리할 수 있게 합니다.

깃허브 액션과 같은 워크플로우 자동화 도구를 활용해 CI/CD 파이프라인과의 통합이 용이했으며, Argo CD와도 자연스럽게 연계되어 깃의 변경 사항이 쿠버네티스 클러스터에 자동으로 반영되는 워크플로우를 간소화할 수 있었습니다.

## Argo CD와 깃옵스를 활용한 블럭스의 쿠버네티스 아키텍처

![블럭스 쿠버네티스 아키텍처](../../../assets/argocd-gitops-kubernetes-4.png)

블럭스의 배포 아키텍처는 다음과 같은 7가지 단계를 거칩니다:

**1단계: 소스 코드 푸시**
엔지니어들이 Collector API 애플리케이션을 개발하고 PR을 이용해 깃허브의 소스 코드 리포지토리에 푸시합니다. 리포지토리의 특정 브랜치에 코드 변경 사항이 반영되면, 깃허브 액션을 통해 빌드 및 배포 프로세스가 자동으로 트리거됩니다.

**2단계: 깃허브 액션 워크플로우 실행**
코드가 깃허브의 특정 브랜치에 푸시되면, 깃허브 액션이 자동으로 실행됩니다. 이 단계에서는 애플리케이션을 컨테이너 이미지로 빌드하고, 필요한 테스트를 수행한 후 모든 테스트를 통과할 경우 다음 단계로 진행합니다. 테스트 실패 시 모든 프로세스가 중단되고 엔지니어들에게 알림이 옵니다.

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

**3단계: Amazon ECR에 컨테이너 이미지 저장**
깃허브 액션이 Collector API의 컨테이너 이미지를 빌드한 후 이를 Amazon ECR에 업로드합니다. Amazon ECR은 블럭스의 컨테이너 이미지 저장소 역할을 하며, 특정 태그(예: 0.1.2)가 붙은 컨테이너 이미지가 저장됩니다.

**4단계: 깃허브 액션이 컨피그 리포지토리 업데이트**
Collector API의 새 컨테이너 이미지가 ECR에 업로드되면 깃허브 액션은 애플리케이션 매니페스트 저장소의 YAML 형태로 된 쿠버네티스 매니페스트를 업데이트합니다. `image: ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/${ECR_REPOSITORY_NAME}:0.1.1`와 같은 필드를 업데이트하여 새로운 컨테이너 이미지가 배포되도록 설정합니다.

변경 사항은 직접 커밋되거나 PR의 형태로 사람의 검토를 거치게끔 할 수 있습니다. 블럭스는 더욱 안전한 배포를 위해 PR 방식을 채택하고 있습니다.

**5단계: Argo CD가 변경 사항 감지**
엔지니어가 깃허브 액션이 올린 PR을 확인하고 변경 사항을 최종 코드에 반영하면, 컨피그 리포지토리의 상태에 변화가 생깁니다. Argo CD는 주기적으로 컨피그 리포지토리를 감시하고 있기 때문에 사람이 별도의 액션을 취하지 않아도 자동으로 변경 사항을 감지합니다.

Argo CD는 선언적 배포 방식을 사용하여 컨피그 리포지토리의 설정과 쿠버네티스 클러스터의 실제 상태를 동기화합니다. 엔지니어가 `kubectl apply` 명령을 수동으로 실행하지 않아도 변경 사항이 자동으로 클러스터에 적용됩니다.

**6-7단계: Argo CD의 배포 및 파드 롤링 업데이트**
Argo CD는 변경된 매니페스트를 기반으로 새로운 Collector API 버전을 쿠버네티스 클러스터에 배포합니다. Deployment 리소스가 업데이트되며, 기존 파드가 새로운 이미지로 롤링 업데이트됩니다.

![파드 롤링 업데이트 과정](../../../assets/argocd-gitops-kubernetes-5.png)

클러스터 내의 새로운 파드는 Amazon ECR에서 업데이트된 컨테이너 이미지를 가져와 실행합니다. 배포가 정상적으로 완료되면 최종적으로 Collector API의 최신 버전이 쿠버네티스 클러스터에서 가동되며, 외부 요청을 처리할 준비를 마칩니다.

위 과정을 통해 블럭스는 엔지니어들이 애플리케이션 코드 변경 사항을 깃허브에 푸시하는 것만으로 쿠버네티스 클러스터에 새로운 버전이 배포되는 자동화된 CI/CD 시스템을 운영할 수 있게 되었습니다.

## 새 시스템을 도입한 블럭스 관리 프로세스 주요 특징

### (1) 깃허브 리포지토리와 쿠버네티스 자원의 연결

블럭스는 애플리케이션 코드와 쿠버네티스 매니페스트를 별도의 깃허브 리포지토리에서 관리합니다.

- 애플리케이션은 소스 코드 리포지토리에서 관리되며, 코드 변경 시 깃허브 액션을 통해 컨테이너 이미지가 빌드 및 배포됩니다.
- 쿠버네티스 리소스 매니페스트(YAML)는 컨피그 리포지토리에 저장되며, Argo CD가 이 리포지토리를 감시하여 변경 사항을 클러스터에 자동 적용합니다.
- 쿠버네티스의 선언적 구성이 가능해졌으며, 인프라 변경 사항이 깃을 통해 명확하게 기록되고 추적될 수 있습니다.

### (2) PR 기반 변경 관리

블럭스는 쿠버네티스 리소스의 모든 변경 사항을 PR 기반으로 관리하여 안전성을 높였습니다.

- 엔지니어가 새로운 기능을 배포하거나 설정을 변경할 때 컨피그 리포지토리에서 직접 변경하는 것이 아니라 PR을 생성하여 리뷰 및 승인 과정을 거칩니다.
- 코드 리뷰, 승인 프로세스, 변경 이력 추적이 가능해졌으며, 잘못된 설정 변경이 즉시 운영 환경에 반영되는 위험을 방지할 수 있습니다.
- PR 기반 관리 방식으로 배포 프로세스가 더욱 투명하고 체계적으로 운영됩니다.

### (3) 자동화된 배포 파이프라인

블럭스는 깃옵스 워크플로우를 기반으로 Argo CD를 활용하여 배포 자동화를 구축했습니다.

- 엔지니어가 새로운 코드를 깃허브에 푸시하면, 깃허브 액션이 이를 빌드하고 Amazon ECR에 컨테이너 이미지를 업로드합니다.
- 컨피그 리포지토리의 매니페스트가 업데이트되면, Argo CD가 이를 감지하고 자동으로 쿠버네티스 클러스터와 동기화하여 변경 사항을 반영합니다.
- 배포를 완전 자동화(Fully Automatic Sync)하거나 특정 PR이 승인된 후 수동 배포(Manual Sync)하도록 설정할 수 있습니다.
- 블럭스는 일관된 배포 프로세스를 유지하면서도 개발 속도를 높이고 배포 안정성을 강화할 수 있게 됐습니다.

### (4) 헬름 차트를 활용한 반복적인 자원 관리

블럭스는 쿠버네티스 리소스 정의를 효율적으로 관리하기 위해 헬름 차트를 적극 활용했습니다.

- 모든 애플리케이션과 인프라 설정을 헬름 차트로 구성하여 코드 변경 없이도 환경 변수 또는 배포 파라미터를 쉽게 조정할 수 있습니다.
- 헬름 차트를 활용하면 템플릿화된 YAML 구성을 적용할 수 있어 여러 애플리케이션을 일관된 방식으로 배포하고 유지 보수할 수 있습니다.
- 헬름 차트와 Argo CD를 결합함으로써 반복적인 배포 작업을 간소화하고, 환경별 설정을 효과적으로 관리할 수 있습니다.

블럭스는 깃허브, Argo CD, 헬름 차트를 활용한 깃옵스 기반의 자동화된 쿠버네티스 관리 프로세스를 구축함으로써 배포 속도를 높이고 운영 안정성을 크게 향상시켰습니다.

## 블럭스 아키텍처의 향후 개선 방향

블럭스는 Argo CD와 깃옵스를 도입한 이후 빠른 배포 속도, 높은 운영 안정성, 팀 내 협업 강화 등 여러 방면에서 이점을 느꼈습니다.

### (1) Argo CD Notifications을 활용한 실시간 모니터링 강화

![Argo CD Notifications 활용 예시](../../../assets/argocd-gitops-kubernetes-6.png)

현재 Argo CD의 배포 상태를 대시보드 혹은 kubectl 명령어로 수동으로 확인하는 경우가 많지만, Argo CD Notifications 기능을 활용하여 Slack과 같은 협업 도구로 실시간 알림을 받을 수 있도록 개선할 예정입니다. 배포 실패나 동기화 오류가 발생했을 때 신속한 대응이 가능할 것입니다.

### (2) 자동화된 배포 승인 및 테스트 프로세스 강화

현재는 PR 기반으로 변경 사항을 승인한 후 수동으로 변경 내용을 최종 코드에 합치는 방식을 사용하고 있지만, 특정 조건을 만족할 경우 자동으로 승인 및 배포될 수 있도록 CI/CD 파이프라인을 개선할 계획입니다.

예를 들어, 자동화된 E2E 테스트를 통과한 경우 Argo CD가 변경 사항을 자동으로 반영하도록 설정할 예정입니다. 이를 통해 배포 프로세스를 더욱 안정적으로 유지하면서도 속도를 높일 수 있을 것으로 기대됩니다.
