export interface EngineComparisonRow {
  dimension: string;
  ue5Mobile: string;
  unityUrp: string;
  soloVerdict: 'UE5 Advantage' | 'Unity Advantage' | 'Balanced';
}

export interface CairoDistrictPreset {
  id: 'shubra' | 'old_cairo' | 'sheikh_zayed' | 'new_capital';
  level: number;
  name: string;
  arabicHint: string;
  lat: number;
  lon: number;
  elevationM: number;
  recommendedArenaRadiusM: number;
  recommendedSSE: number;
  villainArchetype: string;
  inspirationNote: string;
  bossMechanic: string;
  environmentNotes: string;
  lightingMood: string;
}

export interface Ue5StarterScript {
  id: string;
  order: number;
  className: string;
  blueprintName: string;
  filePath: string;
  role: string;
  mobileBudgetNote: string;
  cppHeader: string;
  cppSource: string;
  blueprintSteps: string[];
}

export interface FolderNode {
  path: string;
  kind: 'folder' | 'asset' | 'cpp';
  note: string;
  linkedScriptId?: string;
}

export interface ChecklistItem {
  id: string;
  phase: 'Setup' | 'Character' | 'Combat' | 'AI & Boss' | 'Mobile Polish';
  task: string;
  detail: string;
}

export const ENGINE_COMPARISON: EngineComparisonRow[] = [
  {
    dimension: 'Protagonist (Scan Yourself into 3D)',
    ue5Mobile: 'Native MetaHuman Creator + Mesh-to-MetaHuman (LOD 4–6 for mobile) + IK Retargeter for Mixamo animations.',
    unityUrp: 'Ready Player Me or Character Creator 4 export; requires extra rig retargeting and skin-shader tuning.',
    soloVerdict: 'UE5 Advantage',
  },
  {
    dimension: 'Cesium + Google 3D Tiles Integration',
    ue5Mobile: 'Official Cesium for Unreal plugin with native CesiumCartographicPolygon clipping and Floating Origin support.',
    unityUrp: 'Official Cesium for Unity plugin; slightly leaner build size, similar polygon clipping API.',
    soloVerdict: 'Balanced',
  },
  {
    dimension: 'Solo Prototyping Speed (3rd-Person Shooter)',
    ue5Mobile: 'Built-in CharacterMovementComponent, SpringArm camera collision, Behavior Trees, AI Perception, and Lyra/Starter templates.',
    unityUrp: 'Requires assembling Cinemachine, NavMesh/AI packages, and custom character controller physics from scratch.',
    soloVerdict: 'UE5 Advantage',
  },
  {
    dimension: 'Mid-Range Smartphone 60 FPS & APK Size',
    ue5Mobile: 'Requires discipline: disable Nanite & Lumen, use Mobile Forward Shading, cook ASTC textures, keep APK < 150 MB.',
    unityUrp: 'Smaller baseline APK (~45 MB) and forgiving URP mobile renderer out of the box on low-end Android GPUs.',
    soloVerdict: 'Unity Advantage',
  },
  {
    dimension: 'Scripting Workflow (Solo Developer)',
    ue5Mobile: 'Hybrid sweet spot: 5 lean C++ base classes for combat/AI math + Blueprint child classes for rapid iteration.',
    unityUrp: 'Pure C# codebase with fast domain reloads and lightweight IDE tooling.',
    soloVerdict: 'Balanced',
  },
];

export const UE5_SOLO_GUARDRAILS = [
  {
    title: 'Disable Nanite & Lumen on Mobile',
    detail: 'Google Photorealistic 3D Tiles do not use Nanite on Android/iOS, and Lumen destroys mid-range smartphone frame budgets. Use Mobile Forward Shading with stationary golden-hour directional sunlight and baked lightmaps inside playable blocks.',
  },
  {
    title: 'Carve the Playable Block, Stream the Skyline',
    detail: 'Never let players walk directly on raw Google 3D Tiles—their collision is noisy and triangle density spikes unpredictably. Attach a CesiumCartographicPolygon to clip a 180m x 180m hole over the Shubra precinct and drop in clean low-poly combat meshes.',
  },
  {
    title: 'MetaHuman Mobile LOD Discipline',
    detail: 'Force your scanned MetaHuman protagonist to LOD 3–4 on mobile (dropping groom hair strands for hair cards), targeting under 18,000 triangles and 2 material slots so 6–8 enemies stay locked at 60 FPS.',
  },
  {
    title: 'C++ Core + Blueprint Content',
    detail: 'Write the 5 foundational gameplay classes in C++ for zero-overhead tick/raycast math, then expose UPROPERTY tuning knobs so you iterate on weapon recoil, boss phases, and UI widgets visually in Blueprints.',
  },
];

