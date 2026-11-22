import React, { useMemo, useState } from 'react';
import { Check, Copy, Crosshair, Eye, Flame, Radio, ShieldAlert, Users } from 'lucide-react';

type AIControllerProfile = 'henchman' | 'el_ameen';
type CodeViewTab = 'header' | 'cpp' | 'blueprint';

type HenchmanStateId = 'Patrol' | 'Suspicious' | 'Chasing' | 'Searching';

interface BossPhaseSpec {
  phase: 1 | 2 | 3;
  enumName: string;
  label: string;
  hpRange: string;
  minHpPct: number;
  maxHpPct: number;
  moveSpeedCm: number;
  windupSec: number;
  burstRounds: number;
  armorMult: number;
  flankersSpawned: number;
  eqsQuery: string;
  tacticalSummary: string;
  blackboardOverrides: Array<{ key: string; value: string }>;
}

const EL_AMEEN_PHASES: BossPhaseSpec[] = [
  {
    phase: 1,
    enumName: 'EElAmeenPhase::Phase1_TacticalAuthority',
    label: 'Phase 1 · Tactical Authority',
    hpRange: '100% – 66% HP',
    minHpPct: 66,
    maxHpPct: 100,
    moveSpeedCm: 340,
    windupSec: 0.65,
    burstRounds: 4,
    armorMult: 0.85,
    flankersSpawned: 0,
    eqsQuery: 'EQS_CoverLineOfSight',
    tacticalSummary:
      'Holds elevated Shubra intersection cover, tracks player with sight perception, telegraphs 0.65s laser windup before firing controlled 4-round bursts.',
    blackboardOverrides: [
      { key: 'BossPhase', value: '1 (TacticalAuthority)' },
      { key: 'WindupDuration', value: '0.65f' },
      { key: 'BurstRoundCount', value: '4' },
      { key: 'bSuppressiveRush', value: 'false' },
    ],
  },
  {
    phase: 2,
    enumName: 'EElAmeenPhase::Phase2_PrecinctEnforcer',
    label: 'Phase 2 · Precinct Enforcer',
    hpRange: '65% – 31% HP',
    minHpPct: 31,
    maxHpPct: 65,
    moveSpeedCm: 420,
    windupSec: 0.45,
    burstRounds: 6,
    armorMult: 0.95,
    flankersSpawned: 2,
    eqsQuery: 'EQS_FindAggressiveFlank',
    tacticalSummary:
      'Calls in 2 pooled alley flankers via radio delegate, cuts laser windup to 0.45s, shifts to aggressive cover-to-cover flanking with 6-round bursts.',
    blackboardOverrides: [
      { key: 'BossPhase', value: '2 (PrecinctEnforcer)' },
      { key: 'WindupDuration', value: '0.45f' },
      { key: 'BurstRoundCount', value: '6' },
      { key: 'bReinforcementsCalled', value: 'true' },
    ],
  },
  {
    phase: 3,
    enumName: 'EElAmeenPhase::Phase3_RelentlessPursuit',
    label: 'Phase 3 · Relentless Pursuit',
    hpRange: '30% – 1% HP',
    minHpPct: 0,
    maxHpPct: 30,
    moveSpeedCm: 510,
    windupSec: 0.32,
    burstRounds: 8,
    armorMult: 1.0,
    flankersSpawned: 2,
    eqsQuery: 'EQS_CloseRangePressure',
    tacticalSummary:
      'Abandons passive cover hold, pushes player directly at 510 cm/s with rapid 0.32s telegraphs, 8-round suppression volleys, and staggered audio intensity.',
    blackboardOverrides: [
      { key: 'BossPhase', value: '3 (RelentlessPursuit)' },
      { key: 'WindupDuration', value: '0.32f' },
      { key: 'BurstRoundCount', value: '8' },
      { key: 'bSuppressiveRush', value: 'true' },
    ],
  },
];

