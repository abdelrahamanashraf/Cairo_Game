import React, { useMemo, useState } from 'react';
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  Cpu,
  Gamepad2,
  GitBranch,
  Globe,
  MapPin,
  Package,
  ShieldAlert,
  Smartphone,
  Sun,
} from 'lucide-react';
import { InventoryWeaponryPanel } from './InventoryWeaponryPanel';
import { VisualBlueprintLogic } from './VisualBlueprintLogic';
import { AIBehaviorTreeSection } from './AIBehaviorTreeSection';
import { DynamicSkyTool } from './DynamicSkyTool';
import { CesiumTilesSection } from './CesiumTilesSection';
import { MobileOptimizationSection } from './MobileOptimizationSection';
import { DistrictMapManager } from './DistrictMapManager';

export type StarterScriptCategory = 'All' | 'Controls & Camera' | 'World Streaming' | 'Combat & AI';

interface StarterScriptSpec {
  id: string;
  name: string;
  category: Exclude<StarterScriptCategory, 'All'>;
  ue5Class: string;
  filePath: string;
  summary: string;
  mobileNote: string;
  headerSnippet: string;
  cppSnippet: string;
  blueprintNotes: string[];
}

const STARTER_SCRIPTS: StarterScriptSpec[] = [
  {
    id: 'player_controller',
    name: 'PlayerController',
    category: 'Controls & Camera',
    ue5Class: 'ACairoPlayerController',
    filePath: 'Source/CairoPrecinct/Public/Player/CairoPlayerController.h',
    summary: 'Enhanced Input routing for dual-thumb mobile sticks, touch look drag, crouch/sprint states, and soft auto-aim assist.',
    mobileNote: 'Event-driven Enhanced Input bindings + single dot-product cone scan (< 0.1ms/frame).',
    headerSnippet: `#pragma once
#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "InputActionValue.h"
#include "CairoPlayerController.generated.h"

class UInputMappingContext;
class UInputAction;

UCLASS()
class CAIROPRECINCT_API ACairoPlayerController : public APlayerController
{
    GENERATED_BODY()

public:
    virtual void BeginPlay() override;
    virtual void SetupInputComponent() override;

    UFUNCTION(BlueprintCallable, Category = "MobileInput")
    void ApplySoftAutoAim(float DeltaTime, float ConeDeg = 8.5f);

protected:
    UPROPERTY(EditDefaultsOnly, Category = "Input")
    TObjectPtr<UInputMappingContext> CairoMappingContext;

    UPROPERTY(EditDefaultsOnly, Category = "Input")
    TObjectPtr<UInputAction> MoveAction;

    UPROPERTY(EditDefaultsOnly, Category = "Input")
    TObjectPtr<UInputAction> LookAction;

    UPROPERTY(EditDefaultsOnly, Category = "Input")
    TObjectPtr<UInputAction> FireAction;

    void HandleMove(const FInputActionValue& Value);
    void HandleLook(const FInputActionValue& Value);
};`,
    cppSnippet: `#include "Player/CairoPlayerController.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "GameFramework/Character.h"

void ACairoPlayerController::BeginPlay()
{
    Super::BeginPlay();
    if (UEnhancedInputLocalPlayerSubsystem* Subsys =
        ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(GetLocalPlayer()))
    {
        Subsys->AddMappingContext(CairoMappingContext, 0);
    }
}

void ACairoPlayerController::SetupInputComponent()
{
    Super::SetupInputComponent();
    if (UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(InputComponent))
    {
        EIC->BindAction(MoveAction, ETriggerEvent::Triggered, this, &ACairoPlayerController::HandleMove);
        EIC->BindAction(LookAction, ETriggerEvent::Triggered, this, &ACairoPlayerController::HandleLook);
    }
}

void ACairoPlayerController::HandleMove(const FInputActionValue& Value)
{
    const FVector2D Axis = Value.Get<FVector2D>();
    if (APawn* P = GetPawn())
    {
        const FRotator YawRot(0.f, GetControlRotation().Yaw, 0.f);
        P->AddMovementInput(FRotationMatrix(YawRot).GetUnitAxis(EAxis::X), Axis.Y);
        P->AddMovementInput(FRotationMatrix(YawRot).GetUnitAxis(EAxis::Y), Axis.X);
    }
}

void ACairoPlayerController::HandleLook(const FInputActionValue& Value)
{
    const FVector2D Delta = Value.Get<FVector2D>();
    AddYawInput(Delta.X * 0.35f);
    AddPitchInput(Delta.Y * 0.35f);
}`,
    blueprintNotes: [
      'Create BP_CairoPlayerController inheriting from ACairoPlayerController.',
      'Assign IMC_CairoMobile with virtual thumbstick & right-half touch look mappings.',
      'Call ApplySoftAutoAim from Tick only while Fire or ADS input is held.',
    ],
  },
  {
    id: 'camera_system',
    name: 'CameraSystem',
    category: 'Controls & Camera',
    ue5Class: 'UCairoCameraSystemComponent',
    filePath: 'Source/CairoPrecinct/Public/Camera/CairoCameraSystemComponent.h',
    summary: 'PUBG-style over-the-shoulder SpringArm boom with smooth ADS FOV zoom, crouch offset damping, and wall-clip protection.',
    mobileNote: 'Uses native SpringArm collision probe with lag interpolation; zero per-frame raycast allocations.',
    headerSnippet: `#pragma once
#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "CairoCameraSystemComponent.generated.h"

class USpringArmComponent;
class UCameraComponent;

UCLASS(ClassGroup=(Camera), meta=(BlueprintSpawnableComponent))
class CAIROPRECINCT_API UCairoCameraSystemComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UCairoCameraSystemComponent();
    void InitializeRig(USpringArmComponent* InBoom, UCameraComponent* InCam);
    void UpdateCameraRig(float DeltaTime, bool bIsAds, bool bIsCrouched, bool bIsSprinting);

    UPROPERTY(EditDefaultsOnly, Category = "PUBG Camera")
    float HipArmLength = 250.f;

    UPROPERTY(EditDefaultsOnly, Category = "PUBG Camera")
    float AdsArmLength = 145.f;

    UPROPERTY(EditDefaultsOnly, Category = "PUBG Camera")
    float HipFOV = 70.f;

    UPROPERTY(EditDefaultsOnly, Category = "PUBG Camera")
    float AdsFOV = 50.f;

private:
    TWeakObjectPtr<USpringArmComponent> CameraBoom;
    TWeakObjectPtr<UCameraComponent> FollowCamera;
};`,
    cppSnippet: `#include "Camera/CairoCameraSystemComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "Camera/CameraComponent.h"

UCairoCameraSystemComponent::UCairoCameraSystemComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UCairoCameraSystemComponent::InitializeRig(USpringArmComponent* InBoom, UCameraComponent* InCam)
{
    CameraBoom = InBoom;
    FollowCamera = InCam;
    if (CameraBoom.IsValid())
    {
        CameraBoom->bUsePawnControlRotation = true;
        CameraBoom->bEnableCameraLag = true;
        CameraBoom->CameraLagSpeed = 12.f;
        CameraBoom->ProbeChannel = ECC_Camera;
    }
}

void UCairoCameraSystemComponent::UpdateCameraRig(
    float DeltaTime, bool bIsAds, bool bIsCrouched, bool bIsSprinting)
{
    if (!CameraBoom.IsValid() || !FollowCamera.IsValid()) return;

    const float TargetLen = bIsAds ? AdsArmLength : HipArmLength;
    const float TargetZ = bIsCrouched ? 42.f : 68.f;
    const float TargetY = bIsAds ? 48.f : 58.f;
    const float TargetFov = bIsAds ? AdsFOV : (bIsSprinting ? 76.f : HipFOV);

    CameraBoom->TargetArmLength = FMath::FInterpTo(CameraBoom->TargetArmLength, TargetLen, DeltaTime, 11.f);
    CameraBoom->SocketOffset = FMath::VInterpTo(
        CameraBoom->SocketOffset, FVector(0.f, TargetY, TargetZ), DeltaTime, 10.f);
    FollowCamera->SetFieldOfView(FMath::FInterpTo(FollowCamera->FieldOfView, TargetFov, DeltaTime, 12.f));
}`,
    blueprintNotes: [
      'Attach UCairoCameraSystemComponent to BP_CairoHero alongside CameraBoom & FollowCamera.',
      'Pass bIsAds, bIsCrouched, and bIsSprinting into UpdateCameraRig from Character Tick.',
      'Hook CameraShakeBase on rifle recoil and heavy boss impacts.',
    ],
  },
  {
    id: 'cesium_tile_loader',
    name: 'CesiumTileLoader',
    category: 'World Streaming',
    ue5Class: 'ACairoCesiumTileLoader',
    filePath: 'Source/CairoPrecinct/Public/World/CairoCesiumTileLoader.h',
    summary: 'Streams Google Photorealistic 3D Tiles for each Cairo district, enforces mobile SSE/cache caps, and clips the playable street arena.',
    mobileNote: 'Clamps SSE=28, tile cache <= 192MB, and disables raw tile physics so only distant skyline streams.',
    headerSnippet: `#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "CairoCesiumTileLoader.generated.h"

class ACesiumGeoreference;
class ACesium3DTileset;

USTRUCT(BlueprintType)
struct FCairoDistrictGeo
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere, BlueprintReadWrite) double Latitude = 30.0771;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) double Longitude = 31.2458;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) double HeightMeters = 28.0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float MobileSSE = 28.f;
};

UCLASS()
class CAIROPRECINCT_API ACairoCesiumTileLoader : public AActor
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Cairo|Cesium")
    void LoadCairoDistrict(const FCairoDistrictGeo& DistrictGeo);

protected:
    UPROPERTY(EditInstanceOnly, Category = "Cesium")
    TObjectPtr<ACesiumGeoreference> Georeference;

    UPROPERTY(EditInstanceOnly, Category = "Cesium")
    TObjectPtr<ACesium3DTileset> Google3DTileset;
};`,
    cppSnippet: `#include "World/CairoCesiumTileLoader.h"
#include "CesiumGeoreference.h"
#include "Cesium3DTileset.h"

void ACairoCesiumTileLoader::LoadCairoDistrict(const FCairoDistrictGeo& DistrictGeo)
{
    if (Georeference)
    {
        Georeference->SetOriginLatitude(DistrictGeo.Latitude);
        Georeference->SetOriginLongitude(DistrictGeo.Longitude);
        Georeference->SetOriginHeight(DistrictGeo.HeightMeters);
    }

    if (Google3DTileset)
    {
        // Strict mid-range smartphone 60 FPS streaming budget
        Google3DTileset->SetMaximumScreenSpaceError(DistrictGeo.MobileSSE);
        Google3DTileset->SetMaximumSimultaneousTileLoads(3);
        Google3DTileset->SetMaximumCachedBytes(192 * 1024 * 1024);
        Google3DTileset->SetPreloadAncestors(false);
        Google3DTileset->SetPreloadSiblings(false);
        Google3DTileset->SetCreatePhysicsMeshes(false); // Low-poly block handles combat collision
    }
}`,
    blueprintNotes: [
      'Drop BP_CairoCesiumTileLoader in each district map and link CesiumGeoreference + Cesium3DTileset.',
      'Attach a CesiumCartographicPolygon covering 140m–240m to cut out raw street tiles.',
      'Place hand-optimized Shubra / Old Cairo / Sheikh Zayed / Iconic Tower cover meshes inside the cutout.',
    ],
  },
  {
    id: 'damage_handler',
    name: 'DamageHandler',
    category: 'Combat & AI',
    ue5Class: 'UCairoDamageHandlerComponent',
    filePath: 'Source/CairoPrecinct/Public/Combat/CairoDamageHandlerComponent.h',
    summary: 'Centralized health, armor mitigation, headshot bone multipliers, medkit healing, and HUD/boss-phase delegates.',
    mobileNote: 'Zero tick overhead—purely delegate-driven updates to UMG Health & Boss Bars.',
    headerSnippet: `#pragma once
#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "CairoDamageHandlerComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnHealthUpdated, float, HP, float, MaxHP, bool, bWasHeadshot);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnBossPhaseTriggered, int32, NewPhase);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnActorEliminated);

UCLASS(ClassGroup=(Combat), meta=(BlueprintSpawnableComponent))
class CAIROPRECINCT_API UCairoDamageHandlerComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UCairoDamageHandlerComponent();

    UFUNCTION(BlueprintCallable, Category = "Combat")
    float ApplyHitDamage(float BaseDamage, FName HitBoneName);

    UFUNCTION(BlueprintCallable, Category = "Combat")
    void Heal(float Amount);

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Stats")
    float MaxHealth = 100.f;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Stats")
    float ArmorMultiplier = 1.0f;

    UPROPERTY(BlueprintAssignable) FOnHealthUpdated OnHealthUpdated;
    UPROPERTY(BlueprintAssignable) FOnBossPhaseTriggered OnBossPhaseTriggered;
    UPROPERTY(BlueprintAssignable) FOnActorEliminated OnActorEliminated;

private:
    float CurrentHealth = 100.f;
    bool bPhase2Triggered = false;
};`,
    cppSnippet: `#include "Combat/CairoDamageHandlerComponent.h"

UCairoDamageHandlerComponent::UCairoDamageHandlerComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
}

float UCairoDamageHandlerComponent::ApplyHitDamage(float BaseDamage, FName HitBoneName)
{
    if (CurrentHealth <= 0.f) return 0.f;

    const bool bIsHeadshot = (HitBoneName == FName("head") || HitBoneName == FName("neck_01"));
    const float ZoneMult = bIsHeadshot ? 1.85f : ArmorMultiplier;
    const float FinalDmg = BaseDamage * ZoneMult;

    CurrentHealth = FMath::Clamp(CurrentHealth - FinalDmg, 0.f, MaxHealth);
    OnHealthUpdated.Broadcast(CurrentHealth, MaxHealth, bIsHeadshot);

    if (!bPhase2Triggered && CurrentHealth > 0.f && CurrentHealth <= MaxHealth * 0.5f)
    {
        bPhase2Triggered = true;
        ArmorMultiplier = 1.0f;
        OnBossPhaseTriggered.Broadcast(2);
    }

    if (CurrentHealth <= 0.f)
    {
        OnActorEliminated.Broadcast();
    }
    return FinalDmg;
}

void UCairoDamageHandlerComponent::Heal(float Amount)
{
    CurrentHealth = FMath::Clamp(CurrentHealth + Amount, 0.f, MaxHealth);
    OnHealthUpdated.Broadcast(CurrentHealth, MaxHealth, false);
}`,
    blueprintNotes: [
      'Add UCairoDamageHandlerComponent to both BP_CairoHero and every enemy/boss Blueprint.',
      'Set MaxHealth=460 and ArmorMultiplier=0.85 on BP_Boss_ElAmeen.',
      'Bind OnBossPhaseTriggered to spawn 2 pooled alley flankers and intensify Cairo audio.',
    ],
  },
  {
    id: 'ai_behavior_tree',
    name: 'AIBehaviorTree',
    category: 'Combat & AI',
    ue5Class: 'UBTTask_CairoTacticalAttack',
    filePath: 'Source/CairoPrecinct/Public/AI/BTTask_CairoTacticalAttack.h',
    summary: 'Patrol → Sight Perception → Tactical Cover Strafe → Boss Laser Windup & Volley Behavior Tree C++ task.',
    mobileNote: 'Caps sight perception interval at 0.25s and shares one Behavior Tree asset across henchmen & bosses.',
    headerSnippet: `#pragma once
#include "CoreMinimal.h"
#include "BehaviorTree/BTTaskNode.h"
#include "BTTask_CairoTacticalAttack.generated.h"

UCLASS()
class CAIROPRECINCT_API UBTTask_CairoTacticalAttack : public UBTTaskNode
{
    GENERATED_BODY()

public:
    UBTTask_CairoTacticalAttack();
    virtual EBTNodeResult::Type ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;

protected:
    UPROPERTY(EditAnywhere, Category = "Blackboard")
    FBlackboardKeySelector TargetPlayerKey;

    UPROPERTY(EditAnywhere, Category = "Combat")
    float PreferredMinRange = 950.f;

    UPROPERTY(EditAnywhere, Category = "Combat")
    float WindupTelegraphSeconds = 0.55f;
};`,
    cppSnippet: `#include "AI/BTTask_CairoTacticalAttack.h"
#include "AIController.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "GameFramework/Character.h"

UBTTask_CairoTacticalAttack::UBTTask_CairoTacticalAttack()
{
    NodeName = TEXT("Cairo Tactical Strafe & Volley");
}

EBTNodeResult::Type UBTTask_CairoTacticalAttack::ExecuteTask(
    UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
    AAIController* AIC = OwnerComp.GetAIOwner();
    APawn* ControlledPawn = AIC ? AIC->GetPawn() : nullptr;
    UBlackboardComponent* BB = OwnerComp.GetBlackboardComponent();
    AActor* Target = BB ? Cast<AActor>(BB->GetValueAsObject(TargetPlayerKey.SelectedKeyName)) : nullptr;

    if (!AIC || !ControlledPawn || !Target)
    {
        return EBTNodeResult::Failed;
    }

    AIC->SetFocus(Target);
    const float Dist = FVector::Dist(ControlledPawn->GetActorLocation(), Target->GetActorLocation());

    // Keep tactical firing distance while strafing around Cairo taxi/barrier cover
    if (Dist > PreferredMinRange * 1.6f)
    {
        AIC->MoveToActor(Target, PreferredMinRange);
    }
    else
    {
        // Trigger weapon windup telegraph + burst fire event on Boss / Henchman Blueprint
        ControlledPawn->ProcessEvent(ControlledPawn->FindFunction(TEXT("BP_ExecuteBossVolley")), nullptr);
    }

    return EBTNodeResult::Succeeded;
}`,
    blueprintNotes: [
      'Create BT_CairoPrecinct with Selector: [1] Combat Sequence (Has TargetPlayer -> BTTask_CairoTacticalAttack) & [2] Alley Patrol.',
      'Limit NavMeshBoundsVolume strictly to the hand-built low-poly Cairo block.',
      'Reuse BT_CairoPrecinct across El-Ameen, Zarzour, El-Hefny, and Architect by tuning PreferredMinRange in Blackboard.',
    ],
  },
];

