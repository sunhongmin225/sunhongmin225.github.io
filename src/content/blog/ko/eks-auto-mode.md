---
title: "딜라이트룸의 ‘Amazon EKS Auto Mode’를 활용한 멀티 클러스터 운영 효율화 사례"
description: "딜라이트룸이 5개의 Amazon EKS 클러스터를 EKS Auto Mode로 전환하며 겪은 선택 배경, 마이그레이션 과정에서의 의사결정과 트러블슈팅, 옵저버빌리티 확보 방법, 그리고 도입 성과를 공유합니다."
pubDate: 2026-05-13
heroImage: ../../../assets/eks-auto-mode-hero.png
heroImageCaption: "썸네일 이미지"
tags: ["AWS", "Kubernetes", "EKS", "Karpenter", "Observability"]
---

> **원문:** 이 글은 [AWS 기술 블로그](https://aws.amazon.com/ko/blogs/tech/delightroom-eks-auto-mode-with-efficiency-operation/)에 게시된 글을 저자의 개인 블로그에 재게시한 것입니다.

[딜라이트룸](https://team.alar.my/)은 글로벌 누적 다운로드 1억 건을 돌파한 수면·기상 솔루션 [Alarmy](https://alar.my/)와 B2B 광고 수익화 플랫폼 [DARO](https://daro.so/)를 운영하고 있습니다. 최근에는 앱 인수를 통해 사업 영역을 확장하고 있습니다. 2025년 매출 460억 원, 영업이익 200억 원을 기록한 딜라이트룸은 매출 대부분이 해외에서 발생하는 글로벌 중심 기업입니다.

![딜라이트룸 소개](../../../assets/eks-auto-mode-1.png)
*Figure 1: 딜라이트룸 소개*

앱 인수를 통한 사업 확장은 곧 인프라의 확장을 의미합니다. 새로운 앱이나 서비스가 추가될 때마다 관리해야 할 ‘[Amazon EKS](https://aws.amazon.com/ko/eks/) 클러스터(이하 EKS 클러스터)’와 주변 인프라가 늘어나 소규모 인프라 팀이 감당해야 하는 운영 범위도 함께 커졌습니다.

2025년 11월, 딜라이트룸은 기존에 운영하던 5개의 EKS 클러스터를 [Amazon EKS Auto Mode](https://docs.aws.amazon.com/ko_kr/eks/latest/userguide/automode.html)(이하 EKS Auto Mode)로 전환했으며 현재는 10개 이상의 모든 클러스터를 EKS Auto Mode로 운영하고 있습니다.

이 글에서는 EKS Auto Mode를 선택한 배경, 마이그레이션 과정에서의 의사결정과 트러블슈팅, EKS Auto Mode 환경에서의 옵저버빌리티 확보 방법, 그리고 도입 성과를 공유합니다.

## 딜라이트룸의 EKS Auto Mode 선택 배경

### 업그레이드 프로세스의 복잡성

EKS 클러스터를 새로운 Kubernetes 버전으로 업그레이드하려면 Control Plane 버전을 올리는 것만으로 끝나지 않습니다. Amazon EKS는 Control Plane 업그레이드 시 [Add-on](https://docs.aws.amazon.com/ko_kr/eks/latest/userguide/workloads-add-ons-available-eks.html)을 자동으로 업그레이드하지 않기 때문에 Control Plane 업그레이드 이후 Amazon VPC CNI plugin for Kubernetes(이하 VPC CNI), kube-proxy, CoreDNS, Amazon EBS CSI driver(이하 EBS CSI driver) 등 Add-on을 개별적으로 업그레이드하고 Data Plane 노드를 갱신하며 Self-managed Karpenter까지 별도로 업그레이드해야 합니다. 딜라이트룸은 이렇게 총 7개의 컴포넌트를 개별적으로 관리하고 있었고 이 과정을 5개 클러스터에서 반복해야 했습니다.

![업그레이드 시 개별 관리해야 하는 7개 컴포넌트 다이어그램](../../../assets/eks-auto-mode-2.png)
*Figure 2: 업그레이드 시 개별 관리해야 하는 7개 컴포넌트 다이어그램*

특히 호환성 매트릭스 관리가 큰 부담이었습니다. [Karpenter](https://karpenter.sh/)는 EKS 마이너 버전마다 호환되는 최소 버전이 달라 반드시 [공식 호환성 매트릭스](https://karpenter.sh/docs/upgrading/compatibility/)를 확인해야 했습니다. VPC CNI와 kube-proxy, EKS 버전 간에도 연쇄 의존성이 존재하여 버전을 잘못 맞추면 Pod IP 할당 실패나 노드 NotReady 같은 운영 장애로 직결될 수 있습니다.

Self-managed Karpenter 역시 운영 부담이 적지 않았습니다. Helm Chart 배포와 업그레이드를 직접 수행해야 했고 [SQS Interruption Queue](https://karpenter.sh/docs/concepts/disruption/#interruption) 등 부수 인프라도 함께 관리해야 했습니다. Karpenter v0.32.0에서는 CRD가 전면 변경(Provisioner → NodePool, AWSNodeTemplate → EC2NodeClass)되었고 v1.0.0에서도 추가적인 스키마 변경이 이어지는 등 메이저 업그레이드마다 마이그레이션 작업이 수반되었습니다. 이러한 업그레이드 복잡성과 다운타임 우려로 인해 새 클러스터를 병렬로 구성하는 블루-그린 방식을 택하였고, 인프라 이중 운영 비용과 DNS·트래픽 전환 작업까지 더해져 업그레이드 한 번에 드는 시간과 비용은 더욱 증가했습니다.

### EKS Auto Mode의 핵심 가치

EKS Auto Mode는 Networking(VPC CNI, kube-proxy, CoreDNS), Storage(EBS CSI driver), Compute(Managed Karpenter) 등 기존에 고객이 개별 관리하던 컴포넌트를 AWS가 관리하는 모델로 전환합니다. 이에 따라 업그레이드 프로세스는 7개 컴포넌트 개별 관리에서 Control Plane 업그레이드 한 번으로 단순화됩니다.

Control Plane 업그레이드를 실행하면 EKS Auto Mode가 관리하는 컴포넌트는 자동으로 업데이트되고 Data Plane 노드 역시 [PodDisruptionBudget](https://kubernetes.io/ko/docs/concepts/workloads/pods/disruptions/#%ED%8C%8C%EB%93%9C-disruption-budgets)을 존중하면서 순차적으로 교체됩니다. EKS Auto Mode의 관리 컴포넌트와 업그레이드 프로세스에 대한 상세 내용은 공식 문서를 참고하시기 바랍니다.

EKS Auto Mode로의 전환은 Shared Responsibility Model의 변화를 의미하기도 합니다. 기존에 고객이 직접 책임지던 Data Plane 인프라 관리 영역이 AWS로 대폭 이전되어 Add-on 버전 추적, 노드 AMI 패치, Karpenter Helm Chart 관리와 같은 반복적인 운영 업무에서 벗어날 수 있습니다.

특히 딜라이트룸과 같이 소규모 팀이 다수의 클러스터를 운영하는 환경에서는 팀원들이 비즈니스 워크로드에 더 집중할 수 있도록 도움을 줍니다. Shared Responsibility Model의 변화에 대한 상세 내용은 [공식 문서](https://docs.aws.amazon.com/whitepapers/latest/security-overview-amazon-eks-auto-mode/aws-shared-security-responsibility-model.html)를 참고하시기 바랍니다.

![Shared Responsibility Model Before/After 비교 이미지](../../../assets/eks-auto-mode-3.png)
*Figure 3: Shared Responsibility Model Before/After 비교 이미지 ([출처](https://docs.aws.amazon.com/eks/latest/userguide/automode.html))*

## 딜라이트룸의 EKS Auto Mode 마이그레이션

딜라이트룸은 기존 5개 EKS 클러스터를 인플레이스 방식으로 단계적으로 EKS Auto Mode로 전환했습니다. 전환 과정은 IaC 도구인 [Pulumi](https://www.pulumi.com/)를 통해 선언적으로 관리하여 변경 사항을 코드로 추적하고 클러스터 간 일관성을 유지했습니다. 이 과정에서 Karpenter 버전 요구사항을 우회하는 전환 전략과 EKS Auto Mode의 레이블 체계 변경에 따른 워크로드 스케줄링 이슈를 해결해야 했습니다.

### Karpenter: ‘제거 후 전환’ 전략

Karpenter에서 EKS Auto Mode로의 [공식 마이그레이션 가이드](https://docs.aws.amazon.com/eks/latest/userguide/auto-migrate-karpenter.html)는 Karpenter v1.1 이상을 전제 조건으로 요구합니다. 그러나 딜라이트룸의 기존 클러스터에 설치된 Karpenter 버전은 클러스터별로 상이하여 v0.3x대와 v1.0x대가 혼재된 상태였습니다.

특히 v0.3x 클러스터에서 v1.1에 도달하려면 v0.32.0의 CRD 변경(Provisioner → NodePool, AWSNodeTemplate → EC2NodeClass), v1.0.0의 스키마 변경, 그리고 v1.1 업그레이드까지 최소 세 단계의 메이저 마이그레이션을 순차적으로 거쳐야 합니다.

각 단계마다 CRD 변환, IAM 정책 수정, 매니페스트 재작성 등이 수반되며 이 과정에서 버전 간 호환성 문제가 발생할 리스크도 존재합니다. 이 업그레이드 과정의 비용 대비 효과를 검토한 결과, 모든 클러스터의 Karpenter 버전을 v1.1로 업그레이드하는 대신 Karpenter를 일시적으로 제거한 후 EKS Auto Mode를 활성화하는 우회 전략을 선택했습니다.

![마이그레이션 전략 다이어그램 (3-step)](../../../assets/eks-auto-mode-4.png)
*Figure 4: 마이그레이션 전략 다이어그램 (3-step)*

이 전략이 가능했던 핵심 근거는 Karpenter를 제거해도 이미 프로비저닝된 노드와 그 위에서 실행 중인 Pod는 영향을 받지 않고 신규 노드 스케일링만 중단된다는 점이었습니다. 이에 따라 트래픽이 적은 새벽 시간대에 본 전략을 실행하여 스케일링이 중단되는 동안의 리스크를 최소화했습니다.

실행 과정에서는 먼저 Self-managed Karpenter의 Helm release와 관련 CRD, SQS Interruption Queue 등 부수 인프라를 제거한 뒤 EKS Auto Mode를 활성화했습니다. 활성화와 동시에 Managed Karpenter가 자동으로 구성되어 신규 NodePool 기반의 노드 프로비저닝이 재개되었고 전체 과정은 1시간 이내에 완료되었습니다. 기존 워크로드에 미친 영향은 없었으며 결과적으로 가장 번거로운 Karpenter 업그레이드 단계를 완전히 건너뛸 수 있었습니다.

### nodeSelector/toleration 불일치 대응

개발 환경 클러스터를 먼저 전환하는 과정에서 문제가 발견되었습니다. 전환 후 일부 워크로드가 스케줄링되지 않는 현상이 확인되었고, `kubectl describe pod` 명령어를 통해 `FailedScheduling` 이벤트와 함께 노드의 레이블 조건을 충족하지 못한다는 메시지를 확인했습니다.

이어서 EKS Auto Mode 노드의 레이블 목록과 기존 워크로드의 nodeSelector를 비교한 결과, `karpenter.k8s.aws/` 접두사 레이블이 EKS Auto Mode 노드에는 존재하지 않아 발생한 불일치임을 식별할 수 있었습니다.

이는 EKS Auto Mode의 Managed Karpenter는 Self-managed Karpenter와 다른 레이블 체계를 사용하기 때문입니다. Self-managed Karpenter 노드의 인스턴스 속성 레이블이 `karpenter.k8s.aws/` 접두사를 사용하는 반면, Auto Mode 노드는 `eks.amazonaws.com/` 접두사의 레이블을 사용합니다.

예를 들어 인스턴스 카테고리의 경우 기존에는 `karpenter.k8s.aws/instance-category`로 참조하던 것이 Auto Mode에서는 `eks.amazonaws.com/instance-category`로 변경됩니다. 워크로드의 nodeSelector가 기존 레이블 체계를 참조하고 있으면 Auto Mode 노드에 스케줄링되지 않아 Pod가 Pending 상태에 빠지게 됩니다.

운영 환경 클러스터 전환 전에는 이 경험을 바탕으로 사전 대응을 진행했습니다. 전체 워크로드의 nodeSelector와 toleration을 수동 점검하는 동시에 기존 `karpenter.k8s.aws/` 접두사 레이블을 참조하는 워크로드를 자동으로 식별하는 스크립트를 작성하여 병행했습니다. 식별된 워크로드는 EKS Auto Mode의 레이블 체계에 맞게 사전에 수정한 뒤 운영 환경 전환을 실행했으며 그 결과 운영 환경에서는 레이블 불일치로 인한 스케줄링 실패가 단 한 건도 발생하지 않았습니다.

![레이블 매핑 표 (karpenter.k8s.aws/\* → eks.amazonaws.com/\*)](../../../assets/eks-auto-mode-5.png)
*Table 1: 레이블 매핑 표 (karpenter.k8s.aws/\* → eks.amazonaws.com/\*)*

이 과정에서 개발 환경에서 운영 환경으로 순차적으로 전환하는 것의 중요성을 다시금 느꼈습니다. 개발 환경 클러스터에서 먼저 문제를 발견하고 패턴을 파악한 덕분에 운영 환경에서는 동일한 문제를 선제적으로 방지할 수 있었습니다. 이 경험은 이후 신규 클러스터를 EKS Auto Mode로 온보딩할 때도 동일한 사전 점검 프로세스를 적용하는 기준이 되었습니다.

## Auto Mode 환경에서의 옵저버빌리티 확보

EKS Auto Mode 노드는 SSH나 SSM을 통한 직접 접근이 차단되어 있고 Karpenter, VPC CNI 등 핵심 컴포넌트가 Pod가 아닌 systemd 데몬으로 동작하므로 kubectl logs 명령어로 상태를 확인할 수도 없습니다. 저희는 이 제약을 보완하기 위해 상시 모니터링과 사후 진단 두 가지 접근법을 병행하는 옵저버빌리티 체계를 구축했습니다.

### 상시 모니터링: CloudWatch Vended Logs

EKS Auto Mode는 AWS가 관리하는 컴포넌트의 로그를 [CloudWatch Vended Logs](https://docs.aws.amazon.com/eks/latest/userguide/auto-managed-component-logs.html)를 통해 외부로 전송할 수 있습니다. 지원되는 로그 종류는 아래 네 가지입니다.

1. `AUTO_MODE_COMPUTE_LOGS`(Karpenter)
2. `AUTO_MODE_IPAM_LOGS`(VPC CNI IP Address Management)
3. `AUTO_MODE_BLOCK_STORAGE_LOGS`(EBS CSI)
4. `AUTO_MODE_LOAD_BALANCING_LOGS`(AWS Load Balancer Controller)

저희는 이 중 Karpenter의 노드 프로비저닝 동작과 VPC CNI의 IP 할당 동작에 대한 가시성 확보를 최우선 과제로 삼아 `AUTO_MODE_COMPUTE_LOGS`와 `AUTO_MODE_IPAM_LOGS` 두 가지를 먼저 활성화했습니다. 딜라이트룸은 NLB를 적극적으로 활용하고 있어 `AUTO_MODE_LOAD_BALANCING_LOGS` 역시 추후 추가할 예정이지만, 현재로서는 로드 밸런서 관련 이슈나 개선 니즈가 크지 않아 이번 단계에서는 앞선 두 가지 로그를 먼저 활성화하는 데 집중했습니다.

로그는 CloudWatch Logs로 전달되며 보존 기간은 30일로 설정했습니다. 전체 구성은 Pulumi 모듈로 구현하여 클러스터별로 동일한 옵저버빌리티 설정이 선언적으로 적용되도록 코드를 통해 (i.e., Infrastructure as Code) 관리하고 있습니다.

### 사후 진단: NodeDiagnostic CRD

상시 모니터링만으로 원인을 추적하기 어려운 노드 단위 이슈가 발생했을 때는 NodeDiagnostic CRD를 활용합니다. NodeDiagnostic은 EKS Auto Mode에서 특정 노드의 시스템 로그를 수집하기 위한 공식 메커니즘으로 사용자가 [NodeDiagnostic](https://docs.aws.amazon.com/eks/latest/userguide/auto-get-logs.html) 리소스를 생성하면 노드의 Node Monitoring Agent가 로그를 수집하여 사용자가 지정한 S3 pre-signed URL로 업로드하는 방식으로 동작합니다.

![NodeDiagnostic 워크플로우 다이어그램](../../../assets/eks-auto-mode-6.png)
*Figure 5: NodeDiagnostic 워크플로우 다이어그램*

기본 워크플로우는 S3 pre-signed URL 생성, NodeDiagnostic 리소스 생성, 상태 폴링, 로그 다운로드, 리소스 정리의 다섯 단계로 구성됩니다. NodeDiagnostic 리소스가 생성되면 Node Monitoring Agent가 노드의 로그를 S3로 업로드하기 시작하며 상태 폴링 단계에서는 이 업로드의 완료 여부를 주기적으로 확인합니다. 이 과정을 매번 수동으로 수행하기에는 번거롭습니다.

저희는 이 전체 흐름을 자동화하는 Python 스크립트를 자체 구축하여 단일 명령어로 노드 진단 로그를 수집할 수 있도록 했습니다. 스크립트는 Karpenter NodePool 레이블(`karpenter.sh/nodepool`)로 노드를 조회하여 NodePool 단위로 일괄 수집하거나 특정 인스턴스 ID를 지정하여 개별 노드만 수집하는 두 가지 모드를 지원합니다.

또한, 로그 수집 중 Karpenter consolidation에 의해 대상 노드가 조기 종료되지 않도록 수집 시작 직전에 대상 노드에 `karpenter.sh/do-not-disrupt` 어노테이션을 적용해 consolidation을 일시 차단하고 수집 완료 후 어노테이션을 제거하는 단계도 포함합니다. 수집된 로그는 클러스터·환경·타임스탬프 단위로 정리된 S3 경로에 저장되며 30일 후 자동 만료됩니다.

```python
def main():
    # ... setup: parse args, list target nodes, build S3 prefix ...

    # Block Karpenter consolidation during capture
    for node in nodes:
        apply_do_not_disrupt(node)

    for node in nodes:
        # 1. Generate S3 Pre-signed URL
        key = f"{s3_prefix}/{node}.tar.gz"
        url = generate_presigned_url(args.bucket, key, bucket_region)

        # 2. Create NodeDiagnostic Resource (CRD)
        apply_manifest(create_node_diagnostic(node, url))

    # 3. Status Polling (wait for the agent to finish uploading logs to S3)
    while pending_nodes and elapsed < max_wait:
        time.sleep(check_interval)
        for node in list(pending_nodes):
            if check_diagnostic_status(node) in ("Success", "SuccessWithErrors", "Failure"):
                pending_nodes.remove(node)

    # Release nodes back to Karpenter
    for node in nodes:
        remove_do_not_disrupt(node)

    # 4. Download Logs
    for node in completed_nodes:
        download_logs(args.bucket, f"{s3_prefix}/{node}.tar.gz", f"{output_dir}/{node}.tar.gz")

    # 5. Cleanup Resources
    for node in nodes:
        delete_node_diagnostic(node)
```

### 실제 이슈 디버깅: CoreDNS Race Condition

앞서 소개한 CloudWatch Vended Logs 설정과 NodeDiagnostic 자동화 스크립트는 EKS Auto Mode 도입 초창기에 저희가 겪었던 하나의 이슈를 계기로 구축된 것입니다. EKS Auto Mode로 전환한 지 얼마 되지 않아 클러스터에 신규 노드가 프로비저닝될 때 해당 노드에 스케줄링된 Pod에서 외부 서비스 호출을 위한 DNS 조회가 실패하는 현상이 간헐적으로 발견되었습니다. 발생 빈도는 일주일에 1~2회 수준이었지만 애플리케이션 컨테이너가 시작 직후 종료되며 재시작이 반복되는 문제였기에 근본 원인 파악이 필요했습니다.

앱 컨테이너 로그에서는 CoreDNS Service ClusterIP로 보낸 DNS 조회가 `read: connection refused`로 실패하는 패턴이 반복적으로 나타났습니다. 컨트롤 플레인 감사 로그와 함께 타임라인을 재구성한 결과, 노드가 시작된 지 약 10~15초 시점에 실패가 집중되는 양상을 확인했고 신규 노드에서 CoreDNS가 아직 요청을 처리할 준비가 되지 않은 상태로 추정되었습니다.

![타임라인 다이어그램 – 노드 시작 → CoreDNS 부트스트랩 → 앱 컨테이너 시작 간 갭](../../../assets/eks-auto-mode-7.png)
*Figure 6: 타임라인 다이어그램 – 노드 시작 → CoreDNS 부트스트랩 → 앱 컨테이너 시작 간 갭*

그러나 이 이상의 정밀 분석은 쉽지 않았습니다. EKS Auto Mode에서 CoreDNS는 일반적인 EKS 클러스터처럼 Pod로 뜨지 않고 노드의 systemd 데몬으로 동작하기 때문에 `kubectl logs`로는 상태를 확인할 수 없었습니다. 앞서 언급한 CloudWatch Vended Logs 수집과 NodeDiagnostic 자동화 스크립트가 아직 구축되지 않은 시기였기에 CoreDNS 부트스트랩이 실제로 언제 완료되었는지, 앱 컨테이너 시작 시점과의 갭이 얼마나 되는지 직접 확인할 수단이 부재했습니다.

문제 노드를 발견한 뒤 수동으로 NodeDiagnostic을 실행해보려 해도 해당 노드가 Karpenter consolidation에 의해 종료되는 타이밍에 걸려 로그 확보가 어려운 상황이 반복되었습니다. 이 경합 문제는 앞서 소개한 자동화 스크립트의 `do-not-disrupt` 단계로 해결되지만 당시에는 이러한 체계가 마련되어 있지 않았습니다.

이 상황에서 AWS Support와의 협업을 통해 근본 원인을 확인할 수 있었습니다. 동일 증상의 과거 사례를 공유받은 결과, 특정 AMI에서 CoreDNS 부트스트랩이 지연되는 race condition이 원인이었으며 해당 AMI는 이미 수정되어 새 버전이 배포되고 있다는 답변을 받았습니다. EKS Auto Mode는 매주 신규 AMI를 릴리스하고 노드에 자동으로 전파하는 구조이기에 해당 수정본이 저희 클러스터 노드에도 점진적으로 반영되며 이슈는 자연스럽게 해소되었습니다. Shared Responsibility Model 관점에서 보면 AMI 레벨의 결함 수정과 배포가 AWS의 책임 영역에서 처리되어 저희가 직접 노드를 패치할 필요가 없었다는 점에서 Auto Mode의 책임 분담을 실제로 체감한 경험이었습니다.

병행하여 애플리케이션 수준의 방어 계층을 두기 위해 핵심 워크로드에 `wait-for-dns` init container를 적용했습니다. 메인 컨테이너가 시작되기 전에 CoreDNS readiness를 확인하도록 구성하여 향후 유사한 타이밍 이슈가 재발하더라도 워크로드 스스로 회복 가능하도록 설계했습니다.

```yaml
initContainers:
  - name: wait-for-dns
    image: public.ecr.aws/docker/library/busybox:1.36
    command:
      - sh
      - -c
      - |
        echo "Waiting for CoreDNS to be ready..."
        RETRIES=0
        MAX_RETRIES=30
        until nslookup kubernetes.default.svc.cluster.local > /dev/null 2>&1; do
          RETRIES=$((RETRIES + 1))
          if [ $RETRIES -ge $MAX_RETRIES ]; then
            echo "DNS check failed after $MAX_RETRIES attempts"
            exit 1
          fi
          echo "DNS not ready, retry $RETRIES/$MAX_RETRIES..."
          sleep 2
        done
        echo "CoreDNS is ready!"
```

적용 이후 DNS 관련 간헐적 에러는 0건을 기록하고 있습니다. 이 사건은 단일 이슈 해결을 넘어 저희의 옵저버빌리티 체계에 중요한 전환점이 되었고, 앞서 소개한 CloudWatch Vended Logs 수집과 NodeDiagnostic 자동화 스크립트를 마련하여 향후 유사 이슈가 재발하더라도 진단 로그를 안정적으로 확보할 수 있는 기반을 구축하는 직접적인 계기가 되었습니다.

## 딜라이트룸의 EKS Auto Mode 도입 성과

EKS Auto Mode 도입 이후 클러스터 운영에서 가장 두드러진 변화는 업그레이드 프로세스의 단순화입니다. 기존에는 VPC CNI, kube-proxy, CoreDNS, EBS CSI driver, Self-managed Karpenter 등 총 7개의 컴포넌트를 개별적으로 관리하며 호환성 매트릭스 확인과 블루-그린 병렬 구성 등을 수반해 클러스터당 약 4~6시간이 소요되었습니다. 그렇지만 EKS Auto Mode 전환 후에는 Control Plane 업그레이드 한 번으로 모든 관리형 컴포넌트가 자동 업데이트되어 약 30분 이내에 완료됩니다. 직접 관리해야 하는 컴포넌트는 7개에서 0개가 되었습니다.

![핵심 지표 인포그래픽 (Before→After)](../../../assets/eks-auto-mode-8.png)
*Figure 7: 핵심 지표 인포그래픽 (Before→After)*

이와 함께 클러스터 운영에 필요한 부수 인프라도 제거되었습니다. Self-managed Karpenter를 운영하기 위해 유지하던 Helm release, SQS Interruption Queue, EventBridge Rule, IAM Role 등 부수 자원이 모두 AWS 관리 영역으로 흡수되었습니다.

이러한 단순화는 곧 클러스터 스케일링 능력으로 이어졌습니다. EKS Auto Mode 전환 전후로 관리 대상 클러스터는 5개에서 10개 이상으로 확장되었으며 Pulumi 기반 IaC로 EKS Auto Mode 클러스터 구축과 온보딩을 표준화한 덕분에 이전에 약 3~4시간이 걸리던 신규 클러스터 구성 작업이 현재는 약 30분 이내로 단축되어 앱 인수 등으로 새로운 클러스터가 필요할 때 빠르고 일관된 구축이 가능해졌습니다.

보안 측면에서도 개선이 이루어졌습니다. EKS Auto Mode의 기본 Node Role은 최소 권한 원칙을 따르는 [AmazonEKSWorkerNodeMinimalPolicy](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEKSWorkerNodeMinimalPolicy.html)를 사용하여 기존 AmazonEKSWorkerNodePolicy 대비 불필요한 권한이 제거되었으며 모든 EKS Auto Mode 노드는 [최대 21일의 수명 상한](https://docs.aws.amazon.com/eks/latest/userguide/automode.html#_features) 내에서 자동 교체되어 CVE·보안 패치가 신속하게 반영되는 체계를 갖추게 되었습니다.

## EKS Auto Mode와 함께하는 다음 단계

이 글에서는 딜라이트룸이 기본 EKS 클러스터에서 EKS Auto Mode로 전환하며 경험한 멀티 클러스터 운영 효율화 사례를 공유했습니다. 선택 배경부터 마이그레이션 과정, 옵저버빌리티 확보, 그리고 실제 도입 성과에 이르기까지 저희는 EKS Auto Mode가 소규모 인프라 팀이 멀티 클러스터를 효율적으로 운영하고 빠르게 확장할 수 있도록 돕는 실질적인 선택지임을 확인했습니다.

딜라이트룸이 경험한 EKS Auto Mode의 핵심 가치는 다음과 같습니다:

- 업그레이드 자동화: Control Plane 업그레이드 한 번으로 주요 관리형 컴포넌트가 함께 업데이트되어 업그레이드 작업의 복잡도가 크게 감소합니다.
- Managed Karpenter: Karpenter 자체와 SQS Interruption Queue, EventBridge Rule 등 부수 인프라가 AWS 관리 영역으로 흡수되어 운영 부담이 제거됩니다.
- 최소 권한 Node Role과 21일 노드 자동 교체: 보안 기본값이 강화되어 CVE·보안 패치가 신속하게 반영됩니다.
- 책임 모델 전환: Shared Responsibility Model의 책임 경계가 AWS 쪽으로 이동하여 인프라 팀은 비즈니스 워크로드 지원에 집중할 수 있습니다.

앞으로는 Node Monitoring Agent가 감지하는 노드 이벤트를 트리거로 NodeDiagnostic 리소스 생성과 로그 수집이 자동으로 이뤄지는 파이프라인을 구축하여 노드 단위 이슈의 진단 체계를 한층 더 자동화할 계획입니다.

Amazon EKS Auto Mode는 클러스터 운영에 들어가는 시간을 줄이고 비즈니스 워크로드에 집중하고자 하는 멀티 클러스터를 운영하고 있는 조직에 실질적인 대안이 될 수 있는 솔루션입니다. 자세한 내용은 [Amazon EKS Auto Mode 공식 문서](https://docs.aws.amazon.com/eks/latest/userguide/automode.html)를 참고해 주시기 바라며 [딜라이트룸](https://team.alar.my/)의 EKS Auto Mode 도입 경험에 대해 더 궁금하신 내용이 있으시면 딜라이트룸으로 문의해 주시기 바랍니다.