const HENCHMAN_HEADER = `#pragma once
#include "CoreMinimal.h"
#include "AIController.h"
#include "Perception/AIPerceptionTypes.h"
#include "CairoHenchmanAIController.generated.h"

class UAIPerceptionComponent;
class UAISenseConfig_Sight;
class UAISenseConfig_Hearing;
class UBehaviorTree;

UENUM(BlueprintType)
enum class EHenchmanAlertState : uint8
{
    Patrol      UMETA(DisplayName = "Patrol Waypoints"),
    Suspicious  UMETA(DisplayName = "Investigate Stimulus"),
    Chasing     UMETA(DisplayName = "Chase & Combat"),
    Searching   UMETA(DisplayName = "Search Last Known")
};

UCLASS()
class CAIROPRECINCT_API ACairoHenchmanAIController : public AAIController
{
    GENERATED_BODY()

public:
    ACairoHenchmanAIController();

    virtual void OnPossess(APawn* InPawn) override;

protected:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Cairo|AI")
    TObjectPtr<UAIPerceptionComponent> CairoPerception;

    UPROPERTY()
    TObjectPtr<UAISenseConfig_Sight> SightConfig;

    UPROPERTY()
    TObjectPtr<UAISenseConfig_Hearing> HearingConfig;

    UPROPERTY(EditDefaultsOnly, Category = "Cairo|AI")
    TObjectPtr<UBehaviorTree> HenchmanBehaviorTree;

    UPROPERTY(EditDefaultsOnly, Category = "Cairo|AI|Movement")
    float PatrolWalkSpeed = 240.f;

    UPROPERTY(EditDefaultsOnly, Category = "Cairo|AI|Movement")
    float ChaseJogSpeed = 480.f;

    UPROPERTY(EditDefaultsOnly, Category = "Cairo|AI|Perception")
    float LostSightTimeoutSeconds = 5.0f;

    UFUNCTION()
    void HandleTargetPerceptionUpdated(AActor* Actor, FAIStimulus Stimulus);

    void TransitionAlertState(EHenchmanAlertState NewState, AActor* TargetActor, const FVector& StimulusLoc);
    void HandleLostSightTimeout();

private:
    FTimerHandle LostSightTimerHandle;
};`;

const HENCHMAN_CPP = `#include "AI/CairoHenchmanAIController.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "BehaviorTree/BehaviorTree.h"
#include "GameFramework/Character.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Perception/AIPerceptionComponent.h"
#include "Perception/AISenseConfig_Sight.h"
#include "Perception/AISenseConfig_Hearing.h"

ACairoHenchmanAIController::ACairoHenchmanAIController()
{
    CairoPerception = CreateDefaultSubobject<UAIPerceptionComponent>(TEXT("CairoPerception"));
    SetPerceptionComponent(*CairoPerception);

    // 1. Mobile-budgeted Sight Sense (22m detect, 28m lose-sight hysteresis)
    SightConfig = CreateDefaultSubobject<UAISenseConfig_Sight>(TEXT("SightConfig"));
    SightConfig->SightRadius = 2200.f;
    SightConfig->LoseSightRadius = 2800.f;
    SightConfig->PeripheralVisionAngleDegrees = 70.f;
    SightConfig->SetMaxAge(LostSightTimeoutSeconds);
    SightConfig->AutoSuccessRangeFromLastSeenLocation = 500.f;
    SightConfig->DetectionByAffiliation.bDetectEnemies = true;
    SightConfig->DetectionByAffiliation.bDetectNeutrals = true;
    CairoPerception->ConfigureSense(*SightConfig);

    // 2. Hearing Sense for unsuppressed Cairo rifle fire (18m radius)
    HearingConfig = CreateDefaultSubobject<UAISenseConfig_Hearing>(TEXT("HearingConfig"));
    HearingConfig->HearingRange = 1800.f;
    HearingConfig->SetMaxAge(4.0f);
    HearingConfig->DetectionByAffiliation.bDetectEnemies = true;
    CairoPerception->ConfigureSense(*HearingConfig);
    CairoPerception->SetDominantSense(SightConfig->GetSenseImplementation());
}

void ACairoHenchmanAIController::OnPossess(APawn* InPawn)
{
    Super::OnPossess(InPawn);

    CairoPerception->OnTargetPerceptionUpdated.AddDynamic(
        this, &ACairoHenchmanAIController::HandleTargetPerceptionUpdated);

    if (HenchmanBehaviorTree)
    {
        RunBehaviorTree(HenchmanBehaviorTree);
        TransitionAlertState(EHenchmanAlertState::Patrol, nullptr, InPawn->GetActorLocation());
    }
}

void ACairoHenchmanAIController::HandleTargetPerceptionUpdated(AActor* Actor, FAIStimulus Stimulus)
{
    if (!Actor || !Actor->ActorHasTag(TEXT("Player"))) return;

    const bool bIsSight = (Stimulus.Type == UAISense::GetSenseID<UAISense_Sight>());

    if (Stimulus.WasSuccessfullySensed())
    {
        GetWorldTimerManager().ClearTimer(LostSightTimerHandle);

        if (bIsSight)
        {
            // Patrol -> Chase immediate transition with squad radio ping
            TransitionAlertState(EHenchmanAlertState::Chasing, Actor, Stimulus.StimulusLocation);
        }
        else if (GetBlackboardComponent() &&
                 GetBlackboardComponent()->GetValueAsEnum(TEXT("AlertState")) == static_cast<uint8>(EHenchmanAlertState::Patrol))
        {
            // Gunfire heard without sight -> Investigate stimulus location
            TransitionAlertState(EHenchmanAlertState::Suspicious, nullptr, Stimulus.StimulusLocation);
        }
    }
    else if (bIsSight)
    {
        // Player broke LOS behind Cairo taxi/kiosk -> search LastKnownLocation before reverting to Patrol
        TransitionAlertState(EHenchmanAlertState::Searching, nullptr, Stimulus.StimulusLocation);
        GetWorldTimerManager().SetTimer(
            LostSightTimerHandle, this, &ACairoHenchmanAIController::HandleLostSightTimeout,
            LostSightTimeoutSeconds, false);
    }
}

void ACairoHenchmanAIController::TransitionAlertState(
    EHenchmanAlertState NewState, AActor* TargetActor, const FVector& StimulusLoc)
{
    UBlackboardComponent* BB = GetBlackboardComponent();
    if (!BB) return;

    BB->SetValueAsEnum(TEXT("AlertState"), static_cast<uint8>(NewState));
    BB->SetValueAsObject(TEXT("TargetActor"), TargetActor);
    BB->SetValueAsVector(TEXT("LastKnownLocation"), StimulusLoc);

    if (ACharacter* HenchmanChar = Cast<ACharacter>(GetPawn()))
    {
        const bool bUrgent = (NewState == EHenchmanAlertState::Chasing || NewState == EHenchmanAlertState::Searching);
        HenchmanChar->GetCharacterMovement()->MaxWalkSpeed = bUrgent ? ChaseJogSpeed : PatrolWalkSpeed;
    }

    if (NewState == EHenchmanAlertState::Chasing && TargetActor)
    {
        SetFocus(TargetActor);
    }
    else
    {
        ClearFocus(EAIFocusPriority::Gameplay);
    }
}

void ACairoHenchmanAIController::HandleLostSightTimeout()
{
    TransitionAlertState(EHenchmanAlertState::Patrol, nullptr, FVector::ZeroVector);
}`;