const CATEGORY_ORDER: StarterScriptCategory[] = [
  'All',
  'Controls & Camera',
  'World Streaming',
  'Combat & AI',
];

function getScriptIcon(id: string) {
  switch (id) {
    case 'player_controller':
      return Gamepad2;
    case 'camera_system':
      return Camera;
    case 'cesium_tile_loader':
      return Globe;
    case 'damage_handler':
      return ShieldAlert;
    default:
      return Cpu;
  }
}

interface BlueprintHubSidebarProps {
  open: boolean;
  onToggleOpen: () => void;
}

export const BlueprintHubSidebar: React.FC<BlueprintHubSidebarProps> = ({ open, onToggleOpen }) => {
  const [sidebarSection, setSidebarSection] = useState<
    | 'scripts'
    | 'cesium_tiles'
    | 'district_map_manager'
    | 'inventory'
    | 'ai_behavior_tree'
    | 'visual_logic'
    | 'dynamic_sky'
    | 'mobile_optimization'
  >('scripts');
  const [activeCategory, setActiveCategory] = useState<StarterScriptCategory>('All');
  const [selectedScriptId, setSelectedScriptId] = useState<string>(STARTER_SCRIPTS[0].id);
  const [codeView, setCodeView] = useState<'header' | 'cpp' | 'blueprint'>('header');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const visibleScripts = useMemo(() => {
    if (activeCategory === 'All') return STARTER_SCRIPTS;
    return STARTER_SCRIPTS.filter((s) => s.category === activeCategory);
  }, [activeCategory]);

  const selectedScript = useMemo(
    () => STARTER_SCRIPTS.find((s) => s.id === selectedScriptId) ?? STARTER_SCRIPTS[0],
    [selectedScriptId],
  );

  const groupedScripts = useMemo(() => {
    const groups: Array<{ category: Exclude<StarterScriptCategory, 'All'>; items: StarterScriptSpec[] }> = [];
    (['Controls & Camera', 'World Streaming', 'Combat & AI'] as const).forEach((cat) => {
      const items = visibleScripts.filter((s) => s.category === cat);
      if (items.length > 0) groups.push({ category: cat, items });
    });
    return groups;
  }, [visibleScripts]);

  const handleCopySnippet = () => {
    const text =
      codeView === 'header'
        ? selectedScript.headerSnippet
        : codeView === 'cpp'
          ? selectedScript.cppSnippet
          : selectedScript.blueprintNotes.map((n, i) => `${i + 1}. ${n}`).join('\n');
    void navigator.clipboard?.writeText(text);
    const key = `${selectedScript.id}_${codeView}`;
    setCopiedId(key);
    window.setTimeout(() => setCopiedId((curr) => (curr === key ? null : curr)), 1800);
  };

  if (!open) {
    return (
      <aside
        aria-label="Blueprint Hub Collapsed Rail"
        className="z-30 flex h-full w-11 shrink-0 flex-col items-center border-l border-white/10 bg-[#111419] py-3"
      >
        <button
          type="button"
          onClick={onToggleOpen}
          title="Open UE5 Blueprint Hub Sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-[#161A20] text-[#E89B3C] transition-colors hover:border-[#E89B3C] hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggleOpen}
          className="mt-5 flex flex-1 flex-col items-center justify-center gap-3 text-[#9CA3AF] transition-colors hover:text-white"
        >
          <Code2 className="h-4 w-4 text-[#E89B3C]" />
          <span
            className="font-display text-xs font-semibold tracking-wider text-[#D1D5DB]"
            style={{ writingMode: 'vertical-rl' }}
          >
            Blueprint Hub (5 Scripts)
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="UE5 Blueprint Hub Sidebar"
      className="z-30 flex h-full w-[380px] shrink-0 flex-col border-l border-white/10 bg-[#111419] text-[#F3F4F6] xl:w-[430px]"
    >
      {/* Top Sidebar Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0D0F12] px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 shrink-0 text-[#E89B3C]" />
            <h2 className="truncate font-display text-base font-bold text-white">Blueprint Hub</h2>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-[#9CA3AF]">
            UE5 Mobile Starter Scripts · C++ &amp; Blueprint
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleOpen}
          title="Collapse Blueprint Hub"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-[#161A20] text-[#D1D5DB] transition-colors hover:border-[#E89B3C] hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Top-Level Blueprint Hub Section Switcher */}
      <div className="border-b border-white/10 bg-[#0D0F12]/60 px-3 py-2.5">
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-[#0D0F12] p-1">
          <button
            type="button"
            onClick={() => setSidebarSection('scripts')}
            className={`flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10.5px] font-medium whitespace-nowrap transition-colors ${
              sidebarSection === 'scripts'
                ? 'bg-[#E89B3C] font-semibold text-[#0D0F12]'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Code2 className="h-3 w-3 shrink-0" />
            <span>Scripts</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarSection('cesium_tiles')}
            className={`flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10.5px] font-medium whitespace-nowrap transition-colors ${
              sidebarSection === 'cesium_tiles'
                ? 'bg-[#E89B3C] font-semibold text-[#0D0F12]'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Globe className="h-3 w-3 shrink-0" />
            <span>Cesium</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarSection('inventory')}
            className={`flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10.5px] font-medium whitespace-nowrap transition-colors ${
              sidebarSection === 'inventory'
                ? 'bg-[#E89B3C] font-semibold text-[#0D0F12]'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Package className="h-3 w-3 shrink-0" />
            <span>Gear</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarSection('ai_behavior_tree')}
            className={`flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10.5px] font-medium whitespace-nowrap transition-colors ${
              sidebarSection === 'ai_behavior_tree'
                ? 'bg-[#E89B3C] font-semibold text-[#0D0F12]'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Cpu className="h-3 w-3 shrink-0" />
            <span>AI Tree</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarSection('visual_logic')}
            className={`flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10.5px] font-medium whitespace-nowrap transition-colors ${
              sidebarSection === 'visual_logic'
                ? 'bg-[#E89B3C] font-semibold text-[#0D0F12]'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <GitBranch className="h-3 w-3 shrink-0" />
            <span>Graph</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarSection('dynamic_sky')}
            className={`flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10.5px] font-medium whitespace-nowrap transition-colors ${
              sidebarSection === 'dynamic_sky'
                ? 'bg-[#E89B3C] font-semibold text-[#0D0F12]'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Sun className="h-3 w-3 shrink-0" />
            <span>Sky</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarSection('district_map_manager')}
            className={`flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10.5px] font-medium whitespace-nowrap transition-colors ${
              sidebarSection === 'district_map_manager'
                ? 'bg-[#E89B3C] font-semibold text-[#0D0F12]'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <MapPin className="h-3 w-3 shrink-0" />
            <span>Districts</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarSection('mobile_optimization')}
            className={`flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10.5px] font-medium whitespace-nowrap transition-colors ${
              sidebarSection === 'mobile_optimization'
                ? 'bg-[#E89B3C] font-semibold text-[#0D0F12]'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Smartphone className="h-3 w-3 shrink-0" />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      {sidebarSection === 'cesium_tiles' ? (
        <CesiumTilesSection compact />
      ) : sidebarSection === 'district_map_manager' ? (
        <DistrictMapManager compact />
      ) : sidebarSection === 'inventory' ? (
        <InventoryWeaponryPanel />
      ) : sidebarSection === 'ai_behavior_tree' ? (
        <AIBehaviorTreeSection compact />
      ) : sidebarSection === 'visual_logic' ? (
        <VisualBlueprintLogic compact />
      ) : sidebarSection === 'dynamic_sky' ? (
        <DynamicSkyTool compact />
      ) : sidebarSection === 'mobile_optimization' ? (
        <MobileOptimizationSection compact />
      ) : (
        <>
          {/* Category Filter Segmented Control */}
          <div className="border-b border-white/10 px-4 py-2.5">
            <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-[#0D0F12] p-1">
              {CATEGORY_ORDER.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat);
                    const firstMatch =
                      cat === 'All' ? STARTER_SCRIPTS[0] : STARTER_SCRIPTS.find((s) => s.category === cat);
                    if (firstMatch && cat !== 'All' && selectedScript.category !== cat) {
                      setSelectedScriptId(firstMatch.id);
                    }
                  }}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                    activeCategory === cat
                      ? 'bg-[#E89B3C] font-semibold text-[#0D0F12]'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  {cat === 'Controls & Camera' ? 'Controls' : cat === 'World Streaming' ? 'Cesium' : cat}
                </button>
              ))}
            </div>
          </div>

      {/* Categorized 5 Starter Scripts Navigation */}
      <div className="max-h-[34%] overflow-y-auto border-b border-white/10 px-4 py-3 space-y-3">
        {groupedScripts.map((group) => (
          <div key={group.category}>
            <div className="mb-1.5 text-[11px] font-medium text-[#9CA3AF]">{group.category}</div>
            <div className="space-y-1">
              {group.items.map((script) => {
                const Icon = getScriptIcon(script.id);
                const isSelected = script.id === selectedScript.id;
                return (
                  <button
                    key={script.id}
                    type="button"
                    onClick={() => setSelectedScriptId(script.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? 'border-[#E89B3C]/65 bg-[#1B2028] text-white'
                        : 'border-transparent bg-[#161A20]/60 text-[#D1D5DB] hover:border-white/15 hover:bg-[#161A20]'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#E89B3C]' : 'text-[#9CA3AF]'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-xs font-semibold">{script.name}</div>
                      <div className="truncate text-[11px] text-[#9CA3AF]">{script.ue5Class}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Active Script Code-Snippet Preview Pane */}
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold text-white">{selectedScript.name}</h3>
            <div className="mt-0.5 truncate font-mono text-[11px] text-[#E89B3C]">{selectedScript.filePath}</div>
          </div>
          <button
            type="button"
            onClick={handleCopySnippet}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/12 bg-[#161A20] px-2.5 py-1.5 text-[11px] font-medium text-[#E89B3C] transition-colors hover:border-[#E89B3C] hover:text-white"
          >
            {copiedId === `${selectedScript.id}_${codeView}` ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedId === `${selectedScript.id}_${codeView}` ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-[#D1D5DB]">{selectedScript.summary}</p>
        <div className="mt-1.5 text-[11px] text-[#9CA3AF]">
          Mobile 60 FPS: <span className="text-[#FDE68A]">{selectedScript.mobileNote}</span>
        </div>

        {/* Code Format Segmented Tabs */}
        <div className="mt-3 flex items-center gap-1 rounded-md bg-[#0D0F12] p-1">
          {(
            [
              { id: 'header', label: 'Header (.h)' },
              { id: 'cpp', label: 'Source (.cpp)' },
              { id: 'blueprint', label: 'UE5 Steps' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCodeView(tab.id)}
              className={`flex-1 rounded px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                codeView === tab.id ? 'bg-[#1D222B] text-white' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Monospace Code Preview or Blueprint Steps */}
        <div className="mt-2.5 min-h-0 flex-1 overflow-auto rounded-lg border border-white/10 bg-[#0B0D10] p-3">
          {codeView === 'blueprint' ? (
            <ol className="space-y-2.5 text-xs leading-relaxed text-[#D1D5DB]">
              {selectedScript.blueprintNotes.map((note, idx) => (
                <li key={note} className="flex items-start gap-2.5">
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-[#E89B3C]">
                    0{idx + 1}.
                  </span>
                  <span>{note}</span>
                </li>
              ))}
            </ol>
          ) : (
            <pre className="font-mono text-[11px] leading-relaxed text-[#E5E7EB] whitespace-pre">
              {codeView === 'header' ? selectedScript.headerSnippet : selectedScript.cppSnippet}
            </pre>
          )}
        </div>
      </div>
        </>
      )}
    </aside>
  );
};