export const CAIRO_DISTRICTS: CairoDistrictPreset[] = [
  {
    id: 'shubra',
    level: 1,
    name: 'Shubra / Downtown Precinct',
    arabicHint: 'شبرا / وسط البلد',
    lat: 30.0771,
    lon: 31.2458,
    elevationM: 28,
    recommendedArenaRadiusM: 140,
    recommendedSSE: 28,
    villainArchetype: 'El-Ameen (The Corrupt Precinct Officer)',
    inspirationNote: 'Store-safe archetype inspired by classic corrupt-precinct cinema tension without protected likenesses.',
    bossMechanic: 'Cramped precinct courtyard & surrounding alley ambush. Calls in 2 flanking precinct henchmen at 50% HP and lays down heavy burst fire from fortified doorway cover.',
    environmentNotes: 'Ochre-sandstone residential blocks, shuttered balconies, rooftop water tanks, precinct courtyard gate, white-and-black Cairo taxis, concrete roadblocks.',
    lightingMood: 'Golden hour dusty Cairo sunset (low warm sun at 18° pitch, cool dusty slate shadows).',
  },
  {
    id: 'old_cairo',
    level: 2,
    name: 'Old Cairo / El-Sabbatiya Alleys',
    arabicHint: 'مصر القديمة / السبتية',
    lat: 30.0131,
    lon: 31.2314,
    elevationM: 32,
    recommendedArenaRadiusM: 165,
    recommendedSSE: 28,
    villainArchetype: 'El-Moallem Zarzour (Old Quarter Kingpin)',
    inspirationNote: 'Original crime-patriarch archetype evoking gritty Old Cairo alleyway showdowns.',
    bossMechanic: 'Multi-phase rooftop-to-alleyway pursuit. Phase 1 uses elevated shotgun enforcers; Phase 2 drops into tight courtyard corridors with destructible market crates and incendiary barrels.',
    environmentNotes: 'Tight stepped alleys, weathered brick archways, hanging cloth awnings, timber scaffolding, and dense skyline silhouettes.',
    lightingMood: 'Late afternoon amber glare with deep high-contrast alley shadows.',
  },
  {
    id: 'sheikh_zayed',
    level: 3,
    name: 'Sheikh Zayed Compound',
    arabicHint: 'الشيخ زايد',
    lat: 30.0444,
    lon: 30.9756,
    elevationM: 165,
    recommendedArenaRadiusM: 210,
    recommendedSSE: 30,
    villainArchetype: 'El-Basha El-Hefny (The Compound Baron)',
    inspirationNote: 'Inspired by Upper-Egypt-to-Cairo syndicate kingpin archetypes, built with original character design.',
    bossMechanic: 'Gated luxury villa siege. Long-range balcony sniper laser telegraphs, armored black SUV patrols circling the courtyard, and flanking security squads.',
    environmentNotes: 'Walled palm-lined driveways, limestone villa colonnades, courtyard fountains, parked SUVs used as mobile cover.',
    lightingMood: 'Crisp desert dusk with warm perimeter security floodlights.',
  },
  {
    id: 'new_capital',
    level: 4,
    name: 'New Administrative Capital — Iconic Tower Plaza',
    arabicHint: 'العاصمة الإدارية الجديدة',
    lat: 30.0138,
    lon: 31.7376,
    elevationM: 245,
    recommendedArenaRadiusM: 240,
    recommendedSSE: 32,
    villainArchetype: 'The Syndicate Architect',
    inspirationNote: 'Original futuristic mastermind tying all four Cairo districts together.',
    bossMechanic: 'Vertical multi-tier plaza combat beneath the Iconic Tower. Deploys tactical recon drones, shield-bearing heavy troopers, and rotating cover barriers.',
    environmentNotes: 'Wide travertine civic plazas, glass curtain-wall lobbies, elevated walkways, and the distant Iconic Tower rising via clipped Cesium 3D Tiles.',
    lightingMood: 'High-contrast twilight gold against brushed glass and architectural floodlighting.',
  },
];