const HENCHMAN_BLUEPRINT_STEPS = [
  'Create BB_CairoHenchman with keys: AlertState (Enum: EHenchmanAlertState), TargetActor (Object: Actor), LastKnownLocation (Vector), and PatrolWaypoint (Vector).',
  'Create BP_HenchmanAIController inheriting from ACairoHenchmanAIController and assign BT_CairoHenchman to HenchmanBehaviorTree.',
  'In BT_CairoHenchman, attach a Blackboard Decorator on the Chase Sequence checking AlertState == Chasing with Observer Aborts set to Both so visual detection instantly cancels active alley patrol.',
  'Place a second Sequence branch for AlertState == Suspicious or Searching that runs MoveTo(LastKnownLocation) followed by a 2.5s LookAround Wait node.',
  'Keep the Patrol Sequence as the rightmost Selector branch (NextWaypoint -> MoveTo -> Wait 2.0s) so Henchmen seamlessly resume street patrol once LostSightTimeoutSeconds expires.',
];

const EL_AMEEN_HEADER = `#pragma once
#include "CoreMinimal.h"
#include "AIController.h"
#include "CairoElAmeenAIController.generated.h"

class UBehaviorTree;
class UCairoDamageHandlerComponent;

UENUM(BlueprintType)
enum class EElAmeenPhase : uint8
{
    Phase1_TacticalAuthority  UMETA(DisplayName = "Phase 1: Tactical Authority (100-66%)"),
    Phase2_PrecinctEnforcer   UMETA(DisplayName = "Phase 2: Precinct Enforcer (65-31%)"),
    Phase3_RelentlessPursuit  UMETA(DisplayName = "Phase 3: Relentless Pursuit (<=30%)")
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnElAmeenPhaseChanged, EElAmeenPhase, NewPhase, int32, FlankersToSpawn);

UCLASS()
class CAIROPRECINCT_API ACairoElAmeenAIController : public AAIController
{
    GENERATED_BODY()

public:
    ACairoElAmeenAIController();

    virtual void OnPossess(APawn* InPawn) override;

    UPROPERTY(BlueprintAssignable, Category = "Cairo|Boss")
    FOnElAmeenPhaseChanged OnElAmeenPhaseChanged;

protected:
    UPROPERTY(EditDefaultsOnly, Category = "Cairo|Boss")
    TObjectPtr<UBehaviorTree> ElAmeenBehaviorTree;

    UPROPERTY(BlueprintReadOnly, Category = "Cairo|Boss")
    EElAmeenPhase CurrentPhase = EElAmeenPhase::Phase1_TacticalAuthority;

    UFUNCTION()
    void HandleBossHealthUpdated(float CurrentHP, float MaxHP, bool bWasHeadshot);

    void ApplyAggressionPhase(EElAmeenPhase TargetPhase);
};`;