export const UE5_FOLDER_TREE: FolderNode[] = [
  { path: 'Source/CairoPrecinct/Public/Player/CairoPlayerCharacter.h', kind: 'cpp', note: 'Third-person protagonist + PUBG camera boom', linkedScriptId: 'player' },
  { path: 'Source/CairoPrecinct/Public/Input/CairoMobileInputComponent.h', kind: 'cpp', note: 'Dual-thumb touch input + soft auto-aim assist', linkedScriptId: 'input' },
  { path: 'Source/CairoPrecinct/Public/Combat/CairoRifleWeapon.h', kind: 'cpp', note: 'Line-trace rifle, recoil curve, reload & damage', linkedScriptId: 'weapon' },
  { path: 'Source/CairoPrecinct/Public/AI/CairoEnemyAIController.h', kind: 'cpp', note: 'Patrol -> Chase -> Cover -> Shoot perception AI', linkedScriptId: 'enemy_ai' },
  { path: 'Source/CairoPrecinct/Public/AI/CairoBossCharacter.h', kind: 'cpp', note: 'El-Ameen boss phases, wave calls & HUD delegate', linkedScriptId: 'boss' },
  { path: 'Content/Cairo/Maps/L_01_Shubra_VerticalSlice.umap', kind: 'asset', note: 'Level 1 persistent map with CesiumGeoreference + Shubra block' },
  { path: 'Content/Cairo/Cesium/BP_CairoTilesetManager.uasset', kind: 'asset', note: 'Google 3D Tileset + CartographicPolygon arena cutout' },
  { path: 'Content/Cairo/Characters/Protagonist/BP_CairoHero.uasset', kind: 'asset', note: 'MetaHuman LOD4 + Mixamo rifle AnimBP child of ACairoPlayerCharacter' },
  { path: 'Content/Cairo/Characters/Enemies/BP_Boss_ElAmeen.uasset', kind: 'asset', note: 'El-Ameen officer mesh, heavy rifle & phase tuning' },
  { path: 'Content/Cairo/UI/WBP_MobileCombatHUD.uasset', kind: 'asset', note: 'Dual-thumb layout, dynamic reticle, ammo & Boss Health Bar' },
  { path: 'Content/Cairo/Environment/Shubra_LowPoly/', kind: 'folder', note: 'Atlas-textured modular balconies, precinct gate & Cairo taxi cover' },
];