const EL_AMEEN_CPP = `#include "AI/CairoElAmeenAIController.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "Combat/CairoDamageHandlerComponent.h"
#include "GameFramework/Character.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Kismet/GameplayStatics.h"

ACairoElAmeenAIController::ACairoElAmeenAIController()
{
    bAttachToPawn = true;
}

void ACairoElAmeenAIController::OnPossess(APawn* InPawn)
{
    Super::OnPossess(InPawn);

    if (UCairoDamageHandlerComponent* DamageComp = InPawn->FindComponentByClass<UCairoDamageHandlerComponent>())
    {
        DamageComp->OnHealthUpdated.AddDynamic(this, &ACairoElAmeenAIController::HandleBossHealthUpdated);
    }

    if (ElAmeenBehaviorTree)
    {
        RunBehaviorTree(ElAmeenBehaviorTree);

        if (UBlackboardComponent* BB = GetBlackboardComponent())
        {
            if (APawn* PlayerPawn = UGameplayStatics::GetPlayerPawn(GetWorld(), 0))
            {
                BB->SetValueAsObject(TEXT("TargetActor"), PlayerPawn);
                SetFocus(PlayerPawn);
            }
        }
        ApplyAggressionPhase(EElAmeenPhase::Phase1_TacticalAuthority);
    }
}

void ACairoElAmeenAIController::HandleBossHealthUpdated(float CurrentHP, float MaxHP, bool bWasHeadshot)
{
    if (MaxHP <= 0.f || CurrentHP <= 0.f) return;

    const float HpRatio = CurrentHP / MaxHP;

    if (HpRatio <= 0.30f && CurrentPhase != EElAmeenPhase::Phase3_RelentlessPursuit)
    {
        ApplyAggressionPhase(EElAmeenPhase::Phase3_RelentlessPursuit);
    }
    else if (HpRatio <= 0.65f && CurrentPhase == EElAmeenPhase::Phase1_TacticalAuthority)
    {
        ApplyAggressionPhase(EElAmeenPhase::Phase2_PrecinctEnforcer);
    }
}

void ACairoElAmeenAIController::ApplyAggressionPhase(EElAmeenPhase TargetPhase)
{
    CurrentPhase = TargetPhase;
    UBlackboardComponent* BB = GetBlackboardComponent();
    ACharacter* BossChar = Cast<ACharacter>(GetPawn());
    if (!BB || !BossChar) return;

    BB->SetValueAsEnum(TEXT("BossPhase"), static_cast<uint8>(TargetPhase));

    switch (TargetPhase)
    {
        case EElAmeenPhase::Phase1_TacticalAuthority:
            BB->SetValueAsFloat(TEXT("WindupDuration"), 0.65f);
            BB->SetValueAsInt(TEXT("BurstRoundCount"), 4);
            BB->SetValueAsBool(TEXT("bSuppressiveRush"), false);
            BossChar->GetCharacterMovement()->MaxWalkSpeed = 340.f;
            OnElAmeenPhaseChanged.Broadcast(TargetPhase, 0);
            break;

        case EElAmeenPhase::Phase2_PrecinctEnforcer:
            BB->SetValueAsFloat(TEXT("WindupDuration"), 0.45f);
            BB->SetValueAsInt(TEXT("BurstRoundCount"), 6);
            BB->SetValueAsBool(TEXT("bSuppressiveRush"), false);
            BossChar->GetCharacterMovement()->MaxWalkSpeed = 420.f;
            // Spawn 2 pooled alley flankers and ramp soundtrack intensity
            OnElAmeenPhaseChanged.Broadcast(TargetPhase, 2);
            break;

        case EElAmeenPhase::Phase3_RelentlessPursuit:
            BB->SetValueAsFloat(TEXT("WindupDuration"), 0.32f);
            BB->SetValueAsInt(TEXT("BurstRoundCount"), 8);
            BB->SetValueAsBool(TEXT("bSuppressiveRush"), true);
            BossChar->GetCharacterMovement()->MaxWalkSpeed = 510.f;
            OnElAmeenPhaseChanged.Broadcast(TargetPhase, 2);
            break;
    }
}`;

const EL_AMEEN_BLUEPRINT_STEPS = [
  'Create BB_ElAmeenBoss with keys: TargetActor (Object), BossPhase (Enum: EElAmeenPhase), WindupDuration (Float), BurstRoundCount (Int), and bSuppressiveRush (Bool).',
  'Create BP_ElAmeenAIController inheriting from ACairoElAmeenAIController and assign it as the AI Controller Class on BP_Boss_ElAmeen.',
  'Bind OnElAmeenPhaseChanged in BP_Boss_ElAmeen to trigger voice stinger, golden-hour combat music layer, and spawn pooled Henchman flankers at alley spawn markers.',
  'In BT_ElAmeenBoss, place 3 Selector branches guarded by BossPhase Blackboard Decorators with Observer Aborts = Lower Priority so Phase 2/3 escalations interrupt slower cover loops immediately.',
  'Pass WindupDuration and BurstRoundCount from Blackboard directly into BTTask_CairoTacticalAttack so one single C++ task drives all three aggression tiers.',
];

interface AIBehaviorTreeSectionProps {
  compact?: boolean;
}

export const AIBehaviorTreeSection: React.FC<AIBehaviorTreeSectionProps> = ({ compact = false }) => {
  const [profile, setProfile] = useState<AIControllerProfile>('henchman');
  const [codeTab, setCodeTab] = useState<CodeViewTab>('cpp');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Interactive Henchman Patrol-to-Chase Perception Simulator state
  const [playerDistM, setPlayerDistM] = useState<number>(16);
  const [hasLineOfSight, setHasLineOfSight] = useState<boolean>(true);
  const [gunfireHeard, setGunfireHeard] = useState<boolean>(false);
  const [wasRecentlySeen, setWasRecentlySeen] = useState<boolean>(true);

  // Interactive El-Ameen Aggression Phase HP Simulator state
  const [bossHpPct, setBossHpPct] = useState<number>(58);

  const henchmanEval = useMemo(() => {
    const sightRadiusM = 22;
    const hearingRadiusM = 18;
    const sightDetected = hasLineOfSight && playerDistM <= sightRadiusM;
    const soundDetected = gunfireHeard && playerDistM <= hearingRadiusM;

    let state: HenchmanStateId = 'Patrol';
    let walkSpeed = 240;
    let decoratorAbort = 'Idle · Waypoint Loop';
    let targetActorVal = 'nullptr';
    let transitionReason = 'No active stimulus within 22m sight or 18m hearing radius.';

    if (sightDetected) {
      state = 'Chasing';
      walkSpeed = 480;
      decoratorAbort = 'Observer Aborts: Both (Patrol Canceled)';
      targetActorVal = 'BP_CairoHero_0';
      transitionReason = `UAISense_Sight sensed player at ${playerDistM}m (<= 22m). SetFocus + MaxWalkSpeed 480 cm/s.`;
    } else if (wasRecentlySeen && playerDistM <= 28) {
      state = 'Searching';
      walkSpeed = 480;
      decoratorAbort = 'LostSightTimer active (5.0s countdown)';
      targetActorVal = 'nullptr (LastKnownLocation locked)';
      transitionReason = 'Line of sight broken behind Cairo cover. Moving to LastKnownLocation before reverting to Patrol.';
    } else if (soundDetected) {
      state = 'Suspicious';
      walkSpeed = 240;
      decoratorAbort = 'Investigate Sequence active';
      targetActorVal = 'nullptr (Sound Stimulus Vector)';
      transitionReason = `UAISense_Hearing detected unsuppressed rifle at ${playerDistM}m (<= 18m). Investigating noise origin.`;
    }

    return {
      state,
      walkSpeed,
      decoratorAbort,
      targetActorVal,
      transitionReason,
    };
  }, [playerDistM, hasLineOfSight, gunfireHeard, wasRecentlySeen]);

  const activeBossPhase = useMemo<BossPhaseSpec>(() => {
    if (bossHpPct <= 30) return EL_AMEEN_PHASES[2];
    if (bossHpPct <= 65) return EL_AMEEN_PHASES[1];
    return EL_AMEEN_PHASES[0];
  }, [bossHpPct]);

  const activeCode = useMemo(() => {
    if (profile === 'henchman') {
      return codeTab === 'header'
        ? HENCHMAN_HEADER
        : codeTab === 'cpp'
          ? HENCHMAN_CPP
          : HENCHMAN_BLUEPRINT_STEPS.map((s, i) => `0${i + 1}. ${s}`).join('\n');
    }
    return codeTab === 'header'
      ? EL_AMEEN_HEADER
      : codeTab === 'cpp'
        ? EL_AMEEN_CPP
        : EL_AMEEN_BLUEPRINT_STEPS.map((s, i) => `0${i + 1}. ${s}`).join('\n');
  }, [profile, codeTab]);

  const handleCopy = () => {
    void navigator.clipboard?.writeText(activeCode);
    const key = `${profile}_${codeTab}`;
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1800);
  };

  const renderSimulator = () => {
    if (profile === 'henchman') {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Eye className="h-3.5 w-3.5 text-[#E89B3C]" />
              <span>Patrol-to-Chase Perception Simulator</span>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-[#E89B3C]">
              State: {henchmanEval.state}
            </span>
          </div>

          {/* 4-State Pipeline Strip */}
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-[#0D0F12] p-1">
            {(['Patrol', 'Suspicious', 'Chasing', 'Searching'] as HenchmanStateId[]).map((st) => {
              const active = henchmanEval.state === st;
              return (
                <div
                  key={st}
                  className={`rounded-md px-2 py-1.5 text-center font-mono text-[10px] transition-colors ${
                    active
                      ? st === 'Chasing'
                        ? 'bg-[#DC2626]/25 font-semibold text-[#FCA5A5]'
                        : st === 'Suspicious' || st === 'Searching'
                          ? 'bg-[#E89B3C]/20 font-semibold text-[#FDE68A]'
                          : 'bg-[#1D222B] font-semibold text-white'
                      : 'text-[#6B7280]'
                  }`}
                >
                  {st}
                </div>
              );
            })}
          </div>

          {/* Interactive Controls */}
          <div className="space-y-2.5 rounded-lg border border-white/8 bg-[#0D0F12]/80 p-3">
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <label htmlFor={`hench-dist-${compact ? 'c' : 'f'}`} className="text-[#D1D5DB]">
                  Player Distance to Henchman
                </label>
                <span className="font-mono tabular-nums text-[#E89B3C]">{playerDistM} m (Sight: 22m)</span>
              </div>
              <input
                id={`hench-dist-${compact ? 'c' : 'f'}`}
                type="range"
                min={4}
                max={34}
                step={1}
                value={playerDistM}
                onChange={(e) => setPlayerDistM(Number(e.target.value))}
                className="mt-1.5 w-full accent-[#E89B3C]"
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setHasLineOfSight((v) => !v)}
                className={`rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  hasLineOfSight
                    ? 'border-[#E89B3C]/65 bg-[#1B2028] text-white'
                    : 'border-white/10 bg-[#161A20]/60 text-[#9CA3AF]'
                }`}
              >
                LOS: {hasLineOfSight ? 'Clear' : 'Blocked'}
              </button>
              <button
                type="button"
                onClick={() => setGunfireHeard((v) => !v)}
                className={`rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  gunfireHeard
                    ? 'border-[#E89B3C]/65 bg-[#1B2028] text-white'
                    : 'border-white/10 bg-[#161A20]/60 text-[#9CA3AF]'
                }`}
              >
                Shot: {gunfireHeard ? 'Heard' : 'Quiet'}
              </button>
              <button
                type="button"
                onClick={() => setWasRecentlySeen((v) => !v)}
                className={`rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  wasRecentlySeen
                    ? 'border-[#E89B3C]/65 bg-[#1B2028] text-white'
                    : 'border-white/10 bg-[#161A20]/60 text-[#9CA3AF]'
                }`}
              >
                Memory: {wasRecentlySeen ? '5s' : '0s'}
              </button>
            </div>
          </div>

          {/* Live Blackboard Readout */}
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/8 bg-[#0D0F12] p-2.5 font-mono text-[10px] tabular-nums">
            <div>
              <div className="text-[#9CA3AF]">MaxWalkSpeed</div>
              <div className="text-white">{henchmanEval.walkSpeed} cm/s</div>
            </div>
            <div>
              <div className="text-[#9CA3AF]">TargetActor</div>
              <div className="truncate text-[#E89B3C]">{henchmanEval.targetActorVal}</div>
            </div>
            <div className="col-span-2 border-t border-white/8 pt-1.5 text-[11px] font-sans text-[#D1D5DB]">
              {henchmanEval.transitionReason}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Flame className="h-3.5 w-3.5 text-[#E89B3C]" />
            <span>El-Ameen Boss Aggression Phases</span>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-[#E89B3C]">
            HP: {bossHpPct}% · Phase 0{activeBossPhase.phase}
          </span>
        </div>

        {/* Interactive HP Threshold Slider */}
        <div className="rounded-lg border border-white/8 bg-[#0D0F12]/80 p-3">
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor={`boss-hp-${compact ? 'c' : 'f'}`} className="text-[#D1D5DB]">
              Simulated Boss Health (460 Max HP)
            </label>
            <span className="font-mono tabular-nums text-[#FDE68A]">
              {Math.round((460 * bossHpPct) / 100)} / 460 HP
            </span>
          </div>
          <input
            id={`boss-hp-${compact ? 'c' : 'f'}`}
            type="range"
            min={5}
            max={100}
            step={1}
            value={bossHpPct}
            onChange={(e) => setBossHpPct(Number(e.target.value))}
            className="mt-1.5 w-full accent-[#E89B3C]"
          />

          {/* 3 Phase Quick Jump Buttons */}
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {EL_AMEEN_PHASES.map((p) => {
              const isCurrent = p.phase === activeBossPhase.phase;
              const jumpHp = p.phase === 1 ? 85 : p.phase === 2 ? 50 : 20;
              return (
                <button
                  key={p.phase}
                  type="button"
                  onClick={() => setBossHpPct(jumpHp)}
                  className={`rounded-md border px-2 py-1.5 text-left transition-colors ${
                    isCurrent
                      ? 'border-[#E89B3C]/70 bg-[#1B2028] text-white'
                      : 'border-white/8 bg-[#161A20]/60 text-[#9CA3AF] hover:border-white/20 hover:text-white'
                  }`}
                >
                  <div className="font-mono text-[10px] text-[#E89B3C]">Phase 0{p.phase}</div>
                  <div className="truncate text-[11px] font-medium">{p.hpRange}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Phase Parameters */}
        <div className="rounded-lg border border-white/8 bg-[#0D0F12] p-3">
          <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
            <span className="font-semibold text-white">{activeBossPhase.label}</span>
            <span className="font-mono text-[10px] text-[#9CA3AF]">{activeBossPhase.eqsQuery}</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[#D1D5DB]">{activeBossPhase.tacticalSummary}</p>

          <div className="mt-2.5 grid grid-cols-4 gap-2 border-t border-white/8 pt-2.5 font-mono text-[10px] tabular-nums">
            <div>
              <div className="text-[#9CA3AF]">Speed</div>
              <div className="text-white">{activeBossPhase.moveSpeedCm}</div>
            </div>
            <div>
              <div className="text-[#9CA3AF]">Windup</div>
              <div className="text-[#E89B3C]">{activeBossPhase.windupSec}s</div>
            </div>
            <div>
              <div className="text-[#9CA3AF]">Burst</div>
              <div className="text-white">{activeBossPhase.burstRounds} rds</div>
            </div>
            <div>
              <div className="text-[#9CA3AF]">Flankers</div>
              <div className="text-white">+{activeBossPhase.flankersSpawned}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCodeInspector = () => {
    const classTitle =
      profile === 'henchman' ? 'ACairoHenchmanAIController' : 'ACairoElAmeenAIController';
    const filePath =
      profile === 'henchman'
        ? 'Source/CairoPrecinct/Private/AI/CairoHenchmanAIController.cpp'
        : 'Source/CairoPrecinct/Private/AI/CairoElAmeenAIController.cpp';
    const bpSteps = profile === 'henchman' ? HENCHMAN_BLUEPRINT_STEPS : EL_AMEEN_BLUEPRINT_STEPS;

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-sm font-bold text-white md:text-base">{classTitle}</h3>
            <div className="mt-0.5 truncate font-mono text-[10px] text-[#E89B3C]">{filePath}</div>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/12 bg-[#161A20] px-2.5 py-1.5 text-[11px] font-medium text-[#E89B3C] transition-colors hover:border-[#E89B3C] hover:text-white"
          >
            {copiedKey === `${profile}_${codeTab}` ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedKey === `${profile}_${codeTab}` ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Code Format Switcher */}
        <div className="mt-2.5 flex items-center gap-1 rounded-md bg-[#0D0F12] p-1">
          {(
            [
              { id: 'header', label: 'Header (.h)' },
              { id: 'cpp', label: 'Controller (.cpp)' },
              { id: 'blueprint', label: 'BT & BB Steps' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCodeTab(tab.id)}
              className={`flex-1 rounded px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                codeTab === tab.id ? 'bg-[#1D222B] text-white' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code / Blueprint Steps Scroll Viewport */}
        <div className="mt-2.5 min-h-0 flex-1 overflow-auto rounded-lg border border-white/10 bg-[#0B0D10] p-3">
          {codeTab === 'blueprint' ? (
            <ol className="space-y-2.5 text-xs leading-relaxed text-[#D1D5DB]">
              {bpSteps.map((step, i) => (
                <li key={step} className="flex items-start gap-2.5">
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-[#E89B3C]">
                    0{i + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <pre className="font-mono text-[11px] leading-relaxed text-[#E5E7EB] whitespace-pre">
              {activeCode}
            </pre>
          )}
        </div>
      </div>
    );
  };

  if (compact) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Profile Toggle: Henchman vs El-Ameen */}
        <div className="border-b border-white/10 px-4 py-2.5">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setProfile('henchman')}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                profile === 'henchman'
                  ? 'border-[#E89B3C]/70 bg-[#1B2028] text-white'
                  : 'border-white/8 bg-[#161A20]/60 text-[#9CA3AF] hover:text-white'
              }`}
            >
              <Users className={`h-3.5 w-3.5 ${profile === 'henchman' ? 'text-[#E89B3C]' : 'text-[#9CA3AF]'}`} />
              <span>Henchmen AI</span>
            </button>
            <button
              type="button"
              onClick={() => setProfile('el_ameen')}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                profile === 'el_ameen'
                  ? 'border-[#E89B3C]/70 bg-[#1B2028] text-white'
                  : 'border-white/8 bg-[#161A20]/60 text-[#9CA3AF] hover:text-white'
              }`}
            >
              <ShieldAlert className={`h-3.5 w-3.5 ${profile === 'el_ameen' ? 'text-[#E89B3C]' : 'text-[#9CA3AF]'}`} />
              <span>El-Ameen Boss</span>
            </button>
          </div>
        </div>

        {/* Interactive Simulator */}
        <div className="border-b border-white/10 px-4 py-3">{renderSimulator()}</div>

        {/* UE5 AI Controller Code & Blueprint Steps */}
        <div className="flex min-h-0 flex-1 flex-col p-4">{renderCodeInspector()}</div>
      </div>
    );
  }

  // Full-width Blueprint Hub Archive View
  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#E89B3C]">
            <span>UE5 AIController</span>
            <span aria-hidden="true">·</span>
            <span>AIPerception &amp; Blackboard</span>
            <span aria-hidden="true">·</span>
            <span>60 FPS Mobile Tick Budget</span>
          </div>
          <h2 className="mt-1.5 font-display text-2xl font-bold text-white">
            AI Behavior Tree &amp; Controller Logic
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm text-[#9CA3AF]">
            Dedicated Unreal Engine 5 AI Controller architecture covering Henchmen sight/hearing patrol-to-chase
            transitions and El-Ameen’s three health-driven boss aggression phases.
          </p>
        </div>

        {/* Profile Segmented Switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#161A20] p-1 w-fit shrink-0">
          <button
            type="button"
            onClick={() => setProfile('henchman')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              profile === 'henchman'
                ? 'bg-[#E89B3C] font-semibold text-[#0D0F12]'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Henchmen Patrol → Chase</span>
          </button>
          <button
            type="button"
            onClick={() => setProfile('el_ameen')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              profile === 'el_ameen'
                ? 'bg-[#E89B3C] font-semibold text-[#0D0F12]'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>El-Ameen Boss Phases</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Simulator + Spec Matrix | C++ AIController Inspector */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-5">
          <div className="rounded-xl border border-white/10 bg-[#161A20] p-5">{renderSimulator()}</div>

          {/* Blackboard & Perception Reference Table */}
          <div className="rounded-xl border border-white/10 bg-[#161A20] p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              {profile === 'henchman' ? (
                <Radio className="h-3.5 w-3.5 text-[#E89B3C]" />
              ) : (
                <Crosshair className="h-3.5 w-3.5 text-[#E89B3C]" />
              )}
              <span>
                {profile === 'henchman'
                  ? 'BB_CairoHenchman Keys & Perception Config'
                  : 'BB_ElAmeenBoss Phase Escalation Matrix'}
              </span>
            </div>

            {profile === 'henchman' ? (
              <div className="mt-3 divide-y divide-white/8 text-xs">
                {[
                  { key: 'AlertState', type: 'Enum', val: 'Patrol / Suspicious / Chasing / Searching' },
                  { key: 'TargetActor', type: 'Object', val: 'Set by UAISense_Sight <= 2200cm' },
                  { key: 'LastKnownLocation', type: 'Vector', val: 'Updated on sight loss or gunshot noise' },
                  { key: 'LoseSightRadius', type: 'Float', val: '2800cm hysteresis · 5.0s search timeout' },
                ].map((row) => (
                  <div key={row.key} className="flex items-start justify-between gap-3 py-2.5">
                    <div>
                      <span className="font-mono font-semibold text-[#FDE68A]">{row.key}</span>
                      <span className="ml-2 font-mono text-[10px] text-[#9CA3AF]">{row.type}</span>
                    </div>
                    <span className="text-right text-[11px] text-[#D1D5DB]">{row.val}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 divide-y divide-white/8 text-xs">
                {EL_AMEEN_PHASES.map((p) => (
                  <div key={p.phase} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{p.label}</span>
                      <span className="font-mono text-[11px] tabular-nums text-[#E89B3C]">{p.hpRange}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] tabular-nums text-[#9CA3AF]">
                      <span>Speed {p.moveSpeedCm} cm/s</span>
                      <span aria-hidden="true">·</span>
                      <span>Windup {p.windupSec}s</span>
                      <span aria-hidden="true">·</span>
                      <span>{p.burstRounds}-rd Burst</span>
                      <span aria-hidden="true">·</span>
                      <span>+{p.flankersSpawned} Flankers</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Full C++ & Blueprint Inspector */}
        <div className="flex h-[580px] flex-col rounded-xl border border-white/10 bg-[#161A20] p-5 lg:col-span-7">
          {renderCodeInspector()}
        </div>
      </div>
    </div>
  );
};