export const UE5_STARTER_SCRIPTS: Ue5StarterScript[] = [
  {
    id: 'player',
    order: 1,
    className: 'ACairoPlayerCharacter',
    blueprintName: 'BP_CairoHero',
    filePath: 'Source/CairoPrecinct/Public/Player/CairoPlayerCharacter.h',
    role: 'PUBG-style over-the-shoulder camera, crouch/sprint locomotion, health system, and MetaHuman/Mixamo Animation Blueprint hooks.',
    mobileBudgetNote: 'Uses native UCharacterMovementComponent (zero custom tick physics) + smooth FMath::FInterpTo FOV zoom for ADS.',
    cppHeader: `#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "CairoPlayerCharacter.generated.h"

class USpringArmComponent;
class UCameraComponent;
class ACairoRifleWeapon;

UCLASS()
class CAIROPRECINCT_API ACairoPlayerCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    ACairoPlayerCharacter();
    virtual void Tick(float DeltaTime) override;
    virtual float TakeDamage(float DamageAmount, struct FDamageEvent const& DamageEvent,
        AController* EventInstigator, AActor* DamageCauser) override;

    UFUNCTION(BlueprintCallable, Category = "Combat")
    void SetAiming(bool bNewAiming);

    UFUNCTION(BlueprintCallable, Category = "Movement")
    void ToggleCrouchStance();

    UFUNCTION(BlueprintCallable, Category = "Movement")
    void SetSprinting(bool bNewSprinting);

    UFUNCTION(BlueprintPure, Category = "Combat")
    float GetHealthPercent() const { return CurrentHealth / FMath::Max(1.f, MaxHealth); }

protected:
    virtual void BeginPlay() override;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
    USpringArmComponent* CameraBoom;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
    UCameraComponent* FollowCamera;

    UPROPERTY(EditDefaultsOnly, Category = "Combat")
    TSubclassOf<ACairoRifleWeapon> StarterRifleClass;

    UPROPERTY(BlueprintReadOnly, Category = "Combat")
    ACairoRifleWeapon* EquippedRifle = nullptr;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Stats")
    float MaxHealth = 100.f;

    UPROPERTY(BlueprintReadOnly, Category = "Stats")
    float CurrentHealth = 100.f;

    UPROPERTY(BlueprintReadOnly, Category = "Combat")
    bool bIsAiming = false;

    UPROPERTY(EditDefaultsOnly, Category = "Camera")
    float HipFOV = 72.f;

    UPROPERTY(EditDefaultsOnly, Category = "Camera")
    float AdsFOV = 52.f;
};`,
    cppSource: `#include "Player/CairoPlayerCharacter.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Combat/CairoRifleWeapon.h"

ACairoPlayerCharacter::ACairoPlayerCharacter()
{
    PrimaryActorTick.bCanEverTick = true;

    bUseControllerRotationYaw = true;
    GetCharacterMovement()->bOrientRotationToMovement = false;
    GetCharacterMovement()->NavAgentProps.bCanCrouch = true;
    GetCharacterMovement()->MaxWalkSpeed = 420.f;
    GetCharacterMovement()->MaxWalkSpeedCrouched = 230.f;

    // PUBG-style right-shoulder camera boom
    CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
    CameraBoom->SetupAttachment(RootComponent);
    CameraBoom->TargetArmLength = 250.f;
    CameraBoom->SocketOffset = FVector(0.f, 58.f, 68.f);
    CameraBoom->bUsePawnControlRotation = true;
    CameraBoom->bEnableCameraLag = true;
    CameraBoom->CameraLagSpeed = 12.f;

    FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
    FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
}

void ACairoPlayerCharacter::BeginPlay()
{
    Super::BeginPlay();
    CurrentHealth = MaxHealth;

    if (StarterRifleClass)
    {
        EquippedRifle = GetWorld()->SpawnActor<ACairoRifleWeapon>(StarterRifleClass);
        if (EquippedRifle)
        {
            EquippedRifle->SetOwner(this);
            EquippedRifle->AttachToComponent(GetMesh(),
                FAttachmentTransformRules::SnapToTargetNotIncludingScale, TEXT("WeaponSocket_R"));
        }
    }
}

void ACairoPlayerCharacter::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);
    const float TargetFOV = bIsAiming ? AdsFOV : HipFOV;
    FollowCamera->SetFieldOfView(FMath::FInterpTo(FollowCamera->FieldOfView, TargetFOV, DeltaTime, 12.f));
}

void ACairoPlayerCharacter::SetAiming(bool bNewAiming)
{
    bIsAiming = bNewAiming;
    GetCharacterMovement()->MaxWalkSpeed = bIsAiming ? 260.f : 420.f;
}

void ACairoPlayerCharacter::ToggleCrouchStance()
{
    bIsCrouched ? UnCrouch() : Crouch();
}

void ACairoPlayerCharacter::SetSprinting(bool bNewSprinting)
{
    if (bIsAiming || bIsCrouched) return;
    GetCharacterMovement()->MaxWalkSpeed = bNewSprinting ? 620.f : 420.f;
}

float ACairoPlayerCharacter::TakeDamage(float DamageAmount, FDamageEvent const& DamageEvent,
    AController* EventInstigator, AActor* DamageCauser)
{
    CurrentHealth = FMath::Clamp(CurrentHealth - DamageAmount, 0.f, MaxHealth);
    return DamageAmount;
}`,
    blueprintSteps: [
      'Create BP_CairoHero inheriting from ACairoPlayerCharacter and assign your MetaHuman LOD4 Skeletal Mesh.',
      'Retarget Mixamo Rifle Idle, Run, Strafe, Crouch-Walk, and Fire animations using UE5 IK Retargeter into ABP_CairoHero.',
      'Add a socket named WeaponSocket_R on the right hand bone (hand_r) and preview rifle alignment.',
      'Bind BP_CairoHero as Default Pawn Class in GM_CairoShubra GameMode.',
    ],
  },
  {
    id: 'input',
    order: 2,
    className: 'UCairoMobileInputComponent',
    blueprintName: 'WBP_MobileCombatHUD',
    filePath: 'Source/CairoPrecinct/Public/Input/CairoMobileInputComponent.h',
    role: 'Handles dual-thumb mobile controls via Enhanced Input + soft magnetic Auto-Aim Assist inside the screen reticle cone.',
    mobileBudgetNote: 'Runs a single cheap dot-product cone scan over active enemies (no heavy sphere sweeps every tick).',
    cppHeader: `#pragma once
#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "CairoMobileInputComponent.generated.h"

UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class CAIROPRECINCT_API UCairoMobileInputComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UCairoMobileInputComponent();

    UFUNCTION(BlueprintCallable, Category = "MobileInput")
    void ApplyVirtualMove(FVector2D StickInput);

    UFUNCTION(BlueprintCallable, Category = "MobileInput")
    void ApplyTouchLook(FVector2D DragDelta, float Sensitivity = 0.25f);

    UFUNCTION(BlueprintCallable, Category = "AimAssist")
    void ApplySoftAutoAim(float DeltaTime);

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "AimAssist")
    bool bAutoAimEnabled = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "AimAssist")
    float AimAssistConeDegrees = 8.5f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "AimAssist")
    float AimAssistStrength = 7.5f;
};`,
    cppSource: `#include "Input/CairoMobileInputComponent.h"
#include "GameFramework/Character.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"

UCairoMobileInputComponent::UCairoMobileInputComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UCairoMobileInputComponent::ApplyVirtualMove(FVector2D StickInput)
{
    ACharacter* OwnerChar = Cast<ACharacter>(GetOwner());
    if (!OwnerChar || !OwnerChar->GetController()) return;

    const FRotator YawRot(0.f, OwnerChar->GetControlRotation().Yaw, 0.f);
    const FVector Forward = FRotationMatrix(YawRot).GetUnitAxis(EAxis::X);
    const FVector Right = FRotationMatrix(YawRot).GetUnitAxis(EAxis::Y);

    OwnerChar->AddMovementInput(Forward, StickInput.Y);
    OwnerChar->AddMovementInput(Right, StickInput.X);
}

void UCairoMobileInputComponent::ApplyTouchLook(FVector2D DragDelta, float Sensitivity)
{
    ACharacter* OwnerChar = Cast<ACharacter>(GetOwner());
    if (!OwnerChar) return;
    OwnerChar->AddControllerYawInput(DragDelta.X * Sensitivity);
    OwnerChar->AddControllerPitchInput(DragDelta.Y * Sensitivity);
}

void UCairoMobileInputComponent::ApplySoftAutoAim(float DeltaTime)
{
    if (!bAutoAimEnabled) return;
    ACharacter* OwnerChar = Cast<ACharacter>(GetOwner());
    APlayerController* PC = OwnerChar ? Cast<APlayerController>(OwnerChar->GetController()) : nullptr;
    if (!PC || !PC->PlayerCameraManager) return;

    const FVector CamLoc = PC->PlayerCameraManager->GetCameraLocation();
    const FVector CamFwd = PC->PlayerCameraManager->GetCameraRotation().Vector();
    const float MinCos = FMath::Cos(FMath::DegreesToRadians(AimAssistConeDegrees));

    TArray<AActor*> Enemies;
    UGameplayStatics::GetAllActorsWithTag(GetWorld(), FName("CairoEnemy"), Enemies);

    AActor* BestTarget = nullptr;
    float BestDot = MinCos;

    for (AActor* Enemy : Enemies)
    {
        const FVector AimPoint = Enemy->GetActorLocation() + FVector(0.f, 0.f, 45.f);
        const float Dist = FVector::Dist(CamLoc, AimPoint);
        if (Dist > 4500.f) continue;

        const float Dot = FVector::DotProduct(CamFwd, (AimPoint - CamLoc).GetSafeNormal());
        if (Dot > BestDot)
        {
            BestDot = Dot;
            BestTarget = Enemy;
        }
    }

    if (BestTarget)
    {
        const FVector TargetPt = BestTarget->GetActorLocation() + FVector(0.f, 0.f, 45.f);
        const FRotator DesiredRot = (TargetPt - CamLoc).Rotation();
        const FRotator NewRot = FMath::RInterpTo(PC->GetControlRotation(), DesiredRot, DeltaTime, AimAssistStrength);
        PC->SetControlRotation(NewRot);
    }
}`,
    blueprintSteps: [
      'Enable Enhanced Input and Touch Interface in Project Settings -> Input -> Mobile.',
      'Build WBP_MobileCombatHUD with a left virtual thumbstick bound to ApplyVirtualMove and a right-half touch region bound to ApplyTouchLook.',
      'Add thumb-reachable Fire (hold), ADS (toggle), Crouch, Sprint, and Reload buttons along the bottom-right arc (minimum 56x56 dp).',
      'Tag all enemy Blueprints with Actor Tag "CairoEnemy" so ApplySoftAutoAim locks gently when firing or aiming.',
    ],
  },
  {
    id: 'weapon',
    order: 3,
    className: 'ACairoRifleWeapon',
    blueprintName: 'BP_CairoAssaultRifle',
    filePath: 'Source/CairoPrecinct/Public/Combat/CairoRifleWeapon.h',
    role: 'Hitscan rifle line-trace with headshot bone detection, magazine/reload timer, recoil pitch kick, and Niagara muzzle VFX hook.',
    mobileBudgetNote: 'Uses single channel ECC_Visibility line traces instead of physical projectile actors to keep mobile CPU frame time < 0.2ms.',
    cppHeader: `#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "CairoRifleWeapon.generated.h"

UCLASS()
class CAIROPRECINCT_API ACairoRifleWeapon : public AActor
{
    GENERATED_BODY()

public:
    ACairoRifleWeapon();

    UFUNCTION(BlueprintCallable, Category = "Weapon")
    void StartFire();

    UFUNCTION(BlueprintCallable, Category = "Weapon")
    void StopFire();

    UFUNCTION(BlueprintCallable, Category = "Weapon")
    void StartReload();

    UFUNCTION(BlueprintImplementableEvent, Category = "VFX")
    void BP_OnShotFired(FVector MuzzleLoc, FVector ImpactLoc, bool bHitCharacter);

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Weapon")
    int32 MagSize = 30;

    UPROPERTY(BlueprintReadOnly, Category = "Weapon")
    int32 CurrentAmmo = 30;

    UPROPERTY(EditDefaultsOnly, Category = "Weapon")
    float BaseDamage = 24.f;

    UPROPERTY(EditDefaultsOnly, Category = "Weapon")
    float FireRateSeconds = 0.11f;

protected:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly)
    USkeletalMeshComponent* RifleMesh;

    void FireSingleRound();
    void FinishReload();

    FTimerHandle FireTimerHandle;
    FTimerHandle ReloadTimerHandle;
    bool bIsReloading = false;
};`,
    cppSource: `#include "Combat/CairoRifleWeapon.h"
#include "Kismet/GameplayStatics.h"
#include "GameFramework/Character.h"

ACairoRifleWeapon::ACairoRifleWeapon()
{
    PrimaryActorTick.bCanEverTick = false;
    RifleMesh = CreateDefaultSubobject<USkeletalMeshComponent>(TEXT("RifleMesh"));
    RootComponent = RifleMesh;
}

void ACairoRifleWeapon::StartFire()
{
    if (bIsReloading || CurrentAmmo <= 0) return;
    FireSingleRound();
    GetWorldTimerManager().SetTimer(FireTimerHandle, this, &ACairoRifleWeapon::FireSingleRound, FireRateSeconds, true);
}

void ACairoRifleWeapon::StopFire()
{
    GetWorldTimerManager().ClearTimer(FireTimerHandle);
}

void ACairoRifleWeapon::FireSingleRound()
{
    if (bIsReloading || CurrentAmmo <= 0)
    {
        StopFire();
        if (CurrentAmmo <= 0) StartReload();
        return;
    }

    ACharacter* OwnerChar = Cast<ACharacter>(GetOwner());
    APlayerController* PC = OwnerChar ? Cast<APlayerController>(OwnerChar->GetController()) : nullptr;
    if (!PC) return;

    CurrentAmmo--;
    FVector EyeLoc;
    FRotator EyeRot;
    PC->GetPlayerViewPoint(EyeLoc, EyeRot);

    const FVector TraceEnd = EyeLoc + EyeRot.Vector() * 8000.f;
    FHitResult Hit;
    FCollisionQueryParams Params;
    Params.AddIgnoredActor(this);
    Params.AddIgnoredActor(OwnerChar);

    const bool bHit = GetWorld()->LineTraceSingleByChannel(Hit, EyeLoc, TraceEnd, ECC_Visibility, Params);
    const FVector ImpactPt = bHit ? Hit.ImpactPoint : TraceEnd;
    bool bHitChar = false;

    if (bHit && Hit.GetActor())
    {
        const bool bHeadshot = Hit.BoneName == FName("head");
        const float FinalDamage = bHeadshot ? BaseDamage * 1.85f : BaseDamage;
        UGameplayStatics::ApplyPointDamage(Hit.GetActor(), FinalDamage, EyeRot.Vector(),
            Hit, PC, this, UDamageType::StaticClass());
        bHitChar = Hit.GetActor()->ActorHasTag(FName("CairoEnemy"));
    }

    // Recoil kick
    OwnerChar->AddControllerPitchInput(-0.35f);
    BP_OnShotFired(RifleMesh->GetSocketLocation(TEXT("Muzzle")), ImpactPt, bHitChar);
}

void ACairoRifleWeapon::StartReload()
{
    if (bIsReloading || CurrentAmmo == MagSize) return;
    StopFire();
    bIsReloading = true;
    GetWorldTimerManager().SetTimer(ReloadTimerHandle, this, &ACairoRifleWeapon::FinishReload, 1.5f, false);
}

void ACairoRifleWeapon::FinishReload()
{
    CurrentAmmo = MagSize;
    bIsReloading = false;
}`,
    blueprintSteps: [
      'Create BP_CairoAssaultRifle inheriting from ACairoRifleWeapon and assign a low-poly assault rifle mesh (< 4,000 tris).',
      'Implement BP_OnShotFired to spawn a lightweight Niagara muzzle flash & tracer beam + Play Sound at Location.',
      'Bind HUD Ammo counter directly to CurrentAmmo / MagSize and show a radial progress indicator during reload.',
    ],
  },
  {
    id: 'enemy_ai',
    order: 4,
    className: 'ACairoEnemyAIController',
    blueprintName: 'AIC_PrecinctHenchman',
    filePath: 'Source/CairoPrecinct/Public/AI/CairoEnemyAIController.h',
    role: 'Patrol -> Spot Player -> Chase to Firing Range -> Shoot with AI Perception (Sight + Damage stimulus) on NavMesh.',
    mobileBudgetNote: 'Limits sight perception ticks to 0.25s intervals and caps concurrent active AI at 6–8 per Cairo block.',
    cppHeader: `#pragma once
#include "CoreMinimal.h"
#include "AIController.h"
#include "Perception/AIPerceptionTypes.h"
#include "CairoEnemyAIController.generated.h"

class UAIPerceptionComponent;
class UAISenseConfig_Sight;

UCLASS()
class CAIROPRECINCT_API ACairoEnemyAIController : public AAIController
{
    GENERATED_BODY()

public:
    ACairoEnemyAIController();

protected:
    virtual void OnPossess(APawn* InPawn) override;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "AI")
    UAIPerceptionComponent* CairoPerception;

    UPROPERTY()
    UAISenseConfig_Sight* SightConfig;

    UPROPERTY(EditDefaultsOnly, Category = "AI")
    UBehaviorTree* CombatBehaviorTree;

    UFUNCTION()
    void OnTargetPerceptionUpdated(AActor* Actor, FAIStimulus Stimulus);
};`,
    cppSource: `#include "AI/CairoEnemyAIController.h"
#include "Perception/AIPerceptionComponent.h"
#include "Perception/AISenseConfig_Sight.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "GameFramework/Character.h"

ACairoEnemyAIController::ACairoEnemyAIController()
{
    CairoPerception = CreateDefaultSubobject<UAIPerceptionComponent>(TEXT("CairoPerception"));
    SightConfig = CreateDefaultSubobject<UAISenseConfig_Sight>(TEXT("SightConfig"));

    SightConfig->SightRadius = 2600.f;
    SightConfig->LoseSightRadius = 3100.f;
    SightConfig->PeripheralVisionAngleDegrees = 70.f;
    SightConfig->DetectionByAffiliation.bDetectEnemies = true;
    SightConfig->DetectionByAffiliation.bDetectNeutrals = true;

    CairoPerception->ConfigureSense(*SightConfig);
    CairoPerception->SetDominantSense(SightConfig->GetSenseImplementation());
}

void ACairoEnemyAIController::OnPossess(APawn* InPawn)
{
    Super::OnPossess(InPawn);
    CairoPerception->OnTargetPerceptionUpdated.AddDynamic(this, &ACairoEnemyAIController::OnTargetPerceptionUpdated);

    if (CombatBehaviorTree)
    {
        RunBehaviorTree(CombatBehaviorTree);
    }
}

void ACairoEnemyAIController::OnTargetPerceptionUpdated(AActor* Actor, FAIStimulus Stimulus)
{
    if (!Actor || !Actor->ActorHasTag(FName("Player")) || !Blackboard) return;

    if (Stimulus.WasSuccessfullySensed())
    {
        Blackboard->SetValueAsObject(TEXT("TargetPlayer"), Actor);
        Blackboard->SetValueAsVector(TEXT("LastKnownLocation"), Actor->GetActorLocation());
    }
    else
    {
        Blackboard->ClearValue(TEXT("TargetPlayer"));
    }
}`,
    blueprintSteps: [
      'Drop a NavMeshBoundsVolume strictly around your hand-built 140m Shubra combat courtyard (never over raw Cesium tiles).',
      'Create BT_CairoHenchman with a Selector: [1] Combat Sequence (Has TargetPlayer -> Move to 12m range -> Focus -> Fire Burst) and [2] Patrol Sequence (Pick Next Alley Waypoint -> MoveTo -> Wait 2s).',
      'Add Actor Tag "Player" to BP_CairoHero so Sight perception immediately acquires the player.',
    ],
  },
  {
    id: 'boss',
    order: 5,
    className: 'ACairoBossCharacter',
    blueprintName: 'BP_Boss_ElAmeen',
    filePath: 'Source/CairoPrecinct/Public/AI/CairoBossCharacter.h',
    role: 'Level 1 Boss (El-Ameen — Corrupt Precinct Officer): armored HP pool, Phase 2 precinct reinforcement call at 50% HP, and UMG Boss Health Bar events.',
    mobileBudgetNote: 'Reuses the same henchman AI controller & pooled reinforcement actors to avoid mid-fight mobile GC spikes.',
    cppHeader: `#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "CairoBossCharacter.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnBossHealthChanged, float, CurrentHP, float, MaxHP, int32, Phase);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnBossDefeated);

UCLASS()
class CAIROPRECINCT_API ACairoBossCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    ACairoBossCharacter();

    virtual float TakeDamage(float DamageAmount, struct FDamageEvent const& DamageEvent,
        AController* EventInstigator, AActor* DamageCauser) override;

    UPROPERTY(BlueprintAssignable, Category = "BossUI")
    FOnBossHealthChanged OnBossHealthChanged;

    UPROPERTY(BlueprintAssignable, Category = "BossUI")
    FOnBossDefeated OnBossDefeated;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Boss")
    FText BossDisplayName = FText::FromString(TEXT("El-Ameen — Precinct Enforcer"));

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Boss")
    float MaxBossHealth = 480.f;

protected:
    virtual void BeginPlay() override;

    UFUNCTION(BlueprintImplementableEvent, Category = "Boss")
    void BP_OnPhaseTwoTriggered();

    float CurrentBossHealth = 480.f;
    int32 CurrentPhase = 1;
};`,
    cppSource: `#include "AI/CairoBossCharacter.h"

ACairoBossCharacter::ACairoBossCharacter()
{
    Tags.Add(FName("CairoEnemy"));
    Tags.Add(FName("CairoBoss"));
}

void ACairoBossCharacter::BeginPlay()
{
    Super::BeginPlay();
    CurrentBossHealth = MaxBossHealth;
    OnBossHealthChanged.Broadcast(CurrentBossHealth, MaxBossHealth, CurrentPhase);
}

float ACairoBossCharacter::TakeDamage(float DamageAmount, FDamageEvent const& DamageEvent,
    AController* EventInstigator, AActor* DamageCauser)
{
    if (CurrentBossHealth <= 0.f) return 0.f;

    // Armored precinct vest reduces non-headshot body hits slightly in Phase 1
    const float Mitigated = (CurrentPhase == 1) ? DamageAmount * 0.85f : DamageAmount;
    CurrentBossHealth = FMath::Clamp(CurrentBossHealth - Mitigated, 0.f, MaxBossHealth);

    if (CurrentPhase == 1 && CurrentBossHealth <= MaxBossHealth * 0.5f)
    {
        CurrentPhase = 2;
        BP_OnPhaseTwoTriggered(); // Spawn 2 precinct flankers + switch to aggressive burst BT
    }

    OnBossHealthChanged.Broadcast(CurrentBossHealth, MaxBossHealth, CurrentPhase);

    if (CurrentBossHealth <= 0.f)
    {
        OnBossDefeated.Broadcast();
    }

    return Mitigated;
}`,
    blueprintSteps: [
      'Create BP_Boss_ElAmeen from ACairoBossCharacter with distinct precinct officer jacket, golden epaulets, and heavy tactical rifle.',
      'Bind WBP_MobileCombatHUD Boss Bar directly to OnBossHealthChanged so zero tick polling is needed.',
      'In BP_OnPhaseTwoTriggered, activate 2 pre-spawned hidden precinct guards at the side alley gates and increase fire burst count.',
      'Bind OnBossDefeated to trigger the Level 1 Victory screen and unlock Level 2 (Old Cairo / El-Sabbatiya).',
    ],
  },
];

export const SOLO_MVP_CHECKLIST: ChecklistItem[] = [
  { id: 'c1', phase: 'Setup', task: 'Create UE5 Mobile Project (Scalable, No Raytracing, No Nanite)', detail: 'Set Mobile Forward Shading + ASTC texture compression in Project Settings.' },
  { id: 'c2', phase: 'Setup', task: 'Install Cesium for Unreal + Pin Shubra Coordinates (30.0771, 31.2458)', detail: 'Set MaximumScreenSpaceError to 28 and clip a 140m CartographicPolygon hole.' },
  { id: 'c3', phase: 'Character', task: 'Generate MetaHuman LOD4 + Retarget Mixamo Rifle Pack', detail: 'Attach rifle to WeaponSocket_R and verify standing, crouching, and ADS blendspaces.' },
  { id: 'c4', phase: 'Combat', task: 'Wire Dual-Thumb Touch HUD + Soft Auto-Aim Assist', detail: 'Test on a real mid-range Android phone at 60 FPS with stat unit visible.' },
  { id: 'c5', phase: 'AI & Boss', task: 'Bake NavMesh over Low-Poly Shubra Block + Wire El-Ameen', detail: 'Verify henchmen patrol/chase/shoot and El-Ameen Phase 2 flankers trigger cleanly.' },
  { id: 'c6', phase: 'Mobile Polish', task: 'Profile Thermal & Memory Ceiling (< 1.4 GB RAM, 60 FPS)', detail: 'Cap r.Streaming.PoolSize=384 and ensure APK/AAB stays lean.' },
];
